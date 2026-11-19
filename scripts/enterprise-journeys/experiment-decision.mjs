// Internal predicates over reviewed facts, not an evidence importer or authority.
import { reconcileExperimentArm } from "./experiment-accounting.mjs";
import { bernoulliAllocationExact } from "./experiment-allocation.mjs";
import {
  newcombeFamilyDifference95,
  fisherExactBinary,
} from "./experiment-statistics.mjs";
export const EXPERIMENT_REVIEW_GATES = Object.freeze([
  "designReviewed",
  "preregistered",
  "randomizationVerified",
  "noInterference",
  "metricFamilyReviewed",
  "onePlannedAnalysis",
  "sourceScopeVerified",
  "populationComplete",
  "outcomesMature",
  "fixedHorizonCompleted",
  "metricDefinitionsVerified",
  "qualityReviewed",
]);
const gates = EXPERIMENT_REVIEW_GATES;
const assert = (v) => {
  if (!v) throw Error("Invalid experiment decision input");
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Reflect.ownKeys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
  );
const rational = (v) => {
  shape(v, ["numerator", "denominator"]);
  assert(
    Number.isSafeInteger(v.numerator) &&
      Number.isSafeInteger(v.denominator) &&
      v.numerator > 0 &&
      v.numerator < v.denominator &&
      v.denominator <= 1000000,
  );
};
const count = (v) =>
  assert(
    v === null || (Number.isSafeInteger(v) && v >= 0 && v <= 1000000000000),
  );
export function evaluateExperimentDecision(protocol, facts, observations) {
  shape(protocol, [
    "mechanism",
    "treatmentProbability",
    "srmThreshold",
    "cohortDigest",
    "metrics",
  ]);
  assert(
    [
      "independent-bernoulli",
      "fixed-quota",
      "blocked",
      "stratified",
      "adaptive",
      "observational",
      "unknown",
    ].includes(protocol.mechanism),
  );
  assert(
    typeof protocol.cohortDigest === "string" &&
      /^[a-f0-9]{64}$/.test(protocol.cohortDigest),
  );
  rational(protocol.treatmentProbability);
  rational(protocol.srmThreshold);
  assert(protocol.treatmentProbability.denominator <= 1000);
  assert(
    Array.isArray(protocol.metrics) &&
      protocol.metrics.length >= 2 &&
      protocol.metrics.length <= 20,
  );
  const ids = new Set();
  for (const m of protocol.metrics) {
    shape(m, ["metricId", "role", "direction", "margin"]);
    assert(
      typeof m.metricId === "string" &&
        /^[a-zA-Z0-9._:-]{1,128}$/.test(m.metricId) &&
        !ids.has(m.metricId),
    );
    ids.add(m.metricId);
    assert(
      ["primary", "guardrail"].includes(m.role) &&
        ["increase", "decrease"].includes(m.direction),
    );
    assert(
      typeof m.margin === "number" &&
        Number.isFinite(m.margin) &&
        m.margin > 0 &&
        m.margin < 1,
    );
  }
  assert(protocol.metrics.filter((m) => m.role === "primary").length === 1);
  shape(facts, [...gates, "controlAssigned", "treatmentAssigned"]);
  for (const gate of gates) assert([true, false, null].includes(facts[gate]));
  count(facts.controlAssigned);
  count(facts.treatmentAssigned);
  assert(
    Array.isArray(observations) &&
      observations.length <= protocol.metrics.length,
  );
  const byId = new Map();
  for (const observation of observations) {
    shape(observation, ["metricId", "cohortDigest", "control", "treatment"]);
    assert(ids.has(observation.metricId) && !byId.has(observation.metricId));
    assert(
      typeof observation.cohortDigest === "string" &&
        /^[a-f0-9]{64}$/.test(observation.cohortDigest),
    );
    byId.set(observation.metricId, {
      cohortDigest: observation.cohortDigest,
      control: reconcileExperimentArm(observation.control),
      treatment: reconcileExperimentArm(observation.treatment),
    });
  }
  const blockers = gates
    .filter((g) => facts[g] !== true)
    .map((g) => `unproven-${g}`);
  if (protocol.mechanism !== "independent-bernoulli")
    blockers.push("unsupported-assignment-mechanism");
  const assignedKnown =
    facts.controlAssigned !== null && facts.treatmentAssigned !== null;
  const total = assignedKnown
    ? facts.controlAssigned + facts.treatmentAssigned
    : null;
  if (!assignedKnown) blockers.push("missing-assignment-counts");
  else if (total === 0) blockers.push("empty-assigned-population");
  else if (total > 10000) blockers.push("unsupported-population-size");
  let allocation = null;
  if (
    assignedKnown &&
    total > 0 &&
    total <= 10000 &&
    protocol.mechanism === "independent-bernoulli"
  ) {
    allocation = bernoulliAllocationExact({
      mechanism: protocol.mechanism,
      controlAssigned: facts.controlAssigned,
      treatmentAssigned: facts.treatmentAssigned,
      treatmentProbability: protocol.treatmentProbability,
    });
    const p = allocation.probability,
      t = protocol.srmThreshold;
    if (
      BigInt(p.numerator) * BigInt(t.denominator) <=
      BigInt(p.denominator) * BigInt(t.numerator)
    )
      blockers.push("allocation-ratio-mismatch");
  }
  const prepared = protocol.metrics.map((m) => {
    const accounting = byId.get(m.metricId) ?? null,
      reasons = [];
    if (!accounting) reasons.push("missing-metric-observation");
    else if (accounting.cohortDigest !== protocol.cohortDigest)
      reasons.push("cohort-binding-mismatch");
    if (accounting)
      for (const arm of ["control", "treatment"]) {
        reasons.push(...accounting[arm].reasons.map((r) => `${arm}:${r}`));
        const original = facts[`${arm}Assigned`],
          assigned = accounting[arm].counts.assigned;
        if (original !== null && assigned !== null && original !== assigned)
          reasons.push(`${arm}:assignment-denominator-mismatch`);
      }
    if (reasons.length) blockers.push(`metric-ineligible:${m.metricId}`);
    return { definition: { ...m }, accounting, reasons };
  });
  const eligible = blockers.length === 0;
  const metrics = prepared.map((item) => {
    let interval = null,
      fisher = null,
      orientedInterval = null,
      status = "blocked";
    if (eligible) {
      const { control, treatment } = item.accounting;
      interval = newcombeFamilyDifference95(
        control.binaryArm,
        treatment.binaryArm,
        protocol.metrics.length,
      );
      fisher = fisherExactBinary(control.binaryArm, treatment.binaryArm);
      const m = item.definition;
      orientedInterval =
        m.direction === "increase"
          ? { lower: interval.lower, upper: interval.upper }
          : { lower: -interval.upper, upper: -interval.lower };
      const { lower, upper } = orientedInterval;
      if (m.role === "primary")
        status =
          lower > m.margin
            ? "practical-improvement-supported"
            : lower > 0
              ? upper < m.margin
                ? "detectable-improvement-practically-insufficient"
                : "detectable-improvement-practical-margin-unresolved"
              : upper < 0
                ? "adverse-direction-supported"
                : upper < m.margin
                  ? "practical-improvement-excluded"
                  : "inconclusive";
      else
        status =
          lower > -m.margin
            ? "harm-margin-excluded"
            : upper < -m.margin
              ? "harm-margin-exceeded"
              : "guardrail-safety-unresolved";
    }
    return { ...item, interval, fisher, orientedInterval, status };
  });
  let decision = "blocked";
  if (eligible) {
    if (
      metrics.some((m) =>
        ["adverse-direction-supported", "harm-margin-exceeded"].includes(
          m.status,
        ),
      )
    )
      decision = "adverse-evidence";
    else if (
      metrics.every((m) =>
        ["practical-improvement-supported", "harm-margin-excluded"].includes(
          m.status,
        ),
      )
    )
      decision = "supports-preregistered-criteria";
    else decision = "insufficient-evidence";
  }
  return {
    namespace: "experiment-decision-v1",
    protocol: {
      ...protocol,
      treatmentProbability: { ...protocol.treatmentProbability },
      srmThreshold: { ...protocol.srmThreshold },
      metrics: protocol.metrics.map((m) => ({ ...m })),
    },
    facts: { ...facts },
    decision,
    blockers,
    allocation,
    metrics,
    multiplicity: {
      method: "bonferroni-newcombe-approximate",
      familySize: protocol.metrics.length,
      nominalFamilyConfidenceLevel: 0.95,
    },
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
  };
}
