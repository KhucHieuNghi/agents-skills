import { createHash } from "node:crypto";
import { validateNewReviewTimes } from "./review-time.mjs";
const text = (value) => typeof value === "string" && value.trim().length > 0;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};
/** Checks supplied judgments and evidence binding, not factual truth. */
export function validateAccuracyReview(observation, artifacts) {
  const review = observation.accuracyReview;
  if (review === undefined || review === null) return;
  requireValue(
    observation.status === "captured",
    "Capture error cannot contain accuracy review",
  );
  requireValue(
    review &&
      text(review.reviewer) &&
      typeof review.claimsComplete === "boolean" &&
      Array.isArray(review.claims),
    "Invalid accuracy review",
  );
  validateNewReviewTimes([review], [{ collectedAt: observation.capturedAt }]);
  requireValue(
    Date.parse(review.reviewedAt) >= Date.parse(observation.capturedAt),
    "Accuracy review precedes response capture",
  );
  const response = artifacts[observation.responseArtifact];
  const ids = new Set();
  for (const claim of review.claims) {
    requireValue(
      claim && text(claim.claimId) && !ids.has(claim.claimId),
      "Missing or duplicate accuracy claim ID",
    );
    ids.add(claim.claimId);
    requireValue(
      text(claim.quote) && response.includes(claim.quote),
      "Accuracy claim quote absent from response",
    );
    requireValue(
      ["correct", "incorrect", "unknown"].includes(claim.verdict) &&
        text(claim.reason),
      "Invalid accuracy claim verdict or reason",
    );
    requireValue(
      Array.isArray(claim.sources) &&
        (claim.verdict === "unknown" || claim.sources.length > 0),
      "Adjudicated accuracy claim requires source snapshots",
    );
    const sources = new Set();
    for (const source of claim.sources) {
      requireValue(
        source &&
          text(source.artifact) &&
          !sources.has(source.artifact) &&
          Object.hasOwn(artifacts, source.artifact) &&
          typeof artifacts[source.artifact] === "string",
        "Missing or duplicate accuracy source artifact",
      );
      sources.add(source.artifact);
      requireValue(
        hash(artifacts[source.artifact]) === source.sha256,
        "Accuracy source hash mismatch",
      );
      requireValue(text(source.locator), "Accuracy source locator required");
      requireValue(
        text(source.quote) && artifacts[source.artifact].includes(source.quote),
        "Accuracy source quote absent from snapshot",
      );
      validateNewReviewTimes([], [{ collectedAt: source.capturedAt }]);
      requireValue(
        Date.parse(source.capturedAt) <= Date.parse(review.reviewedAt),
        "Accuracy source captured after review",
      );
    }
  }
}
const rate = (numerator, denominator) => ({
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
});
export function summarizeAccuracy(observations) {
  let correct = 0,
    incorrect = 0,
    unknownClaims = 0,
    reviewedResponses = 0,
    unreviewedResponses = 0,
    incompleteInventories = 0,
    emptyInventories = 0,
    unresolvedResponses = 0,
    eligible = 0,
    correctResponses = 0;
  for (const observation of observations) {
    if (observation.status !== "captured") continue;
    const review = observation.accuracyReview;
    if (!review) {
      unreviewedResponses++;
      continue;
    }
    reviewedResponses++;
    const claims = review.claims;
    correct += claims.filter((claim) => claim.verdict === "correct").length;
    incorrect += claims.filter((claim) => claim.verdict === "incorrect").length;
    unknownClaims += claims.filter(
      (claim) => claim.verdict === "unknown",
    ).length;
    if (!review.claimsComplete) incompleteInventories++;
    if (!claims.length) emptyInventories++;
    if (claims.some((claim) => claim.verdict === "unknown"))
      unresolvedResponses++;
    if (
      review.claimsComplete &&
      claims.length &&
      claims.every((claim) => claim.verdict !== "unknown")
    ) {
      eligible++;
      if (claims.every((claim) => claim.verdict === "correct"))
        correctResponses++;
    }
  }
  return {
    claims: rate(correct, correct + incorrect),
    responses: rate(correctResponses, eligible),
    unknownClaims,
    reviewedResponses,
    unreviewedResponses,
    incompleteInventories,
    emptyInventories,
    unresolvedResponses,
  };
}
