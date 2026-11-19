// Private review preparation, not a semantic verdict or delivery artifact.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
import { evaluateExperimentExports } from "./experiments.mjs";
const roles = [
  "registration-history",
  "assignment-config",
  "cohort-query",
  "outcome-dictionary",
  "metric-query",
  "analysis-ledger",
  "quality-evidence",
  "interference-evidence",
];
const globalRoles = roles.filter(
  (r) => !["outcome-dictionary", "metric-query"].includes(r),
);
const ok = (v) => {
  if (!v) throw Error("Invalid experiment supporting evidence");
};
const shape = (v, ks) =>
  ok(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Reflect.ownKeys(v).length === ks.length &&
      ks.every((k) => Object.hasOwn(v, k)),
  );
const id = (v) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const text = (v) =>
  typeof v === "string" && v.length > 0 && v.length <= 2048 && v.isWellFormed();
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const sha = (v) => createHash("sha256").update(v).digest("hex");
function time(v) {
  ok(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) &&
      Number.isFinite(Date.parse(v)),
  );
  const t = Date.parse(v);
  ok(
    new Date(t).toISOString().replace(".000Z", "Z") === v.replace(".000Z", "Z"),
  );
  return t;
}
function validateTree(v) {
  if (typeof v === "string") ok(v.isWellFormed());
  if (typeof v === "number") ok(Number.isFinite(v));
  if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) {
      ok(k.isWellFormed());
      validateTree(x);
    }
}
export function prepareExperimentReview(
  context,
  aggregateSources,
  supportSources,
) {
  const aggregate = evaluateExperimentExports(context, aggregateSources);
  ok(Array.isArray(supportSources) && supportSources.length <= 100);
  const allIds = new Set(aggregate.records.map((r) => r.sourceId)),
    metricIds = new Set(context.protocol.metrics.map((m) => m.metricId));
  let bytes = 0;
  for (const s of supportSources) {
    shape(s, [
      "sourceId",
      "scope",
      "protocolDigest",
      "synthetic",
      "role",
      "sourceSystem",
      "metricIds",
      "capturedAt",
      "artifactText",
      "artifactHash",
    ]);
    ok(id(s.sourceId) && !allIds.has(s.sourceId));
    allIds.add(s.sourceId);
    ok(
      enterpriseDigest(s.scope) === enterpriseDigest(context.scope) &&
        s.protocolDigest === context.protocolDigest &&
        s.synthetic === context.protocol.synthetic &&
        roles.includes(s.role) &&
        text(s.sourceSystem) &&
        hash(s.artifactHash),
    );
    ok(
      Array.isArray(s.metricIds) &&
        s.metricIds.length <= metricIds.size &&
        new Set(s.metricIds).size === s.metricIds.length &&
        s.metricIds.every((m) => metricIds.has(m)),
    );
    if (globalRoles.includes(s.role)) ok(s.metricIds.length === 0);
    ok(time(s.capturedAt) <= time(context.assessmentAt));
    ok(
      typeof s.artifactText === "string" &&
        s.artifactText.length > 0 &&
        s.artifactText.isWellFormed(),
    );
    const size = Buffer.byteLength(s.artifactText);
    bytes += size;
    ok(
      size <= 1024 * 1024 &&
        bytes <= 16 * 1024 * 1024 &&
        sha(s.artifactText) === s.artifactHash,
    );
  }
  const records = supportSources.map((s) => {
    let dictionary = null,
      dictionaryDigest = null;
    if (s.role === "outcome-dictionary") {
      dictionary = parseCaptureJson(s.artifactText);
      validateTree(dictionary);
      ok(
        dictionary &&
          Object.getPrototypeOf(dictionary) === Object.prototype &&
          dictionary.sourceSystem === s.sourceSystem &&
          text(dictionary.version) &&
          Array.isArray(dictionary.outcomes) &&
          dictionary.outcomes.length > 0 &&
          dictionary.outcomes.length <= 1000,
      );
      const outcomes = new Set();
      for (const outcome of dictionary.outcomes) {
        ok(
          outcome &&
            Object.getPrototypeOf(outcome) === Object.prototype &&
            id(outcome.outcomeId) &&
            !outcomes.has(outcome.outcomeId),
        );
        outcomes.add(outcome.outcomeId);
      }
      dictionaryDigest = enterpriseDigest(dictionary);
    }
    return {
      ...s,
      scope: { ...s.scope },
      metricIds: [...s.metricIds].sort(),
      dictionary,
      dictionaryDigest,
    };
  });
  const requirements = [];
  function requirement(key, kind, expected, matches) {
    const matchingSourceIds = matches.map((s) => s.sourceId).sort();
    requirements.push({
      requirementId: enterpriseDigest({
        bindingDigest: aggregate.bindingDigest,
        key,
        expected,
      }),
      key,
      kind,
      expected,
      matchingSourceIds,
      matchedArtifactHashes: [
        ...new Set(matches.map((s) => s.artifactHash)),
      ].sort(),
      status: matches.length ? "binding-matched" : "missing-support",
    });
  }
  for (const role of globalRoles) {
    const expected =
      role === "registration-history"
        ? { role, artifactHash: context.protocol.registration.artifactHash }
        : { role };
    requirement(
      role,
      role,
      expected,
      records.filter(
        (s) =>
          s.role === role &&
          (role !== "registration-history" ||
            s.artifactHash === expected.artifactHash),
      ),
    );
  }
  for (const metric of context.protocol.metrics) {
    const expected = {
      role: "outcome-dictionary",
      metricId: metric.metricId,
      sourceSystem: metric.sourceSystem,
      version: metric.dictionaryVersion,
      outcomeId: metric.outcomeId,
      dictionaryDigest: metric.businessDictionaryDigest,
    };
    requirement(
      `dictionary:${metric.metricId}`,
      "outcome-dictionary",
      expected,
      records.filter(
        (s) =>
          s.role === "outcome-dictionary" &&
          s.metricIds.includes(metric.metricId) &&
          s.sourceSystem === metric.sourceSystem &&
          s.dictionaryDigest === metric.businessDictionaryDigest &&
          s.dictionary.version === metric.dictionaryVersion &&
          s.dictionary.outcomes.some((o) => o.outcomeId === metric.outcomeId),
      ),
    );
  }
  for (const source of aggregate.records) {
    const expected = {
      role: "metric-query",
      aggregateSourceId: source.sourceId,
      sourceSystem: source.raw.provenance.sourceSystem,
      artifactHash: source.raw.provenance.queryDigest,
      metricIds: source.raw.metrics.map((m) => m.metricId).sort(),
    };
    requirement(
      `query:${source.sourceId}`,
      "metric-query",
      expected,
      records.filter(
        (s) =>
          s.role === "metric-query" &&
          s.sourceSystem === expected.sourceSystem &&
          s.artifactHash === expected.artifactHash &&
          expected.metricIds.every((m) => s.metricIds.includes(m)),
      ),
    );
  }
  const descriptors = records
    .map((s) => ({
      sourceId: s.sourceId,
      scope: s.scope,
      protocolDigest: s.protocolDigest,
      synthetic: s.synthetic,
      role: s.role,
      sourceSystem: s.sourceSystem,
      metricIds: s.metricIds,
      capturedAt: s.capturedAt,
      artifactHash: s.artifactHash,
    }))
    .sort((a, b) =>
      a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
    );
  const evidenceSetDigest = enterpriseDigest({
    schemaVersion: 1,
    aggregateEvidenceSetDigest: aggregate.evidenceSetDigest,
    support: descriptors,
  });
  const aliasMap = new Map();
  for (const s of [...aggregate.records, ...records]) {
    const aliases = aliasMap.get(s.artifactHash) ?? [];
    aliases.push(s.sourceId);
    aliasMap.set(s.artifactHash, aliases);
  }
  const aliases = [...aliasMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([artifactHash, sourceIds]) => ({
      artifactHash,
      sourceIds: sourceIds.sort(),
    }))
    .sort((a, b) => (a.artifactHash < b.artifactHash ? -1 : 1));
  const requests = requirements
    .filter((r) => r.status === "missing-support")
    .map((r) => ({
      requestId: enterpriseDigest({
        bindingDigest: aggregate.bindingDigest,
        requirementId: r.requirementId,
        ownerRole: "experiment-owner",
      }),
      assessedAt: context.assessmentAt,
      scope: { ...context.scope },
      ownerRole: "experiment-owner",
      requirementId: r.requirementId,
      expected: r.expected,
      acceptedEvidence:
        "Provide original scoped read-only evidence bytes and exact source/version/metric binding; do not provide credentials.",
      fallback:
        "Keep semantic review unknown; do not infer missing supporting content from a locator.",
    }));
  return {
    namespace: "experiment-review-packet-v1",
    aggregate,
    supportRecords: records,
    requirements,
    evidenceSetDigest,
    aliases,
    requests: [...aggregate.requests, ...requests],
    semanticAcceptance: false,
    reviewerAuthenticated: false,
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
  };
}
