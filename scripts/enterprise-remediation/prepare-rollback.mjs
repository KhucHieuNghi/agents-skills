import { planChanges } from "./change-plan.mjs";
import { authorizeAction } from "../../skills/content-search-audit/scripts/lib/authorization.mjs";
import {
  enterpriseDigest,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(x);
const text = (x) =>
  typeof x === "string" && x.trim().length > 0 && x.length <= 256;
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const exact = (x, keys) =>
  x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.keys(x).sort().join(",") === [...keys].sort().join(",");
const deny = (reason) => ({
  status: "denied",
  reason,
  executionAllowed: false,
  descriptor: null,
});

/** Pure, sandbox full-replacement preparation. Neither receipt nor inspection grants rollback. */
export function prepareRollback(input) {
  if (
    !exact(input, [
      "plan",
      "planningInput",
      "changeId",
      "rollbackId",
      "executionReceipt",
      "currentPreconditionDigest",
      "authorizationRef",
      "approvalRef",
      "now",
      "hostContext",
    ]) ||
    !id(input.rollbackId) ||
    !id(input.changeId) ||
    !timestampValue(input.now) ||
    !hash(input.currentPreconditionDigest)
  )
    return deny("invalid-rollback-input");
  const {
    plan,
    planningInput,
    changeId,
    rollbackId,
    executionReceipt: r,
    currentPreconditionDigest,
    authorizationRef,
    approvalRef,
    now,
    hostContext: host,
  } = input;
  if (
    !host ||
    !["customerId", "assetId", "environment", "identityId", "sessionId"].every(
      (k) => text(host[k]),
    ) ||
    ![
      "trustedAssetBindings",
      "trustedAcceptancePolicies",
      "trustedExecutionReceipts",
      "trustedExecutionAdapters",
      "trustedRollbackApprovals",
      "trustedAuthorizations",
    ].every((k) => Array.isArray(host[k]) && host[k].length <= 100)
  )
    return deny("trusted-rollback-host-state-required");
  try {
    const rebuilt = planChanges({
      ...planningInput,
      trustedAssetBindings: host.trustedAssetBindings,
      trustedAcceptancePolicies: host.trustedAcceptancePolicies,
    });
    if (enterpriseDigest(rebuilt) !== enterpriseDigest(plan))
      return deny("original-plan-binding-mismatch");
    const entry = rebuilt.entries.find((e) => e.changeId === changeId);
    if (!entry || entry.gaps.length || !entry.binding || !entry.acceptance)
      return deny("original-plan-requirements-incomplete");
    if (
      entry.dependencies.length ||
      rebuilt.entries.some((e) => e.dependencies.includes(changeId))
    )
      return deny("rollback-dependency-review-required");
    if (
      host.customerId !== plan.customerId ||
      host.assetId !== entry.binding.assetId ||
      host.environment !== entry.binding.environment
    )
      return deny("rollback-target-mismatch");
    if (host.environment !== "sandbox")
      return deny("rollback-adapter-environment-unsupported");
    if (
      !exact(r, [
        "receiptId",
        "planDigest",
        "changeId",
        "customerId",
        "assetBindingDigest",
        "artifactDigest",
        "beforeDigest",
        "afterDigest",
        "startedAt",
        "completedAt",
        "status",
      ]) ||
      !id(r.receiptId) ||
      !hash(r.beforeDigest) ||
      !hash(r.afterDigest) ||
      ![r.startedAt, r.completedAt].every(timestampValue)
    )
      return deny("invalid-original-execution-receipt");
    const receiptDigest = enterpriseDigest(r);
    const receipts = host.trustedExecutionReceipts.filter(
      (x) => x?.receiptId === r.receiptId,
    );
    if (
      receipts.length !== 1 ||
      enterpriseDigest(receipts[0]) !== receiptDigest
    )
      return deny("original-receipt-not-host-verified");
    const expectedReceipt = {
      planDigest: plan.planDigest,
      changeId,
      customerId: plan.customerId,
      assetBindingDigest: entry.bindingDigest,
      artifactDigest: entry.artifactDigest,
      beforeDigest: entry.preconditionDigest,
      status: "applied",
    };
    if (Object.entries(expectedReceipt).some(([k, v]) => r[k] !== v))
      return deny("original-execution-binding-mismatch");
    const start = Date.parse(r.startedAt),
      end = Date.parse(r.completedAt),
      at = Date.parse(now);
    if (start < Date.parse(plan.createdAt) || end < start || end > at)
      return deny("original-execution-chronology-invalid");
    const adapters = host.trustedExecutionAdapters.filter(
      (x) => x?.receiptId === r.receiptId,
    );
    if (
      adapters.length !== 1 ||
      !exact(adapters[0], [
        "receiptId",
        "receiptDigest",
        "adapterId",
        "target",
      ]) ||
      adapters[0].receiptDigest !== receiptDigest ||
      adapters[0].adapterId !== "sandbox-full-text-v1" ||
      adapters[0].target !== "fixture.txt"
    )
      return deny("original-adapter-not-host-verified");
    if (
      r.afterDigest !== entry.artifactDigest ||
      entry.rollbackDigest !== r.beforeDigest
    )
      return deny("full-replacement-baseline-required");
    if (currentPreconditionDigest !== r.afterDigest)
      return deny("rollback-current-precondition-mismatch");
    const expected = {
      rollbackId,
      planDigest: plan.planDigest,
      changeId,
      executionReceiptId: r.receiptId,
      executionReceiptDigest: receiptDigest,
      action: "apply-patch",
      purpose: "rollback",
      adapterId: "sandbox-full-text-v1",
      target: "fixture.txt",
      customerId: plan.customerId,
      assetId: host.assetId,
      environment: host.environment,
      identityId: host.identityId,
      artifactDigest: entry.rollbackDigest,
      preconditionDigest: r.afterDigest,
      restorationDigest: r.beforeDigest,
    };
    const approvals = host.trustedRollbackApprovals.filter(
      (x) => x?.approvalRef === approvalRef,
    );
    if (approvals.length !== 1) return deny("fresh-rollback-approval-required");
    const approval = approvals[0];
    if (
      !exact(approval, [
        ...Object.keys(expected),
        "approvalRef",
        "approvedBy",
        "sessionId",
        "grantedAt",
        "expiresAt",
        "revokedAt",
      ]) ||
      ![approval.approvalRef, approval.approvedBy, approval.sessionId].every(
        text,
      ) ||
      !timestampValue(approval.grantedAt) ||
      (approval.expiresAt !== null && !timestampValue(approval.expiresAt)) ||
      approval.revokedAt !== null
    )
      return deny("invalid-or-revoked-rollback-approval");
    if (Object.entries(expected).some(([k, v]) => approval[k] !== v))
      return deny("rollback-approval-binding-mismatch");
    if (
      Date.parse(approval.grantedAt) < end ||
      Date.parse(approval.grantedAt) > at ||
      (approval.expiresAt === null
        ? approval.sessionId !== host.sessionId
        : at >= Date.parse(approval.expiresAt))
    )
      return deny("rollback-approval-not-current");
    const grants = host.trustedAuthorizations.filter(
      (x) => x?.authorizationRef === authorizationRef,
    );
    if (grants.length !== 1)
      return deny("trusted-rollback-action-grant-required");
    const decision = authorizeAction(
      grants[0],
      { kind: "apply-patch", realTransaction: false },
      host,
      now,
    );
    if (!decision.allowed) return deny(decision.reason);
    const descriptor = {
      ...expected,
      approvalRef,
      authorizationRef,
      preparedAt: now,
      originalTimingWithinPlan:
        end < Date.parse(entry.acceptance.policy.window.start) &&
        entry.sourceEvidence.every((e) => end < Date.parse(e.validUntil)),
      originalAuthorizationVerified: false,
      requiresCurrentTargetVerification: true,
      requiresArtifactVerification: true,
      requiresExecutionTimeRecheck: true,
      requiresDependencyInventory: true,
      requiresReplayProtection: true,
      requiresRestoredStateVerification: true,
      findingResolution: "unverified",
    };
    return {
      status: "prepared",
      reason: "rollback-preparation-only",
      executionAllowed: false,
      descriptor: globalThis.structuredClone(descriptor),
      descriptorDigest: enterpriseDigest(descriptor),
    };
  } catch {
    return deny("rollback-revalidation-failed");
  }
}
