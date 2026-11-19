import { inspectEnterprisePerformance } from "../../skills/content-search-audit/scripts/lib/enterprise-performance-workflow.mjs";

/** Development projector using only complete, replay-validated source inventory. */
export function projectStoredPerformance(run) {
  const inspected = inspectEnterprisePerformance(run),
    observations = [],
    narrative = [],
    findings = [];
  for (const evaluation of inspected.evaluations) {
    if (
      evaluation.current &&
      Date.parse(evaluation.observedAt) !== Date.parse(run.assessmentAt)
    )
      throw Error(
        "Reassess performance evidence at the final run time before report assembly",
      );
    observations.push(...evaluation.observations);
    narrative.push({
      narrativeId: `performance-${evaluation.evidenceId}`,
      kind: "limitation",
      text: `${evaluation.current ? "Current" : "Historical"} supplied ${evaluation.kind} evaluation at ${evaluation.observedAt}. Source-only replay does not authenticate the provider or restore collector execution authority. Field and lab populations remain separate; lab TBT is not field INP. Historical measurements do not assert current website state. No ranking, revenue or causal effect is established.`,
      evidenceIds: [evaluation.evidenceId],
    });
    if (!evaluation.current || evaluation.kind !== "crux") continue;
    for (const c of run.checks.filter(
      (c) =>
        evaluation.checkIds.includes(c.checkId) &&
        c.status === "fail" &&
        !c.ruleId.endsWith("cwv-all-three-v1"),
    ))
      findings.push({
        findingId: `performance-${c.checkId}`,
        checkId: c.checkId,
        evidenceIds: c.evidenceIds,
        severity: "medium",
        confidence: "low",
        title: "Scoped field performance threshold exceeded",
        description: c.reason,
        businessImpact:
          "The supplied field population exceeds a declared good threshold; impact on revenue, conversion or ranking has not been measured.",
        recommendation:
          "Independently confirm the source scope and metric, investigate representative traces, and prioritize the cause supported by evidence.",
        verification:
          "Repeat comparable field measurement after an authorized change; retain before/after periods and do not infer causality from the comparison alone.",
      });
  }
  return { observations, narrative, findings };
}
