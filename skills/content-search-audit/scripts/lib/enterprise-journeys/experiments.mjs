// Supplied aggregate ingestion only. Semantic review cannot come from exports.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { enterpriseDigest } from "../enterprise-state.mjs";
import { parseCaptureJson } from "../technical-seo/strict-json.mjs";
import {
  evaluateExperimentDecision,
  EXPERIMENT_REVIEW_GATES,
} from "./experiment-decision.mjs";
const ok = (v) => {
  if (!v) throw Error("Invalid experiment export evidence");
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
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const txt = (v) =>
  typeof v === "string" && v.length > 0 && v.length <= 2048 && v.isWellFormed();
const seconds = (v) => Number.isSafeInteger(v) && v >= 0 && v <= 31622400;
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
const sha = (v) => createHash("sha256").update(v).digest("hex");
const blank = () => ({
  ...Object.fromEntries(EXPERIMENT_REVIEW_GATES.map((k) => [k, null])),
  controlAssigned: null,
  treatmentAssigned: null,
});
const clone = (v) => JSON.parse(JSON.stringify(v));
function unicode(v) {
  if (typeof v === "string") ok(v.isWellFormed());
  if (typeof v === "number") ok(Number.isFinite(v));
  if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) {
      ok(k.isWellFormed());
      unicode(x);
    }
}
export function evaluateExperimentExports(context, sources) {
  shape(context, [
    "scope",
    "protocol",
    "protocolDigest",
    "assessmentAt",
    "maxAgeSeconds",
    "ingestionLagSeconds",
  ]);
  shape(context.scope, [
    "customerId",
    "entityId",
    "environment",
    "experimentId",
  ]);
  ok(
    Object.values(context.scope).every(id) &&
      ["sandbox", "production"].includes(context.scope.environment),
  );
  const p = context.protocol;
  shape(p, [
    "decision",
    "registration",
    "assignment",
    "population",
    "enrollment",
    "metrics",
    "stopping",
    "synthetic",
  ]);
  shape(p.registration, ["registeredAt", "locator", "artifactHash"]);
  ok(txt(p.registration.locator) && hash(p.registration.artifactHash));
  const registered = time(p.registration.registeredAt);
  shape(p.assignment, [
    "unit",
    "identityRule",
    "bucketingRule",
    "exclusionRule",
  ]);
  ok(Object.values(p.assignment).every(txt));
  shape(p.population, [
    "eligibilityRule",
    "device",
    "market",
    "segmentId",
    "cohortId",
  ]);
  ok(Object.values(p.population).every(txt));
  shape(p.enrollment, ["from", "to"]);
  const start = time(p.enrollment.from),
    end = time(p.enrollment.to),
    at = time(context.assessmentAt);
  ok(start < end && registered <= at);
  ok(
    seconds(context.maxAgeSeconds) &&
      context.maxAgeSeconds > 0 &&
      seconds(context.ingestionLagSeconds),
  );
  shape(p.stopping, ["rule", "plannedAnalyses"]);
  ok(
    ["fixed-horizon", "sequential", "adaptive", "unknown"].includes(
      p.stopping.rule,
    ) &&
      (p.stopping.plannedAnalyses === null ||
        (Number.isSafeInteger(p.stopping.plannedAnalyses) &&
          p.stopping.plannedAnalyses >= 1 &&
          p.stopping.plannedAnalyses <= 10000)),
  );
  ok(
    typeof p.synthetic === "boolean" &&
      hash(context.protocolDigest) &&
      enterpriseDigest(p) === context.protocolDigest,
  );
  evaluateExperimentDecision(p.decision, blank(), []);
  ok(
    p.decision.cohortDigest ===
      enterpriseDigest({
        scope: context.scope,
        assignment: p.assignment,
        population: p.population,
        enrollment: p.enrollment,
      }),
  );
  ok(
    Array.isArray(p.metrics) && p.metrics.length === p.decision.metrics.length,
  );
  const seen = new Set(),
    metricIds = new Set(p.decision.metrics.map((m) => m.metricId));
  let horizon = 0;
  for (const m of p.metrics) {
    shape(m, [
      "metricId",
      "outcomeRule",
      "nonSuccessRule",
      "observationHorizonSeconds",
      "businessDictionaryDigest",
      "dictionaryVersion",
      "sourceSystem",
      "outcomeId",
    ]);
    ok(
      metricIds.has(m.metricId) &&
        !seen.has(m.metricId) &&
        txt(m.outcomeRule) &&
        txt(m.nonSuccessRule) &&
        seconds(m.observationHorizonSeconds) &&
        hash(m.businessDictionaryDigest) &&
        txt(m.dictionaryVersion) &&
        txt(m.sourceSystem) &&
        id(m.outcomeId),
    );
    seen.add(m.metricId);
    horizon = Math.max(horizon, m.observationHorizonSeconds);
  }
  const mature = end + horizon * 1000,
    ready = mature + context.ingestionLagSeconds * 1000;
  ok(
    Number.isFinite(mature) &&
      Number.isFinite(ready) &&
      context.maxAgeSeconds * 1000 > ready - end,
  );
  ok(Array.isArray(sources) && sources.length <= 20);
  let bytes = 0;
  const sourceIds = new Set();
  for (const s of sources) {
    shape(s, [
      "sourceId",
      "sourceKind",
      "capturedAt",
      "artifactText",
      "artifactHash",
    ]);
    ok(
      id(s.sourceId) &&
        !sourceIds.has(s.sourceId) &&
        s.sourceKind === "experiment-aggregate-v1" &&
        hash(s.artifactHash) &&
        typeof s.artifactText === "string" &&
        s.artifactText.isWellFormed(),
    );
    sourceIds.add(s.sourceId);
    const size = Buffer.byteLength(s.artifactText);
    bytes += size;
    ok(
      size <= 2 * 1024 * 1024 &&
        bytes <= 16 * 1024 * 1024 &&
        sha(s.artifactText) === s.artifactHash,
    );
  }
  const records = sources.map((s) => {
    const capture = time(s.capturedAt);
    ok(capture >= start && capture <= at);
    const r = parseCaptureJson(s.artifactText);
    unicode(r);
    shape(r, [
      "schemaVersion",
      "scope",
      "protocolDigest",
      "cohortDigest",
      "enrollment",
      "synthetic",
      "dataCompleteThrough",
      "provenance",
      "quality",
      "assignmentCounts",
      "metrics",
    ]);
    ok(
      r.schemaVersion === 1 &&
        enterpriseDigest(r.scope) === enterpriseDigest(context.scope) &&
        r.protocolDigest === context.protocolDigest &&
        r.cohortDigest === p.decision.cohortDigest &&
        enterpriseDigest(r.enrollment) === enterpriseDigest(p.enrollment) &&
        r.synthetic === p.synthetic,
    );
    const watermark =
      r.dataCompleteThrough === null ? null : time(r.dataCompleteThrough);
    ok(watermark === null || watermark <= capture);
    shape(r.provenance, [
      "actor",
      "locator",
      "sourceSystem",
      "queryDigest",
      "method",
    ]);
    ok(
      ["actor", "locator", "sourceSystem"].every((k) => txt(r.provenance[k])) &&
        hash(r.provenance.queryDigest) &&
        ["export", "manual"].includes(r.provenance.method),
    );
    shape(r.quality, [
      "complete",
      "sampled",
      "thresholded",
      "modeled",
      "precision",
    ]);
    ok(
      ["complete", "sampled", "thresholded", "modeled"].every((k) =>
        [true, false, null].includes(r.quality[k]),
      ) && ["exact", "approximate", "unknown"].includes(r.quality.precision),
    );
    shape(r.assignmentCounts, ["controlAssigned", "treatmentAssigned"]);
    const facts = { ...blank(), ...r.assignmentCounts };
    const preflight = evaluateExperimentDecision(p.decision, facts, r.metrics);
    const reasons = [];
    if (
      r.assignmentCounts.controlAssigned === null ||
      r.assignmentCounts.treatmentAssigned === null
    )
      reasons.push("missing-assignment-counts");
    if (end > at || watermark === null || watermark < mature || capture < ready)
      reasons.push("immature-or-incomplete-window");
    if (at >= end + context.maxAgeSeconds * 1000) reasons.push("stale-window");
    if (registered >= start) reasons.push("registration-not-before-enrollment");
    if (p.stopping.rule !== "fixed-horizon" || p.stopping.plannedAnalyses !== 1)
      reasons.push("unsupported-stopping-policy");
    if (r.provenance.method !== "export") reasons.push("manual-evidence");
    if (
      r.quality.complete !== true ||
      r.quality.sampled !== false ||
      r.quality.thresholded !== false ||
      r.quality.modeled !== false ||
      r.quality.precision !== "exact"
    )
      reasons.push("ineligible-data-quality");
    for (const m of preflight.metrics)
      if (m.reasons.length)
        reasons.push(`metric-ineligible:${m.definition.metricId}`);
    const semanticData = {
      assignmentCounts: r.assignmentCounts,
      metrics: [...r.metrics].sort((a, b) =>
        a.metricId < b.metricId ? -1 : a.metricId > b.metricId ? 1 : 0,
      ),
    };
    return {
      sourceId: s.sourceId,
      sourceKind: s.sourceKind,
      capturedAt: s.capturedAt,
      artifactHash: s.artifactHash,
      raw: r,
      reasons,
      contentDigest: enterpriseDigest(semanticData),
    };
  });
  const eligible = records.filter((r) => r.reasons.length === 0),
    selectionReasons = [];
  let selected = [];
  if (!records.length) selectionReasons.push("missing-source");
  else if (!eligible.length) selectionReasons.push("no-eligible-source");
  else if (new Set(eligible.map((r) => r.contentDigest)).size !== 1)
    selectionReasons.push("conflicting-eligible-sources");
  else selected = eligible;
  const facts = blank();
  let observations = [];
  if (selected.length) {
    Object.assign(facts, selected[0].raw.assignmentCounts);
    facts.outcomesMature = true;
    facts.fixedHorizonCompleted = true;
    observations = selected[0].raw.metrics;
  }
  const decision = evaluateExperimentDecision(p.decision, facts, observations);
  const contextDigest = enterpriseDigest(context);
  const bindingDigest = enterpriseDigest({
    scope: context.scope,
    protocolDigest: context.protocolDigest,
    maxAgeSeconds: context.maxAgeSeconds,
    ingestionLagSeconds: context.ingestionLagSeconds,
  });
  const evidenceSetDigest = enterpriseDigest({
    bindingDigest,
    sources: records
      .map((r) => ({
        sourceId: r.sourceId,
        sourceKind: r.sourceKind,
        capturedAt: r.capturedAt,
        artifactHash: r.artifactHash,
      }))
      .sort((a, b) =>
        a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
      ),
  });
  const conditions = [
    ...selectionReasons,
    ...records.flatMap((r) =>
      r.reasons.map((reason) => `${r.sourceId}:${reason}`),
    ),
    ...decision.blockers,
    "independent-source-bound-review-required",
  ];
  const requests = [...new Set(conditions)].map((condition) => ({
    requestId: enterpriseDigest({
      bindingDigest,
      condition,
      ownerRole: "experiment-owner",
    }),
    assessedAt: context.assessmentAt,
    scope: clone(context.scope),
    ownerRole: "experiment-owner",
    protocolDigest: context.protocolDigest,
    cohortDigest: p.decision.cohortDigest,
    enrollment: clone(p.enrollment),
    requiredCompleteThrough: new Date(mature).toISOString(),
    requiredCaptureAt: new Date(ready).toISOString(),
    condition,
    acceptedEvidence:
      "Original scoped export, protocol history, query/configuration and independently reviewed evidence; include exact cohort, metric definitions, dates and completeness.",
    fallback:
      "Keep the affected result unknown; do not rerun or change the website without authorization.",
  }));
  return {
    namespace: "experiment-exports-v1",
    context: clone(context),
    contextDigest,
    bindingDigest,
    evidenceSetDigest,
    synthetic: p.synthetic,
    records,
    sourceAccounting: {
      supplied: records.length,
      eligible: eligible.length,
      selectedAliases: selected.length,
    },
    selectedSourceIds: selected.map((r) => r.sourceId).sort(),
    selectionReasons,
    decision,
    requests,
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
  };
}
