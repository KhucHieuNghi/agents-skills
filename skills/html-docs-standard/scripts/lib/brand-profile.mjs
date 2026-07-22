import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { basename, dirname, join } from "node:path";
import { URL } from "node:url";

const REQUIRED_COLORS = [
  "primary",
  "secondary",
  "tertiary",
  "neutral",
  "surface",
  "surface-muted",
  "text",
  "text-muted",
  "border",
  "on-primary",
];

const FALLBACK_COLORS = {
  primary: "#275d8c",
  secondary: "#536271",
  tertiary: "#9a563a",
  neutral: "#f5f8fb",
  surface: "#ffffff",
  "surface-muted": "#f5f8fb",
  text: "#17212b",
  "text-muted": "#536271",
  border: "#d8e1ea",
};

export function sanitizeBrandUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("brand website must be a valid HTTP or HTTPS URL");
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("brand website must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password) {
    throw new Error("brand website cannot contain credentials");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return { url: parsed.href, origin: parsed.origin };
}

export function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [first, second] = address.split(".").map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      return isPrivateAddress(normalized.slice("::ffff:".length));
    }
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized)
    );
  }
  return false;
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const color = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(color)) {
    return `#${[...color.slice(1)].map((digit) => digit.repeat(2)).join("")}`;
  }
  if (/^#[0-9a-f]{6}$/.test(color)) return color;
  return fallback;
}

function relativeLuminance(color) {
  const channels = color
    .slice(1)
    .match(/../g)
    .map((hex) => Number.parseInt(hex, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const [lighter, darker] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function bestTextColor(background) {
  const dark = "#17212b";
  const light = "#ffffff";
  return contrastRatio(background, light) >= contrastRatio(background, dark)
    ? light
    : dark;
}

function withSystemFallback(value) {
  const cleaned = String(value || "ui-sans-serif")
    .replace(/[\r\n;{}]/g, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
  const customFamilies = (cleaned || "ui-sans-serif")
    .split(",")
    .map((family) => family.trim())
    .filter(Boolean)
    .filter(
      (family) =>
        !["ui-sans-serif", "system-ui", "sans-serif"].includes(
          family.toLowerCase(),
        ),
    );
  return [...customFamilies, "ui-sans-serif", "system-ui", "sans-serif"].join(
    ", ",
  );
}

export function normalizeBrandCandidate(candidate) {
  const suppliedColors = candidate?.colors ?? {};
  const colors = Object.fromEntries(
    Object.entries(FALLBACK_COLORS).map(([role, fallback]) => [
      role,
      normalizeHexColor(suppliedColors[role], fallback),
    ]),
  );
  colors["on-primary"] = bestTextColor(colors.primary);

  const bodyFamily = withSystemFallback(
    candidate?.typography?.bodyFamily ?? "ui-sans-serif",
  );
  const headingFamily = withSystemFallback(
    candidate?.typography?.headingFamily ?? bodyFamily,
  );

  return {
    version: "alpha",
    name: String(candidate?.brandName ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    colors,
    typography: {
      "headline-lg": {
        fontFamily: headingFamily,
        fontSize: "3rem",
        fontWeight: 700,
        lineHeight: 1.1,
      },
      "body-md": {
        fontFamily: bodyFamily,
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1.6,
      },
    },
    rounded: { sm: "4px", md: "12px" },
    spacing: { sm: "8px", md: "16px", lg: "24px" },
  };
}

export function validateBrandProfile(profile) {
  const errors = [];
  if (profile?.version !== "alpha") errors.push("version must be alpha");
  if (!profile?.name || typeof profile.name !== "string") {
    errors.push("name is required");
  }
  for (const role of REQUIRED_COLORS) {
    if (!/^#[0-9a-f]{6}$/i.test(profile?.colors?.[role] ?? "")) {
      errors.push(`colors.${role} must be a six-digit hex color`);
    }
  }
  for (const style of ["headline-lg", "body-md"]) {
    const token = profile?.typography?.[style];
    if (!token) {
      errors.push(`typography.${style} is required`);
      continue;
    }
    if (!/system-ui/i.test(token.fontFamily ?? "")) {
      errors.push(`typography.${style}.fontFamily requires system-ui fallback`);
    }
    if (!/^\d+(?:\.\d+)?(?:rem|px)$/.test(token.fontSize ?? "")) {
      errors.push(`typography.${style}.fontSize is invalid`);
    }
    if (!Number.isFinite(token.fontWeight)) {
      errors.push(`typography.${style}.fontWeight is invalid`);
    }
    if (!Number.isFinite(token.lineHeight)) {
      errors.push(`typography.${style}.lineHeight is invalid`);
    }
  }
  for (const [group, keys] of [
    ["rounded", ["sm", "md"]],
    ["spacing", ["sm", "md", "lg"]],
  ]) {
    for (const key of keys) {
      if (!/^\d+(?:\.\d+)?px$/.test(profile?.[group]?.[key] ?? "")) {
        errors.push(`${group}.${key} is invalid`);
      }
    }
  }
  if (
    /^#[0-9a-f]{6}$/i.test(profile?.colors?.primary ?? "") &&
    /^#[0-9a-f]{6}$/i.test(profile?.colors?.["on-primary"] ?? "") &&
    contrastRatio(profile.colors.primary, profile.colors["on-primary"]) < 4.5
  ) {
    errors.push("colors.on-primary must meet WCAG contrast");
  }
  return errors;
}

function quote(value) {
  return JSON.stringify(String(value));
}

export function serializeDesignMd(profile) {
  const errors = validateBrandProfile(profile);
  if (errors.length > 0) {
    throw new Error(`invalid brand profile: ${errors.join("; ")}`);
  }
  const lines = [
    `version: ${profile.version}`,
    `name: ${quote(profile.name)}`,
    "colors:",
    ...REQUIRED_COLORS.map(
      (role) => `  ${role}: ${quote(profile.colors[role])}`,
    ),
    "typography:",
  ];
  for (const style of ["headline-lg", "body-md"]) {
    const token = profile.typography[style];
    lines.push(
      `  ${style}:`,
      `    fontFamily: ${quote(token.fontFamily)}`,
      `    fontSize: ${quote(token.fontSize)}`,
      `    fontWeight: ${token.fontWeight}`,
      `    lineHeight: ${token.lineHeight}`,
    );
  }
  lines.push(
    "rounded:",
    `  sm: ${quote(profile.rounded.sm)}`,
    `  md: ${quote(profile.rounded.md)}`,
    "spacing:",
    `  sm: ${quote(profile.spacing.sm)}`,
    `  md: ${quote(profile.spacing.md)}`,
    `  lg: ${quote(profile.spacing.lg)}`,
    "",
    "## Overview",
    "",
    `Local design tokens for ${profile.name}. Generated values are reusable without network access.`,
    "",
    "## Colors",
    "",
    "Semantic colors prioritize readable text, clear surfaces, and consistent component states.",
    "",
    "## Typography",
    "",
    "Declared families retain system fallbacks; no font binaries are stored.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) return JSON.parse(trimmed);
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function parseDesignMd(markdown) {
  const profile = {};
  const stack = [{ indent: -1, value: profile }];
  const topLevelGroups = new Set();
  for (const rawLine of String(markdown).split(/\r?\n/)) {
    if (/^##\s/.test(rawLine)) break;
    if (!rawLine.trim()) continue;
    const match = /^(\s*)([\w-]+):(?:\s*(.*))?$/.exec(rawLine);
    if (!match) throw new Error(`invalid DESIGN.md token line: ${rawLine}`);
    const indent = match[1].length;
    if (indent % 2 !== 0 || indent > 4) {
      throw new Error(`invalid DESIGN.md indentation: ${rawLine}`);
    }
    while (stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1)?.value;
    if (!parent || typeof parent !== "object") {
      throw new Error(`invalid DESIGN.md group: ${rawLine}`);
    }
    const key = match[2];
    if (indent === 0 && match[3] === undefined) {
      if (topLevelGroups.has(key)) {
        throw new Error(`duplicate DESIGN.md group: ${key}`);
      }
      topLevelGroups.add(key);
    }
    if (Object.hasOwn(parent, key)) {
      throw new Error(`duplicate DESIGN.md token: ${key}`);
    }
    if (match[3] === undefined || match[3] === "") {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(match[3]);
    }
  }
  return profile;
}

export function renderBrandCss(profile) {
  const errors = validateBrandProfile(profile);
  if (errors.length > 0) {
    throw new Error(`invalid brand profile: ${errors.join("; ")}`);
  }
  const heading = profile.typography["headline-lg"];
  const body = profile.typography["body-md"];
  return `:root {\n  --brand-primary: ${profile.colors.primary};\n  --brand-secondary: ${profile.colors.secondary};\n  --brand-accent: ${profile.colors.tertiary};\n  --on-brand-primary: ${profile.colors["on-primary"]};\n  --surface: ${profile.colors.surface};\n  --surface-muted: ${profile.colors["surface-muted"]};\n  --border: ${profile.colors.border};\n  --text: ${profile.colors.text};\n  --text-muted: ${profile.colors["text-muted"]};\n  --font-heading: ${heading.fontFamily};\n  --font-body: ${body.fontFamily};\n  --heading-size: ${heading.fontSize};\n  --heading-weight: ${heading.fontWeight};\n  --heading-line-height: ${heading.lineHeight};\n  --body-size: ${body.fontSize};\n  --body-weight: ${body.fontWeight};\n  --body-line-height: ${body.lineHeight};\n  --radius-sm: ${profile.rounded.sm};\n  --radius-md: ${profile.rounded.md};\n  --space-sm: ${profile.spacing.sm};\n  --space-md: ${profile.spacing.md};\n  --space-lg: ${profile.spacing.lg};\n}\n`;
}

export async function atomicWrite(file, content) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = join(
    dirname(file),
    `.${basename(file)}.${randomUUID()}.tmp`,
  );
  await writeFile(temporary, content, "utf8");
  await rename(temporary, file);
}
