import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { planResearchIntake } from "../scripts/enterprise-journeys/research-intake.mjs";
function fixture() {
  const protocol = {
    version: 1,
    purpose: "Understand checkout friction",
    method: "moderated-usability",
    recruitment: "Invited existing customers",
    targetPopulation: "Customers attempting checkout",
    sampling: "convenience",
    identityPolicy:
      "Study-scoped canonical participant aliases; not authenticated identity",
    allowCrossSessionInference: false,
    participants: [{ participantId: "p1", aliases: ["alias-one"] }],
    tasks: [
      {
        taskId: "checkout",
        instructions: "Attempt sandbox checkout",
        requiredKinds: ["observed-behavior"],
      },
    ],
    prompts: [
      {
        promptId: "prompt1",
        taskId: "checkout",
        text: "Please describe what you expect",
      },
    ],
    sessions: [
      {
        sessionId: "s1",
        participantId: "p1",
        taskIds: ["checkout"],
        startedAt: "2026-11-19T01:00:00Z",
        endedAt: "2026-11-19T01:30:00Z",
      },
    ],
  };
  const context = {
    customerId: "customer",
    entityId: "site",
    studyId: "study",
    recipientId: "customer-reviewers",
    assessmentAt: "2026-11-19T02:00:00Z",
    maxAccessAgeSeconds: 86400,
    protocol,
    protocolDigest: enterpriseDigest(protocol),
    access: [],
  };
  context.access.push({
    participantId: "p1",
    scope: {
      customerId: context.customerId,
      entityId: context.entityId,
      studyId: context.studyId,
      recipientId: context.recipientId,
      protocolDigest: context.protocolDigest,
      purposeDigest: enterpriseDigest(protocol.purpose),
    },
    analysisAllowed: true,
    customerSummaryAllowed: true,
    stateObservedAt: "2026-11-19T01:45:00Z",
    validUntil: "2026-11-20T00:00:00Z",
    evidenceDigest: "a".repeat(64),
  });
  const source = {
    scope: {
      customerId: context.customerId,
      entityId: context.entityId,
      studyId: context.studyId,
      protocolDigest: context.protocolDigest,
    },
    sourceId: "export1",
    recordId: "record1",
    kind: "observed-behavior",
    sessionId: "s1",
    participantAlias: "alias-one",
    taskId: "checkout",
    promptId: "prompt1",
    observedAt: "2026-11-19T01:10:00Z",
    capturedAt: "2026-11-19T01:35:00Z",
    supportingRecordIds: [],
    artifactHash: "b".repeat(64),
  };
  return { context, source };
}
it("plans metadata-only acquisition without authorizing actions or claiming content verification", () => {
  const f = fixture(),
    r = planResearchIntake(f.context, [f.source]);
  expect(r.sources[0]).toMatchObject({
    sourceId: "export1",
    fetchEligible: true,
    customerSummaryEligible: true,
  });
  expect(r.contentVerified).toBe(false);
  expect(r.studyComplete).toBe(false);
  expect(r.actionAuthorized).toBe(false);
});
it("canonicalizes aliases without counting repeat exports as independent participants", () => {
  const f = fixture(),
    r = planResearchIntake(f.context, [
      f.source,
      { ...f.source, sourceId: "export2", participantAlias: "p1" },
    ]);
  expect(r.accounting.declaredEligibleParticipants).toBe(1);
  expect(r.accounting.declaredRecordIdentities).toBe(1);
  expect(r.accounting.submittedDescriptors).toBe(2);
});
it.each(["revoked", "missing", "expired", "stale", "scope"])(
  "withholds %s access before content acquisition",
  (mode) => {
    const f = fixture();
    if (mode === "revoked") f.context.access[0].analysisAllowed = false;
    if (mode === "missing") f.context.access = [];
    if (mode === "expired")
      f.context.access[0].validUntil = f.context.assessmentAt;
    if (mode === "stale") f.context.maxAccessAgeSeconds = 60;
    if (mode === "scope")
      f.context.access[0].scope.recipientId = "another-recipient";
    const r = planResearchIntake(f.context, [f.source]);
    expect(r.sources[0].fetchEligible).toBe(false);
    expect(r.sources[0].customerSummaryEligible).toBe(false);
    expect(r.accounting.plannedSessions).toBe(1);
  },
);
it("never treats customer sharing as a substitute for analysis access", () => {
  const f = fixture();
  f.context.access[0].analysisAllowed = false;
  expect(
    planResearchIntake(f.context, [f.source]).sources[0].fetchEligible,
  ).toBe(false);
});
it("permits internal analysis without customer summary disclosure", () => {
  const f = fixture();
  f.context.access[0].customerSummaryAllowed = false;
  expect(planResearchIntake(f.context, [f.source]).sources[0]).toMatchObject({
    fetchEligible: true,
    customerSummaryEligible: false,
  });
});
it("rejects payload text at the metadata preflight boundary", () => {
  const f = fixture();
  expect(() =>
    planResearchIntake(f.context, [
      { ...f.source, artifactText: "private text" },
    ]),
  ).toThrow();
});
it("quarantines inconsistent metadata for one record instead of selecting by source order", () => {
  const f = fixture(),
    other = { ...f.source, sourceId: "other", kind: "participant-statement" };
  const r = planResearchIntake(f.context, [f.source, other]);
  expect(r.sources.every((s) => !s.fetchEligible)).toBe(true);
});
it("withholds inferences when a referenced direct record is absent or inaccessible", () => {
  const f = fixture();
  const inference = {
    ...f.source,
    sourceId: "analysis",
    artifactHash: "c".repeat(64),
    recordId: "inference1",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    observedAt: "2026-11-19T01:40:00Z",
    capturedAt: "2026-11-19T01:41:00Z",
    supportingRecordIds: ["record1"],
  };
  expect(
    planResearchIntake(f.context, [inference]).sources[0].fetchEligible,
  ).toBe(false);
  expect(
    planResearchIntake(f.context, [f.source, inference]).sources[1]
      .fetchEligible,
  ).toBe(true);
  f.context.access[0].analysisAllowed = false;
  expect(
    planResearchIntake(f.context, [f.source, inference]).sources.every(
      (s) => !s.fetchEligible,
    ),
  ).toBe(true);
});
it("keeps missing authorized session/task obligations explicit without requesting revoked content", () => {
  const f = fixture();
  expect(
    planResearchIntake(f.context, []).dataRequests.some(
      (r) => r.type === "missing-record-metadata",
    ),
  ).toBe(true);
  f.context.access[0].analysisAllowed = false;
  expect(
    planResearchIntake(f.context, []).dataRequests.some(
      (r) => r.type === "missing-record-metadata",
    ),
  ).toBe(false);
});
it("rejects metadata from another study before any content can be requested", () => {
  const f = fixture();
  f.source.scope.studyId = "another-study";
  expect(() => planResearchIntake(f.context, [f.source])).toThrow();
});
it("withholds shared artifact bytes when they also contain another participant's restricted record", () => {
  const f = fixture();
  f.context.protocol.participants.push({ participantId: "p2", aliases: [] });
  f.context.protocol.sessions.push({
    ...f.context.protocol.sessions[0],
    sessionId: "s2",
    participantId: "p2",
  });
  f.context.protocolDigest = enterpriseDigest(f.context.protocol);
  f.context.access[0].scope.protocolDigest = f.context.protocolDigest;
  f.context.access.push({
    ...structuredClone(f.context.access[0]),
    participantId: "p2",
    analysisAllowed: false,
  });
  f.source.scope.protocolDigest = f.context.protocolDigest;
  const other = {
    ...f.source,
    sourceId: "other",
    recordId: "record2",
    participantAlias: "p2",
    sessionId: "s2",
  };
  const r = planResearchIntake(f.context, [f.source, other]);
  expect(r.sources.every((s) => !s.fetchEligible)).toBe(true);
});
it("rechecks current access rather than reusing an old eligible plan", () => {
  const f = fixture(),
    prior = planResearchIntake(f.context, [f.source]);
  f.context.access[0].analysisAllowed = false;
  const next = planResearchIntake(f.context, [f.source]);
  expect(prior.sources[0].fetchEligible).toBe(true);
  expect(next.sources[0].fetchEligible).toBe(false);
  expect(next.contextDigest).not.toBe(prior.contextDigest);
  expect(next.accounting.plannedCoverageCells).toBe(
    prior.accounting.plannedCoverageCells,
  );
});
it("requires an explicit cross-session inference policy without counting one participant twice", () => {
  const f = fixture();
  f.context.protocol.sessions.push({
    ...f.context.protocol.sessions[0],
    sessionId: "s2",
  });
  const second = {
    ...f.source,
    sourceId: "export2",
    recordId: "record2",
    sessionId: "s2",
    artifactHash: "d".repeat(64),
  };
  const inference = {
    ...f.source,
    sourceId: "analysis",
    recordId: "inference",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    supportingRecordIds: ["record1", "record2"],
    artifactHash: "e".repeat(64),
  };
  const descriptors = [f.source, second, inference];
  const bind = () => {
    f.context.protocolDigest = enterpriseDigest(f.context.protocol);
    f.context.access[0].scope.protocolDigest = f.context.protocolDigest;
    for (const d of descriptors)
      d.scope.protocolDigest = f.context.protocolDigest;
  };
  bind();
  expect(
    planResearchIntake(f.context, descriptors).sources[2].fetchEligible,
  ).toBe(false);
  f.context.protocol.allowCrossSessionInference = true;
  bind();
  const result = planResearchIntake(f.context, descriptors);
  expect(result.sources[2].fetchEligible).toBe(true);
  expect(result.accounting.declaredEligibleParticipants).toBe(1);
  expect(result.populationPrevalenceAccepted).toBe(false);
});
it("withholds an inference whose direct evidence has conflicting metadata", () => {
  const f = fixture();
  const other = {
    ...f.source,
    sourceId: "other",
    kind: "participant-statement",
  };
  const inference = {
    ...f.source,
    sourceId: "analysis",
    recordId: "inference",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    supportingRecordIds: ["record1"],
    artifactHash: "e".repeat(64),
  };
  const result = planResearchIntake(f.context, [f.source, other, inference]);
  expect(result.sources.every((s) => !s.fetchEligible)).toBe(true);
});
