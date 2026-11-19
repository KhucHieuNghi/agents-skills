import { inspectEnterpriseAccessibility } from "../enterprise-accessibility-workflow.mjs";

/** Development adapter: source replay is not site-wide accessibility conformance. */
export function projectStoredAccessibility(run) {
  const inspected = inspectEnterpriseAccessibility(run),
    observations = [],
    narrative = [],
    findings = [];
  for (const evaluation of inspected.evaluations) {
    if (
      evaluation.current &&
      Date.parse(evaluation.observedAt) !== Date.parse(run.assessmentAt)
    )
      throw Error(
        "Reassess accessibility evidence at the final run time before report assembly",
      );
    observations.push(...evaluation.observations);
    narrative.push({
      narrativeId: `accessibility-${evaluation.evidenceId}`,
      kind: "limitation",
      text: `${evaluation.current ? "Current" : "Historical"} supplied ${evaluation.kind} evaluation at ${evaluation.observedAt}. Coverage is limited to declared rules, states, viewports and observation windows. Supplied counts are not independent executions or a quality score. Full manual coverage remains unknown; no site-wide WCAG conformance or authenticated execution is established. Historical failures do not assert current website state.`,
      evidenceIds: [evaluation.evidenceId],
    });
    if (!evaluation.current) continue;
    const currentFindings = run.checks
      .filter(
        (c) => evaluation.checkIds.includes(c.checkId) && c.status === "fail",
      )
      .map((c) => ({
        findingId: `accessibility-${c.checkId}`,
        checkId: c.checkId,
        evidenceIds: c.evidenceIds,
        severity: "medium",
        confidence: "low",
        title:
          c.moduleId === "ux-cro"
            ? "Supplied journey diagnostic requires investigation"
            : "Supplied accessibility check reports a scoped failure",
        description: c.reason,
        businessImpact:
          "Impact on users and business outcomes is unquantified; no site-wide conformance or revenue claim.",
        recommendation:
          "Independently confirm the cited source, tested state and interpretation before prioritizing a scoped correction.",
        verification:
          "Retest the same authorized state, viewport and protocol; retain original evidence and obtain a fresh independent verdict.",
      }));
    findings.push(...currentFindings);
  }
  return { observations, narrative, findings };
}
