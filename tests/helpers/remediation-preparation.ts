import { fixture, input } from "./remediation-fixture.js";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
// @ts-expect-error development module
import { planChanges } from "../../scripts/enterprise-remediation/change-plan.mjs";
export function setup() {
  const x = input(),
    { bundle } = fixture();
  Object.assign(bundle, {
    decisions: [
      ...["finding", "check"].map((type) => {
        const id = type === "finding" ? "F-1" : x.report.findings[0].checkId;
        return {
          targetType: type,
          targetId: id,
          targetDigest: enterpriseReviewTargetDigest(x.report, type, id),
          reviewerId: "independent",
          reviewerType: "independent-ai",
          reviewedAt: "2026-11-18T12:30:00Z",
          verdict: "accept",
          reason: "Verified fixture",
        };
      }),
    ],
  });
  x.report = buildEnterpriseReport(x.sourceRun, bundle);
  const check = x.sourceRun.checks[0];
  const policy = {
    policyRef: "acceptance-1",
    customerId: x.sourceRun.customerId,
    checkId: check.checkId,
    contextDigest: x.report.assessment.checkContextDigests[check.checkId],
    assetBindingDigest: enterpriseDigest(x.trustedAssetBindings[0]),
    authorId: "policy-author",
    reviewerId: "reviewer",
    reviewerType: "independent-ai",
    reviewReason: "Reviewed exact check and asset",
    reviewedAt: "2026-11-18T13:30:00Z",
    expectedStatus: "pass",
    minimumCompleteness: 1,
    window: {
      kind: "point",
      baselineWindowId: null,
      retestWindowId: null,
      start: "2026-11-18T15:00:00Z",
      end: "2026-11-18T16:00:00Z",
      timezone: "UTC",
      filtersDigest: "c".repeat(64),
      ingestionLagSeconds: 0,
    },
  };
  Object.assign(x.proposals[0], { acceptancePolicyRef: "acceptance-1" });
  const planningInput = { ...x, trustedAcceptancePolicies: [policy] },
    plan = planChanges(planningInput);
  const grant = {
    authorizationRef: "grant",
    customerId: x.sourceRun.customerId,
    environment: "production",
    assetIds: ["site-prod"],
    allowedActions: ["apply-patch"],
    identityId: "operator",
    grantedAt: "2026-11-18T14:00:00Z",
    expiresAt: "2026-11-18T14:59:00Z",
    revokedAt: null,
    sessionId: "session",
    sideEffectConstraints: { allowRealTransactions: false },
  };
  const approval = {
    approvalRef: "approval",
    approvedBy: "owner",
    sessionId: "session",
    planDigest: plan.planDigest,
    changeId: "change-1",
    action: "apply-patch",
    customerId: x.sourceRun.customerId,
    assetId: "site-prod",
    environment: "production",
    identityId: "operator",
    artifactDigest: "b".repeat(64),
    preconditionDigest: "c".repeat(64),
    rollbackDigest: "d".repeat(64),
    grantedAt: "2026-11-18T14:00:00Z",
    expiresAt: "2026-11-18T14:59:00Z",
    revokedAt: null,
  };
  return {
    plan,
    planningInput,
    changeId: "change-1",
    authorizationRef: "grant",
    approvalRef: "approval",
    now: "2026-11-18T14:15:00Z",
    currentPreconditionDigest: "c".repeat(64),
    hostContext: {
      customerId: x.sourceRun.customerId,
      environment: "production",
      assetId: "site-prod",
      identityId: "operator",
      operationMode: "remediate",
      sessionId: "session",
      trustedAuthorizations: [grant],
      trustedApprovals: [approval],
      trustedAssetBindings: x.trustedAssetBindings,
      trustedAcceptancePolicies: [policy],
    },
  };
}
