// Internal arithmetic only: no assignment, provenance, design or causal validation.
// The experiment adapter must establish those separately before interpretation.
const MAX_TOTAL = 10000;
function validateArm(arm) {
  if (
    !arm ||
    Object.getPrototypeOf(arm) !== Object.prototype ||
    Reflect.ownKeys(arm).length !== 2 ||
    !Object.hasOwn(arm, "successes") ||
    !Object.hasOwn(arm, "total") ||
    !Number.isSafeInteger(arm.total) ||
    arm.total < 1 ||
    arm.total > MAX_TOTAL ||
    !Number.isSafeInteger(arm.successes) ||
    arm.successes < 0 ||
    arm.successes > arm.total
  )
    throw Error("Invalid bounded binary experiment arm");
}
function choose(n, k) {
  k = Math.min(k, n - k);
  let result = 1n;
  for (let i = 1; i <= k; i++)
    result = (result * BigInt(n - k + i)) / BigInt(i);
  return result;
}
export function fisherExactBinary(control, treatment) {
  validateArm(control);
  validateArm(treatment);
  const n0 = control.total,
    n1 = treatment.total,
    n = n0 + n1;
  if (n > MAX_TOTAL)
    throw Error("Binary experiment population exceeds supported bound");
  const successes = control.successes + treatment.successes;
  const min = Math.max(0, successes - n1),
    max = Math.min(n0, successes);
  const observed =
    choose(n0, control.successes) * choose(n1, treatment.successes);
  let weight = choose(n0, min) * choose(n1, successes - min);
  let numerator = 0n;
  for (let x = min; x <= max; x++) {
    // The shared denominator cancels. Include every tied table exactly.
    if (weight <= observed) numerator += weight;
    if (x < max)
      weight =
        (weight * BigInt(n0 - x) * BigInt(successes - x)) /
        (BigInt(x + 1) * BigInt(n1 - successes + x + 1));
  }
  const controlRate = control.successes / n0,
    treatmentRate = treatment.successes / n1;
  return {
    method: "fisher-two-sided-probability-ordering-v1",
    probability: {
      numerator: numerator.toString(),
      denominator: choose(n, successes).toString(),
    },
    control: { successes: control.successes, total: n0, rate: controlRate },
    treatment: {
      successes: treatment.successes,
      total: n1,
      rate: treatmentRate,
    },
    absoluteRiskDifference: treatmentRate - controlRate,
  };
}
export function wilsonBinary95(arm) {
  validateArm(arm);
  const n = arm.total,
    p = arm.successes / n;
  // Standard-normal 0.975 quantile. This is approximate marginal coverage,
  // not an exact interval, difference interval or multiplicity adjustment.
  const z = 1.959963984540054,
    z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const halfWidth =
    (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  return {
    method: "wilson-score-marginal-95-v1",
    confidenceLevel: 0.95,
    successes: arm.successes,
    total: n,
    rate: p,
    lower: arm.successes === 0 ? 0 : Math.max(0, center - halfWidth),
    upper: arm.successes === n ? 1 : Math.min(1, center + halfWidth),
  };
}

// Newcombe hybrid Wilson score difference, without continuity correction.
// Independent binomial samples; approximate marginal coverage, no verdict.
export function newcombeDifference95(control, treatment) {
  const c = wilsonBinary95(control),
    t = wilsonBinary95(treatment);
  if (control.total + treatment.total > MAX_TOTAL)
    throw Error("Binary experiment population exceeds supported bound");
  const difference = t.rate - c.rate;
  return {
    method: "newcombe-wilson-difference-marginal-95-v1",
    confidenceLevel: 0.95,
    coverage: "approximate-marginal",
    absoluteRiskDifference: difference,
    lower: Math.max(
      -1,
      difference - Math.hypot(t.rate - t.lower, c.upper - c.rate),
    ),
    upper: Math.min(
      1,
      difference + Math.hypot(t.upper - t.rate, c.rate - c.lower),
    ),
    control: { successes: c.successes, total: c.total, rate: c.rate },
    treatment: { successes: t.successes, total: t.total, rate: t.rate },
  };
}
