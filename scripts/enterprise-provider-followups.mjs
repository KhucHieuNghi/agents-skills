import { createDataRequest } from "../skills/content-search-audit/scripts/lib/data-requests.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { inspectEnterpriseProviderSnapshots } from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";

// Fixed copy: never promote raw payloads, locations or source-authored descriptions into requests.
const guidance = Object.freeze({
  "incomplete-pagination": [
    "mechanical",
    "Provide the remaining pages for the same query with original metadata.",
  ],
  "missing-config-dataStreams": [
    "mechanical",
    "Provide the complete GA4 data-stream export and pagination metadata.",
  ],
  "incomplete-config-dataStreams": [
    "mechanical",
    "Provide remaining GA4 data-stream pages and completion metadata.",
  ],
  "missing-config-keyEvents": [
    "mechanical",
    "Provide the complete GA4 key-event export and pagination metadata.",
  ],
  "incomplete-config-keyEvents": [
    "mechanical",
    "Provide remaining GA4 key-event pages and completion metadata.",
  ],
  "missing-provider-metadata": [
    "mechanical",
    "Provide the original GA4 response metadata for each page.",
  ],
  "missing-timezone": [
    "mechanical",
    "Provide the reporting timezone for the property or export.",
  ],
  "missing-currency": [
    "mechanical",
    "Provide the reporting currency or an applicable currency policy.",
  ],
  "provider-thresholding": [
    "interpretation",
    "Ask the owner to verify the thresholding warning and document its impact.",
  ],
  "provider-sampling": [
    "interpretation",
    "Ask the owner to verify the sampling warning and document its impact.",
  ],
  "provider-truncation": [
    "interpretation",
    "Ask the owner to verify the truncation warning and supply an appropriate alternative if needed.",
  ],
  "metric-restrictions": [
    "interpretation",
    "Ask the owner to validate metric restrictions and provide permitted evidence.",
  ],
  "provider-limited-population": [
    "interpretation",
    "Document the provider's population and scope limitations; missing rows are not zero.",
  ],
  "deleted-configuration": [
    "mechanical",
    "Provide a non-deleted version and retain the original evidence.",
  ],
  "partial-capture-window": [
    "mechanical",
    "Provide a later capture covering the declared business window.",
  ],
  "empty-export": [
    "interpretation",
    "Ask the business owner to verify export filters and coverage before inferring no activity.",
  ],
  "missing-source-provenance": [
    "mechanical",
    "Provide the source locator, responsible actor and export or assertion method through an approved private channel.",
  ],
  "manual-assertion": [
    "interpretation",
    "Provide a source-system export or retain this as an attributed manual assertion.",
  ],
  "unmatched-business-identity": [
    "mechanical",
    "Provide a permitted correlation identifier if matching is required; do not infer matches from timestamps.",
  ],
  "mixed-currency": [
    "interpretation",
    "Keep currencies separate and supply an explicit conversion policy before aggregation.",
  ],
  "unmapped-provider-limitation": [
    "interpretation",
    "Ask the source owner to review the retained provider limitation and document an appropriate next step.",
  ],
  "competing-inputs": [
    "resolution",
    "Obtain an attributed owner decision bound to the entire competing source set.",
  ],
});

/** Private deterministic obligations; no mutation, fulfillment or authority. */
export function planProviderFollowups(run) {
  const view = inspectEnterpriseProviderSnapshots(run);
  const byId = new Map(run.evidence.map((e) => [e.evidenceId, e]));
  const obligations = [];
  for (const target of run.providerTargets ?? []) {
    const request = run.dataRequests.find((r) => r.id === target.requestId);
    const sources = view.snapshots.filter(
      (s) => s.targetId === target.targetId && s.currentlyFresh,
    );
    if (["declined", "invalid"].includes(request.status) || !sources.length)
      continue;
    const gaps = new Map();
    const inputs = new Set();
    for (const source of sources) {
      const evidence = byId.get(source.evidenceId);
      inputs.add(enterpriseDigest(evidence.content.sourceEnvelope.input));
      const sourceGaps =
        source.kind === "business-observations"
          ? evidence.content.normalized.gaps
          : evidence.content.gaps;
      for (const gap of sourceGaps ?? []) {
        const code = Object.hasOwn(guidance, gap.code)
          ? gap.code
          : "unmapped-provider-limitation";
        if (!gaps.has(code)) gaps.set(code, []);
        if (
          !gaps
            .get(code)
            .some((item) => item.evidenceId === evidence.evidenceId)
        )
          gaps
            .get(code)
            .push({ evidenceId: evidence.evidenceId, digest: evidence.digest });
      }
    }
    if (inputs.size > 1)
      gaps.set(
        "competing-inputs",
        sources.map((source) => ({
          evidenceId: source.evidenceId,
          digest: byId.get(source.evidenceId).digest,
        })),
      );
    for (const [code, bindings] of [...gaps].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const [kind, instructions] = guidance[code];
      const followup = createDataRequest({
        customerId: run.customerId,
        runId: run.runId,
        requestedArtifact: `provider-followup-${code}`,
        scopeKey: target.targetId,
        windowId: target.configuration.windowId,
        moduleIds: [...request.moduleIds],
        affectedCheckIds: [...request.affectedCheckIds],
        reason:
          "A supplied provider source needs additional verification or material.",
        acceptedFormats: ["Read-only export or attributed owner review"],
        leastPrivilegeAccess:
          "Read-only evidence; no credentials or website mutation",
        exportInstructions: instructions,
        suggestedOwnerRole: "Property or business-system owner",
        fallback: "Continue independent checks; retain unresolved status.",
        priority: "high",
      });
      obligations.push({
        targetId: target.targetId,
        code,
        kind,
        request: followup,
        sourceBindings: bindings.sort((a, b) =>
          a.evidenceId.localeCompare(b.evidenceId),
        ),
      });
    }
  }
  return {
    schemaFamily: "private-provider-followup-plan",
    schemaVersion: 1,
    sourceRunDigest: view.sourceRunDigest,
    obligations,
    applied: false,
    fulfillmentVerified: false,
    disclosureAuthorized: false,
  };
}
