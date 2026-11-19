import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  newcombeDifference95,
  fisherExactBinary,
} from "../scripts/enterprise-journeys/experiment-statistics.mjs";
import { bernoulliAllocationExact } from "../scripts/enterprise-journeys/experiment-allocation.mjs";
const allocation = (c = 50, t = 50, a = 1, b = 2) => ({
  mechanism: "independent-bernoulli",
  controlAssigned: c,
  treatmentAssigned: t,
  treatmentProbability: { numerator: a, denominator: b },
});
const arm = (successes: number, total: number) => ({ successes, total });
const value = (r: ReturnType<typeof bernoulliAllocationExact>) =>
  Number(r.probability.numerator) / Number(r.probability.denominator);
it("matches separately generated SciPy and statsmodels reference values", () => {
  const reference = JSON.parse(
    readFileSync(
      new URL(
        "./fixtures/content-audit/experiment-numerical-reference.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const c of reference.allocation)
    expect(
      value(
        bernoulliAllocationExact(allocation(c.control, c.treatment, c.a, c.b)),
      ),
    ).toBeCloseTo(c.pvalue, 13);
  for (const c of reference.differences) {
    const r = newcombeDifference95(c.control, c.treatment);
    expect(r.lower).toBeCloseTo(c.lower, 13);
    expect(r.upper).toBeCloseTo(c.upper, 13);
  }
});
it("matches independent weighted individual-assignment enumeration", () => {
  for (let n = 1; n <= 8; n++)
    for (const [a, b] of [
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 5],
    ]) {
      const weights = Array<bigint>(n + 1).fill(0n);
      for (let mask = 0; mask < 2 ** n; mask++) {
        let k = 0,
          w = 1n;
        for (let bit = 0; bit < n; bit++) {
          const treated = !!(mask & (1 << bit));
          if (treated) k++;
          w *= BigInt(treated ? a : b - a);
        }
        weights[k] += w;
      }
      for (let k = 0; k <= n; k++) {
        const r = bernoulliAllocationExact(allocation(n - k, k, a, b));
        expect(BigInt(r.probability.numerator)).toBe(
          weights.filter((w) => w <= weights[k]).reduce((x, y) => x + y, 0n),
        );
        expect(BigInt(r.probability.denominator)).toBe(BigInt(b) ** BigInt(n));
      }
    }
});
it("retains extreme positive probability and handles empty individual arms", () => {
  const r = bernoulliAllocationExact(allocation(0, 10000));
  expect(r.probability.numerator).toBe("2");
  expect(r.probability.denominator.length).toBeGreaterThan(3000);
  expect(value(bernoulliAllocationExact(allocation(1, 0)))).toBe(1);
});
it("supports the bounded largest rational denominator", () => {
  const r = bernoulliAllocationExact(allocation(10000, 0, 1, 1000));
  expect(BigInt(r.probability.numerator)).toBeGreaterThan(0n);
  expect(r.probability.denominator.length).toBe(30001);
});
it("does not confuse unequal planned allocation with SRM", () => {
  expect(value(bernoulliAllocationExact(allocation(75, 25, 1, 4)))).toBe(1);
  expect(value(bernoulliAllocationExact(allocation(75, 25)))).toBeLessThan(
    0.00001,
  );
});
it.each([
  allocation(0, 0),
  allocation(-1, 2),
  allocation(1.5, 2),
  allocation(1, 10000),
  allocation(1, 2, 0, 2),
  allocation(1, 2, 2, 2),
  allocation(1, 2, 1, 1001),
  allocation(1, 2, 0.5, 2),
  { ...allocation(), mechanism: "fixed-quota" },
  { ...allocation(), extra: true },
  { ...allocation(), treatmentProbability: 0.5 },
])("rejects unsupported or malformed allocation %#", (v) =>
  expect(() => bernoulliAllocationExact(v)).toThrow(),
);
it("difference intervals retain uncertainty and mirror arm order", () => {
  for (const [a, b] of [
    [arm(0, 10), arm(0, 10)],
    [arm(10, 10), arm(10, 10)],
    [arm(0, 10), arm(10, 10)],
    [arm(6, 8), arm(1, 5)],
  ]) {
    const r = newcombeDifference95(a, b),
      s = newcombeDifference95(b, a);
    expect(r.lower).toBeGreaterThanOrEqual(-1);
    expect(r.upper).toBeLessThanOrEqual(1);
    expect(r.lower).toBeLessThan(r.upper);
    expect(r.lower).toBeCloseTo(-s.upper, 14);
    expect(r.upper).toBeCloseTo(-s.lower, 14);
    expect(r.method).toBe("newcombe-wilson-difference-marginal-95-v1");
    expect(r.coverage).toBe("approximate-marginal");
  }
});
it("rejects invalid or unsupported difference populations", () => {
  expect(() => newcombeDifference95(arm(0, 0), arm(1, 10))).toThrow();
  expect(() => newcombeDifference95(arm(1, 5001), arm(1, 5000))).toThrow();
});

it("preserves differing interval and conditional-test evidence without a shared verdict", () => {
  const control = arm(6, 8),
    treatment = arm(1, 5);
  const ci = newcombeDifference95(control, treatment);
  const fisher = fisherExactBinary(control, treatment);
  expect(ci.upper).toBeLessThan(0);
  expect(
    Number(fisher.probability.numerator) /
      Number(fisher.probability.denominator),
  ).toBeGreaterThan(0.05);
  expect(ci).not.toHaveProperty("significant");
  expect(fisher).not.toHaveProperty("significant");
});
