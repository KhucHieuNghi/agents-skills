const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const shape = (x, keys, label) =>
  assert(
    x &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.keys(x).every((k) => keys.includes(k)),
    `Invalid ${label} fields`,
  );
const types = ["boolean", "integer", "decimal", "enum", "digest"];
const name = (x) =>
  typeof x === "string" &&
  /^[a-z][a-z0-9_]{0,63}$/.test(x) &&
  !["constructor", "prototype"].includes(x);
const decimal = (x) =>
  typeof x === "string" && /^-?(0|[1-9][0-9]{0,29})(\.[0-9]{1,9})?$/.test(x);
const token = (x) => typeof x === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(x);
function validValue(type, value) {
  return type === "boolean"
    ? typeof value === "boolean"
    : type === "integer"
      ? Number.isSafeInteger(value)
      : type === "decimal"
        ? decimal(value)
        : type === "enum"
          ? token(value)
          : type === "digest"
            ? typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
            : false;
}
function units(value) {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const result = BigInt(whole) * 1000000000n + BigInt(fraction.padEnd(9, "0"));
  return negative ? -result : result;
}
const compare = (a, b, type) =>
  type === "decimal"
    ? units(a) < units(b)
      ? -1
      : units(a) > units(b)
        ? 1
        : 0
    : a < b
      ? -1
      : a > b
        ? 1
        : 0;
export function validateTrackingPayload(payload) {
  shape(payload, ["complete", "fields"], "tracking payload");
  assert(
    typeof payload.complete === "boolean" &&
      Array.isArray(payload.fields) &&
      payload.fields.length <= 64,
    "Invalid payload completeness/fields",
  );
  const seen = new Set();
  for (const field of payload.fields) {
    shape(field, ["name", "type", "value"], "payload field");
    assert(
      name(field.name) && !seen.has(field.name),
      "Invalid or duplicate payload field",
    );
    seen.add(field.name);
    assert(
      types.includes(field.type) && validValue(field.type, field.value),
      "Invalid payload typed value",
    );
  }
  return payload;
}
export function validatePayloadRules(rules) {
  assert(
    Array.isArray(rules) && rules.length > 0 && rules.length <= 64,
    "Invalid payload rules",
  );
  const seen = new Set();
  for (const r of rules) {
    shape(
      r,
      ["name", "type", "required", "allowedValues", "equals", "min", "max"],
      "payload rule",
    );
    assert(
      name(r.name) &&
        !seen.has(r.name) &&
        types.includes(r.type) &&
        typeof r.required === "boolean",
      "Invalid or duplicate payload rule",
    );
    seen.add(r.name);
    if (r.type === "enum")
      assert(
        Array.isArray(r.allowedValues) &&
          r.allowedValues.length > 0 &&
          r.allowedValues.length <= 100 &&
          r.allowedValues.every(token) &&
          new Set(r.allowedValues).size === r.allowedValues.length,
        "Invalid payload enum contract",
      );
    else assert(r.allowedValues === undefined, "Unexpected enum constraint");
    if (r.equals !== undefined) {
      assert(validValue(r.type, r.equals), "Invalid payload equality value");
      if (r.type === "enum")
        assert(
          r.allowedValues.includes(r.equals),
          "Contradictory enum equality",
        );
    }
    if (r.min !== undefined || r.max !== undefined) {
      assert(
        ["integer", "decimal"].includes(r.type),
        "Unexpected numeric bounds",
      );
      for (const b of [r.min, r.max])
        if (b !== undefined)
          assert(validValue(r.type, b), "Invalid payload bounds");
      if (r.min !== undefined && r.max !== undefined)
        assert(
          compare(r.min, r.max, r.type) <= 0,
          "Contradictory payload bounds",
        );
      if (r.equals !== undefined)
        assert(
          (r.min === undefined || compare(r.equals, r.min, r.type) >= 0) &&
            (r.max === undefined || compare(r.equals, r.max, r.type) <= 0),
          "Equality outside payload bounds",
        );
    }
  }
  return rules;
}
/** Typed, privacy-limited supplied field comparison, not provider payload authentication. */
export function evaluateTrackingPayload(rules, payloads) {
  validatePayloadRules(rules);
  assert(Array.isArray(payloads), "Invalid payload collection");
  if (!payloads.length)
    return { status: "unknown", reason: "no-payload-sample" };
  for (const payload of payloads)
    if (payload !== undefined) validateTrackingPayload(payload);
  if (payloads.some((p) => p === undefined || !p.complete))
    return { status: "unknown", reason: "incomplete-payload-evidence" };
  for (const payload of payloads)
    for (const rule of rules) {
      const field = payload.fields.find((f) => f.name === rule.name);
      if (!field) {
        if (rule.required)
          return {
            status: "fail",
            reason: "missing-required-payload-field",
            field: rule.name,
          };
        continue;
      }
      if (field.type !== rule.type)
        return {
          status: "fail",
          reason: "payload-type-mismatch",
          field: rule.name,
        };
      if (rule.allowedValues && !rule.allowedValues.includes(field.value))
        return {
          status: "fail",
          reason: "payload-enum-mismatch",
          field: rule.name,
        };
      if (
        rule.equals !== undefined &&
        compare(field.value, rule.equals, rule.type) !== 0
      )
        return {
          status: "fail",
          reason: "payload-value-mismatch",
          field: rule.name,
        };
      if (
        (rule.min !== undefined &&
          compare(field.value, rule.min, rule.type) < 0) ||
        (rule.max !== undefined &&
          compare(field.value, rule.max, rule.type) > 0)
      )
        return {
          status: "fail",
          reason: "payload-value-out-of-range",
          field: rule.name,
        };
    }
  return { status: "pass", reason: "declared-payload-rules-satisfied" };
}
