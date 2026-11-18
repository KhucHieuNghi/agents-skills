import { fixture } from "./helpers/remediation-fixture.js";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
import { expect, it } from "vitest";
import { setup } from "./helpers/remediation-preparation.js";
import {
  enterpriseDigest,
  checkIdentity,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
// @ts-expect-error development module
import { verifyRetest } from "../scripts/enterprise-remediation/retest.mjs";
function data() {
  const x = setup(),
    entry = x.plan.entries[0];
  const executionReceipt = {
    receiptId: "execution-1",
    planDigest: x.plan.planDigest,
    changeId: x.changeId,
    customerId: x.plan.customerId,
    assetBindingDigest: entry.bindingDigest,
    artifactDigest: entry.artifactDigest,
    beforeDigest: entry.preconditionDigest,
    afterDigest: "e".repeat(64),
    startedAt: "2026-11-18T14:15:00Z",
    completedAt: "2026-11-18T14:16:00Z",
    status: "applied",
  };
  const retestEvidence = {
    receiptId: "retest-1",
    executionReceiptId: "execution-1",
    planDigest: x.plan.planDigest,
    changeId: x.changeId,
    customerId: x.plan.customerId,
    assetBindingDigest: entry.bindingDigest,
    afterDigest: "e".repeat(64),
    acceptancePolicyDigest: entry.acceptance.policyDigest,
    check: { ...entry.baselineCheck },
    policyVersions: {},
    profileVersions: x.planningInput.sourceRun.profileVersions,
    observedAt: "2026-11-18T15:10:00Z",
    validUntil: "2026-11-18T17:00:00Z",
    windowStart: "2026-11-18T15:00:00Z",
    windowEnd: "2026-11-18T16:00:00Z",
    timezone: "UTC",
    filtersDigest: "c".repeat(64),
    completeness: 1,
    status: "pass",
    sourceDigest: "f".repeat(64),
    evaluatorId: "technical-evaluator",
    evaluatorVersion: "1",
  };
  const hostContext = {
    ...x.hostContext,
    trustedExecutionReceipts: [{ ...executionReceipt }],
    trustedRetestBindings: [
      {
        receiptId: "retest-1",
        evidenceDigest: enterpriseDigest(retestEvidence),
        evaluatorId: "technical-evaluator",
        evaluatorVersion: "1",
      },
    ],
  };
  return {
    plan: x.plan,
    planningInput: x.planningInput,
    changeId: x.changeId,
    executionReceipt,
    retestEvidence,
    hostContext,
    assessmentAt: "2026-11-18T15:30:00Z",
  };
}
function attest(x: ReturnType<typeof data>) {
  x.hostContext.trustedExecutionReceipts = [
    structuredClone(x.executionReceipt),
  ];
  x.hostContext.trustedRetestBindings[0].evidenceDigest = enterpriseDigest(
    x.retestEvidence,
  );
  return x;
}
it("records a scoped pass without rewriting findings or claiming resolution", () => {
  const x = data(),
    before = JSON.stringify(x);
  const r = verifyRetest(x);
  expect(r.status).toBe("pass");
  expect(r.findingResolution).toBe("pending-independent-review");
  expect(JSON.stringify(x)).toBe(before);
});
it("requires separate trusted execution and retest bindings", () => {
  const x = data();
  x.hostContext.trustedExecutionReceipts = [];
  expect(verifyRetest(x).status).toBe("unknown");
  const y = data();
  y.hostContext.trustedRetestBindings = [];
  expect(verifyRetest(y).status).toBe("unknown");
});
it.each([
  "customerId",
  "assetBindingDigest",
  "acceptancePolicyDigest",
  "afterDigest",
  "executionReceiptId",
])("rejects mismatched retest %s even with a host receipt", (key) => {
  const x = data();
  Object.assign(x.retestEvidence, { [key]: "different" });
  expect(verifyRetest(attest(x)).status).toBe("unknown");
});
it("does not promote failed or unknown evaluation", () => {
  for (const status of ["fail", "unknown"]) {
    const x = data();
    x.retestEvidence.status = status;
    const r = verifyRetest(attest(x));
    expect(r.status).toBe(status);
    expect(r.findingResolution).not.toBe("resolved");
  }
});
it("rejects rollback and failed execution as optimization success", () => {
  for (const status of ["rolled-back", "failed", "unknown"]) {
    const x = data();
    x.executionReceipt.status = status;
    expect(verifyRetest(attest(x)).status).toBe("unknown");
  }
});
it("rejects stale, early, future and incomplete observations", () => {
  for (const patch of [
    { observedAt: "2026-11-18T14:10:00Z" },
    { observedAt: "2026-11-18T16:10:00Z" },
    { validUntil: "2026-11-18T15:30:00Z" },
    { completeness: 0.5 },
  ]) {
    const x = data();
    Object.assign(x.retestEvidence, patch);
    expect(verifyRetest(attest(x)).status).toBe("unknown");
  }
});
it("rejects changed check rule, scenario and frozen filters", () => {
  const x = data();
  x.retestEvidence.check.ruleVersion = "other";
  expect(verifyRetest(attest(x)).status).toBe("unknown");
  const y = data();
  y.retestEvidence.filtersDigest = "a".repeat(64);
  expect(verifyRetest(attest(y)).status).toBe("unknown");
});
it("does not trust a self-edited evidence receipt", () => {
  const x = data();
  x.retestEvidence.sourceDigest = "a".repeat(64);
  expect(verifyRetest(x).status).toBe("unknown");
});

it("rejects changed policy and profile versions despite an attested status", () => {
  const x = data();
  Object.assign(x.retestEvidence.policyVersions, { unexpected: "2" });
  expect(verifyRetest(attest(x)).status).toBe("unknown");
  const y = data();
  Object.assign(y.retestEvidence, { profileVersions: { changed: "2" } });
  expect(verifyRetest(attest(y)).status).toBe("unknown");
});

it("waits for the complete period and ingestion lag before accepting period evidence", () => {
  const x = data(),
    p = x.planningInput,
    { bundle } = fixture();
  const oldId = p.sourceRun.checks[0].checkId;
  p.sourceRun.checks[0].windowId = "baseline";
  const newId = checkIdentity(p.sourceRun.checks[0]);
  p.sourceRun = JSON.parse(
    JSON.stringify(p.sourceRun).replaceAll(oldId, newId),
  );
  bundle.sourceRunDigest = enterpriseDigest(p.sourceRun);
  bundle.findings[0].checkId = newId;
  p.report = buildEnterpriseReport(p.sourceRun, bundle);
  Object.assign(bundle, {
    decisions: [
      ...["finding", "check"].map((type) => {
        const id = type === "finding" ? "F-1" : newId;
        return {
          targetType: type,
          targetId: id,
          targetDigest: enterpriseReviewTargetDigest(p.report, type, id),
          reviewerId: "independent",
          reviewerType: "independent-ai",
          reviewedAt: "2026-11-18T12:30:00Z",
          verdict: "accept",
          reason: "Reviewed period fixture",
        };
      }),
    ],
  });
  p.report = buildEnterpriseReport(p.sourceRun, bundle);
  const policy = p.trustedAcceptancePolicies[0];
  policy.checkId = newId;
  policy.contextDigest = p.report.assessment.checkContextDigests[newId];
  Object.assign(policy.window, {
    kind: "period",
    baselineWindowId: "baseline",
    retestWindowId: "after",
    ingestionLagSeconds: 600,
  });
  x.plan = planChanges(p);
  const entry = x.plan.entries[0];
  Object.assign(x.executionReceipt, { planDigest: x.plan.planDigest });
  Object.assign(x.retestEvidence, {
    planDigest: x.plan.planDigest,
    acceptancePolicyDigest: entry.acceptance.policyDigest,
    check: { ...entry.baselineCheck, windowId: "after" },
    observedAt: "2026-11-18T16:10:00Z",
  });
  x.assessmentAt = "2026-11-18T16:15:00Z";
  expect(verifyRetest(attest(x)).status).toBe("pass");
  x.retestEvidence.observedAt = "2026-11-18T16:09:59Z";
  expect(verifyRetest(attest(x)).reason).toBe("retest-window-not-mature");
});

it("keeps verification inside the host customer and target context", () => {
  for (const key of ["customerId", "assetId", "environment"]) {
    const x = data();
    Object.assign(x.hostContext, { [key]: "different" });
    expect(verifyRetest(x).status).toBe("unknown");
  }
});
