import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateTaskObservations } from "../scripts/enterprise-journeys/observations.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
function fixture() {
  const definition = {
    taskId: "checkout",
    condition: "valid-input",
    expectedUi: "success-feedback",
    expectedBusinessStatuses: ["settled"],
    businessRequired: true,
    environment: "sandbox",
  };
  const protocol = {
    version: 1,
    correlationGrain: "attempt",
    retryPolicy: "new-attempt-id",
    businessSelection: "single-terminal-record",
    instructions: "Use the sandbox checkout",
    preconditions: "Available item and valid test card",
    uiDefinition: "Order acknowledgement visible",
    businessDefinition: "One correlated settled payment",
    uiHorizonSeconds: 10,
    businessHorizonSeconds: 60,
    ingestionLagSeconds: 5,
    steps: [{ stepId: "pay", prerequisiteStepIds: [], definition }],
  };
  const context = {
    customerId: "customer",
    entityId: "site",
    environment: "sandbox",
    journeyId: "checkout",
    device: "mobile",
    market: "VN",
    language: "vi",
    inputMode: "pointer",
    protocol,
    protocolDigest: enterpriseDigest(protocol),
    assessmentAt: "2026-11-19T01:10:00Z",
    maxAgeSeconds: 3600,
    attempts: [
      {
        attemptId: "attempt-1",
        stepId: "pay",
        prerequisiteAttemptIds: [],
        retryOf: null,
        startedAt: "2026-11-19T01:00:00Z",
        correlationId: "pseudonymous-attempt",
      },
    ],
  };
  context.attemptsDigest = enterpriseDigest(context.attempts);
  const scope = Object.fromEntries(
    [
      "customerId",
      "entityId",
      "environment",
      "journeyId",
      "device",
      "market",
      "language",
      "inputMode",
      "protocolDigest",
      "attemptsDigest",
    ].map((k) => [k, context[k]]),
  );
  const dictionary = {
    version: "1",
    sourceSystem: "payment",
    outcomes: [
      {
        outcomeId: "payment",
        businessModel: "commerce",
        allowedStatuses: ["settled", "rejected"],
        successStatuses: ["settled"],
      },
    ],
  };
  const input = {
    customerId: "customer",
    entityId: "site",
    sourceSystem: "payment",
    dictionaryVersion: "1",
    sourceId: "payment-export",
    sourceKind: "export",
    capturedAt: "2026-11-19T01:02:00Z",
    synthetic: true,
    provenance: {
      actor: "fixture",
      method: "export",
      locator: "fixture/payment",
    },
    records: [
      {
        recordId: "record-1",
        subjectId: "pseudonymous-attempt",
        outcomeId: "payment",
        status: "settled",
        occurredAt: "2026-11-19T01:00:30Z",
      },
    ],
  };
  protocol.steps[0].businessBinding = {
    sourceSystem: "payment",
    outcomeId: "payment",
    dictionaryDigest: enterpriseDigest(dictionary),
  };
  context.protocolDigest = enterpriseDigest(protocol);
  scope.protocolDigest = context.protocolDigest;
  const raw = {
    schemaVersion: 1,
    scope,
    synthetic: true,
    provenance: { actor: "fixture", method: "export", locator: "fixture/task" },
    observedFrom: "2026-11-19T01:00:00Z",
    observedThrough: "2026-11-19T01:02:00Z",
    clocksAligned: true,
    complete: true,
    attempts: [
      {
        attemptId: "attempt-1",
        prerequisitesReviewed: true,
        condition: "valid-input",
        conditionsReviewed: true,
        actionAttempted: true,
        uiOutcome: "success-feedback",
        uiEvidenceReviewed: true,
        uiObservedAt: "2026-11-19T01:00:03Z",
        business: {
          dictionary,
          input,
          recordId: "record-1",
          completeThrough: "2026-11-19T01:02:00Z",
          complete: true,
          clocksAligned: true,
        },
      },
    ],
  };
  const source = (value = raw, sourceId = "source-1") => {
    const artifactText = JSON.stringify(value);
    return {
      sourceId,
      capturedAt: "2026-11-19T01:02:05Z",
      artifactText,
      artifactHash: hash(artifactText),
    };
  };
  return { context, raw, source };
}
it("binds actual protocol and original normalized business evidence to the declared attempt", () => {
  const f = fixture(),
    r = evaluateTaskObservations(f.context, [f.source()]);
  expect(r.attempts[0].ui.status).toBe("pass");
  expect(r.attempts[0].business.status).toBe("pass");
  expect(r.protocol).toEqual(f.context.protocol);
  expect(r.semanticAcceptance).toBe(false);
  expect(r.actionAuthorized).toBe(false);
  expect(r.synthetic).toBe(true);
});
it("requires the full response horizon before claiming absent UI feedback", () => {
  const f = fixture();
  f.raw.attempts[0].uiOutcome = "no-feedback";
  f.raw.attempts[0].uiObservedAt = null;
  f.raw.observedThrough = "2026-11-19T01:00:05Z";
  f.raw.attempts[0].business = null;
  expect(
    evaluateTaskObservations(f.context, [f.source()]).attempts[0].ui.status,
  ).toBe("unknown");
});
it("does not correlate business records by time alone", () => {
  const f = fixture();
  f.raw.attempts[0].business.input.records[0].subjectId = "another-attempt";
  const r = evaluateTaskObservations(f.context, [f.source()]);
  expect(r.attempts[0].business.status).toBe("unknown");
  expect(r.dataRequests.length).toBeGreaterThan(0);
});
it("keeps conflicting eligible observations unknown regardless of input order", () => {
  const f = fixture(),
    second = structuredClone(f.raw);
  second.attempts[0].uiOutcome = "error-feedback";
  for (const sources of [
    [f.source(), f.source(second, "other")],
    [f.source(second, "other"), f.source()],
  ]) {
    const r = evaluateTaskObservations(f.context, sources);
    expect(r.attempts[0].ui.status).toBe("unknown");
    expect(r.attempts[0].business.status).toBe("pass");
    expect(r.sources).toHaveLength(2);
  }
});
it.each(["manual", "stale", "clock", "partial"])(
  "retains %s evidence without an eligible conclusion",
  (mode) => {
    const f = fixture();
    if (mode === "manual") f.raw.provenance.method = "manual";
    if (mode === "stale") f.context.assessmentAt = "2026-11-20T01:00:00Z";
    if (mode === "clock") f.raw.clocksAligned = false;
    if (mode === "partial") f.raw.complete = false;
    const r = evaluateTaskObservations(f.context, [f.source()]);
    expect(r.sources).toHaveLength(1);
    expect(r.attempts[0].ui.status).toBe("unknown");
    expect(r.attempts[0].business.status).toBe("unknown");
  },
);
it("rejects redefined protocols, foreign scopes, ambiguous JSON and action grants", () => {
  const f = fixture();
  f.context.protocol.instructions = "Different task";
  expect(() => evaluateTaskObservations(f.context, [f.source()])).toThrow();
  const g = fixture();
  g.raw.scope.customerId = "foreign";
  expect(() => evaluateTaskObservations(g.context, [g.source()])).toThrow();
  const h = fixture();
  const source = h.source();
  source.artifactText = '{"schemaVersion":1,"schemaVersion":1}';
  source.artifactHash = hash(source.artifactText);
  expect(() => evaluateTaskObservations(h.context, [source])).toThrow();
  expect(() =>
    evaluateTaskObservations(h.context, [
      h.source({ ...h.raw, authorization: true }),
    ]),
  ).toThrow();
});
it("accounts for missing attempts with precise requests and unknown synthetic classification", () => {
  const f = fixture(),
    r = evaluateTaskObservations(f.context, []);
  expect(r.attempts).toHaveLength(1);
  expect(r.synthetic).toBeNull();
  expect(r.dataRequests).toHaveLength(2);
  expect(r.dataRequests[0]).toMatchObject({
    attemptId: "attempt-1",
    stepId: "pay",
    protocolDigest: f.context.protocolDigest,
  });
});
it("rejects an unrelated business outcome even when its status and attempt identifier match", () => {
  const f = fixture(),
    b = f.raw.attempts[0].business;
  b.dictionary.outcomes[0].outcomeId = "unrelated-payment";
  b.input.records[0].outcomeId = "unrelated-payment";
  expect(() => evaluateTaskObservations(f.context, [f.source()])).toThrow();
});
it("propagates disputed task conditions across both channels", () => {
  const f = fixture(),
    other = structuredClone(f.raw);
  other.attempts[0].condition = "invalid-input";
  const r = evaluateTaskObservations(f.context, [
    f.source(),
    f.source(other, "other"),
  ]);
  expect(r.attempts[0].sharedConflict).toBe(true);
  expect(r.attempts[0].ui.status).toBe("unknown");
  expect(r.attempts[0].business.status).toBe("unknown");
});
it("requires interval coverage from the attempt start, not just an end after deadline", () => {
  const f = fixture();
  f.raw.observedFrom = "2026-11-19T01:00:02Z";
  f.raw.attempts[0].uiOutcome = "no-feedback";
  f.raw.attempts[0].uiObservedAt = null;
  expect(
    evaluateTaskObservations(f.context, [f.source()]).attempts[0].ui.status,
  ).toBe("unknown");
});
it("does not select a convenient business status from a lifecycle with multiple records", () => {
  const f = fixture(),
    input = f.raw.attempts[0].business.input;
  input.records.push({
    ...input.records[0],
    recordId: "record-2",
    status: "rejected",
    occurredAt: "2026-11-19T01:00:40Z",
  });
  const r = evaluateTaskObservations(f.context, [f.source()]);
  expect(r.attempts[0].business.status).toBe("unknown");
  expect(r.sources[0].rows[0].business.records).toHaveLength(2);
});
it("requires a backend completeness watermark and ingestion lag independently of UI coverage", () => {
  const f = fixture();
  f.raw.attempts[0].business.completeThrough = "2026-11-19T01:00:45Z";
  const r = evaluateTaskObservations(f.context, [f.source()]);
  expect(r.attempts[0].ui.status).toBe("pass");
  expect(r.attempts[0].business.status).toBe("unknown");
});
it("rejects reusing a user-level correlation identifier across retries", () => {
  const f = fixture();
  f.context.attempts.push({
    ...f.context.attempts[0],
    attemptId: "retry",
    retryOf: "attempt-1",
    startedAt: "2026-11-19T01:03:00Z",
  });
  expect(() => evaluateTaskObservations(f.context, [])).toThrow();
});
it("keeps a later step unknown when its declared prerequisite has no evidence", () => {
  const f = fixture(),
    first = structuredClone(f.context.protocol.steps[0]);
  first.stepId = "before";
  f.context.protocol.steps.unshift(first);
  f.context.protocol.steps[1].prerequisiteStepIds = ["before"];
  f.context.protocolDigest = enterpriseDigest(f.context.protocol);
  f.raw.scope.protocolDigest = f.context.protocolDigest;
  f.context.attempts[0].prerequisiteAttemptIds = ["before-attempt"];
  f.context.attempts.unshift({
    ...f.context.attempts[0],
    attemptId: "before-attempt",
    stepId: "before",
    prerequisiteAttemptIds: [],
    startedAt: "2026-11-19T00:59:00Z",
    correlationId: "before-key",
  });
  f.context.attemptsDigest = enterpriseDigest(f.context.attempts);
  f.raw.scope.attemptsDigest = f.context.attemptsDigest;
  const r = evaluateTaskObservations(f.context, [f.source()]);
  expect(r.attempts[1].prerequisitesMet).toBe(false);
  expect(r.attempts[1].ui.status).toBe("unknown");
  expect(r.attempts[1].business.status).toBe("unknown");
});
it.each(["duplicate", "unicode", "oversized", "mixed-synthetic"])(
  "rejects %s evidence",
  (kind) => {
    const f = fixture();
    if (kind === "duplicate")
      expect(() =>
        evaluateTaskObservations(f.context, [f.source(), f.source()]),
      ).toThrow();
    if (kind === "unicode") {
      f.raw.provenance.actor = "\ud800";
      expect(() => evaluateTaskObservations(f.context, [f.source()])).toThrow();
    }
    if (kind === "oversized") {
      const s = f.source();
      s.artifactText = " ".repeat(2 * 1024 * 1024 + 1);
      s.artifactHash = hash(s.artifactText);
      expect(() => evaluateTaskObservations(f.context, [s])).toThrow();
    }
    if (kind === "mixed-synthetic") {
      const other = structuredClone(f.raw);
      other.synthetic = false;
      other.attempts[0].business.input.synthetic = false;
      expect(() =>
        evaluateTaskObservations(f.context, [
          f.source(),
          f.source(other, "other"),
        ]),
      ).toThrow();
    }
  },
);
it("rejects remapping an existing attempt to another protocol step with unchanged source bytes", () => {
  const f = fixture();
  f.context.protocol.steps.push({
    ...structuredClone(f.context.protocol.steps[0]),
    stepId: "register",
  });
  f.context.protocolDigest = enterpriseDigest(f.context.protocol);
  f.raw.scope.protocolDigest = f.context.protocolDigest;
  const source = f.source();
  f.context.attempts[0].stepId = "register";
  f.context.attemptsDigest = enterpriseDigest(f.context.attempts);
  expect(() => evaluateTaskObservations(f.context, [source])).toThrow();
});
it("requires the prerequisite to be satisfied before the dependent attempt starts", () => {
  const f = fixture();
  const first = f.context.protocol.steps[0];
  first.definition.businessRequired = false;
  first.definition.expectedBusinessStatuses = [];
  first.businessBinding = null;
  const second = {
    ...structuredClone(first),
    stepId: "next",
    prerequisiteStepIds: ["pay"],
  };
  f.context.protocol.steps.push(second);
  f.context.protocolDigest = enterpriseDigest(f.context.protocol);
  f.raw.scope.protocolDigest = f.context.protocolDigest;
  f.context.attempts.push({
    ...f.context.attempts[0],
    attemptId: "next-attempt",
    stepId: "next",
    prerequisiteAttemptIds: ["attempt-1"],
    correlationId: "next-correlation",
    startedAt: "2026-11-19T01:00:01Z",
  });
  f.raw.attempts[0].business = null;
  f.raw.attempts.push({
    ...f.raw.attempts[0],
    attemptId: "next-attempt",
    uiObservedAt: "2026-11-19T01:00:02Z",
  });
  f.context.attemptsDigest = enterpriseDigest(f.context.attempts);
  f.raw.scope.attemptsDigest = f.context.attemptsDigest;
  const r = evaluateTaskObservations(f.context, [f.source()]);
  expect(r.attempts[0].ui.status).toBe("pass");
  expect(r.attempts[1].prerequisitesMet).toBe(false);
  expect(r.attempts[1].ui.status).toBe("unknown");
  f.context.attempts[1].startedAt = "2026-11-19T01:00:04Z";
  f.raw.attempts[1].uiObservedAt = "2026-11-19T01:00:05Z";
  f.context.attemptsDigest = enterpriseDigest(f.context.attempts);
  f.raw.scope.attemptsDigest = f.context.attemptsDigest;
  expect(
    evaluateTaskObservations(f.context, [f.source()]).attempts[1].ui.status,
  ).toBe("pass");
});
it("does not merge distinct same-status business records across source exports", () => {
  const f = fixture(),
    other = structuredClone(f.raw),
    b = other.attempts[0].business;
  b.recordId = b.input.records[0].recordId = "record-2";
  b.input.records[0].occurredAt = "2026-11-19T01:00:31Z";
  expect(
    evaluateTaskObservations(f.context, [f.source(), f.source(other, "other")])
      .attempts[0].business.status,
  ).toBe("unknown");
});
it("treats identical source aliases as one artifact without inventing independent trials", () => {
  const f = fixture(),
    r = evaluateTaskObservations(f.context, [
      f.source(),
      f.source(f.raw, "alias"),
    ]);
  expect(r.accounting.suppliedSources).toBe(2);
  expect(r.accounting.uniqueArtifacts).toBe(1);
  expect(r.accounting.declaredAttempts).toBe(1);
  expect(r.attempts[0].business.status).toBe("pass");
});
