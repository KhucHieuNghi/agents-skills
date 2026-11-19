import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { parseCaptureJson } from "./strict-json.mjs";
import {
  parseRobots,
  evaluateRobots,
} from "../../skills/content-search-audit/scripts/lib/robots.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
function exact(value, keys) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    "Invalid index control fields",
  );
}
function label(value) {
  assert(
    typeof value === "string" &&
      /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value),
    "Invalid control scope",
  );
  return value;
}
function url(value) {
  assert(
    typeof value === "string" &&
      value.length <= 8192 &&
      /^https?:\/\//i.test(value) &&
      !/[\s\\#]/.test(value) &&
      ![...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
    "Invalid control URL",
  );
  let result;
  try {
    result = new URL(value);
  } catch {
    throw new Error("Invalid control URL");
  }
  assert(!result.username && !result.password, "Unsafe control URL");
  return result.href;
}
function time(value) {
  assert(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value),
    "Invalid control timestamp",
  );
  const ms = Date.parse(value);
  assert(
    Number.isFinite(ms) &&
      new Date(ms).toISOString() === value.replace(/(?<!\.\d{3})Z$/, ".000Z"),
    "Invalid control calendar date",
  );
  return ms;
}
const status = (value) =>
  assert(
    Number.isInteger(value) && value >= 100 && value <= 599,
    "Invalid HTTP status",
  );
const simple = new Set([
  "all",
  "index",
  "follow",
  "noindex",
  "nofollow",
  "none",
  "nosnippet",
  "noimageindex",
  "notranslate",
  "noarchive",
  "nocache",
  "nositelinkssearchbox",
]);
const parameter = new Set([
  "max-snippet",
  "max-video-preview",
  "max-image-preview",
  "unavailable_after",
]);
function directives(text, header) {
  assert(
    typeof text === "string" && text.length <= 8192,
    "Invalid robots directive value",
  );
  if (
    /[\r\n]/.test(text) ||
    [...text].some((c) => c.charCodeAt(0) < 32 && c !== "\t")
  )
    return { complete: false, noindex: false };
  let value = text.trim().toLowerCase();
  if (header) {
    let agent = "googlebot";
    const prefix = /^([a-z_-]+)\s*:\s*/.exec(value);
    if (prefix && !parameter.has(prefix[1]) && !simple.has(prefix[1])) {
      agent = prefix[1];
      value = value.slice(prefix[0].length);
    }
    // Never attribute a later scoped segment to the preceding or global agent.
    for (const match of value.matchAll(/(?:^|,)\s*([a-z_-]+)\s*:/g))
      if (!parameter.has(match[1])) return { complete: false, noindex: false };
    if (agent !== "googlebot") return { complete: true, noindex: false };
  }
  let complete = true,
    noindex = false;
  for (const segment of value.split(",")) {
    const part = segment.trim();
    if (!part) continue;
    if (
      /^(?:max-snippet|max-video-preview)\s*:\s*(?:-1|\d+)$/.test(part) ||
      /^max-image-preview\s*:\s*(?:none|standard|large)$/.test(part)
    )
      continue;
    if (part.includes(":")) {
      complete = false;
      continue;
    }
    for (const token of part.split(/\s+/)) {
      if (!simple.has(token)) complete = false;
      else if (token === "noindex" || token === "none") noindex = true;
    }
  }
  return { complete, noindex };
}
function metaLayer(input) {
  exact(input, ["complete", "meta"]);
  assert(
    typeof input.complete === "boolean" &&
      Array.isArray(input.meta) &&
      input.meta.length <= 100,
    "Invalid meta projection",
  );
  let complete = input.complete,
    noindex = false;
  for (const item of input.meta) {
    exact(item, ["name", "content"]);
    assert(
      typeof item.name === "string" &&
        item.name.length <= 128 &&
        typeof item.content === "string" &&
        item.content.length <= 8192,
      "Invalid meta declaration",
    );
    if (!["robots", "googlebot"].includes(item.name.toLowerCase())) continue;
    const parsed = directives(item.content, false);
    complete &&= parsed.complete;
    noindex ||= parsed.noindex;
  }
  return { complete, noindex };
}
function headerLayer(input) {
  exact(input, ["complete", "values"]);
  assert(
    typeof input.complete === "boolean" &&
      Array.isArray(input.values) &&
      input.values.length <= 100,
    "Invalid header projection",
  );
  let complete = input.complete,
    noindex = false;
  for (const value of input.values) {
    const parsed = directives(value, true);
    complete &&= parsed.complete;
    noindex ||= parsed.noindex;
  }
  return { complete, noindex };
}
function robotPolicy(raw, target) {
  if (!raw.complete) return null;
  // Google's absent-policy semantics are separate from our conservative network authorization gate.
  if (raw.status >= 400 && raw.status < 500 && raw.status !== 429) return true;
  if (raw.status !== 200 && raw.status !== 204) return null;
  try {
    const parsed = parseRobots(raw.body),
      result = evaluateRobots(parsed, target, "Googlebot");
    if (!result.allowed && !result.matchedRule) return null;
    return result.allowed;
  } catch {
    return null;
  }
}
/** Supplied evidence only; no browser, network or indexing-state authority. */
export function evaluateIndexControls(context, source) {
  const scopeKeys = [
    "customerId",
    "entityId",
    "environment",
    "targetUrl",
    "profileId",
    "stateId",
  ];
  exact(context, [
    ...scopeKeys,
    "crawler",
    "assessmentAt",
    "maxAgeSeconds",
    "expectedCrawlAllowed",
    "expectedIndexable",
    "expectedHttpStatus",
  ]);
  assert(context.crawler === "googlebot", "Unsupported crawler policy");
  const scope = Object.fromEntries(
    scopeKeys.map((k) => [
      k,
      k === "targetUrl" ? url(context[k]) : label(context[k]),
    ]),
  );
  const at = time(context.assessmentAt);
  assert(
    Number.isSafeInteger(context.maxAgeSeconds) &&
      context.maxAgeSeconds >= 0 &&
      context.maxAgeSeconds <= 31622400,
    "Invalid control age budget",
  );
  for (const key of ["expectedCrawlAllowed", "expectedIndexable"])
    assert(
      context[key] === null || typeof context[key] === "boolean",
      "Invalid control intent",
    );
  if (context.expectedHttpStatus !== null) status(context.expectedHttpStatus);
  exact(source, ["sourceId", "artifactText", "artifactHash"]);
  label(source.sourceId);
  assert(
    typeof source.artifactText === "string" &&
      Buffer.byteLength(source.artifactText) <= 2 * 1024 * 1024 &&
      typeof source.artifactHash === "string" &&
      /^[a-f0-9]{64}$/.test(source.artifactHash) &&
      createHash("sha256").update(source.artifactText).digest("hex") ===
        source.artifactHash,
    "Invalid control bytes or hash",
  );
  const raw = parseCaptureJson(source.artifactText);
  exact(raw, [
    "schemaVersion",
    "scope",
    "capturedAt",
    "response",
    "robots",
    "sourceDocument",
    "renderedDocument",
    "httpHeaders",
  ]);
  assert(raw.schemaVersion === 1, "Unsupported control version");
  exact(raw.scope, scopeKeys);
  for (const k of scopeKeys)
    assert(
      (k === "targetUrl" ? url(raw.scope[k]) : raw.scope[k]) === scope[k],
      "Foreign control scope",
    );
  const captured = time(raw.capturedAt);
  assert(captured <= at, "Future page capture");
  const pageExpiry = captured + context.maxAgeSeconds * 1000,
    pageFresh = at < pageExpiry;
  exact(raw.response, ["url", "status"]);
  status(raw.response.status);
  const samePage = url(raw.response.url) === scope.targetUrl;
  exact(raw.robots, ["url", "capturedAt", "status", "body", "complete"]);
  status(raw.robots.status);
  assert(
    url(raw.robots.url) === new URL("/robots.txt", scope.targetUrl).href,
    "Foreign robots policy origin",
  );
  assert(
    typeof raw.robots.body === "string" &&
      Buffer.byteLength(raw.robots.body) <= 512000 &&
      typeof raw.robots.complete === "boolean",
    "Invalid robots capture",
  );
  const robotsTime = time(raw.robots.capturedAt);
  assert(robotsTime <= at, "Future robots capture");
  const robotsExpiry = robotsTime + context.maxAgeSeconds * 1000,
    robotsFresh = at < robotsExpiry;
  const layers = {
    sourceDocument: metaLayer(raw.sourceDocument),
    renderedDocument: metaLayer(raw.renderedDocument),
    httpHeaders: headerLayer(raw.httpHeaders),
  };
  const noindexLayers = Object.keys(layers).filter((k) => layers[k].noindex),
    noindex = noindexLayers.length > 0;
  const complete = Object.values(layers).every((l) => l.complete);
  const crawlAllowed = robotPolicy(raw.robots, scope.targetUrl);
  const checks = [];
  function check(ruleId, value, expected, reason, expiry, fresh) {
    checks.push({
      ruleId,
      ruleVersion: "1",
      status:
        !fresh || value === null || expected === null
          ? "unknown"
          : value === expected
            ? "pass"
            : "fail",
      reason: !fresh
        ? "expired-control-evidence"
        : expected === null
          ? "owner-intent-not-supplied"
          : value === null
            ? reason
            : value === expected
              ? "observed-control-matches-intent"
              : "observed-control-differs-from-intent",
      sourceIds: [source.sourceId],
      validUntil: new Date(expiry).toISOString(),
    });
  }
  check(
    "http-status-owner-intent",
    samePage ? raw.response.status : null,
    context.expectedHttpStatus,
    "response-url-mismatch",
    pageExpiry,
    pageFresh,
  );
  check(
    "googlebot-crawl-owner-intent",
    crawlAllowed,
    context.expectedCrawlAllowed,
    "robots-policy-unavailable-or-unsupported",
    robotsExpiry,
    robotsFresh,
  );
  // An explicit noindex in any inspected phase is retained, including before JavaScript removes it.
  const directiveAllows = samePage
    ? noindex
      ? false
      : complete
        ? true
        : null
    : null;
  check(
    "indexing-directive-owner-intent",
    directiveAllows,
    context.expectedIndexable,
    samePage ? "incomplete-indexing-directives" : "response-url-mismatch",
    pageExpiry,
    pageFresh,
  );
  const dataRequests = checks
    .filter((c) => c.status === "unknown")
    .map((c) => ({
      ruleIds: [c.ruleId],
      reason: c.reason,
      requestedArtifact:
        c.ruleId === "googlebot-crawl-owner-intent"
          ? "Fresh complete origin robots response, status and policy; confirm intended Googlebot crawl access"
          : c.ruleId === "http-status-owner-intent"
            ? "Fresh directly scoped HTTP response and intended status"
            : "Complete source/rendered/head and X-Robots-Tag evidence plus intended page indexing directives",
      ownerRole: "website-engineering-and-seo-owner",
      scope,
      acceptedFormats: ["index-controls-v1", "owner-indexing-policy-json"],
      fallback:
        "Keep unsupported scope unknown; local signals do not establish provider indexing.",
    }));
  return {
    scope,
    crawler: context.crawler,
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    capturedAt: raw.capturedAt,
    checks,
    dataRequests,
    observation: {
      httpStatus: raw.response.status,
      responseMatchesTarget: samePage,
      robotsCapturedAt: raw.robots.capturedAt,
      crawlAllowed,
      noindexLayers,
      directiveCoverageComplete: complete,
      directiveDiscoverability:
        samePage &&
        pageFresh &&
        robotsFresh &&
        crawlAllowed === true &&
        raw.response.status === 200
          ? "observed-accessible"
          : "unknown",
    },
    indexingStatus: "unknown",
    executionAuthenticated: false,
    semanticAcceptance: false,
    coverage: "single-supplied-index-controls",
    limitations: [
      "Typed source and rendered projections are supplied, not independently authenticated",
      "Declared controls do not establish actual crawler access, indexed state, soft-404 status or meaningful content",
      "Noindex observed before rendering remains relevant after JavaScript removal",
      "Robots response semantics here assess Googlebot only and never authorize collection",
      "Unknown directive grammar cannot establish clean absence; embedded-content and unavailable_after semantics are not assessed",
    ],
  };
}
