import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { parseCaptureJson } from "./strict-json.mjs";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const object = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
function exact(value, keys, label) {
  assert(
    object(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${label}`,
  );
}
function label(value) {
  assert(
    typeof value === "string" &&
      /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value),
    "Invalid identity",
  );
  return value;
}
function url(value) {
  assert(
    typeof value === "string" &&
      value.length <= 8192 &&
      /^https?:\/\//i.test(value) &&
      !/[\s\\#]/.test(value) &&
      ![...value].some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      ),
    "Invalid inspection URL",
  );
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid inspection URL");
  }
  assert(!parsed.username && !parsed.password, "Unsafe inspection URL");
  return parsed.href;
}
// Provider timestamps may have nanoseconds. Compare exact precision rather than rounding to milliseconds.
function nanos(value) {
  assert(typeof value === "string", "Invalid inspection timestamp");
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(
    value,
  );
  assert(match, "Invalid inspection timestamp");
  const ms = Date.parse(match[1] + "Z");
  assert(
    Number.isFinite(ms) && new Date(ms).toISOString() === match[1] + ".000Z",
    "Invalid inspection calendar date",
  );
  return BigInt(ms) * 1000000n + BigInt((match[2] ?? "").padEnd(9, "0"));
}
function property(value, target) {
  assert(typeof value === "string", "Invalid inspection property");
  const page = new URL(target);
  if (value.startsWith("sc-domain:")) {
    const domain = value.slice(10);
    assert(
      domain.length <= 253 &&
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
          domain,
        ),
      "Invalid domain property",
    );
    assert(
      page.hostname === domain || page.hostname.endsWith("." + domain),
      "URL outside property",
    );
    return value;
  }
  const normalized = url(value),
    prefix = new URL(normalized);
  assert(
    !prefix.search && prefix.pathname.endsWith("/"),
    "Invalid URL-prefix property",
  );
  assert(
    page.origin === prefix.origin && page.pathname.startsWith(prefix.pathname),
    "URL outside property",
  );
  return normalized;
}
function optionalString(value, max = 256) {
  if (value === undefined) return null;
  assert(
    typeof value === "string" && value.length <= max,
    "Invalid provider field",
  );
  return value || null;
}
const enums = {
  verdict: ["VERDICT_UNSPECIFIED", "PASS", "PARTIAL", "FAIL", "NEUTRAL"],
  robotsTxtState: ["ROBOTS_TXT_STATE_UNSPECIFIED", "ALLOWED", "DISALLOWED"],
  indexingState: [
    "INDEXING_STATE_UNSPECIFIED",
    "INDEXING_ALLOWED",
    "BLOCKED_BY_META_TAG",
    "BLOCKED_BY_HTTP_HEADER",
    "BLOCKED_BY_ROBOTS_TXT",
  ],
  pageFetchState: [
    "PAGE_FETCH_STATE_UNSPECIFIED",
    "SUCCESSFUL",
    "SOFT_404",
    "BLOCKED_ROBOTS_TXT",
    "NOT_FOUND",
    "ACCESS_DENIED",
    "SERVER_ERROR",
    "REDIRECT_ERROR",
    "ACCESS_FORBIDDEN",
    "BLOCKED_4XX",
    "INTERNAL_CRAWL_ERROR",
    "INVALID_URL",
  ],
  crawledAs: ["CRAWLING_USER_AGENT_UNSPECIFIED", "DESKTOP", "MOBILE"],
};
/** Supplied original API response plus explicit request/receipt metadata. No IO or execution authority. */
export function evaluateUrlInspection(context, source) {
  exact(
    context,
    [
      "customerId",
      "entityId",
      "environment",
      "targetUrl",
      "property",
      "assessmentAt",
      "maxAgeSeconds",
      "expectedIndexed",
      "expectedCanonical",
    ],
    "inspection context",
  );
  const scope = {
    customerId: label(context.customerId),
    entityId: label(context.entityId),
    environment: label(context.environment),
    targetUrl: url(context.targetUrl),
  };
  scope.property = property(context.property, scope.targetUrl);
  assert(
    typeof context.assessmentAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
        context.assessmentAt,
      ),
    "Unsupported assessment precision",
  );
  const assessment = nanos(context.assessmentAt);
  assert(
    Number.isSafeInteger(context.maxAgeSeconds) &&
      context.maxAgeSeconds >= 0 &&
      context.maxAgeSeconds <= 31622400,
    "Invalid inspection age budget",
  );
  assert(
    context.expectedIndexed === null ||
      typeof context.expectedIndexed === "boolean",
    "Invalid indexing intent",
  );
  const expectedCanonical =
    context.expectedCanonical === null ? null : url(context.expectedCanonical);
  exact(
    source,
    ["sourceId", "artifactText", "artifactHash"],
    "inspection source",
  );
  label(source.sourceId);
  assert(
    typeof source.artifactText === "string" &&
      Buffer.byteLength(source.artifactText) <= 1024 * 1024 &&
      typeof source.artifactHash === "string" &&
      /^[a-f0-9]{64}$/.test(source.artifactHash) &&
      createHash("sha256").update(source.artifactText).digest("hex") ===
        source.artifactHash,
    "Invalid inspection bytes or hash",
  );
  const raw = parseCaptureJson(source.artifactText);
  exact(
    raw,
    ["schemaVersion", "scope", "request", "retrievedAt", "response"],
    "inspection envelope",
  );
  assert(raw.schemaVersion === 1, "Unsupported inspection version");
  exact(
    raw.scope,
    ["customerId", "entityId", "environment"],
    "inspection scope",
  );
  for (const key of ["customerId", "entityId", "environment"])
    assert(raw.scope[key] === scope[key], "Foreign inspection scope");
  assert(
    object(raw.request) &&
      Object.keys(raw.request).every((k) =>
        ["inspectionUrl", "siteUrl", "languageCode"].includes(k),
      ),
    "Invalid inspection request",
  );
  assert(
    url(raw.request.inspectionUrl) === scope.targetUrl &&
      property(raw.request.siteUrl, scope.targetUrl) === scope.property,
    "Inspection request mismatch",
  );
  if (Object.hasOwn(raw.request, "languageCode"))
    assert(
      typeof raw.request.languageCode === "string" &&
        /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(raw.request.languageCode),
      "Invalid inspection language",
    );
  assert(
    typeof raw.retrievedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
        raw.retrievedAt,
      ),
    "Unsupported retrieval precision",
  );
  const retrieved = nanos(raw.retrievedAt);
  assert(retrieved <= assessment, "Future inspection retrieval");
  const expires = retrieved + BigInt(context.maxAgeSeconds) * 1000000000n,
    fresh = assessment < expires;
  assert(
    object(raw.response) &&
      object(raw.response.inspectionResult) &&
      !Object.hasOwn(raw.response, "error"),
    "Missing successful inspection result",
  );
  const result = raw.response.inspectionResult;
  assert(
    result.indexStatusResult === undefined || object(result.indexStatusResult),
    "Invalid index result",
  );
  const index = result.indexStatusResult ?? {},
    observation = {};
  const unsupported = [];
  for (const [key, known] of Object.entries(enums)) {
    observation[key] = optionalString(index[key]);
    if (observation[key] !== null && !known.includes(observation[key]))
      unsupported.push(key);
  }
  observation.lastCrawlTime = optionalString(index.lastCrawlTime, 40);
  if (observation.lastCrawlTime !== null)
    assert(
      nanos(observation.lastCrawlTime) <= retrieved,
      "Future provider crawl",
    );
  for (const key of ["googleCanonical", "userCanonical"]) {
    const value = optionalString(index[key], 8192);
    observation[key] = value === null ? null : url(value);
  }
  const indexed =
    observation.verdict === "PASS"
      ? true
      : ["FAIL", "NEUTRAL"].includes(observation.verdict)
        ? false
        : null;
  const checks = [];
  function check(ruleId, status, reason) {
    checks.push({
      ruleId,
      ruleVersion: "1",
      status: fresh ? status : "unknown",
      reason: fresh ? reason : "expired-inspection",
      sourceIds: [source.sourceId],
    });
  }
  check(
    "gsc-indexing-owner-intent",
    context.expectedIndexed === null || indexed === null
      ? "unknown"
      : indexed === context.expectedIndexed
        ? "pass"
        : "fail",
    context.expectedIndexed === null
      ? "indexing-intent-not-supplied"
      : indexed === null
        ? "provider-verdict-unavailable"
        : indexed === context.expectedIndexed
          ? "provider-verdict-matches-intent"
          : "provider-verdict-differs-from-intent",
  );
  check(
    "gsc-canonical-owner-intent",
    expectedCanonical === null || observation.googleCanonical === null
      ? "unknown"
      : observation.googleCanonical === expectedCanonical
        ? "pass"
        : "fail",
    expectedCanonical === null
      ? "canonical-intent-not-supplied"
      : observation.googleCanonical === null
        ? "provider-canonical-unavailable"
        : observation.googleCanonical === expectedCanonical
          ? "provider-canonical-matches-intent"
          : "provider-canonical-differs-from-intent",
  );
  const dataRequests = [];
  const request = (reason, requestedArtifact, ownerRole) =>
    dataRequests.push({
      reason,
      requestedArtifact,
      ownerRole,
      scope,
      acceptedFormats: ["gsc-url-inspection-v1", "owner-indexing-policy-json"],
      fallback:
        "Retain historical observations and keep unsupported checks unknown; continue other modules.",
    });
  if (!fresh)
    request(
      "expired-inspection",
      "Fresh original URL Inspection response plus exact property, request and retrieval timestamp",
      "search-console-owner",
    );
  if (context.expectedIndexed === null || expectedCanonical === null)
    request(
      "missing-owner-intent",
      "Desired indexed/excluded state and preferred canonical, or explicit absence of preference for this URL",
      "seo-owner",
    );
  if (
    indexed === null ||
    observation.googleCanonical === null ||
    unsupported.length
  )
    request(
      "incomplete-provider-result",
      "Review original provider result and absent or unsupported fields; do not infer missing canonical from live HTML",
      "search-console-owner",
    );
  return {
    scope,
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    retrievedAt: raw.retrievedAt,
    validUntil: new Date(Number(expires / 1000000n)).toISOString(),
    fresh,
    observation,
    unsupportedFields: unsupported,
    checks,
    dataRequests,
    liveIndexability: "unknown",
    executionAuthenticated: false,
    semanticAcceptance: false,
    coverage: "single-supplied-url-inspection",
    limitations: [
      "Request and retrieval metadata are supplied attribution, not authenticated API execution",
      "Provider index snapshot is not a live URL test or a site-wide indexing count",
      "Last crawl time differs from API retrieval time; absence is preserved",
      "User-declared canonical here is provider-reported historical evidence, not current browser DOM",
    ],
  };
}
