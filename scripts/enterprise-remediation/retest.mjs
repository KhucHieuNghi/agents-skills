import { planChanges } from "./change-plan.mjs";
import {
  enterpriseDigest,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(x);
const exact = (x, keys) =>
  x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.keys(x).sort().join(",") === keys.sort().join(",");
const unknown = (reason) => ({
  status: "unknown",
  reason,
  findingResolution: "unverified",
  businessUplift: "not-assessed",
});
/** Verifies receipt bindings; host verification of source acquisition/evaluation is a separate trust prerequisite. */
export function verifyRetest(input) {
  if (
    !exact(input, [
      "plan",
      "planningInput",
      "changeId",
      "executionReceipt",
      "retestEvidence",
      "hostContext",
      "assessmentAt",
    ]) ||
    !timestampValue(input.assessmentAt)
  )
    return unknown("invalid-retest-input");
  const {
    plan,
    planningInput,
    changeId,
    executionReceipt: r,
    retestEvidence: e,
    hostContext: host,
    assessmentAt,
  } = input;
  if (
    !host ||
    ![
      "trustedAssetBindings",
      "trustedAcceptancePolicies",
      "trustedExecutionReceipts",
      "trustedRetestBindings",
    ].every((k) => Array.isArray(host[k]) && host[k].length <= 100)
  )
    return unknown("trusted-retest-context-required");
  try {
    const rebuilt = planChanges({
      ...planningInput,
      trustedAssetBindings: host.trustedAssetBindings,
      trustedAcceptancePolicies: host.trustedAcceptancePolicies,
    });
    if (enterpriseDigest(rebuilt) !== enterpriseDigest(plan))
      return unknown("plan-revalidation-mismatch");
    const entry = plan.entries.find((x) => x.changeId === changeId);
    if (!entry || entry.gaps.length || !entry.binding || !entry.acceptance)
      return unknown("plan-requirements-incomplete");
    if (
      host.customerId !== plan.customerId ||
      host.assetId !== entry.binding.assetId ||
      host.environment !== entry.binding.environment
    )
      return unknown("host-verification-scope-mismatch");
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
      !hash(r.afterDigest) ||
      ![r.startedAt, r.completedAt].every(timestampValue)
    )
      return unknown("invalid-execution-receipt");
    const receipts = host.trustedExecutionReceipts.filter(
      (x) => x?.receiptId === r.receiptId,
    );
    if (
      receipts.length !== 1 ||
      enterpriseDigest(receipts[0]) !== enterpriseDigest(r)
    )
      return unknown("execution-receipt-not-host-verified");
    const expected = {
      planDigest: plan.planDigest,
      changeId,
      customerId: plan.customerId,
      assetBindingDigest: entry.bindingDigest,
      artifactDigest: entry.artifactDigest,
      beforeDigest: entry.preconditionDigest,
      status: "applied",
    };
    if (Object.entries(expected).some(([k, v]) => r[k] !== v))
      return unknown("execution-scope-or-outcome-mismatch");
    const at = Date.parse(assessmentAt),
      start = Date.parse(r.startedAt),
      end = Date.parse(r.completedAt),
      w = entry.acceptance.policy.window;
    if (
      start < Date.parse(plan.createdAt) ||
      end < start ||
      end > at ||
      end >= Date.parse(w.start) ||
      entry.sourceEvidence.some((x) => end >= Date.parse(x.validUntil))
    )
      return unknown("execution-time-or-baseline-expiry-mismatch");
    if (
      !exact(e, [
        "receiptId",
        "executionReceiptId",
        "planDigest",
        "changeId",
        "customerId",
        "assetBindingDigest",
        "afterDigest",
        "acceptancePolicyDigest",
        "check",
        "policyVersions",
        "profileVersions",
        "observedAt",
        "validUntil",
        "windowStart",
        "windowEnd",
        "timezone",
        "filtersDigest",
        "completeness",
        "status",
        "sourceDigest",
        "evaluatorId",
        "evaluatorVersion",
      ]) ||
      !id(e.receiptId) ||
      !id(e.evaluatorId) ||
      !id(e.evaluatorVersion) ||
      !hash(e.sourceDigest) ||
      ![e.observedAt, e.validUntil, e.windowStart, e.windowEnd].every(
        timestampValue,
      ) ||
      !["pass", "fail", "unknown"].includes(e.status)
    )
      return unknown("invalid-retest-evidence");
    const attestations = host.trustedRetestBindings.filter(
      (x) => x?.receiptId === e.receiptId,
    );
    if (
      attestations.length !== 1 ||
      !exact(attestations[0], [
        "receiptId",
        "evidenceDigest",
        "evaluatorId",
        "evaluatorVersion",
      ]) ||
      attestations[0].evidenceDigest !== enterpriseDigest(e) ||
      attestations[0].evaluatorId !== e.evaluatorId ||
      attestations[0].evaluatorVersion !== e.evaluatorVersion
    )
      return unknown("retest-evaluation-not-host-verified");
    const scope = {
      executionReceiptId: r.receiptId,
      planDigest: plan.planDigest,
      changeId,
      customerId: plan.customerId,
      assetBindingDigest: entry.bindingDigest,
      afterDigest: r.afterDigest,
      acceptancePolicyDigest: entry.acceptance.policyDigest,
      windowStart: w.start,
      windowEnd: w.end,
      timezone: w.timezone,
      filtersDigest: w.filtersDigest,
      completeness: 1,
    };
    if (Object.entries(scope).some(([k, v]) => e[k] !== v))
      return unknown("retest-scope-or-completeness-mismatch");
    const expectedPolicies = Object.fromEntries(
      entry.baselineCheck.policyIds.map((key) => [
        key,
        planningInput.sourceRun.policyVersions[key] ?? null,
      ]),
    );
    if (
      enterpriseDigest(e.policyVersions) !==
        enterpriseDigest(expectedPolicies) ||
      enterpriseDigest(e.profileVersions) !==
        enterpriseDigest(planningInput.sourceRun.profileVersions)
    )
      return unknown("retest-methodology-version-mismatch");
    const mapping = entry.acceptance.policy.scenarioMapping;
    const mappedScenario = mapping
      ? mapping.retestScenarioId
      : entry.baselineCheck.scenarioId;
    const scenarioChanged = mappedScenario !== entry.baselineCheck.scenarioId;
    const check = {
      ...entry.baselineCheck,
      windowId: w.retestWindowId,
      scenarioId: mappedScenario,
    };
    if (enterpriseDigest(check) !== enterpriseDigest(e.check))
      return unknown("retest-check-or-policy-mismatch");
    const observed = Date.parse(e.observedAt),
      expires = Date.parse(e.validUntil);
    if (
      observed <= end ||
      observed > at ||
      observed < Date.parse(w.start) ||
      expires <= observed ||
      at >= expires
    )
      return unknown("retest-observation-not-current");
    if (
      w.kind === "point"
        ? observed >= Date.parse(w.end) ||
          observed < end + w.ingestionLagSeconds * 1000
        : observed < Date.parse(w.end) + w.ingestionLagSeconds * 1000
    )
      return unknown("retest-window-not-mature");
    return {
      status: e.status,
      reason: "host-verified-scoped-retest-receipts",
      scenarioEquivalence: scenarioChanged
        ? "not-verified"
        : "unchanged-identifier",
      baselineScenarioId: entry.baselineCheck.scenarioId,
      retestScenarioId: mappedScenario,
      findingResolution: scenarioChanged
        ? "original-scenario-unverified"
        : e.status === "pass"
          ? "pending-independent-review"
          : e.status === "fail"
            ? "open"
            : "unverified",
      businessUplift: "not-assessed",
      customerId: plan.customerId,
      assetId: entry.binding.assetId,
      environment: entry.binding.environment,
      entityId: entry.entityId,
      planDigest: plan.planDigest,
      changeId,
      executionReceiptId: r.receiptId,
      retestReceiptId: e.receiptId,
      sourceDigest: e.sourceDigest,
      acceptancePolicyDigest: entry.acceptance.policyDigest,
      assessedAt: assessmentAt,
    };
  } catch {
    return unknown("retest-validation-failed");
  }
}
