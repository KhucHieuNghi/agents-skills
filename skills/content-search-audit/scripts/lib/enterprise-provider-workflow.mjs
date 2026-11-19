import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { normalizeAnalyticsQuery } from "./analytics.mjs";
import { normalizeSearchConsoleQuery } from "./search-console.mjs";
import {
  enterpriseDigest,
  stableJson,
  validateEnterpriseRun,
  checkIdentity,
  textValue,
  timestampValue,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
} from "./enterprise-state.mjs";
import { createDataRequest, reconcileDataRequests } from "./data-requests.mjs";
import {
  providerOperationContract,
  validProviderResource,
} from "./provider-capabilities.mjs";
import {
  normalizeProviderSnapshot,
  replayProviderSnapshotInput,
  supportsProviderSnapshot,
} from "./measurement-config.mjs";
import {
  normalizeBusinessObservations,
  validateBusinessObservationContract,
} from "./business-observations.mjs";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const clone = (value) => globalThis.structuredClone(value);
export function forkEnterpriseEvidenceRun(previous, bundle, field) {
  assert(
    bundle &&
      Object.keys(bundle).every((key) =>
        ["sourceDigest", "newRunId", "assessmentAt", field].includes(key),
      ) &&
      bundle.sourceDigest === enterpriseDigest(previous) &&
      textValue(bundle.newRunId) &&
      bundle.newRunId !== previous.runId &&
      !previous.parentRunIds?.includes(bundle.newRunId) &&
      timestampValue(bundle.assessmentAt) &&
      Date.parse(bundle.assessmentAt) >= Date.parse(previous.assessmentAt) &&
      Array.isArray(bundle[field]) &&
      bundle[field].length > 0,
    "Invalid or stale provider revision binding",
  );
  const next = clone(previous);
  next.runId = bundle.newRunId;
  next.parentRunIds = [
    ...new Set([previous.runId, ...(previous.parentRunIds ?? [])]),
  ];
  next.entities = next.entities.map((entity) => ({
    ...entity,
    runId: next.runId,
  }));
  const remap = new Map();
  next.dataRequests = next.dataRequests.map((request) => {
    const updated = {
      ...request,
      ...createDataRequest({ ...request, runId: next.runId }),
      status: request.status,
      evidenceIds: request.evidenceIds,
      evidenceDigests: request.evidenceDigests,
    };
    remap.set(request.id, updated.id);
    return updated;
  });
  next.providerTargets = (next.providerTargets ?? []).map((target) => ({
    ...target,
    requestId: remap.get(target.requestId),
  }));
  return reconcileEnterpriseChecks(previous, next, bundle.assessmentAt).run;
}
function methodFor(kind) {
  if (kind === "business-observations")
    return {
      provider: "business",
      artifact: "business-observations",
      instructions:
        "Supply source-system records and an explicit outcome dictionary, window and attribution; keep rejected, attempted, settled and refunded states separate.",
    };
  assert(
    supportsProviderSnapshot(kind),
    "Provider export ingestion is not implemented for this operation; no request was created",
  );
  return providerOperationContract(kind);
}
function validateTarget(target, run, normalize = false) {
  assert(
    target &&
      Object.keys(target).every((key) =>
        [
          "kind",
          "entityId",
          "resource",
          "windowId",
          "expectedQuery",
          "expectedScope",
          "versionId",
          "maxAgeSeconds",
          "expectedTimezone",
          "expectedCurrency",
          "dictionary",
          "window",
        ].includes(key),
      ),
    "Invalid provider target fields",
  );
  const method = methodFor(target.kind);
  assert(
    run.entities.some((entity) => entity.entityId === target.entityId) &&
      textValue(target.windowId) &&
      Number.isSafeInteger(target.maxAgeSeconds) &&
      target.maxAgeSeconds > 0 &&
      target.maxAgeSeconds <= 366 * 86400,
    "Invalid provider target entity/window/freshness",
  );
  if (method.provider === "business")
    validateBusinessObservationContract(target.dictionary, {
      customerId: run.customerId,
      entityId: target.entityId,
      sourceSystem: target.resource,
      assessmentAt: run.assessmentAt,
      window: target.window,
    });
  else
    assert(
      validProviderResource(method.provider, target.resource),
      "Invalid provider resource",
    );
  if (["ga4-report", "gsc-search"].includes(target.kind)) {
    assert(
      target.expectedQuery &&
        typeof target.expectedQuery === "object" &&
        !Array.isArray(target.expectedQuery),
      "Expected provider query required",
    );
    assert(
      !["offset", "limit", "rowLimit", "startRow"].some((key) =>
        Object.hasOwn(target.expectedQuery, key),
      ),
      "Expected query must exclude transport pagination",
    );
    const normalized =
      target.kind === "ga4-report"
        ? normalizeAnalyticsQuery(target.expectedQuery)
        : normalizeSearchConsoleQuery(target.expectedQuery);
    if (target.kind === "ga4-report") {
      for (const field of ["metrics", "dimensions"]) {
        const names = (normalized[field] ?? []).map((entry) => entry.name);
        assert(
          new Set(names).size === names.length,
          "Expected GA4 query contains duplicate metric/dimension names",
        );
      }
    } else
      assert(
        target.expectedTimezone === undefined ||
          target.expectedTimezone === "America/Los_Angeles",
        "Search Console exports use America/Los_Angeles; requested timezone is incompatible",
      );
    // Normalize defaults only during planning; the stored configuration is hashed before import.
    if (normalize) target.expectedQuery = normalized;
    else
      assert(
        enterpriseDigest(normalized) === enterpriseDigest(target.expectedQuery),
        "Provider target requires canonical query identity",
      );
  }
  if (target.kind.startsWith("bing-"))
    assert(
      target.expectedScope &&
        typeof target.expectedScope === "object" &&
        !Array.isArray(target.expectedScope) &&
        ["locale", "market", "timezone", "period", "surfaces"].every((key) =>
          textValue(target.expectedScope[key]),
        ),
      "Expected Bing scope requires locale, market, timezone, period and surfaces",
    );
  if (target.kind === "gtm-version")
    assert(
      typeof target.versionId === "string" && /^\d+$/.test(target.versionId),
      "Explicit GTM version required",
    );
  return method;
}
export async function planProviderRequests(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  inspectEnterpriseProviderSnapshots(previous);
  const next = forkEnterpriseEvidenceRun(previous, bundle, "targets");
  for (const raw of bundle.targets) {
    const target = clone(raw),
      method = validateTarget(target, next, true),
      targetId = enterpriseDigest(target);
    assert(
      !next.providerTargets.some((item) => item.targetId === targetId),
      "Duplicate provider target",
    );
    const moduleId =
      method.provider === "gtm" || method.provider === "business"
        ? "tracking"
        : method.provider === "ga4"
          ? "analytics"
          : "search-measurement";
    const identity = {
      moduleId,
      ruleId: `provider-${target.kind}`,
      ruleVersion: "1",
      entityId: target.entityId,
      scenarioId: "supplied-export",
      windowId: target.windowId,
    };
    const check = {
      ...identity,
      checkId: checkIdentity(identity),
      status: "unknown",
      reason:
        "Inspect supplied provider evidence and its limitations; import alone is not assessment",
      evidenceIds: [],
      dependencies: [],
      policyIds: [],
      assessedAt: null,
    };
    assert(
      !next.checks.some((item) => item.checkId === check.checkId),
      "Provider scope already planned; use a distinct query/window identity",
    );
    next.ruleVersions[`${moduleId}/${identity.ruleId}`] = identity.ruleVersion;
    next.checks.push(check);
    next.moduleIds = [...new Set([...next.moduleIds, moduleId])];
    next.declaredScope.moduleIds = [
      ...new Set([...next.declaredScope.moduleIds, moduleId]),
    ];
    next.declaredScope.checks.push({
      checkId: check.checkId,
      moduleId,
      entityId: target.entityId,
    });
    const request = createDataRequest({
      customerId: next.customerId,
      runId: next.runId,
      requestedArtifact: method.artifact,
      scopeKey: target.entityId,
      windowId: target.windowId,
      moduleIds: [moduleId],
      affectedCheckIds: [check.checkId],
      reason: `Evidence requested for ${target.kind} in the declared resource/query scope.`,
      acceptedFormats: ["JSON"],
      leastPrivilegeAccess: "Read-only supplied export; no credentials",
      exportInstructions: `${method.instructions} Resource: ${target.resource}. Window/query identity: ${target.windowId}. Use bound target ${targetId} for the exact export query.`,
      suggestedOwnerRole: "Property or business-system owner",
      fallback:
        "Continue independent checks; retain unknown where evidence is unavailable.",
      priority: "high",
    });
    assert(
      !next.dataRequests.some((item) => item.id === request.id),
      "Provider request scope collides with an existing request",
    );
    next.dataRequests.push(request);
    next.providerTargets.push({
      targetId,
      requestId: request.id,
      configuration: target,
    });
  }
  inspectEnterpriseProviderSnapshots(next);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    targets: next.providerTargets,
    assessmentAccepted: false,
  };
}
const providerReplayDigest = enterpriseDigest(
  await Promise.all(
    [
      "enterprise-provider-workflow.mjs",
      "measurement-config.mjs",
      "analytics.mjs",
      "search-console.mjs",
      "bing.mjs",
      "business-observations.mjs",
      "enterprise-state.mjs",
      "provider-capabilities.mjs",
      "data-requests.mjs",
    ].map(async (path) => [
      path,
      await readFile(new URL(path, import.meta.url), "utf8"),
    ]),
  ),
);
const providerArtifacts = new Set([
  "ga4-report",
  "ga4-config",
  "search-export",
  "bing-search",
  "bing-ai-mapped",
  "gtm-container",
  "business-observations",
]);
function retainProviderInput(result, input, target, owner) {
  const sourceEnvelope = {
    schemaVersion: 1,
    representation: "supplied-import-object",
    input: clone(input),
    target: clone(target),
    owner: clone(owner),
    normalizerDigest: providerReplayDigest,
  };
  assert(
    Buffer.byteLength(stableJson(sourceEnvelope)) <= 16 * 1024 * 1024,
    "Provider source envelope exceeds byte budget",
  );
  const content = { ...result.evidence.content, sourceEnvelope };
  const evidence = {
    ...result.evidence,
    content,
    digest: enterpriseDigest(content),
  };
  delete evidence.evidenceId;
  evidence.evidenceId = `provider-replay-${enterpriseDigest(evidence)}`;
  return { ...result, evidence };
}
/** Replays retained import objects; returned descriptors contain no raw provider payload. */
export function inspectEnterpriseProviderSnapshots(run) {
  validateEnterpriseRun(run);
  const targets = run.providerTargets ?? [];
  assert(Array.isArray(targets), "Invalid provider target index");
  const ids = new Set(),
    requestIds = new Set(),
    checkIds = new Set();
  for (const binding of targets) {
    const target = binding.configuration;
    assert(
      binding &&
        Object.keys(binding).length === 3 &&
        ["targetId", "requestId", "configuration"].every((k) =>
          Object.hasOwn(binding, k),
        ) &&
        binding.targetId === enterpriseDigest(target) &&
        !ids.has(binding.targetId) &&
        !requestIds.has(binding.requestId),
      "Invalid provider target ownership",
    );
    ids.add(binding.targetId);
    requestIds.add(binding.requestId);
    const method = validateTarget(target, run);
    const moduleId =
      method.provider === "gtm" || method.provider === "business"
        ? "tracking"
        : method.provider === "ga4"
          ? "analytics"
          : "search-measurement";
    const identity = {
      moduleId,
      ruleId: `provider-${target.kind}`,
      ruleVersion: "1",
      entityId: target.entityId,
      scenarioId: "supplied-export",
      windowId: target.windowId,
    };
    const checkId = checkIdentity(identity),
      check = run.checks.find((c) => c.checkId === checkId);
    checkIds.add(checkId);
    const request = run.dataRequests.find((r) => r.id === binding.requestId);
    assert(
      check &&
        Object.keys(identity).every((k) => check[k] === identity[k]) &&
        request &&
        stableJson(request.moduleIds) === stableJson([moduleId]) &&
        stableJson(request.affectedCheckIds) === stableJson([checkId]) &&
        request.requestedArtifact === method.artifact &&
        request.scopeKey === target.entityId &&
        request.windowId === target.windowId,
      "Provider target/check/request ownership mismatch",
    );
  }
  assert(
    run.checks
      .filter((c) => c.ruleId.startsWith("provider-"))
      .every((c) => checkIds.has(c.checkId)),
    "Incomplete provider target/check ownership",
  );
  assert(
    run.dataRequests
      .filter((r) => r.affectedCheckIds.some((id) => checkIds.has(id)))
      .every((r) => requestIds.has(r.id)),
    "Unindexed provider request ownership",
  );
  const snapshots = [];
  for (const evidence of run.evidence.filter((e) =>
    providerArtifacts.has(e.artifactType),
  )) {
    const envelope = evidence.content?.sourceEnvelope;
    assert(
      envelope?.schemaVersion === 1 &&
        envelope.representation === "supplied-import-object",
      "Legacy provider evidence lacks original import input; reacquire in a separate assessment",
    );
    assert(
      envelope.normalizerDigest === providerReplayDigest,
      "Unsupported provider normalizer fingerprint",
    );
    const { input, target, owner } = envelope;
    assert(
      Object.keys(envelope).length === 6 &&
        [
          "schemaVersion",
          "representation",
          "input",
          "target",
          "owner",
          "normalizerDigest",
        ].every((k) => Object.hasOwn(envelope, k)) &&
        owner &&
        Object.keys(owner).length === 4 &&
        ["customerId", "runId", "assessmentAt", "entityId"].every((k) =>
          Object.hasOwn(owner, k),
        ),
      "Invalid provider replay envelope",
    );
    assert(
      owner?.customerId === run.customerId &&
        owner.entityId === evidence.entityId &&
        owner.runId === evidence.runId &&
        [run.runId, ...(run.parentRunIds ?? [])].includes(owner.runId) &&
        timestampValue(owner.assessmentAt) &&
        Date.parse(owner.assessmentAt) <= Date.parse(run.assessmentAt),
      "Invalid provider replay owner/time",
    );
    const binding = (run.providerTargets ?? []).find(
      (b) => b.targetId === enterpriseDigest(target),
    );
    assert(
      binding && stableJson(binding.configuration) === stableJson(target),
      "Missing provider replay target",
    );
    validateTarget(target, run);
    const request = run.dataRequests.find((r) => r.id === binding.requestId);
    assert(
      request &&
        request.scopeKey === evidence.scopeKey &&
        request.windowId === evidence.windowId &&
        request.requestedArtifact === evidence.artifactType,
      "Missing provider replay request",
    );
    const original =
      target.kind === "business-observations"
        ? businessSnapshot(input, target, owner)
        : replayProviderSnapshotInput(target.kind, input, target, owner);
    const replay = retainProviderInput(original, input, target, owner);
    assert(
      stableJson(replay.evidence) === stableJson(evidence),
      "Provider source replay mismatch",
    );
    snapshots.push({
      evidenceId: evidence.evidenceId,
      targetId: binding.targetId,
      kind: target.kind,
      importedAt: owner.assessmentAt,
      observedAt: evidence.observedAt,
      validUntil: evidence.validUntil,
      currentlyFresh:
        Date.parse(evidence.validUntil) > Date.parse(run.assessmentAt),
      representation: envelope.representation,
      providerAuthenticated: false,
    });
  }
  return {
    sourceRunDigest: enterpriseDigest(run),
    normalizerDigest: providerReplayDigest,
    snapshots,
    assessmentAccepted: false,
  };
}
function businessSnapshot(input, target, run) {
  const normalized = normalizeBusinessObservations(input, target.dictionary, {
    customerId: run.customerId,
    entityId: target.entityId,
    sourceSystem: target.resource,
    assessmentAt: run.assessmentAt,
    window: target.window,
  });
  const validUntil = new Date(
    Date.parse(input.capturedAt) + target.maxAgeSeconds * 1000,
  ).toISOString();
  const content = {
      kind: target.kind,
      resource: target.resource,
      windowId: target.windowId,
      normalized,
    },
    digest = enterpriseDigest(content);
  const evidence = {
    customerId: run.customerId,
    runId: run.runId,
    entityId: target.entityId,
    source: `${input.synthetic ? "synthetic-" : ""}supplied-business-observations`,
    artifactType: "business-observations",
    scopeKey: target.entityId,
    windowId: target.windowId,
    observedAt: input.capturedAt,
    validUntil,
    digest,
    content,
  };
  evidence.evidenceId = `business-${enterpriseDigest(evidence)}`;
  return { evidence, gaps: normalized.gaps };
}
export async function importProviderSnapshots(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  inspectEnterpriseProviderSnapshots(previous);
  const next = forkEnterpriseEvidenceRun(previous, bundle, "imports"),
    seen = new Set(),
    receipts = new Map(),
    affected = new Set(),
    imports = [];
  // Preserve previously validated request bindings, but never treat arbitrary imported claims as receipts.
  for (const request of next.dataRequests.filter(
    (item) => item.status === "provided",
  ))
    for (const id of request.evidenceIds) {
      const evidence = next.evidence.find((item) => item.evidenceId === id);
      receipts.set(id, {
        evidenceId: id,
        bindingDigest: enterpriseDigest(evidence),
      });
    }
  for (const entry of bundle.imports) {
    assert(
      entry &&
        Object.keys(entry).every((key) =>
          ["targetId", "input"].includes(key),
        ) &&
        !seen.has(entry.targetId),
      "Invalid or duplicate provider import entry",
    );
    seen.add(entry.targetId);
    const binding = next.providerTargets.find(
      (item) => item.targetId === entry.targetId,
    );
    assert(
      binding && enterpriseDigest(binding.configuration) === binding.targetId,
      "Unknown or altered provider target",
    );
    const target = binding.configuration;
    validateTarget(target, next);
    const request = next.dataRequests.find(
      (item) => item.id === binding.requestId,
    );
    assert(request, "Missing provider request binding");
    if (request.status === "declined") {
      imports.push({
        targetId: binding.targetId,
        status: "declined",
        instructions:
          "Request remains declined; record an explicit reopen decision before importing.",
      });
      continue;
    }
    for (const id of request.evidenceIds) receipts.delete(id);
    for (const id of request.affectedCheckIds) affected.add(id);
    try {
      const normalizedResult =
        target.kind === "business-observations"
          ? businessSnapshot(entry.input, target, next)
          : normalizeProviderSnapshot(target.kind, entry.input, {
              ...target,
              run: next,
            });
      const result = retainProviderInput(
        normalizedResult,
        entry.input,
        target,
        {
          customerId: next.customerId,
          entityId: target.entityId,
          runId: next.runId,
          assessmentAt: next.assessmentAt,
        },
      );
      assert(
        result.evidence.artifactType === request.requestedArtifact &&
          result.evidence.scopeKey === request.scopeKey &&
          result.evidence.windowId === request.windowId,
        "Provider evidence/request mismatch",
      );
      next.evidence.push(result.evidence);
      receipts.set(result.evidence.evidenceId, {
        evidenceId: result.evidence.evidenceId,
        bindingDigest: enterpriseDigest(result.evidence),
      });
      request.reason = result.gaps.length
        ? `Snapshot supplied with unresolved limitations: ${result.gaps.map((gap) => gap.code).join(", ")}.`
        : `Snapshot supplied; independent assessment remains required.`;
      request.exportInstructions = [
        methodFor(target.kind).instructions,
        `Resource: ${target.resource}. Window/query identity: ${target.windowId}. Bound target: ${binding.targetId}.`,
        ...result.gaps.map((gap) => gap.instructions),
      ].join(" ");
      imports.push({
        targetId: binding.targetId,
        status: "imported",
        evidenceId: result.evidence.evidenceId,
        gaps: result.gaps,
      });
    } catch {
      request.status = "invalid";
      request.evidenceIds = [];
      request.evidenceDigests = {};
      request.reason =
        "Supplied export did not validate against the declared provider/resource/query/window. Correct the source and retry; other checks can continue.";
      imports.push({
        targetId: binding.targetId,
        status: "invalid",
        instructions: methodFor(target.kind).instructions,
      });
    }
  }
  const reconciled = reconcileDataRequests(next.dataRequests, next.evidence, {
    assessmentAt: bundle.assessmentAt,
    verifiedEvidence: [...receipts.values()],
    parentRunIds: next.parentRunIds,
  });
  next.dataRequests = reconciled.requests;
  for (const id of reconciled.invalidatedCheckIds) affected.add(id);
  const result = reconcileEnterpriseChecks(
    previous,
    next,
    bundle.assessmentAt,
    { invalidateCheckIds: [...affected] },
  );
  assert(
    Buffer.byteLength(stableJson(result.run)) + 1 <= 32 * 1024 * 1024,
    "Provider run exceeds readable limit",
  );
  inspectEnterpriseProviderSnapshots(result.run);
  await saveEnterpriseRun(outputDirectory, result.run);
  return {
    directory: outputDirectory,
    runId: result.run.runId,
    digest: enterpriseDigest(result.run),
    imports,
    invalidatedCheckIds: result.invalidatedCheckIds,
    assessmentAccepted: false,
  };
}
