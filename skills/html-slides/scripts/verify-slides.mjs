#!/usr/bin/env node
/* global console, process */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const arguments_ = process.argv.slice(2);
if (arguments_.length < 1) {
  console.error("Usage: node verify-slides.mjs <html-file>");
  process.exit(1);
}

const filePath = resolve(arguments_[0]);
let content;
try {
  content = await readFile(filePath, "utf8");
} catch (error) {
  console.error(
    JSON.stringify({
      valid: false,
      errors: [
        `Cannot read file: ${error instanceof Error ? error.message : String(error)}`,
      ],
    }),
  );
  process.exit(1);
}

const errors = [];

// Check for remote CDN URLs
const cdnPatterns = [
  /https?:\/\/cdn\.jsdelivr\.net/gi,
  /https?:\/\/unpkg\.com/gi,
  /https?:\/\/cdnjs\.cloudflare\.com/gi,
  /https?:\/\/fonts\.googleapis\.com/gi,
  /https?:\/\/fonts\.gstatic\.com/gi,
  /https?:\/\/use\.typekit\.net/gi,
];

for (const pattern of cdnPatterns) {
  if (pattern.test(content)) {
    errors.push(`Remote CDN URL detected: ${pattern.source}`);
  }
}

// Check for any external https:// in src or href attributes (excluding data: and #)
const externalAssetPattern = /(src|href)\s*=\s*["']https?:\/\/[^"']+["']/gi;
const externalMatches = content.match(externalAssetPattern) || [];
for (const match of externalMatches) {
  // Allow links in content (a href for documentation references)
  if (
    !match.startsWith("href") ||
    match.includes(".css") ||
    match.includes(".js") ||
    match.includes(".woff") ||
    match.includes(".ttf")
  ) {
    errors.push(`External asset URL in attribute: ${match.slice(0, 80)}`);
  }
}

// Check for dark themes
const darkThemes = [
  "theme/black",
  "theme/night",
  "theme/league",
  "theme/blood",
  "theme/moon",
  "theme/solarized",
];
for (const theme of darkThemes) {
  if (content.includes(theme)) {
    errors.push(`Dark theme detected: ${theme}`);
  }
}

// Check for dark background colors (crude heuristic: low luminance hex)
const bgColorPattern = /data-background-color\s*=\s*["']#([0-9a-f]{6})["']/gi;
let bgMatch;
while ((bgMatch = bgColorPattern.exec(content)) !== null) {
  const hex = bgMatch[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.7) {
    errors.push(
      `Dark background color detected: #${hex} (luminance ${(luminance * 100).toFixed(0)}%)`,
    );
  }
}

// Check for remote font imports
const fontImportPattern = /@import\s+url\s*\(\s*["']?https?:\/\//gi;
if (fontImportPattern.test(content)) {
  errors.push("Remote @import font URL detected");
}

const fontFaceRemote = /@font-face[^}]*src[^}]*https?:\/\//gi;
if (fontFaceRemote.test(content)) {
  errors.push("Remote @font-face src URL detected");
}

// Check basic HTML structure
if (
  !content.includes("<!doctype html>") &&
  !content.includes("<!DOCTYPE html>")
) {
  errors.push("Missing DOCTYPE declaration");
}

if (!content.includes('<div class="reveal">')) {
  errors.push('Missing reveal.js container: <div class="reveal">');
}

if (!content.includes('<div class="slides">')) {
  errors.push('Missing slides container: <div class="slides">');
}

if (!/<html[^>]*lang\s*=/.test(content)) {
  errors.push("Missing lang attribute on <html> element");
}

if (
  !content.includes('<meta charset="utf-8"') &&
  !content.includes('<meta charset="UTF-8"')
) {
  errors.push("Missing charset meta tag");
}

if (!content.includes("viewport")) {
  errors.push("Missing viewport meta tag");
}

// Check brand CSS variables are present (at least one)
const brandVars = [
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--surface",
  "--text",
];
const hasBrandVars = brandVars.some((v) => content.includes(v));
if (!hasBrandVars) {
  errors.push(
    "No brand CSS variables found. Expected at least one of: " +
      brandVars.join(", "),
  );
}

// Output result
if (errors.length === 0) {
  console.log(JSON.stringify({ valid: true, file: filePath }));
  process.exit(0);
} else {
  console.log(JSON.stringify({ valid: false, errors, file: filePath }));
  process.exit(1);
}
