import { verifyRetest } from "./retest.mjs";
import {
  enterpriseDigest,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const exact = (x, keys) =>
  x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.keys(x).sort().join(",") === keys.sort().join(",");
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(x);
const unknown = (reason) => ({
  status: "unknown",
  reason,
  findingResolution: "unverified",
  counts: null,
  results: [],
  businessUplift: "not-assessed",
});
/** Aggregates only the complete inventory attested by the host; it cannot discover omitted evidence itself. */
export function verifyRetestSet(input) {
  if (
    !exact(input, [
      "plan",
      "planningInput",
      "changeId",
      "records",
      "inventory",
      "hostContext",
      "assessmentAt",
    ]) ||
    !timestampValue(input.assessmentAt)
  )
    return unknown("invalid-retest-set-input");
  const {
    plan,
    planningInput,
    changeId,
    records,
    inventory,
    hostContext: host,
    assessmentAt,
  } = input;
  try {
    if (
      !Array.isArray(records) ||
      records.length > 100 ||
      !exact(inventory, [
        "inventoryId",
        "customerId",
        "assetBindingDigest",
        "planDigest",
        "changeId",
        "acceptancePolicyDigest",
        "windowStart",
        "windowEnd",
        "assessmentAt",
        "receiptIds",
        "complete",
      ]) ||
      !id(inventory.inventoryId) ||
      !Array.isArray(inventory.receiptIds) ||
      inventory.receiptIds.length > 100 ||
      inventory.receiptIds.some((x) => !id(x)) ||
      new Set(inventory.receiptIds).size !== inventory.receiptIds.length
    )
      return unknown("invalid-retest-inventory");
    if (
      !host ||
      !Array.isArray(host.trustedRetestInventories) ||
      host.trustedRetestInventories.length > 100
    )
      return unknown("inventory-not-host-verified");
    const registered = host.trustedRetestInventories.filter(
      (x) => x?.inventoryId === inventory.inventoryId,
    );
    if (
      registered.length !== 1 ||
      enterpriseDigest(registered[0]) !== enterpriseDigest(inventory)
    )
      return unknown("inventory-not-host-verified");
    const entry = plan.entries.find((e) => e.changeId === changeId);
    if (!entry?.acceptance || !entry.binding)
      return unknown("plan-requirements-incomplete");
    const expected = {
      customerId: plan.customerId,
      assetBindingDigest: entry.bindingDigest,
      planDigest: plan.planDigest,
      changeId,
      acceptancePolicyDigest: entry.acceptance.policyDigest,
      windowStart: entry.acceptance.policy.window.start,
      windowEnd: entry.acceptance.policy.window.end,
      assessmentAt,
      complete: true,
    };
    if (
      Object.entries(expected).some(([key, value]) => inventory[key] !== value)
    )
      return unknown("inventory-scope-or-completeness-mismatch");
    const scopeFields = Object.entries(expected).filter(
      ([key]) => key !== "complete",
    );
    const canonical = host.trustedRetestInventories.filter((candidate) =>
      scopeFields.every(([key, value]) => candidate?.[key] === value),
    );
    if (canonical.length !== 1) return unknown("ambiguous-canonical-inventory");
    if (
      records.some(
        (r) =>
          !exact(r, ["executionReceipt", "retestEvidence"]) ||
          !id(r.retestEvidence?.receiptId),
      )
    )
      return unknown("invalid-retest-set-member");
    const ids = records.map((r) => r.retestEvidence.receiptId).sort();
    if (
      new Set(ids).size !== ids.length ||
      enterpriseDigest(ids) !==
        enterpriseDigest([...inventory.receiptIds].sort())
    )
      return unknown("inventory-membership-mismatch");
    if (!ids.length) return unknown("no-retest-observations");
    const results = [...records]
      .sort((a, b) =>
        a.retestEvidence.receiptId < b.retestEvidence.receiptId ? -1 : 1,
      )
      .map((r) => ({
        receiptId: r.retestEvidence.receiptId,
        result: verifyRetest({
          plan,
          planningInput,
          changeId,
          executionReceipt: r.executionReceipt,
          retestEvidence: r.retestEvidence,
          hostContext: host,
          assessmentAt,
        }),
      }));
    const counts = { pass: 0, fail: 0, unknown: 0 };
    for (const item of results) counts[item.result.status]++;
    const conflict = counts.pass > 0 && counts.fail > 0;
    const changedScope = results.some(
      (x) => x.result.scenarioEquivalence === "not-verified",
    );
    const status =
      conflict || counts.unknown || changedScope
        ? "unknown"
        : counts.fail
          ? "fail"
          : "pass";
    return {
      status,
      reason: conflict
        ? "conflicting-retest-results"
        : changedScope
          ? "original-scenario-equivalence-required"
          : counts.unknown
            ? "unverified-retest-members"
            : "host-attested-inventory-assessed",
      findingResolution:
        status === "pass"
          ? "pending-independent-review"
          : status === "fail"
            ? "open"
            : "unverified",
      counts,
      results,
      inventoryId: inventory.inventoryId,
      inventoryDigest: enterpriseDigest(inventory),
      coverage: "complete-as-host-attested",
      businessUplift: "not-assessed",
      limitations: [
        "Completeness is asserted by the host inventory collector, not discovered by this evaluator",
        "This set covers one change and its declared acceptance check, not all website findings",
        "No finding is automatically resolved",
      ],
    };
  } catch {
    return unknown("retest-set-validation-failed");
  }
}
