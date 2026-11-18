import { expect, it } from "vitest";
import {
  validateTrackingPayload,
  validatePayloadRules,
  evaluateTrackingPayload,
} from "../skills/content-search-audit/scripts/lib/tracking-payload.mjs";
const rules = [
  {
    name: "currency",
    type: "enum",
    required: true,
    allowedValues: ["USD", "VND"],
  },
  {
    name: "value",
    type: "decimal",
    required: true,
    min: "0",
    max: "9007199254740993.01",
  },
  { name: "transaction", type: "digest", required: true },
];
const payload = () => ({
  complete: true,
  fields: [
    { name: "currency", type: "enum", value: "USD" },
    { name: "value", type: "decimal", value: "9007199254740993.00" },
    { name: "transaction", type: "digest", value: "a".repeat(64) },
  ],
});
it("compares exact decimals without rounding large monetary values", () => {
  const p = payload();
  expect(evaluateTrackingPayload(rules, [p]).status).toBe("pass");
  p.fields[1].value = "9007199254740993.02";
  expect(evaluateTrackingPayload(rules, [p]).reason).toBe(
    "payload-value-out-of-range",
  );
});
it("distinguishes missing evidence from a proven missing required field", () => {
  expect(evaluateTrackingPayload(rules, [undefined]).status).toBe("unknown");
  const p = payload();
  p.fields.pop();
  expect(evaluateTrackingPayload(rules, [p]).reason).toBe(
    "missing-required-payload-field",
  );
  p.complete = false;
  expect(evaluateTrackingPayload(rules, [p]).status).toBe("unknown");
});
it("rejects raw arbitrary strings, unsafe integers and duplicate field names", () => {
  const p = payload();
  p.fields.push({ ...p.fields[0] });
  expect(() => validateTrackingPayload(p)).toThrow(/duplicate/);
  expect(() =>
    validateTrackingPayload({
      complete: true,
      fields: [{ name: "email", type: "string", value: "private@example.com" }],
    }),
  ).toThrow();
  expect(() =>
    validateTrackingPayload({
      complete: true,
      fields: [{ name: "count", type: "integer", value: 9007199254740992 }],
    }),
  ).toThrow();
});
it("checks enum, typed identity and every accepted event payload", () => {
  const p = payload();
  p.fields[0].value = "EUR";
  expect(evaluateTrackingPayload(rules, [payload(), p]).reason).toBe(
    "payload-enum-mismatch",
  );
  const q = payload();
  q.fields[1] = { name: "value", type: "enum", value: "wrong-type" };
  expect(evaluateTrackingPayload(rules, [q]).reason).toBe(
    "payload-type-mismatch",
  );
});
it("rejects invalid or contradictory contracts before evaluating evidence", () => {
  expect(() =>
    validatePayloadRules([
      { name: "value", type: "decimal", required: true, min: "2", max: "1" },
    ]),
  ).toThrow(/bounds/);
  expect(() =>
    validatePayloadRules([{ name: "currency", type: "enum", required: true }]),
  ).toThrow();
  expect(() =>
    validatePayloadRules([
      { name: "flag", type: "boolean", required: true, min: 0 },
    ]),
  ).toThrow();
});
it("does not infer a payload sample from no events or permit partial payloads to pass", () => {
  expect(evaluateTrackingPayload(rules, []).status).toBe("unknown");
  expect(
    evaluateTrackingPayload(rules, [{ ...payload(), complete: false }]).status,
  ).toBe("unknown");
});
it("supports explicit booleans, integers, digest equality and optional absent fields", () => {
  const r = [
    { name: "count", type: "integer", required: true, min: 0, max: 2 },
    { name: "flag", type: "boolean", required: true, equals: false },
    { name: "id", type: "digest", required: false, equals: "b".repeat(64) },
  ];
  const p = {
    complete: true,
    fields: [
      { name: "count", type: "integer", value: 2 },
      { name: "flag", type: "boolean", value: false },
    ],
  };
  expect(evaluateTrackingPayload(r, [p]).status).toBe("pass");
  p.fields[1].value = true;
  expect(evaluateTrackingPayload(r, [p]).reason).toBe("payload-value-mismatch");
});
