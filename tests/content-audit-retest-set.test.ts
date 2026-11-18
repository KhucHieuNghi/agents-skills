// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
import { expect, it } from "vitest";
import { data } from "./helpers/remediation-retest.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
// @ts-expect-error development module
import { verifyRetestSet } from "../scripts/enterprise-remediation/retest-set.mjs";
function fixture(statuses = ["pass"]) {
  const x = data(),
    entry = x.plan.entries[0];
  const records = statuses.map((status, i) => ({
    executionReceipt: structuredClone(x.executionReceipt),
    retestEvidence: {
      ...structuredClone(x.retestEvidence),
      receiptId: "retest-" + i,
      status,
    },
  }));
  const inventory = {
    inventoryId: "inventory-1",
    customerId: x.plan.customerId,
    assetBindingDigest: entry.bindingDigest,
    planDigest: x.plan.planDigest,
    changeId: x.changeId,
    acceptancePolicyDigest: entry.acceptance.policyDigest,
    windowStart: entry.acceptance.policy.window.start,
    windowEnd: entry.acceptance.policy.window.end,
    assessmentAt: x.assessmentAt,
    receiptIds: records.map((r) => r.retestEvidence.receiptId),
    complete: true,
  };
  const hostContext = {
    ...x.hostContext,
    trustedRetestInventories: [structuredClone(inventory)],
    trustedRetestBindings: records.map((r) => ({
      receiptId: r.retestEvidence.receiptId,
      evidenceDigest: enterpriseDigest(r.retestEvidence),
      evaluatorId: r.retestEvidence.evaluatorId,
      evaluatorVersion: r.retestEvidence.evaluatorVersion,
    })),
  };
  return {
    plan: x.plan,
    planningInput: x.planningInput,
    changeId: x.changeId,
    records,
    inventory,
    hostContext,
    assessmentAt: x.assessmentAt,
  };
}
it("preserves pass only for the complete host-attested set and still requires review", () => {
  const x = fixture(),
    before = JSON.stringify(x);
  const r = verifyRetestSet(x);
  expect(r.status).toBe("pass");
  expect(r.findingResolution).toBe("pending-independent-review");
  expect(r.counts).toEqual({ pass: 1, fail: 0, unknown: 0 });
  expect(JSON.stringify(x)).toBe(before);
});
it("does not cherry-pick pass from contradictory outcomes", () => {
  const x = fixture(["pass", "fail"]);
  const r = verifyRetestSet(x);
  expect(r.status).toBe("unknown");
  expect(r.reason).toBe("conflicting-retest-results");
  x.records.pop();
  expect(verifyRetestSet(x).reason).toBe("inventory-membership-mismatch");
});
it("keeps unknown and failed members visible", () => {
  expect(verifyRetestSet(fixture(["pass", "unknown"])).status).toBe("unknown");
  expect(verifyRetestSet(fixture(["fail", "fail"])).status).toBe("fail");
});
it("rejects incomplete, untrusted and empty inventories", () => {
  const x = fixture();
  x.inventory.complete = false;
  x.hostContext.trustedRetestInventories = [structuredClone(x.inventory)];
  expect(verifyRetestSet(x).status).toBe("unknown");
  const y = fixture();
  y.hostContext.trustedRetestInventories = [];
  expect(verifyRetestSet(y).status).toBe("unknown");
  expect(verifyRetestSet(fixture([])).status).toBe("unknown");
});
it("rejects duplicate receipts, extra receipts and stale inventory snapshots", () => {
  const x = fixture();
  x.records.push(structuredClone(x.records[0]));
  expect(verifyRetestSet(x).status).toBe("unknown");
  const y = fixture();
  y.assessmentAt = "2026-11-18T15:31:00Z";
  expect(verifyRetestSet(y).status).toBe("unknown");
});
it("does not accept a new membership list without host confirmation", () => {
  const x = fixture(["pass", "fail"]);
  x.records.pop();
  x.inventory.receiptIds.pop();
  expect(verifyRetestSet(x).reason).toBe("inventory-not-host-verified");
});
it("is deterministic when record order changes", () => {
  const x = fixture(["pass", "pass"]);
  const a = verifyRetestSet(x);
  x.records.reverse();
  expect(verifyRetestSet(x)).toEqual(a);
});
it("rejects a foreign inventory even if registered", () => {
  const x = fixture();
  x.inventory.customerId = "other";
  x.hostContext.trustedRetestInventories = [structuredClone(x.inventory)];
  expect(verifyRetestSet(x).status).toBe("unknown");
});

it("does not promote an entirely mapped-scenario set to original-scenario success", () => {
  const x = fixture();
  Object.assign(x.planningInput.trustedAcceptancePolicies[0], {
    scenarioMapping: {
      baselineScenarioId: null,
      retestScenarioId: "mapped",
      reason: "Reviewed observation mapping; equivalence pending",
    },
  });
  x.plan = planChanges(x.planningInput);
  const entry = x.plan.entries[0];
  for (const r of x.records) {
    r.executionReceipt.planDigest = x.plan.planDigest;
    Object.assign(r.retestEvidence, {
      planDigest: x.plan.planDigest,
      acceptancePolicyDigest: entry.acceptance.policyDigest,
    });
    Object.assign(r.retestEvidence.check, { scenarioId: "mapped" });
  }
  Object.assign(x.inventory, {
    planDigest: x.plan.planDigest,
    acceptancePolicyDigest: entry.acceptance.policyDigest,
  });
  x.hostContext.trustedExecutionReceipts = [
    structuredClone(x.records[0].executionReceipt),
  ];
  x.hostContext.trustedRetestInventories = [structuredClone(x.inventory)];
  x.hostContext.trustedRetestBindings[0].evidenceDigest = enterpriseDigest(
    x.records[0].retestEvidence,
  );
  expect(verifyRetestSet(x).reason).toBe(
    "original-scenario-equivalence-required",
  );
  expect(verifyRetestSet(x).status).toBe("unknown");
});

it("rejects competing complete inventories for the same scope and cutoff", () => {
  const x = fixture(["pass", "fail"]);
  const selected = {
    ...structuredClone(x.inventory),
    inventoryId: "subset",
    receiptIds: [x.inventory.receiptIds[0]],
  };
  x.hostContext.trustedRetestInventories.push(structuredClone(selected));
  x.inventory = selected;
  x.records.pop();
  expect(verifyRetestSet(x).reason).toBe("ambiguous-canonical-inventory");
});
