import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateExperimentDecision as evaluate } from "../scripts/enterprise-journeys/experiment-decision.mjs";
import { newcombeFamilyDifference95 as interval } from "../scripts/enterprise-journeys/experiment-statistics.mjs";
const cohort = "a".repeat(64);
const arm = (successes = 200, total = 1000) => ({
  assigned: total,
  exposed: total,
  joined: total,
  confirmedSuccess: successes,
  confirmedNonSuccess: total - successes,
  unresolved: 0,
  postAssignmentExcluded: 0,
  duplicateUnits: 0,
  crossoverUnits: 0,
});
function setup() {
  return {
    protocol: {
      mechanism: "independent-bernoulli",
      cohortDigest: cohort,
      treatmentProbability: { numerator: 1, denominator: 2 },
      srmThreshold: { numerator: 1, denominator: 1000 },
      metrics: [
        {
          metricId: "conversion",
          role: "primary",
          direction: "increase",
          margin: 0.05,
        },
        {
          metricId: "errors",
          role: "guardrail",
          direction: "decrease",
          margin: 0.05,
        },
      ],
    },
    facts: {
      designReviewed: true,
      preregistered: true,
      randomizationVerified: true,
      noInterference: true,
      metricFamilyReviewed: true,
      onePlannedAnalysis: true,
      sourceScopeVerified: true,
      populationComplete: true,
      outcomesMature: true,
      fixedHorizonCompleted: true,
      metricDefinitionsVerified: true,
      qualityReviewed: true,
      controlAssigned: 1000,
      treatmentAssigned: 1000,
    },
    observations: [
      {
        metricId: "conversion",
        cohortDigest: cohort,
        control: arm(),
        treatment: arm(400),
      },
      {
        metricId: "errors",
        cohortDigest: cohort,
        control: arm(100),
        treatment: arm(100),
      },
    ],
  };
}
const run = (s = setup()) => evaluate(s.protocol, s.facts, s.observations);
it("matches all 20 independently generated family interval reference cases", () => {
  const r = JSON.parse(
    readFileSync(
      new URL(
        "./fixtures/content-audit/experiment-numerical-reference.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const f of r.families) {
    const ci = interval(
      { successes: 20, total: 100 },
      { successes: 30, total: 100 },
      f.familySize,
    );
    expect(ci.lower).toBeCloseTo(f.lower, 13);
    expect(ci.upper).toBeCloseTo(f.upper, 13);
    expect(ci.perComparisonAlpha).toBe(0.05 / f.familySize);
  }
  expect(() =>
    interval({ successes: 1, total: 2 }, { successes: 1, total: 2 }, 21),
  ).toThrow();
});
it("supports complete criteria without granting causal or action authority", () => {
  const r = run();
  expect(r.decision).toBe("supports-preregistered-criteria");
  expect(r.metrics.map((m) => m.status)).toEqual([
    "practical-improvement-supported",
    "harm-margin-excluded",
  ]);
  expect(r.causalAcceptance).toBe(false);
  expect(r.actionAuthorized).toBe(false);
  expect(r.metrics[1].orientedInterval.lower).toBe(
    -r.metrics[1].interval.upper,
  );
});
it.each(Object.keys(setup().facts).filter((k) => !k.endsWith("Assigned")))(
  "blocks unproven %s",
  (gate) => {
    for (const v of [false, null]) {
      const s = setup();
      s.facts[gate] = v;
      const r = run(s);
      expect(r.decision).toBe("blocked");
      expect(r.blockers).toContain(`unproven-${gate}`);
      expect(r.metrics.every((m) => m.interval === null)).toBe(true);
    }
  },
);
it("does not narrow the family when a guardrail is absent", () => {
  const s = setup();
  s.observations.pop();
  const r = run(s);
  expect(r.decision).toBe("blocked");
  expect(r.multiplicity.familySize).toBe(2);
  expect(r.metrics).toHaveLength(2);
  expect(r.metrics[1].reasons).toContain("missing-metric-observation");
});
it("blocks same-sized different cohorts and changed denominators", () => {
  const s = setup();
  s.observations[1].cohortDigest = "b".repeat(64);
  expect(run(s).metrics[1].reasons).toContain("cohort-binding-mismatch");
  s.observations[1].cohortDigest = cohort;
  s.observations[1].treatment = arm(100, 999);
  expect(run(s).metrics[1].reasons).toContain(
    "treatment:assignment-denominator-mismatch",
  );
});
it("blocks unresolved outcomes while retaining all counts", () => {
  const s = setup();
  s.observations[0].treatment.unresolved = 1;
  s.observations[0].treatment.confirmedNonSuccess--;
  const r = run(s);
  expect(r.decision).toBe("blocked");
  expect(r.metrics[0].accounting.treatment.counts.assigned).toBe(1000);
});
it("reports SRM independently of favorable metric outcomes", () => {
  const s = setup();
  s.protocol.treatmentProbability = { numerator: 1, denominator: 4 };
  const r = run(s);
  expect(r.blockers).toContain("allocation-ratio-mismatch");
  expect(r.allocation.probability.numerator).toBeTruthy();
  expect(r.decision).toBe("blocked");
});
it("distinguishes practically insufficient from unresolved improvement", () => {
  const s = setup();
  s.protocol.metrics[0].margin = 0.3;
  expect(run(s).metrics[0].status).toBe(
    "detectable-improvement-practically-insufficient",
  );
  s.protocol.metrics[0].margin = 0.2;
  expect(run(s).metrics[0].status).toBe(
    "detectable-improvement-practical-margin-unresolved",
  );
});
it("keeps exact practical interval boundaries unresolved", () => {
  const s = setup(),
    ci = run(s).metrics[0].interval;
  for (const margin of [ci.lower, ci.upper]) {
    s.protocol.metrics[0].margin = margin;
    expect(run(s).metrics[0].status).toBe(
      "detectable-improvement-practical-margin-unresolved",
    );
  }
});
it("does not interpret an uncertain guardrail as safe", () => {
  const s = setup();
  s.protocol.metrics[1].margin = 0.0001;
  const r = run(s);
  expect(r.metrics[1].status).toBe("guardrail-safety-unresolved");
  expect(r.decision).toBe("insufficient-evidence");
});
it("detects harm with decreasing-is-better direction", () => {
  const s = setup();
  s.observations[1].treatment = arm(400);
  const r = run(s);
  expect(r.metrics[1].status).toBe("harm-margin-exceeded");
  expect(r.decision).toBe("adverse-evidence");
});
it("keeps guardrail equality unresolved", () => {
  const s = setup();
  const raw = run(s).metrics[1].interval;
  s.protocol.metrics[1].margin = raw.upper;
  expect(run(s).metrics[1].status).toBe("guardrail-safety-unresolved");
});
it("retains unsupported designs and population limits as blockers", () => {
  const s = setup();
  s.protocol.mechanism = "observational";
  expect(run(s).blockers).toContain("unsupported-assignment-mechanism");
  s.protocol.mechanism = "independent-bernoulli";
  s.facts.controlAssigned = 100000;
  expect(run(s).blockers).toContain("unsupported-population-size");
});
it("rejects extra metric IDs, duplicates, absent guardrails and malformed facts", () => {
  const s = setup();
  s.observations[1].metricId = "other";
  expect(() => run(s)).toThrow();
  s.observations[1].metricId = "conversion";
  expect(() => run(s)).toThrow();
  const t = setup();
  t.protocol.metrics.pop();
  expect(() => run(t)).toThrow();
  const u = setup();
  u.facts.designReviewed = "yes";
  expect(() => run(u)).toThrow();
});

it("retains evidence excluding practical improvement separately from adverse direction", () => {
  const s = setup();
  s.observations[0].treatment = arm(200);
  s.protocol.metrics[0].margin = 0.2;
  expect(run(s).metrics[0].status).toBe("practical-improvement-excluded");
  s.observations[0].treatment = arm(50);
  expect(run(s).metrics[0].status).toBe("adverse-direction-supported");
  expect(run(s).decision).toBe("adverse-evidence");
});
it("treats SRM threshold equality as a blocker using exact fractions", () => {
  const s = setup();
  s.facts.controlAssigned = 3;
  s.facts.treatmentAssigned = 1;
  s.protocol.srmThreshold = { numerator: 5, denominator: 8 };
  expect(run(s).blockers).toContain("allocation-ratio-mismatch");
  s.protocol.srmThreshold = { numerator: 624, denominator: 1000 };
  expect(run(s).blockers).not.toContain("allocation-ratio-mismatch");
});
it("keeps upper guardrail harm-boundary equality unresolved", () => {
  const s = setup();
  s.observations[1].treatment = arm(400);
  s.protocol.metrics[1].margin = run(s).metrics[1].interval.lower;
  expect(run(s).metrics[1].status).toBe("guardrail-safety-unresolved");
});
it("copies protocol and attested facts without mutating the caller", () => {
  const s = setup(),
    r = run(s);
  r.protocol.metrics[0].margin = 0.9;
  r.protocol.srmThreshold.numerator = 2;
  r.facts.preregistered = false;
  expect(s.protocol.metrics[0].margin).toBe(0.05);
  expect(s.protocol.srmThreshold.numerator).toBe(1);
  expect(s.facts.preregistered).toBe(true);
});
