import { expect, it } from "vitest";
import { reconcileExperimentArm } from "../scripts/enterprise-journeys/experiment-accounting.mjs";
const complete = () => ({
  assigned: 100,
  exposed: 80,
  joined: 100,
  confirmedSuccess: 20,
  confirmedNonSuccess: 80,
  unresolved: 0,
  postAssignmentExcluded: 0,
  duplicateUnits: 0,
  crossoverUnits: 0,
});
it("retains unexposed assigned units in the full ITT denominator", () => {
  const r = reconcileExperimentArm(complete());
  expect(r.accountingEligible).toBe(true);
  expect(r.binaryArm).toEqual({ successes: 20, total: 100 });
  expect(r.counts.exposed).toBe(80);
  expect(r.causalAcceptance).toBe(false);
});
it("does not silently remove unresolved outcomes or convert them into failure", () => {
  const r = reconcileExperimentArm({
    ...complete(),
    confirmedNonSuccess: 60,
    unresolved: 20,
  });
  expect(r.accountingEligible).toBe(false);
  expect(r.binaryArm).toBeNull();
  expect(r.reasons).toContain("unresolved-outcomes");
  expect(r.counts.assigned).toBe(100);
});
it("retains contradictory partitions as diagnostics", () => {
  const r = reconcileExperimentArm({ ...complete(), confirmedNonSuccess: 90 });
  expect(r.reasons).toContain("outcome-partition-mismatch");
  expect(r.binaryArm).toBeNull();
});
it("does not treat process counts as mutually exclusive outcomes", () => {
  expect(reconcileExperimentArm(complete()).reasons).toEqual([]);
  expect(
    reconcileExperimentArm({ ...complete(), exposed: 0 }).accountingEligible,
  ).toBe(true);
});
it.each(["postAssignmentExcluded", "duplicateUnits", "crossoverUnits"])(
  "blocks known %s without dropping original counts",
  (key) => {
    const r = reconcileExperimentArm({ ...complete(), [key]: 1 });
    expect(r.accountingEligible).toBe(false);
    expect(r.counts[key]).toBe(1);
    expect(r.binaryArm).toBeNull();
  },
);
it.each(Object.keys(complete()))(
  "treats missing %s as unknown rather than zero",
  (key) => {
    const r = reconcileExperimentArm({ ...complete(), [key]: null });
    expect(r.accountingEligible).toBe(false);
    expect(r.reasons).toContain(`missing-${key}`);
    expect(r.binaryArm).toBeNull();
  },
);
it("requires every assigned unit to have an outcome join", () => {
  const r = reconcileExperimentArm({ ...complete(), joined: 90 });
  expect(r.reasons).toContain("incomplete-outcome-join");
});
it("does not invent a conversion rate for an empty arm", () => {
  const r = reconcileExperimentArm(
    Object.fromEntries(Object.keys(complete()).map((k) => [k, 0])),
  );
  expect(r.reasons).toContain("empty-assigned-population");
  expect(r.binaryArm).toBeNull();
});
it("retains all independently detectable contradictions", () => {
  const r = reconcileExperimentArm({
    ...complete(),
    exposed: 101,
    joined: 102,
    confirmedSuccess: 110,
    unresolved: 5,
  });
  expect(r.reasons).toEqual(
    expect.arrayContaining([
      "exposed-exceeds-assigned",
      "joined-exceeds-assigned",
      "confirmedSuccess-exceeds-assigned",
      "outcome-partition-mismatch",
      "unresolved-outcomes",
    ]),
  );
});
it.each([-1, 1.5, Infinity, NaN, "0", false, undefined, 1000000000001])(
  "rejects malformed count %#",
  (bad) => {
    expect(() =>
      reconcileExperimentArm({ ...complete(), assigned: bad }),
    ).toThrow();
  },
);
it("rejects missing or additional fields and does not mutate input", () => {
  expect(() =>
    reconcileExperimentArm({ ...complete(), authorization: true }),
  ).toThrow();
  const c = complete();
  delete c.exposed;
  expect(() => reconcileExperimentArm(c)).toThrow();
  const frozen = Object.freeze(complete());
  const r = reconcileExperimentArm(frozen);
  r.counts.assigned = 1;
  expect(frozen.assigned).toBe(100);
});
