import {
  enterpriseDigest,
  textValue,
  timestampValue,
  stableJson,
} from "./enterprise-state.mjs";
const states = ["requested", "provided", "invalid", "declined", "expired"];
const list = (values) => Array.isArray(values) && values.every(textValue);
function identity(request) {
  return enterpriseDigest([
    request.customerId,
    request.runId,
    request.requestedArtifact,
    request.scopeKey,
    request.windowId,
  ]);
}
export function validateDataRequest(request) {
  for (const field of [
    "customerId",
    "runId",
    "requestedArtifact",
    "scopeKey",
    "reason",
    "leastPrivilegeAccess",
    "exportInstructions",
    "suggestedOwnerRole",
    "fallback",
  ])
    if (!textValue(request?.[field]))
      throw new Error(`Invalid data request ${field}`);
  if (!(request.windowId === null || textValue(request.windowId)))
    throw new Error("Invalid request window");
  for (const field of [
    "moduleIds",
    "affectedCheckIds",
    "acceptedFormats",
    "evidenceIds",
  ])
    if (
      !list(request[field]) ||
      new Set(request[field]).size !== request[field].length
    )
      throw new Error(`Invalid data request ${field}`);
  if (
    !request.moduleIds.length ||
    !request.affectedCheckIds.length ||
    !request.acceptedFormats.length ||
    !states.includes(request.status) ||
    !["high", "medium", "low"].includes(request.priority) ||
    request.id !== identity(request)
  )
    throw new Error("Invalid data request identity/status");
  if (
    !request.evidenceDigests ||
    typeof request.evidenceDigests !== "object" ||
    Array.isArray(request.evidenceDigests) ||
    Object.keys(request.evidenceDigests).length !==
      request.evidenceIds.length ||
    request.evidenceIds.some(
      (id) => !/^[a-f0-9]{64}$/.test(request.evidenceDigests[id]),
    ) ||
    (request.status === "provided" && !request.evidenceIds.length)
  )
    throw new Error("Invalid data request evidence bindings");
  return request;
}
export function createDataRequest(input) {
  const request = {
    ...input,
    id: identity(input),
    status: "requested",
    evidenceIds: [],
    evidenceDigests: {},
  };
  return validateDataRequest(request);
}
export function mergeDataRequests(requests) {
  const merged = new Map();
  for (const request of requests) {
    validateDataRequest(request);
    const existing = merged.get(request.id);
    if (!existing) merged.set(request.id, globalThis.structuredClone(request));
    else {
      if (
        existing.status !== request.status ||
        stableJson(existing.evidenceDigests) !==
          stableJson(request.evidenceDigests)
      )
        throw new Error("Conflicting request revisions");
      for (const field of [
        "moduleIds",
        "affectedCheckIds",
        "acceptedFormats",
        "evidenceIds",
      ])
        existing[field] = [
          ...new Set([...existing[field], ...request[field]]),
        ].sort();
      if (
        request.priority === "high" ||
        (request.priority === "medium" && existing.priority === "low")
      )
        existing.priority = request.priority;
    }
  }
  return [...merged.values()];
}
/** Receipts bind the complete descriptor. They come from adapter validation, never supplied exports. */
export function reconcileDataRequests(requests, evidence, options) {
  if (
    !timestampValue(options?.assessmentAt) ||
    !Array.isArray(options?.verifiedEvidence) ||
    !Array.isArray(evidence)
  )
    throw new Error("Invalid request reconciliation context");
  const verified = new Map();
  for (const receipt of options.verifiedEvidence) {
    if (
      !textValue(receipt?.evidenceId) ||
      !/^[a-f0-9]{64}$/.test(receipt.bindingDigest) ||
      verified.has(receipt.evidenceId)
    )
      throw new Error("Invalid validation receipt");
    verified.set(receipt.evidenceId, receipt.bindingDigest);
  }
  const ids = new Set();
  for (const item of evidence) {
    if (
      !textValue(item.evidenceId) ||
      ids.has(item.evidenceId) ||
      !/^[a-f0-9]{64}$/.test(item.digest)
    )
      throw new Error("Invalid or duplicate request evidence");
    ids.add(item.evidenceId);
  }
  const invalidated = new Set();
  const output = mergeDataRequests(requests).map((request) => {
    const next = globalThis.structuredClone(request);
    if (request.status === "declined") return next;
    const candidates = evidence.filter(
      (item) =>
        item.customerId === request.customerId &&
        (item.runId === request.runId ||
          options.parentRunIds?.includes(item.runId)) &&
        item.artifactType === request.requestedArtifact &&
        item.scopeKey === request.scopeKey &&
        item.windowId === request.windowId,
    );
    const accepted = candidates.filter(
      (item) =>
        verified.get(item.evidenceId) === enterpriseDigest(item) &&
        timestampValue(item.observedAt) &&
        Date.parse(item.observedAt) <= Date.parse(options.assessmentAt) &&
        timestampValue(item.validUntil) &&
        Date.parse(item.validUntil) > Date.parse(options.assessmentAt),
    );
    if (accepted.length) {
      next.status = "provided";
      next.evidenceIds = accepted.map((item) => item.evidenceId).sort();
      next.evidenceDigests = Object.fromEntries(
        accepted.map((item) => [item.evidenceId, item.digest]),
      );
    } else if (candidates.length) {
      next.status = candidates.some(
        (item) =>
          verified.get(item.evidenceId) === enterpriseDigest(item) &&
          timestampValue(item.observedAt) &&
          Date.parse(item.observedAt) <= Date.parse(options.assessmentAt) &&
          timestampValue(item.validUntil) &&
          Date.parse(item.validUntil) <= Date.parse(options.assessmentAt),
      )
        ? "expired"
        : "invalid";
      next.evidenceIds = [];
      next.evidenceDigests = {};
    } else if (request.status === "provided") {
      next.status = "requested";
      next.evidenceIds = [];
      next.evidenceDigests = {};
    }
    if (
      request.status !== next.status ||
      stableJson(request.evidenceDigests) !== stableJson(next.evidenceDigests)
    )
      for (const id of request.affectedCheckIds) invalidated.add(id);
    return next;
  });
  return { requests: output, invalidatedCheckIds: [...invalidated].sort() };
}
