import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { evaluateTaskObservations } from "./observations.mjs";
import {
  enterpriseDigest,
  checkIdentity,
  stableJson,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "../../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";
import { createDataRequest } from "../../skills/content-search-audit/scripts/lib/data-requests.mjs";

const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const evaluatorDigest = enterpriseDigest(
  [
    "./task-workflow.mjs",
    "./observations.mjs",
    "./task-rules.mjs",
    "../../skills/content-search-audit/scripts/lib/business-observations.mjs",
    "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs",
  ].map((p) => readFileSync(new URL(p, import.meta.url), "utf8")),
);
const shape = (value, keys) =>
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    "Invalid task workflow shape",
  );
const scope = (entry) => enterpriseDigest(entry.context);
function evaluate(entry, run, at) {
  shape(entry, ["evaluationId", "context", "sources"]);
  assert(
    /^[a-zA-Z0-9._:-]{1,128}$/.test(entry.evaluationId),
    "Invalid task evaluation ID",
  );
  assert(
    !Object.hasOwn(entry.context, "customerId") &&
      !Object.hasOwn(entry.context, "assessmentAt"),
    "Workflow owns customer and assessment time",
  );
  assert(
    run.entities.some((e) => e.entityId === entry.context.entityId),
    "Unknown task entity",
  );
  return evaluateTaskObservations(
    { ...entry.context, customerId: run.customerId, assessmentAt: at },
    entry.sources,
  );
}
function rows(result) {
  return result.attempts.flatMap((attempt) =>
    ["ui", "business"].map((channel) => ({
      attemptId: attempt.attemptId,
      channel,
      ...attempt[channel],
      outcome: attempt.facts[channel === "ui" ? "uiOutcome" : "businessStatus"],
      missing:
        result.dataRequests.find(
          (r) => r.attemptId === attempt.attemptId && r.channel === channel,
        ) ?? null,
    })),
  );
}
const opaque = (entry, row) =>
  enterpriseDigest([entry.evaluationId, row.attemptId, row.channel]);
function checkFor(entry, row, evidenceId) {
  const ruleId = `ux-task-${opaque(entry, row)}`;
  const check = {
    moduleId: "ux-cro",
    ruleId,
    ruleVersion: "1",
    entityId: entry.context.entityId,
    scenarioId: entry.context.journeyId,
    windowId: entry.evaluationId,
    status: "unknown",
    reason: `Attributed ${row.channel} task predicate: ${row.status} (${row.reason}). UX quality requires independent interpretation; a business mismatch is not automatically a UX defect.`,
    evidenceIds: [evidenceId],
    dependencies: [evidenceId],
    policyIds: [`ux-task-${entry.evaluationId}`],
    assessedAt: null,
    review: null,
  };
  return { ...check, checkId: checkIdentity(check) };
}
function project(entry, result, evidence, historical = false) {
  const classification =
    result.synthetic === true
      ? "synthetic"
      : result.synthetic === false
        ? "real-declared"
        : "unknown-source-classification";
  const narrative = rows(result).map((row) => ({
    narrativeId: `ux-task-${enterpriseDigest([evidence.evidenceId, row.attemptId, row.channel])}`,
    kind: "observation",
    text: `${historical ? "Historical" : "Current"} supplied task assessment at ${evidence.observedAt}; ${classification}; task reference ${opaque(entry, row)}; ${row.channel}: ${row.status} (${row.reason}); observed category ${row.outcome ?? "unproven"}. Evidence gaps: ${row.missing?.evidenceGaps.join(", ") || "none recorded"}. The result concerns the declared task only. Source/query declarations are unauthenticated. No UX-quality, accessibility, conversion, causal or action-authorization conclusion follows.`,
    evidenceIds: [evidence.evidenceId],
  }));
  const observations = Object.entries(result.accounting).map(
    ([key, value]) => ({
      observationId: `ux-task-${enterpriseDigest([evidence.evidenceId, "accounting", key])}`,
      label: `Task supplied-evidence accounting: ${key}`,
      value,
      unit: "declared records",
      precision: "exact",
      classification: historical ? "historical" : "current",
      period: {
        from: evidence.observedAt.slice(0, 10),
        to: evidence.observedAt.slice(0, 10),
      },
      scopeDescription: `${classification}; accounting of declared attempts and supplied artifacts, not users, conversions or a UX-quality score.`,
      evidenceIds: [evidence.evidenceId],
    }),
  );
  return { narrative, observations };
}
function expiry(entry, at) {
  return new Date(
    Math.max(
      Date.parse(at),
      ...entry.context.attempts.map(
        (a) => Date.parse(a.startedAt) + entry.context.maxAgeSeconds * 1000,
      ),
    ),
  ).toISOString();
}
function replayEvidence(evidence, run) {
  assert(
    evidence?.artifactType === "ux-task-evaluation" &&
      evidence.source === "supplied-task-observations-v1",
    "Missing task source evidence",
  );
  shape(evidence.content, ["entry", "assessmentAt", "evaluatorDigest"]);
  const { entry, assessmentAt } = evidence.content;
  assert(
    evidence.content.evaluatorDigest === evaluatorDigest,
    "Unsupported task evaluator version",
  );
  assert(
    evidence.evidenceId === `ux-task-${enterpriseDigest(evidence.content)}` &&
      evidence.observedAt === assessmentAt &&
      evidence.entityId === entry.context.entityId &&
      evidence.windowId === entry.evaluationId,
    "Invalid task evidence binding",
  );
  assert(
    evidence.scopeKey === entry.context.entityId &&
      evidence.customerId === run.customerId &&
      (evidence.runId === run.runId ||
        run.parentRunIds?.includes(evidence.runId)) &&
      Date.parse(assessmentAt) <= Date.parse(run.assessmentAt),
    "Invalid task evidence ownership/time",
  );
  const result = evaluate(entry, run, assessmentAt);
  assert(
    evidence.validUntil === expiry(entry, assessmentAt),
    "Invalid task evidence expiry",
  );
  return { entry, result };
}
// Recompute stored evaluations from original bytes. The index never supplies
// check/request IDs to delete, and a digest alone is not semantic validation.
function retained(run) {
  const index = run.taskEvaluations ?? [];
  assert(Array.isArray(index) && index.length <= 50, "Invalid task index");
  const entries = [],
    ids = new Set(),
    scopes = new Set();
  for (const record of index) {
    shape(record, ["evaluationId", "evidenceId"]);
    const evidence = run.evidence.find(
      (e) => e.evidenceId === record.evidenceId,
    );
    const { entry, result } = replayEvidence(evidence, run);
    assert(
      entry.evaluationId === record.evaluationId &&
        !ids.has(record.evaluationId) &&
        !scopes.has(scope(entry)),
      "Duplicate/rebound task index",
    );
    for (const t of rows(result).filter((r) => r.status !== "not-assessed")) {
      const expected = checkFor(entry, t, evidence.evidenceId);
      assert(
        stableJson(run.checks.find((c) => c.checkId === expected.checkId)) ===
          stableJson(expected),
        "Task check ownership mismatch",
      );
    }
    assert(
      run.policyVersions[`ux-task-${entry.evaluationId}`] ===
        enterpriseDigest([entry.context, evaluatorDigest]),
      "Task policy mismatch",
    );
    ids.add(entry.evaluationId);
    scopes.add(scope(entry));
    entries.push({ entry, evidence, result });
  }
  const ownedChecks = new Set(
    entries.flatMap((record) =>
      rows(record.result)
        .filter((r) => r.status !== "not-assessed")
        .map(
          (row) =>
            checkFor(record.entry, row, record.evidence.evidenceId).checkId,
        ),
    ),
  );
  assert(
    run.checks
      .filter((c) => c.ruleId.startsWith("ux-task-"))
      .every((c) => ownedChecks.has(c.checkId)),
    "Incomplete task index: unowned active checks",
  );
  assert(
    Object.keys(run.policyVersions)
      .filter((k) => k.startsWith("ux-task-"))
      .every((k) =>
        entries.some((record) => k === `ux-task-${record.entry.evaluationId}`),
      ),
    "Incomplete task index: unowned policies",
  );
  for (const evidence of run.evidence.filter(
    (e) => e.artifactType === "ux-task-evaluation",
  )) {
    const { entry } = replayEvidence(evidence, run);
    assert(
      entries.some(
        (record) =>
          record.entry.evaluationId === entry.evaluationId &&
          scope(record.entry) === scope(entry),
      ),
      "Incomplete or rebound task history index",
    );
  }
  return entries;
}

export async function evaluateEnterpriseTasks(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  const old = retained(previous);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  assert(
    next.moduleIds.includes("ux-cro") && bundle.evaluations.length <= 50,
    "Invalid task module/count",
  );
  const entries = new Map(old.map((r) => [r.entry.evaluationId, r.entry]));
  const incoming = new Set();
  for (const entry of bundle.evaluations) {
    evaluate(entry, next, bundle.assessmentAt);
    assert(!incoming.has(entry.evaluationId), "Duplicate task evaluation ID");
    incoming.add(entry.evaluationId);
    assert(
      !entries.has(entry.evaluationId) ||
        scope(entries.get(entry.evaluationId)) === scope(entry),
      "Cannot rebind task evaluation scope",
    );
    entries.set(entry.evaluationId, entry);
  }
  assert(
    entries.size <= 50 &&
      new Set([...entries.values()].map(scope)).size === entries.size,
    "Duplicate/excess task scopes",
  );
  assert(
    Buffer.byteLength(stableJson([...entries.values()])) <= 16 * 1024 * 1024,
    "Task bundle exceeds byte budget",
  );
  next.taskEvaluations = [];
  const observations = [],
    narrative = [],
    replacements = [];
  // Historical projections are reconstructed, not accepted from cached output.
  for (const evidence of previous.evidence.filter(
    (e) => e.artifactType === "ux-task-evaluation",
  )) {
    const { result } = replayEvidence(evidence, previous);
    const priorProjection = project(
      evidence.content.entry,
      result,
      evidence,
      true,
    );
    observations.push(...priorProjection.observations);
    narrative.push(...priorProjection.narrative);
  }
  for (const entry of entries.values()) {
    const result = evaluate(entry, next, bundle.assessmentAt);
    const content = {
      entry,
      assessmentAt: bundle.assessmentAt,
      evaluatorDigest,
    };
    const digest = enterpriseDigest(content),
      evidenceId = `ux-task-${digest}`;
    const evidence = {
      evidenceId,
      customerId: next.customerId,
      runId: next.runId,
      entityId: entry.context.entityId,
      source: "supplied-task-observations-v1",
      artifactType: "ux-task-evaluation",
      scopeKey: entry.context.entityId,
      windowId: entry.evaluationId,
      observedAt: bundle.assessmentAt,
      validUntil: expiry(entry, bundle.assessmentAt),
      digest,
      content,
    };
    if (!next.evidence.some((e) => e.evidenceId === evidenceId))
      next.evidence.push(evidence);
    next.policyVersions[`ux-task-${entry.evaluationId}`] = enterpriseDigest([
      entry.context,
      evaluatorDigest,
    ]);
    for (const transition of rows(result).filter(
      (r) => r.status !== "not-assessed",
    )) {
      const check = checkFor(entry, transition, evidenceId);
      const existing = next.checks.find((c) => c.checkId === check.checkId);
      assert(
        !existing ||
          old.some((r) => r.entry.evaluationId === entry.evaluationId),
        "Task check collision",
      );
      next.checks = next.checks.filter((c) => c.checkId !== check.checkId);
      next.checks.push(check);
      replacements.push(check);
      next.ruleVersions[`ux-cro/${check.ruleId}`] = check.ruleVersion;
      const priorRequests = next.dataRequests.filter(
        (r) => r.requestedArtifact === check.ruleId,
      );
      assert(
        priorRequests.every(
          (r) =>
            r.moduleIds.length === 1 &&
            r.moduleIds[0] === "ux-cro" &&
            r.affectedCheckIds.length === 1 &&
            r.affectedCheckIds[0] === check.checkId &&
            r.scopeKey === entry.context.entityId &&
            r.windowId === entry.evaluationId,
        ),
        "Task request ownership mismatch",
      );
      const missing = transition.missing;
      const request = createDataRequest({
        customerId: next.customerId,
        runId: next.runId,
        requestedArtifact: check.ruleId,
        scopeKey: entry.context.entityId,
        windowId: entry.evaluationId,
        moduleIds: ["ux-cro"],
        affectedCheckIds: [check.checkId],
        reason:
          "Supply scoped task evidence and independent interpretation; a predicate result alone does not establish UX quality.",
        acceptedFormats: [
          "Task observation JSON",
          "Scoped independent task review",
        ],
        leastPrivilegeAccess:
          "Read-only redacted task evidence; never send passwords, personal identifiers or credentials. No transaction is authorized.",
        exportInstructions: `Task reference ${opaque(entry, transition)}; channel ${transition.channel}; protocol ${entry.context.protocolDigest}; attempt manifest ${entry.context.attemptsDigest}. ${missing ? `Required interval ${stableJson(missing.requiredInterval)}; evidence gaps ${missing.evidenceGaps.join(", ") || missing.reason}. Supply the source-linked observation for this private attempt mapping; include interval coverage, clocks, prerequisites and attempt-specific correlation.` : "Independently review the retained protocol and observation, and document whether the scoped predicate implies a material UX issue. A legitimate rejection or matched synthetic task is not business conversion."}`,
        suggestedOwnerRole:
          missing?.suggestedOwnerRole ?? "UX and website quality owner",
        fallback:
          "Keep UX quality unknown and continue independent checks. Do not execute a transaction to fill this gap.",
        priority: "medium",
      });
      assert(priorRequests.length <= 1, "Duplicate task request ownership");
      const prior = priorRequests[0];
      if (prior) {
        for (const field of [
          "status",
          "evidenceIds",
          "evidenceDigests",
          "revalidateOnCheckInvalidation",
          "invalidatedEvidenceDigests",
        ])
          if (Object.hasOwn(prior, field))
            request[field] = globalThis.structuredClone(prior[field]);
        if (prior.status !== "requested") request.reason = prior.reason;
      }
      next.dataRequests = next.dataRequests.filter(
        (r) => r.requestedArtifact !== check.ruleId,
      );
      next.dataRequests.push(request);
    }
    next.taskEvaluations.push({
      evaluationId: entry.evaluationId,
      evidenceId,
    });
    const projection = project(entry, result, evidence);
    observations.push(...projection.observations);
    narrative.push(...projection.narrative);
  }
  next.declaredScope = {
    moduleIds: [
      ...new Set([...(next.declaredScope?.moduleIds ?? []), ...next.moduleIds]),
    ],
    checks: [
      ...new Map(
        [
          ...(next.declaredScope?.checks ?? []),
          ...next.checks.map(({ checkId, moduleId, entityId }) => ({
            checkId,
            moduleId,
            entityId,
          })),
        ].map((c) => [c.checkId, c]),
      ).values(),
    ],
  };
  next = reconcileEnterpriseChecks(previous, next, bundle.assessmentAt).run;
  const replacement = new Map(replacements.map((c) => [c.checkId, c]));
  next.checks = next.checks.map((c) => replacement.get(c.checkId) ?? c);
  assert(
    Buffer.byteLength(stableJson(next)) < 32 * 1024 * 1024,
    "Task run exceeds readable limit",
  );
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    observations: [
      ...new Map(observations.map((o) => [o.observationId, o])).values(),
    ],
    narrative: [...new Map(narrative.map((n) => [n.narrativeId, n])).values()],
    findings: [],
    assessmentAccepted: false,
    providerAuthenticated: false,
    causalAcceptance: false,
  };
}
