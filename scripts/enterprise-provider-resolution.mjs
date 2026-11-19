import { inspectEnterpriseProviderSnapshots } from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";
import {
  enterpriseDigest,
  timestampValue,
  textValue,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const shape = (value, keys) =>
  value &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const boundedText = (value) => textValue(value) && value.length <= 2000;

/** Private proposal; neither reviewer identity nor provider authenticity is established. */
export function proposeProviderResolution(run, input) {
  const keys = [
    "sourceRunDigest",
    "targetId",
    "selectedEvidenceId",
    "proposerId",
    "proposedAt",
    "validUntil",
    "reason",
  ];
  assert(
    shape(input, keys) &&
      [
        input.targetId,
        input.selectedEvidenceId,
        input.proposerId,
        input.reason,
      ].every(boundedText) &&
      [input.proposedAt, input.validUntil].every(timestampValue),
    "Invalid provider resolution proposal",
  );
  const view = inspectEnterpriseProviderSnapshots(run);
  assert(
    input.sourceRunDigest === view.sourceRunDigest,
    "Stale provider resolution source",
  );
  assert(
    Date.parse(input.proposedAt) >= Date.parse(run.assessmentAt) &&
      Date.parse(input.validUntil) > Date.parse(input.proposedAt),
    "Invalid proposal chronology",
  );
  const target = run.providerTargets.find(
    (value) => value.targetId === input.targetId,
  );
  assert(target, "Unknown provider target");
  const request = run.dataRequests.find(
    (value) => value.id === target.requestId,
  );
  assert(
    request && !["declined", "invalid"].includes(request.status),
    "Provider request unavailable",
  );
  const byId = new Map(run.evidence.map((value) => [value.evidenceId, value]));
  const snapshots = view.snapshots.filter(
    (value) =>
      value.targetId === target.targetId &&
      Date.parse(value.validUntil) > Date.parse(input.proposedAt),
  );
  const groups = new Map();
  for (const snapshot of snapshots) {
    const evidence = byId.get(snapshot.evidenceId);
    const key = enterpriseDigest(evidence.content.sourceEnvelope.input);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      evidenceId: evidence.evidenceId,
      digest: evidence.digest,
      validUntil: evidence.validUntil,
    });
  }
  assert(groups.size > 1, "No competing fresh provider inputs");
  const selected = [...groups.values()].find((group) =>
    group.some((item) => item.evidenceId === input.selectedEvidenceId),
  );
  assert(selected, "Selected evidence is not a fresh competing input");
  const all = [...groups.entries()]
    .map(([inputDigest, bindings]) => ({
      inputDigest,
      bindings: bindings.sort((a, b) =>
        a.evidenceId.localeCompare(b.evidenceId),
      ),
    }))
    .sort((a, b) => a.inputDigest.localeCompare(b.inputDigest));
  assert(
    all.every((group) =>
      group.bindings.every(
        (item) => Date.parse(item.validUntil) >= Date.parse(input.validUntil),
      ),
    ),
    "Resolution exceeds source validity",
  );
  const targetRecord = {
    schemaFamily: "private-provider-resolution-proposal",
    schemaVersion: 1,
    ...globalThis.structuredClone(input),
    customerId: run.customerId,
    runId: run.runId,
    requestId: request.id,
    targetDigest: enterpriseDigest(target),
    groups: all,
    selectedInputDigest: all.find((group) =>
      group.bindings.some(
        (item) => item.evidenceId === input.selectedEvidenceId,
      ),
    ).inputDigest,
  };
  return {
    target: targetRecord,
    targetDigest: enterpriseDigest(targetRecord),
    reviewRequired: true,
    applied: false,
    providerAuthenticated: false,
    reviewerAuthenticated: false,
  };
}

/** Verify attributed independent review plus a host-trusted receipt; no persisted selection. */
export function validateProviderResolutionReview(
  run,
  proposal,
  review,
  options,
) {
  const keys = [
    "sourceRunDigest",
    "targetId",
    "selectedEvidenceId",
    "proposerId",
    "proposedAt",
    "validUntil",
    "reason",
  ];
  assert(proposal?.target, "Missing provider proposal");
  const expected = proposeProviderResolution(
    run,
    Object.fromEntries(keys.map((key) => [key, proposal.target[key]])),
  );
  assert(
    enterpriseDigest(expected) === enterpriseDigest(proposal),
    "Provider proposal binding mismatch",
  );
  const fields = [
    "targetDigest",
    "reviewerId",
    "reviewerKind",
    "verdict",
    "reason",
    "reviewedAt",
    "validUntil",
  ];
  assert(
    shape(review, fields) &&
      review.targetDigest === proposal.targetDigest &&
      boundedText(review.reviewerId) &&
      review.reviewerId !== proposal.target.proposerId &&
      boundedText(review.reason) &&
      ["human", "independent-ai"].includes(review.reviewerKind) &&
      ["accept", "reject"].includes(review.verdict),
    "Invalid provider resolution review",
  );
  assert(
    options &&
      timestampValue(options.assessmentAt) &&
      [review.reviewedAt, review.validUntil].every(timestampValue) &&
      Date.parse(review.reviewedAt) >= Date.parse(proposal.target.proposedAt) &&
      Date.parse(review.reviewedAt) <= Date.parse(options.assessmentAt) &&
      Date.parse(options.assessmentAt) < Date.parse(review.validUntil) &&
      Date.parse(review.validUntil) <= Date.parse(proposal.target.validUntil),
    "Invalid or expired provider review",
  );
  const reviewDigest = enterpriseDigest(review);
  assert(
    Array.isArray(options.trustedReviews) &&
      options.trustedReviews.length <= 1000,
    "Host-trusted review required",
  );
  const matches = options.trustedReviews.filter(
    (receipt) =>
      receipt?.targetDigest === proposal.targetDigest &&
      receipt?.reviewDigest === reviewDigest &&
      receipt?.reviewerId === review.reviewerId &&
      receipt?.independentlyObserved === true &&
      boundedText(receipt?.provenanceRef),
  );
  assert(matches.length === 1, "Host-trusted review receipt mismatch");
  return {
    targetDigest: proposal.targetDigest,
    reviewDigest,
    verdict: review.verdict,
    attributedReviewValid: true,
    reviewerAuthenticated: false,
    providerAuthenticated: false,
    selectionApplied: false,
    disclosureAuthorized: false,
  };
}
