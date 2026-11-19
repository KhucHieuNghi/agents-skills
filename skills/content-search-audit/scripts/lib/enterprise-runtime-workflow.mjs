import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import {
  enterpriseDigest,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
  textValue,
  stableJson,
  validateEnterpriseRun,
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
      "tracking-dedup.mjs",
      "consent-scenarios.mjs",
    ].map(async (p) => [
      p,
      await readFile(new URL(p, import.meta.url), "utf8"),
    ]),
  ),
);
function compileRuntime(entry, next, assessmentAt, oldRequests = []) {
  shape(
    entry,
    ["evaluationId", "kind", "context", "contract", "sources"],
    "runtime evaluation",
  );
  assert(
    typeof entry.evaluationId === "string" &&
      /^[a-z][a-z0-9-]{0,63}$/.test(entry.evaluationId),
    "Invalid or duplicate runtime evaluation ID",
  );
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
    assessmentAt: assessmentAt,
  };
  const result =
    entry.kind === "tracking"
      ? evaluateTrackingJourney(entry.contract, entry.sources, context)
      : evaluateConsentScenarios(entry.contract, entry.sources, context);
  const policyId = `runtime-${entry.evaluationId}`;
  const expires = entry.sources.length
    ? Math.min(
        ...entry.sources.map(
          (s) => Date.parse(s.capturedAt) + context.maxAgeSeconds * 1000,
        ),
      )
    : Date.parse(assessmentAt) + context.maxAgeSeconds * 1000;
  const content = {
    schemaVersion: 2,
    sources: globalThis.structuredClone(entry.sources),
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
    observedAt: assessmentAt,
    validUntil: new Date(
      Math.max(expires, Date.parse(assessmentAt)),
    ).toISOString(),
    digest: enterpriseDigest(content),
    content,
  };
  const evidenceItems = [evidence];
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
      : Date.parse(assessmentAt) + context.maxAgeSeconds * 1000;
    const fresh = rowExpires > Date.parse(assessmentAt);
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
        Math.max(rowExpires, Date.parse(assessmentAt)),
      ).toISOString(),
    };
    evidenceItems.push(rowEvidence);
    const ruleId = `runtime-${entry.evaluationId}-${row.key}`;
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
      assessedAt: ["pass", "fail"].includes(status) ? assessmentAt : null,
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
  const record = {
    revisionRunId: next.runId,
    evaluationId: entry.evaluationId,
    kind: entry.kind,
    entityId: context.entityId,
    environment: context.environment,
    evidenceId: evidence.evidenceId,
    checkIds: checks.map((c) => c.checkId),
    dataRequestArtifacts: requests.map((r) => r.requestedArtifact),
    findings,
  };

  return { record, checks, requests, evidenceItems, policyId };
}

/** Replay-validated private inspection. Legacy source-less records require reacquisition. */
export function inspectEnterpriseRuntime(run) {
  validateEnterpriseRun(run);
  const indexes = run.runtimeEvaluations ?? [];
  assert(Array.isArray(indexes), "Invalid runtime index");
  const bases = run.evidence.filter(
    (e) =>
      ["tracking-evaluation", "consent-evaluation"].includes(e.artifactType) &&
      !e.evidenceId.startsWith("runtime-check-"),
  );
  const compiled = new Map(),
    ownedEvidence = new Set();
  const lineage = [run.runId, ...(run.parentRunIds ?? [])];
  for (const base of bases) {
    const content = base.content;
    assert(
      content?.schemaVersion === 2 && Array.isArray(content.sources),
      "Legacy runtime evidence lacks replay sources; reacquire original envelopes in a new assessment, do not migrate cached verdicts",
    );
    assert(
      content.evaluatorDigest === evaluatorDigest,
      "Unsupported runtime evaluator fingerprint",
    );
    assert(
      lineage.includes(base.runId) &&
        Date.parse(base.observedAt) <= Date.parse(run.assessmentAt),
      "Invalid runtime evidence lineage/time",
    );
    const { customerId, assessmentAt, ...context } = content.context;
    assert(
      customerId === run.customerId && assessmentAt === base.observedAt,
      "Invalid runtime replay context",
    );
    const entry = {
      evaluationId: content.evaluationId,
      kind: content.kind,
      context,
      contract: content.contract,
      sources: content.sources,
    };
    const replay = compileRuntime(
      entry,
      { ...run, runId: base.runId },
      assessmentAt,
    );
    for (const expected of replay.evidenceItems) {
      const actual = run.evidence.find(
        (e) => e.evidenceId === expected.evidenceId,
      );
      // Same bytes can be reused from an earlier lineage revision.
      assert(
        actual &&
          lineage.includes(actual.runId) &&
          stableJson({ ...actual, runId: expected.runId }) ===
            stableJson(expected),
        "Runtime replay evidence mismatch",
      );
      ownedEvidence.add(actual.evidenceId);
    }
    assert(
      replay.record.evidenceId === base.evidenceId,
      "Runtime base replay mismatch",
    );
    compiled.set(base.evidenceId, replay);
  }
  const ownedChecks = new Set(),
    ownedRequests = new Set(),
    ids = new Set();
  const evaluations = indexes.map((index) => {
    assert(!ids.has(index.evaluationId), "Duplicate runtime index");
    ids.add(index.evaluationId);
    const replay = compiled.get(index.evidenceId);
    assert(
      replay &&
        lineage.includes(index.revisionRunId) &&
        stableJson(index) ===
          stableJson({ ...replay.record, revisionRunId: index.revisionRunId }),
      "Runtime index replay mismatch",
    );
    const base = run.evidence.find((e) => e.evidenceId === index.evidenceId);
    for (const other of bases.filter(
      (e) => e.content.evaluationId === index.evaluationId,
    ))
      assert(
        Date.parse(other.observedAt) < Date.parse(base.observedAt) ||
          (Date.parse(other.observedAt) === Date.parse(base.observedAt) &&
            lineage.indexOf(other.runId) >=
              lineage.indexOf(index.revisionRunId)),
        "Runtime index points to superseded evidence",
      );
    assert(
      run.policyVersions[replay.policyId] ===
        enterpriseDigest(base.content.contract),
      "Runtime policy mismatch",
    );
    for (const check of replay.checks) {
      const actual = run.checks.find((c) => c.checkId === check.checkId);
      assert(actual, "Missing runtime check");
      const comparable = { ...actual, review: null };
      if (actual.status === "unknown") {
        comparable.status = check.status;
        comparable.reason = check.reason;
        comparable.assessedAt = check.assessedAt;
      }
      assert(
        stableJson(comparable) === stableJson(check),
        "Runtime check replay mismatch",
      );
      ownedChecks.add(check.checkId);
    }
    for (const request of replay.requests) {
      const actual = run.dataRequests.filter(
        (r) => r.requestedArtifact === request.requestedArtifact,
      );
      assert(
        actual.length === 1 &&
          stableJson(actual[0].affectedCheckIds) ===
            stableJson(request.affectedCheckIds) &&
          stableJson(actual[0].moduleIds) === stableJson(request.moduleIds) &&
          actual[0].scopeKey === request.scopeKey &&
          actual[0].windowId === request.windowId,
        "Missing or unowned runtime request",
      );
      ownedRequests.add(request.requestedArtifact);
    }
    assert(
      lineage.indexOf(index.revisionRunId) <= lineage.indexOf(base.runId),
      "Runtime active revision predates source evidence",
    );
    return globalThis.structuredClone({
      ...replay.record,
      revisionRunId: index.revisionRunId,
    });
  });
  assert(
    bases.every((e) => ids.has(e.content.evaluationId)),
    "Incomplete runtime index",
  );
  assert(
    run.evidence
      .filter((e) =>
        ["tracking-evaluation", "consent-evaluation"].includes(e.artifactType),
      )
      .every((e) => ownedEvidence.has(e.evidenceId)),
    "Unowned runtime evidence",
  );
  assert(
    run.checks
      .filter(
        (c) =>
          c.ruleId.startsWith("runtime-") &&
          c.ruleId !== "runtime-indexability",
      )
      .every((c) => ownedChecks.has(c.checkId)),
    "Unowned runtime check",
  );
  assert(
    run.dataRequests
      .filter((r) => r.requestedArtifact.startsWith("runtime-"))
      .every((r) => ownedRequests.has(r.requestedArtifact)),
    "Unowned runtime request",
  );
  assert(
    Object.keys(run.policyVersions)
      .filter((k) => k.startsWith("runtime-"))
      .every((k) => ids.has(k.slice(8))),
    "Unowned runtime policy",
  );
  return {
    sourceRunDigest: enterpriseDigest(run),
    evaluatorDigest,
    evaluations,
    assessmentAccepted: false,
  };
}

/** New immutable revision only. Replays ownership before replacing checks. */
export async function evaluateEnterpriseRuntime(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  const inspected = inspectEnterpriseRuntime(previous);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  next.runtimeEvaluations = next.runtimeEvaluations ?? [];
  const seen = new Set(),
    replacementChecks = [],
    results = [];
  for (const entry of bundle.evaluations) {
    assert(!seen.has(entry.evaluationId), "Duplicate runtime evaluation ID");
    seen.add(entry.evaluationId);
    const old = inspected.evaluations.find(
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
      ? next.dataRequests.filter((r) =>
          old.dataRequestArtifacts.includes(r.requestedArtifact),
        )
      : [];
    const { record, checks, requests, evidenceItems, policyId } =
      compileRuntime(entry, next, bundle.assessmentAt, oldRequests);
    if (old) {
      next.checks = next.checks.filter(
        (c) => !old.checkIds.includes(c.checkId),
      );
      next.dataRequests = next.dataRequests.filter(
        (r) => !old.dataRequestArtifacts.includes(r.requestedArtifact),
      );
    }
    for (const check of checks) {
      assert(
        !next.checks.some((c) => c.checkId === check.checkId),
        "Runtime check collision",
      );
      next.ruleVersions[`${check.moduleId}/${check.ruleId}`] = "1";
    }
    for (const evidence of evidenceItems)
      if (!next.evidence.some((e) => e.evidenceId === evidence.evidenceId))
        next.evidence.push(evidence);
    next.policyVersions[policyId] = enterpriseDigest(entry.contract);
    next.checks.push(...checks);
    next.dataRequests.push(...requests);
    replacementChecks.push(...checks);
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
  assert(
    Buffer.byteLength(stableJson(next)) + 1 <= 32 * 1024 * 1024,
    "Runtime run exceeds readable limit",
  );
  inspectEnterpriseRuntime(next);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    evaluations: results,
    assessmentAccepted: false,
  };
}
