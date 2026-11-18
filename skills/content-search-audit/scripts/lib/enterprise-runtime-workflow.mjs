import { readFile } from "node:fs/promises";
import {
  enterpriseDigest,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
  textValue,
} from "./enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "./enterprise-provider-workflow.mjs";
import { createDataRequest } from "./data-requests.mjs";
import { evaluateTrackingJourney } from "./tracking-evaluation.mjs";
import { evaluateConsentScenarios } from "./consent-scenarios.mjs";
const assert = (x, m) => {
  if (!x) throw new Error(m);
};
const shape = (x, keys, label) =>
  assert(
    x &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.keys(x).every((k) => keys.includes(k)),
    `Invalid ${label} fields`,
  );
const evaluatorDigest = enterpriseDigest(
  await Promise.all(
    [
      "enterprise-runtime-workflow.mjs",
      "enterprise-provider-workflow.mjs",
      "enterprise-state.mjs",
      "data-requests.mjs",
      "tracking-evaluation.mjs",
      "tracking-observations.mjs",
      "tracking-payload.mjs",
      "consent-scenarios.mjs",
    ].map(async (p) => [
      p,
      await readFile(new URL(p, import.meta.url), "utf8"),
    ]),
  ),
);
/** New immutable revision only. Evaluates raw envelopes; never accepts caller-supplied verdicts. */
export async function evaluateEnterpriseRuntime(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  next.runtimeEvaluations = next.runtimeEvaluations ?? [];
  const seen = new Set(),
    replacementChecks = [],
    results = [];
  for (const entry of bundle.evaluations) {
    shape(
      entry,
      ["evaluationId", "kind", "context", "contract", "sources"],
      "runtime evaluation",
    );
    assert(
      typeof entry.evaluationId === "string" &&
        /^[a-z][a-z0-9-]{0,63}$/.test(entry.evaluationId) &&
        !seen.has(entry.evaluationId),
      "Invalid or duplicate runtime evaluation ID",
    );
    seen.add(entry.evaluationId);
    assert(
      ["tracking", "consent"].includes(entry.kind) &&
        next.moduleIds.includes(entry.kind),
      "Unsupported runtime module",
    );
    shape(
      entry.context,
      [
        "entityId",
        "environment",
        "journeyId",
        "scenarioId",
        "windowId",
        "window",
        "maxAgeSeconds",
      ],
      "runtime context",
    );
    assert(
      next.entities.some((e) => e.entityId === entry.context.entityId) &&
        textValue(entry.context.environment),
      "Runtime entity/environment mismatch",
    );
    const context = {
      ...entry.context,
      customerId: next.customerId,
      assessmentAt: bundle.assessmentAt,
    };
    const result =
      entry.kind === "tracking"
        ? evaluateTrackingJourney(entry.contract, entry.sources, context)
        : evaluateConsentScenarios(entry.contract, entry.sources, context);
    const old = next.runtimeEvaluations.find(
      (r) => r.evaluationId === entry.evaluationId,
    );
    if (old)
      assert(
        old.kind === entry.kind &&
          old.entityId === entry.context.entityId &&
          old.environment === entry.context.environment,
        "Cannot rebind runtime evaluation identity",
      );
    const oldRequests = old
      ? (next.dataRequests ?? []).filter((r) =>
          old.dataRequestArtifacts.includes(r.requestedArtifact),
        )
      : [];
    if (old) {
      next.checks = next.checks.filter(
        (c) => !old.checkIds.includes(c.checkId),
      );
      next.dataRequests = next.dataRequests.filter(
        (r) => !old.dataRequestArtifacts.includes(r.requestedArtifact),
      );
    }
    const policyId = `runtime-${entry.evaluationId}`;
    next.policyVersions[policyId] = enterpriseDigest(entry.contract);
    const expires = entry.sources.length
      ? Math.min(
          ...entry.sources.map(
            (s) => Date.parse(s.capturedAt) + context.maxAgeSeconds * 1000,
          ),
        )
      : Date.parse(bundle.assessmentAt) + context.maxAgeSeconds * 1000;
    const content = {
      kind: entry.kind,
      evaluationId: entry.evaluationId,
      context,
      contract: entry.contract,
      result,
      evaluatorDigest,
    };
    const evidence = {
      evidenceId: `runtime-${enterpriseDigest(content)}`,
      customerId: next.customerId,
      runId: next.runId,
      entityId: context.entityId,
      source: `${entry.sources.some((s) => s.synthetic) ? "synthetic-" : ""}supplied-${entry.kind}-evaluation`,
      artifactType: `${entry.kind}-evaluation`,
      scopeKey: context.entityId,
      windowId: context.windowId ?? null,
      observedAt: bundle.assessmentAt,
      validUntil: new Date(
        Math.max(expires, Date.parse(bundle.assessmentAt)),
      ).toISOString(),
      digest: enterpriseDigest(content),
      content,
    };
    if (!next.evidence.some((e) => e.evidenceId === evidence.evidenceId))
      next.evidence.push(evidence);
    const rows = result.checks.map((c) => ({
      key: enterpriseDigest([
        c.stage ?? null,
        c.correlationDigest ?? null,
        c.scenarioId ?? null,
        ...(c.checkKind ? [c.checkKind] : []),
      ]),
      scenarioId: c.scenarioId ?? context.scenarioId ?? null,
      status: c.status,
      sourceIds: c.sourceIds ?? (c.evidence ?? []).map((e) => e.sourceId),
      reason:
        (c.reason ??
          ([...c.violations, ...c.gaps].join("; ") ||
            "declared-consent-policy-satisfied")) +
        (c.field ? ` (field: ${c.field})` : ""),
    }));
    for (const missing of result.dataRequests ?? []) {
      if (missing.reason === "missing-scenario-kind")
        rows.push({
          key: `missing-${missing.kind}`,
          scenarioId: null,
          status: "unknown",
          reason: `Missing consent scenario: ${missing.kind}`,
        });
    }
    for (const missing of result.unassessed ?? [])
      rows.push({
        key: `unassessed-${missing}`,
        scenarioId: context.scenarioId ?? null,
        status: "unknown",
        reason: `Not assessed by this evaluator: ${missing}`,
      });
    const checks = [],
      requests = [],
      findings = [];
    for (const row of rows) {
      const selected = entry.sources.filter((s) =>
        (row.sourceIds ?? []).includes(s.sourceId),
      );
      assert(
        (row.sourceIds ?? []).every((id) =>
          selected.some((s) => s.sourceId === id),
        ),
        "Unresolved runtime source binding",
      );
      const rowExpires = selected.length
        ? Math.min(
            ...selected.map(
              (s) => Date.parse(s.capturedAt) + context.maxAgeSeconds * 1000,
            ),
          )
        : Date.parse(bundle.assessmentAt) + context.maxAgeSeconds * 1000;
      const fresh = rowExpires > Date.parse(bundle.assessmentAt);
      const rowContent = {
        evaluationDigest: evidence.digest,
        row,
        sourceEnvelopeDigests: selected.map((s) => ({
          sourceId: s.sourceId,
          digest: enterpriseDigest(s),
        })),
        evaluatorDigest,
      };
      const rowEvidence = {
        ...evidence,
        evidenceId: `runtime-check-${enterpriseDigest(rowContent)}`,
        digest: enterpriseDigest(rowContent),
        content: rowContent,
        validUntil: new Date(
          Math.max(rowExpires, Date.parse(bundle.assessmentAt)),
        ).toISOString(),
      };
      if (!next.evidence.some((e) => e.evidenceId === rowEvidence.evidenceId))
        next.evidence.push(rowEvidence);
      const ruleId = `runtime-${entry.evaluationId}-${row.key}`;
      next.ruleVersions[`${entry.kind}/${ruleId}`] = "1";
      const status = fresh ? row.status : "unknown";
      const check = {
        moduleId: entry.kind,
        ruleId,
        ruleVersion: "1",
        entityId: context.entityId,
        scenarioId: row.scenarioId,
        windowId: context.windowId ?? null,
        status,
        reason: fresh
          ? row.reason
          : "Runtime source freshness expired; supply current evidence.",
        evidenceIds: [rowEvidence.evidenceId],
        dependencies: [rowEvidence.evidenceId],
        policyIds: [policyId],
        assessedAt: ["pass", "fail"].includes(status)
          ? bundle.assessmentAt
          : null,
        review: null,
      };
      check.checkId = checkIdentity(check);
      checks.push(check);
      if (status === "unknown") {
        const requestedArtifact = `runtime-${entry.evaluationId}-${row.key}`;
        const request = createDataRequest({
          customerId: next.customerId,
          runId: next.runId,
          requestedArtifact,
          scopeKey: context.entityId,
          windowId: context.windowId ?? null,
          moduleIds: [entry.kind],
          affectedCheckIds: [check.checkId],
          reason: check.reason,
          acceptedFormats: ["JSON"],
          leastPrivilegeAccess:
            "Supplied redacted read-only evidence; no credentials or implicit browser transaction permission",
          exportInstructions: `Resolve ${check.reason}. Supply original source envelope, scope, capture completeness, timestamps and owner contract for this evaluation. Preserve missing links; do not substitute tag firing for provider receipt.`,
          suggestedOwnerRole:
            entry.kind === "consent"
              ? "Privacy policy and implementation owners"
              : "Measurement and business-system owners",
          fallback:
            "Keep this check unknown; continue independent checks. Supply attributed manual context if automated capture is unavailable.",
          priority: "medium",
        });
        const prior = oldRequests.find(
          (r) => r.requestedArtifact === requestedArtifact,
        );
        if (prior?.status === "declined") {
          request.status = "declined";
          request.reason = prior.reason;
        }
        requests.push(request);
      }
      if (status === "fail")
        findings.push({
          findingId: `runtime-${check.checkId}`,
          checkId: check.checkId,
          evidenceIds: check.evidenceIds,
          severity: "medium",
          confidence: "low",
          title: `Declared ${entry.kind} rule mismatch`,
          description: check.reason,
          businessImpact:
            "Potential measurement or consent-policy mismatch in the supplied sample; business impact has not been quantified.",
          recommendation:
            "Review the owner contract and bound source trace, confirm the mismatch independently, then correct the scoped implementation.",
          verification:
            "Repeat the same scenario with fresh complete evidence and retain before/after results; no production change is authorized by this finding.",
        });
    }
    next.checks.push(...checks);
    next.dataRequests.push(...requests);
    replacementChecks.push(...checks);
    const record = {
      evaluationId: entry.evaluationId,
      kind: entry.kind,
      entityId: context.entityId,
      environment: context.environment,
      evidenceId: evidence.evidenceId,
      checkIds: checks.map((c) => c.checkId),
      dataRequestArtifacts: requests.map((r) => r.requestedArtifact),
      findings,
    };
    next.runtimeEvaluations = next.runtimeEvaluations.filter(
      (r) => r.evaluationId !== entry.evaluationId,
    );
    next.runtimeEvaluations.push(record);
    results.push(record);
  }
  // Archive superseded assessments before replacing them with newly evaluated results.
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
  const replacements = new Map(replacementChecks.map((c) => [c.checkId, c]));
  next.checks = next.checks.map((c) => replacements.get(c.checkId) ?? c);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    evaluations: results,
    assessmentAccepted: false,
  };
}
