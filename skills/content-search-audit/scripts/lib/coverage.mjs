const states = new Set([
  "pending",
  "audited",
  "failed",
  "blocked",
  "unsupported",
  "excluded",
]);
const statuses = new Set(["pass", "fail", "unknown", "not-applicable"]);
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
/** Coverage of the declared inventory/check plan only. The artifact validator
 * must separately resolve evidence IDs and verify rule-plan completeness. */
export function computeCoverage(inventory, checks, run) {
  if (!Array.isArray(inventory) || !Array.isArray(checks))
    throw new Error("Invalid coverage inputs");
  if (
    !run ||
    typeof run.inventoryComplete !== "boolean" ||
    !["full", "sample"].includes(run.mode) ||
    !Array.isArray(run.pendingQueue)
  )
    throw new Error("Invalid coverage scope");
  const items = new Map();
  for (const item of inventory) {
    if (!item || !nonempty(item.itemId) || !states.has(item.state))
      throw new Error("Invalid inventory state");
    if (items.has(item.itemId)) throw new Error("Duplicate inventory item");
    if (
      !Array.isArray(item.requiredRuleIds) ||
      item.requiredRuleIds.some((id) => !nonempty(id)) ||
      new Set(item.requiredRuleIds).size !== item.requiredRuleIds.length ||
      (item.state !== "excluded" && !item.requiredRuleIds.length)
    )
      throw new Error("Invalid required rule plan");
    if (
      ["excluded", "blocked", "failed", "unsupported"].includes(item.state) &&
      !nonempty(item.reason)
    )
      throw new Error("Missing inventory state reason");
    items.set(item.itemId, item);
  }
  const byItem = new Map();
  const dimensions = Object.create(null);
  for (const check of checks) {
    if (!check || !items.has(check.itemId))
      throw new Error("Check references unknown item");
    if (
      !nonempty(check.ruleId) ||
      !nonempty(check.dimension) ||
      !statuses.has(check.status)
    )
      throw new Error("Invalid check status or identity");
    if (!nonempty(check.reason)) throw new Error("Check requires a reason");
    if (
      !Array.isArray(check.evidenceIds) ||
      check.evidenceIds.some((id) => !nonempty(id)) ||
      (["pass", "fail"].includes(check.status) && !check.evidenceIds.length)
    )
      throw new Error("Check requires evidence");
    if (!byItem.has(check.itemId)) byItem.set(check.itemId, new Map());
    const entries = byItem.get(check.itemId);
    if (entries.has(check.ruleId)) throw new Error("Duplicate item rule check");
    entries.set(check.ruleId, check);
    const summary = (dimensions[check.dimension] ??= {
      total: 0,
      completed: 0,
      unknown: 0,
      notApplicable: 0,
    });
    summary.total++;
    if (check.status === "unknown") summary.unknown++;
    else if (check.status === "not-applicable") summary.notApplicable++;
    else summary.completed++;
  }
  const counts = Object.fromEntries([...states].map((state) => [state, 0]));
  const remainingItemIds = [];
  const missingChecks = [];
  for (const item of inventory) {
    counts[item.state]++;
    if (item.state === "excluded") continue;
    const results = byItem.get(item.itemId);
    let unresolved = false;
    for (const ruleId of item.requiredRuleIds) {
      const check = results?.get(ruleId);
      if (!check) {
        missingChecks.push({ itemId: item.itemId, ruleId });
        unresolved = true;
      } else if (check.status === "unknown") unresolved = true;
    }
    if (item.state !== "audited" || unresolved)
      remainingItemIds.push(item.itemId);
  }
  const inScope = inventory.length - counts.excluded;
  const limitations = [];
  if (!run.inventoryComplete)
    limitations.push("Inventory completeness is unknown");
  if (run.mode !== "full") limitations.push("Sampled audit");
  if (run.pendingQueue.length)
    limitations.push("Discovery or collection queue remains");
  if (!inScope) limitations.push("No in-scope content");
  if (remainingItemIds.length)
    limitations.push("Required item checks remain unresolved");
  return {
    total: inventory.length,
    inScope,
    excluded: counts.excluded,
    accounted: inventory.length - counts.pending,
    audited: inScope - remainingItemIds.length,
    states: counts,
    dimensions,
    missingChecks,
    remainingItemIds: remainingItemIds.sort(),
    pendingQueueCount: run.pendingQueue.length,
    inventoryComplete: run.inventoryComplete,
    denominator:
      "All declared inventory items; exclusions remain counted and explained. Dimension totals count supplied checks, not missing checks.",
    limitations,
    complete: limitations.length === 0,
  };
}
