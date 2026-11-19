import { expect, it } from "vitest";
import { setup } from "./helpers/remediation-preparation.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
// @ts-expect-error development module
import { prepareRollback } from "../scripts/enterprise-remediation/prepare-rollback.mjs";
function data() {
  const p = setup();
  p.hostContext.environment = "sandbox";
  p.hostContext.trustedAuthorizations[0].environment = "sandbox";
  p.planningInput.trustedAssetBindings[0].environment = "sandbox";
  p.planningInput.trustedAcceptancePolicies[0].assetBindingDigest =
    enterpriseDigest(p.planningInput.trustedAssetBindings[0]);
  p.planningInput.proposals[0].rollbackDigest = "c".repeat(64);
  const plan = planChanges(p.planningInput),
    entry = plan.entries[0];
  const receipt = {
    receiptId: "execution-1",
    planDigest: plan.planDigest,
    changeId: "change-1",
    customerId: plan.customerId,
    assetBindingDigest: entry.bindingDigest,
    artifactDigest: entry.artifactDigest,
    beforeDigest: entry.preconditionDigest,
    afterDigest: entry.artifactDigest,
    startedAt: "2026-11-18T14:15:00Z",
    completedAt: "2026-11-18T14:16:00Z",
    status: "applied",
  };
  const inventory = {
    inventoryId: "dependencies-1",
    customerId: plan.customerId,
    assetBindingDigest: entry.bindingDigest,
    executionReceiptDigest: enterpriseDigest(receipt),
    observedAt: "2026-11-18T14:17:00Z",
    validUntil: "2026-11-18T18:00:00Z",
    complete: true,
    dependentChangeIds: [],
    coordinationId: "lease-1",
    coordinationOwner: p.hostContext.identityId,
    coordinationValidUntil: "2026-11-18T18:00:00Z",
  };
  const approval = {
    approvalRef: "rollback-approval",
    approvedBy: "owner",
    sessionId: "session",
    rollbackId: "rollback-1",
    planDigest: plan.planDigest,
    changeId: "change-1",
    executionReceiptId: receipt.receiptId,
    executionReceiptDigest: enterpriseDigest(receipt),
    action: "apply-patch",
    purpose: "rollback",
    dependencyInventoryDigest: enterpriseDigest(inventory),
    adapterId: "sandbox-full-text-v1",
    target: "fixture.txt",
    customerId: plan.customerId,
    assetId: p.hostContext.assetId,
    environment: p.hostContext.environment,
    identityId: p.hostContext.identityId,
    artifactDigest: entry.rollbackDigest,
    preconditionDigest: receipt.afterDigest,
    restorationDigest: receipt.beforeDigest,
    grantedAt: "2026-11-18T14:20:00Z",
    expiresAt: "2026-11-18T18:00:00Z",
    revokedAt: null,
  };
  const binding = {
    receiptId: receipt.receiptId,
    receiptDigest: enterpriseDigest(receipt),
    adapterId: "sandbox-full-text-v1",
    target: "fixture.txt",
  };
  return {
    plan,
    planningInput: p.planningInput,
    changeId: "change-1",
    rollbackId: "rollback-1",
    executionReceipt: receipt,
    dependencyInventoryRef: inventory.inventoryId,
    currentPreconditionDigest: receipt.afterDigest,
    authorizationRef: p.authorizationRef,
    approvalRef: approval.approvalRef,
    now: "2026-11-18T14:30:00Z",
    hostContext: {
      ...p.hostContext,
      trustedExecutionReceipts: [receipt],
      trustedRollbackApprovals: [approval],
      trustedExecutionAdapters: [binding],
      trustedRollbackInventories: [inventory],
    },
  };
}
it("prepares only an inert exact rollback descriptor with remaining executor gates", () => {
  const x = data(),
    before = JSON.stringify(x),
    r = prepareRollback(x);
  expect(r.status).toBe("prepared");
  expect(r.executionAllowed).toBe(false);
  expect(r.descriptor.purpose).toBe("rollback");
  expect(r.descriptor.restorationDigest).toBe(x.executionReceipt.beforeDigest);
  expect(r.descriptor.requiresCurrentTargetVerification).toBe(true);
  expect(r.descriptor.requiresDependencyInventory).toBe(true);
  expect(r.descriptor.requiresReplayProtection).toBe(true);
  expect(JSON.stringify(x)).toBe(before);
});
it("cannot reuse original apply approval or unknown inspection as rollback authority", () => {
  const x = data();
  x.hostContext.trustedRollbackApprovals = [];
  expect(prepareRollback(x).status).toBe("denied");
  const y = data();
  y.executionReceipt.status = "unknown";
  expect(prepareRollback(y).reason).toBe("original-execution-binding-mismatch");
});
it("rejects current drift and unattested or unsupported adapter semantics", () => {
  const x = data();
  x.currentPreconditionDigest = "e".repeat(64);
  expect(prepareRollback(x).status).toBe("denied");
  const y = data();
  y.hostContext.trustedExecutionAdapters = [];
  expect(prepareRollback(y).status).toBe("denied");
  const z = data();
  z.hostContext.trustedExecutionAdapters[0].adapterId = "arbitrary-shell";
  expect(prepareRollback(z).status).toBe("denied");
});
it("rejects forged receipt, foreign target and reversed receipt chronology", () => {
  const x = data();
  x.executionReceipt = { ...x.executionReceipt, receiptId: "forged" };
  expect(prepareRollback(x).reason).toBe("original-receipt-not-host-verified");
  const y = data();
  y.hostContext.environment = "staging";
  expect(prepareRollback(y).reason).toBe("rollback-target-mismatch");
  const z = data();
  z.executionReceipt.completedAt = "2026-11-18T14:10:00Z";
  expect(prepareRollback(z).reason).toBe(
    "original-execution-chronology-invalid",
  );
});
it("requires active current rollback approval and broad mutation grant", () => {
  for (const mode of ["audit", "plan", "verify"]) {
    const x = data();
    x.hostContext.operationMode = mode;
    expect(prepareRollback(x).status).toBe("denied");
  }
  const x = data();
  Object.assign(x.hostContext.trustedRollbackApprovals[0], {
    revokedAt: x.now,
  });
  expect(prepareRollback(x).status).toBe("denied");
  const y = data();
  y.hostContext.trustedAuthorizations[0].expiresAt = y.now;
  expect(prepareRollback(y).status).toBe("denied");
});
it("permits independently approved restoration after the original retest window", () => {
  const x = data();
  x.now = "2026-11-18T17:00:00Z";
  x.hostContext.trustedAuthorizations[0].expiresAt = "2026-11-18T18:00:00Z";
  expect(prepareRollback(x).status).toBe("prepared");
});
it("records a late original apply as diagnostic rather than blocking fresh rollback", () => {
  const x = data();
  x.now = "2026-11-18T17:00:00Z";
  x.executionReceipt.completedAt = "2026-11-18T16:30:00Z";
  x.hostContext.trustedRollbackApprovals[0].grantedAt = "2026-11-18T16:40:00Z";
  x.hostContext.trustedAuthorizations[0].expiresAt = "2026-11-18T18:00:00Z";
  const digest = enterpriseDigest(x.executionReceipt);
  x.hostContext.trustedRollbackApprovals[0].executionReceiptDigest = digest;
  x.hostContext.trustedExecutionAdapters[0].receiptDigest = digest;
  Object.assign(x.hostContext.trustedRollbackInventories[0], {
    executionReceiptDigest: digest,
    observedAt: "2026-11-18T16:35:00Z",
  });
  x.hostContext.trustedRollbackApprovals[0].dependencyInventoryDigest =
    enterpriseDigest(x.hostContext.trustedRollbackInventories[0]);
  const r = prepareRollback(x);
  expect(r.status).toBe("prepared");
  expect(r.descriptor.originalTimingWithinPlan).toBe(false);
});
it("rejects approval predating completion and duplicate approval references", () => {
  const x = data();
  x.hostContext.trustedRollbackApprovals[0].grantedAt = "2026-11-18T14:00:00Z";
  expect(prepareRollback(x).status).toBe("denied");
  const y = data();
  y.hostContext.trustedRollbackApprovals.push({
    ...y.hostContext.trustedRollbackApprovals[0],
  });
  expect(prepareRollback(y).status).toBe("denied");
});

it("fails closed for a known dependent in the original plan", () => {
  const x = data();
  x.planningInput.proposals.push(
    Object.assign(
      { ...x.planningInput.proposals[0] },
      { changeId: "dependent", dependencies: ["change-1"] },
    ),
  );
  x.plan = planChanges(x.planningInput);
  expect(prepareRollback(x).reason).toBe("rollback-dependency-review-required");
});
it("rejects a rollback artifact that is not the exact prior image", () => {
  const x = data();
  x.planningInput.proposals[0].rollbackDigest = "f".repeat(64);
  x.plan = planChanges(x.planningInput);
  x.executionReceipt.planDigest = x.plan.planDigest;
  x.hostContext.trustedExecutionAdapters[0].receiptDigest = enterpriseDigest(
    x.executionReceipt,
  );
  expect(prepareRollback(x).reason).toBe("full-replacement-baseline-required");
});
it("binds rollback purpose, exact hashes, approval expiry and session validity", () => {
  const x = data();
  x.hostContext.trustedRollbackApprovals[0].purpose = "apply";
  expect(prepareRollback(x).status).toBe("denied");
  const y = data();
  y.hostContext.trustedRollbackApprovals[0].restorationDigest = "f".repeat(64);
  expect(prepareRollback(y).status).toBe("denied");
  const z = data();
  z.hostContext.trustedRollbackApprovals[0].expiresAt = z.now;
  expect(prepareRollback(z).status).toBe("denied");
  const a = data();
  Object.assign(a.hostContext.trustedRollbackApprovals[0], { expiresAt: null });
  expect(prepareRollback(a).status).toBe("prepared");
  a.hostContext.trustedRollbackApprovals[0].sessionId = "other-session";
  expect(prepareRollback(a).status).toBe("denied");
});

it("requires one complete current dependency inventory and live coordination", () => {
  const x = data();
  x.hostContext.trustedRollbackInventories = [];
  expect(prepareRollback(x).status).toBe("denied");
  const y = data();
  Object.assign(y.hostContext.trustedRollbackInventories[0], {
    dependentChangeIds: ["other-change"],
  });
  expect(prepareRollback(y).status).toBe("denied");
  const z = data();
  z.hostContext.trustedRollbackInventories[0].coordinationValidUntil = z.now;
  expect(prepareRollback(z).status).toBe("denied");
  const a = data();
  a.hostContext.trustedRollbackInventories.push({
    ...a.hostContext.trustedRollbackInventories[0],
    inventoryId: "conflict",
  });
  expect(prepareRollback(a).status).toBe("denied");
});
