import { reviewFixture } from "./experiment-review.js";
import { encode } from "./experiment-exports.js";
import { enterpriseDigest as digest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { prepareExperimentReview } from "../../scripts/enterprise-journeys/experiment-review-packet.mjs";
import { experimentReviewRequirements } from "../../scripts/enterprise-journeys/experiment-review.mjs";
import { EXPERIMENT_REVIEW_GATES as gates } from "../../scripts/enterprise-journeys/experiment-decision.mjs";
export function reviewedFixture() {
  const s = reviewFixture();
  const aggregates = [encode(s.raw)];
  const policy = {
    scope: s.context.scope,
    reviewerIds: ["reviewer"],
    allowedTypes: ["ai"],
    maxAgeSeconds: 172800,
    validUntil: "2026-11-08T00:00:00Z",
  };
  const packet = prepareExperimentReview(s.context, aggregates, s.supports);
  const raw = {
    schemaVersion: 1,
    scope: s.context.scope,
    protocolDigest: s.context.protocolDigest,
    evidenceSetDigest: packet.evidenceSetDigest,
    policyDigest: digest(policy),
    synthetic: true,
    reviewer: {
      id: "reviewer",
      type: "ai",
      relationship: "declared-independent",
      conflictOfInterest: "none-declared",
      disclosure:
        "Synthetic independent reviewer attribution; not authenticated.",
    },
    reviewedAt: "2026-11-03T03:00:00Z",
    validUntil: "2026-11-06T00:00:00Z",
    inventory: [...aggregates, ...s.supports].map((x) => ({
      sourceId: x.sourceId,
      artifactHash: x.artifactHash,
      disposition: "supports",
      reason: "Synthetic fixture reviewed for declared prerequisite.",
    })),
    verdicts: gates.map((gate) => ({
      gate,
      verdict: "accept",
      reason: "Synthetic review judgment only.",
      bindings: experimentReviewRequirements(packet.requirements, gate).map(
        (requirementId) => {
          const r = packet.requirements.find(
            (x) => x.requirementId === requirementId,
          )!;
          const sourceId = r.matchingSourceIds[0],
            source = s.supports.find((x) => x.sourceId === sourceId)!;
          return {
            requirementId,
            sourceId,
            artifactHash: source.artifactHash,
            locator: { lineStart: 1, lineEnd: 1 },
          };
        },
      ),
    })),
  };
  return { ...s, aggregates, policy, packet, receipt: raw };
}
