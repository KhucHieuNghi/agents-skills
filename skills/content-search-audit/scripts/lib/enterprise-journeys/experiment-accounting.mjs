// Internal count reconciliation. Counts are attributed, not authenticated.
// Passing this check alone does not establish valid experimental inference.
const fields = [
  "assigned",
  "exposed",
  "joined",
  "confirmedSuccess",
  "confirmedNonSuccess",
  "unresolved",
  "postAssignmentExcluded",
  "duplicateUnits",
  "crossoverUnits",
];
export function reconcileExperimentArm(input) {
  if (
    !input ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Reflect.ownKeys(input).length !== fields.length ||
    !fields.every((k) => Object.hasOwn(input, k))
  )
    throw Error("Invalid experiment accounting shape");
  const counts = {};
  for (const field of fields) {
    const value = input[field];
    if (
      value !== null &&
      (!Number.isSafeInteger(value) || value < 0 || value > 1000000000000)
    )
      throw Error("Invalid experiment accounting count");
    counts[field] = value;
  }
  const reasons = fields
    .filter((k) => counts[k] === null)
    .map((k) => `missing-${k}`);
  const assigned = counts.assigned;
  if (assigned !== null) {
    if (assigned === 0) reasons.push("empty-assigned-population");
    for (const field of fields.filter((k) => k !== "assigned"))
      if (counts[field] !== null && counts[field] > assigned)
        reasons.push(`${field}-exceeds-assigned`);
    if (
      ["confirmedSuccess", "confirmedNonSuccess", "unresolved"].every(
        (k) => counts[k] !== null,
      ) &&
      counts.confirmedSuccess +
        counts.confirmedNonSuccess +
        counts.unresolved !==
        assigned
    )
      reasons.push("outcome-partition-mismatch");
    if (counts.joined !== null && counts.joined < assigned)
      reasons.push("incomplete-outcome-join");
  }
  if (counts.unresolved > 0) reasons.push("unresolved-outcomes");
  if (counts.postAssignmentExcluded > 0)
    reasons.push("post-assignment-exclusions");
  if (counts.duplicateUnits > 0) reasons.push("duplicate-assignment-units");
  if (counts.crossoverUnits > 0) reasons.push("crossover-assignment-units");
  return {
    namespace: "experiment-arm-accounting-v1",
    counts,
    reasons,
    accountingEligible: reasons.length === 0,
    binaryArm:
      reasons.length === 0
        ? { successes: counts.confirmedSuccess, total: assigned }
        : null,
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
  };
}
