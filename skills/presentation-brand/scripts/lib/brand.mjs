import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { URL } from "node:url";
import {
  fetchPublic,
  sanitizeWebsite,
  UnsafeBrandDestinationError,
} from "./public-fetch.mjs";

const MAX_HTML = 1_000_000;
const MAX_CSS = 512_000;
const MAX_LOGO = 2_000_000;
const PALETTES = [
  {
    primary: "#215d73",
    accent: "#b66b45",
    surface: "#f8faf9",
    text: "#17313b",
  },
  {
    primary: "#375a47",
    accent: "#ba7047",
    surface: "#f8f8f3",
    text: "#1d2c25",
  },
  {
    primary: "#594a77",
    accent: "#af7354",
    surface: "#faf8fb",
    text: "#282239",
  },
  {
    primary: "#8a4b38",
    accent: "#3d7481",
    surface: "#fcfaf6",
    text: "#30251f",
  },
];
const NAMES = ["Aster Studio", "Meridian Works", "Northline", "Lumen Studio"];

function hexColor(value) {
  const match = String(value ?? "")
    .trim()
    .toLowerCase()
    .match(/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/);
  if (!match) return undefined;
  return match[0].length === 4
    ? `#${[...match[0].slice(1)].map((digit) => digit.repeat(2)).join("")}`
    : match[0];
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort(
    (left, right) => right - left,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function readableText(background) {
  return contrast(background, "#ffffff") >= contrast(background, "#17212b")
    ? "#ffffff"
    : "#17212b";
}

function paletteFor(title) {
  const index =
    createHash("sha256").update(title).digest()[0] % PALETTES.length;
  return { index, colors: PALETTES[index] };
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    result[match[1].toLowerCase()] = match[2] ?? match[3];
  }
  return result;
}

function firstPartyUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (
      !/^https?:$/.test(url.protocol) ||
      url.origin !== base.origin ||
      url.username ||
      url.password
    )
      return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function stylesheetUrls(html, base) {
  const urls = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (!attrs.rel?.toLowerCase().split(/\s+/).includes("stylesheet")) continue;
    const url = firstPartyUrl(attrs.href, base);
    if (url) urls.push(url);
  }
  return urls.slice(0, 8);
}

function logoCandidates(html, base) {
  const candidates = [];
  const header = [...html.matchAll(/<(header|nav)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => match[2])
    .join("\n");
  for (const [scope, fragment] of [
    [100, header],
    [0, html],
  ]) {
    for (const tag of fragment.match(/<img\b[^>]*>/gi) ?? []) {
      const attrs = attributes(tag);
      const url = firstPartyUrl(attrs.src ?? attrs["data-src"], base);
      if (!url) continue;
      const label = `${attrs.alt ?? ""} ${attrs.class ?? ""} ${attrs.id ?? ""} ${url.pathname}`;
      const score =
        scope +
        (/logo|brand/i.test(label) ? 80 : 0) +
        (/header|nav/i.test(label) ? 10 : 0);
      if (score >= 80) candidates.push({ url, score, kind: "official" });
    }
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (!/\bicon\b/i.test(attrs.rel ?? "")) continue;
    const url = firstPartyUrl(attrs.href, base);
    if (url) candidates.push({ url, score: 1, kind: "favicon" });
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function extractedColors(html, stylesheets) {
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1],
  );
  const css = [...stylesheets, ...inline].join("\n");
  const variable = (names) => {
    for (const name of names) {
      const match = new RegExp(
        `--${name}\\s*:\\s*(#[0-9a-f]{3,6})\\b`,
        "i",
      ).exec(css);
      if (match) return hexColor(match[1]);
    }
    return undefined;
  };
  const theme = /<meta\b[^>]*name=["']theme-color["'][^>]*>/i.exec(html)?.[0];
  const themeColor = theme ? hexColor(attributes(theme).content) : undefined;
  return {
    primary:
      variable(["brand-primary", "color-primary", "primary", "brand"]) ??
      themeColor,
    accent: variable([
      "brand-accent",
      "color-accent",
      "accent",
      "brand-secondary",
    ]),
    surface: variable(["surface", "color-surface", "background"]),
    text: variable(["text", "color-text", "foreground"]),
    fontHint: /font-family\s*:\s*([^;}{]+)/i
      .exec(css)?.[1]
      ?.replace(/[\r\n{}]/g, "")
      .trim(),
  };
}

function assetType(bytes, contentType) {
  if (contentType.toLowerCase().includes("svg")) return undefined;
  if (
    bytes.length >= 33 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR" &&
    bytes.readUInt32BE(16) > 0 &&
    bytes.readUInt32BE(20) > 0
  )
    return "png";
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) &&
    bytes.subarray(-2).equals(Buffer.from([255, 217]))
  )
    return "jpg";
  if (
    bytes.length >= 16 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP" &&
    bytes.readUInt32LE(4) + 8 === bytes.length
  )
    return "webp";
  return undefined;
}

function xml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generatedLogo(name, primary, onPrimary, text) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 96" role="img" aria-label="${xml(name)} provisional logo"><rect x="0" y="0" width="88" height="88" rx="18" fill="${primary}"/><text x="44" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="${onPrimary}">${xml(initials)}</text><text x="110" y="59" font-family="system-ui,sans-serif" font-size="28" font-weight="650" fill="${text}">${xml(name)}</text></svg>\n`;
}

async function atomicWrite(path, bytes) {
  const temporary = `${path}.tmp-${randomUUID()}`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}

async function existingProfile(directory) {
  try {
    const profile = JSON.parse(
      await readFile(join(directory, "brand.json"), "utf8"),
    );
    if (
      profile?.schemaVersion !== 1 ||
      !profile.logo?.path ||
      !profile.colors?.primary
    ) {
      throw new Error("invalid brand profile");
    }
    await lstat(join(directory, basename(profile.logo.path)));
    return profile;
  } catch (error) {
    if (error?.code === "ENOENT" && error.path?.endsWith("brand.json"))
      return undefined;
    throw new Error("invalid brand profile; use --refresh to replace it", {
      cause: error,
    });
  }
}

export async function createPresentationBrand({
  title,
  brandName,
  website,
  logoPath,
  outputDirectory,
  refresh = false,
  fetchImpl,
  lookupImpl,
}) {
  if (!String(title ?? "").trim()) throw new Error("title is required");
  if (!outputDirectory) throw new Error("outputDirectory is required");
  const sanitized = website ? sanitizeWebsite(website) : undefined;
  const inputs = {};
  if (String(brandName ?? "").trim())
    inputs.brandName = String(brandName).replace(/\s+/g, " ").trim();
  if (sanitized) inputs.website = sanitized.href;
  if (logoPath) {
    inputs.logoPath = resolve(logoPath);
    inputs.logoSha256 = createHash("sha256")
      .update(await readFile(logoPath))
      .digest("hex");
  }
  await mkdir(outputDirectory, { recursive: true });
  if (!refresh) {
    const previous = await existingProfile(outputDirectory);
    if (
      previous &&
      Object.entries(inputs).every(
        ([key, value]) => previous.inputs?.[key] === value,
      )
    )
      return previous;
  }

  const { index, colors: fallback } = paletteFor(String(title).trim());
  let homepage;
  let cues = {};
  let officialLogo;
  let source;
  if (sanitized) {
    try {
      homepage = await fetchPublic(sanitized, {
        maximumBytes: MAX_HTML,
        fetchImpl,
        lookupImpl,
      });
      const html = homepage.bytes.toString("utf8");
      const css = [];
      for (const url of stylesheetUrls(html, homepage.finalUrl)) {
        try {
          const result = await fetchPublic(url, {
            maximumBytes: MAX_CSS,
            allowedOrigin: homepage.finalUrl.origin,
            fetchImpl,
            lookupImpl,
          });
          if (/text\/css/i.test(result.contentType) || !result.contentType)
            css.push(result.bytes.toString("utf8"));
        } catch {
          /* An optional stylesheet cannot make the homepage unsafe. */
        }
      }
      cues = extractedColors(html, css);
      source = { origin: homepage.finalUrl.origin };
      for (const candidate of logoCandidates(html, homepage.finalUrl)) {
        try {
          const result = await fetchPublic(candidate.url, {
            maximumBytes: MAX_LOGO,
            allowedOrigin: homepage.finalUrl.origin,
            fetchImpl,
            lookupImpl,
          });
          const extension = assetType(result.bytes, result.contentType);
          if (!extension) continue;
          officialLogo = {
            bytes: result.bytes,
            extension,
            kind: candidate.kind,
            url: result.finalUrl,
          };
          break;
        } catch {
          /* An optional logo is skipped when missing or unsafe. */
        }
      }
      if (!brandName) {
        brandName = /<meta\b[^>]*property=["']og:site_name["'][^>]*>/i.exec(
          html,
        )?.[0];
        brandName = brandName ? attributes(brandName).content : undefined;
      }
    } catch (error) {
      if (error instanceof UnsafeBrandDestinationError) throw error;
      source = { origin: sanitized.origin };
    }
  }
  if (logoPath) {
    const info = await lstat(logoPath);
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("logo must be a regular file");
    const bytes = await readFile(logoPath);
    if (bytes.length > MAX_LOGO) throw new Error("logo exceeds the byte limit");
    const extension = assetType(bytes, "");
    if (!extension)
      throw new Error("logo must be a PNG, JPEG, or WebP raster asset");
    officialLogo = { bytes, extension, kind: "supplied", path: logoPath };
  }

  const name = String(brandName ?? NAMES[index])
    .replace(/\s+/g, " ")
    .trim();
  const primary = hexColor(cues.primary) ?? fallback.primary;
  const surface = hexColor(cues.surface) ?? fallback.surface;
  let text = hexColor(cues.text) ?? fallback.text;
  const adjustments = [];
  if (contrast(text, surface) < 4.5) {
    text = readableText(surface);
    adjustments.push("text color adjusted for contrast");
  }
  const colors = {
    primary,
    accent: hexColor(cues.accent) ?? fallback.accent,
    surface,
    text,
    onPrimary: readableText(primary),
  };
  const sourced = Boolean(cues.primary || officialLogo);
  let logo;
  if (officialLogo) {
    const path = `logo.${officialLogo.extension}`;
    await atomicWrite(join(outputDirectory, path), officialLogo.bytes);
    logo = { path, kind: officialLogo.kind };
    if (officialLogo.url) {
      const url = new URL(officialLogo.url);
      url.search = "";
      url.hash = "";
      source = { ...source, logoUrl: url.href };
    } else {
      source = { ...source, logoPath: officialLogo.path };
    }
  } else {
    await atomicWrite(
      join(outputDirectory, "logo.svg"),
      generatedLogo(name, colors.primary, colors.onPrimary, colors.text),
    );
    logo = { path: "logo.svg", kind: "provisional" };
  }
  const profile = {
    schemaVersion: 1,
    inputs,
    name,
    status: sourced ? "official-source" : "provisional",
    confidence:
      officialLogo && cues.primary ? "high" : sourced ? "medium" : "low",
    source,
    logo,
    colors,
    typography: {
      body: "system-ui, -apple-system, Segoe UI, sans-serif",
      display: "Georgia, Times New Roman, serif",
      sourceHint: cues.fontHint,
    },
    adjustments,
    note: sourced
      ? logo.kind === "provisional"
        ? "Source colors with a provisional logo; review before sharing."
        : "Brand cues extracted from customer-provided source; review before sharing."
      : "Provisional presentation identity; replace with official brand assets when available.",
  };
  await atomicWrite(
    join(outputDirectory, "brand.json"),
    `${JSON.stringify(profile, null, 2)}\n`,
  );
  return profile;
}
