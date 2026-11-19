import { createDispositionReviewRequest } from "./disposition-state.mjs";
import { forkEnterpriseEvidenceRun } from "../enterprise-provider-workflow.mjs";
import { boundedJson } from "./config.mjs";
import { inspectEnterpriseMeasurement } from "./workflow.mjs";
import {
  enterpriseDigest,
  enterpriseReviewCheckBinding,
  loadEnterpriseRun,
  saveEnterpriseRun,
  validateEnterpriseRun,
  reconcileEnterpriseChecks,
  timestampValue,
  textValue,
} from "../enterprise-state.mjs";
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
  assert(
    run.checks.find((check) => check.checkId === input.checkId)?.status ===
      "unknown",
    "Only unresolved superseded checks may receive a new disposition",
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
  const view = inspectEnterpriseMeasurement(run);
  const baselineCheck = view.evaluations
    .find((e) => e.evaluationId === proposal.target.evaluationId)
    .supersededChecks.find((check) => check.checkId === priorCheck.checkId);
  const previous = run.measurementDispositions?.find(
    (record) => record.checkId === priorCheck.checkId,
  );
  const previousEvidence = previous
    ? run.evidence.find((e) => e.evidenceId === previous.evidenceId)
    : null;
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
    baselineCheck: globalThis.structuredClone(baselineCheck),
    previousDispositionEvidenceId: previousEvidence?.evidenceId ?? null,
    previousDispositionDigest: previousEvidence?.digest ?? null,
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
    proposedReview: globalThis.structuredClone(content.proposedReview),
    applied: false,
    reviewerAuthenticated: false,
  };
}

/** Development application workflow; external review provenance is a separate host input. */
async function changeMeasurementDispositions(
  sourceDirectory,
  bundle,
  outputDirectory,
  hostContext,
  renewal,
) {
  boundedJson(bundle);
  const source = await loadEnterpriseRun(sourceDirectory);
  inspectEnterpriseMeasurement(source);
  assert(
    Array.isArray(bundle?.dispositions) &&
      bundle.dispositions.length > 0 &&
      bundle.dispositions.length <= 100,
    "Invalid disposition count",
  );
  const prepared = bundle.dispositions.map((item) => {
    assert(
      item && Object.keys(item).sort().join(",") === "proposal,review",
      "Invalid disposition input",
    );
    return prepareMeasurementDisposition(source, item.proposal, item.review, {
      assessmentAt: bundle.assessmentAt,
      trustedReviews: hostContext?.trustedReviews,
    });
  });
  assert(
    new Set(prepared.map((item) => item.checkId)).size === prepared.length,
    "Duplicate disposition target",
  );
  assert(
    prepared.every(
      (item) =>
        Boolean(
          source.measurementDispositions?.some(
            (record) => record.checkId === item.checkId,
          ),
        ) === renewal,
    ),
    renewal
      ? "Renewal requires existing disposition"
      : "Existing disposition requires explicit renewal workflow",
  );
  const next = forkEnterpriseEvidenceRun(source, bundle, "dispositions");
  next.measurementDispositions = [...(next.measurementDispositions ?? [])];
  for (const item of prepared) {
    const check = next.checks.find((c) => c.checkId === item.checkId),
      prior = source.checks.find((c) => c.checkId === item.checkId);
    next.history.push({
      customerId: source.customerId,
      sourceRunId: source.runId,
      sourceDigest: enterpriseDigest(source),
      check: globalThis.structuredClone(prior),
      invalidatedAt: next.assessmentAt,
      reasons: ["reviewed-measurement-replacement"],
    });
    next.evidence.push(item.evidence);
    Object.assign(check, {
      status: "not-applicable",
      reason: "reviewed-measurement-replacement",
      evidenceIds: [item.evidence.evidenceId],
      dependencies: [item.evidence.evidenceId],
      assessedAt: next.assessmentAt,
      review: item.proposedReview,
    });
    const oldRecord = source.measurementDispositions?.find(
      (record) => record.checkId === check.checkId,
    );
    const historyEvidenceIds = oldRecord
      ? [...(oldRecord.historyEvidenceIds ?? []), oldRecord.evidenceId]
      : [];
    assert(
      historyEvidenceIds.length <= 100,
      "Disposition history budget exceeded",
    );
    const record = {
      checkId: check.checkId,
      evaluationId: item.evidence.content.proposal.target.evaluationId,
      evidenceId: item.evidence.evidenceId,
      historyEvidenceIds,
    };
    next.measurementDispositions = next.measurementDispositions.filter(
      (record) => record.checkId !== check.checkId,
    );
    next.measurementDispositions.push(record);
    const oldRequest = next.dataRequests.find(
      (r) =>
        r.requestedArtifact === "measurement-disposition" &&
        r.scopeKey === check.checkId,
    );
    const request = createDispositionReviewRequest(next, check);
    if (oldRequest)
      request.invalidatedEvidenceDigests = [
        ...new Set([
          ...(oldRequest.invalidatedEvidenceDigests ?? []),
          ...Object.values(oldRequest.evidenceDigests),
          ...source.evidence
            .filter(
              (e) =>
                e.artifactType === "measurement-disposition" &&
                e.scopeKey === check.checkId,
            )
            .map((e) => e.digest),
        ]),
      ].sort();
    next.dataRequests = next.dataRequests.filter((r) => r.id !== request.id);
    Object.assign(request, {
      status: "provided",
      evidenceIds: [item.evidence.evidenceId],
      evidenceDigests: { [item.evidence.evidenceId]: item.evidence.digest },
    });
    next.dataRequests.push(request);
  }
  const disposed = new Set(
    next.measurementDispositions.map((record) => record.checkId),
  );
  const removed = new Set();
  next.dataRequests = next.dataRequests.flatMap((request) => {
    if (
      !request.requestedArtifact.startsWith("measurement-assessment-") ||
      !request.requestedArtifact.endsWith("-scope-transition")
    )
      return [request];
    const affectedCheckIds = request.affectedCheckIds.filter(
      (id) => !disposed.has(id),
    );
    if (!affectedCheckIds.length) {
      removed.add(request.requestedArtifact);
      return [];
    }
    return [{ ...request, affectedCheckIds }];
  });
  for (const record of next.measurementEvaluations)
    record.dataRequestArtifacts = record.dataRequestArtifacts.filter(
      (artifact) => !removed.has(artifact),
    );
  validateEnterpriseRun(next);
  inspectEnterpriseMeasurement(next);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    appliedCheckIds: prepared.map((item) => item.checkId),
    reviewerAuthenticated: false,
    assessmentAccepted: false,
  };
}

export async function applyMeasurementDispositions(
  source,
  bundle,
  output,
  hostContext,
) {
  return changeMeasurementDispositions(
    source,
    bundle,
    output,
    hostContext,
    false,
  );
}
export async function renewMeasurementDispositions(
  source,
  bundle,
  output,
  hostContext,
) {
  return changeMeasurementDispositions(
    source,
    bundle,
    output,
    hostContext,
    true,
  );
}

/** Revocation reduces applicability claims and never authorizes website mutation. */
export async function revokeMeasurementDispositions(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  boundedJson(bundle);
  const source = await loadEnterpriseRun(sourceDirectory);
  const view = inspectEnterpriseMeasurement(source);
  assert(
    Array.isArray(bundle?.revocations) &&
      bundle.revocations.length > 0 &&
      bundle.revocations.length <= 100,
    "Invalid revocation count",
  );
  const ids = new Set();
  for (const item of bundle.revocations) {
    assert(
      item &&
        Object.keys(item).sort().join(",") === "actorId,checkId,reason" &&
        textValue(item.actorId) &&
        item.actorId.length <= 4000 &&
        textValue(item.reason) &&
        item.reason.length <= 4000 &&
        !ids.has(item.checkId),
      "Invalid disposition revocation",
    );
    assert(
      source.measurementDispositions?.some(
        (record) => record.checkId === item.checkId,
      ),
      "Unknown disposition target",
    );
    ids.add(item.checkId);
  }
  let next = forkEnterpriseEvidenceRun(source, bundle, "revocations");
  next = reconcileEnterpriseChecks(source, next, next.assessmentAt, {
    invalidateCheckIds: [...ids].filter((id) =>
      view.evaluations.some((e) => e.supersededCheckIds.includes(id)),
    ),
  }).run;
  for (const item of bundle.revocations) {
    const record = source.measurementDispositions.find(
        (record) => record.checkId === item.checkId,
      ),
      target = source.evidence.find((e) => e.evidenceId === record.evidenceId),
      check = next.checks.find((c) => c.checkId === item.checkId);
    const request = next.dataRequests.find(
      (r) =>
        r.requestedArtifact === "measurement-disposition" &&
        r.scopeKey === item.checkId,
    );
    request.invalidatedEvidenceDigests = [
      ...new Set([
        ...(request.invalidatedEvidenceDigests ?? []),
        target.digest,
        ...Object.values(request.evidenceDigests),
      ]),
    ].sort();
    if (request.status === "provided") {
      request.status = "invalid";
      request.evidenceIds = [];
      request.evidenceDigests = {};
    }
    const content = {
      schemaFamily: "measurement-disposition-revocation",
      schemaVersion: 1,
      customerId: source.customerId,
      sourceRunId: source.runId,
      sourceRunDigest: enterpriseDigest(source),
      dispositionEvidenceId: target.evidenceId,
      dispositionDigest: target.digest,
      checkId: item.checkId,
      actorId: item.actorId,
      reason: item.reason,
      revokedAt: next.assessmentAt,
    };
    const digest = enterpriseDigest(content);
    next.evidence.push({
      evidenceId: `measurement-disposition-revocation-${digest}`,
      customerId: next.customerId,
      runId: next.runId,
      entityId: check.entityId,
      artifactType: "measurement-disposition-revocation",
      scopeKey: check.checkId,
      windowId: check.windowId,
      source: "attributed-host-revocation",
      observedAt: next.assessmentAt,
      validUntil: null,
      content,
      digest,
    });
  }
  validateEnterpriseRun(next);
  inspectEnterpriseMeasurement(next);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    revokedCheckIds: [...ids],
    assessmentAccepted: false,
  };
}
