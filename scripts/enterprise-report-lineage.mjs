import {
  validateEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report-model.mjs";
import {
  enterpriseDigest,
  stableJson,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const collections = {
  finding: "findings",
  action: "actions",
  observation: "observations",
  narrative: "narrative",
};
const decisionKey = (d) => `${d.targetType}:${d.targetId}`;
const targets = (report) =>
  new Set([
    ...report.assessment.checks
      .filter((c) => c.status !== "unknown")
      .map((c) => `check:${c.checkId}`),
    ...Object.entries(collections).flatMap(([type, key]) =>
      report[key].map((v) => `${type}:${v[`${type}Id`]}`),
    ),
  ]);

/** Private loss-detection only. Returned metadata has no storage/disclosure authority. */
export function inspectReportTransition(parent, next) {
  validateEnterpriseReport(parent);
  validateEnterpriseReport(next);
  assert(
    parent.edition === "customer" && next.edition === "customer",
    "Private report transition requires customer editions",
  );
  assert(
    next.parentReportDigest === enterpriseDigest(parent),
    "Invalid report parent binding",
  );
  assert(
    parent.assessment.customerId === next.assessment.customerId &&
      (parent.assessment.runId === next.assessment.runId ||
        next.assessment.parentRunIds?.includes(parent.assessment.runId)),
    "Invalid report parent lineage",
  );
  assert(
    parent.assessment.runId !== next.assessment.runId ||
      parent.sourceRunDigest === next.sourceRunDigest,
    "Same source run cannot be rewritten",
  );
  assert(
    parent.revisionId !== next.revisionId &&
      Date.parse(next.generatedAt) > Date.parse(parent.generatedAt),
    "Invalid report revision time or identity",
  );
  const items = [],
    additions = [];
  for (const [type, key] of Object.entries(collections)) {
    const idKey = `${type}Id`;
    const current = new Map(next[key].map((item) => [item[idKey], item]));
    const previous = new Set(parent[key].map((item) => item[idKey]));
    for (const prior of parent[key]) {
      const item = current.get(prior[idKey]);
      const demoted =
        type === "observation" &&
        prior.classification === "current" &&
        item?.classification === "historical" &&
        stableJson({ ...item, classification: "current" }) ===
          stableJson(prior);
      items.push({
        type,
        id: prior[idKey],
        previousDigest: enterpriseDigest(prior),
        nextDigest: item ? enterpriseDigest(item) : null,
        state: !item
          ? "removed"
          : stableJson(item) === stableJson(prior)
            ? "retained"
            : demoted
              ? "historical"
              : "changed",
      });
    }
    for (const item of next[key])
      if (!previous.has(item[idKey]))
        additions.push({
          type,
          id: item[idKey],
          digest: enterpriseDigest(item),
        });
  }
  const nextTargets = targets(next);
  const decisions = parent.decisions.map((prior) => {
    const key = decisionKey(prior),
      reasons = [];
    if (!nextTargets.has(key)) reasons.push("target-removed");
    else if (
      enterpriseReviewTargetDigest(next, prior.targetType, prior.targetId) !==
      prior.targetDigest
    )
      reasons.push("target-context-changed");
    if (Date.parse(prior.reviewedAt) < Date.parse(next.assessment.assessmentAt))
      reasons.push("review-predates-assessment");
    if (prior.reviewerId === next.authorId) reasons.push("reviewer-is-author");
    const replacement = next.decisions.find((d) => decisionKey(d) === key);
    const carried =
      replacement && stableJson(replacement) === stableJson(prior);
    return {
      targetType: prior.targetType,
      targetId: prior.targetId,
      previousDigest: enterpriseDigest(prior),
      nextDigest: replacement ? enterpriseDigest(replacement) : null,
      state: carried
        ? "carried"
        : replacement
          ? "replaced"
          : reasons.length
            ? "stale"
            : "missing-valid",
      priorEligibility: reasons.length ? "stale" : "eligible",
      reasons,
    };
  });
  return {
    audience: "private",
    itemStateMeaning:
      "Content equality only; retained does not establish current dependency validity, disclosure rights or remediation.",
    persistenceAuthorized: false,
    historyPreserved: false,
    parentReportDigest: enterpriseDigest(parent),
    nextReportDigest: enterpriseDigest(next),
    items,
    additions,
    decisions,
    decisionAdditions: next.decisions
      .filter(
        (d) => !parent.decisions.some((p) => decisionKey(p) === decisionKey(d)),
      )
      .map((d) => ({
        targetType: d.targetType,
        targetId: d.targetId,
        digest: enterpriseDigest(d),
      })),
  };
}
