import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { parseCaptureJson } from "./strict-json.mjs";
import { evaluateHreflangGraph } from "./hreflang-graph.mjs";
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
    Buffer.byteLength(source.artifactText) > 1024 * 1024 ||
    typeof source.artifactHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(source.artifactHash) ||
    createHash("sha256").update(source.artifactText).digest("hex") !==
      source.artifactHash
  )
    throw new Error("Invalid artifact bytes or hash");
  return parseCaptureJson(source.artifactText);
}
/** Integrity-bound supplied evidence; hashes do not authenticate execution. */
export function evaluateHreflangCapture(context, source) {
  exact(
    context,
    [...scopeKeys, "method", "assessmentAt", "maxAgeSeconds"],
    "context",
  );
  const scope = Object.fromEntries(
    scopeKeys.map((key) => [
      key,
      key === "targetUrl" ? target(context[key]) : label(context[key]),
    ]),
  );
  const assessment = timestamp(context.assessmentAt);
  let raw = readSource(source);
  let provenance = [];
  if (raw.schemaVersion === 2) {
    exact(
      raw,
      ["schemaVersion", "scope", "method", "captures"],
      "graph capture",
    );
    if (
      !Array.isArray(raw.captures) ||
      !raw.captures.length ||
      raw.captures.length > 100
    )
      throw new Error("Invalid component capture budget");
    const pages = raw.captures.map((component, index) => {
      const child = readSource(component);
      if (
        child.schemaVersion !== 1 ||
        !Array.isArray(child.pages) ||
        child.pages.length !== 1
      )
        throw new Error(
          "Graph components must be single-page version 1 captures",
        );
      const componentUrl = target(child.scope?.targetUrl);
      evaluateHreflangCapture(
        { ...context, targetUrl: componentUrl },
        component,
      );
      if (target(child.pages[0].url) !== componentUrl)
        throw new Error("Component page scope mismatch");
      provenance.push({
        pageUrl: componentUrl,
        sourceId: component.sourceId,
        artifactHash: component.artifactHash,
        componentIndex: index,
      });
      return child.pages[0];
    });
    const root = pages.find((page) => target(page.url) === scope.targetUrl);
    if (!root) throw new Error("Graph root capture required");
    const permitted = new Set([
      scope.targetUrl,
      ...root.alternates.map((item) => target(item.targetUrl)),
    ]);
    if (pages.some((page) => !permitted.has(target(page.url))))
      throw new Error("Unrelated graph component");
    raw = { schemaVersion: 1, scope: raw.scope, method: raw.method, pages };
  }
  exact(raw, ["schemaVersion", "scope", "method", "pages"], "capture");
  if (raw.schemaVersion !== 1) throw new Error("Unsupported schema version");
  exact(raw.scope, scopeKeys, "scope");
  for (const key of scopeKeys)
    if (
      (key === "targetUrl" ? target(raw.scope[key]) : label(raw.scope[key])) !==
      scope[key]
    )
      throw new Error(`Mismatched ${key}`);
  if (raw.method !== context.method) throw new Error("Mismatched method");
  const graph = evaluateHreflangGraph({
    assessmentAt: context.assessmentAt,
    maxAgeSeconds: context.maxAgeSeconds,
    targetUrl: scope.targetUrl,
    method: context.method,
    pages: raw.pages,
  });
  const root = raw.pages.find((page) => target(page.url) === scope.targetUrl);
  const rootExpiry = root
    ? timestamp(root.capturedAt) + context.maxAgeSeconds * 1000
    : assessment;
  const relevant = new Set(
    root?.alternates.map((item) => target(item.targetUrl)) ?? [],
  );
  // Conservative shared validity bound over the fresh root and fresh direct targets only.
  const expirations = raw.pages
    .filter((page) => relevant.has(target(page.url)))
    .map((page) => timestamp(page.capturedAt) + context.maxAgeSeconds * 1000)
    .filter((expiry) => expiry > assessment);
  const validUntil = new Date(
    Math.min(rootExpiry, ...expirations),
  ).toISOString();
  const rows = [
    ...graph.checks,
    {
      ruleId: "hreflang-root-language-codes",
      ruleVersion: "1",
      status: graph.languageValidity,
      reason:
        graph.languageValidity === "fail"
          ? "unsupported-root-language-code"
          : graph.languageValidity === "pass"
            ? "root-code-forms-registered"
            : "insufficient-current-language-evidence",
    },
    {
      ruleId: "hreflang-root-language-mapping",
      ruleVersion: "1",
      status: graph.languageMapping,
      reason:
        graph.languageMapping === "fail"
          ? "conflicting-root-language-targets"
          : graph.languageMapping === "pass"
            ? "root-language-targets-unambiguous"
            : "insufficient-current-mapping-evidence",
    },
    {
      ruleId: "hreflang-shared-language-mapping",
      ruleVersion: "1",
      status: graph.crossPageLanguageMapping,
      reason:
        graph.crossPageLanguageMapping === "fail"
          ? "conflicting-shared-language-targets"
          : graph.crossPageLanguageMapping === "pass"
            ? "observed-shared-language-assignments-agree"
            : "insufficient-cross-page-language-evidence",
    },
  ];
  const checks = rows.map((row) => ({
    ...row,
    sourceIds: [source.sourceId],
    validUntil,
  }));
  const rootIndex = raw.pages.indexOf(root);
  const locator = (request) => {
    if (rootIndex < 0) return "scope.targetUrl";
    const prefix = provenance.length
      ? `captures[${rootIndex}].artifactText (parse JSON), pages[0]`
      : `pages[${rootIndex}]`;
    if (request.url === scope.targetUrl) return `${prefix}.url`;
    const index = root.alternates.findIndex(
      (item) => target(item.targetUrl) === request.url,
    );
    return `${prefix}.alternates[${index}].targetUrl`;
  };
  const dataRequests = graph.dataRequests.map((request) => ({
    ...request,
    scope,
    method: context.method,
    ownerRole:
      request.reason.includes("review") ||
      request.reason.includes("confirmation")
        ? "seo-owner"
        : "website-engineering",
    requestedArtifact: `Reason ${request.reason}; resolve the exact URL in private source ${source.sourceId} at ${locator(request)}. Supply fresh declarations for the selected method/profile/state, or documented owner language policy where requested`,
    acceptedFormats: [
      "hreflang-capture-v1",
      "hreflang-capture-v2",
      "owner-language-policy-markdown",
    ],
    fallback:
      "Keep affected checks unknown; continue independent checks with available evidence.",
  }));
  return {
    scope,
    method: context.method,
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    capturedAt: root?.capturedAt ?? null,
    provenance,
    pageCapturedAt: raw.pages.map((page) => page.capturedAt),
    validUntil,
    checks,
    dataRequests,
    languageObservations: graph.languageObservations,
    contentEquivalence: "unknown",
    targetIndexability: "unknown",
    executionAuthenticated: false,
    semanticAcceptance: false,
    coverage: "single-supplied-method-root-and-direct-targets",
    limitations: [
      "Caller-supplied scope is not independently authenticated",
      "Root language mapping does not establish cross-page language consistency",
      "No native acquisition, target eligibility or actual content-language verification",
    ],
  };
}

/** Offline composition only: preserve each original scoped envelope, never fetch targets. */
export function assembleHreflangCaptures(context, captures) {
  if (!Array.isArray(captures) || !captures.length || captures.length > 100)
    throw new Error("Invalid component capture budget");
  let bytes = 0;
  for (const component of captures) {
    if (typeof component?.artifactText !== "string")
      throw new Error("Invalid component bytes");
    bytes += Buffer.byteLength(component.artifactText);
    if (bytes > 1024 * 1024) throw new Error("Component byte budget exceeded");
    readSource(component);
  }
  const scope = Object.fromEntries(scopeKeys.map((key) => [key, context[key]]));
  const artifactText = JSON.stringify({
    schemaVersion: 2,
    scope,
    method: context.method,
    captures,
  });
  const source = {
    sourceId: "assembled-hreflang-graph",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
  evaluateHreflangCapture(context, source);
  return source;
}
