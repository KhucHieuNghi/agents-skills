import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  enterpriseDigest,
  timestampValue,
  stableJson,
} from "../enterprise-state.mjs";
import { parseCaptureJson } from "../technical-seo/strict-json.mjs";
import { normalizeBusinessObservations } from "../business-observations.mjs";
import { evaluateJourneyTask } from "./task-rules.mjs";

const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (value, keys) =>
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    "Invalid task observation shape",
  );
const id = (value) =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const text = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 2048 &&
  value.isWellFormed();
const time = (value) => {
  assert(timestampValue(value), "Invalid task timestamp");
  return Date.parse(value);
};
const flag = (value) =>
  assert([true, false, null].includes(value), "Invalid task flag");
const sha = (text) => createHash("sha256").update(text).digest("hex");
const scopeKeys = [
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
];
const blank = () => ({
  condition: null,
  conditionsReviewed: null,
  actionAttempted: null,
  uiOutcome: null,
  uiEvidenceReviewed: null,
  businessStatus: null,
  businessEvidenceReviewed: null,
  correlationVerified: null,
  outcomeEnvironment: null,
  outcomeMature: null,
});
function validateContext(c) {
  shape(c, [
    ...scopeKeys,
    "protocol",
    "assessmentAt",
    "maxAgeSeconds",
    "attempts",
  ]);
  for (const key of scopeKeys.filter(
    (k) => !["protocolDigest", "attemptsDigest"].includes(k),
  ))
    assert(id(c[key]), "Invalid task scope");
  assert(
    ["keyboard", "pointer", "programmatic", "mixed"].includes(c.inputMode),
    "Invalid task input mode",
  );
  time(c.assessmentAt);
  const p = c.protocol;
  shape(p, [
    "version",
    "correlationGrain",
    "retryPolicy",
    "businessSelection",
    "instructions",
    "preconditions",
    "uiDefinition",
    "businessDefinition",
    "uiHorizonSeconds",
    "businessHorizonSeconds",
    "ingestionLagSeconds",
    "steps",
  ]);
  assert(
    p.version === 1 &&
      p.correlationGrain === "attempt" &&
      p.retryPolicy === "new-attempt-id" &&
      p.businessSelection === "single-terminal-record",
    "Unsupported task protocol policy",
  );
  for (const key of [
    "instructions",
    "preconditions",
    "uiDefinition",
    "businessDefinition",
  ])
    assert(text(p[key]), "Missing task protocol definition");
  for (const key of [
    "uiHorizonSeconds",
    "businessHorizonSeconds",
    "ingestionLagSeconds",
  ])
    assert(
      Number.isSafeInteger(p[key]) && p[key] >= 0 && p[key] <= 31622400,
      "Invalid task horizon",
    );
  assert(
    Number.isSafeInteger(c.maxAgeSeconds) &&
      c.maxAgeSeconds <= 31622400 &&
      c.maxAgeSeconds >
        Math.max(p.uiHorizonSeconds, p.businessHorizonSeconds) +
          p.ingestionLagSeconds,
    "No fresh mature task interval",
  );
  assert(
    enterpriseDigest(p) === c.protocolDigest,
    "Task protocol digest mismatch",
  );
  assert(
    Array.isArray(p.steps) && p.steps.length > 0 && p.steps.length <= 100,
    "Invalid task steps",
  );
  const steps = new Map();
  for (const step of p.steps) {
    shape(step, [
      "stepId",
      "prerequisiteStepIds",
      "definition",
      "businessBinding",
    ]);
    assert(
      id(step.stepId) && !steps.has(step.stepId),
      "Duplicate/invalid step",
    );
    assert(
      Array.isArray(step.prerequisiteStepIds) &&
        new Set(step.prerequisiteStepIds).size ===
          step.prerequisiteStepIds.length &&
        step.prerequisiteStepIds.every((k) => steps.has(k)),
      "Invalid prerequisite order",
    );
    evaluateJourneyTask(step.definition, blank());
    if (step.definition.businessRequired) {
      shape(step.businessBinding, [
        "sourceSystem",
        "outcomeId",
        "dictionaryDigest",
      ]);
      assert(
        id(step.businessBinding.sourceSystem) &&
          id(step.businessBinding.outcomeId) &&
          typeof step.businessBinding.dictionaryDigest === "string" &&
          /^[a-f0-9]{64}$/.test(step.businessBinding.dictionaryDigest),
        "Invalid business protocol binding",
      );
    } else
      assert(
        step.businessBinding === null,
        "UI-only task cannot bind business outcome",
      );
    assert(
      step.definition.environment === c.environment,
      "Task environment mismatch",
    );
    steps.set(step.stepId, step);
  }
  assert(
    Array.isArray(c.attempts) &&
      c.attempts.length > 0 &&
      c.attempts.length <= 100,
    "Invalid task attempts",
  );
  assert(
    c.attemptsDigest === enterpriseDigest(c.attempts),
    "Task attempt manifest digest mismatch",
  );
  const attempts = new Map(),
    correlations = new Set();
  for (const a of c.attempts) {
    shape(a, [
      "attemptId",
      "stepId",
      "prerequisiteAttemptIds",
      "retryOf",
      "startedAt",
      "correlationId",
    ]);
    assert(
      id(a.attemptId) &&
        !attempts.has(a.attemptId) &&
        steps.has(a.stepId) &&
        time(a.startedAt) <= time(c.assessmentAt),
      "Invalid attempt identity/time",
    );
    assert(
      a.correlationId === null ||
        (id(a.correlationId) && !correlations.has(a.correlationId)),
      "Correlation must be unique per attempt",
    );
    if (a.correlationId !== null) correlations.add(a.correlationId);
    assert(
      Array.isArray(a.prerequisiteAttemptIds) &&
        new Set(a.prerequisiteAttemptIds).size ===
          a.prerequisiteAttemptIds.length &&
        a.prerequisiteAttemptIds.every(
          (k) =>
            attempts.has(k) &&
            time(attempts.get(k).startedAt) < time(a.startedAt),
        ),
      "Unbound prerequisite attempt",
    );
    assert(
      stableJson(
        a.prerequisiteAttemptIds.map((k) => attempts.get(k).stepId).sort(),
      ) === stableJson([...steps.get(a.stepId).prerequisiteStepIds].sort()),
      "Prerequisite steps mismatch",
    );
    assert(
      a.retryOf === null ||
        (attempts.has(a.retryOf) &&
          attempts.get(a.retryOf).stepId === a.stepId &&
          time(attempts.get(a.retryOf).startedAt) < time(a.startedAt)),
      "Invalid retry linkage",
    );
    attempts.set(a.attemptId, a);
  }
  return { steps, attempts };
}
function parseSource(source, c, maps) {
  shape(source, ["sourceId", "capturedAt", "artifactText", "artifactHash"]);
  assert(
    id(source.sourceId) &&
      typeof source.artifactText === "string" &&
      source.artifactText.isWellFormed() &&
      Buffer.byteLength(source.artifactText) <= 2 * 1024 * 1024 &&
      sha(source.artifactText) === source.artifactHash,
    "Invalid task source bytes/hash",
  );
  const captured = time(source.capturedAt);
  assert(captured <= time(c.assessmentAt), "Future task source");
  const raw = parseCaptureJson(source.artifactText);
  const validateJson = (value) => {
    if (typeof value === "string")
      assert(value.isWellFormed(), "Invalid JSON Unicode");
    if (typeof value === "number")
      assert(Number.isFinite(value), "Nonfinite task JSON");
    if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value)) {
        assert(key.isWellFormed(), "Invalid JSON key");
        validateJson(item);
      }
  };
  validateJson(raw);
  shape(raw, [
    "schemaVersion",
    "scope",
    "synthetic",
    "provenance",
    "observedFrom",
    "observedThrough",
    "clocksAligned",
    "complete",
    "attempts",
  ]);
  assert(
    raw.schemaVersion === 1 &&
      typeof raw.synthetic === "boolean" &&
      stableJson(raw.scope) ===
        stableJson(Object.fromEntries(scopeKeys.map((k) => [k, c[k]]))),
    "Task source ownership mismatch",
  );
  shape(raw.provenance, ["actor", "method", "locator"]);
  assert(
    text(raw.provenance.actor) &&
      text(raw.provenance.locator) &&
      ["export", "manual"].includes(raw.provenance.method),
    "Missing task provenance",
  );
  flag(raw.clocksAligned);
  flag(raw.complete);
  assert(
    time(raw.observedFrom) <= time(raw.observedThrough) &&
      time(raw.observedThrough) <= captured,
    "Invalid task observation interval",
  );
  assert(
    Array.isArray(raw.attempts) && raw.attempts.length <= 100,
    "Invalid source attempt list",
  );
  const seen = new Set(),
    rows = [];
  for (const r of raw.attempts) {
    shape(r, [
      "attemptId",
      "prerequisitesReviewed",
      "condition",
      "conditionsReviewed",
      "actionAttempted",
      "uiOutcome",
      "uiEvidenceReviewed",
      "uiObservedAt",
      "business",
    ]);
    assert(
      maps.attempts.has(r.attemptId) && !seen.has(r.attemptId),
      "Unknown/duplicate source attempt",
    );
    seen.add(r.attemptId);
    const a = maps.attempts.get(r.attemptId),
      step = maps.steps.get(a.stepId),
      start = time(a.startedAt);
    const facts = {
      ...blank(),
      condition: r.condition,
      conditionsReviewed: r.conditionsReviewed,
      actionAttempted: r.actionAttempted,
      uiOutcome: r.uiOutcome,
      uiEvidenceReviewed: r.uiEvidenceReviewed,
    };
    evaluateJourneyTask(step.definition, facts);
    flag(r.prerequisitesReviewed);
    if (r.uiObservedAt !== null)
      assert(
        time(r.uiObservedAt) >= start &&
          time(r.uiObservedAt) >= time(raw.observedFrom) &&
          time(r.uiObservedAt) <= time(raw.observedThrough),
        "UI observation outside interval",
      );
    const baseReasons = [];
    if (raw.provenance.method !== "export")
      baseReasons.push("manual-assertion");
    if (raw.clocksAligned !== true)
      baseReasons.push("clock-alignment-unproven");
    if (raw.complete !== true || time(raw.observedFrom) > start)
      baseReasons.push("interval-coverage-unproven");
    if (start + c.maxAgeSeconds * 1000 <= time(c.assessmentAt))
      baseReasons.push("stale-attempt");
    const uiReasons = [...baseReasons];
    const uiDeadline = start + c.protocol.uiHorizonSeconds * 1000;
    if (
      r.uiOutcome === "no-feedback"
        ? time(raw.observedThrough) < uiDeadline
        : r.uiObservedAt === null || time(r.uiObservedAt) > uiDeadline
    )
      uiReasons.push("ui-horizon-unproven");
    let business = null,
      selectedBusinessRecord = null;
    const businessReasons = [...baseReasons];
    if (r.business === null) businessReasons.push("missing-business-evidence");
    else {
      const b = r.business;
      shape(b, [
        "dictionary",
        "input",
        "recordId",
        "completeThrough",
        "complete",
        "clocksAligned",
      ]);
      flag(b.complete);
      flag(b.clocksAligned);
      assert(
        step.businessBinding &&
          b.dictionary.sourceSystem === step.businessBinding.sourceSystem &&
          enterpriseDigest(b.dictionary) ===
            step.businessBinding.dictionaryDigest,
        "Business dictionary does not match task protocol",
      );
      assert(
        id(b.recordId) &&
          time(b.completeThrough) <= time(b.input.capturedAt) &&
          time(b.input.capturedAt) <= captured &&
          b.input.synthetic === raw.synthetic,
        "Invalid business capture/classification",
      );
      business = normalizeBusinessObservations(b.input, b.dictionary, {
        customerId: c.customerId,
        entityId: c.entityId,
        sourceSystem: b.dictionary.sourceSystem,
        assessmentAt: c.assessmentAt,
        window: {
          from: raw.observedFrom,
          to: new Date(time(raw.observedThrough) + 1).toISOString(),
        },
      });
      const record = business.records.find((x) => x.recordId === b.recordId);
      assert(record, "Unresolved business record");
      selectedBusinessRecord = record;
      assert(
        record.outcomeId === step.businessBinding.outcomeId,
        "Business outcome does not match task protocol",
      );
      const deadline = start + c.protocol.businessHorizonSeconds * 1000;
      if (
        b.complete !== true ||
        b.clocksAligned !== true ||
        time(b.completeThrough) < deadline ||
        time(b.input.capturedAt) <
          deadline + c.protocol.ingestionLagSeconds * 1000
      )
        businessReasons.push("business-horizon-unproven");
      if (business.sourceKind !== "export" || !business.provenance)
        businessReasons.push("business-provenance-unproven");
      if (a.correlationId === null || record.subjectId !== a.correlationId)
        businessReasons.push("attempt-correlation-unproven");
      if (time(record.occurredAt) < start || time(record.occurredAt) > deadline)
        businessReasons.push("business-record-outside-horizon");
      const related = business.records.filter(
        (x) =>
          x.subjectId === a.correlationId &&
          x.outcomeId === record.outcomeId &&
          time(x.occurredAt) >= start &&
          time(x.occurredAt) <= deadline,
      );
      if (related.length !== 1)
        businessReasons.push("business-lifecycle-selection-unresolved");
      facts.businessStatus = record.status;
      facts.businessEvidenceReviewed = businessReasons.length === 0;
      facts.correlationVerified =
        a.correlationId !== null && record.subjectId === a.correlationId;
      facts.outcomeEnvironment = c.environment;
      facts.outcomeMature = businessReasons.length === 0;
    }
    rows.push({
      attemptId: a.attemptId,
      facts,
      prerequisitesReviewed: r.prerequisitesReviewed,
      baseReasons,
      uiReasons,
      businessReasons,
      business,
      selectedBusinessRecord,
      uiSatisfiedAt: r.uiObservedAt,
      businessSatisfiedAt: selectedBusinessRecord?.occurredAt ?? null,
    });
  }
  return {
    ...globalThis.structuredClone(source),
    synthetic: raw.synthetic,
    provenance: raw.provenance,
    observedFrom: raw.observedFrom,
    observedThrough: raw.observedThrough,
    rows,
  };
}
export function evaluateTaskObservations(context, inputs) {
  const maps = validateContext(context);
  assert(
    Array.isArray(inputs) &&
      inputs.length <= 20 &&
      inputs.reduce(
        (n, s) =>
          n +
          (typeof s?.artifactText === "string"
            ? Buffer.byteLength(s.artifactText)
            : 0),
        0,
      ) <=
        16 * 1024 * 1024,
    "Task source count/byte limit",
  );
  const sources = inputs.map((s) => parseSource(s, context, maps));
  assert(
    new Set(sources.map((s) => s.sourceId)).size === sources.length &&
      new Set(sources.map((s) => s.synthetic)).size <= 1,
    "Duplicate source or mixed synthetic classification",
  );
  const synthetic = sources[0]?.synthetic ?? null,
    attempts = [],
    dataRequests = [];
  for (const a of context.attempts) {
    const step = maps.steps.get(a.stepId),
      candidates = sources.flatMap((s) =>
        s.rows
          .filter((r) => r.attemptId === a.attemptId)
          .map((r) => ({ ...r, sourceId: s.sourceId })),
      );
    const eligible = candidates.filter((r) => r.baseReasons.length === 0);
    const shared = new Set(
      eligible.map((r) =>
        stableJson([
          r.facts.condition,
          r.facts.conditionsReviewed,
          r.facts.actionAttempted,
          r.prerequisitesReviewed,
        ]),
      ),
    );
    const prerequisitesMet = a.prerequisiteAttemptIds.every((id) => {
      const prior = attempts.find((x) => x.attemptId === id);
      return (
        prior.ui.status === "pass" &&
        ["pass", "not-assessed"].includes(prior.business.status) &&
        prior.satisfiedAt !== null &&
        time(prior.satisfiedAt) < time(a.startedAt)
      );
    });
    const sharedBlocked =
      shared.size !== 1 ||
      !prerequisitesMet ||
      eligible.some((r) => r.prerequisitesReviewed !== true);
    const facts = sharedBlocked
      ? blank()
      : {
          ...blank(),
          condition: eligible[0].facts.condition,
          conditionsReviewed: eligible[0].facts.conditionsReviewed,
          actionAttempted: eligible[0].facts.actionAttempted,
        };
    const channelSources = {},
      channelSatisfiedAt = {},
      channelConflicts = {};
    for (const channel of ["ui", "business"]) {
      const rows = eligible.filter((r) => r[`${channel}Reasons`].length === 0);
      const keys =
        channel === "ui"
          ? ["uiOutcome", "uiEvidenceReviewed"]
          : [
              "businessStatus",
              "businessEvidenceReviewed",
              "correlationVerified",
              "outcomeEnvironment",
              "outcomeMature",
            ];
      const signatures = new Set(
        rows.map((r) =>
          stableJson([
            keys.map((k) => r.facts[k]),
            channel === "business" ? r.selectedBusinessRecord : null,
          ]),
        ),
      );
      channelSources[channel] = rows.map((r) => r.sourceId);
      channelConflicts[channel] = signatures.size > 1;
      channelSatisfiedAt[channel] = null;
      if (!sharedBlocked && signatures.size === 1) {
        for (const key of keys) facts[key] = rows[0].facts[key];
        const stamps = rows.map((r) => r[`${channel}SatisfiedAt`]);
        if (stamps.every((t) => t !== null))
          channelSatisfiedAt[channel] = new Date(
            Math.max(...stamps.map(time)),
          ).toISOString();
      }
    }
    const evaluated = evaluateJourneyTask(step.definition, facts);
    const item = {
      ...a,
      synthetic,
      ui: evaluated.ui,
      business: evaluated.business,
      facts,
      sourceIds: candidates.map((r) => r.sourceId),
      channelSources,
      channelConflicts,
      channelSatisfiedAt,
      satisfiedAt:
        evaluated.ui.status === "pass" &&
        ["pass", "not-assessed"].includes(evaluated.business.status) &&
        channelSatisfiedAt.ui !== null &&
        (!step.definition.businessRequired ||
          channelSatisfiedAt.business !== null)
          ? new Date(
              Math.max(
                time(channelSatisfiedAt.ui),
                step.definition.businessRequired
                  ? time(channelSatisfiedAt.business)
                  : 0,
              ),
            ).toISOString()
          : null,
      sharedConflict: shared.size > 1,
      prerequisitesMet,
    };
    attempts.push(item);
    for (const channel of ["ui", "business"])
      if (item[channel].status === "unknown")
        dataRequests.push({
          requestId: `journey-task-${enterpriseDigest([context.customerId, context.entityId, context.protocolDigest, a, channel])}`,
          customerId: context.customerId,
          entityId: context.entityId,
          journeyId: context.journeyId,
          environment: context.environment,
          attemptId: a.attemptId,
          stepId: a.stepId,
          protocolDigest: context.protocolDigest,
          attemptsDigest: context.attemptsDigest,
          evidenceGaps: [
            ...new Set(
              candidates
                .flatMap((r) => r[`${channel}Reasons`])
                .concat(
                  item.sharedConflict ? ["conflicting-shared-task-facts"] : [],
                  !prerequisitesMet
                    ? ["prerequisite-not-satisfied-before-attempt"]
                    : [],
                  channelConflicts[channel]
                    ? ["conflicting-channel-evidence"]
                    : [],
                ),
            ),
          ],
          channel,
          synthetic,
          reason: item.sharedConflict
            ? "conflicting-shared-task-facts"
            : item[channel].reason,
          requiredInterval: {
            from: a.startedAt,
            through: new Date(
              time(a.startedAt) +
                context.protocol[
                  channel === "ui"
                    ? "uiHorizonSeconds"
                    : "businessHorizonSeconds"
                ] *
                  1000,
            ).toISOString(),
          },
          requestedArtifact:
            "Scoped task-observation JSON with original trace/export, attribution, protocol and attempt-specific correlation",
          exportInstructions: `Supply ${channel} evidence for ${a.attemptId}/${a.stepId}; include full interval coverage, clock alignment, explicit prerequisites and source locators. Keep retries separate and retain conflicting/lifecycle records. Backend completeness must include the declared ingestion lag. Use pseudonymous attempt identifiers, not personal data.`,
          suggestedOwnerRole:
            channel === "ui"
              ? "UX and website quality owner"
              : "Backend and analytics owner",
          leastPrivilegeAccess:
            "Read-only existing evidence; do not send secrets or execute a transaction to fill this request.",
          fallback:
            "Keep the scoped result unknown and continue independent checks.",
        });
  }
  return {
    schemaVersion: 1,
    moduleId: "ux-cro",
    namespace: "attributed-task-observations",
    context: globalThis.structuredClone(context),
    protocol: globalThis.structuredClone(context.protocol),
    protocolDigest: context.protocolDigest,
    synthetic,
    sources,
    attempts,
    dataRequests,
    accounting: {
      declaredAttempts: attempts.length,
      suppliedSources: sources.length,
      uniqueArtifacts: new Set(sources.map((s) => s.artifactHash)).size,
      unknownChannels: dataRequests.length,
    },
    uxQualityAssessment: "not-assessed",
    semanticAcceptance: false,
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
  };
}
