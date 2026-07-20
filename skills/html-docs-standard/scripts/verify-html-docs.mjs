/* global console, process */

import { readFile } from "node:fs/promises";

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
const html = await readFile(documentPath, "utf8");
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
if (
  /class=["'][^"']*\bmermaid\b/i.test(html) &&
  !/theme\s*:\s*["']default["']/i.test(html)
) {
  errors.push("diagrams require Mermaid default-theme configuration");
}
for (const prohibitedTerm of prohibitedTerms) {
  if (html.toLowerCase().includes(prohibitedTerm))
    errors.push("prohibited source-brand token");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("HTML documentation contract passed");
