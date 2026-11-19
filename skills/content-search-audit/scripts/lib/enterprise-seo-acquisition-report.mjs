import { inspectEnterpriseTechnicalSeoAcquisitions } from "./technical-seo/acquisition-workflow.mjs";

/** Acquisition availability only; semantic SEO assessment has its own owner. */
export function projectStoredSeoAcquisitions(run) {
  const inspected = inspectEnterpriseTechnicalSeoAcquisitions(run);
  const observations = [],
    narrative = [];
  for (const p of inspected.projections) {
    if (
      p.current &&
      Date.parse(p.assessmentAt) !== Date.parse(run.assessmentAt)
    )
      throw Error(
        "Reassess SEO acquisition at the final run time before report assembly",
      );
    observations.push({
      observationId: `seo-acquisition-count-${p.evidenceId}`,
      label: "Supplied acquisition attempt records",
      value: p.sourceCount,
      unit: "records",
      precision: "exact",
      classification: p.current ? "current" : "historical",
      period: {
        from: p.assessmentAt.slice(0, 10),
        to: p.assessmentAt.slice(0, 10),
      },
      scopeDescription:
        "Retained supplied acquisition records in this projection; not independent executions, tested URLs, SEO findings or successful collections.",
      evidenceIds: [p.evidenceId],
    });
    narrative.push({
      narrativeId: `seo-acquisition-${p.evidenceId}`,
      kind: "limitation",
      text: `${p.current ? "Current" : "Historical"} supplied SEO acquisition projection at ${p.assessmentAt}: capture availability ${p.availability === "pass" ? "available" : "unknown"}, including ${p.syntheticCount} synthetic attempt records. Selection uses capture availability and time only, never the most favorable semantic SEO verdict. Historical projections can share source records; their counts must not be summed as independent collections. Availability does not establish indexing, canonical acceptance, rich results, ranking, business outcomes or authenticated collector execution. Request lifecycle remains separate; an available capture does not override a declined or invalid request.`,
      evidenceIds: [p.evidenceId],
    });
  }
  return { ...inspected, observations, narrative, findings: [] };
}
