import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm, lstat } from "node:fs/promises";
import path from "node:path";
import {
  validateDataRequest,
  assertReviewRequestContinuity,
} from "./data-requests.mjs";

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  const encoded = JSON.stringify(value);
  if (
    encoded === undefined ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    throw new Error("Non-JSON value");
  return encoded;
}
export const enterpriseDigest = (value) =>
  createHash("sha256").update(stableJson(value)).digest("hex");
export const textValue = (value) =>
  typeof value === "string" && value.trim().length > 0;
export const timestampValue = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() ===
    value.replace(/Z$/, value.includes(".") ? "Z" : ".000Z");
const hash = /^[a-f0-9]{64}$/;
const outcomes = ["pass", "fail", "unknown", "not-applicable"];
export function checkIdentity(check) {
  const keys = [
    "moduleId",
    "ruleId",
    "ruleVersion",
    "entityId",
    "scenarioId",
    "windowId",
  ];
  for (const key of keys)
    if (!(
      textValue(check?.[key]) ||
      (["scenarioId", "windowId"].includes(key) && check[key] === null)
    ))
      throw new Error(`Invalid check identity: ${key}`);
  return enterpriseDigest(keys.map((key) => check[key]));
}
function unique(values, label) {
  if (
    !Array.isArray(values) ||
    values.some((value) => !textValue(value)) ||
    new Set(values).size !== values.length
  )
    throw new Error(`Invalid or duplicate ${label}`);
  return new Set(values);
}
function versions(map, label) {
  if (
    !map ||
    typeof map !== "object" ||
    Array.isArray(map) ||
    Object.entries(map).some(
      ([key, value]) => !textValue(key) || !textValue(value),
    )
  )
    throw new Error(`Invalid ${label}`);
}
export function validateEnterpriseRun(run) {
  if (
    !run ||
    run.schemaFamily !== "enterprise-audit" ||
    run.schemaVersion !== 1 ||
    !textValue(run.customerId) ||
    !textValue(run.runId) ||
    !timestampValue(run.assessmentAt)
  )
    throw new Error("Invalid enterprise run identity");
  if (
    !["audit", "plan", "remediate", "verify"].includes(run.operationMode) ||
    !["full", "sample"].includes(run.inventoryMode)
  )
    throw new Error("Invalid enterprise modes");
  for (const field of ["profileVersions", "ruleVersions", "policyVersions"])
    versions(run[field], field);
  if (
    !Array.isArray(run.entities) ||
    !Array.isArray(run.evidence) ||
    !Array.isArray(run.checks)
  )
    throw new Error("Missing enterprise collections");
  const entities = unique(
    run.entities.map((entity) => entity.entityId),
    "entities",
  );
  if (
    run.entities.some(
      (entity) =>
        entity.customerId !== run.customerId || entity.runId !== run.runId,
    )
  )
    throw new Error("Entity ownership mismatch");
  if (
    run.entities.some(
      (entity) =>
        ![
          "site",
          "page",
          "template",
          "property",
          "stream",
          "container",
          "journey",
          "event",
          "consent-scenario",
        ].includes(entity.type),
    )
  )
    throw new Error("Invalid entity type");
  const modules = unique(run.moduleIds, "modules");
  const evidence = unique(
    run.evidence.map((item) => item.evidenceId),
    "evidence",
  );
  const parents = unique(run.parentRunIds ?? [], "parent runs");
  if (parents.has(run.runId)) throw new Error("Invalid self-parent lineage");
  for (const item of run.evidence) {
    if (
      Object.hasOwn(item, "content") &&
      enterpriseDigest(item.content) !== item.digest
    )
      throw new Error("Embedded evidence digest mismatch");
    if (
      item.customerId !== run.customerId ||
      (item.runId !== run.runId && !parents.has(item.runId))
    )
      throw new Error("Evidence ownership mismatch");
    if (
      !entities.has(item.entityId) ||
      !hash.test(item.digest) ||
      !textValue(item.source) ||
      !timestampValue(item.observedAt) ||
      (item.validUntil !== null &&
        (!timestampValue(item.validUntil) ||
          Date.parse(item.validUntil) < Date.parse(item.observedAt)))
    )
      throw new Error("Invalid enterprise evidence");
  }
  unique(
    run.checks.map((check) => check.checkId),
    "checks",
  );
  for (const check of run.checks) {
    if (
      check.checkId !== checkIdentity(check) ||
      !entities.has(check.entityId) ||
      !modules.has(check.moduleId) ||
      !outcomes.includes(check.status) ||
      !textValue(check.reason)
    )
      throw new Error("Invalid enterprise check");
    if (
      run.ruleVersions[`${check.moduleId}/${check.ruleId}`] !==
      check.ruleVersion
    )
      throw new Error("Check rule version mismatch");
    const dependencies = unique(check.dependencies, "check dependencies");
    unique(check.evidenceIds, "check evidence");
    unique(check.policyIds, "check policies");
    if (
      [...dependencies, ...check.evidenceIds].some((id) => !evidence.has(id)) ||
      check.evidenceIds.some((id) => !dependencies.has(id)) ||
      check.policyIds.some((id) => !Object.hasOwn(run.policyVersions, id))
    )
      throw new Error("Unresolved check references");
    if (
      ["pass", "fail"].includes(check.status) &&
      (!check.evidenceIds.length ||
        !timestampValue(check.assessedAt) ||
        Date.parse(check.assessedAt) > Date.parse(run.assessmentAt))
    )
      throw new Error("Assessed check requires evidence and valid timestamp");
    if (["pass", "fail"].includes(check.status)) {
      for (const id of check.dependencies) {
        const item = run.evidence.find((item) => item.evidenceId === id);
        if (
          Date.parse(item.observedAt) > Date.parse(check.assessedAt) ||
          !timestampValue(item.validUntil) ||
          Date.parse(item.validUntil) <= Date.parse(run.assessmentAt)
        )
          throw new Error("Invalid check temporal evidence/freshness");
      }
    }
    if (
      check.status === "not-applicable" &&
      (!textValue(check.review?.reviewer) ||
        !textValue(check.review?.rationale) ||
        !timestampValue(check.review?.reviewedAt) ||
        Date.parse(check.review.reviewedAt) > Date.parse(run.assessmentAt))
    )
      throw new Error("N/A requires attributed review");
  }
  if (run.dataRequests !== undefined) {
    if (!Array.isArray(run.dataRequests))
      throw new Error("Invalid data requests");
    unique(
      run.dataRequests.map((request) => request.id),
      "data requests",
    );
    const checkIds = new Set(run.checks.map((check) => check.checkId));
    for (const request of run.dataRequests) {
      validateDataRequest(request);
      if (
        request.customerId !== run.customerId ||
        request.runId !== run.runId ||
        request.affectedCheckIds.some((id) => !checkIds.has(id)) ||
        request.evidenceIds.some((id) => !evidence.has(id)) ||
        request.moduleIds.some((id) => !modules.has(id))
      )
        throw new Error("Data request ownership/reference mismatch");
      for (const id of request.evidenceIds) {
        const item = run.evidence.find((item) => item.evidenceId === id);
        if (
          request.evidenceDigests[id] !== item.digest ||
          item.artifactType !== request.requestedArtifact ||
          item.scopeKey !== request.scopeKey ||
          item.windowId !== request.windowId
        )
          throw new Error("Data request evidence binding mismatch");
        if (
          request.status === "provided" &&
          (Date.parse(item.observedAt) > Date.parse(run.assessmentAt) ||
            !timestampValue(item.validUntil) ||
            Date.parse(item.validUntil) <= Date.parse(run.assessmentAt))
        )
          throw new Error("Provided request temporal eligibility mismatch");
      }
    }
  }
  if (!run.declaredScope) throw new Error("Declared scope is required");
  {
    const scope = run.declaredScope;
    const declaredModules = unique(scope?.moduleIds, "declared modules");
    if (run.moduleIds.some((id) => !declaredModules.has(id)))
      throw new Error("Module outside declared scope");
    if (!Array.isArray(scope.checks))
      throw new Error("Invalid declared checks");
    unique(
      scope.checks.map((check) => check.checkId),
      "declared checks",
    );
    if (
      scope.checks.some(
        (check) =>
          !hash.test(check.checkId) ||
          !declaredModules.has(check.moduleId) ||
          !textValue(check.entityId),
      )
    )
      throw new Error("Invalid declared check scope");
    if (
      run.checks.some(
        (check) =>
          !scope.checks.some(
            (declared) =>
              declared.checkId === check.checkId &&
              declared.moduleId === check.moduleId &&
              declared.entityId === check.entityId,
          ),
      )
    )
      throw new Error("Check outside declared scope");
  }
  if (run.history !== undefined) {
    if (
      !Array.isArray(run.history) ||
      run.history.some(
        (record) =>
          record.customerId !== run.customerId ||
          (record.sourceRunId !== run.runId &&
            !parents.has(record.sourceRunId)) ||
          !hash.test(record.sourceDigest) ||
          !timestampValue(record.invalidatedAt) ||
          !Array.isArray(record.reasons) ||
          !record.reasons.length ||
          record.reasons.some((reason) => !textValue(reason)) ||
          !record.check ||
          record.check.checkId !== checkIdentity(record.check),
      )
    )
      throw new Error("Invalid history ownership/integrity context");
  }
  if (run.requestResponses !== undefined) {
    if (
      !Array.isArray(run.requestResponses) ||
      run.requestResponses.some(
        (response) =>
          response.customerId !== run.customerId ||
          (response.sourceRunId !== run.runId &&
            !parents.has(response.sourceRunId)) ||
          !textValue(response.requestId) ||
          !textValue(response.actor) ||
          !timestampValue(response.at) ||
          Date.parse(response.at) > Date.parse(run.assessmentAt) ||
          !["answer", "declined", "reopen"].includes(response.outcome) ||
          !textValue(
            response.outcome === "answer" ? response.text : response.reason,
          ),
      )
    )
      throw new Error("Invalid response history");
  }
  return run;
}

export function reconcileEnterpriseChecks(
  previous,
  nextContext,
  assessmentAt,
  options = {},
) {
  validateEnterpriseRun(previous);
  // Validate the incoming plan structurally; stale inherited verdicts are precisely what this function must invalidate.
  validateEnterpriseRun({
    ...nextContext,
    assessmentAt,
    checks: nextContext.checks.map((check) => ({
      ...check,
      status: "unknown",
      review: null,
    })),
    dataRequests: nextContext.dataRequests?.map((request) => ({
      ...request,
      status: request.status === "provided" ? "requested" : request.status,
    })),
  });
  const forced = unique(
    options.invalidateCheckIds ?? [],
    "forced invalidations",
  );
  if (
    !timestampValue(assessmentAt) ||
    previous.customerId !== nextContext.customerId
  )
    throw new Error("Invalid reassessment context");
  if (
    previous.runId !== nextContext.runId &&
    !nextContext.parentRunIds?.includes(previous.runId)
  )
    throw new Error("Explicit parent lineage required");
  assertReviewRequestContinuity(
    previous.dataRequests,
    nextContext.dataRequests,
  );
  const run = globalThis.structuredClone(nextContext);
  run.parentRunIds = [
    ...new Set([...(run.parentRunIds ?? []), ...(previous.parentRunIds ?? [])]),
  ];
  run.assessmentAt = assessmentAt;
  run.history = globalThis.structuredClone(previous.history ?? []);
  const scope = (value) =>
    value.declaredScope ?? {
      moduleIds: value.moduleIds,
      checks: value.checks.map(({ checkId, moduleId, entityId }) => ({
        checkId,
        moduleId,
        entityId,
      })),
    };
  const oldScope = scope(previous),
    newScope = scope(nextContext);
  run.declaredScope = {
    moduleIds: [...new Set([...oldScope.moduleIds, ...newScope.moduleIds])],
    checks: [
      ...new Map(
        [...oldScope.checks, ...newScope.checks].map((check) => [
          check.checkId,
          check,
        ]),
      ).values(),
    ],
  };
  const prior = new Map(previous.checks.map((check) => [check.checkId, check]));
  const oldEvidence = new Map(
    previous.evidence.map((item) => [item.evidenceId, item]),
  );
  const evidence = new Map(run.evidence.map((item) => [item.evidenceId, item]));
  const invalidatedCheckIds = [],
    retainedCheckIds = [];
  const changedCheckContexts = new Set();
  const entityIdentity = (entity) => {
    const { runId, ...identity } = entity;
    void runId;
    return identity;
  };
  const archive = (check, reasons) =>
    run.history.push({
      customerId: previous.customerId,
      sourceRunId: previous.runId,
      sourceDigest: enterpriseDigest(previous),
      check: globalThis.structuredClone(check),
      invalidatedAt: assessmentAt,
      reasons,
    });
  for (const check of previous.checks) {
    if (!run.checks.some((next) => next.checkId === check.checkId)) {
      archive(check, ["check-removed-from-plan"]);
      invalidatedCheckIds.push(check.checkId);
      changedCheckContexts.add(check.checkId);
    }
  }
  for (let index = 0; index < run.checks.length; index++) {
    const planned = run.checks[index],
      check = prior.get(planned.checkId);
    if (!check) continue;
    const reasons = [];
    if (forced.has(check.checkId)) reasons.push("new-user-response");
    if (
      stableJson(
        entityIdentity(
          previous.entities.find(
            (entity) => entity.entityId === check.entityId,
          ),
        ),
      ) !==
      stableJson(
        entityIdentity(
          run.entities.find((entity) => entity.entityId === check.entityId),
        ),
      )
    )
      reasons.push("entity-identity-changed");
    if (
      stableJson(previous.profileVersions) !== stableJson(run.profileVersions)
    )
      reasons.push("profile-version-changed");
    if (
      stableJson(previous.freshnessPolicy ?? null) !==
      stableJson(run.freshnessPolicy ?? null)
    )
      reasons.push("freshness-policy-changed");
    if (
      stableJson(check.dependencies) !== stableJson(planned.dependencies) ||
      stableJson(check.policyIds) !== stableJson(planned.policyIds)
    )
      reasons.push("dependencies-changed");
    for (const id of check.policyIds)
      if (previous.policyVersions[id] !== run.policyVersions[id])
        reasons.push(`policy-changed:${id}`);
    for (const id of check.dependencies) {
      const item = evidence.get(id);
      if (!item || stableJson(oldEvidence.get(id)) !== stableJson(item))
        reasons.push(`evidence-changed:${id}`);
      if (
        item &&
        (item.validUntil === null ||
          Date.parse(item.validUntil) <= Date.parse(assessmentAt) ||
          Date.parse(item.observedAt) > Date.parse(assessmentAt))
      )
        reasons.push(`freshness-unverified:${id}`);
    }
    if (reasons.length) changedCheckContexts.add(check.checkId);
    if (
      reasons.length &&
      ["pass", "fail", "not-applicable"].includes(check.status)
    ) {
      archive(check, reasons);
      run.checks[index] = {
        ...planned,
        status: "unknown",
        reason: reasons.join("; "),
        assessedAt: null,
        review: null,
      };
      invalidatedCheckIds.push(check.checkId);
    } else if (!reasons.length) {
      run.checks[index] = globalThis.structuredClone(check);
      retainedCheckIds.push(check.checkId);
    }
  }
  if (run.dataRequests)
    for (const request of run.dataRequests) {
      const wasProvided = request.status === "provided";
      const expired =
        wasProvided &&
        request.evidenceIds.some((id) => {
          const item = evidence.get(id);
          return (
            !item ||
            !timestampValue(item.validUntil) ||
            Date.parse(item.validUntil) <= Date.parse(assessmentAt) ||
            Date.parse(item.observedAt) > Date.parse(assessmentAt)
          );
        });
      const contextInvalid =
        request.revalidateOnCheckInvalidation === true &&
        request.affectedCheckIds.some((id) => changedCheckContexts.has(id));
      if (expired || contextInvalid) {
        if (request.revalidateOnCheckInvalidation === true) {
          const priorCandidates = previous.evidence.filter(
            (e) =>
              e.customerId === request.customerId &&
              e.artifactType === request.requestedArtifact &&
              e.scopeKey === request.scopeKey &&
              e.windowId === request.windowId,
          );
          request.invalidatedEvidenceDigests = [
            ...new Set([
              ...(request.invalidatedEvidenceDigests ?? []),
              ...Object.values(request.evidenceDigests),
              ...priorCandidates.map((e) => e.digest),
            ]),
          ].sort();
        }
        if (wasProvided) {
          request.status = expired ? "expired" : "invalid";
          request.evidenceIds = [];
          request.evidenceDigests = {};
        }
        if (contextInvalid)
          for (const id of request.affectedCheckIds)
            if (
              changedCheckContexts.has(id) &&
              !invalidatedCheckIds.includes(id)
            )
              invalidatedCheckIds.push(id);
      }
    }
  validateEnterpriseRun(run);
  return { run, invalidatedCheckIds, retainedCheckIds };
}

export async function saveEnterpriseRun(directory, run) {
  validateEnterpriseRun(run);
  await mkdir(directory, { mode: 0o700 });
  try {
    await writeFile(
      path.join(directory, "enterprise-run.json"),
      stableJson(run) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    await writeFile(
      path.join(directory, "enterprise-run.manifest.json"),
      stableJson({ schemaVersion: 1, digest: enterpriseDigest(run) }) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return { directory, digest: enterpriseDigest(run) };
}
export async function loadEnterpriseRun(directory) {
  const root = await lstat(directory);
  if (!root.isDirectory() || root.isSymbolicLink())
    throw new Error("Invalid run directory");
  async function read(name) {
    const file = path.join(directory, name),
      info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024)
      throw new Error("Invalid enterprise artifact");
    return JSON.parse(await readFile(file, "utf8"));
  }
  const run = validateEnterpriseRun(await read("enterprise-run.json"));
  const manifest = await read("enterprise-run.manifest.json");
  if (manifest.schemaVersion !== 1 || manifest.digest !== enterpriseDigest(run))
    throw new Error("Enterprise artifact digest mismatch");
  return run;
}
