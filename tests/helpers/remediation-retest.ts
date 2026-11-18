import { setup } from "./remediation-preparation.js";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
export function data() {
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
export function attest(x: ReturnType<typeof data>) {
  x.hostContext.trustedExecutionReceipts = [
    structuredClone(x.executionReceipt),
  ];
  x.hostContext.trustedRetestBindings[0].evidenceDigest = enterpriseDigest(
    x.retestEvidence,
  );
  return x;
}
