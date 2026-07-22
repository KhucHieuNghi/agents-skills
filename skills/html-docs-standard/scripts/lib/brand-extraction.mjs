/* global AbortSignal, fetch */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { URL } from "node:url";
import { TextDecoder } from "node:util";

import { isPrivateAddress, sanitizeBrandUrl } from "./brand-profile.mjs";

const MAX_HTML_BYTES = 1_000_000;
const MAX_CSS_BYTES = 512_000;
const MAX_STYLESHEETS = 8;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const COLOR = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
const VARIABLE = /--([\w-]+)\s*:\s*([^;}{]+)/gi;
const RULE = /([^{}]+)\{([^{}]*)\}/g;

export class UnsafeBrandDestinationError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafeBrandDestinationError";
  }
}

function normalizeColor(value) {
  if (typeof value !== "string") return undefined;
  const match = value.trim().toLowerCase().match(COLOR)?.[0];
  if (!match) return undefined;
  if (/^#[0-9a-f]{3}$/.test(match)) {
    return `#${[...match.slice(1)].map((digit) => digit.repeat(2)).join("")}`;
  }
  if (/^#[0-9a-f]{6}$/.test(match)) return match;
  if (/^#[0-9a-f]{8}$/.test(match)) return match.slice(0, 7);
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(match);
  if (rgb) {
    const channels = rgb.slice(1, 4).map((channel) =>
      Math.max(0, Math.min(255, Number(channel)))
        .toString(16)
        .padStart(2, "0"),
    );
    return `#${channels.join("")}`;
  }
  return undefined;
}

function variableColor(variables, names) {
  for (const name of names) {
    const value = normalizeColor(variables.get(name));
    if (value) return value;
  }
  return undefined;
}

function colorsFromRules(stylesheets) {
  const candidates = [];
  for (const stylesheet of stylesheets) {
    for (const match of stylesheet.matchAll(RULE)) {
      const selector = match[1].trim().toLowerCase();
      const declarations = match[2];
      const deprioritized = /error|danger|success|warning/.test(selector);
      for (const color of declarations.match(COLOR) ?? []) {
        const normalized = normalizeColor(color);
        if (!normalized) continue;
        let score = deprioritized ? -20 : 0;
        if (/primary-action|primary-button|\bcta\b/.test(selector)) score += 80;
        if (/header|navigation|\bnav\b|logo/.test(selector)) score += 60;
        if (/\bh1\b|\bh2\b|heading/.test(selector)) score += 40;
        if (/body|html|page|card/.test(selector)) score += 20;
        if (/background(?:-color)?\s*:/.test(declarations)) score += 10;
        candidates.push({ color: normalized, score });
      }
    }
  }
  return candidates.sort((left, right) => right.score - left.score);
}

function scoreSemanticColors(variables, rawColors, stylesheets) {
  const ranked = colorsFromRules(stylesheets);
  const normalizedRaw = rawColors.map(normalizeColor).filter(Boolean);
  const firstRanked = ranked[0]?.color ?? normalizedRaw[0];
  return Object.fromEntries(
    Object.entries({
      primary:
        variableColor(variables, [
          "brand-primary",
          "color-primary",
          "primary",
          "brand",
        ]) ?? firstRanked,
      secondary: variableColor(variables, [
        "brand-secondary",
        "color-secondary",
        "secondary",
      ]),
      tertiary: variableColor(variables, [
        "brand-tertiary",
        "brand-accent",
        "color-accent",
        "accent",
      ]),
      surface: variableColor(variables, [
        "surface",
        "color-surface",
        "page-background",
        "background",
      ]),
      "surface-muted": variableColor(variables, [
        "surface-muted",
        "muted-surface",
      ]),
      text: variableColor(variables, ["text", "color-text", "foreground"]),
      "text-muted": variableColor(variables, [
        "text-muted",
        "muted-foreground",
      ]),
      border: variableColor(variables, ["border", "color-border"]),
    }).filter(([, value]) => Boolean(value)),
  );
}

function cleanFontFamily(value) {
  return value
    .replace(/["']/g, "")
    .replace(/[\r\n;{}]/g, "")
    .trim();
}

function scoreTypography(stylesheets) {
  const typography = {};
  const allFonts = [];
  for (const stylesheet of stylesheets) {
    for (const match of stylesheet.matchAll(RULE)) {
      const selector = match[1].toLowerCase();
      const family = /font-family\s*:\s*([^;}{]+)/i.exec(match[2])?.[1];
      if (!family) continue;
      const cleaned = cleanFontFamily(family);
      allFonts.push(cleaned);
      if (
        !typography.headingFamily &&
        /\bh[1-6]\b|heading|title/.test(selector)
      ) {
        typography.headingFamily = cleaned;
      }
      if (!typography.bodyFamily && /\bbody\b|\bhtml\b|\bp\b/.test(selector)) {
        typography.bodyFamily = cleaned;
      }
    }
  }
  if (!typography.bodyFamily && allFonts[0])
    typography.bodyFamily = allFonts[0];
  if (!typography.headingFamily && typography.bodyFamily) {
    typography.headingFamily = typography.bodyFamily;
  }
  return typography;
}

export function extractBrandCandidates({ html = "", stylesheets }) {
  const inlineStyles = [
    ...String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
  ].map((match) => match[1]);
  const allStylesheets = [...stylesheets, ...inlineStyles];
  const variables = new Map();
  const colors = [];
  for (const stylesheet of allStylesheets) {
    for (const match of stylesheet.matchAll(VARIABLE)) {
      variables.set(match[1].toLowerCase(), match[2].trim());
    }
    colors.push(...(stylesheet.match(COLOR) ?? []));
  }
  const semanticColors = scoreSemanticColors(variables, colors, allStylesheets);
  const evidenceCount = Object.keys(semanticColors).length;
  return {
    colors: semanticColors,
    typography: scoreTypography(allStylesheets),
    confidence:
      variables.size > 0 && evidenceCount > 0
        ? "high"
        : colors.length >= 3
          ? "medium"
          : "low",
  };
}

async function assertPublicHost(url, lookupImpl) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new UnsafeBrandDestinationError(
      "brand website resolves to a private network address",
    );
  }
  const records = await lookupImpl(hostname, { all: true });
  if (
    records.length === 0 ||
    records.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new UnsafeBrandDestinationError(
      "brand website resolves to a private network address",
    );
  }
}

async function readBoundedResponse(response, maximumBytes) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error("brand response exceeds the byte limit");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maximumBytes) {
      await reader.cancel();
      throw new Error("brand response exceeds the byte limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function boundedFetchText(initialUrl, options) {
  let current = new URL(initialUrl);
  for (let redirect = 0; redirect <= options.maximumRedirects; redirect += 1) {
    await assertPublicHost(current, options.lookupImpl);
    const response = await options.fetchImpl(current.href, {
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: { accept: "text/html,text/css;q=0.9" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("brand redirect is missing a location");
      if (redirect === options.maximumRedirects) {
        throw new Error("brand response exceeds the redirect limit");
      }
      const next = new URL(location, current);
      if (!/^https?:$/.test(next.protocol) || next.username || next.password) {
        throw new UnsafeBrandDestinationError(
          "brand redirect points to a prohibited destination",
        );
      }
      await assertPublicHost(next, options.lookupImpl);
      current = next;
      continue;
    }
    if (!response.ok)
      throw new Error(`brand response status ${response.status}`);
    return {
      text: await readBoundedResponse(response, options.maximumBytes),
      finalUrl: current,
    };
  }
  throw new Error("brand response exceeds the redirect limit");
}

function firstPartyStylesheetUrls(html, homepage) {
  const urls = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || !rel.split(/\s+/).includes("stylesheet")) continue;
    let resolved;
    try {
      resolved = new URL(href, homepage);
    } catch {
      continue;
    }
    if (
      resolved.origin === homepage.origin &&
      /^https?:$/.test(resolved.protocol)
    ) {
      resolved.hash = "";
      urls.push(resolved);
    }
  }
  return urls;
}

export async function fetchBrandCandidate({
  brandName,
  website,
  fetchImpl = fetch,
  lookupImpl = lookup,
}) {
  const sanitized = sanitizeBrandUrl(website);
  const homepage = new URL(sanitized.url);
  await assertPublicHost(homepage, lookupImpl);
  try {
    const homepageResult = await boundedFetchText(homepage, {
      fetchImpl,
      lookupImpl,
      maximumBytes: MAX_HTML_BYTES,
      maximumRedirects: MAX_REDIRECTS,
      timeoutMs: TIMEOUT_MS,
    });
    const stylesheetUrls = firstPartyStylesheetUrls(
      homepageResult.text,
      homepageResult.finalUrl,
    ).slice(0, MAX_STYLESHEETS);
    const stylesheets = [];
    for (const stylesheetUrl of stylesheetUrls) {
      const result = await boundedFetchText(stylesheetUrl, {
        fetchImpl,
        lookupImpl,
        maximumBytes: MAX_CSS_BYTES,
        maximumRedirects: MAX_REDIRECTS,
        timeoutMs: TIMEOUT_MS,
      });
      stylesheets.push(result.text);
    }
    const candidate = extractBrandCandidates({
      html: homepageResult.text,
      stylesheets,
    });
    return {
      brandName: String(brandName).trim(),
      sourceOrigin: sanitized.origin,
      method: "static",
      status: candidate.confidence === "low" ? "insufficient" : "extracted",
      candidate,
    };
  } catch (error) {
    if (error instanceof UnsafeBrandDestinationError) throw error;
    return {
      brandName: String(brandName).trim(),
      sourceOrigin: sanitized.origin,
      method: "static",
      status: "insufficient",
      candidate: { colors: {}, typography: {}, confidence: "low" },
    };
  }
}
