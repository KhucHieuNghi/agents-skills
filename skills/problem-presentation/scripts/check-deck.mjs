#!/usr/bin/env node
/* global console, process */
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function attrs(tag) {
  const values = {};
  for (const match of tag.matchAll(
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  )) {
    values[match[1].toLowerCase()] = match[2] ?? match[3];
  }
  return values;
}

function sourceLink(body) {
  for (const tag of body.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) ?? []) {
    const opening = /^<a\b[^>]*>/i.exec(tag)?.[0] ?? "";
    const properties = attrs(opening);
    if (!properties.class?.split(/\s+/).includes("source") || !properties.href)
      continue;
    if (tag.replace(/<[^>]*>/g, "").trim()) return true;
  }
  return false;
}

async function checkAsset(ref, htmlPath, errors) {
  const value = ref.trim();
  if (!value || value.startsWith("data:") || value.startsWith("#")) return;
  if (/^(?:https?:)?\/\//i.test(value)) {
    errors.push(`remote asset: ${value}`);
    return;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("/")) {
    errors.push(`local asset is not portable: ${value}`);
    return;
  }
  const decoded = decodeURIComponent(value.split(/[?#]/)[0]);
  const root = dirname(resolve(htmlPath));
  const path = resolve(root, decoded);
  const within = relative(root, path);
  if (
    !within ||
    within === ".." ||
    within.startsWith(`..${sep}`) ||
    isAbsolute(within)
  ) {
    errors.push(`local asset escapes deck directory: ${value}`);
    return;
  }
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("not a regular file");
    const realRoot = await realpath(root);
    const realAsset = await realpath(path);
    const realWithin = relative(realRoot, realAsset);
    if (
      !realWithin ||
      realWithin === ".." ||
      realWithin.startsWith(`..${sep}`) ||
      isAbsolute(realWithin)
    ) {
      throw new Error("asset resolves outside deck directory");
    }
  } catch {
    errors.push(`local asset is missing or invalid: ${value}`);
  }
}

export async function checkDeck(htmlPath, { pdfPath } = {}) {
  const errors = [];
  const html = await readFile(htmlPath, "utf8");
  if (
    !/<html\b/i.test(html) ||
    !/<div\b[^>]*class=["'][^"']*\bdeck\b/i.test(html)
  ) {
    errors.push("deck HTML structure is missing");
  }
  const slides = [
    ...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi),
  ].filter((match) => attrs(match[1]).class?.split(/\s+/).includes("slide"));
  if (slides.length < 3)
    errors.push("slide deck requires at least three slide sections");
  if (!slides.some((match) => /<h1\b/i.test(match[2])))
    errors.push("slide deck requires a title slide");
  if (
    !slides.some(
      (match) =>
        /<h2\b[^>]*>\s*Decision/i.test(match[2]) ||
        /data-purpose=["']decision["']/i.test(match[1]),
    )
  ) {
    errors.push("slide deck requires a decision slide");
  }
  for (const [index, slide] of slides.entries()) {
    const claim = attrs(slide[1])["data-claim"];
    if (claim === "evidence" && !sourceLink(slide[2])) {
      errors.push(`evidence slide ${index + 1} requires a visible source link`);
    }
  }
  if (
    !/@media\s+print/i.test(html) ||
    !/(?:break-after\s*:\s*page|page-break-after\s*:\s*always)/i.test(html) ||
    !/\.deck\s*\{[^}]*overflow\s*:\s*visible/i.test(html)
  ) {
    errors.push("print rules must show every slide on a separate PDF page");
  }
  if (/\b(?:fetch\s*\(|XMLHttpRequest|WebSocket\s*\()/i.test(html)) {
    errors.push("deck contains runtime network code");
  }
  const refs = [];
  for (const tag of html.match(
    /<(?:img|script|source|iframe|embed|object|video|audio|link)\b[^>]*>/gi,
  ) ?? []) {
    const properties = attrs(tag);
    for (const key of ["src", "poster", "data"])
      if (properties[key]) refs.push(properties[key]);
    if (
      /^<link\b/i.test(tag) &&
      /\b(?:stylesheet|icon|preload|modulepreload)\b/i.test(
        properties.rel ?? "",
      ) &&
      properties.href
    )
      refs.push(properties.href);
  }
  for (const match of html.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi))
    refs.push(match[1]);
  for (const match of html.matchAll(
    /@import\s+(?:url\()?\s*["']?([^"')\s;]+)["']?/gi,
  ))
    refs.push(match[1]);
  for (const ref of refs) await checkAsset(ref, htmlPath, errors);
  if (pdfPath) {
    try {
      const bytes = await readFile(pdfPath);
      if (bytes.length <= 1024 || bytes.toString("ascii", 0, 5) !== "%PDF-") {
        errors.push("PDF is missing or invalid");
      } else {
        const pages = [
          ...bytes.toString("latin1").matchAll(/\/Type\s*\/Page\b/g),
        ].length;
        if (pages !== slides.length) {
          errors.push(
            `PDF pages (${pages}) differ from slide count (${slides.length})`,
          );
        }
      }
      try {
        const provenance = JSON.parse(
          await readFile(`${pdfPath}.provenance.json`, "utf8"),
        );
        const htmlSha256 = createHash("sha256").update(html).digest("hex");
        const pdfSha256 = createHash("sha256").update(bytes).digest("hex");
        if (
          provenance.schemaVersion !== 1 ||
          provenance.renderer !== "chromium-print" ||
          provenance.htmlSha256 !== htmlSha256 ||
          provenance.pdfSha256 !== pdfSha256 ||
          provenance.slides !== slides.length
        ) {
          errors.push("PDF provenance does not match the HTML and PDF");
        }
      } catch {
        errors.push("PDF provenance is missing or invalid");
      }
    } catch {
      errors.push("PDF is missing or invalid");
    }
  }
  return { valid: errors.length === 0, slides: slides.length, errors };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [htmlPath, pdfPath] = process.argv.slice(2);
  if (!htmlPath) {
    console.error("Usage: node check-deck.mjs DECK_HTML [PDF]");
    process.exitCode = 1;
  } else {
    try {
      const result = await checkDeck(htmlPath, { pdfPath });
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) process.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
