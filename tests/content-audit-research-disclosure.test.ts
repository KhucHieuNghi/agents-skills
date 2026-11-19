import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { planResearchDisclosure } from "../scripts/enterprise-journeys/research-disclosure.mjs";
async function fixture() {
  const f = JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/research-content.json",
      "utf8",
    ),
  );
  const scope = { ...f.context.access[0].scope };
  const policy = {
    schemaVersion: 1,
    scope,
    allowedKinds: [
      "observed-behavior",
      "participant-statement",
      "analyst-interpretation",
    ],
    reviewMaxAgeSeconds: 3600,
    validUntil: "2026-11-20T00:00:00Z",
  };
  const candidates = [
    {
      candidateId: "summary1",
      scope,
      kind: "observed-behavior",
      artifactHash: "a".repeat(64),
      receiptHash: "b".repeat(64),
      supportBindings: [{ recordId: "record1", recordDigest: "c".repeat(64) }],
    },
  ];
  return { ...f, policy, candidates };
}
const run = (f) =>
  planResearchDisclosure(f.context, f.descriptors, f.policy, f.candidates);
it("permits scoped metadata acquisition without pretending to verify content or review", async () => {
  const f = await fixture(),
    r = run(f);
  expect(r.candidates[0].fetchEligible).toBe(true);
  expect(r.contentVerified).toBe(false);
  expect(r.reviewVerified).toBe(false);
  expect(r.customerExportAuthorized).toBe(false);
  expect(r.storageAuthorized).toBe(false);
  expect(r.policyDigest).toBe(enterpriseDigest(f.policy));
  expect(JSON.stringify(r)).not.toContain("Participant returned");
});
it.each(["analysis", "sharing", "expired", "stale", "missing"])(
  "withholds historical candidate for %s access",
  async (mode) => {
    const f = await fixture();
    expect(run(f).candidates[0].fetchEligible).toBe(true);
    if (mode === "analysis") f.context.access[0].analysisAllowed = false;
    if (mode === "sharing") f.context.access[0].customerSummaryAllowed = false;
    if (mode === "expired")
      f.context.access[0].validUntil = f.context.assessmentAt;
    if (mode === "stale") f.context.maxAccessAgeSeconds = 1;
    if (mode === "missing") f.context.access = [];
    expect(run(f).candidates[0].fetchEligible).toBe(false);
  },
);
it("rejects candidate content without reading its getter", async () => {
  const f = await fixture();
  let read = false;
  Object.defineProperty(f.candidates[0], "text", {
    enumerable: true,
    get() {
      read = true;
      throw Error("PRIVATE");
    },
  });
  expect(() => run(f)).toThrow(/shape/);
  expect(read).toBe(false);
});
it.each(["recipientId", "purposeDigest", "protocolDigest"])(
  "rejects foreign %s scope",
  async (key) => {
    const f = await fixture();
    f.candidates[0].scope = { ...f.candidates[0].scope, [key]: "foreign" };
    expect(() => run(f)).toThrow(/scope/);
  },
);
it("requires isolated candidate and receipt artifacts even for a permitted candidate", async () => {
  const f = await fixture();
  f.candidates.push({
    ...f.candidates[0],
    candidateId: "other",
    kind: "participant-statement",
  });
  expect(run(f).candidates.every((c) => !c.fetchEligible)).toBe(true);
});
it("does not resolve a candidate ID as research support", async () => {
  const f = await fixture();
  f.candidates[0].supportBindings[0].recordId = "summary1";
  expect(run(f).candidates[0].reasons).toContain("unresolved-research-support");
});
it("requires complete direct dependency closure for an interpretation", async () => {
  const f = await fixture();
  f.descriptors.push({
    ...f.descriptors[0],
    sourceId: "analysis",
    recordId: "inference",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    supportingRecordIds: ["record1"],
    artifactHash: "d".repeat(64),
  });
  f.candidates[0].kind = "analyst-interpretation";
  f.candidates[0].supportBindings = [
    { recordId: "inference", recordDigest: "e".repeat(64) },
  ];
  expect(run(f).candidates[0].reasons).toContain(
    "incomplete-direct-dependency-closure",
  );
  f.candidates[0].supportBindings.push({
    recordId: "record1",
    recordDigest: "c".repeat(64),
  });
  expect(run(f).candidates[0].fetchEligible).toBe(true);
  f.context.access[0].customerSummaryAllowed = false;
  expect(run(f).candidates[0].fetchEligible).toBe(false);
});
it("does not relabel direct observations as reviewed interpretations", async () => {
  const f = await fixture();
  f.candidates[0].kind = "analyst-interpretation";
  expect(run(f).candidates[0].reasons).toContain("inference-record-required");
});
it("fails closed on expired policy and unsupported policy options", async () => {
  const f = await fixture();
  f.policy.validUntil = f.context.assessmentAt;
  expect(run(f).candidates[0].reasons).toContain("policy-expired");
  f.policy.allowQuotes = true;
  expect(() => run(f)).toThrow(/shape/);
});
it("rejects duplicate support bindings and candidate identities", async () => {
  const f = await fixture();
  f.candidates[0].supportBindings.push({
    ...f.candidates[0].supportBindings[0],
  });
  expect(() => run(f)).toThrow(/binding/);
  f.candidates[0].supportBindings.pop();
  f.candidates.push({ ...f.candidates[0] });
  expect(() => run(f)).toThrow(/identity/);
});
it("does not fetch a candidate whose artifact aliases source research bytes", async () => {
  const f = await fixture();
  f.candidates[0].artifactHash = f.descriptors[0].artifactHash;
  expect(run(f).candidates[0].fetchEligible).toBe(false);
});
it("applies cross-session policy to the complete candidate support set", async () => {
  const f = await fixture();
  f.context.protocol.allowCrossSessionInference = false;
  f.context.protocol.sessions.push({
    ...f.context.protocol.sessions[0],
    sessionId: "session2",
  });
  f.context.protocolDigest = enterpriseDigest(f.context.protocol);
  f.context.access[0].scope.protocolDigest = f.context.protocolDigest;
  f.policy.scope.protocolDigest = f.context.protocolDigest;
  f.candidates[0].scope.protocolDigest = f.context.protocolDigest;
  f.descriptors[0].scope.protocolDigest = f.context.protocolDigest;
  f.descriptors.push({
    ...f.descriptors[0],
    sourceId: "second",
    recordId: "record2",
    sessionId: "session2",
    artifactHash: "d".repeat(64),
  });
  f.descriptors.push({
    ...f.descriptors[0],
    sourceId: "analysis",
    recordId: "inference",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    supportingRecordIds: ["record1"],
    artifactHash: "e".repeat(64),
  });
  f.candidates[0].kind = "analyst-interpretation";
  f.candidates[0].supportBindings.push(
    { recordId: "inference", recordDigest: "e".repeat(64) },
    { recordId: "record2", recordDigest: "f".repeat(64) },
  );
  expect(run(f).candidates[0].reasons).toContain(
    "cross-session-interpretation-not-declared",
  );
  f.context.protocol.allowCrossSessionInference = true;
  f.context.protocolDigest = enterpriseDigest(f.context.protocol);
  f.context.access[0].scope.protocolDigest = f.context.protocolDigest;
  f.policy.scope.protocolDigest = f.context.protocolDigest;
  f.candidates[0].scope.protocolDigest = f.context.protocolDigest;
  for (const d of f.descriptors)
    d.scope.protocolDigest = f.context.protocolDigest;
  expect(run(f).candidates[0].fetchEligible).toBe(true);
});
