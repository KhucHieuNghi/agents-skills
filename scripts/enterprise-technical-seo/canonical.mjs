import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { parseCaptureJson } from "./strict-json.mjs";
const layers = ["sourceHead", "renderedHead", "httpLink"];
const scopeKeys = [
  "customerId",
  "entityId",
  "environment",
  "targetUrl",
  "profileId",
  "stateId",
];
function exact(value, keys, name) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error(`Invalid ${name} fields`);
}
function label(value) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value)
  )
    throw new Error("Invalid scope identifier");
  return value;
}
function timestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    throw new Error("Expected UTC timestamp");
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== value.replace(/(?<!\.\d{3})Z$/, ".000Z")
  )
    throw new Error("Invalid calendar timestamp");
  return date.getTime();
}
function target(value, allowFragment = false) {
  if (
    typeof value !== "string" ||
    value.length > 8192 ||
    !/^https?:\/\//i.test(value) ||
    [...value].some(
      (char) =>
        char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\",
    )
  )
    throw new Error("Expected absolute HTTP URL");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid HTTP URL");
  }
  if (
    parsed.username ||
    parsed.password ||
    (!allowFragment && value.includes("#"))
  )
    throw new Error("Unsafe or fragmented URL");
  return parsed.href;
}
/** Supplied typed projections only. Hash integrity does not authenticate browser execution. */
export function evaluateCanonicalCapture(context, source) {
  exact(
    context,
    [...scopeKeys, "assessmentAt", "maxAgeSeconds", "expectedCanonical"],
    "context",
  );
  const scope = Object.fromEntries(
    scopeKeys.map((key) => [
      key,
      key === "targetUrl" ? target(context[key]) : label(context[key]),
    ]),
  );
  const assessment = timestamp(context.assessmentAt);
  if (
    !Number.isSafeInteger(context.maxAgeSeconds) ||
    context.maxAgeSeconds < 0 ||
    context.maxAgeSeconds > 31622400
  )
    throw new Error("Invalid maximum age");
  const expected =
    context.expectedCanonical === null
      ? null
      : target(context.expectedCanonical);
  exact(source, ["sourceId", "artifactText", "artifactHash"], "source");
  label(source.sourceId);
  if (
    typeof source.artifactText !== "string" ||
    Buffer.byteLength(source.artifactText) > 1024 * 1024 ||
    typeof source.artifactHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(source.artifactHash) ||
    createHash("sha256").update(source.artifactText).digest("hex") !==
      source.artifactHash
  )
    throw new Error("Invalid artifact bytes or hash");
  const raw = parseCaptureJson(source.artifactText);
  exact(raw, ["schemaVersion", "scope", "capturedAt", "layers"], "capture");
  if (raw.schemaVersion !== 1) throw new Error("Unsupported schema version");
  exact(raw.scope, scopeKeys, "scope");
  for (const key of scopeKeys) {
    const value =
      key === "targetUrl" ? target(raw.scope[key]) : label(raw.scope[key]);
    if (value !== scope[key]) throw new Error(`Mismatched ${key}`);
  }
  const captured = timestamp(raw.capturedAt);
  if (captured > assessment) throw new Error("Future capture");
  const expires = captured + context.maxAgeSeconds * 1000;
  const fresh = assessment < expires;
  exact(raw.layers, layers, "layers");
  const observed = [];
  for (const layer of layers) {
    const input = raw.layers[layer];
    exact(input, ["complete", "targets"], "layer");
    if (
      typeof input.complete !== "boolean" ||
      !Array.isArray(input.targets) ||
      input.targets.length > 100
    )
      throw new Error("Invalid layer coverage or target budget");
    for (const value of input.targets)
      observed.push({
        layer,
        url: target(value, true),
        fragment: value.includes("#"),
      });
  }
  const complete = layers.every((layer) => raw.layers[layer].complete);
  const unique = [...new Set(observed.map((item) => item.url))];
  const invalid = observed.some((item) => item.fragment);
  const checks = [];
  function check(ruleId, status, reason) {
    checks.push({
      ruleId,
      ruleVersion: "1",
      status: fresh ? status : "unknown",
      reason: fresh ? reason : "expired-capture",
      sourceIds: [source.sourceId],
      validUntil: new Date(expires).toISOString(),
    });
  }
  check(
    "canonical-target-format",
    invalid ? "fail" : complete && unique.length ? "pass" : "unknown",
    invalid
      ? "fragment-target"
      : complete && unique.length
        ? "observed-target-format-valid"
        : "insufficient-target-evidence",
  );
  check(
    "canonical-consistency",
    unique.length > 1
      ? "fail"
      : complete && unique.length === 1 && !invalid
        ? "pass"
        : "unknown",
    unique.length > 1
      ? "conflicting-declared-targets"
      : complete && unique.length === 1 && !invalid
        ? "observed-layers-consistent"
        : "insufficient-consistency-evidence",
  );
  const mismatch = expected !== null && unique.some((url) => url !== expected);
  const intentPass =
    expected !== null &&
    complete &&
    unique.length === 1 &&
    !invalid &&
    !mismatch;
  check(
    "canonical-owner-intent",
    mismatch ? "fail" : intentPass ? "pass" : "unknown",
    expected === null
      ? "owner-intent-not-supplied"
      : mismatch
        ? "declared-target-differs-from-owner-intent"
        : intentPass
          ? "observed-target-matches-owner-intent"
          : "insufficient-intent-evidence",
  );
  const dataRequests = [];
  function request(reason, layer, requestedArtifact, ownerRole) {
    dataRequests.push({
      reason,
      layer,
      requestedArtifact,
      ownerRole,
      scope,
      acceptedFormats:
        ownerRole === "seo-owner"
          ? ["owner-canonical-policy-json", "owner-canonical-policy-markdown"]
          : ["canonical-capture-v1"],
      fallback:
        "Keep the affected checks unknown; continue independent checks with available evidence.",
    });
  }
  if (!fresh)
    request(
      "expired-capture",
      null,
      "Fresh source-head, rendered-head and final-response canonical capture with the same declared browser profile and page state",
      "website-engineering",
    );
  else {
    for (const layer of layers)
      if (!raw.layers[layer].complete)
        request(
          "incomplete-layer",
          layer,
          `Complete ${layer} canonical target projection, including explicit empty result if no declarations were present`,
          "website-engineering",
        );
    if (!unique.length)
      request(
        "no-declared-canonical",
        null,
        "Owner canonical strategy and provider inspection; no canonical declaration alone is not a website defect",
        "seo-owner",
      );
  }
  if (expected === null)
    request(
      "owner-intent-not-supplied",
      null,
      "Preferred canonical URL and rationale for this exact page, or explicit absence of a preference",
      "seo-owner",
    );
  return {
    scope,
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    capturedAt: raw.capturedAt,
    validUntil: new Date(expires).toISOString(),
    checks,
    dataRequests,
    indexingStatus: "unknown",
    googleSelectedCanonical: null,
    executionAuthenticated: false,
    semanticAcceptance: false,
    coverage: "single-supplied-capture",
    limitations: [
      "Supplied projections are not independently verified against native HTML, DOM or headers",
      "Consistency does not establish target reachability, content equivalence, indexing, ranking or Google-selected canonical",
      "No aggregation across captures, devices, states or site URLs",
    ],
  };
}
