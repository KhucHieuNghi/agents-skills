import { bindAcceptancePolicy } from "./acceptance-policy.mjs";
import {
  validateEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import {
  validateEnterpriseRun,
  enterpriseDigest,
  enterpriseCheckContextDigest,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(x);
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
function exact(x, keys) {
  if (
    !x ||
    typeof x !== "object" ||
    Array.isArray(x) ||
    Object.keys(x).sort().join(",") !== [...keys].sort().join(",")
  )
    throw new Error("Invalid change-plan fields");
}
const fail = (message) => {
  throw new Error(message);
};
/** Draft only. Host supplies mappings separately from imports. No action is authorized here. */
export function planChanges(input) {
  exact(input, [
    "planId",
    "assessmentAt",
    "report",
    "sourceRun",
    "proposals",
    "trustedAssetBindings",
    ...(Object.hasOwn(input, "trustedAcceptancePolicies")
      ? ["trustedAcceptancePolicies"]
      : []),
  ]);
  const { report, sourceRun, proposals, trustedAssetBindings, assessmentAt } =
    input;
  if (!id(input.planId) || !timestampValue(assessmentAt))
    fail("Invalid plan identity/time");
  validateEnterpriseRun(sourceRun);
  validateEnterpriseReport(report);
  if (
    enterpriseDigest(sourceRun) !== report.sourceRunDigest ||
    report.assessment.customerId !== sourceRun.customerId
  )
    fail("Report source-run mismatch");
  if (Date.parse(assessmentAt) < Date.parse(report.generatedAt))
    fail("Future report");
  if (
    !Array.isArray(proposals) ||
    !proposals.length ||
    proposals.length > 100 ||
    !Array.isArray(trustedAssetBindings) ||
    trustedAssetBindings.length > 100
  )
    fail("Invalid plan collection budget");
  const policies = input.trustedAcceptancePolicies ?? [];
  if (
    !Array.isArray(policies) ||
    policies.length > 100 ||
    new Set(policies.map((p) => p?.policyRef)).size !== policies.length
  )
    fail("Invalid or duplicate acceptance policy list");
  const bindings = new Map();
  for (const b of trustedAssetBindings) {
    exact(b, [
      "bindingRef",
      "customerId",
      "entityId",
      "entityDigest",
      "assetId",
      "environment",
    ]);
    if (
      ![b.bindingRef, b.entityId, b.assetId, b.environment].every(id) ||
      !hash(b.entityDigest) ||
      b.customerId !== sourceRun.customerId ||
      bindings.has(b.bindingRef)
    )
      fail("Invalid or foreign asset binding");
    const entity = sourceRun.entities.find((e) => e.entityId === b.entityId);
    if (!entity || enterpriseDigest(entity) !== b.entityDigest)
      fail("Asset entity binding mismatch");
    bindings.set(b.bindingRef, b);
  }
  const changes = new Map();
  for (const p of proposals) {
    exact(p, [
      "changeId",
      "findingId",
      "bindingRef",
      "ownerRole",
      "artifactDigest",
      "preconditionDigest",
      "rollbackDigest",
      "dependencies",
      ...(Object.hasOwn(p, "acceptancePolicyRef")
        ? ["acceptancePolicyRef"]
        : []),
    ]);
    if (
      !id(p.changeId) ||
      !id(p.findingId) ||
      (p.bindingRef !== null && !id(p.bindingRef)) ||
      typeof p.ownerRole !== "string" ||
      !p.ownerRole.trim() ||
      p.ownerRole.length > 256 ||
      changes.has(p.changeId)
    )
      fail("Invalid change identity or owner");
    for (const key of [
      "artifactDigest",
      "preconditionDigest",
      "rollbackDigest",
    ])
      if (p[key] !== null && !hash(p[key])) fail("Invalid artifact digest");
    if (
      !Array.isArray(p.dependencies) ||
      p.dependencies.length > 100 ||
      p.dependencies.some((x) => !id(x)) ||
      new Set(p.dependencies).size !== p.dependencies.length
    )
      fail("Invalid dependency list");
    if (
      p.acceptancePolicyRef !== undefined &&
      p.acceptancePolicyRef !== null &&
      !id(p.acceptancePolicyRef)
    )
      fail("Invalid acceptance policy reference");
    changes.set(p.changeId, p);
  }
  const visiting = new Set(),
    visited = new Set();
  function visit(key) {
    if (visiting.has(key)) fail("Cyclic change dependency");
    if (visited.has(key)) return;
    const p = changes.get(key);
    if (!p) fail("Unresolved change dependency");
    visiting.add(key);
    p.dependencies.forEach(visit);
    visiting.delete(key);
    visited.add(key);
  }
  changes.forEach((_p, key) => visit(key));
  const entries = proposals.map((p) => {
    const finding = report.findings.find((f) => f.findingId === p.findingId);
    if (!finding) fail("Unresolved finding");
    const check = sourceRun.checks.find((c) => c.checkId === finding.checkId);
    if (!check || check.status !== "fail")
      fail("Finding is not a failed source check");
    const entity = sourceRun.entities.find(
        (e) => e.entityId === check.entityId,
      ),
      binding = bindings.get(p.bindingRef);
    if (binding && binding.entityId !== check.entityId)
      fail("Finding asset mismatch");
    const projected = report.assessment.checks.find(
      (c) => c.checkId === check.checkId,
    );
    const fields = [
      "checkId",
      "moduleId",
      "ruleId",
      "ruleVersion",
      "entityId",
      "scenarioId",
      "windowId",
      "status",
      "evidenceIds",
      "dependencies",
      "policyIds",
      "assessedAt",
    ];
    const pick = (value, keys) =>
      Object.fromEntries(keys.map((key) => [key, value[key]]));
    if (
      !projected ||
      enterpriseDigest(pick(projected, fields)) !==
        enterpriseDigest(pick(check, fields))
    )
      fail("Report/source check mismatch");
    const contextDigest = enterpriseCheckContextDigest(
      sourceRun,
      check.checkId,
    );
    if (report.assessment.checkContextDigests[check.checkId] !== contextDigest)
      fail("Report/source context mismatch");
    const gaps = [],
      requests = [];
    const gap = (reason, requestedArtifact) => {
      gaps.push(reason);
      requests.push({
        reason,
        ownerRole: p.ownerRole,
        requestedArtifact,
        acceptedFormats: ["reviewed-json-artifact"],
        fallback: "Keep draft; no execution or resolution is inferred",
      });
    };
    const reviewDigests = {};
    for (const [type, targetId] of [
      ["finding", finding.findingId],
      ["check", check.checkId],
    ]) {
      const digest = enterpriseReviewTargetDigest(report, type, targetId);
      reviewDigests[type] = digest;
      if (
        !report.decisions.some(
          (d) =>
            d.targetType === type &&
            d.targetId === targetId &&
            d.targetDigest === digest &&
            d.verdict === "accept",
        )
      )
        gap(
          type + "-review-required",
          "Independent accepted verdict for the current " +
            type +
            " and its evidence",
        );
    }
    if (!binding)
      gap(
        "asset-mapping-required",
        "Host-confirmed entity to asset/environment mapping",
      );
    for (const [field, reason] of [
      ["artifactDigest", "proposed-artifact-required"],
      ["preconditionDigest", "precondition-artifact-required"],
      ["rollbackDigest", "rollback-artifact-required"],
    ])
      if (p[field] === null)
        gap(
          reason,
          "Original artifact bytes and their SHA-256 digest for " + field,
        );
    const sourceEvidence = [
      ...new Set([
        ...finding.evidenceIds,
        ...check.dependencies,
        ...check.evidenceIds,
      ]),
    ].map((evidenceId) => {
      const evidence = sourceRun.evidence.find(
        (e) => e.evidenceId === evidenceId,
      );
      if (!evidence) fail("Unresolved source evidence");
      const safeFields = [
        "evidenceId",
        "customerId",
        "runId",
        "entityId",
        "digest",
        "observedAt",
        "validUntil",
      ];
      const reportEvidence = report.assessment.evidence.find(
        (e) => e.evidenceId === evidenceId,
      );
      if (
        !reportEvidence ||
        enterpriseDigest(pick(reportEvidence, safeFields)) !==
          enterpriseDigest(pick(evidence, safeFields))
      )
        fail("Report/source evidence mismatch");
      return pick(evidence, safeFields);
    });
    if (
      sourceEvidence.some(
        (e) =>
          !timestampValue(e.validUntil) ||
          Date.parse(assessmentAt) >= Date.parse(e.validUntil) ||
          Date.parse(e.observedAt) > Date.parse(assessmentAt),
      )
    )
      gap(
        "fresh-source-evidence-required",
        "Fresh source evidence in the original check scope before execution",
      );
    const selectedPolicy = policies.find(
      (policy) => policy?.policyRef === p.acceptancePolicyRef,
    );
    const acceptance =
      selectedPolicy && binding
        ? bindAcceptancePolicy(selectedPolicy, {
            customerId: sourceRun.customerId,
            checkId: check.checkId,
            contextDigest,
            assetBindingDigest: enterpriseDigest(binding),
            assessmentAt,
            authorId: report.authorId,
            earliestReviewAt: report.generatedAt,
            baselineWindowId: check.windowId,
            baselineScenarioId: check.scenarioId,
          })
        : null;
    if (!acceptance)
      gap(
        "acceptance-policy-required",
        "Host-confirmed reviewed acceptance predicates and explicit baseline/retest window mapping; planner does not infer acceptance from recommendation text",
      );
    return {
      ...p,
      entityId: check.entityId,
      entityDigest: enterpriseDigest(entity),
      binding: binding ? { ...binding } : null,
      bindingDigest: binding ? enterpriseDigest(binding) : null,
      checkId: check.checkId,
      reviewDigests,
      acceptance,
      sourceEvidence,
      baselineCheck: {
        moduleId: check.moduleId,
        ruleId: check.ruleId,
        ruleVersion: check.ruleVersion,
        entityId: check.entityId,
        scenarioId: check.scenarioId,
        windowId: check.windowId,
        policyIds: [...check.policyIds],
      },
      status: "draft",
      executionAllowed: false,
      gaps,
      dataRequests: requests,
    };
  });
  const plan = {
    schemaFamily: "enterprise-change-plan",
    schemaVersion: 2,
    planId: input.planId,
    createdAt: assessmentAt,
    customerId: sourceRun.customerId,
    reportDigest: enterpriseDigest(report),
    sourceRunDigest: report.sourceRunDigest,
    entries,
    limitations: [
      "Draft with optional bound acceptance policy; approvals, dispatch and retest are not implemented",
      "Hashes bind supplied bytes, not their authenticity",
      "Host mappings must come from trusted session state, never imported report content",
      "No external mutation or finding resolution is performed",
    ],
  };
  return globalThis.structuredClone({
    ...plan,
    planDigest: enterpriseDigest(plan),
  });
}
