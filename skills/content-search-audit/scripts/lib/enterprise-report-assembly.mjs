import { projectStoredSeoAcquisitions } from "./enterprise-seo-acquisition-report.mjs";
import { projectStoredMeasurement } from "./enterprise-measurement/report.mjs";
import { projectStoredPerformance } from "./enterprise-performance/report.mjs";
import { projectStoredAccessibility } from "./enterprise-accessibility/report.mjs";
import { projectStoredTechnicalSeo } from "./enterprise-technical-seo/report.mjs";
import { projectStoredBrowserCaptures } from "./enterprise-browser-report.mjs";
import { projectStoredRuntime } from "./enterprise-runtime-report.mjs";
import { projectStoredProviders } from "./enterprise-provider-report.mjs";
import { enterpriseDigest, loadEnterpriseRun } from "./enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
} from "./enterprise-report.mjs";
import { projectStoredFunnels } from "./enterprise-journeys/workflow.mjs";
import { projectStoredTasks } from "./enterprise-journeys/task-workflow.mjs";
import { projectStoredExperiments } from "./enterprise-journeys/experiment-workflow.mjs";

/** Development registered-module assembly; caller cannot supply or omit projections. */
export async function buildStoredEnterpriseReport(
  sourceDirectory,
  metadata,
  outputDirectory,
) {
  const keys = [
    "sourceRunDigest",
    "revisionId",
    "authorId",
    "generatedAt",
    "brand",
  ];
  if (
    !metadata ||
    Object.getPrototypeOf(metadata) !== Object.prototype ||
    Object.keys(metadata).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(metadata, key))
  )
    throw Error("Invalid enterprise report metadata");
  // Use one immutable caller snapshot across asynchronous source reads.
  metadata = globalThis.structuredClone(metadata);
  const run = await loadEnterpriseRun(sourceDirectory);
  if (enterpriseDigest(run) !== metadata.sourceRunDigest)
    throw Error("Stale enterprise source binding");
  const projections = compileStoredEnterpriseModules(run).map(
    ({ projection }) => projection,
  );
  const report = buildEnterpriseReport(run, {
    ...metadata,
    observations: projections.flatMap((p) => p.observations),
    narrative: projections.flatMap((p) => p.narrative),
    findings: projections.flatMap((p) => p.findings ?? []),
    actions: [],
    decisions: [],
  });
  // Optimistic source consistency, not a lock or delivery authorization.
  if (
    enterpriseDigest(await loadEnterpriseRun(sourceDirectory)) !==
    metadata.sourceRunDigest
  )
    throw Error("Enterprise source changed during assembly");
  return saveEnterpriseReport(outputDirectory, report);
}

/** Shared authoritative registry. Callers cannot inject or suppress a module. */
export function compileStoredEnterpriseModules(run) {
  const acquisition = projectStoredSeoAcquisitions(run);
  const acquisitionIds = new Set(acquisition.ownedEvidenceIds);
  const supported = new Set([
    "ux-funnel-evaluation",
    "ux-task-evaluation",
    "ux-experiment-evaluation",
    "tracking-evaluation",
    "consent-evaluation",
    "measurement-assessment-evaluation",
    "performance-evaluation",
    "accessibility-evaluation",
    "accessibility-check",
    "canonical-evaluation",
    "canonical-check",
    "browser-capture",
    "ga4-report",
    "ga4-config",
    "search-export",
    "bing-search",
    "bing-ai-mapped",
    "gtm-container",
    "business-observations",
  ]);
  if (
    (!run.evidence.length && !run.providerTargets?.length) ||
    run.evidence.some(
      (e) =>
        !supported.has(e.artifactType) && !acquisitionIds.has(e.evidenceId),
    )
  )
    throw Error(
      "Unsupported evidence or empty run; register an original-source replay projector before assembly",
    );
  const projections = [
    ["seo-acquisition", acquisition],
    ["ux-task", projectStoredTasks(run)],
    ["ux-funnel", projectStoredFunnels(run)],
    ["ux-experiment", projectStoredExperiments(run)],
    ["runtime", projectStoredRuntime(run)],
    ["provider", projectStoredProviders(run)],
    ["measurement", projectStoredMeasurement(run)],
    ["performance", projectStoredPerformance(run)],
    ["accessibility", projectStoredAccessibility(run)],
    ["technical-seo", projectStoredTechnicalSeo(run)],
    ["browser", projectStoredBrowserCaptures(run)],
  ];
  return projections.map(([moduleId, projection]) => ({
    moduleId,
    projection,
  }));
}
