import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { inspectEnterpriseRuntime } from "../skills/content-search-audit/scripts/lib/enterprise-runtime-workflow.mjs";

/** Private-safe projection after module-owned replay; no cached finding authority. */
export function projectStoredRuntime(run) {
  const inspected = inspectEnterpriseRuntime(run);
  const active = new Map(inspected.evaluations.map((e) => [e.evidenceId, e]));
  for (const record of inspected.evaluations) {
    const evidence = run.evidence.find(
      (e) => e.evidenceId === record.evidenceId,
    );
    if (Date.parse(evidence.observedAt) !== Date.parse(run.assessmentAt))
      throw Error(
        "Reassess runtime evidence at the final run time before report assembly",
      );
  }
  const observations = [],
    narrative = [],
    findings = [];
  for (const evidence of run.evidence.filter(
    (e) =>
      active.has(e.evidenceId) ||
      (["tracking-evaluation", "consent-evaluation"].includes(e.artifactType) &&
        !e.evidenceId.startsWith("runtime-check-")),
  )) {
    // Inspection above validates every parent/derived graph, including history.
    const content = evidence.content;
    const current = active.has(evidence.evidenceId);
    const classification =
      content.sources.length === 0
        ? "unknown-source-classification"
        : content.sources.every((s) => s.synthetic)
          ? "synthetic"
          : "real-declared";
    const reference = enterpriseDigest([
      evidence.evidenceId,
      "source-accounting",
    ]);
    observations.push({
      observationId: `runtime-${reference}`,
      label: `Supplied ${content.kind} source envelope count`,
      value: content.sources.length,
      unit: "supplied source envelopes",
      classification: current ? "current" : "historical",
      precision: "exact",
      period: {
        from: evidence.observedAt.slice(0, 10),
        to: evidence.observedAt.slice(0, 10),
      },
      scopeDescription: `${classification}; source envelope accounting, not independent executions, conversion count, legal compliance or complete tracking coverage.`,
      evidenceIds: [evidence.evidenceId],
    });
    narrative.push({
      narrativeId: `runtime-${reference}`,
      kind: "observation",
      text: `${current ? "Current" : "Historical"} supplied ${content.kind} evaluation at ${evidence.observedAt}; ${classification}; ${content.sources.length} supplied source envelopes. ${current ? "Scoped checks and candidate findings require independent review; missing capabilities remain unknown." : "Retained for history; this does not assert current website state."} No provider authentication, legal compliance or action authorization follows.`,
      evidenceIds: [evidence.evidenceId],
    });
    if (current)
      for (const finding of active.get(evidence.evidenceId).findings) {
        const check = run.checks.find((c) => c.checkId === finding.checkId);
        if (check?.status === "fail") findings.push(finding);
      }
  }
  return { observations, narrative, findings };
}
