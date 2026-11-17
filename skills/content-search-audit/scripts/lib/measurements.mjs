import {
  validateAccuracyReview,
  summarizeAccuracy,
} from "./answer-accuracy.mjs";
import { createHash } from "node:crypto";
import { URL } from "node:url";
const text = (value) => typeof value === "string" && value.trim().length > 0;
const segments = [
  "engine",
  "surface",
  "model",
  "searchMode",
  "locale",
  "market",
  "cohortId",
  "cohortVersion",
];
const rate = (numerator, denominator) => ({
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
});
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, stable(value[key])]),
    );
  return value;
}
function citationUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid citation URL");
  }
  if (
    !text(value) ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Invalid citation URL");
  return url;
}
/** Imports supplied annotations; verifies artifact integrity, not annotation truth.
 * No network requests, automatic brand classification or extrapolation is performed. */
export function importMeasurements(source, metadata) {
  if (!Array.isArray(source) || !metadata || !text(metadata.brand))
    throw new Error("Invalid measurement input");
  if (typeof metadata.synthetic !== "boolean")
    throw new Error("Explicit synthetic labeling required");
  if (
    !Array.isArray(metadata.brandHosts) ||
    !metadata.brandHosts.length ||
    metadata.brandHosts.some(
      (host) =>
        !text(host) ||
        !/^[a-z0-9.-]+$/.test(host) ||
        host.startsWith(".") ||
        host.endsWith(".") ||
        host.includes(".."),
    )
  )
    throw new Error("Explicit lowercase brand hosts required");
  if (
    !metadata.artifacts ||
    typeof metadata.artifacts !== "object" ||
    Array.isArray(metadata.artifacts)
  )
    throw new Error("Artifact map required");
  const observations = new Map();
  const promptVersions = new Map();
  for (const input of source) {
    const observation = globalThis.structuredClone(input);
    if (
      !observation ||
      [...segments, "observationId", "promptId", "prompt"].some(
        (key) => !text(observation[key]),
      )
    )
      throw new Error("Missing observation identity or segmentation");
    if (
      !["api", "consumer-ui", "export"].includes(observation.surface) ||
      !["enabled", "disabled", "unknown"].includes(observation.searchMode)
    )
      throw new Error("Invalid measurement surface or search mode");
    if (
      !text(observation.capturedAt) ||
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(
        observation.capturedAt,
      ) ||
      !Number.isFinite(Date.parse(observation.capturedAt))
    )
      throw new Error("Invalid observation timestamp");
    if (
      !Number.isSafeInteger(observation.repetition) ||
      observation.repetition < 1
    )
      throw new Error("Invalid observation repetition");
    if (!["captured", "error"].includes(observation.status))
      throw new Error("Invalid capture status");
    if (
      observation.brandMentioned !== null &&
      typeof observation.brandMentioned !== "boolean"
    )
      throw new Error("Mention annotation must be boolean or null");
    if (observation.citations !== null && !Array.isArray(observation.citations))
      throw new Error("Citation annotations must be an array or null");
    observation.citations?.forEach(citationUrl);
    if (observation.status === "captured") {
      if (
        !text(observation.responseArtifact) ||
        !Object.hasOwn(metadata.artifacts, observation.responseArtifact) ||
        typeof metadata.artifacts[observation.responseArtifact] !== "string"
      )
        throw new Error("Response artifact missing");
      const actual = createHash("sha256")
        .update(metadata.artifacts[observation.responseArtifact])
        .digest("hex");
      if (actual !== observation.responseHash)
        throw new Error("Response artifact hash mismatch");
      if (!text(observation.annotationMethod))
        throw new Error("Annotation method required");
    } else {
      if (
        !text(observation.errorReason) ||
        observation.brandMentioned !== null ||
        observation.citations !== null ||
        observation.responseArtifact !== undefined ||
        observation.responseHash !== undefined
      )
        throw new Error("Capture error must not contain result annotations");
    }
    validateAccuracyReview(observation, metadata.artifacts);
    const promptKey = JSON.stringify([
      observation.cohortId,
      observation.cohortVersion,
      observation.locale,
      observation.market,
      observation.promptId,
    ]);
    if (
      promptVersions.has(promptKey) &&
      promptVersions.get(promptKey) !== observation.prompt
    )
      throw new Error("Prompt text changed without a cohort version change");
    promptVersions.set(promptKey, observation.prompt);
    const existing = observations.get(observation.observationId);
    if (
      existing &&
      JSON.stringify(stable(existing)) !== JSON.stringify(stable(observation))
    )
      throw new Error("Conflicting observation ID");
    observations.set(observation.observationId, observation);
  }
  const groups = new Map();
  for (const observation of observations.values()) {
    const key = JSON.stringify(segments.map((field) => observation[field]));
    if (!groups.has(key))
      groups.set(key, {
        ...Object.fromEntries(
          segments.map((field) => [field, observation[field]]),
        ),
        capturedResponses: 0,
        captureErrors: 0,
        mentionPositive: 0,
        mentionKnown: 0,
        citationPositive: 0,
        citationKnown: 0,
        timestamps: [],
        promptIds: new Set(),
        accuracyObservations: [],
      });
    const group = groups.get(key);
    group.accuracyObservations.push(observation);
    group.timestamps.push(new Date(observation.capturedAt).toISOString());
    group.promptIds.add(observation.promptId);
    if (observation.status === "error") {
      group.captureErrors++;
      continue;
    }
    group.capturedResponses++;
    if (observation.brandMentioned !== null) {
      group.mentionKnown++;
      if (observation.brandMentioned) group.mentionPositive++;
    }
    if (observation.citations !== null) {
      group.citationKnown++;
      if (
        observation.citations.some((citation) =>
          metadata.brandHosts.includes(citationUrl(citation).hostname),
        )
      )
        group.citationPositive++;
    }
  }
  return {
    brand: metadata.brand,
    brandHosts: [...metadata.brandHosts],
    synthetic: metadata.synthetic,
    observations: [...observations.values()].sort((a, b) =>
      a.observationId.localeCompare(b.observationId),
    ),
    groups: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, group]) => {
        const {
          mentionPositive,
          mentionKnown,
          citationPositive,
          citationKnown,
          timestamps,
          promptIds,
          accuracyObservations,
          ...identity
        } = group;
        return {
          ...identity,
          promptIds: [...promptIds].sort(),
          from: timestamps.sort()[0],
          to: timestamps.at(-1),
          accuracy: summarizeAccuracy(accuracyObservations),
          mention: rate(mentionPositive, mentionKnown),
          citation: rate(citationPositive, citationKnown),
          mentionUnknown: group.capturedResponses - mentionKnown,
          citationUnknown: group.capturedResponses - citationKnown,
        };
      }),
    denominator:
      "Captured responses with supplied non-null annotations within each segment; capture errors and unknown annotations are disclosed separately. Citation means at least one exact authorized brand-host citation in a response, not share of all citations.",
    limitations: [
      "Artifact hashes verify supplied bytes, not capture authenticity or annotation correctness",
      "Accuracy uses supplied material-claim judgments, not automatic fact checking or population accuracy; no cross-period uplift, causal attribution or market-wide estimate is inferred",
      "Only supplied exact brand hosts count; subdomains must be explicitly listed",
    ],
  };
}
