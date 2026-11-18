import { planChanges } from "./change-plan.mjs";
import { authorizeAction } from "../../skills/content-search-audit/scripts/lib/authorization.mjs";
import {
  enterpriseDigest,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const deny = (reason) => ({
  status: "denied",
  reason,
  executionAllowed: false,
  descriptor: null,
});
const text = (x) =>
  typeof x === "string" && x.trim().length > 0 && x.length <= 256;
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
function exact(x, keys) {
  return (
    x &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    Object.keys(x).sort().join(",") === keys.sort().join(",")
  );
}
/** Pure preparation. Host state is supplied separately; an executor MUST call again at action time. */
export function prepareChange(input) {
  if (
    !exact(input, [
      "plan",
      "planningInput",
      "changeId",
      "authorizationRef",
      "approvalRef",
      "hostContext",
      "currentPreconditionDigest",
      "now",
    ]) ||
    !timestampValue(input.now) ||
    !hash(input.currentPreconditionDigest)
  )
    return deny("invalid-preparation-input");
  const {
    plan,
    planningInput,
    changeId,
    authorizationRef,
    approvalRef,
    hostContext: host,
    now,
  } = input;
  if (
    !host ||
    !["customerId", "environment", "assetId", "identityId", "sessionId"].every(
      (key) => text(host[key]),
    ) ||
    ![
      "trustedApprovals",
      "trustedAuthorizations",
      "trustedAssetBindings",
      "trustedAcceptancePolicies",
    ].every((key) => Array.isArray(host[key]) && host[key].length <= 100)
  )
    return deny("trusted-host-state-required");
  let rebuilt;
  try {
    rebuilt = planChanges({
      ...planningInput,
      trustedAssetBindings: host.trustedAssetBindings,
      trustedAcceptancePolicies: host.trustedAcceptancePolicies,
    });
    if (enterpriseDigest(rebuilt) !== enterpriseDigest(plan))
      return deny("plan-revalidation-mismatch");
  } catch {
    return deny("plan-revalidation-failed");
  }
  if (Date.parse(now) < Date.parse(plan.createdAt))
    return deny("plan-not-yet-valid");
  const entry = plan.entries.find((e) => e.changeId === changeId);
  if (!entry || entry.gaps.length || !entry.binding || !entry.acceptance)
    return deny("plan-requirements-incomplete");
  if (entry.dependencies.length)
    return deny("verified-dependency-receipts-required");
  if (
    entry.binding.assetId !== host.assetId ||
    entry.binding.environment !== host.environment ||
    plan.customerId !== host.customerId
  )
    return deny("execution-target-mismatch");
  if (entry.preconditionDigest !== input.currentPreconditionDigest)
    return deny("current-precondition-mismatch");
  if (
    entry.sourceEvidence.some(
      (e) => Date.parse(now) >= Date.parse(e.validUntil),
    )
  )
    return deny("source-evidence-expired");
  if (Date.parse(now) >= Date.parse(entry.acceptance.policy.window.start))
    return deny("retest-window-needs-replanning");
  const approvals = host.trustedApprovals.filter(
    (a) => a?.approvalRef === approvalRef,
  );
  if (approvals.length !== 1) return deny("trusted-exact-approval-required");
  const approval = approvals[0];
  if (
    !exact(approval, [
      "approvalRef",
      "approvedBy",
      "sessionId",
      "planDigest",
      "changeId",
      "action",
      "customerId",
      "assetId",
      "environment",
      "identityId",
      "artifactDigest",
      "preconditionDigest",
      "rollbackDigest",
      "grantedAt",
      "expiresAt",
      "revokedAt",
    ]) ||
    !text(approval.approvalRef) ||
    !text(approval.approvedBy) ||
    !text(approval.sessionId) ||
    !timestampValue(approval.grantedAt) ||
    (approval.expiresAt !== null && !timestampValue(approval.expiresAt)) ||
    approval.revokedAt !== null
  )
    return deny("invalid-or-revoked-exact-approval");
  if (
    Date.parse(approval.grantedAt) < Date.parse(plan.createdAt) ||
    Date.parse(now) < Date.parse(approval.grantedAt) ||
    (approval.expiresAt === null
      ? approval.sessionId !== host.sessionId
      : Date.parse(now) >= Date.parse(approval.expiresAt))
  )
    return deny("exact-approval-not-current");
  const expected = {
    planDigest: plan.planDigest,
    changeId,
    action: "apply-patch",
    customerId: plan.customerId,
    assetId: host.assetId,
    environment: host.environment,
    identityId: host.identityId,
    artifactDigest: entry.artifactDigest,
    preconditionDigest: entry.preconditionDigest,
    rollbackDigest: entry.rollbackDigest,
  };
  if (Object.entries(expected).some(([key, value]) => approval[key] !== value))
    return deny("exact-approval-binding-mismatch");
  const grants = host.trustedAuthorizations.filter(
    (g) => g?.authorizationRef === authorizationRef,
  );
  if (grants.length !== 1) return deny("trusted-action-grant-required");
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
    acceptancePolicyDigest: entry.acceptance.policyDigest,
    requiresArtifactVerification: true,
    requiresExecutionTimeRecheck: true,
  };
  return {
    status: "prepared",
    reason: "exact-artifact-preparation-only",
    executionAllowed: false,
    descriptor: globalThis.structuredClone(descriptor),
    descriptorDigest: enterpriseDigest(descriptor),
  };
}
