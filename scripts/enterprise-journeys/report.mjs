import {
  enterpriseDigest,
  loadEnterpriseRun,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { projectStoredFunnels } from "./workflow.mjs";
import { projectStoredTasks } from "./task-workflow.mjs";
import { projectStoredExperiments } from "./experiment-workflow.mjs";

/** Development journey-only assembly; caller cannot supply or omit projections. */
export async function buildStoredJourneyReport(
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
    throw Error("Invalid journey report metadata");
  const run = await loadEnterpriseRun(sourceDirectory);
  if (enterpriseDigest(run) !== metadata.sourceRunDigest)
    throw Error("Stale journey source binding");
  const supported = new Set([
    "ux-funnel-evaluation",
    "ux-task-evaluation",
    "ux-experiment-evaluation",
  ]);
  if (
    !run.evidence.length ||
    run.evidence.some((e) => !supported.has(e.artifactType))
  )
    throw Error(
      "Journey assembly requires supported evidence only; assembly of other module evidence is not implemented here",
    );
  const projections = [
    projectStoredTasks(run),
    projectStoredFunnels(run),
    projectStoredExperiments(run),
  ];
  const report = buildEnterpriseReport(run, {
    ...metadata,
    observations: projections.flatMap((p) => p.observations),
    narrative: projections.flatMap((p) => p.narrative),
    findings: [],
    actions: [],
    decisions: [],
  });
  // Optimistic source consistency, not a lock or delivery authorization.
  if (
    enterpriseDigest(await loadEnterpriseRun(sourceDirectory)) !==
    metadata.sourceRunDigest
  )
    throw Error("Journey source changed during assembly");
  return saveEnterpriseReport(outputDirectory, report);
}
