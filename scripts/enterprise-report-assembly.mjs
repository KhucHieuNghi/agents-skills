import { projectStoredRuntime } from "./enterprise-runtime-report.mjs";
import { projectStoredProviders } from "./enterprise-provider-report.mjs";
import {
  enterpriseDigest,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
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
  const run = await loadEnterpriseRun(sourceDirectory);
  if (enterpriseDigest(run) !== metadata.sourceRunDigest)
    throw Error("Stale enterprise source binding");
  const supported = new Set([
    "ux-funnel-evaluation",
    "ux-task-evaluation",
    "ux-experiment-evaluation",
    "tracking-evaluation",
    "consent-evaluation",
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
    run.evidence.some((e) => !supported.has(e.artifactType))
  )
    throw Error(
      "Unsupported evidence or empty run; register an original-source replay projector before assembly",
    );
  const projections = [
    projectStoredTasks(run),
    projectStoredFunnels(run),
    projectStoredExperiments(run),
    projectStoredRuntime(run),
    projectStoredProviders(run),
  ];
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
