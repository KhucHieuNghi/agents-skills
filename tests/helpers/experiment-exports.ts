import { createHash } from "node:crypto";
import { enterpriseDigest as digest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const arm = (s = 10) => ({
  assigned: 100,
  exposed: 100,
  joined: 100,
  confirmedSuccess: s,
  confirmedNonSuccess: 100 - s,
  unresolved: 0,
  postAssignmentExcluded: 0,
  duplicateUnits: 0,
  crossoverUnits: 0,
});
export function setup() {
  const scope = {
    customerId: "customer",
    entityId: "site",
    environment: "sandbox",
    experimentId: "trial",
  };
  const assignment = {
    unit: "user",
    identityRule: "stable account",
    bucketingRule: "independent Bernoulli",
    exclusionRule: "none after assignment",
  };
  const population = {
    eligibilityRule: "all eligible accounts",
    device: "all",
    market: "VN",
    segmentId: "all",
    cohortId: "november",
  };
  const enrollment = {
    from: "2026-11-01T00:00:00Z",
    to: "2026-11-02T00:00:00Z",
  };
  const cohortDigest = digest({ scope, assignment, population, enrollment });
  const protocol = {
    decision: {
      mechanism: "independent-bernoulli",
      cohortDigest,
      treatmentProbability: { numerator: 1, denominator: 2 },
      srmThreshold: { numerator: 1, denominator: 1000 },
      metrics: [
        {
          metricId: "conversion",
          role: "primary",
          direction: "increase",
          margin: 0.01,
        },
        {
          metricId: "harm",
          role: "guardrail",
          direction: "decrease",
          margin: 0.05,
        },
      ],
    },
    registration: {
      registeredAt: "2026-10-30T00:00:00Z",
      locator: "registry:trial",
      artifactHash: "a".repeat(64),
    },
    assignment,
    population,
    enrollment,
    metrics: ["conversion", "harm"].map((metricId) => ({
      metricId,
      outcomeRule: "confirmed outcome",
      nonSuccessRule: "complete observation without outcome",
      observationHorizonSeconds: 86400,
      businessDictionaryDigest: "b".repeat(64),
      dictionaryVersion: "1",
      sourceSystem: "business-system",
      outcomeId: metricId,
    })),
    stopping: { rule: "fixed-horizon", plannedAnalyses: 1 },
    synthetic: true,
  };
  const context = {
    scope,
    protocol,
    protocolDigest: digest(protocol),
    assessmentAt: "2026-11-04T00:00:00Z",
    maxAgeSeconds: 604800,
    ingestionLagSeconds: 3600,
  };
  const raw = {
    schemaVersion: 1,
    scope,
    protocolDigest: context.protocolDigest,
    cohortDigest,
    enrollment,
    synthetic: true,
    dataCompleteThrough: "2026-11-03T00:00:00Z",
    provenance: {
      actor: "fixture",
      locator: "export:one",
      sourceSystem: "business-system",
      queryDigest: "c".repeat(64),
      method: "export",
    },
    quality: {
      complete: true,
      sampled: false,
      thresholded: false,
      modeled: false,
      precision: "exact",
    },
    assignmentCounts: { controlAssigned: 100, treatmentAssigned: 100 },
    metrics: ["conversion", "harm"].map((metricId) => ({
      metricId,
      cohortDigest,
      control: arm(),
      treatment: arm(),
    })),
  };
  return { context, raw };
}
export const encode = (
  raw,
  sourceId = "one",
  capturedAt = "2026-11-03T01:00:00Z",
) => {
  const artifactText = JSON.stringify(raw);
  return {
    sourceId,
    sourceKind: "experiment-aggregate-v1",
    capturedAt,
    artifactText,
    artifactHash: hash(artifactText),
  };
};
