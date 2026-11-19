import { compileStoredEnterpriseModules } from "./enterprise-report-assembly.mjs";
import {
  loadVerifiedGeneratedReportChain,
  inspectGeneratedReportProvenance,
} from "./enterprise-report-provenance.mjs";
import {
  enterpriseDigest,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";

/** Development generated-only revision of externally authorized local artifacts.
 * Exact parent continuity is not editorial history or disclosure authorization. */
export async function buildStoredGeneratedReportRevision(
  sourceDirectory,
  metadata,
  ancestors,
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
    typeof sourceDirectory !== "string" ||
    !sourceDirectory ||
    typeof outputDirectory !== "string" ||
    !outputDirectory ||
    !metadata ||
    Object.getPrototypeOf(metadata) !== Object.prototype ||
    Object.keys(metadata).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(metadata, key)) ||
    !Array.isArray(ancestors) ||
    !ancestors.length ||
    ancestors.length > 32
  )
    throw Error("Invalid generated revision input");
  const requested = globalThis.structuredClone({ metadata, ancestors });
  const chain = await loadVerifiedGeneratedReportChain(requested.ancestors);
  const run = await loadEnterpriseRun(sourceDirectory);
  if (enterpriseDigest(run) !== requested.metadata.sourceRunDigest)
    throw Error("Stale enterprise source binding");
  const parent = chain.entries.at(-1).report;
  const projections = compileStoredEnterpriseModules(run).map(
    ({ projection }) => projection,
  );
  const report = buildEnterpriseReport(
    run,
    {
      ...requested.metadata,
      parentReportDigest: enterpriseDigest(parent),
      observations: projections.flatMap((p) => p.observations),
      narrative: projections.flatMap((p) => p.narrative),
      findings: projections.flatMap((p) => p.findings ?? []),
      actions: [],
      decisions: [],
    },
    parent,
  );
  await inspectGeneratedReportProvenance(run, report, chain.entries);
  await loadVerifiedGeneratedReportChain(requested.ancestors);
  if (
    enterpriseDigest(await loadEnterpriseRun(sourceDirectory)) !==
    requested.metadata.sourceRunDigest
  )
    throw Error("Enterprise source changed during revision assembly");
  // Optimistic rechecks, not an atomic lock through saving or delivery.
  return saveEnterpriseReport(outputDirectory, report);
}
