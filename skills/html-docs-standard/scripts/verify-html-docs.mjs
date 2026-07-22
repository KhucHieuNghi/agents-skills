#!/usr/bin/env node
/* global console, process */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const documentPath = process.argv[2];
if (!documentPath) {
  console.error("Usage: node verify-html-docs.mjs <document.html>");
  process.exit(1);
}

const term = (...characters) => characters.join("");
const prohibitedTerms = [
  term("o", "n", "p", "o", "i", "n", "t"),
  term("s", "o", "c", "o", "m"),
  term("c", "e", "r", "b", "e", "r", "u", "s"),
  term("h", "e", "p", "h", "a", "e", "s", "t", "u", "s"),
  term("o", "n", "p", "o", "i", "n", "t", "v", "n"),
  term("@", "o", "n", "p", "o", "i", "n", "t"),
];
const requiredClasses = ["docs-shell", "docs-sidebar", "docs-content"];
const requiredBrandVariables = [
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--on-brand-primary",
  "--surface",
  "--surface-muted",
  "--border",
  "--text",
  "--text-muted",
  "--font-heading",
  "--font-body",
];
const absoluteDocumentPath = resolve(documentPath);
const html = await readFile(absoluteDocumentPath, "utf8");
const errors = [];

const viewportTag = [...html.matchAll(/<meta\b[^>]*>/gi)].find((tag) =>
  /\bname\s*=\s*["']viewport["']/i.test(tag[0]),
);
if (!viewportTag) {
  errors.push("missing viewport meta tag");
} else if (
  !/\bcontent\s*=\s*["'][^"']*\bwidth\s*=\s*device-width\b[^"']*["']/i.test(
    viewportTag[0],
  )
) {
  errors.push("viewport meta tag must include width=device-width");
}

for (const requiredClass of requiredClasses) {
  if (!new RegExp(`class=["'][^"']*\\b${requiredClass}\\b`, "i").test(html)) {
    errors.push(`missing required layout class: ${requiredClass}`);
  }
}

if (
  /(prefers-color-scheme\s*:\s*dark|data-theme=["']dark|color-scheme\s*:\s*dark)/i.test(
    html,
  )
) {
  errors.push("light-only documents cannot include dark-mode indicators");
}

const themeLink = /href=["']([^"']*docs-theme\.css)["']/i.exec(html);
const brandLink = /href=["']([^"']*docs-brand\.css)["']/i.exec(html);
const themeLinkIndex = themeLink?.index ?? -1;
const brandLinkIndex = brandLink?.index ?? -1;
if (themeLinkIndex < 0) errors.push("missing local docs-theme.css");
if (brandLinkIndex < 0) errors.push("missing local docs-brand.css");
if (brandLinkIndex >= 0 && brandLinkIndex < themeLinkIndex) {
  errors.push("docs-brand.css must load after docs-theme.css");
}

if (brandLink) {
  const href = brandLink[1];
  if (/^(?:[a-z]+:|\/\/)/i.test(href)) {
    errors.push("docs-brand.css must use a local file path");
  } else {
    const assetPath = resolve(
      dirname(absoluteDocumentPath),
      href.split(/[?#]/, 1)[0],
    );
    try {
      const brandCss = await readFile(assetPath, "utf8");
      for (const variable of requiredBrandVariables) {
        if (!new RegExp(`${variable}\\s*:`).test(brandCss)) {
          errors.push(`missing brand CSS variable: ${variable}`);
        }
      }
    } catch (error) {
      errors.push(
        `unable to read local docs-brand.css: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

if (/class=["'][^"']*\bmermaid\b/i.test(html)) {
  if (!/theme\s*:\s*["']base["']/i.test(html)) {
    errors.push("Mermaid diagrams require the branded base theme");
  }
  for (const variable of [
    "primaryColor",
    "primaryTextColor",
    "primaryBorderColor",
    "secondaryColor",
    "tertiaryColor",
    "lineColor",
    "background",
  ]) {
    if (!new RegExp(`${variable}\\s*:`).test(html)) {
      errors.push(`missing Mermaid brand variable: ${variable}`);
    }
  }
}

if (
  /(?:href|src)\s*=\s*["'][^"']*(?:\.onboarding\/|\.agents\/skills\/|node_modules\/)/i.test(
    html,
  )
) {
  errors.push("generated HTML cannot link to local state or install paths");
}

for (const prohibitedTerm of prohibitedTerms) {
  if (html.toLowerCase().includes(prohibitedTerm)) {
    errors.push("prohibited source-brand token");
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("HTML documentation contract passed");
