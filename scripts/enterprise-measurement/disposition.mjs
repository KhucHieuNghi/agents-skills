import { boundedJson } from "../../skills/content-search-audit/scripts/lib/measurement-assessment/config.mjs";
import { inspectEnterpriseMeasurement } from "../../skills/content-search-audit/scripts/lib/measurement-assessment/workflow.mjs";
import {
  enterpriseDigest,
  enterpriseReviewCheckBinding,
  timestampValue,
  textValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
/** Development proposal only. Review and explicit application are separate gates. */
export function proposeMeasurementReplacement(run, input) {
  boundedJson(input);
  const fields = [
    "sourceRunDigest",
    "proposerId",
    "proposedAt",
    "validUntil",
    "evaluationId",
    "checkId",
    "replacementCheckIds",
    "rationale",
  ];
  assert(
    input &&
      Object.keys(input).length === fields.length &&
      fields.every((k) => Object.hasOwn(input, k)),
    "Invalid replacement proposal fields",
  );
  const view = inspectEnterpriseMeasurement(run);
  assert(
    input.sourceRunDigest === view.sourceRunDigest,
    "Stale replacement proposal source",
  );
  for (const field of ["proposerId", "evaluationId", "checkId", "rationale"])
    assert(
      textValue(input[field]) && input[field].length <= 4000,
      `Invalid proposal ${field}`,
    );
  assert(
    timestampValue(input.proposedAt) &&
      timestampValue(input.validUntil) &&
      Date.parse(input.proposedAt) >= Date.parse(run.assessmentAt) &&
      Date.parse(input.validUntil) > Date.parse(input.proposedAt),
    "Invalid proposal validity",
  );
  const evaluation = view.evaluations.find(
    (e) => e.evaluationId === input.evaluationId,
  );
  assert(
    evaluation?.supersededCheckIds.includes(input.checkId),
    "Only replay-proven superseded checks are eligible",
  );
  const replacements = input.replacementCheckIds;
  assert(
    Array.isArray(replacements) &&
      replacements.length > 0 &&
      replacements.length <= 100 &&
      new Set(replacements).size === replacements.length &&
      replacements.every((id) => evaluation.replacementCheckIds.includes(id)),
    "Replacements must be distinct current checks in the same evaluation",
  );
  const evidence = run.evidence.find(
    (e) => e.evidenceId === evaluation.evidenceId,
  );
  const replacementEvidence = replacements.flatMap((id) =>
    run.checks
      .find((c) => c.checkId === id)
      .dependencies.map((dependency) =>
        run.evidence.find((e) => e.evidenceId === dependency),
      ),
  );
  assert(
    replacementEvidence.length > 0 &&
      replacementEvidence.every(
        (item) =>
          item &&
          Date.parse(item.validUntil) > Date.parse(input.proposedAt) &&
          Date.parse(input.validUntil) <= Date.parse(item.validUntil),
      ),
    "Proposal exceeds replacement evidence validity",
  );
  const target = {
    schemaFamily: "measurement-replacement-proposal",
    schemaVersion: 1,
    ...globalThis.structuredClone(input),
    replacementCheckIds: [...replacements].sort(),
    customerId: run.customerId,
    runId: run.runId,
    evaluatorDigest: view.evaluatorDigest,
    scopeDigest: evaluation.scopeDigest,
    currentEvaluationEvidenceDigest: enterpriseDigest(evidence),
    originalCheckDigest: enterpriseDigest(
      run.checks.find((c) => c.checkId === input.checkId),
    ),
    replacementCheckDigests: Object.fromEntries(
      [...replacements]
        .sort()
        .map((id) => [
          id,
          enterpriseDigest(run.checks.find((c) => c.checkId === id)),
        ]),
    ),
    policyVersions: globalThis.structuredClone(run.policyVersions),
  };
  return {
    target,
    targetDigest: enterpriseDigest(target),
    reviewRequired: true,
    applied: false,
    reviewerAuthenticated: false,
  };
}

/** Validate attributed review data; host provenance must be established separately. */
export function validateMeasurementReplacementReview(
  run,
  proposal,
  review,
  asOf,
) {
  boundedJson(proposal);
  boundedJson(review);
  const target = proposal?.target;
  assert(target, "Missing replacement proposal target");
  const input = Object.fromEntries(
    [
      "sourceRunDigest",
      "proposerId",
      "proposedAt",
      "validUntil",
      "evaluationId",
      "checkId",
      "replacementCheckIds",
      "rationale",
    ].map((key) => [key, target[key]]),
  );
  const expected = proposeMeasurementReplacement(run, input);
  assert(
    enterpriseDigest(proposal) === enterpriseDigest(expected),
    "Replacement proposal binding mismatch",
  );
  const fields = [
    "targetDigest",
    "reviewerId",
    "reviewerKind",
    "verdict",
    "rationale",
    "reviewedAt",
    "validUntil",
  ];
  assert(
    review &&
      Object.keys(review).length === fields.length &&
      fields.every((k) => Object.hasOwn(review, k)),
    "Invalid replacement review fields",
  );
  assert(
    review.targetDigest === proposal.targetDigest,
    "Stale replacement review target",
  );
  assert(
    textValue(review.reviewerId) &&
      review.reviewerId.length <= 4000 &&
      review.reviewerId !== target.proposerId,
    "Distinct attributed reviewer required",
  );
  assert(
    ["human", "independent-ai"].includes(review.reviewerKind) &&
      ["accept", "reject"].includes(review.verdict),
    "Invalid review kind/verdict",
  );
  assert(
    textValue(review.rationale) && review.rationale.length <= 4000,
    "Review rationale required",
  );
  assert(
    timestampValue(asOf) &&
      timestampValue(review.reviewedAt) &&
      timestampValue(review.validUntil) &&
      Date.parse(review.reviewedAt) >= Date.parse(target.proposedAt) &&
      Date.parse(review.reviewedAt) <= Date.parse(asOf) &&
      Date.parse(review.validUntil) > Date.parse(asOf) &&
      Date.parse(review.validUntil) <= Date.parse(target.validUntil),
    "Invalid or expired replacement review",
  );
  return {
    targetDigest: proposal.targetDigest,
    reviewDigest: enterpriseDigest(review),
    verdict: review.verdict,
    attributedReviewValid: true,
    reviewerAuthenticated: false,
    applied: false,
  };
}

/** Host-only preparation. Never read trustedReviews from a customer export or proposal. */
export function prepareMeasurementDisposition(run, proposal, review, options) {
  const result = validateMeasurementReplacementReview(
    run,
    proposal,
    review,
    options?.assessmentAt,
  );
  assert(
    result.verdict === "accept",
    "Rejected review cannot authorize disposition",
  );
  assert(
    Array.isArray(options?.trustedReviews),
    "Trusted host review receipt required",
  );
  const receipt = options.trustedReviews.find(
    (item) =>
      item?.targetDigest === proposal.targetDigest &&
      item.reviewDigest === result.reviewDigest &&
      item.reviewerId === review.reviewerId &&
      item.proposerId === proposal.target.proposerId &&
      item.independentlyObserved === true &&
      textValue(item.provenanceRef),
  );
  assert(receipt, "Missing independently observed host review receipt");
  boundedJson(receipt);
  assert(
    Object.keys(receipt).length === 6 && receipt.provenanceRef.length <= 4000,
    "Invalid host review receipt",
  );
  const priorCheck = run.checks.find(
    (check) => check.checkId === proposal.target.checkId,
  );
  const content = {
    schemaFamily: "measurement-disposition",
    schemaVersion: 1,
    sourceRunDigest: enterpriseDigest(run),
    sourceRunId: run.runId,
    customerId: run.customerId,
    proposal: globalThis.structuredClone(proposal),
    review: globalThis.structuredClone(review),
    receipt: globalThis.structuredClone(receipt),
    priorCheck: globalThis.structuredClone(priorCheck),
    preparedAt: options.assessmentAt,
    validUntil: review.validUntil,
  };
  const digest = enterpriseDigest(content);
  const evidence = {
    evidenceId: `measurement-disposition-${digest}`,
    customerId: run.customerId,
    runId: run.runId,
    entityId: priorCheck.entityId,
    artifactType: "measurement-disposition",
    scopeKey: priorCheck.checkId,
    windowId: priorCheck.windowId,
    source: "host-observed-attributed-review",
    observedAt: options.assessmentAt,
    validUntil: review.validUntil,
    content,
    digest,
  };
  return {
    evidence,
    checkId: priorCheck.checkId,
    proposedStatus: "not-applicable",
    proposedReview: {
      reviewer: review.reviewerId,
      rationale: review.rationale,
      reviewedAt: review.reviewedAt,
      validUntil: review.validUntil,
      checkBindings: Object.fromEntries(
        proposal.target.replacementCheckIds.map((id) => [
          id,
          enterpriseReviewCheckBinding(run, id),
        ]),
      ),
    },
    applied: false,
    reviewerAuthenticated: false,
  };
}
