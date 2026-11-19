import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import {
  enterpriseDigest as digest,
  stableJson,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "../enterprise-provider-workflow.mjs";
import { createDataRequest } from "../data-requests.mjs";
import { normalizeTechnicalSeoAttempt } from "./acquisition.mjs";
import { technicalSeoEvaluatorDigest } from "./workflow.mjs";
const evaluatorDigest = digest([
  technicalSeoEvaluatorDigest,
  await readFile(new URL("./acquisition.mjs", import.meta.url), "utf8"),
  await readFile(
    new URL("./acquisition-workflow.mjs", import.meta.url),
    "utf8",
  ),
]);
const prefix = "seo-acquisition-";
const sourceType = "technical-seo-acquisition-source";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const eq = (a, b) => stableJson(a) === stableJson(b);
function exact(value, keys) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key)),
    "Invalid acquisition workflow record",
  );
}
function evidence(run, target, content, type, observedAt, validUntil, tag) {
  return {
    evidenceId: `${prefix}${tag}-${digest(content)}`,
    customerId: run.customerId,
    runId: run.runId,
    entityId: target.scope.entityId,
    source: "supplied-technical-seo-acquisition",
    artifactType: type,
    scopeKey: target.scope.entityId,
    windowId: digest(target.window),
    observedAt,
    validUntil,
    digest: digest(content),
    content,
  };
}
function sourceEvidence(run, sourceRecord) {
  return evidence(
    run,
    sourceRecord.target,
    { sourceRecord, evaluatorDigest },
    sourceType,
    sourceRecord.attempt.result.finishedAt,
    null,
    "source",
  );
}
function sourceRecord(run, id) {
  const item = run.evidence.find((e) => e.evidenceId === id);
  assert(
    item?.artifactType === sourceType,
    "Missing acquisition source evidence",
  );
  exact(item.content, ["sourceRecord", "evaluatorDigest"]);
  assert(
    item.content.evaluatorDigest === evaluatorDigest,
    "Unsupported acquisition evaluator fingerprint",
  );
  const normalized = normalizeTechnicalSeoAttempt({
    ...item.content.sourceRecord,
    assessmentAt: run.assessmentAt,
  });
  assert(
    eq(normalized.sourceRecord, item.content.sourceRecord),
    "Noncanonical acquisition source record",
  );
  const target = normalized.target;
  assert(
    target.scope.customerId === run.customerId &&
      run.entities.some((e) => e.entityId === target.scope.entityId),
    "Acquisition source ownership mismatch",
  );
  assert(
    eq(
      item,
      sourceEvidence({ ...run, runId: item.runId }, normalized.sourceRecord),
    ),
    "Acquisition source metadata mismatch",
  );
  return normalized.sourceRecord;
}
function derive(
  run,
  targetId,
  ids,
  at = run.assessmentAt,
  revisionRunId = run.runId,
) {
  assert(
    ids.length > 0 && ids.length <= 1000 && new Set(ids).size === ids.length,
    "Invalid acquisition source population",
  );
  const sources = ids.map((id) => sourceRecord(run, id));
  const target = sources[0].target;
  assert(
    target.targetId === targetId && sources.every((s) => eq(s.target, target)),
    "Cannot rebind acquisition target scope/window",
  );
  assert(
    new Set(sources.map((s) => s.attempt.attemptId)).size === sources.length,
    "Duplicate acquisition attempt",
  );
  const evaluated = sources.map((s, index) => ({
    id: ids[index],
    value: normalizeTechnicalSeoAttempt({ ...s, assessmentAt: at }),
    index,
  }));
  const usable = evaluated.filter(
    (e) => e.value.availability.status === "pass",
  );
  const choices = usable.length ? usable : evaluated;
  const selected = [...choices].sort(
    (a, b) =>
      Date.parse(b.value.captureObservedAt ?? b.value.finishedAt) -
        Date.parse(a.value.captureObservedAt ?? a.value.finishedAt) ||
      b.index - a.index,
  )[0];
  const content = {
    targetId,
    sourceEvidenceIds: ids,
    selectedEvidenceId: selected.id,
    assessmentAt: at,
    revisionRunId,
    evaluatorDigest,
    availability: selected.value.availability,
    captureObservedAt: selected.value.captureObservedAt,
    captureValidUntil: selected.value.captureValidUntil,
    captureDigest: selected.value.capture?.artifactHash ?? null,
  };
  const ruleId = prefix + targetId;
  const projected = evidence(
    { ...run, runId: revisionRunId },
    target,
    content,
    ruleId,
    at,
    selected.value.availability.status === "pass"
      ? selected.value.captureValidUntil
      : at,
    "assessment",
  );
  const policyId = ruleId;
  const check = {
    moduleId: "technical-seo",
    ruleId,
    ruleVersion: "1",
    entityId: target.scope.entityId,
    scenarioId: digest(target),
    windowId: digest(target.window),
    status: content.availability.status,
    reason: `Capture availability only: ${content.availability.reason}. Supplied attribution; no authenticated collection or semantic SEO acceptance.`,
    evidenceIds: [projected.evidenceId],
    dependencies: [projected.evidenceId],
    policyIds: [policyId],
    assessedAt: content.availability.status === "pass" ? at : null,
    review: null,
  };
  check.checkId = checkIdentity(check);
  const formats = {
    canonical: ["canonical-capture-v1"],
    "index-controls": ["index-controls-v1"],
    hreflang: ["hreflang-capture-v1"],
    "structured-data": [
      "structured-data-capture-v1",
      "structured-data-capture-v2",
    ],
  };
  const request = createDataRequest({
    customerId: run.customerId,
    runId: run.runId,
    requestedArtifact: ruleId,
    scopeKey: target.scope.entityId,
    windowId: check.windowId,
    moduleIds: ["technical-seo"],
    affectedCheckIds: [check.checkId],
    reason:
      "Supply a usable scoped capture; receipt alone does not establish semantic SEO quality.",
    acceptedFormats: formats[target.kind],
    leastPrivilegeAccess:
      "Read-only capture/export; separate host authorization is required for collection. Do not submit forms or change the website.",
    exportInstructions: `Target ${target.scope.targetUrl}; environment ${target.scope.environment}; profile ${target.scope.profileId}; state ${target.scope.stateId}; kind ${target.kind}; method ${target.method ?? "combined"}; observation window ${target.window.from} to ${target.window.to} (exclusive). Retain original capture bytes and timestamps. A live retry outside this window requires a new target/window; never relabel its timestamp.`,
    suggestedOwnerRole: "website-engineering",
    fallback:
      "Keep capture availability and unresolved semantic checks unknown; continue independently supported checks.",
    priority: "medium",
  });
  return {
    target,
    projected,
    check,
    request,
    policyId,
    policyVersion: digest([target, evaluatorDigest]),
  };
}
function normalizedRequest(request, reference) {
  return {
    ...request,
    status: reference.status,
    reason: reference.reason,
    evidenceIds: [],
    evidenceDigests: {},
  };
}
function validateIndex(run) {
  const records = run.technicalSeoAcquisitions ?? [];
  assert(
    Array.isArray(records) && records.length <= 50,
    "Invalid acquisition target index",
  );
  const projections = run.evidence.filter(
    (e) =>
      typeof e.artifactType === "string" && e.artifactType.startsWith(prefix),
  );
  const referenceLists = [
    ...records.map((r) => r?.sourceEvidenceIds),
    ...projections.map((e) => e.content?.sourceEvidenceIds),
  ];
  assert(
    referenceLists.every(Array.isArray) &&
      referenceLists.reduce((n, ids) => n + ids.length, 0) <= 20000,
    "Acquisition replay work budget exceeded",
  );
  const sourceBytes = new Map(
    run.evidence
      .filter((e) => e.artifactType === sourceType)
      .map((e) => {
        const result = e.content?.sourceRecord?.attempt?.result;
        const envelopes = Array.isArray(result?.sources)
          ? result.sources
          : [result?.source];
        return [
          e.evidenceId,
          envelopes.reduce(
            (n, s) =>
              n +
              (typeof s?.artifactText === "string"
                ? Buffer.byteLength(s.artifactText)
                : 0),
            0,
          ),
        ];
      }),
  );
  assert(
    referenceLists.reduce(
      (n, ids) =>
        n + ids.reduce((sum, id) => sum + (sourceBytes.get(id) ?? 0), 0),
      0,
    ) <=
      64 * 1024 * 1024,
    "Acquisition replay byte budget exceeded",
  );
  const seenTargets = new Set(),
    seenSources = new Set(),
    seenChecks = new Set(),
    populations = new Set();
  for (const record of records) {
    exact(record, ["targetId", "sourceEvidenceIds", "projectionEvidenceId"]);
    assert(
      !seenTargets.has(record.targetId),
      "Duplicate acquisition target index",
    );
    seenTargets.add(record.targetId);
    assert(
      Array.isArray(record.sourceEvidenceIds),
      "Invalid acquisition source index",
    );
    for (const id of record.sourceEvidenceIds) {
      assert(!seenSources.has(id), "Duplicate acquisition source index");
      seenSources.add(id);
    }
    const actualProjection = run.evidence.find(
      (e) => e.evidenceId === record.projectionEvidenceId,
    );
    assert(
      actualProjection?.artifactType === prefix + record.targetId,
      "Missing acquisition projection",
    );
    const lineage = [run.runId, ...(run.parentRunIds ?? [])];
    for (const other of projections.filter(
      (e) => e.content?.targetId === record.targetId,
    )) {
      assert(
        Date.parse(other.content.assessmentAt) <
          Date.parse(actualProjection.content.assessmentAt) ||
          (Date.parse(other.content.assessmentAt) ===
            Date.parse(actualProjection.content.assessmentAt) &&
            lineage.indexOf(other.runId) >=
              lineage.indexOf(actualProjection.runId)),
        "Acquisition index points to superseded projection",
      );
      assert(
        Array.isArray(other.content.sourceEvidenceIds) &&
          eq(
            other.content.sourceEvidenceIds,
            record.sourceEvidenceIds.slice(
              0,
              other.content.sourceEvidenceIds.length,
            ),
          ),
        "Acquisition source history is not append-only",
      );
    }
    const expected = derive(
      run,
      record.targetId,
      record.sourceEvidenceIds,
      actualProjection.content.assessmentAt,
      actualProjection.runId,
    );
    assert(
      eq(actualProjection, expected.projected),
      "Acquisition projection replay mismatch",
    );
    const population = digest(
      Object.fromEntries(
        Object.entries(expected.target).filter(([key]) => key !== "targetId"),
      ),
    );
    assert(!populations.has(population), "Duplicate acquisition population");
    populations.add(population);
    assert(
      run.policyVersions[expected.policyId] === expected.policyVersion,
      "Acquisition policy mismatch",
    );
    const actualCheck = run.checks.find(
      (c) => c.checkId === expected.check.checkId,
    );
    assert(actualCheck, "Missing acquisition availability check");
    const comparable = { ...actualCheck };
    if (actualCheck.status === "unknown" && expected.check.status === "pass") {
      comparable.status = expected.check.status;
      comparable.reason = expected.check.reason;
      comparable.assessedAt = expected.check.assessedAt;
    }
    assert(eq(comparable, expected.check), "Acquisition check replay mismatch");
    seenChecks.add(actualCheck.checkId);
    const requests = run.dataRequests.filter(
      (r) => r.requestedArtifact === expected.request.requestedArtifact,
    );
    assert(
      requests.length === 1 &&
        eq(normalizedRequest(requests[0], expected.request), expected.request),
      "Acquisition request descriptor mismatch",
    );
  }
  assert(seenSources.size <= 1000, "Acquisition attempt limit exceeded");
  for (const item of run.evidence) {
    if (item.artifactType === sourceType)
      assert(seenSources.has(item.evidenceId), "Unindexed acquisition attempt");
    if (
      typeof item.artifactType === "string" &&
      item.artifactType.startsWith(prefix)
    ) {
      assert(
        seenTargets.has(item.content?.targetId) &&
          Array.isArray(item.content?.sourceEvidenceIds) &&
          item.content.sourceEvidenceIds.every((id) => seenSources.has(id)),
        "Removed acquisition projection history",
      );
      const prior = derive(
        run,
        item.content.targetId,
        item.content.sourceEvidenceIds,
        item.content.assessmentAt,
        item.runId,
      );
      assert(
        eq(prior.projected, item),
        "Historical acquisition projection mismatch",
      );
    }
  }
  for (const check of run.checks.filter((c) => c.ruleId.startsWith(prefix)))
    assert(seenChecks.has(check.checkId), "Unindexed acquisition check");
  for (const request of run.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith(prefix),
  ))
    assert(
      seenTargets.has(request.requestedArtifact.slice(prefix.length)),
      "Unindexed acquisition request",
    );
  return records;
}
export async function recordEnterpriseTechnicalSeoAcquisition(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  const prior = validateIndex(previous);
  assert(
    Array.isArray(bundle?.attempts) &&
      bundle.attempts.length <= 50 &&
      Buffer.byteLength(stableJson(bundle)) <= 8 * 1024 * 1024,
    "Invalid acquisition attempt bundle/budget",
  );
  assert(
    bundle.attempts.length || prior.length,
    "No acquisition population to reassess",
  );
  let next = forkEnterpriseEvidenceRun(
    previous,
    bundle.attempts.length ? bundle : { ...bundle, attempts: [{}] },
    "attempts",
  );
  assert(
    next.moduleIds.includes("technical-seo"),
    "Technical SEO outside declared modules",
  );
  const records = globalThis.structuredClone(prior);
  for (const input of bundle.attempts) {
    exact(input, ["target", "attempt"]);
    const normalized = normalizeTechnicalSeoAttempt({
      ...input,
      assessmentAt: next.assessmentAt,
    });
    assert(
      normalized.target.scope.customerId === next.customerId &&
        next.entities.some(
          (e) => e.entityId === normalized.target.scope.entityId,
        ),
      "Acquisition attempt ownership mismatch",
    );
    const entry = sourceEvidence(next, normalized.sourceRecord);
    assert(
      !next.evidence.some((e) => e.evidenceId === entry.evidenceId),
      "Duplicate acquisition source",
    );
    next.evidence.push(entry);
    let record = records.find((r) => r.targetId === normalized.target.targetId);
    if (!record) {
      record = {
        targetId: normalized.target.targetId,
        sourceEvidenceIds: [],
        projectionEvidenceId: null,
      };
      records.push(record);
    }
    record.sourceEvidenceIds.push(entry.evidenceId);
  }
  assert(
    records.length <= 50 &&
      records.reduce((n, r) => n + r.sourceEvidenceIds.length, 0) <= 1000,
    "Acquisition population limit exceeded",
  );
  const replacements = records.map((r) =>
    derive(next, r.targetId, r.sourceEvidenceIds),
  );
  const requests = next.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith(prefix),
  );
  next.checks = next.checks.filter((c) => !c.ruleId.startsWith(prefix));
  next.dataRequests = next.dataRequests.filter(
    (r) => !r.requestedArtifact.startsWith(prefix),
  );
  for (const [index, item] of replacements.entries()) {
    records[index].projectionEvidenceId = item.projected.evidenceId;
    next.evidence.push(item.projected);
    next.ruleVersions[`technical-seo/${item.check.ruleId}`] = "1";
    next.policyVersions[item.policyId] = item.policyVersion;
    next.checks.push(item.check);
    const old = requests.find(
      (r) => r.requestedArtifact === item.request.requestedArtifact,
    );
    if (old && eq(normalizedRequest(old, item.request), item.request))
      for (const field of [
        "status",
        "reason",
        "evidenceIds",
        "evidenceDigests",
      ])
        item.request[field] = globalThis.structuredClone(old[field]);
    if (item.check.status === "pass" && item.request.status !== "declined")
      Object.assign(item.request, {
        status: "provided",
        reason:
          "Validated supplied capture receipt; semantic SEO assessment remains separate.",
        evidenceIds: [item.projected.evidenceId],
        evidenceDigests: { [item.projected.evidenceId]: item.projected.digest },
      });
    next.dataRequests.push(item.request);
  }
  next.technicalSeoAcquisitions = records;
  next.declaredScope = {
    moduleIds: [
      ...new Set([...next.declaredScope.moduleIds, ...next.moduleIds]),
    ],
    checks: [
      ...new Map(
        [
          ...next.declaredScope.checks,
          ...next.checks.map(({ checkId, moduleId, entityId }) => ({
            checkId,
            moduleId,
            entityId,
          })),
        ].map((c) => [c.checkId, c]),
      ).values(),
    ],
  };
  next = reconcileEnterpriseChecks(previous, next, next.assessmentAt).run;
  const mapped = new Map(replacements.map((r) => [r.check.checkId, r.check]));
  next.checks = next.checks.map((c) => mapped.get(c.checkId) ?? c);
  const oldDigest = digest(previous);
  for (const check of previous.checks.filter((c) =>
    c.ruleId.startsWith(prefix),
  )) {
    if (
      !eq(
        check,
        next.checks.find((c) => c.checkId === check.checkId),
      ) &&
      !next.history.some(
        (h) => h.sourceDigest === oldDigest && eq(h.check, check),
      )
    )
      next.history.push({
        customerId: previous.customerId,
        sourceRunId: previous.runId,
        sourceDigest: oldDigest,
        check: globalThis.structuredClone(check),
        invalidatedAt: next.assessmentAt,
        reasons: ["acquisition-reassessed"],
      });
  }
  assert(
    Buffer.byteLength(stableJson(next)) <= 32 * 1024 * 1024,
    "Acquisition run byte budget exceeded",
  );
  validateIndex(next);
  const receipt = await saveEnterpriseRun(outputDirectory, next);
  return {
    ...receipt,
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
}
