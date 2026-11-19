import { inspectEnterpriseBrowserCaptures } from "./enterprise-browser-workflow.mjs";

/** Development acquisition projection; availability is never assessment acceptance. */
export function projectStoredBrowserCaptures(run) {
  const inspected = inspectEnterpriseBrowserCaptures(run);
  return {
    observations: inspected.observations,
    findings: [],
    narrative: inspected.captures.map((c) => ({
      narrativeId: `browser-capture-${c.evidenceId}`,
      kind: "limitation",
      text: `${c.synthetic ? "Synthetic" : "Supplied non-synthetic"} browser capture completed at ${c.observedAt}, imported at ${c.importedAt}; ${c.fresh ? "within capture freshness window" : "expired"} at this assessment. Counts and dimensions describe supplied acquisition records, not independent executions, usability, accessibility conformance, consent compliance, Core Web Vitals or business outcomes. Collector execution is not authenticated. Capture availability does not fulfill unrelated evidence requests or override refusal and invalid states.`,
      evidenceIds: [c.evidenceId],
    })),
  };
}
