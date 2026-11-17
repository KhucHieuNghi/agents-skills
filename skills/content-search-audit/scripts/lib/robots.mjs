import { Buffer } from "node:buffer";
import { URL } from "node:url";
const token = /^[a-z_-]+$/i;
const unreserved = /^[a-z0-9._~-]$/i;
function normalize(value, pattern = false) {
  let output = "";
  for (let i = 0; i < value.length;) {
    if (value[i] === "%") {
      const octet = value.slice(i + 1, i + 3);
      if (!/^[a-f0-9]{2}$/i.test(octet))
        throw new Error("Malformed percent escape");
      const char = String.fromCharCode(parseInt(octet, 16));
      output += unreserved.test(char) ? char : `%${octet.toUpperCase()}`;
      i += 3;
      continue;
    }
    const char = String.fromCodePoint(value.codePointAt(i));
    i += char.length;
    if (char.charCodeAt(0) > 127) output += encodeURIComponent(char);
    else if (char === "*" && !pattern) output += "%2A";
    else if (char === "$" && (!pattern || i !== value.length)) output += "%24";
    else output += char;
  }
  return output;
}
/** Original bounded parser; malformed policy is retained as a collection blocker. */
export function parseRobots(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > 512000)
    throw new Error("Robots size limit or invalid text");
  if (text.includes("\0") || text.trimStart().startsWith("<"))
    throw new Error("Robots response is not a valid text policy");
  const groups = [],
    sitemaps = [],
    diagnostics = [];
  let group = null,
    seenRules = false,
    invalid = false;
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].split("#", 1)[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) {
      diagnostics.push({ line: index + 1, reason: "Malformed record" });
      invalid = true;
      continue;
    }
    const field = line.slice(0, colon).trim().toLowerCase(),
      value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (value !== "*" && !token.test(value)) {
        invalid = true;
        diagnostics.push({ line: index + 1, reason: "Invalid product token" });
        continue;
      }
      if (!group || seenRules) {
        group = { agents: [], rules: [], crawlDelays: [], invalid: false };
        groups.push(group);
        seenRules = false;
      }
      group.agents.push(value.toLowerCase());
      continue;
    }
    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }
    if (field === "crawl-delay") {
      if (group) {
        if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) {
          group.invalid = true;
          diagnostics.push({
            line: index + 1,
            reason: "Invalid crawl-delay extension",
          });
        } else group.crawlDelays.push(Number(value));
      }
      continue;
    }
    if (!["allow", "disallow"].includes(field)) {
      diagnostics.push({
        line: index + 1,
        reason: "Unsupported directive ignored",
      });
      continue;
    }
    if (!group) {
      diagnostics.push({
        line: index + 1,
        reason: "Rule outside a group ignored",
      });
      continue;
    }
    seenRules = true;
    if (!value) continue;
    try {
      if (
        !["/", "*"].includes(value[0]) ||
        [...value].some(
          (char) => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127,
        )
      )
        throw new Error("Invalid path pattern");
      const pattern = normalize(value, true);
      group.rules.push({
        directive: field,
        pattern,
        line: index + 1,
        specificity: pattern
          .replace(/\*|\$$/g, "")
          .replace(/%[A-F0-9]{2}/g, "x").length,
      });
    } catch (error) {
      group.invalid = true;
      diagnostics.push({ line: index + 1, reason: error.message });
    }
  }
  return { groups, sitemaps: [...new Set(sitemaps)], diagnostics, invalid };
}
function matches(pattern, value, budget) {
  const anchored = pattern.endsWith("$");
  if (anchored) pattern = pattern.slice(0, -1);
  let i = 0,
    j = 0,
    star = -1,
    retry = 0;
  while (j < value.length) {
    if (--budget.remaining < 0)
      throw new Error("Robots matching budget exceeded");
    if (i === pattern.length && !anchored) return true;
    if (pattern[i] === "*") {
      star = i++;
      retry = j;
    } else if (pattern[i] === value[j]) {
      i++;
      j++;
    } else if (star >= 0) {
      i = star + 1;
      j = ++retry;
    } else return false;
  }
  while (pattern[i] === "*") i++;
  return i === pattern.length;
}
export function evaluateRobots(
  parsed,
  urlValue,
  productToken = "NKSkillsContentAudit",
) {
  if (!token.test(productToken))
    throw new Error("Invalid crawler product token");
  const url = new URL(urlValue);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Invalid robots target URL");
  const specific = parsed.groups.filter((group) =>
    group.agents.includes(productToken.toLowerCase()),
  );
  const selected = specific.length
    ? specific
    : parsed.groups.filter((group) => group.agents.includes("*"));
  const crawlDelaySeconds = Math.max(
    0,
    ...selected.flatMap((group) => group.crawlDelays),
  );
  const common = {
    crawlDelaySeconds,
    sitemaps: parsed.sitemaps,
    diagnostics: parsed.diagnostics,
  };
  if (url.pathname === "/robots.txt" && !url.search)
    return {
      ...common,
      allowed: true,
      reason: "Robots policy resource is implicitly accessible",
      matchedRule: null,
    };
  if (parsed.invalid || selected.some((group) => group.invalid))
    return {
      ...common,
      allowed: false,
      reason: "Malformed applicable robots policy requires review",
      matchedRule: null,
    };
  try {
    const value = normalize(url.pathname + url.search);
    if (value.length > 16384)
      throw new Error("Robots target path limit exceeded");
    const budget = { remaining: 1000000 };
    let best = null;
    for (const rule of selected.flatMap((group) => group.rules))
      if (
        matches(rule.pattern, value, budget) &&
        (!best ||
          rule.specificity > best.specificity ||
          (rule.specificity === best.specificity && rule.directive === "allow"))
      )
        best = rule;
    return {
      ...common,
      allowed: !best || best.directive === "allow",
      reason: best
        ? `Matched ${best.directive} rule at line ${best.line}`
        : "No applicable exclusion",
      matchedRule: best,
    };
  } catch (error) {
    return {
      ...common,
      allowed: false,
      reason: error.message,
      matchedRule: null,
    };
  }
}
/** Conservative audit policy; robots permission never authorizes an origin or private access. */
export function robotsAccess(
  response,
  url,
  productToken = "NKSkillsContentAudit",
) {
  const blocked = (reason) => ({
    allowed: false,
    reason,
    crawlDelaySeconds: 0,
    sitemaps: [],
    diagnostics: [],
    matchedRule: null,
  });
  if (!response || response.error)
    return blocked("Robots unavailable due to transport failure");
  if ([404, 410].includes(response.status))
    return { ...blocked("Robots resource explicitly absent"), allowed: true };
  if (![200, 204].includes(response.status))
    return blocked(`Robots HTTP ${response.status} requires retry or review`);
  try {
    return evaluateRobots(parseRobots(response.body), url, productToken);
  } catch (error) {
    return blocked(error.message);
  }
}
