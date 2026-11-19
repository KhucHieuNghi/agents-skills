import { expect, it } from "vitest";
import { enterpriseDigest as digest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateExperimentExports as evaluate } from "../scripts/enterprise-journeys/experiments.mjs";
import { setup, encode, hash, arm } from "./helpers/experiment-exports.js";
const run = (s = setup()) => evaluate(s.context, [encode(s.raw)]);
it("keeps complete original exports blocked pending separately bound semantic review", () => {
  const r = run();
  expect(r.sourceAccounting).toEqual({
    supplied: 1,
    eligible: 1,
    selectedAliases: 1,
  });
  expect(r.decision.decision).toBe("blocked");
  expect(r.decision.facts.preregistered).toBeNull();
  expect(r.decision.facts.outcomesMature).toBe(true);
  expect(r.decision.metrics).toHaveLength(2);
  expect(r.causalAcceptance).toBe(false);
  expect(
    r.requests.some(
      (x) => x.condition === "independent-source-bound-review-required",
    ),
  ).toBe(true);
});
it("preserves aliases without increasing denominators or depending on metric order", () => {
  const s = setup(),
    second = structuredClone(s.raw);
  second.metrics.reverse();
  const r = evaluate(s.context, [encode(s.raw), encode(second, "two")]);
  expect(r.selectedSourceIds).toEqual(["one", "two"]);
  expect(r.decision.facts.controlAssigned).toBe(100);
  const rev = evaluate(s.context, [encode(second, "two"), encode(s.raw)]);
  expect(r.evidenceSetDigest).toBe(rev.evidenceSetDigest);
});
it("preserves conflicting eligible results without choosing the better one", () => {
  const s = setup(),
    second = structuredClone(s.raw);
  second.metrics[0].treatment = arm(50);
  const r = evaluate(s.context, [encode(s.raw), encode(second, "two")]);
  expect(r.selectionReasons).toContain("conflicting-eligible-sources");
  expect(r.selectedSourceIds).toEqual([]);
  expect(r.records).toHaveLength(2);
});
it("never merges partial exports into a complete family", () => {
  const s = setup(),
    second = structuredClone(s.raw);
  s.raw.metrics.pop();
  second.metrics.shift();
  const r = evaluate(s.context, [encode(s.raw), encode(second, "two")]);
  expect(r.selectedSourceIds).toEqual([]);
  expect(r.sourceAccounting.eligible).toBe(0);
  expect(r.decision.metrics).toHaveLength(2);
});
it("keeps stable review evidence binding while reassessing the clock", () => {
  const s = setup(),
    first = run(s);
  s.context.assessmentAt = "2026-11-05T00:00:00Z";
  const second = run(s);
  expect(first.bindingDigest).toBe(second.bindingDigest);
  expect(first.evidenceSetDigest).toBe(second.evidenceSetDigest);
  expect(first.contextDigest).not.toBe(second.contextDigest);
});
it("fresh re-download cannot refresh an expired enrollment window", () => {
  const s = setup();
  s.context.assessmentAt = "2026-11-09T00:00:00Z";
  const r = evaluate(s.context, [encode(s.raw, "one", s.context.assessmentAt)]);
  expect(r.records[0].reasons).toContain("stale-window");
  expect(r.selectedSourceIds).toEqual([]);
});
it("requires watermark maturity and capture lag independently", () => {
  const s = setup();
  s.raw.dataCompleteThrough = "2026-11-02T12:00:00Z";
  expect(run(s).records[0].reasons).toContain("immature-or-incomplete-window");
  s.raw.dataCompleteThrough = "2026-11-03T00:00:00Z";
  expect(
    evaluate(s.context, [encode(s.raw, "one", "2026-11-03T00:59:59Z")])
      .records[0].reasons,
  ).toContain("immature-or-incomplete-window");
});
it.each(["sampled", "thresholded", "modeled"])("blocks %s exports", (key) => {
  const s = setup();
  s.raw.quality[key] = true;
  expect(run(s).records[0].reasons).toContain("ineligible-data-quality");
});
it("retains manual and unknown-quality artifacts beside eligible evidence", () => {
  const s = setup(),
    second = structuredClone(s.raw);
  second.provenance.method = "manual";
  second.quality.complete = null;
  const r = evaluate(s.context, [encode(s.raw), encode(second, "two")]);
  expect(r.selectedSourceIds).toEqual(["one"]);
  expect(r.records[1].reasons).toEqual(
    expect.arrayContaining(["manual-evidence", "ineligible-data-quality"]),
  );
});
it("rejects hash substitution, duplicate keys and source review fields", () => {
  const s = setup(),
    e = encode(s.raw);
  e.artifactHash = "f".repeat(64);
  expect(() => evaluate(s.context, [e])).toThrow();
  const text = JSON.stringify(s.raw).replace(
    '"schemaVersion":1',
    '"schemaVersion":1,"schemaVersion":1',
  );
  expect(() =>
    evaluate(s.context, [
      { ...encode(s.raw), artifactText: text, artifactHash: hash(text) },
    ]),
  ).toThrow();
  s.raw.reviewed = true;
  expect(() => run(s)).toThrow();
});
it("rejects foreign scope, mixed synthetic data and changed definitions", () => {
  const a = setup();
  a.raw.scope = { ...a.raw.scope, customerId: "other" };
  expect(() => run(a)).toThrow();
  const b = setup();
  b.raw.synthetic = false;
  expect(() => run(b)).toThrow();
  const c = setup();
  c.context.protocol.metrics[0].outcomeId = "different";
  c.context.protocolDigest = digest(c.context.protocol);
  expect(() => run(c)).toThrow();
});
it("rejects future watermark, impossible calendar and malformed Unicode", () => {
  const a = setup();
  a.raw.dataCompleteThrough = "2026-11-05T00:00:00Z";
  expect(() => run(a)).toThrow();
  const b = setup();
  b.context.assessmentAt = "2026-02-30T00:00:00Z";
  expect(() => run(b)).toThrow();
  const c = setup();
  c.raw.provenance.actor = "\ud800";
  expect(() => run(c)).toThrow();
});
it("reports missing sources and precise scope/time requests without zeros", () => {
  const s = setup(),
    r = evaluate(s.context, []);
  expect(r.selectionReasons).toEqual(["missing-source"]);
  expect(r.decision.facts.controlAssigned).toBeNull();
  expect(r.requests[0].scope).toEqual(s.context.scope);
  expect(r.requests[0].requiredCompleteThrough).toBe(
    "2026-11-03T00:00:00.000Z",
  );
});
it("rejects impossible freshness policy and oversize input before interpretation", () => {
  const s = setup();
  s.context.maxAgeSeconds = 90000;
  expect(() => run(s)).toThrow();
  const t = setup(),
    e = encode(t.raw);
  e.artifactText = " ".repeat(2 * 1024 * 1024 + 1);
  e.artifactHash = hash(e.artifactText);
  expect(() => evaluate(t.context, [e])).toThrow();
});

it("does not accept late registration or unsupported stopping declarations", () => {
  const s = setup();
  s.context.protocol.registration.registeredAt =
    s.context.protocol.enrollment.from;
  s.context.protocolDigest = digest(s.context.protocol);
  s.raw.protocolDigest = s.context.protocolDigest;
  expect(run(s).records[0].reasons).toContain(
    "registration-not-before-enrollment",
  );
  s.context.protocol.stopping.rule = "sequential";
  s.context.protocolDigest = digest(s.context.protocol);
  s.raw.protocolDigest = s.context.protocolDigest;
  expect(run(s).records[0].reasons).toContain("unsupported-stopping-policy");
});
it.each([
  ["commerce", "payment-settled"],
  ["booking", "booking-confirmed"],
  ["lead", "crm-accepted"],
  ["subscription", "subscription-active"],
  ["publishing", "qualified-engagement"],
  ["mixed", "booking-with-paid-membership"],
])(
  "retains %s outcome bindings without claiming semantic verification",
  (profile, outcomeId) => {
    const s = setup();
    s.context.protocol.metrics[0].outcomeId = outcomeId;
    s.context.protocol.metrics[0].sourceSystem = profile;
    s.context.protocol.metrics[0].businessDictionaryDigest = digest({
      profile,
      outcomeId,
    });
    s.context.protocolDigest = digest(s.context.protocol);
    s.raw.protocolDigest = s.context.protocolDigest;
    const r = run(s);
    expect(r.context.protocol.metrics[0].outcomeId).toBe(outcomeId);
    expect(r.decision.facts.metricDefinitionsVerified).toBeNull();
    expect(r.decision.decision).toBe("blocked");
  },
);

it("preserves request identity across reassessment of unchanged evidence", () => {
  const s = setup(),
    first = run(s);
  s.context.assessmentAt = "2026-11-05T00:00:00Z";
  expect(run(s).requests.map((r) => r.requestId)).toEqual(
    first.requests.map((r) => r.requestId),
  );
});
it("keeps unknown original assignment counts ineligible beside complete evidence", () => {
  const s = setup(),
    unknown = structuredClone(s.raw);
  unknown.assignmentCounts.controlAssigned = null;
  const r = evaluate(s.context, [encode(unknown, "unknown"), encode(s.raw)]);
  expect(r.records[0].reasons).toContain("missing-assignment-counts");
  expect(r.sourceAccounting.eligible).toBe(1);
  expect(r.selectedSourceIds).toEqual(["one"]);
  expect(r.records[0].raw.assignmentCounts.controlAssigned).toBeNull();
});
