import { setup, hash } from "./experiment-exports.js";
import { enterpriseDigest as digest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
export function reviewFixture() {
  const s = setup(),
    registration = "Original registration history",
    query = "Original query for both metrics";
  const dictionary = {
    version: "1",
    sourceSystem: "business-system",
    outcomes: [
      { outcomeId: "conversion", definition: "confirmed conversion" },
      { outcomeId: "harm", definition: "confirmed harmful outcome" },
    ],
  };
  for (const m of s.context.protocol.metrics)
    m.businessDictionaryDigest = digest(dictionary);
  s.context.protocol.registration.artifactHash = hash(registration);
  s.context.protocolDigest = digest(s.context.protocol);
  s.raw.protocolDigest = s.context.protocolDigest;
  s.raw.provenance.queryDigest = hash(query);
  const support = (
    role: string,
    artifactText: string,
    metricIds: string[] = [],
  ) => ({
    sourceId: role,
    scope: s.context.scope,
    protocolDigest: s.context.protocolDigest,
    synthetic: true,
    role,
    sourceSystem: "business-system",
    metricIds,
    capturedAt: "2026-11-03T02:00:00Z",
    artifactText,
    artifactHash: hash(artifactText),
  });
  const supports = [
    support("registration-history", registration),
    ...[
      "assignment-config",
      "cohort-query",
      "analysis-ledger",
      "quality-evidence",
      "interference-evidence",
    ].map((r) => support(r, `Original ${r}`)),
    support("outcome-dictionary", JSON.stringify(dictionary), [
      "conversion",
      "harm",
    ]),
    support("metric-query", query, ["conversion", "harm"]),
  ];
  return { ...s, supports, dictionary };
}
