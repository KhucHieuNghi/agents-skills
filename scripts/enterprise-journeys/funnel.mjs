import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const object = (x) =>
  x !== null &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));
function shape(x, keys, label) {
  assert(
    object(x) &&
      Object.keys(x).length === keys.length &&
      keys.every((k) => Object.hasOwn(x, k)),
    "Invalid " + label,
  );
}
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const text = (x) =>
  typeof x === "string" && x.length > 0 && x.length <= 2048 && x.isWellFormed();
const digest = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const sha = (x) => createHash("sha256").update(x).digest("hex");
function time(x) {
  assert(
    typeof x === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x) &&
      Number.isFinite(Date.parse(x)),
    "Invalid timestamp",
  );
  const n = Date.parse(x);
  assert(
    new Date(n).toISOString().replace(".000Z", "Z") === x.replace(".000Z", "Z"),
    "Invalid calendar timestamp",
  );
  return n;
}
const seconds = (x) => Number.isSafeInteger(x) && x >= 0 && x <= 31622400;
function validateContext(c) {
  shape(
    c,
    [
      "customerId",
      "entityId",
      "environment",
      "journeyId",
      "definitionDigest",
      "definition",
      "funnelKind",
      "population",
      "window",
      "assessmentAt",
      "maxAgeSeconds",
      "ingestionLagSeconds",
      "transitions",
    ],
    "funnel context",
  );
  for (const k of ["customerId", "entityId", "environment", "journeyId"])
    assert(id(c[k]), "Invalid scope identifier");
  assert(
    ["open", "closed"].includes(c.funnelKind) && digest(c.definitionDigest),
    "Invalid funnel definition identity",
  );
  shape(
    c.population,
    ["unit", "device", "market", "segmentId", "cohortId"],
    "population",
  );
  assert(
    ["users", "sessions", "attempts"].includes(c.population.unit) &&
      ["device", "market", "segmentId", "cohortId"].every((k) =>
        id(c.population[k]),
      ),
    "Invalid population",
  );
  shape(c.window, ["from", "to"], "window");
  const start = time(c.window.from),
    end = time(c.window.to),
    at = time(c.assessmentAt);
  assert(
    start < end &&
      end <= at &&
      seconds(c.maxAgeSeconds) &&
      c.maxAgeSeconds > 0 &&
      seconds(c.ingestionLagSeconds),
    "Invalid window/freshness",
  );
  assert(
    Array.isArray(c.transitions) &&
      c.transitions.length > 0 &&
      c.transitions.length <= 100,
    "Invalid transitions",
  );
  const ids = new Set(),
    pairs = new Set();
  for (const t of c.transitions) {
    shape(t, ["transitionId", "fromStepId", "toStepId"], "transition");
    assert(
      Object.values(t).every(id) &&
        t.fromStepId !== t.toStepId &&
        !ids.has(t.transitionId) &&
        !pairs.has(t.fromStepId + "/" + t.toStepId),
      "Invalid or duplicate transition",
    );
    ids.add(t.transitionId);
    pairs.add(t.fromStepId + "/" + t.toStepId);
  }
  const d = c.definition;
  shape(
    d,
    [
      "version",
      "entryRule",
      "identityRule",
      "deduplicationRule",
      "retryRule",
      "transitions",
    ],
    "retained definition",
  );
  assert(
    d.version === 1 &&
      ["entryRule", "identityRule", "deduplicationRule", "retryRule"].every(
        (k) => text(d[k]),
      ) &&
      Array.isArray(d.transitions) &&
      d.transitions.length === ids.size,
    "Invalid retained definition",
  );
  const seen = new Set();
  for (const t of d.transitions) {
    shape(
      t,
      [
        "transitionId",
        "fromStepId",
        "toStepId",
        "eligibleRule",
        "continuationRule",
        "entryPopulation",
        "ordering",
        "maxContinuationSeconds",
      ],
      "transition definition",
    );
    assert(
      ids.has(t.transitionId) &&
        !seen.has(t.transitionId) &&
        text(t.eligibleRule) &&
        text(t.continuationRule) &&
        ["first-entry-cohort", "any-step-entrant"].includes(
          t.entryPopulation,
        ) &&
        ["direct", "indirect"].includes(t.ordering) &&
        seconds(t.maxContinuationSeconds),
      "Invalid transition definition",
    );
    const declared = c.transitions.find(
      (x) => x.transitionId === t.transitionId,
    );
    assert(
      t.fromStepId === declared.fromStepId && t.toStepId === declared.toStepId,
      "Transition endpoints do not match retained definition",
    );
    assert(
      c.funnelKind !== "closed" || t.entryPopulation === "first-entry-cohort",
      "Closed funnel requires first-entry cohort",
    );
    assert(
      c.maxAgeSeconds > t.maxContinuationSeconds + c.ingestionLagSeconds,
      "Freshness expires before opportunity can mature",
    );
    seen.add(t.transitionId);
  }
  assert(
    enterpriseDigest(d) === c.definitionDigest,
    "Definition digest mismatch",
  );
  return { start, end, at, ids, expires: end + c.maxAgeSeconds * 1000 };
}
function validateTree(raw) {
  const pending = [raw];
  while (pending.length) {
    const x = pending.pop();
    if (typeof x === "number") assert(Number.isFinite(x), "Nonfinite JSON");
    if (typeof x === "string") assert(x.isWellFormed(), "Malformed Unicode");
    if (x && typeof x === "object")
      for (const [k, v] of Object.entries(x)) {
        assert(k.isWellFormed(), "Malformed Unicode key");
        pending.push(v);
      }
  }
}
function normalize(source, c, clock) {
  shape(
    source,
    ["sourceId", "sourceKind", "capturedAt", "artifactText", "artifactHash"],
    "source envelope",
  );
  assert(
    id(source.sourceId) &&
      source.sourceKind === "funnel-aggregate-v1" &&
      digest(source.artifactHash),
    "Invalid source identity",
  );
  const capture = time(source.capturedAt);
  assert(
    capture >= clock.start && capture <= clock.at,
    "Invalid source capture chronology",
  );
  const raw = parseCaptureJson(source.artifactText);
  validateTree(raw);
  shape(
    raw,
    [
      "schemaVersion",
      "scope",
      "definitionDigest",
      "funnelKind",
      "population",
      "window",
      "dataCompleteThrough",
      "synthetic",
      "provenance",
      "quality",
      "transitions",
    ],
    "source artifact",
  );
  shape(
    raw.scope,
    ["customerId", "entityId", "environment", "journeyId"],
    "source scope",
  );
  assert(
    Object.keys(raw.scope).every((k) => raw.scope[k] === c[k]),
    "Foreign source scope",
  );
  assert(
    raw.schemaVersion === 1 &&
      raw.definitionDigest === c.definitionDigest &&
      raw.funnelKind === c.funnelKind &&
      enterpriseDigest(raw.population) === enterpriseDigest(c.population) &&
      enterpriseDigest(raw.window) === enterpriseDigest(c.window) &&
      typeof raw.synthetic === "boolean",
    "Contradictory source definition/population/window",
  );
  const watermark = time(raw.dataCompleteThrough);
  assert(watermark <= capture, "Completeness watermark after capture");
  shape(
    raw.provenance,
    ["actor", "locator", "method", "sourceSystem", "queryDigest"],
    "provenance",
  );
  assert(
    ["actor", "locator", "sourceSystem"].every((k) =>
      text(raw.provenance[k]),
    ) &&
      ["export", "manual"].includes(raw.provenance.method) &&
      digest(raw.provenance.queryDigest),
    "Invalid provenance",
  );
  shape(
    raw.quality,
    ["complete", "sampled", "thresholded", "modeled", "precision"],
    "quality",
  );
  assert(
    ["complete", "sampled", "thresholded", "modeled"].every((k) =>
      [true, false, null].includes(raw.quality[k]),
    ) && ["exact", "approximate", "unknown"].includes(raw.quality.precision),
    "Invalid quality declarations",
  );
  assert(
    Array.isArray(raw.transitions) && raw.transitions.length <= 100,
    "Invalid source transitions",
  );
  const seen = new Set();
  for (const t of raw.transitions) {
    shape(
      t,
      ["transitionId", "eligibleCount", "continuedCount", "samePopulation"],
      "source transition",
    );
    assert(
      clock.ids.has(t.transitionId) &&
        !seen.has(t.transitionId) &&
        [true, false, null].includes(t.samePopulation),
      "Undeclared or duplicate source transition",
    );
    for (const k of ["eligibleCount", "continuedCount"])
      assert(
        t[k] === null ||
          (Number.isSafeInteger(t[k]) && t[k] >= 0 && t[k] <= 1e12),
        "Unsafe count",
      );
    assert(
      t.eligibleCount === null ||
        t.continuedCount === null ||
        t.continuedCount <= t.eligibleCount,
      "Continuation exceeds eligible cohort",
    );
    seen.add(t.transitionId);
  }
  const reasons = [];
  if (clock.at >= clock.expires) reasons.push("stale-window");
  if (capture < clock.end) reasons.push("incomplete-capture-window");
  if (raw.provenance.method !== "export") reasons.push("manual-assertion");
  if (raw.quality.complete !== true)
    reasons.push("incomplete-or-unknown-coverage");
  for (const k of ["sampled", "thresholded", "modeled"])
    if (raw.quality[k] !== false) reasons.push(k + "-or-unknown");
  if (raw.quality.precision !== "exact")
    reasons.push("inexact-or-unknown-precision");
  return {
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    envelopeDigest: enterpriseDigest(source),
    capturedAt: source.capturedAt,
    dataCompleteThrough: raw.dataCompleteThrough,
    synthetic: raw.synthetic,
    provenance: raw.provenance,
    quality: raw.quality,
    transitions: raw.transitions,
    ineligibleReasons: reasons,
    providerAuthenticated: false,
  };
}
function request(c, t, synthetic) {
  return {
    requestId:
      "ux-funnel-" +
      enterpriseDigest([
        c.customerId,
        c.entityId,
        c.environment,
        c.journeyId,
        c.definitionDigest,
        c.population,
        c.window,
        t.transitionId,
        t.reason,
      ]),
    moduleId: "ux-cro",
    scope: {
      customerId: c.customerId,
      entityId: c.entityId,
      environment: c.environment,
    },
    journeyId: c.journeyId,
    transitionId: t.transitionId,
    definitionDigest: c.definitionDigest,
    transitionDefinition: globalThis.structuredClone(
      c.definition.transitions.find((x) => x.transitionId === t.transitionId),
    ),
    requiredCompleteThrough: new Date(
      Date.parse(c.window.to) +
        c.definition.transitions.find((x) => x.transitionId === t.transitionId)
          .maxContinuationSeconds *
          1000,
    ).toISOString(),
    ingestionLagSeconds: c.ingestionLagSeconds,
    population: globalThis.structuredClone(c.population),
    window: { ...c.window },
    synthetic,
    reason: t.reason,
    requestedArtifact:
      "Scoped eligibility and continuation export with retained definitions and completeness watermark",
    acceptedFormats: ["funnel-aggregate-v1 JSON"],
    suggestedOwnerRole: "Analytics and journey owner",
    leastPrivilegeAccess: "Read-only export; no passwords or access tokens",
    exportInstructions:
      "Supply this transition's eligible cohort and its continued subset, query provenance, quality flags, and event-time completeness through the continuation horizon plus permitted ingestion lag. Retain conflicting and partial exports; confirm the definition rather than inferring matches from event names.",
    fallback:
      t.reason === "zero-denominator"
        ? "Keep the observed zero denominator and null rate. Agree a meaningful observation window if a rate is needed; do not invent activity."
        : "Retain supplied counts as attributed observations; keep the rate unknown and continue other audit modules.",
  };
}
/** Offline development foundation. Descriptive arithmetic is not a UX verdict or causal inference. */
export function evaluateFunnel(context, inputs) {
  const clock = validateContext(context);
  assert(Array.isArray(inputs) && inputs.length <= 20, "Invalid source count");
  let total = 0;
  for (const s of inputs) {
    assert(
      typeof s?.artifactText === "string" && s.artifactText.isWellFormed(),
      "Invalid artifact text",
    );
    const size = Buffer.byteLength(s.artifactText);
    assert(size <= 2 * 1024 * 1024, "Artifact too large");
    total += size;
    assert(total <= 16 * 1024 * 1024, "Total artifact budget exceeded");
    assert(sha(s.artifactText) === s.artifactHash, "Artifact hash mismatch");
  }
  const sources = inputs
    .map((s) => normalize(s, context, clock))
    .sort((a, b) =>
      a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
    );
  assert(
    new Set(sources.map((s) => s.sourceId)).size === sources.length,
    "Duplicate source IDs",
  );
  assert(
    new Set(sources.map((s) => s.synthetic)).size <= 1,
    "Mixed synthetic and real sources",
  );
  const synthetic = sources[0]?.synthetic ?? null,
    dataRequests = [];
  const transitions = context.transitions.map((t) => {
    const definition = context.definition.transitions.find(
        (x) => x.transitionId === t.transitionId,
      ),
      matureAt = clock.end + definition.maxContinuationSeconds * 1000;
    const evidence = sources.filter((s) =>
      s.transitions.some((r) => r.transitionId === t.transitionId),
    );
    const available = evidence.filter((s) => s.ineligibleReasons.length === 0),
      subsets = available.filter(
        (s) =>
          s.transitions.find((r) => r.transitionId === t.transitionId)
            .samePopulation === true,
      );
    const populated = subsets.filter((s) => {
      const r = s.transitions.find((r) => r.transitionId === t.transitionId);
      return r.eligibleCount !== null && r.continuedCount !== null;
    });
    const eligible = populated.filter(
      (s) =>
        time(s.dataCompleteThrough) >= matureAt &&
        time(s.capturedAt) >= matureAt + context.ingestionLagSeconds * 1000,
    );
    const signatures = new Set(
      eligible.map((s) => {
        const r = s.transitions.find((r) => r.transitionId === t.transitionId);
        return `${r.eligibleCount}/${r.continuedCount}`;
      }),
    );
    const result = {
      ...t,
      synthetic,
      status: "unknown",
      reason: "missing-source",
      sourceIds: evidence.map((s) => s.sourceId),
      selectedSourceIds: eligible.map((s) => s.sourceId),
      eligibleCount: null,
      continuedCount: null,
      retention: null,
      nonContinuation: null,
      qualification:
        "No UX quality or abandonment intent inferred; any ratio concerns the declared eligible cohort and continuation horizon only.",
      requestId: null,
    };
    if (!sources.length) result.reason = "missing-source";
    else if (!evidence.length) result.reason = "missing-transition";
    else if (!available.length) result.reason = "ineligible-source";
    else if (!subsets.length) result.reason = "subset-unproven";
    else if (!populated.length) result.reason = "missing-counts";
    else if (!eligible.length) result.reason = "immature-window";
    else if (signatures.size > 1) result.reason = "conflicting-counts";
    else {
      const row = eligible[0].transitions.find(
        (r) => r.transitionId === t.transitionId,
      );
      result.eligibleCount = row.eligibleCount;
      result.continuedCount = row.continuedCount;
      if (row.eligibleCount === 0) result.reason = "zero-denominator";
      else {
        result.status = "observed";
        result.reason = "declared-cohort-ratio";
        result.retention = {
          numerator: row.continuedCount,
          denominator: row.eligibleCount,
          value: row.continuedCount / row.eligibleCount,
        };
        result.nonContinuation = {
          numerator: row.eligibleCount - row.continuedCount,
          denominator: row.eligibleCount,
          value: (row.eligibleCount - row.continuedCount) / row.eligibleCount,
        };
      }
    }
    if (result.status === "unknown") {
      const q = request(context, result, synthetic);
      result.requestId = q.requestId;
      dataRequests.push(q);
    }
    return result;
  });
  return {
    schemaVersion: 1,
    moduleId: "ux-cro",
    namespace: "descriptive-funnel",
    context: globalThis.structuredClone(context),
    contextDigest: enterpriseDigest(context),
    definition: globalThis.structuredClone(context.definition),
    definitionDigest: context.definitionDigest,
    synthetic,
    dataClassification:
      synthetic === null
        ? "unknown"
        : synthetic
          ? "synthetic"
          : "real-declared",
    sources,
    transitions,
    dataRequests,
    accounting: {
      declaredTransitions: transitions.length,
      observedTransitions: transitions.filter((t) => t.status === "observed")
        .length,
      unknownTransitions: transitions.filter((t) => t.status === "unknown")
        .length,
      submittedSources: sources.length,
      uniqueArtifacts: new Set(sources.map((s) => s.artifactHash)).size,
      ineligibleSources: sources.filter((s) => s.ineligibleReasons.length)
        .length,
    },
    uxQualityAssessment: "not-assessed",
    causalAcceptance: false,
    providerAuthenticated: false,
    semanticAcceptance: false,
  };
}
