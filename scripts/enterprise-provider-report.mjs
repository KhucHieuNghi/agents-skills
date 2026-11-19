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
        text: `Provider target ${target.targetId}; request ${request.id}; state ${state}. Retained imports: ${snapshots.length}; fresh imports: ${fresh.length}; distinct fresh supplied inputs: ${groups.size}. Counts describe import objects, not independent observations or executions. ${resolution} No provider authentication, numerical metric projection or assessment acceptance is asserted.`,
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
