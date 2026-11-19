import { expect, it } from "vitest";
import { encode, hash } from "./helpers/experiment-exports.js";
import { enterpriseDigest as digest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { prepareExperimentReview as prepare } from "../scripts/enterprise-journeys/experiment-review-packet.mjs";
import { reviewFixture as fixture } from "./helpers/experiment-review.js";
const run = (s = fixture()) => prepare(s.context, [encode(s.raw)], s.supports);
it("prepares verified private bytes without turning matching roles into semantic approval", () => {
  const r = run();
  expect(r.requirements).toHaveLength(9);
  expect(r.requirements.every((x) => x.status === "binding-matched")).toBe(
    true,
  );
  expect(r.semanticAcceptance).toBe(false);
  expect(r.aggregate.decision.decision).toBe("blocked");
  expect(r.supportRecords[0].artifactText).toBe(
    "Original registration history",
  );
});
it("distinguishes original byte hashes from canonical dictionary identity", () => {
  const s = fixture(),
    first = run(s),
    d = s.supports.find((x) => x.role === "outcome-dictionary")!;
  d.artifactText = JSON.stringify(s.dictionary, null, 2);
  d.artifactHash = hash(d.artifactText);
  const second = run(s);
  expect(first.evidenceSetDigest).not.toBe(second.evidenceSetDigest);
  expect(
    first.supportRecords.find((x) => x.role === "outcome-dictionary")!
      .dictionaryDigest,
  ).toBe(
    second.supportRecords.find((x) => x.role === "outcome-dictionary")!
      .dictionaryDigest,
  );
  expect(second.requirements.every((x) => x.status === "binding-matched")).toBe(
    true,
  );
});
it("does not accept a broad dictionary role with missing metric binding", () => {
  const s = fixture();
  s.supports.find((x) => x.role === "outcome-dictionary")!.metricIds = [
    "conversion",
  ];
  expect(
    run(s).requirements.find((x) => x.key === "dictionary:harm")!.status,
  ).toBe("missing-support");
});
it.each(["version", "sourceSystem", "outcomeId"])(
  "requires dictionary %s identity",
  (field) => {
    const s = fixture();
    if (field === "version")
      s.context.protocol.metrics[0].dictionaryVersion = "2";
    else if (field === "sourceSystem")
      s.context.protocol.metrics[0].sourceSystem = "other";
    else s.context.protocol.metrics[0].outcomeId = "missing";
    s.context.protocolDigest = digest(s.context.protocol);
    s.raw.protocolDigest = s.context.protocolDigest;
    for (const x of s.supports) x.protocolDigest = s.context.protocolDigest;
    expect(
      run(s).requirements.find((x) => x.key === "dictionary:conversion")!
        .status,
    ).toBe("missing-support");
  },
);
it("requires the original query for every aggregate including unselected sources", () => {
  const s = fixture(),
    other = structuredClone(s.raw);
  other.provenance.queryDigest = "f".repeat(64);
  other.provenance.method = "manual";
  const r = prepare(
    s.context,
    [encode(s.raw), encode(other, "other")],
    s.supports,
  );
  expect(r.requirements.find((x) => x.key === "query:other")!.status).toBe(
    "missing-support",
  );
});
it("preserves competing and unmatched support in receipt identity", () => {
  const s = fixture(),
    first = run(s);
  s.supports.push({
    ...s.supports[1],
    sourceId: "other-config",
    artifactText: "Competing configuration",
    artifactHash: hash("Competing configuration"),
  });
  const r = run(s);
  expect(r.evidenceSetDigest).not.toBe(first.evidenceSetDigest);
  expect(
    r.requirements.find((x) => x.key === "assignment-config")!
      .matchingSourceIds,
  ).toEqual(["assignment-config", "other-config"]);
  const reordered = prepare(
    s.context,
    [encode(s.raw)],
    [...s.supports].reverse(),
  );
  expect(reordered.evidenceSetDigest).toBe(r.evidenceSetDigest);
});
it("marks repeated byte identities as aliases across IDs and roles", () => {
  const s = fixture(),
    original = s.supports[1];
  s.supports.push({ ...original, sourceId: "alias", role: "quality-evidence" });
  expect(run(s).aliases).toContainEqual({
    artifactHash: original.artifactHash,
    sourceIds: ["alias", "assignment-config"],
  });
});
it("preserves missing-support request identity across clock-only reassessment", () => {
  const s = fixture();
  s.supports = [];
  const first = run(s);
  s.context.assessmentAt = "2026-11-05T00:00:00Z";
  const second = run(s);
  expect(first.evidenceSetDigest).toBe(second.evidenceSetDigest);
  expect(first.requests.map((x) => x.requestId)).toEqual(
    second.requests.map((x) => x.requestId),
  );
});
it("rejects substituted bytes, future capture, foreign scope and duplicate source identities", () => {
  const a = fixture();
  a.supports[0].artifactText += "changed";
  expect(() => run(a)).toThrow();
  const b = fixture();
  b.supports[0].capturedAt = "2026-11-05T00:00:00Z";
  expect(() => run(b)).toThrow();
  const c = fixture();
  c.supports[0].scope = { ...c.context.scope, customerId: "foreign" };
  expect(() => run(c)).toThrow();
  const d = fixture();
  d.supports[0].sourceId = "one";
  expect(() => run(d)).toThrow();
});
it("rejects duplicate dictionary keys, invalid IDs and oversized support", () => {
  const a = fixture(),
    d = a.supports.find((x) => x.role === "outcome-dictionary")!;
  d.artifactText = d.artifactText.replace(
    '"version":"1"',
    '"version":"1","version":"1"',
  );
  d.artifactHash = hash(d.artifactText);
  expect(() => run(a)).toThrow();
  const b = fixture();
  b.supports[6].metricIds = ["unknown"];
  expect(() => run(b)).toThrow();
  const c = fixture();
  c.supports[0].artifactText = "x".repeat(1024 * 1024 + 1);
  c.supports[0].artifactHash = hash(c.supports[0].artifactText);
  expect(() => run(c)).toThrow();
});

it("changes support request identity when the requested query changes", () => {
  const s = fixture();
  s.supports = s.supports.filter((x) => x.role !== "metric-query");
  const first = run(s),
    a = first.requirements.find((x) => x.key === "query:one")!;
  s.raw.provenance.queryDigest = "f".repeat(64);
  const second = run(s),
    b = second.requirements.find((x) => x.key === "query:one")!;
  expect(a.requirementId).not.toBe(b.requirementId);
  expect(
    first.requests.find((x) => x.requirementId === a.requirementId)!.requestId,
  ).not.toBe(
    second.requests.find((x) => x.requirementId === b.requirementId)!.requestId,
  );
});
