import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { inspectEnterpriseProviderSnapshots } from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";

/** Development inventory projection. Input candidates do not authorize assessments. */
export function projectStoredProviders(run) {
  const inspected = inspectEnterpriseProviderSnapshots(run);
  const evidence = new Map(run.evidence.map((e) => [e.evidenceId, e]));
  const selections = [],
    observations = [],
    narrative = [];
  for (const target of run.providerTargets ?? []) {
    const snapshots = inspected.snapshots.filter(
      (s) => s.targetId === target.targetId,
    );
    const fresh = snapshots.filter((s) => s.currentlyFresh);
    const groups = new Map();
    for (const snapshot of fresh) {
      const digest = enterpriseDigest(
        evidence.get(snapshot.evidenceId).content.sourceEnvelope.input,
      );
      groups.set(digest, [...(groups.get(digest) ?? []), snapshot.evidenceId]);
    }
    const request = run.dataRequests.find((r) => r.id === target.requestId);
    const aliases = groups.size === 1 ? [...groups.values()][0] : [];
    const fulfilled =
      request.status === "provided" &&
      request.evidenceIds.length > 0 &&
      request.evidenceIds.every((id) => aliases.includes(id));
    const state = ["declined", "invalid"].includes(request.status)
      ? request.status
      : snapshots.length === 0
        ? "missing-source"
        : fresh.length === 0
          ? "expired"
          : groups.size > 1
            ? "competing-inputs"
            : fulfilled
              ? "single-input-candidate"
              : "awaiting-reassessment";
    selections.push({
      targetId: target.targetId,
      requestId: request.id,
      state,
      retainedSnapshotCount: snapshots.length,
      freshSnapshotCount: fresh.length,
      distinctFreshInputCount: groups.size,
      candidateEvidenceIds: state === "single-input-candidate" ? aliases : [],
    });
    // Preserve provider-returned row grain; never sum or copy dimension values.
    // This development slice supports GSC only; other numeric families remain open.
    const metricStates = [];
    let metricState = "not-supported";
    if (
      target.configuration.kind === "gsc-search" &&
      !["declined", "invalid"].includes(request.status)
    ) {
      const allGroups = new Map();
      for (const snapshot of snapshots) {
        const digest = enterpriseDigest(
          evidence.get(snapshot.evidenceId).content.sourceEnvelope.input,
        );
        if (!allGroups.has(digest)) allGroups.set(digest, snapshot.evidenceId);
      }
      if (
        [...allGroups.values()].reduce(
          (sum, id) => sum + evidence.get(id).content.normalized.rows.length,
          0,
        ) > 100
      )
        throw Error(
          "GSC historical row budget exceeded; split the report scope without dropping retained observations",
        );
      for (const selected of allGroups.values()) {
        const content = evidence.get(selected).content;
        const data = content.normalized;
        const query = data.query;
        if (
          query.dataState !== "final" ||
          data.pages.some(
            (page) =>
              page.metadata !== null &&
              (typeof page.metadata !== "object" ||
                Array.isArray(page.metadata) ||
                Object.keys(page.metadata).length > 0),
          )
        )
          metricState = "unsupported-preliminary-or-metadata";
        else if (
          data.pages.some(
            (page) =>
              !["byProperty", "byPage", "byNewsShowcasePanel"].includes(
                page.responseAggregationType,
              ),
          )
        )
          metricState = "unsupported-aggregation";
        else if (
          query.aggregationType !== "auto" &&
          data.pages.some(
            (page) => page.responseAggregationType !== query.aggregationType,
          )
        )
          metricState = "aggregation-mismatch";
        else if (query.endDate > run.assessmentAt.slice(0, 10))
          metricState = "future-query-window";
        else if (data.rows.length > 100) metricState = "row-budget-exceeded";
        else if (!data.paginationExhausted)
          metricState = "incomplete-pagination";
        else if (
          !data.rows.every(
            (row) =>
              Number.isSafeInteger(row.clicks) &&
              Number.isSafeInteger(row.impressions),
          )
        )
          metricState = "unsupported-numeric-precision";
        else {
          metricState = "supplied-row-metrics";
          const grain = query.dimensions.length
            ? query.dimensions.join(" × ")
            : "dimensionless query";
          const filtered =
            (query.dimensionFilterGroups ?? []).length > 0
              ? "filtered"
              : "no declared dimension filter";
          const context = `${data.synthetic ? "Synthetic" : "Real-declared"} supplied GSC ${query.type} query, ${grain}, ${filtered}, data state ${query.dataState}, aggregation ${data.pages[0].responseAggregationType}; timezone America/Los_Angeles. Provider metadata is absent or empty and its completeness is unknown. Row values are provider-returned and not independently authenticated; pagination exhaustion does not establish population completeness. No inferred totals, AI citations or causal effects.`;
          for (const [index, row] of data.rows.entries()) {
            for (const [key, label, unit, precision] of [
              ["clicks", "Clicks", "clicks", "exact"],
              ["impressions", "Impressions", "impressions", "exact"],
              ["ctr", "Click-through rate", "ratio", "approximate"],
              ["position", "Average position", "position", "approximate"],
            ]) {
              observations.push({
                observationId: `gsc-row-${enterpriseDigest([selected, row.pageIndex, row.rowIndex, key])}`,
                label: `Supplied search row ${index + 1}: ${label}`,
                value: row[key],
                unit,
                classification:
                  state === "single-input-candidate" &&
                  aliases.includes(selected)
                    ? "current"
                    : "historical",
                precision,
                period: { from: query.startDate, to: query.endDate },
                scopeDescription: context,
                evidenceIds: [selected],
              });
            }
          }
        }
        metricStates.push(metricState);
      }
    }
    if (metricStates.length) metricState = metricStates.join(", ");
    else if (
      target.configuration.kind === "gsc-search" &&
      ["declined", "invalid"].includes(request.status)
    )
      metricState =
        "withheld-request-disposition; parent revision requires an authorized history disposition";
    const resolution =
      state === "competing-inputs"
        ? "Obtain an attributed source-resolution decision bound to this target and the complete referenced evidence set. Another import does not resolve ambiguity. Different supplied inputs are not proof of conflicting metric values."
        : state === "single-input-candidate"
          ? "Fresh attributed input candidate only. Reassess normalized limitations, completeness, sampling, thresholding, configuration state and coverage before any metric or assessment use."
          : "Follow the linked data request with its owner, scope and export instructions; preserve any refusal or invalid disposition until explicitly resolved and reassessed.";
    // Pending targets are represented by canonical checks and data requests.
    // Narrative claims require retained evidence; never manufacture an anchor.
    if (snapshots.length)
      narrative.push({
        narrativeId: `provider-selection-${target.targetId}`,
        kind: "limitation",
        text: `Provider target ${target.targetId}; request ${request.id}; state ${state}. Retained imports: ${snapshots.length}; fresh imports: ${fresh.length}; distinct fresh supplied inputs: ${groups.size}. Counts describe import objects, not independent observations or executions. ${resolution} No provider authentication or assessment acceptance is asserted. Search metric projection: ${metricState}.`,
        evidenceIds: snapshots.map((s) => s.evidenceId),
      });
    for (const snapshot of snapshots)
      observations.push({
        observationId: `provider-import-${snapshot.evidenceId}`,
        label: "Retained supplied provider import",
        value: 1,
        unit: "supplied import object",
        classification: snapshot.currentlyFresh ? "current" : "historical",
        precision: "exact",
        period: {
          from: snapshot.observedAt.slice(0, 10),
          to: snapshot.observedAt.slice(0, 10),
        },
        scopeDescription:
          "Capture-age accounting only. Freshness does not establish eligibility, independence, completeness, source authority or current website state. Fresh competing inputs remain unresolved.",
        evidenceIds: [snapshot.evidenceId],
      });
  }
  return { selections, observations, narrative, findings: [] };
}
