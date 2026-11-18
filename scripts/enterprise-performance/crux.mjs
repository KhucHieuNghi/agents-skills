import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import {
  enterpriseDigest,
  checkIdentity,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

// Development foundation; not yet a packaged skill capability.
const DAY = 86400000;
const METRICS = Object.freeze({
  lcp: Object.freeze({
    native: "largest_contentful_paint",
    unit: "ms",
    good: 2500,
    poor: 4000,
  }),
  inp: Object.freeze({
    native: "interaction_to_next_paint",
    unit: "ms",
    good: 200,
    poor: 500,
  }),
  cls: Object.freeze({
    native: "cumulative_layout_shift",
    unit: "unitless",
    good: 10,
    poor: 25,
  }),
});
const devices = ["ALL", "PHONE", "DESKTOP", "TABLET"];
const assert = (ok, label) => {
  if (!ok) throw Error(label);
};
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const shape = (x, keys, label) =>
  assert(
    object(x) && Object.keys(x).every((k) => keys.includes(k)),
    `Invalid ${label}`,
  );
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const sha = (x) => createHash("sha256").update(x).digest("hex");
function target(x) {
  shape(x, ["kind", "value"], "target");
  assert(
    ["url", "origin"].includes(x.kind) &&
      typeof x.value === "string" &&
      x.value.length <= 4096,
    "Invalid target value",
  );
  const u = new URL(x.value);
  assert(
    ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.hash,
    "Invalid target URL",
  );
  assert(
    x.value === (x.kind === "origin" ? u.origin : u.href),
    "Target must be canonical",
  );
  return { kind: x.kind, value: x.value };
}
function date(x) {
  assert(
    typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x),
    "Invalid calendar date",
  );
  const n = Date.parse(`${x}T00:00:00.000Z`);
  assert(
    Number.isFinite(n) &&
      new Date(n).toISOString().slice(0, 10) === x &&
      x >= "2000-01-01",
    "Invalid calendar date",
  );
  return n;
}
function nativeDate(x) {
  shape(x, ["year", "month", "day"], "CrUX date");
  assert(
    [x.year, x.month, x.day].every(Number.isSafeInteger),
    "Invalid CrUX date parts",
  );
  const s = `${String(x.year).padStart(4, "0")}-${String(x.month).padStart(2, "0")}-${String(x.day).padStart(2, "0")}`;
  date(s);
  return s;
}
function period(x) {
  shape(x, ["from", "to"], "period");
  assert(
    date(x.to) - date(x.from) === 27 * DAY,
    "Expected inclusive 28-day CrUX period",
  );
  return { from: x.from, to: x.to };
}
// CrUX date labels use fixed PST (UTC-8), not daylight-saving Pacific time.
const periodEnd = (p) => date(p.to) + DAY + 8 * 3600000;
function contextValue(c) {
  shape(
    c,
    [
      "customerId",
      "entityId",
      "environment",
      "assessmentAt",
      "target",
      "formFactor",
      "period",
      "maxAgeDays",
      "authorizedNormalizedUrls",
    ],
    "performance context",
  );
  assert(
    [c.customerId, c.entityId, c.environment].every(id) &&
      timestampValue(c.assessmentAt),
    "Invalid performance context identity/time",
  );
  target(c.target);
  period(c.period);
  assert(
    devices.includes(c.formFactor) &&
      Number.isSafeInteger(c.maxAgeDays) &&
      c.maxAgeDays >= 0 &&
      c.maxAgeDays <= 366,
    "Invalid device/freshness policy",
  );
  assert(
    periodEnd(c.period) <= Date.parse(c.assessmentAt),
    "Assessment period has not completed",
  );
  assert(
    Array.isArray(c.authorizedNormalizedUrls) &&
      c.authorizedNormalizedUrls.length <= 100 &&
      new Set(c.authorizedNormalizedUrls).size ===
        c.authorizedNormalizedUrls.length,
    "Invalid authorized normalization targets",
  );
  for (const value of c.authorizedNormalizedUrls) {
    target({ kind: "url", value });
    assert(
      new URL(value).origin === new URL(c.target.value).origin,
      "Normalized URL outside origin",
    );
  }
}
function metricValue(name, x) {
  if (name !== "cls") {
    assert(
      Number.isSafeInteger(x) && x >= 0 && x <= 2147483647,
      "Invalid CrUX millisecond p75",
    );
    return { value: x, scaled: x };
  }
  assert(
    typeof x === "string" && /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(x),
    "Invalid CrUX decimal CLS p75",
  );
  const [whole, fractional = ""] = x.split(".");
  const scaled = Number(
    BigInt(whole) * 100n + BigInt(fractional.padEnd(2, "0")),
  );
  return { value: `${whole}.${fractional.padEnd(2, "0")}`, scaled };
}
const classification = (name, scaled) =>
  scaled <= METRICS[name].good
    ? "good"
    : scaled > METRICS[name].poor
      ? "poor"
      : "needs-improvement";

/** Exact supplied native response bytes, not authenticated provider execution. */
export function normalizeCruxResponse(input, context) {
  contextValue(context);
  shape(
    input,
    [
      "sourceId",
      "sourceKind",
      "scope",
      "request",
      "capturedAt",
      "httpStatus",
      "artifactText",
      "artifactHash",
    ],
    "CrUX envelope",
  );
  shape(input.scope, ["customerId", "entityId", "environment"], "CrUX scope");
  assert(
    ["customerId", "entityId", "environment"].every(
      (k) => input.scope[k] === context[k],
    ),
    "CrUX scope mismatch",
  );
  assert(
    id(input.sourceId) &&
      input.sourceKind === "crux-query-record" &&
      typeof input.artifactText === "string" &&
      Buffer.byteLength(input.artifactText) <= 1024 * 1024 &&
      /^[a-f0-9]{64}$/.test(input.artifactHash) &&
      sha(input.artifactText) === input.artifactHash,
    "Invalid CrUX source/bytes/hash",
  );
  assert(
    timestampValue(input.capturedAt) &&
      Date.parse(input.capturedAt) <= Date.parse(context.assessmentAt),
    "Invalid/future CrUX capture",
  );
  shape(input.request, ["target", "formFactor"], "CrUX request");
  const requestedTarget = target(input.request.target);
  assert(
    devices.includes(input.request.formFactor),
    "Invalid request form factor",
  );
  const exact =
    enterpriseDigest(requestedTarget) === enterpriseDigest(context.target);
  const originFallback =
    context.target.kind === "url" &&
    requestedTarget.kind === "origin" &&
    requestedTarget.value === new URL(context.target.value).origin;
  assert(exact || originFallback, "CrUX request outside assessment target");
  const payload = JSON.parse(input.artifactText);
  assert(object(payload), "Invalid CrUX payload");
  const base = {
    sourceId: input.sourceId,
    artifactHash: input.artifactHash,
    sourceKind: input.sourceKind,
    capturedAt: input.capturedAt,
    requestedTarget,
    requestedFormFactor: input.request.formFactor,
    authenticated: false,
  };
  if (input.httpStatus !== 200) {
    assert(
      Number.isInteger(input.httpStatus) &&
        input.httpStatus >= 400 &&
        input.httpStatus <= 599 &&
        object(payload.error) &&
        !Object.hasOwn(payload, "record"),
      "Invalid CrUX error response",
    );
    const statuses = {
      NOT_FOUND: 404,
      RESOURCE_EXHAUSTED: 429,
      PERMISSION_DENIED: 403,
      UNAUTHENTICATED: 401,
      INVALID_ARGUMENT: 400,
      INTERNAL: 500,
      UNAVAILABLE: 503,
      DEADLINE_EXCEEDED: 504,
      UNKNOWN: 500,
    };
    assert(
      Object.hasOwn(statuses, payload.error.status) &&
        statuses[payload.error.status] === input.httpStatus &&
        payload.error.code === input.httpStatus,
      "CrUX error code/status mismatch",
    );
    return {
      ...base,
      status: "provider-error",
      reason:
        payload.error.status === "NOT_FOUND"
          ? "no-record"
          : payload.error.status.toLowerCase().replaceAll("_", "-"),
      httpStatus: input.httpStatus,
    };
  }
  assert(
    object(payload.record) && !Object.hasOwn(payload, "error"),
    "Invalid CrUX record response",
  );
  const r = payload.record;
  shape(r.key, ["url", "origin", "formFactor"], "CrUX record key/dimensions");
  assert(
    Object.hasOwn(r.key, "url") !== Object.hasOwn(r.key, "origin"),
    "Ambiguous CrUX record target",
  );
  const returnedTarget = target(
    Object.hasOwn(r.key, "url")
      ? { kind: "url", value: r.key.url }
      : { kind: "origin", value: r.key.origin },
  );
  const hasFormFactor = Object.hasOwn(r.key, "formFactor");
  assert(
    !hasFormFactor || ["PHONE", "DESKTOP", "TABLET"].includes(r.key.formFactor),
    "Invalid native CrUX form factor",
  );
  const formFactor = hasFormFactor ? r.key.formFactor : "ALL";
  assert(
    devices.includes(formFactor) && formFactor === input.request.formFactor,
    "CrUX response/request device mismatch",
  );
  let normalization = null;
  if (Object.hasOwn(payload, "urlNormalizationDetails")) {
    const n = payload.urlNormalizationDetails;
    shape(n, ["originalUrl", "normalizedUrl"], "CrUX URL normalization");
    assert(
      requestedTarget.kind === "url" &&
        returnedTarget.kind === "url" &&
        n.originalUrl === requestedTarget.value &&
        n.normalizedUrl === returnedTarget.value,
      "Invalid CrUX normalization binding",
    );
    assert(
      n.originalUrl === n.normalizedUrl ||
        context.authorizedNormalizedUrls.includes(n.normalizedUrl),
      "Unauthorized CrUX normalization target",
    );
    normalization = {
      originalUrl: n.originalUrl,
      normalizedUrl: n.normalizedUrl,
    };
  }
  assert(
    enterpriseDigest(requestedTarget) === enterpriseDigest(returnedTarget) ||
      normalization !== null,
    "CrUX response/request target mismatch",
  );
  shape(
    r.collectionPeriod,
    ["firstDate", "lastDate"],
    "CrUX collection period",
  );
  const collectionPeriod = period({
    from: nativeDate(r.collectionPeriod.firstDate),
    to: nativeDate(r.collectionPeriod.lastDate),
  });
  const completedAt = periodEnd(collectionPeriod);
  assert(
    completedAt <= Date.parse(input.capturedAt),
    "CrUX collection period incomplete at capture",
  );
  assert(object(r.metrics), "Invalid CrUX metrics");
  const metrics = {};
  for (const [name, spec] of Object.entries(METRICS)) {
    if (!Object.hasOwn(r.metrics, spec.native)) continue;
    const m = r.metrics[spec.native];
    assert(object(m), "Invalid CrUX metric object");
    if (!Object.hasOwn(m, "percentiles")) continue;
    assert(object(m.percentiles), "Invalid CrUX percentile object");
    if (!Object.hasOwn(m.percentiles, "p75")) continue;
    const v = metricValue(name, m.percentiles.p75);
    metrics[name] = {
      p75: v.value,
      unit: spec.unit,
      classification: classification(name, v.scaled),
    };
  }
  const validUntil = new Date(
    completedAt + context.maxAgeDays * DAY,
  ).toISOString();
  const eligible =
    exact &&
    formFactor === context.formFactor &&
    enterpriseDigest(collectionPeriod) === enterpriseDigest(context.period) &&
    Date.parse(context.assessmentAt) <= Date.parse(validUntil);
  return {
    ...base,
    status: "record",
    returnedTarget,
    formFactor,
    normalization,
    period: collectionPeriod,
    periodTimeZone: "UTC-08:00",
    validUntil,
    fresh: Date.parse(context.assessmentAt) <= Date.parse(validUntil),
    eligible,
    metrics,
  };
}

/** Field-only foundation. Lab, report persistence and commercial acceptance are not implemented here. */
export function evaluateCruxField(context, inputs) {
  contextValue(context);
  assert(
    Array.isArray(inputs) && inputs.length <= 100,
    "Invalid CrUX input count",
  );
  assert(
    new Set(inputs.map((x) => x?.sourceId)).size === inputs.length,
    "Duplicate CrUX source IDs",
  );
  const records = inputs
    .map((x) => normalizeCruxResponse(x, context))
    .sort((a, b) =>
      a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
    );
  const applicable = records.filter((r) => r.status === "record" && r.eligible);
  const targetConflict =
    new Set(applicable.map((r) => enterpriseDigest(r.returnedTarget))).size > 1;
  const exclusions = records.flatMap((r) =>
    r.status === "provider-error"
      ? [r.reason]
      : [
          ...(r.requestedTarget.kind !== context.target.kind
            ? ["origin-only"]
            : []),
          ...(r.formFactor !== context.formFactor ? ["device-mismatch"] : []),
          ...(enterpriseDigest(r.period) !== enterpriseDigest(context.period)
            ? ["period-mismatch"]
            : []),
          ...(!r.fresh ? ["stale-field-data"] : []),
        ],
  );
  const scenarioId = enterpriseDigest([
    "performance-scope-v1",
    "field",
    context.customerId,
    context.environment,
    context.target,
    context.formFactor,
  ]);
  const windowId = enterpriseDigest([
    "crux-period-v1",
    context.period,
    "UTC-08:00",
  ]);
  const checks = Object.keys(METRICS).map((name) => {
    const sources = applicable.filter((r) => Object.hasOwn(r.metrics, name));
    const values = targetConflict
      ? []
      : [...new Set(sources.map((r) => r.metrics[name].p75))];
    const metric = sources[0]?.metrics[name];
    const status =
      values.length !== 1
        ? "unknown"
        : metric.classification === "good"
          ? "pass"
          : "fail";
    const identity = {
      moduleId: "performance",
      ruleId: `cwv-${name}-p75`,
      ruleVersion: "1",
      entityId: context.entityId,
      scenarioId,
      windowId,
    };
    return {
      ...identity,
      checkId: checkIdentity(identity),
      status,
      classification: values.length === 1 ? metric.classification : null,
      p75: values.length === 1 ? metric.p75 : null,
      unit: METRICS[name].unit,
      reason: targetConflict
        ? "conflicting-normalized-targets"
        : values.length > 1
          ? "conflicting-p75"
          : values.length === 0
            ? "missing-applicable-p75"
            : "scoped-field-p75",
      missingReasons:
        values.length === 0
          ? [
              ...new Set([
                ...(targetConflict ? ["conflicting-normalized-targets"] : []),
                ...exclusions,
                ...(applicable.length > 0 && sources.length === 0
                  ? ["metric-not-returned"]
                  : []),
                ...(records.length === 0 ? ["no-source"] : []),
              ]),
            ].sort()
          : [],
      evidenceIds: (values.length === 0 ? records : sources).map(
        (r) => r.sourceId,
      ),
    };
  });
  const status = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.every((c) => c.status === "pass")
      ? "pass"
      : "unknown";
  const identity = {
    moduleId: "performance",
    ruleId: "cwv-all-three-v1",
    ruleVersion: "1",
    entityId: context.entityId,
    scenarioId,
    windowId,
  };
  checks.push({
    ...identity,
    checkId: checkIdentity(identity),
    status,
    reason: "all-three-scoped-field-rule",
    evidenceIds: [...new Set(checks.flatMap((c) => c.evidenceIds))].sort(),
  });
  const dataRequests = checks
    .filter((c) => c.ruleId !== "cwv-all-three-v1" && c.status === "unknown")
    .map((c) => ({
      checkId: c.checkId,
      reason: c.reason,
      missingReasons: c.missingReasons,
      target: { ...context.target },
      formFactor: context.formFactor,
      period: { ...context.period },
      maxAgeDays: context.maxAgeDays,
      requestedArtifact: "native CrUX queryRecord JSON",
      ownerRole: "Website analytics owner",
      access: "Read-only export; no passwords or API keys",
      instructions:
        "Supply response bytes and exact request target/device, capture timestamp and collection period. Resolve conflicting exports with provider evidence; do not replace absent metrics with lab metrics.",
      fallback:
        "Retain unknown field assessment; collect separate lab diagnostics or supply RUM under a separately validated population contract.",
    }));
  return {
    moduleId: "performance",
    namespace: "field",
    ruleSet: "cwv-all-three-v1",
    scope: {
      target: { ...context.target },
      formFactor: context.formFactor,
      period: { ...context.period },
    },
    checks,
    dataRequests,
    records,
    assessmentAccepted: false,
    providerAuthenticated: false,
  };
}
