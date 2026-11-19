import {
  loadVerifiedGeneratedReportChain,
  inspectGeneratedReportProvenance,
} from "./enterprise-report-provenance.mjs";
import { buildPrivateHistoryDraft } from "./enterprise-history-draft.mjs";
import { validateEnterpriseHistoryV2 } from "./enterprise-history-v2.mjs";
import { compileStoredEnterpriseModules } from "./enterprise-report-assembly.mjs";
import { buildEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report-model.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

/** Private, already-authorized local reads only. Replay is not disclosure or
 * retention authority. No file is created and no source is called research-free. */
export async function buildStoredGeneratedV2Draft(bindings) {
  if (!Array.isArray(bindings) || bindings.length < 2 || bindings.length > 33)
    throw Error("V2 draft requires a bounded complete generated report chain");
  const requested = globalThis.structuredClone(bindings);
  const verified = await loadVerifiedGeneratedReportChain(requested);
  const chain = verified.entries;
  const final = chain.at(-1);
  const previous = chain.slice(0, -1);
  const metadata = Object.fromEntries(
    ["sourceRunDigest", "revisionId", "authorId", "generatedAt", "brand"].map(
      (key) => [key, final.report[key]],
    ),
  );
  const modules = compileStoredEnterpriseModules(final.run);
  const current = buildEnterpriseReport(final.run, {
    ...metadata,
    findings: modules.flatMap(({ projection }) => projection.findings ?? []),
    observations: modules.flatMap(({ projection }) => projection.observations),
    narrative: modules.flatMap(({ projection }) => projection.narrative),
    actions: [],
    decisions: [],
  });
  const sourceRefs = new Map(
    previous.map(({ report }, index) => [
      enterpriseDigest(report),
      `source-${index + 1}`,
    ]),
  );
  const draft = buildPrivateHistoryDraft(chain.map(({ report }) => report));
  const sources = previous.map(({ run, report }, index) => ({
    sourceRef: `source-${index + 1}`,
    predecessorRef: index ? `source-${index}` : null,
    revisionId: report.revisionId,
    generatedAt: report.generatedAt,
    assessmentAt: run.assessmentAt,
  }));
  const entries = draft.entries.map((item) => {
    if (!["finding", "observation", "narrative"].includes(item.type))
      throw Error("Curated or governed history requires its owning authority");
    const disposition = item.state === "historical" ? "superseded" : item.state;
    if (!["retained", "changed", "removed", "superseded"].includes(disposition))
      throw Error("Unsupported generated history disposition");
    const sourceRef = sourceRefs.get(item.sourceReportDigest);
    if (!sourceRef) throw Error("Missing generated history source");
    return { sourceRef, type: item.type, disposition, content: item.content };
  });
  const envelope = {
    schemaFamily: "enterprise-report",
    schemaVersion: 2,
    edition: "customer",
    current,
    history: {
      sources,
      entries,
      withheld: null,
      coverage: "declared-complete",
    },
  };
  validateEnterpriseHistoryV2(envelope);
  const currentProvenance = await inspectGeneratedReportProvenance(
    final.run,
    current,
  );
  const privateSources = [];
  for (let i = 0; i < previous.length; i++) {
    const { run, report } = previous[i];
    const provenance = await inspectGeneratedReportProvenance(
      run,
      report,
      previous.slice(0, i),
    );
    privateSources.push({
      sourceRef: `source-${i + 1}`,
      reportDigest: enterpriseDigest(report),
      parentReportDigest: report.parentReportDigest,
      sourceRunDigest: enterpriseDigest(run),
      assessmentAt: run.assessmentAt,
      compilerDigest: provenance.compilerDigest,
      items: provenance.items,
    });
  }
  await loadVerifiedGeneratedReportChain(requested);
  return {
    envelope,
    privateProvenance: {
      schemaFamily: "private-generated-v2-draft-provenance",
      schemaVersion: 1,
      envelopeDigest: enterpriseDigest(envelope),
      originalFinalReportDigest: enterpriseDigest(final.report),
      standaloneCurrentDigest: enterpriseDigest(current),
      finalSourceRunDigest: enterpriseDigest(final.run),
      compilerDigest: verified.provenance.compilerDigest,
      currentItems: currentProvenance.items,
      sources: privateSources,
    },
    persistenceAuthorized: false,
    disclosureAuthorized: false,
    deliveryAuthorized: false,
  };
}
