import { expect, it } from "vitest";
import {
  fisherExactBinary,
  wilsonBinary95,
} from "../scripts/enterprise-journeys/experiment-statistics.mjs";
const arm = (successes: number, total: number) => ({ successes, total });
const fraction = (r: ReturnType<typeof fisherExactBinary>) =>
  Number(r.probability.numerator) / Number(r.probability.denominator);
it("matches the published SciPy probability-ordered two-sided example", () => {
  const r = fisherExactBinary(arm(6, 8), arm(1, 5));
  expect(fraction(r)).toBeCloseTo(0.10256410256410256, 14);
  expect(r.absoluteRiskDifference).toBeCloseTo(-0.55, 14);
  expect(r.method).toBe("fisher-two-sided-probability-ordering-v1");
  expect(Object.keys(r).sort()).toEqual([
    "absoluteRiskDifference",
    "control",
    "method",
    "probability",
    "treatment",
  ]);
});
it("counts probability ties and degenerate fixed margins", () => {
  expect(fraction(fisherExactBinary(arm(0, 1), arm(1, 1)))).toBe(1);
  expect(fraction(fisherExactBinary(arm(0, 20), arm(0, 30)))).toBe(1);
  expect(fraction(fisherExactBinary(arm(20, 20), arm(30, 30)))).toBe(1);
  expect(fraction(fisherExactBinary(arm(10, 20), arm(10, 20)))).toBe(1);
});
it("matches independent exhaustive assignment enumeration for small populations", () => {
  // Enumerate individual assignments rather than using hypergeometric recurrence.
  for (let n0 = 1; n0 <= 5; n0++)
    for (let n1 = 1; n1 <= 5; n1++) {
      const total = n0 + n1;
      const buckets = new Map<number, Map<number, number>>();
      for (let mask = 0; mask < 2 ** total; mask++) {
        let successes = 0,
          control = 0;
        for (let bit = 0; bit < total; bit++)
          if (mask & (1 << bit)) {
            successes++;
            if (bit < n0) control++;
          }
        const bucket = buckets.get(successes) ?? new Map<number, number>();
        bucket.set(control, (bucket.get(control) ?? 0) + 1);
        buckets.set(successes, bucket);
      }
      for (let a = 0; a <= n0; a++)
        for (let b = 0; b <= n1; b++) {
          const bucket = buckets.get(a + b)!;
          const observed = bucket.get(a)!;
          const denominator = [...bucket.values()].reduce((x, y) => x + y, 0);
          const numerator = [...bucket.values()]
            .filter((x) => x <= observed)
            .reduce((x, y) => x + y, 0);
          const r = fisherExactBinary(arm(a, n0), arm(b, n1));
          expect(BigInt(r.probability.numerator) * BigInt(denominator)).toBe(
            BigInt(numerator) * BigInt(r.probability.denominator),
          );
          expect(fraction(fisherExactBinary(arm(b, n1), arm(a, n0)))).toBe(
            fraction(r),
          );
          expect(
            fraction(fisherExactBinary(arm(n0 - a, n0), arm(n1 - b, n1))),
          ).toBe(fraction(r));
        }
    }
});
it("retains a positive exact probability far below floating point range", () => {
  const r = fisherExactBinary(arm(0, 5000), arm(5000, 5000));
  expect(r.probability.numerator).toBe("2");
  expect(r.probability.denominator.length).toBeGreaterThan(2900);
  expect(r.absoluteRiskDifference).toBe(1);
  expect(() => JSON.stringify(r)).not.toThrow();
});
it("supports the maximum total on a wide balanced table", () => {
  const r = fisherExactBinary(arm(2500, 5000), arm(2500, 5000));
  expect(r.probability.numerator).toBe(r.probability.denominator);
});
it.each([
  arm(-1, 2),
  arm(3, 2),
  arm(0, 0),
  arm(1.5, 2),
  arm(1, Infinity),
  { successes: "1", total: 2 },
  { successes: true, total: 2 },
  { successes: null, total: 2 },
  { successes: 1, total: 2, verdict: "pass" },
  null,
  [],
  Object.create({ successes: 1, total: 2 }),
  arm(1, 10001),
])("rejects invalid arm input %#", (bad) => {
  expect(() => fisherExactBinary(bad, arm(1, 2))).toThrow();
  expect(() => fisherExactBinary(arm(1, 2), bad)).toThrow();
  expect(() => wilsonBinary95(bad)).toThrow();
});
it("rejects combined populations above the bounded method", () => {
  expect(() => fisherExactBinary(arm(1, 5001), arm(1, 5000))).toThrow();
});
it("matches Wilson score reference arithmetic and retains boundary uncertainty", () => {
  const r = wilsonBinary95(arm(26, 200));
  expect(r.method).toBe("wilson-score-marginal-95-v1");
  expect(r.lower).toBeCloseTo(0.090281, 5);
  expect(r.upper).toBeCloseTo(0.183665, 5);
  expect(r.confidenceLevel).toBe(0.95);
  const zero = wilsonBinary95(arm(0, 10));
  const one = wilsonBinary95(arm(10, 10));
  expect(zero.lower).toBe(0);
  expect(zero.upper).toBeCloseTo(0.2775327998628892, 14);
  expect(one.upper).toBe(1);
  expect(one.lower).toBeCloseTo(1 - zero.upper, 14);
});
