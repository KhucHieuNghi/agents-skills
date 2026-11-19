import { inspectEnterpriseMeasurement } from "../../skills/content-search-audit/scripts/lib/measurement-assessment/workflow.mjs";

/** Consume only module-owned replay inventory; raw inputs are never report fields. */
export function projectStoredMeasurement(run) {
  const inspected = inspectEnterpriseMeasurement(run);
  const observations = [],
    narrative = [],
    findings = [];
  for (const base of inspected.verifiedBases) {
    if (
      base.current &&
      Date.parse(base.observedAt) !== Date.parse(run.assessmentAt)
    )
      throw Error(
        "Reassess measurement evidence at the final run time before report assembly",
      );
    observations.push({
      observationId: `measurement-${base.evidenceId}`,
      label: "Retained supplied measurement evaluation",
      value: 1,
      unit: "evaluation object",
      classification: base.current ? "current" : "historical",
      precision: "exact",
      period: {
        from: base.observedAt.slice(0, 10),
        to: base.observedAt.slice(0, 10),
      },
      scopeDescription:
        "Evaluation-object accounting, not independent observations, all supporting artifacts, conversions or accepted outcomes.",
      evidenceIds: [base.evidenceId],
    });
    narrative.push({
      narrativeId: `measurement-${base.evidenceId}`,
      kind: "limitation",
      text: `${base.current ? "Current" : "Historical"} supplied ${base.kind} evaluation at ${base.observedAt}. ${base.current ? "Scoped checks and candidate findings require independent review." : "Retained history does not resolve superseded obligations; their unknown checks and data requests remain."} Supplied configuration and contracts do not authenticate providers or owners and do not prove runtime delivery, accepted business outcomes or financial impact.`,
      evidenceIds: [base.evidenceId],
    });
    if (!base.current) continue;
    const record = inspected.evaluations.find(
      (e) => e.evidenceId === base.evidenceId,
    );
    for (const c of run.checks.filter(
      (c) => record.activeCheckIds.includes(c.checkId) && c.status === "fail",
    ))
      findings.push({
        findingId: `measurement-assessment-${c.checkId}`,
        checkId: c.checkId,
        evidenceIds: c.evidenceIds,
        severity: "medium",
        confidence: "low",
        title: "Supplied measurement configuration mismatch",
        description: `${base.kind}: ${c.reason}. This is a supplied-evidence assessment pending independent review.`,
        businessImpact:
          "A declared configuration or mapping requirement is not met by supplied evidence; actual delivery, accepted outcomes and financial impact are unverified.",
        recommendation:
          "Confirm the owner requirement and original source, then investigate the affected configuration or mapping before authorizing a change.",
        verification:
          "Acquire fresh scoped evidence after an authorized change, rerun the assessment and independently review the result; do not infer runtime or business success from configuration alone.",
      });
  }
  return { observations, narrative, findings };
}
