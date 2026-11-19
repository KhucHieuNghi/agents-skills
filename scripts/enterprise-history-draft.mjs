import { inspectReportTransition } from "./enterprise-report-lineage.mjs";
import { Buffer } from "node:buffer";
import {
  enterpriseDigest,
  stableJson,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

/** Private in-memory draft from already-authorized report content. This is not
 * a canonical report, a permission grant, or a withdrawal/retention mechanism. */
export function buildPrivateHistoryDraft(reports) {
  if (!Array.isArray(reports) || reports.length < 2 || reports.length > 33)
    throw Error("History requires a bounded complete report chain");
  if (Buffer.byteLength(stableJson(reports)) > 64 * 1024 * 1024)
    throw Error("History chain byte budget exceeded");
  const chain = globalThis.structuredClone(reports);
  if (chain[0].parentReportDigest !== null)
    throw Error("History requires the root report");
  const identities = new Set(),
    digests = new Set(),
    runSources = new Map(),
    entries = [];
  for (let i = 0; i < chain.length; i++) {
    const report = chain[i],
      digest = enterpriseDigest(report);
    if (identities.has(report.revisionId) || digests.has(digest))
      throw Error("Duplicate historical report identity");
    const runId = report.assessment.runId;
    if (
      runSources.has(runId) &&
      runSources.get(runId) !== report.sourceRunDigest
    )
      throw Error("Historical source run rewritten");
    if (
      i &&
      Date.parse(report.assessment.assessmentAt) <
        Date.parse(chain[i - 1].assessment.assessmentAt)
    )
      throw Error("Historical assessment time moved backwards");
    runSources.set(runId, report.sourceRunDigest);
    identities.add(report.revisionId);
    digests.add(digest);
    if (i === chain.length - 1) continue;
    const transition = inspectReportTransition(report, chain[i + 1]);
    for (const [type, collection, id] of [
      ["finding", "findings", "findingId"],
      ["action", "actions", "actionId"],
      ["observation", "observations", "observationId"],
      ["narrative", "narrative", "narrativeId"],
    ]) {
      for (const item of report[collection]) {
        const state = transition.items.find(
          (v) => v.type === type && v.id === item[id],
        );
        if (!state) throw Error("Missing historical item transition");
        entries.push({
          sourceReportDigest: digest,
          type,
          originalId: item[id],
          state: state.state,
          content: item,
        });
      }
    }
    for (const decision of report.decisions) {
      const state = transition.decisions.find(
        (v) =>
          v.targetType === decision.targetType &&
          v.targetId === decision.targetId,
      );
      if (!state) throw Error("Missing historical decision transition");
      entries.push({
        sourceReportDigest: digest,
        type: "decision",
        originalId: `${decision.targetType}:${decision.targetId}`,
        state: state.state,
        priorEligibility: state.priorEligibility,
        reasons: state.reasons,
        content: decision,
      });
    }
  }
  return {
    schemaFamily: "private-enterprise-history-draft",
    schemaVersion: 1,
    currentReportDigest: enterpriseDigest(chain.at(-1)),
    entries,
    persistenceAuthorized: false,
    disclosureAuthorized: false,
    historyPreserved: false,
  };
}
