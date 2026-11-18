import {
  loadEnterpriseRun,
  saveEnterpriseRun,
  enterpriseDigest,
  textValue,
  timestampValue,
  reconcileEnterpriseChecks,
} from "./enterprise-state.mjs";
import { createDataRequest, reconcileDataRequests } from "./data-requests.mjs";

const ownerArtifacts = new Set([
  "business-context",
  "consent-policy",
  "optimization-scope",
  "content-sources",
]);
/** A revision records attributed answers, never a user's claimed pass or claimed provider verification. */
export async function reviseEnterpriseRun(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  if (
    !bundle ||
    Object.keys(bundle).some(
      (key) =>
        !["sourceDigest", "newRunId", "assessmentAt", "responses"].includes(
          key,
        ),
    ) ||
    bundle.sourceDigest !== enterpriseDigest(previous) ||
    !textValue(bundle.newRunId) ||
    bundle.newRunId === previous.runId ||
    previous.parentRunIds?.includes(bundle.newRunId) ||
    !timestampValue(bundle.assessmentAt) ||
    Date.parse(bundle.assessmentAt) < Date.parse(previous.assessmentAt) ||
    !Array.isArray(bundle.responses)
  )
    throw new Error("Invalid or stale enterprise revision binding");
  const next = globalThis.structuredClone(previous);
  next.runId = bundle.newRunId;
  next.parentRunIds = [
    ...new Set([previous.runId, ...(previous.parentRunIds ?? [])]),
  ];
  next.entities = next.entities.map((entity) => ({
    ...entity,
    runId: next.runId,
  }));
  next.requestResponses = [...(previous.requestResponses ?? [])];
  const mapping = new Map();
  next.dataRequests = (previous.dataRequests ?? []).map((request) => {
    const revised = {
      ...request,
      ...createDataRequest({ ...request, runId: next.runId }),
      status: request.status,
      evidenceIds: [...request.evidenceIds],
      evidenceDigests: { ...request.evidenceDigests },
    };
    mapping.set(request.id, revised);
    return revised;
  });
  const handled = new Set(),
    affected = new Set(),
    verifiedEvidence = [];
  for (const response of bundle.responses) {
    const request = mapping.get(response?.requestId);
    if (
      !request ||
      handled.has(response.requestId) ||
      !["answer", "declined", "reopen"].includes(response.outcome) ||
      !textValue(response.actor) ||
      !timestampValue(response.at) ||
      Date.parse(response.at) > Date.parse(bundle.assessmentAt) ||
      Object.keys(response).some(
        (key) =>
          ![
            "requestId",
            "outcome",
            "actor",
            "at",
            "reason",
            "text",
            "validUntil",
          ].includes(key),
      )
    )
      throw new Error("Invalid or duplicate request response");
    handled.add(response.requestId);
    for (const id of request.affectedCheckIds) affected.add(id);
    request.evidenceIds = [];
    request.evidenceDigests = {};
    if (response.outcome === "declined" || response.outcome === "reopen") {
      if (!textValue(response.reason))
        throw new Error("Request decision requires a reason");
      request.status =
        response.outcome === "declined" ? "declined" : "requested";
    } else {
      if (!textValue(response.text) || response.text.length > 65536)
        throw new Error("Answer must be nonempty bounded text");
      request.status = "requested";
      if (ownerArtifacts.has(request.requestedArtifact)) {
        if (
          !timestampValue(response.validUntil) ||
          Date.parse(response.validUntil) <= Date.parse(bundle.assessmentAt)
        )
          throw new Error(
            "Owner context requires an explicit current validity window",
          );
        const content = {
          text: response.text,
          actor: response.actor,
          at: response.at,
        };
        const evidence = {
          evidenceId: enterpriseDigest([request.id, content]),
          customerId: next.customerId,
          runId: next.runId,
          entityId: request.scopeKey,
          source: "supplied-owner-context",
          artifactType: request.requestedArtifact,
          scopeKey: request.scopeKey,
          windowId: request.windowId,
          digest: enterpriseDigest(content),
          content,
          observedAt: response.at,
          validUntil: response.validUntil,
          limitation:
            "Attributed owner assertion; not independently verified platform behavior or semantic acceptance.",
        };
        next.evidence.push(evidence);
        verifiedEvidence.push({
          evidenceId: evidence.evidenceId,
          bindingDigest: enterpriseDigest(evidence),
        });
      }
    }
    next.requestResponses.push({
      ...response,
      requestId: request.id,
      originalRequestId: response.requestId,
      customerId: next.customerId,
      sourceRunId: next.runId,
    });
  }
  // Preserve previously validated bindings without claiming verification for new or changed bytes.
  for (const request of next.dataRequests)
    if (request.status === "provided")
      for (const id of request.evidenceIds) {
        const evidence = next.evidence.find((item) => item.evidenceId === id);
        verifiedEvidence.push({
          evidenceId: id,
          bindingDigest: enterpriseDigest(evidence),
        });
      }
  const receipts = [
    ...new Map(
      verifiedEvidence.map((receipt) => [receipt.evidenceId, receipt]),
    ).values(),
  ];
  // Inherited evidence retains its source run; matching is explicitly limited to declared parents.
  next.dataRequests = reconcileDataRequests(next.dataRequests, next.evidence, {
    assessmentAt: bundle.assessmentAt,
    verifiedEvidence: receipts,
    parentRunIds: next.parentRunIds,
  }).requests;
  const result = reconcileEnterpriseChecks(
    previous,
    next,
    bundle.assessmentAt,
    { invalidateCheckIds: [...affected] },
  );
  await saveEnterpriseRun(outputDirectory, result.run);
  return {
    directory: outputDirectory,
    runId: result.run.runId,
    digest: enterpriseDigest(result.run),
    invalidatedCheckIds: result.invalidatedCheckIds,
  };
}
