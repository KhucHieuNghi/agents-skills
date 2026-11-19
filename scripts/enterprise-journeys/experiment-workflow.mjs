import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { evaluateReviewedExperiment } from "./experiment-review.mjs";
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
    "./experiment-workflow.mjs",
    "./experiment-review.mjs",
    "./experiment-review-packet.mjs",
    "./experiments.mjs",
    "./experiment-decision.mjs",
    "./experiment-accounting.mjs",
    "./experiment-statistics.mjs",
    "./experiment-allocation.mjs",
    "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs",
  ].map((p) => readFileSync(new URL(p, import.meta.url), "utf8")),
);
const shape = (value, keys) =>
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    "Invalid experiment workflow shape",
  );
const scope = (entry) => enterpriseDigest(entry.context);
function evaluate(entry, run, at) {
  shape(entry, [
    "evaluationId",
    "context",
    "aggregateSources",
    "supportSources",
    "reviewPolicy",
    "receipt",
    "presentation",
  ]);
  assert(
    typeof entry.evaluationId === "string" &&
      /^[a-zA-Z0-9._:-]{1,128}$/.test(entry.evaluationId),
    "Invalid experiment evaluation ID",
  );
  assert(
    !Object.hasOwn(entry.context, "assessmentAt") &&
      entry.context.scope.customerId === run.customerId,
    "Workflow owns customer and assessment time",
  );
  assert(
    run.entities.some((e) => e.entityId === entry.context.scope.entityId),
    "Unknown experiment entity",
  );
  shape(entry.presentation, ["experimentLabel", "metricLabels"]);
  const label = (v) =>
    typeof v === "string" &&
    v.length > 0 &&
    v.length <= 200 &&
    v.isWellFormed();
  assert(
    label(entry.presentation.experimentLabel) &&
      Array.isArray(entry.presentation.metricLabels),
    "Invalid experiment presentation",
  );
  const metricIds = new Set(
      entry.context.protocol.decision.metrics.map((m) => m.metricId),
    ),
    seen = new Set();
  for (const m of entry.presentation.metricLabels) {
    shape(m, ["metricId", "label"]);
    assert(
      metricIds.has(m.metricId) && !seen.has(m.metricId) && label(m.label),
      "Invalid metric label",
    );
    seen.add(m.metricId);
  }
  assert(seen.size === metricIds.size, "Incomplete metric labels");
  return evaluateReviewedExperiment(
    { ...entry.context, assessmentAt: at },
    entry.aggregateSources,
    entry.supportSources,
    entry.reviewPolicy,
    entry.receipt,
  );
}
const rows = (result) => [{ rowId: "joint", status: result.decision.decision }];
const opaque = (entry, row) =>
  enterpriseDigest([entry.evaluationId, row.rowId]);
function checkFor(entry, row, evidenceId) {
  const check = {
    moduleId: "ux-cro",
    ruleId: `ux-experiment-${opaque(entry, row)}`,
    ruleVersion: "1",
    entityId: entry.context.scope.entityId,
    scenarioId: entry.context.scope.experimentId,
    windowId: entry.evaluationId,
    status: "unknown",
    reason: `Attributed experiment decision: ${row.status}. This evaluates a declared experiment; it does not establish website UX quality or authorize rollout.`,
    evidenceIds: [evidenceId],
    dependencies: [evidenceId],
    policyIds: [`ux-experiment-${entry.evaluationId}`],
    assessedAt: null,
    review: null,
  };
  return { ...check, checkId: checkIdentity(check) };
}
function project(entry, result, evidence, historical = false) {
  const classification = entry.context.protocol.synthetic
    ? "synthetic"
    : "real-declared";
  const phase = historical ? "Historical" : "Current",
    labels = new Map(
      entry.presentation.metricLabels.map((m) => [m.metricId, m.label]),
    );
  const narrative = [
    {
      narrativeId: `ux-experiment-${enterpriseDigest([evidence.evidenceId, "joint"])}`,
      kind: "observation",
      text: `${phase} ${classification} experiment: ${entry.presentation.experimentLabel}. Assessment ${evidence.observedAt}. Decision: ${result.decision.decision}; review: ${result.review.status}. Results are conditional on supplied evidence and attributed review. Reviewer identity/independence and provider authenticity are not authenticated. No site-wide UX-quality, causal or action-authorization conclusion follows.`,
      evidenceIds: [evidence.evidenceId],
    },
  ];
  const observations = [];
  for (const m of result.decision.metrics) {
    const label = labels.get(m.definition.metricId),
      reference = enterpriseDigest([entry.evaluationId, m.definition.metricId]);
    const ci = m.interval,
      counts = m.accounting;
    const countText = counts
      ? `Control assigned ${counts.control.counts.assigned ?? "unknown"}, confirmed positive outcomes ${counts.control.counts.confirmedSuccess ?? "unknown"}, unresolved ${counts.control.counts.unresolved ?? "unknown"}; treatment assigned ${counts.treatment.counts.assigned ?? "unknown"}, confirmed positive outcomes ${counts.treatment.counts.confirmedSuccess ?? "unknown"}, unresolved ${counts.treatment.counts.unresolved ?? "unknown"}.`
      : "Current eligible metric evidence unavailable; counts unknown for interpretation.";
    narrative.push({
      narrativeId: `ux-experiment-${enterpriseDigest([evidence.evidenceId, reference])}`,
      kind: "observation",
      text: `${phase} ${classification}: ${label} (${m.definition.role}, ${m.definition.direction} is better). Absolute probability margin ${m.definition.margin}. Status ${m.status}. ${countText} ${ci ? `Treatment-minus-control difference ${ci.absoluteRiskDifference}; interval [${ci.lower}, ${ci.upper}], ${ci.method}, per-comparison alpha ${ci.perComparisonAlpha}, family size ${ci.familySize}. Coverage is approximate nominal Bonferroni family coverage, not an exact guarantee. Fisher is a separate diagnostic and does not govern these interval conclusions.` : "No interval or effect conclusion is available while interpretation is blocked; absence is not zero effect."}`,
      evidenceIds: [evidence.evidenceId],
    });
    if (counts)
      for (const arm of ["control", "treatment"])
        for (const key of [
          "assigned",
          "confirmedSuccess",
          "confirmedNonSuccess",
          "unresolved",
        ]) {
          const value = counts[arm].counts[key];
          if (value === null) continue;
          observations.push({
            observationId: `ux-experiment-${enterpriseDigest([evidence.evidenceId, reference, arm, key])}`,
            label: `${label}: ${arm} ${key}`,
            value,
            unit: "declared assignment units",
            precision: "exact",
            classification: historical ? "historical" : "current",
            period: {
              from: entry.context.protocol.enrollment.from.slice(0, 10),
              to: entry.context.protocol.enrollment.to.slice(0, 10),
            },
            scopeDescription: `${classification}; ${entry.presentation.experimentLabel}. Supplied distinct-unit counts, not verified revenue or UX-quality scores.`,
            evidenceIds: [evidence.evidenceId],
          });
        }
  }
  return { narrative, observations };
}
function expiry(entry, at) {
  return new Date(
    Math.max(
      Date.parse(at),
      Math.min(
        Date.parse(entry.context.protocol.enrollment.to) +
          entry.context.maxAgeSeconds * 1000,
        Date.parse(entry.reviewPolicy.validUntil),
        entry.receipt
          ? Date.parse(JSON.parse(entry.receipt.artifactText).validUntil)
          : Infinity,
        entry.receipt
          ? Date.parse(JSON.parse(entry.receipt.artifactText).reviewedAt) +
              entry.reviewPolicy.maxAgeSeconds * 1000
          : Infinity,
      ),
    ),
  ).toISOString();
}
const ready = (result) =>
  result.review.status === "accepted-attributed-review" &&
  result.decision.decision !== "blocked";
function updateRequest(next, entry, result, evidence, check) {
  const priorRequests = next.dataRequests.filter(
    (r) =>
      r.requestedArtifact === "ux-experiment-evaluation" &&
      r.windowId === entry.evaluationId,
  );
  assert(priorRequests.length <= 1, "Duplicate experiment request ownership");
  const prior = priorRequests[0];
  if (prior)
    assert(
      prior.moduleIds.length === 1 &&
        prior.moduleIds[0] === "ux-cro" &&
        prior.affectedCheckIds.length === 1 &&
        prior.affectedCheckIds[0] === check.checkId &&
        prior.scopeKey === entry.context.scope.entityId,
      "Experiment request ownership mismatch",
    );
  const classification = entry.context.protocol.synthetic
    ? "synthetic fixture"
    : "real-declared experiment";
  const gaps = [
    ...new Set(
      result.packet.requirements
        .filter((r) => r.status === "missing-support")
        .map((r) => r.kind),
    ),
  ];
  const request = createDataRequest({
    customerId: next.customerId,
    runId: next.runId,
    requestedArtifact: "ux-experiment-evaluation",
    scopeKey: entry.context.scope.entityId,
    windowId: entry.evaluationId,
    moduleIds: ["ux-cro"],
    affectedCheckIds: [check.checkId],
    reason: `Supply complete scoped evidence and review for ${classification}: ${entry.presentation.experimentLabel}. Evidence completeness is separate from experiment success.`,
    acceptedFormats: [
      "Original aggregate JSON",
      "Original scoped supporting artifacts",
      "Source-bound attributed review JSON",
    ],
    leastPrivilegeAccess:
      "Read-only redacted evidence. Do not send credentials or participant-level identifiers. No website action is authorized.",
    exportInstructions: `Experiment: ${entry.presentation.experimentLabel}; enrollment ${entry.context.protocol.enrollment.from} to ${entry.context.protocol.enrollment.to}; ${classification}. Current detailed evidence/review requests: ${result.requests.length}. Missing support categories: ${gaps.join(", ") || "none"}. Supply original assignment/outcome counts, complete metric family, registration and query/configuration/dictionary/quality evidence, and a current source-bound review with per-prerequisite reasons. Exact private bindings remain in the evaluation packet.`,
    suggestedOwnerRole: "Experiment owner and independent reviewer",
    fallback:
      "Keep interpretation blocked, retain unknown values and continue independent audit checks; do not change the website to fill the gap.",
    priority: "medium",
  });
  if (prior?.status === "declined") {
    request.status = "declined";
    request.reason = prior.reason;
    request.evidenceIds = [...prior.evidenceIds];
    request.evidenceDigests = { ...prior.evidenceDigests };
  } else if (ready(result)) {
    request.status = "provided";
    request.evidenceIds = [evidence.evidenceId];
    request.evidenceDigests = { [evidence.evidenceId]: evidence.digest };
  } else if (["provided", "expired", "invalid"].includes(prior?.status)) {
    const expiryAt = result.review.effectiveValidUntil;
    request.status =
      prior.status === "expired" ||
      (expiryAt && Date.parse(expiryAt) <= Date.parse(next.assessmentAt))
        ? "expired"
        : "invalid";
  }
  next.dataRequests = next.dataRequests.filter(
    (r) =>
      !(
        r.requestedArtifact === "ux-experiment-evaluation" &&
        r.windowId === entry.evaluationId
      ),
  );
  next.dataRequests.push(request);
}
function replayEvidence(evidence, run) {
  assert(
    evidence?.artifactType === "ux-experiment-evaluation" &&
      evidence.source === "supplied-experiment-observations-v1",
    "Missing experiment source evidence",
  );
  shape(evidence.content, ["entry", "assessmentAt", "evaluatorDigest"]);
  const { entry, assessmentAt } = evidence.content;
  assert(
    evidence.content.evaluatorDigest === evaluatorDigest,
    "Unsupported experiment evaluator version",
  );
  assert(
    evidence.evidenceId ===
      `ux-experiment-${enterpriseDigest(evidence.content)}` &&
      evidence.observedAt === assessmentAt &&
      evidence.entityId === entry.context.scope.entityId &&
      evidence.windowId === entry.evaluationId,
    "Invalid experiment evidence binding",
  );
  assert(
    evidence.scopeKey === entry.context.scope.entityId &&
      evidence.customerId === run.customerId &&
      (evidence.runId === run.runId ||
        run.parentRunIds?.includes(evidence.runId)) &&
      Date.parse(assessmentAt) <= Date.parse(run.assessmentAt),
    "Invalid experiment evidence ownership/time",
  );
  const result = evaluate(entry, run, assessmentAt);
  assert(
    evidence.validUntil === expiry(entry, assessmentAt),
    "Invalid experiment evidence expiry",
  );
  return { entry, result };
}
// Recompute stored evaluations from original bytes. The index never supplies
// check/request IDs to delete, and a digest alone is not semantic validation.
function retained(run) {
  const index = run.experimentEvaluations ?? [];
  assert(
    Array.isArray(index) && index.length <= 50,
    "Invalid experiment index",
  );
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
      "Duplicate/rebound experiment index",
    );
    for (const t of rows(result).filter((r) => r.status !== "not-assessed")) {
      const expected = checkFor(entry, t, evidence.evidenceId);
      assert(
        stableJson(run.checks.find((c) => c.checkId === expected.checkId)) ===
          stableJson(expected),
        "Experiment check ownership mismatch",
      );
    }
    assert(
      run.policyVersions[`ux-experiment-${entry.evaluationId}`] ===
        enterpriseDigest([entry.context, entry.reviewPolicy, evaluatorDigest]),
      "Experiment policy mismatch",
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
      .filter((c) => c.ruleId.startsWith("ux-experiment-"))
      .every((c) => ownedChecks.has(c.checkId)),
    "Incomplete experiment index: unowned active checks",
  );
  assert(
    Object.keys(run.policyVersions)
      .filter((k) => k.startsWith("ux-experiment-"))
      .every((k) =>
        entries.some(
          (record) => k === `ux-experiment-${record.entry.evaluationId}`,
        ),
      ),
    "Incomplete experiment index: unowned policies",
  );
  for (const evidence of run.evidence.filter(
    (e) => e.artifactType === "ux-experiment-evaluation",
  )) {
    const { entry } = replayEvidence(evidence, run);
    assert(
      entries.some(
        (record) =>
          record.entry.evaluationId === entry.evaluationId &&
          scope(record.entry) === scope(entry),
      ),
      "Incomplete or rebound experiment history index",
    );
  }
  for (const request of run.dataRequests.filter(
    (r) => r.requestedArtifact === "ux-experiment-evaluation",
  )) {
    const record = entries.find(
      (r) => r.entry.evaluationId === request.windowId,
    );
    assert(
      record &&
        request.scopeKey === record.entry.context.scope.entityId &&
        request.moduleIds.length === 1 &&
        request.moduleIds[0] === "ux-cro" &&
        request.affectedCheckIds.length === 1 &&
        request.affectedCheckIds[0] ===
          checkFor(
            record.entry,
            rows(record.result)[0],
            record.evidence.evidenceId,
          ).checkId,
      "Unowned experiment request",
    );
    if (request.status === "provided")
      assert(
        ready(record.result) &&
          request.evidenceIds.length === 1 &&
          request.evidenceIds[0] === record.evidence.evidenceId,
        "Unverified experiment fulfillment",
      );
  }
  for (const record of entries)
    assert(
      run.dataRequests.filter(
        (r) =>
          r.requestedArtifact === "ux-experiment-evaluation" &&
          r.windowId === record.entry.evaluationId,
      ).length === 1,
      "Incomplete experiment request ownership",
    );
  return entries;
}

export async function evaluateEnterpriseExperiments(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  const old = retained(previous);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  assert(
    next.moduleIds.includes("ux-cro") && bundle.evaluations.length <= 50,
    "Invalid experiment module/count",
  );
  const entries = new Map(old.map((r) => [r.entry.evaluationId, r.entry]));
  assert(
    Buffer.byteLength(stableJson(bundle.evaluations)) <= 16 * 1024 * 1024,
    "Experiment incoming bundle exceeds byte budget",
  );
  const incoming = new Set();
  for (const entry of bundle.evaluations) {
    evaluate(entry, next, bundle.assessmentAt);
    assert(
      !incoming.has(entry.evaluationId),
      "Duplicate experiment evaluation ID",
    );
    incoming.add(entry.evaluationId);
    assert(
      !entries.has(entry.evaluationId) ||
        scope(entries.get(entry.evaluationId)) === scope(entry),
      "Cannot rebind experiment evaluation scope",
    );
    entries.set(entry.evaluationId, entry);
  }
  assert(
    entries.size <= 50 &&
      new Set([...entries.values()].map(scope)).size === entries.size,
    "Duplicate/excess experiment scopes",
  );
  assert(
    Buffer.byteLength(stableJson([...entries.values()])) <= 16 * 1024 * 1024,
    "Experiment bundle exceeds byte budget",
  );
  next.experimentEvaluations = [];
  const observations = [],
    narrative = [],
    replacements = [];
  // Historical projections are reconstructed, not accepted from cached output.
  for (const evidence of previous.evidence.filter(
    (e) => e.artifactType === "ux-experiment-evaluation",
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
      evidenceId = `ux-experiment-${digest}`;
    const evidence = {
      evidenceId,
      customerId: next.customerId,
      runId: next.runId,
      entityId: entry.context.scope.entityId,
      source: "supplied-experiment-observations-v1",
      artifactType: "ux-experiment-evaluation",
      scopeKey: entry.context.scope.entityId,
      windowId: entry.evaluationId,
      observedAt: bundle.assessmentAt,
      validUntil: expiry(entry, bundle.assessmentAt),
      digest,
      content,
    };
    if (!next.evidence.some((e) => e.evidenceId === evidenceId))
      next.evidence.push(evidence);
    next.policyVersions[`ux-experiment-${entry.evaluationId}`] =
      enterpriseDigest([entry.context, entry.reviewPolicy, evaluatorDigest]);
    for (const transition of rows(result).filter(
      (r) => r.status !== "not-assessed",
    )) {
      const check = checkFor(entry, transition, evidenceId);
      const existing = next.checks.find((c) => c.checkId === check.checkId);
      assert(
        !existing ||
          old.some((r) => r.entry.evaluationId === entry.evaluationId),
        "Experiment check collision",
      );
      next.checks = next.checks.filter((c) => c.checkId !== check.checkId);
      next.checks.push(check);
      replacements.push(check);
      next.ruleVersions[`ux-cro/${check.ruleId}`] = check.ruleVersion;
      updateRequest(next, entry, result, evidence, check);
    }
    next.experimentEvaluations.push({
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
    "Experiment run exceeds readable limit",
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

/** Rebuild private-safe projections only after owned evidence matches this run's clock. */
export function projectStoredExperiments(run) {
  const records = retained(run);
  const active = new Set(records.map((r) => r.evidence.evidenceId));
  for (const record of records) {
    assert(
      Date.parse(record.evidence.observedAt) === Date.parse(run.assessmentAt),
      "Reassess experiment evidence at the final run time before report assembly",
    );
    const checks = run.checks.filter(
      (c) =>
        c.ruleId.startsWith("ux-experiment-") &&
        c.evidenceIds.includes(record.evidence.evidenceId),
    );
    assert(checks.length > 0, "Missing experiment checks");
    for (const check of checks) {
      const requests = run.dataRequests.filter(
        (r) =>
          r.requestedArtifact === "ux-experiment-evaluation" &&
          r.windowId === record.entry.evaluationId,
      );
      assert(
        requests.length === 1 &&
          requests[0].scopeKey === check.entityId &&
          requests[0].moduleIds.length === 1 &&
          requests[0].moduleIds[0] === "ux-cro" &&
          requests[0].affectedCheckIds.length === 1 &&
          requests[0].affectedCheckIds[0] === check.checkId,
        "Incomplete experiment request ownership",
      );
    }
  }
  const observations = [],
    narrative = [];
  for (const evidence of run.evidence.filter(
    (e) => e.artifactType === "ux-experiment-evaluation",
  )) {
    const { entry, result } = replayEvidence(evidence, run);
    const projection = project(
      entry,
      result,
      evidence,
      !active.has(evidence.evidenceId),
    );
    observations.push(...projection.observations);
    narrative.push(...projection.narrative);
  }
  return { observations, narrative };
}
