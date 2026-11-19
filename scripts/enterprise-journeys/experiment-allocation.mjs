// Arithmetic diagnostic for a declared independent Bernoulli assignment only.
// This does not verify the mechanism or establish absence of allocation bias.
function shape(v, keys) {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Reflect.ownKeys(v).length !== keys.length ||
    !keys.every((k) => Object.hasOwn(v, k))
  )
    throw Error("Invalid allocation shape");
}
export function bernoulliAllocationExact(input) {
  shape(input, [
    "mechanism",
    "controlAssigned",
    "treatmentAssigned",
    "treatmentProbability",
  ]);
  const {
    mechanism,
    controlAssigned: c,
    treatmentAssigned: k,
    treatmentProbability: p,
  } = input;
  shape(p, ["numerator", "denominator"]);
  const { numerator: a, denominator: b } = p,
    n = c + k;
  if (
    mechanism !== "independent-bernoulli" ||
    !Number.isSafeInteger(c) ||
    !Number.isSafeInteger(k) ||
    c < 0 ||
    k < 0 ||
    n < 1 ||
    n > 10000 ||
    !Number.isSafeInteger(a) ||
    !Number.isSafeInteger(b) ||
    a < 1 ||
    a >= b ||
    b > 1000
  )
    throw Error("Unsupported or invalid Bernoulli allocation");
  const success = BigInt(a),
    failure = BigInt(b - a);
  let combinations = 1n;
  for (let j = 1; j <= Math.min(k, n - k); j++)
    combinations =
      (combinations * BigInt(n - Math.min(k, n - k) + j)) / BigInt(j);
  const observed =
    combinations * success ** BigInt(k) * failure ** BigInt(n - k);
  let weight = failure ** BigInt(n),
    numerator = 0n;
  for (let x = 0; x <= n; x++) {
    if (weight <= observed) numerator += weight;
    if (x < n)
      weight = (weight * BigInt(n - x) * success) / (BigInt(x + 1) * failure);
  }
  return {
    method: "bernoulli-allocation-two-sided-probability-ordering-v1",
    mechanism,
    controlAssigned: c,
    treatmentAssigned: k,
    treatmentProbability: { numerator: a, denominator: b },
    probability: {
      numerator: numerator.toString(),
      denominator: (BigInt(b) ** BigInt(n)).toString(),
    },
  };
}
