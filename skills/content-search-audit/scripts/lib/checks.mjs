const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
const dimensions = new Set([
  "quality",
  "seo",
  "aio",
  "aeo",
  "geo",
  "portfolio",
]);
const modes = new Set(["semantic", "text-nonempty", "http-status"]);
export function validateRegistry(registry) {
  if (
    !registry ||
    registry.schemaVersion !== 1 ||
    !nonempty(registry.version) ||
    !Array.isArray(registry.rules) ||
    !registry.rules.length
  )
    throw new Error("Invalid rule registry");
  const ids = new Set();
  for (const rule of registry.rules) {
    if (!rule || !nonempty(rule.ruleId) || ids.has(rule.ruleId))
      throw new Error("Invalid or duplicate rule ID");
    ids.add(rule.ruleId);
    if (!dimensions.has(rule.dimension) || !modes.has(rule.mode))
      throw new Error("Invalid rule dimension or mode");
    for (const field of [
      "applicability",
      "evidenceTier",
      "procedure",
      "limitations",
      "method",
    ])
      if (!nonempty(rule[field])) throw new Error(`Missing rule ${field}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.lastReviewedAt))
      throw new Error("Invalid rule review date");
    if (
      !Array.isArray(rule.requiredEvidence) ||
      !rule.requiredEvidence.length ||
      rule.requiredEvidence.some((kind) => !nonempty(kind)) ||
      new Set(rule.requiredEvidence).size !== rule.requiredEvidence.length
    )
      throw new Error("Invalid required evidence");
    if (
      !Array.isArray(rule.authoritativeSources) ||
      !rule.authoritativeSources.length ||
      rule.authoritativeSources.some(
        (source) => !nonempty(source) || !source.startsWith("https://"),
      )
    )
      throw new Error("Missing rule source context");
  }
  return registry;
}
export function createCheckPlan(item, registry) {
  validateRegistry(registry);
  if (!item || !nonempty(item.itemId))
    throw new Error("Item identity required");
  return {
    itemId: item.itemId,
    registryVersion: registry.version,
    requiredRuleIds:
      item.state === "excluded"
        ? []
        : registry.rules.map((rule) => rule.ruleId),
  };
}
/** Deterministic evidence checks only. Host review must explicitly resolve semantic
 * applicability and findings; evidence presence alone never passes a semantic rule. */
export function evaluateChecks(item, evidence, registry) {
  const plan = createCheckPlan(item, registry);
  if (!Array.isArray(evidence)) throw new Error("Evidence array required");
  const ids = new Set();
  for (const record of evidence) {
    if (
      !record ||
      !nonempty(record.evidenceId) ||
      !nonempty(record.itemId) ||
      !nonempty(record.kind)
    )
      throw new Error("Invalid evidence identity");
    if (ids.has(record.evidenceId)) throw new Error("Duplicate evidence ID");
    ids.add(record.evidenceId);
  }
  return registry.rules
    .filter((rule) => plan.requiredRuleIds.includes(rule.ruleId))
    .map((rule) => {
      const matching = evidence.filter(
        (record) =>
          record.itemId === item.itemId &&
          rule.requiredEvidence.includes(record.kind),
      );
      const missing = rule.requiredEvidence.filter(
        (kind) => !matching.some((record) => record.kind === kind),
      );
      const result = {
        itemId: item.itemId,
        ruleId: rule.ruleId,
        dimension: rule.dimension,
        status: "unknown",
        evidenceIds: matching.map((record) => record.evidenceId).sort(),
        dependencies: [item.itemId],
        reason: "Semantic review and applicability assessment required",
      };
      if (missing.length) {
        result.reason = `Missing required evidence: ${missing.join(", ")}`;
        return result;
      }
      if (rule.mode === "semantic") return result;
      if (matching.length !== 1) {
        result.reason =
          "Multiple snapshots require explicit selection or reconciliation";
        return result;
      }
      const value = matching[0].value;
      if (rule.mode === "text-nonempty") {
        if (typeof value !== "string") {
          result.reason = "Extracted text evidence is malformed";
          return result;
        }
        result.status = value.trim() ? "pass" : "fail";
        result.reason = value.trim()
          ? "Supplied text extraction is nonempty; content quality remains separately assessed"
          : "Supplied text extraction is empty; verify extraction fidelity before a content finding";
      } else if (rule.mode === "http-status") {
        if (
          !value ||
          !Number.isInteger(value.status) ||
          value.status < 100 ||
          value.status > 599
        ) {
          result.reason = "HTTP response evidence is malformed";
          return result;
        }
        if ([401, 403, 429].includes(value.status)) {
          result.reason = `Captured HTTP status ${value.status} is an access or rate-limit barrier; verify intended access and repeat an authorized capture before assessing a page defect.`;
          return result;
        }
        result.status =
          value.status >= 200 && value.status < 300
            ? "pass"
            : value.status >= 400
              ? "fail"
              : "unknown";
        result.reason = `Captured HTTP status ${value.status}; this does not establish index status or rendered content. Nonfinal responses require follow-up.`;
      }
      return result;
    });
}

/** Validates supplied host assessments. It does not adjudicate semantic truth. */
export function mergeReviewedChecks(item, evidence, registry, reviews) {
  const results = evaluateChecks(item, evidence, registry);
  if (!Array.isArray(reviews)) throw new Error("Reviews array required");
  const seen = new Set();
  const byEvidence = new Map(
    evidence.map((record) => [record.evidenceId, record]),
  );
  for (const review of reviews) {
    const rule = registry.rules.find(
      (candidate) => candidate.ruleId === review?.ruleId,
    );
    const result = results.find(
      (candidate) => candidate.ruleId === review?.ruleId,
    );
    if (!rule || !result)
      throw new Error("Review references an unplanned rule");
    if (seen.has(review.ruleId)) throw new Error("Duplicate rule review");
    seen.add(review.ruleId);
    if (
      !["pass", "fail", "unknown", "not-applicable"].includes(review.status) ||
      !nonempty(review.reason) ||
      !nonempty(review.reviewer) ||
      !nonempty(review.reviewedAt) ||
      !Number.isFinite(Date.parse(review.reviewedAt))
    )
      throw new Error("Invalid review status or attribution");
    if (
      !Array.isArray(review.evidenceIds) ||
      new Set(review.evidenceIds).size !== review.evidenceIds.length ||
      (review.status !== "unknown" && !review.evidenceIds.length)
    )
      throw new Error("Review requires evidence");
    const referenced = review.evidenceIds.map((id) => {
      const record = byEvidence.get(id);
      if (!record || record.itemId !== item.itemId)
        throw new Error("Invalid review evidence reference");
      return record;
    });
    if (["pass", "fail"].includes(review.status)) {
      if (rule.mode !== "semantic")
        throw new Error(
          "Host review cannot override a deterministic outcome; reconcile evidence instead",
        );
      if (
        rule.requiredEvidence.some(
          (kind) => !referenced.some((record) => record.kind === kind),
        )
      )
        throw new Error("Review is missing required evidence");
    }
    Object.assign(result, {
      status: review.status,
      reason: review.reason,
      evidenceIds: [...review.evidenceIds].sort(),
      reviewer: review.reviewer,
      reviewedAt: review.reviewedAt,
    });
  }
  return results;
}
