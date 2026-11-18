import { expect, it } from "vitest";
import { fixture, input } from "./helpers/remediation-fixture.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
// @ts-expect-error development module
import { prepareChange } from "../scripts/enterprise-remediation/prepare-change.mjs";
function setup() {
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
it("prepares an inert exact-artifact descriptor without granting execution", () => {
  const x = setup(),
    before = JSON.stringify(x);
  const r = prepareChange(x);
  expect(r.status).toBe("prepared");
  expect(r.executionAllowed).toBe(false);
  expect(r.descriptor.artifactDigest).toBe("b".repeat(64));
  expect(JSON.stringify(x)).toBe(before);
});
it.each(["audit", "plan", "verify"])(
  "denies mutation in %s mode",
  (operationMode) => {
    const x = setup();
    x.hostContext.operationMode = operationMode;
    expect(prepareChange(x).status).toBe("denied");
  },
);
it("denies expired or revoked grants at current execution time", () => {
  const x = setup();
  x.now = "2026-11-18T14:59:00Z";
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  Object.assign(y.hostContext.trustedAuthorizations[0], {
    revokedAt: "2026-11-18T14:10:00Z",
  });
  expect(prepareChange(y).status).toBe("denied");
});
it("does not accept approval or policy supplied only in imported inputs", () => {
  const x = setup();
  x.hostContext.trustedApprovals = [];
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  y.hostContext.trustedAcceptancePolicies = [];
  expect(prepareChange(y).status).toBe("denied");
});
it("rejects changed patch, base, target, identity and rolled-back approval", () => {
  for (const key of [
    "artifactDigest",
    "preconditionDigest",
    "assetId",
    "environment",
    "identityId",
    "rollbackDigest",
  ]) {
    const x = setup();
    Object.assign(x.hostContext.trustedApprovals[0], { [key]: "changed" });
    expect(prepareChange(x).status).toBe("denied");
  }
});
it("rejects stale precondition and tampered plan even with recomputed self hash", () => {
  const x = setup();
  x.currentPreconditionDigest = "e".repeat(64);
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  y.plan.entries[0].artifactDigest = "e".repeat(64);
  const { planDigest: oldDigest, ...body } = y.plan;
  void oldDigest;
  y.plan.planDigest = enterpriseDigest(body);
  expect(prepareChange(y).status).toBe("denied");
});
it("requires a session match for session-bound approval", () => {
  const x = setup();
  Object.assign(x.hostContext.trustedApprovals[0], {
    expiresAt: null,
    sessionId: "other",
  });
  expect(prepareChange(x).status).toBe("denied");
});
it("denies read-only grants and duplicate approval refs", () => {
  const x = setup();
  x.hostContext.trustedAuthorizations[0].allowedActions = ["read"];
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  y.hostContext.trustedApprovals.push({ ...y.hostContext.trustedApprovals[0] });
  expect(prepareChange(y).status).toBe("denied");
});

it("requires replanning if the frozen retest window has started", () => {
  const x = setup();
  x.now = "2026-11-18T15:00:00Z";
  expect(prepareChange(x).reason).toBe("retest-window-needs-replanning");
});
it("does not reuse source evidence past its exclusive expiry", () => {
  const x = setup();
  x.now = "2026-11-19T12:00:00Z";
  expect(prepareChange(x).reason).toBe("source-evidence-expired");
});
