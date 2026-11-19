import { createDataRequest } from "../data-requests.mjs";
import {
  enterpriseDigest,
  stableJson,
  enterpriseReviewCheckBinding,
  timestampValue,
  textValue,
} from "../enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const eq = (a, b) => stableJson(a) === stableJson(b);
export function dispositionRecords(run) {
  const records = run.measurementDispositions ?? [];
  assert(
    Array.isArray(records) &&
      records.length <= 1000 &&
      new Set(records.map((r) => r.checkId)).size === records.length,
    "Invalid measurement dispositions",
  );
  for (const record of records)
    assert(
      record &&
        Object.keys(record).sort().join(",") ===
          "checkId,evaluationId,evidenceId,historyEvidenceIds" &&
        Array.isArray(record.historyEvidenceIds) &&
        record.historyEvidenceIds.length <= 100 &&
        new Set([...record.historyEvidenceIds, record.evidenceId]).size ===
          record.historyEvidenceIds.length + 1,
      "Invalid disposition record",
    );
  for (const record of records) {
    let previous = null;
    for (const id of [...record.historyEvidenceIds, record.evidenceId]) {
      const evidence = run.evidence.find((e) => e.evidenceId === id);
      assert(
        evidence &&
          evidence.content.previousDispositionEvidenceId ===
            (previous?.evidenceId ?? null) &&
          evidence.content.previousDispositionDigest ===
            (previous?.digest ?? null),
        "Broken disposition renewal chain",
      );
      if (previous)
        assert(
          Date.parse(evidence.content.preparedAt) >=
            Date.parse(previous.content.preparedAt),
          "Disposition renewal chronology mismatch",
        );
      previous = evidence;
    }
  }
  return records;
}
/** Validate attributed disposition state against replay-derived baseline before normalization. */
export function validateDispositionOverlay(
  run,
  record,
  baseline,
  current,
  evaluatorDigest,
  effectiveCheck = baseline,
  superseded = true,
  historicalOnly = false,
) {
  const evidence = run.evidence.find((e) => e.evidenceId === record.evidenceId),
    content = evidence?.content;
  assert(
    evidence?.artifactType === "measurement-disposition" &&
      content?.schemaFamily === "measurement-disposition" &&
      content.schemaVersion === 1,
    "Missing disposition evidence",
  );
  const { proposal, review, receipt, priorCheck, proposedReview } = content,
    target = proposal?.target;
  assert(
    target &&
      proposal.targetDigest === enterpriseDigest(target) &&
      proposal.applied === false &&
      proposal.reviewerAuthenticated === false,
    "Invalid disposition proposal",
  );
  assert(
    target.evaluatorDigest === evaluatorDigest &&
      target.evaluationId === record.evaluationId &&
      target.checkId === record.checkId &&
      target.customerId === run.customerId &&
      target.runId === content.sourceRunId &&
      target.sourceRunDigest === content.sourceRunDigest,
    "Disposition scope mismatch",
  );
  assert(
    content.customerId === run.customerId &&
      run.parentRunIds.includes(content.sourceRunId) &&
      evidence.runId === content.sourceRunId &&
      evidence.scopeKey === record.checkId &&
      evidence.entityId === baseline.entityId &&
      evidence.windowId === baseline.windowId,
    "Disposition lineage mismatch",
  );
  const normalizedPrior = {
    ...priorCheck,
    reason: baseline.reason,
    review: null,
    assessedAt: null,
  };
  const previous = content.previousDispositionEvidenceId
    ? run.evidence.find(
        (e) => e.evidenceId === content.previousDispositionEvidenceId,
      )
    : null;
  const priorUsesPrevious =
    previous &&
    eq(priorCheck.evidenceIds, [previous.evidenceId]) &&
    eq(priorCheck.dependencies, [previous.evidenceId]) &&
    eq(
      {
        ...normalizedPrior,
        evidenceIds: baseline.evidenceIds,
        dependencies: baseline.dependencies,
      },
      baseline,
    );
  assert(
    priorCheck.status === "unknown" &&
      priorCheck.review === null &&
      priorCheck.assessedAt === null &&
      priorCheck.checkId === baseline.checkId &&
      target.originalCheckDigest === enterpriseDigest(priorCheck) &&
      eq(content.baselineCheck, baseline) &&
      (eq(normalizedPrior, baseline) || priorUsesPrevious),
    "Disposition baseline mismatch",
  );
  assert(
    run.history.some(
      (h) =>
        h.sourceRunId === content.sourceRunId &&
        h.sourceDigest === content.sourceRunDigest &&
        eq(h.check, priorCheck),
    ),
    "Missing disposition source history",
  );
  assert(
    review.verdict === "accept" &&
      review.targetDigest === proposal.targetDigest &&
      review.reviewerId !== target.proposerId &&
      ["human", "independent-ai"].includes(review.reviewerKind) &&
      textValue(review.rationale),
    "Invalid disposition review",
  );
  assert(
    receipt.targetDigest === proposal.targetDigest &&
      receipt.reviewDigest === enterpriseDigest(review) &&
      receipt.reviewerId === review.reviewerId &&
      receipt.proposerId === target.proposerId &&
      receipt.independentlyObserved === true &&
      textValue(receipt.provenanceRef),
    "Invalid disposition host receipt",
  );
  assert(
    [
      target.proposedAt,
      target.validUntil,
      review.reviewedAt,
      review.validUntil,
      content.preparedAt,
    ].every(timestampValue) &&
      Date.parse(review.reviewedAt) >= Date.parse(target.proposedAt) &&
      Date.parse(content.preparedAt) >= Date.parse(review.reviewedAt) &&
      Date.parse(content.preparedAt) < Date.parse(review.validUntil) &&
      Date.parse(review.validUntil) <= Date.parse(target.validUntil) &&
      content.validUntil === review.validUntil &&
      evidence.validUntil === review.validUntil &&
      evidence.observedAt === content.preparedAt,
    "Invalid disposition time binding",
  );
  assert(
    proposedReview.reviewer === review.reviewerId &&
      proposedReview.rationale === review.rationale &&
      proposedReview.reviewedAt === review.reviewedAt &&
      proposedReview.validUntil === review.validUntil &&
      eq(
        Object.keys(proposedReview.checkBindings).sort(),
        [...target.replacementCheckIds].sort(),
      ),
    "Invalid disposition check review",
  );
  if (historicalOnly) return baseline;
  const actual = run.checks.find((c) => c.checkId === record.checkId);
  if (!superseded) {
    assert(
      actual && actual.status !== "not-applicable",
      "Reintroduced obligation cannot use historical N/A",
    );
    return actual;
  }
  assert(
    actual && ["unknown", "not-applicable"].includes(actual.status),
    "Invalid disposition effective verdict",
  );
  const expected = {
    ...effectiveCheck,
    evidenceIds: [evidence.evidenceId],
    dependencies: [evidence.evidenceId],
    status: actual.status,
    reason: actual.reason,
    assessedAt: actual.assessedAt,
    review: actual.review,
  };
  assert(
    eq(actual, expected) ||
      (actual.status === "unknown" &&
        eq({ ...actual, reason: effectiveCheck.reason }, effectiveCheck)),
    "Disposition check structure mismatch",
  );
  const revocations = run.evidence.filter(
    (item) =>
      item.artifactType === "measurement-disposition-revocation" &&
      item.content?.dispositionEvidenceId === evidence.evidenceId,
  );
  for (const item of revocations) {
    const revocation = item.content;
    assert(
      revocation.schemaFamily === "measurement-disposition-revocation" &&
        revocation.schemaVersion === 1 &&
        revocation.customerId === run.customerId &&
        revocation.checkId === record.checkId &&
        revocation.dispositionDigest === evidence.digest &&
        run.parentRunIds.includes(revocation.sourceRunId) &&
        timestampValue(revocation.revokedAt) &&
        Date.parse(revocation.revokedAt) <= Date.parse(run.assessmentAt) &&
        textValue(revocation.actorId) &&
        textValue(revocation.reason),
      "Invalid disposition revocation evidence",
    );
  }
  if (actual.status === "not-applicable") {
    assert(!revocations.length, "Revoked disposition cannot be active");
    assert(
      actual.reason === "reviewed-measurement-replacement" &&
        actual.assessedAt === content.preparedAt,
      "Disposition verdict attribution mismatch",
    );
    assert(
      eq(actual.review, proposedReview) &&
        Date.parse(review.validUntil) > Date.parse(run.assessmentAt),
      "Expired/mismatched disposition",
    );
    assert(
      target.scopeDigest === current.scopeDigest &&
        target.currentEvaluationEvidenceDigest ===
          enterpriseDigest(current.evidence[0]) &&
        [
          ...new Set([
            ...baseline.policyIds,
            ...target.replacementCheckIds.flatMap(
              (id) => run.checks.find((c) => c.checkId === id)?.policyIds ?? [],
            ),
          ]),
        ].every((id) => target.policyVersions[id] === run.policyVersions[id]),
      "Changed disposition context",
    );
    const active = new Set(current.checks.map((c) => c.checkId));
    assert(
      target.replacementCheckIds.length > 0 &&
        new Set(target.replacementCheckIds).size ===
          target.replacementCheckIds.length &&
        target.replacementCheckIds.every((id) => active.has(id)),
      "Disposition replacements are not current",
    );
    for (const id of target.replacementCheckIds) {
      const replacement = run.checks.find((c) => c.checkId === id);
      const row = current.evidence.find((e) =>
        replacement.evidenceIds.includes(e.evidenceId),
      )?.content?.row;
      assert(
        row &&
          row.purpose !== "contract-acquisition" &&
          ![
            "measurement-contract-required",
            "business-contract-required",
          ].includes(row.ruleId),
        "Acquisition cannot replace a substantive check",
      );
      assert(
        target.replacementCheckDigests[id] === enterpriseDigest(replacement) &&
          proposedReview.checkBindings[id] ===
            enterpriseReviewCheckBinding(run, id),
        "Changed disposition replacement",
      );
    }
  } else
    assert(
      actual.assessedAt === null && actual.review === null,
      "Invalid inactive disposition",
    );
  return effectiveCheck;
}
export function resliceDispositionRequests(derived, run) {
  const ids = new Set(
    dispositionRecords(run)
      .filter((r) => r.evaluationId === derived.entry.evaluationId)
      .map((r) => r.checkId),
  );
  derived.requests = derived.requests.flatMap((request) => {
    if (!request.requestedArtifact.endsWith("-scope-transition"))
      return [request];
    const affectedCheckIds = request.affectedCheckIds.filter(
      (id) => !ids.has(id),
    );
    return affectedCheckIds.length ? [{ ...request, affectedCheckIds }] : [];
  });
  derived.index.dataRequestArtifacts = derived.requests.map(
    (r) => r.requestedArtifact,
  );
  return derived;
}

export function createDispositionReviewRequest(run, check) {
  return createDataRequest({
    customerId: run.customerId,
    runId: run.runId,
    requestedArtifact: "measurement-disposition",
    scopeKey: check.checkId,
    windowId: check.windowId,
    moduleIds: [check.moduleId],
    affectedCheckIds: [check.checkId],
    reason:
      "Review the current applicability decision and its replacement checks",
    acceptedFormats: ["Independently reviewed bound disposition"],
    leastPrivilegeAccess:
      "Read-only review; no credentials or website mutation",
    exportInstructions:
      "Review the exact current proposal and replacement evidence through the separate host review channel",
    suggestedOwnerRole: "Independent reviewer",
    fallback: "Keep prior obligation unknown",
    priority: "medium",
    revalidateOnCheckInvalidation: true,
  });
}
