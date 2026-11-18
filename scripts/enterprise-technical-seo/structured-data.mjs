import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { parseCaptureJson } from "./strict-json.mjs";
import { inspectJsonLdBlocks } from "./jsonld.mjs";
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

function readSource(source) {
  exact(source, ["sourceId", "artifactText", "artifactHash"], "source");
  label(source.sourceId);
  if (
    typeof source.artifactText !== "string" ||
    Buffer.byteLength(source.artifactText) > 2 * 1024 * 1024 ||
    typeof source.artifactHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(source.artifactHash) ||
    createHash("sha256").update(source.artifactText).digest("hex") !==
      source.artifactHash
  )
    throw new Error("Invalid artifact bytes or hash");
  return parseCaptureJson(source.artifactText);
}
/** Scoped JSON-LD observations, not full JSON-LD/schema or rich-result acceptance. */
export function evaluateStructuredData(context, source) {
  exact(
    context,
    [...scopeKeys, "method", "assessmentAt", "maxAgeSeconds", "expectedTypes"],
    "context",
  );
  const scope = Object.fromEntries(
    scopeKeys.map((key) => [
      key,
      key === "targetUrl" ? target(context[key]) : label(context[key]),
    ]),
  );
  const at = timestamp(context.assessmentAt);
  if (!["html-source", "html-rendered"].includes(context.method))
    throw new Error("Unsupported structured-data method");
  if (
    !Number.isSafeInteger(context.maxAgeSeconds) ||
    context.maxAgeSeconds < 0 ||
    context.maxAgeSeconds > 31622400
  )
    throw new Error("Invalid maximum age");
  const expected = context.expectedTypes;
  if (
    expected !== null &&
    (!Array.isArray(expected) ||
      !expected.length ||
      expected.length > 20 ||
      new Set(expected).size !== expected.length ||
      expected.some(
        (value) =>
          typeof value !== "string" ||
          !/^[A-Za-z][A-Za-z0-9]{0,127}$/.test(value),
      ))
  )
    throw new Error("Invalid expected type policy");
  const raw = readSource(source);
  exact(
    raw,
    [
      "schemaVersion",
      "scope",
      "method",
      "capturedAt",
      "projection",
      "otherFormatsObserved",
    ],
    "capture",
  );
  if (raw.schemaVersion !== 1) throw new Error("Unsupported schema version");
  exact(raw.scope, scopeKeys, "scope");
  for (const key of scopeKeys)
    if (
      (key === "targetUrl" ? target(raw.scope[key]) : label(raw.scope[key])) !==
      scope[key]
    )
      throw new Error(`Mismatched ${key}`);
  if (raw.method !== context.method) throw new Error("Mismatched method");
  const captured = timestamp(raw.capturedAt);
  if (captured > at) throw new Error("Future structured-data capture");
  if (
    !Array.isArray(raw.otherFormatsObserved) ||
    raw.otherFormatsObserved.length > 2 ||
    new Set(raw.otherFormatsObserved).size !==
      raw.otherFormatsObserved.length ||
    raw.otherFormatsObserved.some(
      (value) => !["microdata-marker", "rdfa-marker"].includes(value),
    )
  )
    throw new Error("Invalid format markers");
  const result = inspectJsonLdBlocks(raw.projection),
    expires = captured + context.maxAgeSeconds * 1000,
    fresh = at < expires;
  const types = new Set(
    result.observations.flatMap((block) =>
      block.types.map((item) => item.type),
    ),
  );
  const shapes = result.observations.map((block) => block.documentShape);
  const shapeStatus = shapes.includes("fail")
    ? "fail"
    : raw.projection.complete &&
        shapes.length &&
        shapes.every((value) => value === "pass")
      ? "pass"
      : "unknown";
  // An explicit JSON-LD policy does not accept another serialization as an implicit substitute.
  const allExpected =
    expected !== null && expected.every((value) => types.has(value));
  const absenceEstablished =
    raw.projection.complete &&
    (raw.projection.blocks.length === 0 || result.typeCoverageComplete);
  const typeStatus =
    expected === null
      ? "unknown"
      : allExpected
        ? "pass"
        : absenceEstablished
          ? "fail"
          : "unknown";
  const blockLocations = (predicate) =>
    result.observations.flatMap((block, index) =>
      predicate(block) ? [`projection.blocks[${index}].text`] : [],
    );
  const syntaxLocations = blockLocations(
    (block) => block.jsonSyntax === "fail",
  );
  const shapeLocations = blockLocations(
    (block) => block.documentShape === "fail",
  );
  const pendingLocations = blockLocations((block) => block.pending.length > 0);
  const checks = [
    {
      ruleId: "jsonld-json-syntax",
      status: result.jsonSyntax,
      reason:
        result.jsonSyntax === "fail"
          ? "observed-invalid-json-syntax"
          : result.jsonSyntax === "pass"
            ? "observed-json-syntax-valid"
            : "insufficient-json-syntax-evidence",
    },
    {
      ruleId: "jsonld-document-root-shape",
      status: shapeStatus,
      reason:
        shapeStatus === "fail"
          ? "observed-invalid-document-root-shape"
          : shapeStatus === "pass"
            ? "observed-object-or-object-array-root"
            : "insufficient-root-shape-evidence",
    },
    {
      ruleId: "jsonld-owner-type-presence",
      status: typeStatus,
      reason:
        expected === null
          ? "jsonld-type-policy-not-supplied"
          : typeStatus === "pass"
            ? "observed-type-terms-match-owner-jsonld-policy"
            : typeStatus === "fail"
              ? "expected-jsonld-type-term-not-observed"
              : "type-expansion-or-coverage-required",
    },
    {
      ruleId: "structured-data-visible-content",
      status: "unknown",
      reason: "visible-content-comparison-not-supplied",
    },
  ].map((check) => ({
    ...check,
    ruleVersion: "1",
    status: fresh ? check.status : "unknown",
    reason: !fresh
      ? "expired-structured-data-capture"
      : check.reason +
        (check.status === "fail" && check.ruleId === "jsonld-json-syntax"
          ? `; private source ${source.sourceId} at ${syntaxLocations.join(", ")}`
          : check.status === "fail" &&
              check.ruleId === "jsonld-document-root-shape"
            ? `; private source ${source.sourceId} at ${shapeLocations.join(", ")}`
            : check.ruleId === "jsonld-owner-type-presence" && expected !== null
              ? `; owner JSON-LD type policy ${expected.join(", ")}; private source ${source.sourceId} at projection.blocks`
              : ""),
    sourceIds: [source.sourceId],
    validUntil: new Date(expires).toISOString(),
  }));
  const dataRequests = checks
    .filter((check) => check.status === "unknown")
    .map((check) => ({
      reason: check.reason,
      scope,
      method: context.method,
      ownerRole: "seo-and-content-owner",
      requestedArtifact:
        check.ruleId === "structured-data-visible-content"
          ? "Visible page content with entity/claim mapping and owner sources for the same URL/profile/state; evaluate markup relevance and accuracy separately"
          : check.ruleId === "jsonld-owner-type-presence" && expected === null
            ? "Explicit intended JSON-LD type terms and rationale for this page, or confirmation that no JSON-LD requirement has been selected"
            : `Fresh complete inline JSON-LD capture and, for unsupported contexts, a scoped offline expansion artifact with original context definitions. Private source ${source.sourceId}; unresolved locations: ${pendingLocations.length ? pendingLocations.join(", ") : "projection.blocks"}`,
      acceptedFormats: [
        "structured-data-capture-v1",
        "owner-jsonld-policy-json",
        "scoped-visible-content-evidence",
      ],
      fallback:
        "Keep the affected check unknown; no schema absence, validity or rich-result guarantee is inferred.",
    }));
  return {
    scope,
    method: context.method,
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    capturedAt: raw.capturedAt,
    validUntil: new Date(expires).toISOString(),
    checks,
    dataRequests,
    observations: result.observations,
    otherFormatsObserved: raw.otherFormatsObserved,
    richResultEligibility: "unknown",
    typeVocabularyValidity: "unknown",
    executionAuthenticated: false,
    semanticAcceptance: false,
    limitations: result.limitations,
  };
}
