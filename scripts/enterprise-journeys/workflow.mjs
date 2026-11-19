import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { evaluateFunnel } from "./funnel.mjs";
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
    "./workflow.mjs",
    "./funnel.mjs",
    "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs",
  ].map((p) => readFileSync(new URL(p, import.meta.url), "utf8")),
);
const shape = (value, keys) =>
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    "Invalid funnel workflow shape",
  );
const scope = (entry) => enterpriseDigest(entry.context);
function evaluate(entry, run, at) {
  shape(entry, ["evaluationId", "context", "sources"]);
  assert(
    /^[a-zA-Z0-9._:-]{1,128}$/.test(entry.evaluationId),
    "Invalid funnel evaluation ID",
  );
  assert(
    !Object.hasOwn(entry.context, "customerId") &&
      !Object.hasOwn(entry.context, "assessmentAt"),
    "Workflow owns customer and assessment time",
  );
  assert(
    run.entities.some((e) => e.entityId === entry.context.entityId),
    "Unknown funnel entity",
  );
  return evaluateFunnel(
    { ...entry.context, customerId: run.customerId, assessmentAt: at },
    entry.sources,
  );
}
function checkFor(entry, transition, evidenceId) {
  const ruleId = `ux-funnel-${entry.evaluationId}-${transition.transitionId}`;
  const check = {
    moduleId: "ux-cro",
    ruleId,
    ruleVersion: "1",
    entityId: entry.context.entityId,
    scenarioId: entry.context.journeyId,
    windowId: entry.evaluationId,
    status: "unknown",
    reason: `Funnel measurement: ${transition.status} (${transition.reason}). UX quality not assessed; descriptive counts cannot establish causality or acceptable usability.`,
    evidenceIds: [evidenceId],
    dependencies: [evidenceId],
    policyIds: [`ux-funnel-${entry.evaluationId}`],
    assessedAt: null,
    review: null,
  };
  return { ...check, checkId: checkIdentity(check) };
}
function project(entry, result, evidence, historical = false) {
  const output = [];
  for (const t of result.transitions) {
    const metrics = {
      eligible: t.eligibleCount,
      continued: t.continuedCount,
      retention: t.retention,
      nonContinuation: t.nonContinuation,
    };
    for (const [metric, raw] of Object.entries(metrics)) {
      const value =
        raw && typeof raw === "object"
          ? { numerator: raw.numerator, denominator: raw.denominator }
          : raw;
      output.push({
        observationId: `ux-funnel-${enterpriseDigest([evidence.evidenceId, t.transitionId, metric])}`,
        label: `Funnel ${t.transitionId} ${metric}`,
        value,
        unit:
          metric === "eligible" || metric === "continued"
            ? result.context.population.unit
            : "declared cohort ratio",
        classification: historical ? "historical" : "current",
        precision: value === null ? "unknown" : "exact",
        period: {
          from: result.context.window.from.slice(0, 10),
          to: result.context.window.to.slice(0, 10),
        },
        scopeDescription: `${result.dataClassification}; ${entry.context.environment}; journey ${entry.context.journeyId}; ${t.fromStepId} to ${t.toStepId}; population ${stableJson(result.context.population)}; UTC half-open window ${stableJson(result.context.window)}; definition ${result.definitionDigest}; ${t.status}/${t.reason}. ${t.qualification} Provider/query declarations are unauthenticated. No UX pass, abandonment intent or causal uplift claim.`,
        evidenceIds: [evidence.evidenceId],
      });
    }
  }
  return output;
}
function replayEvidence(evidence, run) {
  assert(
    evidence?.artifactType === "ux-funnel-evaluation" &&
      evidence.source === "supplied-funnel-aggregate-v1",
    "Missing funnel source evidence",
  );
  shape(evidence.content, ["entry", "assessmentAt", "evaluatorDigest"]);
  const { entry, assessmentAt } = evidence.content;
  assert(
    evidence.content.evaluatorDigest === evaluatorDigest,
    "Unsupported funnel evaluator version",
  );
  assert(
    evidence.evidenceId === `ux-funnel-${enterpriseDigest(evidence.content)}` &&
      evidence.observedAt === assessmentAt &&
      evidence.entityId === entry.context.entityId &&
      evidence.windowId === entry.evaluationId,
    "Invalid funnel evidence binding",
  );
  assert(
    evidence.scopeKey === entry.context.entityId &&
      evidence.customerId === run.customerId &&
      (evidence.runId === run.runId ||
        run.parentRunIds?.includes(evidence.runId)) &&
      Date.parse(assessmentAt) <= Date.parse(run.assessmentAt),
    "Invalid funnel evidence ownership/time",
  );
  const result = evaluate(entry, run, assessmentAt);
  assert(
    evidence.validUntil ===
      new Date(
        Math.max(
          Date.parse(assessmentAt),
          Date.parse(entry.context.window.to) +
            entry.context.maxAgeSeconds * 1000,
        ),
      ).toISOString(),
    "Invalid funnel evidence expiry",
  );
  return { entry, result };
}
// Recompute stored evaluations from original bytes. The index never supplies
// check/request IDs to delete, and a digest alone is not semantic validation.
function retained(run) {
  const index = run.funnelEvaluations ?? [];
  assert(Array.isArray(index) && index.length <= 50, "Invalid funnel index");
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
      "Duplicate/rebound funnel index",
    );
    for (const t of result.transitions) {
      const expected = checkFor(entry, t, evidence.evidenceId);
      assert(
        stableJson(run.checks.find((c) => c.checkId === expected.checkId)) ===
          stableJson(expected),
        "Funnel check ownership mismatch",
      );
    }
    assert(
      run.policyVersions[`ux-funnel-${entry.evaluationId}`] ===
        enterpriseDigest([entry.context, evaluatorDigest]),
      "Funnel policy mismatch",
    );
    ids.add(entry.evaluationId);
    scopes.add(scope(entry));
    entries.push({ entry, evidence, result });
  }
  const ownedChecks = new Set(
    entries.flatMap((record) =>
      record.result.transitions.map(
        (row) =>
          checkFor(record.entry, row, record.evidence.evidenceId).checkId,
      ),
    ),
  );
  assert(
    run.checks
      .filter((c) => c.ruleId.startsWith("ux-funnel-"))
      .every((c) => ownedChecks.has(c.checkId)),
    "Incomplete funnel index: unowned active checks",
  );
  assert(
    Object.keys(run.policyVersions)
      .filter((k) => k.startsWith("ux-funnel-"))
      .every((k) =>
        entries.some(
          (record) => k === `ux-funnel-${record.entry.evaluationId}`,
        ),
      ),
    "Incomplete funnel index: unowned policies",
  );
  for (const evidence of run.evidence.filter(
    (e) => e.artifactType === "ux-funnel-evaluation",
  )) {
    const { entry } = replayEvidence(evidence, run);
    assert(
      entries.some(
        (record) =>
          record.entry.evaluationId === entry.evaluationId &&
          scope(record.entry) === scope(entry),
      ),
      "Incomplete or rebound funnel history index",
    );
  }
  return entries;
}

export async function evaluateEnterpriseFunnels(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  const old = retained(previous);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  assert(
    next.moduleIds.includes("ux-cro") && bundle.evaluations.length <= 50,
    "Invalid funnel module/count",
  );
  const entries = new Map(old.map((r) => [r.entry.evaluationId, r.entry]));
  const incoming = new Set();
  for (const entry of bundle.evaluations) {
    evaluate(entry, next, bundle.assessmentAt);
    assert(!incoming.has(entry.evaluationId), "Duplicate funnel evaluation ID");
    incoming.add(entry.evaluationId);
    assert(
      !entries.has(entry.evaluationId) ||
        scope(entries.get(entry.evaluationId)) === scope(entry),
      "Cannot rebind funnel evaluation scope",
    );
    entries.set(entry.evaluationId, entry);
  }
  assert(
    entries.size <= 50 &&
      new Set([...entries.values()].map(scope)).size === entries.size,
    "Duplicate/excess funnel scopes",
  );
  assert(
    Buffer.byteLength(stableJson([...entries.values()])) <= 16 * 1024 * 1024,
    "Funnel bundle exceeds byte budget",
  );
  next.funnelEvaluations = [];
  const observations = [],
    replacements = [];
  // Historical projections are reconstructed, not accepted from cached output.
  for (const evidence of previous.evidence.filter(
    (e) => e.artifactType === "ux-funnel-evaluation",
  )) {
    const { result } = replayEvidence(evidence, previous);
    observations.push(
      ...project(evidence.content.entry, result, evidence, true),
    );
  }
  for (const entry of entries.values()) {
    const result = evaluate(entry, next, bundle.assessmentAt);
    const content = {
      entry,
      assessmentAt: bundle.assessmentAt,
      evaluatorDigest,
    };
    const digest = enterpriseDigest(content),
      evidenceId = `ux-funnel-${digest}`;
    const evidence = {
      evidenceId,
      customerId: next.customerId,
      runId: next.runId,
      entityId: entry.context.entityId,
      source: "supplied-funnel-aggregate-v1",
      artifactType: "ux-funnel-evaluation",
      scopeKey: entry.context.entityId,
      windowId: entry.evaluationId,
      observedAt: bundle.assessmentAt,
      validUntil: new Date(
        Math.max(
          Date.parse(bundle.assessmentAt),
          Date.parse(entry.context.window.to) +
            entry.context.maxAgeSeconds * 1000,
        ),
      ).toISOString(),
      digest,
      content,
    };
    if (!next.evidence.some((e) => e.evidenceId === evidenceId))
      next.evidence.push(evidence);
    next.policyVersions[`ux-funnel-${entry.evaluationId}`] = enterpriseDigest([
      entry.context,
      evaluatorDigest,
    ]);
    for (const transition of result.transitions) {
      const check = checkFor(entry, transition, evidenceId);
      const existing = next.checks.find((c) => c.checkId === check.checkId);
      assert(
        !existing ||
          old.some((r) => r.entry.evaluationId === entry.evaluationId),
        "Funnel check collision",
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
        "Funnel request ownership mismatch",
      );
      const missing = result.dataRequests.find(
        (r) => r.transitionId === transition.transitionId,
      );
      const request = createDataRequest({
        customerId: next.customerId,
        runId: next.runId,
        requestedArtifact: check.ruleId,
        scopeKey: entry.context.entityId,
        windowId: entry.evaluationId,
        moduleIds: ["ux-cro"],
        affectedCheckIds: [check.checkId],
        reason:
          "Supply scoped funnel evidence and independent task research to assess this transition. Arithmetic alone does not establish UX quality.",
        acceptedFormats: [
          "funnel-aggregate-v1 JSON",
          "Scoped task research and journey evidence",
        ],
        leastPrivilegeAccess:
          "Read-only redacted aggregates or authorized research evidence. Never send credentials or participant identifiers.",
        exportInstructions: `Journey ${entry.context.journeyId}; transition ${stableJson(entry.context.definition.transitions.find((t) => t.transitionId === transition.transitionId))}; population ${stableJson(entry.context.population)}; UTC window ${stableJson(entry.context.window)}; definition ${entry.context.definitionDigest}; classification ${result.dataClassification}. ${missing ? stableJson(missing) : "Supply independently reviewed task observations and declared success/error-recovery criteria to assess UX. The available ratio alone is insufficient."}`,
        suggestedOwnerRole:
          missing?.suggestedOwnerRole ?? "UX research and analytics owners",
        fallback:
          "Keep UX quality unknown; continue independent checks. Do not submit transactions or change production to fill this gap.",
        priority: "medium",
      });
      assert(priorRequests.length <= 1, "Duplicate funnel request ownership");
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
    next.funnelEvaluations.push({
      evaluationId: entry.evaluationId,
      evidenceId,
    });
    observations.push(...project(entry, result, evidence));
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
    "Funnel run exceeds readable limit",
  );
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    observations: [
      ...new Map(observations.map((o) => [o.observationId, o])).values(),
    ],
    findings: [],
    assessmentAccepted: false,
    providerAuthenticated: false,
    causalAcceptance: false,
  };
}
