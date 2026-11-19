import { compileStoredEnterpriseModules } from "./enterprise-report-assembly.mjs";
import { validateProviderResolutionReview } from "./enterprise-provider-resolution.mjs";
import { inspectGeneratedReportProvenance } from "./enterprise-report-provenance.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  renderEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";

const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const exact = (value, keys) =>
  value &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const numerical = /^(gsc-row-|ga4-row-|bing-search-row-|bing-ai-row-)/;

/** Private in-memory preview; no persistence, disclosure, source authentication or delivery authority. */
export async function previewProviderResolutions(
  run,
  metadata,
  resolutions,
  trustedReviews,
  parent = null,
) {
  assert(
    exact(metadata, [
      "sourceRunDigest",
      "revisionId",
      "authorId",
      "generatedAt",
      "brand",
    ]) &&
      Array.isArray(resolutions) &&
      resolutions.length > 0 &&
      resolutions.length <= 100 &&
      Array.isArray(trustedReviews) &&
      trustedReviews.length <= 1000 &&
      (parent === null || exact(parent, ["run", "report", "ancestors"])),
    "Invalid provider resolution preview input",
  );
  const input = globalThis.structuredClone({
    run,
    metadata,
    resolutions,
    trustedReviews,
    parent,
  });
  assert(
    input.metadata.sourceRunDigest === enterpriseDigest(input.run),
    "Preview source binding mismatch",
  );
  if (input.parent)
    await inspectGeneratedReportProvenance(
      input.parent.run,
      input.parent.report,
      input.parent.ancestors,
    );
  const modules = compileStoredEnterpriseModules(input.run);
  const projections = modules.map(({ projection }) => projection);
  const provider = modules.find(
    (module) => module.moduleId === "provider",
  ).projection;
  const baseline = buildEnterpriseReport(
    input.run,
    {
      ...input.metadata,
      ...(input.parent
        ? { parentReportDigest: enterpriseDigest(input.parent.report) }
        : {}),
      findings: projections.flatMap((p) => p.findings ?? []),
      observations: projections.flatMap((p) => p.observations),
      narrative: projections.flatMap((p) => p.narrative),
      actions: [],
      decisions: [],
    },
    input.parent?.report ?? null,
  );
  const ancestors = input.parent
    ? [
        ...input.parent.ancestors,
        { run: input.parent.run, report: input.parent.report },
      ]
    : [];
  const baselineProof = await inspectGeneratedReportProvenance(
    input.run,
    baseline,
    ancestors,
  );
  const additions = [],
    previewProvenance = [],
    narratives = [],
    targets = new Set();
  for (const entry of input.resolutions) {
    assert(
      exact(entry, ["proposal", "review"]),
      "Invalid provider resolution entry",
    );
    const result = validateProviderResolutionReview(
      input.run,
      entry.proposal,
      entry.review,
      {
        assessmentAt: input.metadata.generatedAt,
        trustedReviews: input.trustedReviews,
      },
    );
    assert(
      result.verdict === "accept",
      "Rejected provider resolution cannot select a source",
    );
    const proposal = entry.proposal,
      target = proposal.target;
    assert(
      !targets.has(target.targetId),
      "Duplicate provider target resolution",
    );
    targets.add(target.targetId);
    const group = target.groups.find(
      (item) => item.inputDigest === target.selectedInputDigest,
    );
    assert(group, "Missing selected provider group");
    const evidenceIds = new Set(group.bindings.map((item) => item.evidenceId));
    const selected = provider.observations.filter(
      (item) =>
        numerical.test(item.observationId) &&
        item.classification === "historical" &&
        item.evidenceIds.length === 1 &&
        evidenceIds.has(item.evidenceIds[0]),
    );
    for (const original of selected) {
      const observation = globalThis.structuredClone(original);
      observation.observationId = `provider-selected-${enterpriseDigest([result.targetDigest, result.reviewDigest, original.observationId])}`;
      observation.classification = "current";
      observation.label = `Review-selected supplied input: ${original.label}`;
      observation.scopeDescription +=
        " Attributed source selection is a private preview; review identity and provider authenticity are not verified. Selection does not establish assessment acceptance.";
      additions.push(observation);
    }
    narratives.push({
      narrativeId: `provider-selection-preview-${enterpriseDigest([result.targetDigest, result.reviewDigest])}`,
      kind: "limitation",
      text: selected.length
        ? "A supplied source was selected in an attributed private review preview. Competing source rows remain historical. Selection and reviewer identity are not authenticated, and no provider or assessment acceptance is established."
        : "The selected supplied source has no supported numerical rows in this preview; preserve its missing or unsupported status.",
      evidenceIds: [target.selectedEvidenceId],
    });
    previewProvenance.push({
      targetDigest: result.targetDigest,
      reviewDigest: result.reviewDigest,
      selectedInputDigest: target.selectedInputDigest,
      sourceRunDigest: input.metadata.sourceRunDigest,
      baselineReportDigest: baselineProof.reportDigest,
      compilerDigest: baselineProof.compilerDigest,
      selectedEvidenceIds: [...evidenceIds].sort(),
      addedObservationIds: selected.map(
        (item) =>
          `provider-selected-${enterpriseDigest([result.targetDigest, result.reviewDigest, item.observationId])}`,
      ),
    });
  }
  const report = buildEnterpriseReport(
    input.run,
    {
      ...input.metadata,
      ...(input.parent
        ? { parentReportDigest: enterpriseDigest(input.parent.report) }
        : {}),
      findings: projections.flatMap((p) => p.findings ?? []),
      observations: [
        ...projections.flatMap((p) => p.observations),
        ...additions,
      ],
      narrative: [...projections.flatMap((p) => p.narrative), ...narratives],
      actions: [],
      decisions: [],
    },
    input.parent?.report ?? null,
  );
  const artifacts = renderEnterpriseReport(report, "customer");
  await inspectGeneratedReportProvenance(input.run, baseline, ancestors);
  return {
    schemaFamily: "private-provider-resolution-preview",
    schemaVersion: 1,
    report,
    artifacts,
    privateProvenance: previewProvenance,
    persistable: false,
    selectionAppliedToRun: false,
    disclosureAuthorized: false,
    deliveryAuthorized: false,
  };
}
