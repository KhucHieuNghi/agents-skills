import { classifyHreflangLanguage } from "./hreflang-language.mjs";
import { URL } from "node:url";
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
function time(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    throw new Error("Invalid UTC timestamp");
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== value.replace(/(?<!\.\d{3})Z$/, ".000Z")
  )
    throw new Error("Invalid calendar timestamp");
  return date.getTime();
}
function url(value) {
  if (
    typeof value !== "string" ||
    value.length > 8192 ||
    !/^https?:\/\//i.test(value) ||
    /[\s\\#]/u.test(value) ||
    [...value].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new Error("Invalid graph URL");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid graph URL");
  }
  if (parsed.username || parsed.password) throw new Error("Invalid graph URL");
  return parsed.href;
}
/** Pure declaration primitive, not an acquisition or full hreflang verdict.
 * Caller must bind one customer/environment/profile/state and one selected method
 * in an authenticated evidence envelope before integrating into report workflow.
 */
export function evaluateHreflangGraph(input) {
  exact(
    input,
    ["assessmentAt", "maxAgeSeconds", "targetUrl", "method", "pages"],
    "graph",
  );
  const assessment = time(input.assessmentAt);
  if (
    !Number.isSafeInteger(input.maxAgeSeconds) ||
    input.maxAgeSeconds < 0 ||
    input.maxAgeSeconds > 31622400
  )
    throw new Error("Invalid maximum age");
  if (
    !["html-source", "html-rendered", "http-link", "sitemap"].includes(
      input.method,
    )
  )
    throw new Error("Invalid graph method");
  const targetUrl = url(input.targetUrl);
  if (!Array.isArray(input.pages) || input.pages.length > 100)
    throw new Error("Invalid page budget");
  const pages = new Map();
  for (const page of input.pages) {
    exact(page, ["url", "capturedAt", "complete", "alternates"], "page");
    const pageUrl = url(page.url);
    if (pages.has(pageUrl)) throw new Error("Duplicate graph page");
    const captured = time(page.capturedAt);
    if (captured > assessment) throw new Error("Future graph capture");
    if (
      typeof page.complete !== "boolean" ||
      !Array.isArray(page.alternates) ||
      page.alternates.length > 100
    )
      throw new Error("Invalid alternate budget or coverage");
    const targets = new Set();
    const languages = [];
    const mappings = new Map();
    const supportedMappings = new Map();
    let mappingConflict = false;
    for (const alternate of page.alternates) {
      exact(alternate, ["language", "targetUrl"], "alternate");
      // Bound the representation; malformed language syntax is assessed separately.
      if (
        typeof alternate.language !== "string" ||
        alternate.language.length > 64
      )
        throw new Error("Invalid language label representation");
      const target = url(alternate.targetUrl);
      targets.add(target);
      const classification = classifyHreflangLanguage(alternate.language);
      languages.push(classification);
      if (classification.status === "pass") {
        const normalized = classification.normalized.toLowerCase();
        if (!supportedMappings.has(normalized))
          supportedMappings.set(normalized, new Set());
        supportedMappings.get(normalized).add(target);
      }
      const key = alternate.language.toLowerCase();
      if (mappings.has(key) && mappings.get(key) !== target)
        mappingConflict = true;
      mappings.set(key, target);
    }
    const expires = captured + input.maxAgeSeconds * 1000;
    pages.set(pageUrl, {
      targets,
      languages,
      mappingConflict,
      supportedMappings,
      complete: page.complete,
      fresh: assessment < expires,
      expires,
    });
  }
  const root = pages.get(targetUrl);
  const dataRequests = [];
  const edges = [];
  const checks = [];
  const mappingComparisons = [];
  function check(ruleId, status, reason) {
    checks.push({ ruleId, ruleVersion: "1", status, reason });
  }
  if (!root || !root.fresh) {
    const reason = root ? "expired-root-capture" : "missing-root-capture";
    dataRequests.push({
      url: targetUrl,
      reason,
      ruleIds: [
        "hreflang-self-reference",
        "hreflang-return-links",
        "hreflang-root-language-codes",
        "hreflang-root-language-mapping",
        "hreflang-shared-language-mapping",
      ],
    });
    check("hreflang-self-reference", "unknown", reason);
    check("hreflang-return-links", "unknown", reason);
  } else {
    check(
      "hreflang-self-reference",
      root.targets.has(targetUrl)
        ? "pass"
        : root.complete && root.targets.size
          ? "fail"
          : "unknown",
      root.targets.has(targetUrl)
        ? "observed-self-reference"
        : root.complete && root.targets.size
          ? "missing-self-reference"
          : "insufficient-root-evidence",
    );
    for (const target of root.targets) {
      if (target === targetUrl) continue;
      const other = pages.get(target);
      let status, reason;
      if (!other || !other.fresh) {
        status = "unknown";
        reason = other ? "expired-target-capture" : "missing-target-capture";
      } else if (other.targets.has(targetUrl)) {
        status = "pass";
        reason = "observed-return-link";
      } else if (other.complete) {
        status = "fail";
        reason = "missing-return-link";
      } else {
        status = "unknown";
        reason = "incomplete-target-capture";
      }
      edges.push({ targetUrl: target, status, reason });
      let mappingStatus = "unknown";
      if (other?.fresh) {
        const shared = [...root.supportedMappings.keys()].filter((key) =>
          other.supportedMappings.has(key),
        );
        const conflict = shared.some(
          (key) =>
            new Set([
              ...root.supportedMappings.get(key),
              ...other.supportedMappings.get(key),
            ]).size > 1,
        );
        mappingStatus = conflict
          ? "fail"
          : root.complete &&
              other.complete &&
              shared.length &&
              !root.mappingConflict &&
              !other.mappingConflict &&
              root.languages.every((item) => item.status === "pass") &&
              other.languages.every((item) => item.status === "pass")
            ? "pass"
            : "unknown";
        if (mappingStatus === "unknown")
          dataRequests.push({
            url: target,
            reason: "cross-page-language-mapping-review-required",
            ruleIds: ["hreflang-shared-language-mapping"],
          });
      }
      mappingComparisons.push({ targetUrl: target, status: mappingStatus });
      if (status === "unknown")
        dataRequests.push({
          url: target,
          reason,
          ruleIds: [
            "hreflang-return-links",
            "hreflang-shared-language-mapping",
          ],
        });
    }
    if (root.languages.some((item) => item.status === "unknown"))
      dataRequests.push({
        url: targetUrl,
        reason: "language-or-region-assignment-review-required",
        ruleIds: [
          "hreflang-root-language-codes",
          "hreflang-shared-language-mapping",
        ],
      });
    if (!root.complete || !root.targets.size)
      dataRequests.push({
        url: targetUrl,
        reason: "root-declarations-or-owner-intent-required",
        ruleIds: [
          "hreflang-self-reference",
          "hreflang-return-links",
          "hreflang-root-language-codes",
          "hreflang-root-language-mapping",
          "hreflang-shared-language-mapping",
        ],
      });
    if (root.complete && root.targets.size && !edges.length)
      dataRequests.push({
        url: targetUrl,
        reason: "alternate-urls-or-no-alternates-confirmation-required",
        ruleIds: ["hreflang-return-links", "hreflang-shared-language-mapping"],
      });
    const status = edges.some((edge) => edge.status === "fail")
      ? "fail"
      : root.complete &&
          edges.length &&
          edges.every((edge) => edge.status === "pass")
        ? "pass"
        : "unknown";
    check(
      "hreflang-return-links",
      status,
      status === "fail"
        ? "observed-unreciprocated-edge"
        : status === "pass"
          ? "observed-root-edges-reciprocated"
          : "insufficient-reciprocal-evidence",
    );
  }
  return {
    targetUrl,
    method: input.method,
    checks,
    edges,
    dataRequests,
    languageValidity: !root?.fresh
      ? "unknown"
      : root.languages.some((item) => item.status === "fail")
        ? "fail"
        : root.complete &&
            root.languages.length &&
            root.languages.every((item) => item.status === "pass")
          ? "pass"
          : "unknown",
    languageMapping: !root?.fresh
      ? "unknown"
      : root.mappingConflict
        ? "fail"
        : root.complete && root.languages.length
          ? "pass"
          : "unknown",
    crossPageLanguageMapping: mappingComparisons.some(
      (item) => item.status === "fail",
    )
      ? "fail"
      : mappingComparisons.length &&
          mappingComparisons.every((item) => item.status === "pass")
        ? "pass"
        : "unknown",
    mappingComparisons,
    languageObservations: root?.fresh ? root.languages : [],
    contentEquivalence: "unknown",
    targetIndexability: "unknown",
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
}
