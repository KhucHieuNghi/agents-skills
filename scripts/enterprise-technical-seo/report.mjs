import { inspectEnterpriseTechnicalSeo } from "../../skills/content-search-audit/scripts/lib/technical-seo/workflow.mjs";

/** Development projection from complete replay inventory; never an index/ranking guarantee. */
export function projectStoredTechnicalSeo(run) {
  const inspected = inspectEnterpriseTechnicalSeo(run),
    observations = [],
    narrative = [],
    findings = [];
  for (const evaluation of inspected.evaluations) {
    if (
      evaluation.current &&
      Date.parse(evaluation.observedAt) !== Date.parse(run.assessmentAt)
    )
      throw Error(
        "Reassess technical SEO evidence at the final run time before report assembly",
      );
    observations.push(...evaluation.observations);
    narrative.push({
      narrativeId: `technical-seo-${evaluation.evidenceId}`,
      kind: "limitation",
      text: `${evaluation.current ? "Current" : "Historical"} supplied ${evaluation.kind} evaluation at ${evaluation.observedAt}. ${evaluation.policyDiffersFromCurrent ? "Assessment policy differs from the current evaluation; changed expectations do not demonstrate a website correction. " : ""}${evaluation.checkSetDiffersFromCurrent ? "The declared check set differs from the current evaluation; removed targets or obligations are not resolved failures. " : ""}Local captures do not establish provider indexing or Google-selected canonical. URL Inspection is a provider snapshot, not a live URL test. Hreflang and target controls do not establish content equivalence; JSON-LD checks do not guarantee rich results. Historical evidence does not assert current website state. No ranking or revenue effect is established.`,
      evidenceIds: [evaluation.evidenceId],
    });
    if (!evaluation.current) continue;
    const currentFindings = run.checks
      .filter(
        (c) => evaluation.checkIds.includes(c.checkId) && c.status === "fail",
      )
      .map((c) => ({
        findingId: `canonical-${c.checkId}`,
        checkId: c.checkId,
        evidenceIds: c.evidenceIds,
        severity: "medium",
        confidence: "low",
        title: `Technical SEO check failed: ${c.ruleId}`,
        description: c.reason,
        businessImpact:
          "Impact on users and business outcomes is unquantified; no site-wide indexing, ranking or revenue claim.",
        recommendation:
          "Independently confirm the cited source, tested state and interpretation before prioritizing a scoped correction.",
        verification:
          "Retest the same authorized URL, profile and state; retain original evidence and obtain a fresh independent verdict.",
      }));
    findings.push(...currentFindings);
  }
  return { observations, narrative, findings };
}
