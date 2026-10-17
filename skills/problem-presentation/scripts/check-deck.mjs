#!/usr/bin/env node
/* global console, process */
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const OFFLINE_CSP =
  "default-src 'none'; base-uri 'none'; connect-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src 'self' data:; frame-src 'none'; object-src 'none'; media-src 'none'; form-action 'none'";

function attrs(tag) {
  const values = {};
  for (const match of tag.matchAll(
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
  )) {
    values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
  }
  return values;
}

function hasEarlyOfflineCsp(html) {
  const markup = html.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  const preamble =
    /^\s*(?:<!doctype html>\s*)?<html\b[^>]*>\s*<head\b[^>]*>/i.exec(markup);
  if (!preamble) return false;
  const afterHead = markup.slice(preamble[0].length);
  const end = /<\/head\s*>/i.exec(afterHead);
  if (!end) return false;
  let content = afterHead.slice(0, end.index).trimStart();
  const first = /^<meta\b[^>]*>/i.exec(content);
  if (first && attrs(first[0]).charset) {
    content = content.slice(first[0].length).trimStart();
  }
  return content.startsWith(
    `<meta http-equiv="Content-Security-Policy" content="${OFFLINE_CSP}">`,
  );
}

function safeLink(href) {
  const value = href.trim();
  if (!value || value.startsWith("//") || value.startsWith("/")) return false;
  if (/^https?:\/\//i.test(value) || value.startsWith("#")) return true;
  return /^[\p{L}\p{N}._~-][\p{L}\p{N}._~/?#=-]*$/u.test(value);
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

function pdfStructure(bytes) {
  if (bytes.length <= 1024 || bytes.toString("ascii", 0, 5) !== "%PDF-")
    return false;
  const content = bytes.toString("latin1");
  const footer = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(content);
  if (!footer || !/\/Type\s*\/Catalog\b/.test(content)) return false;
  const offset = Number(footer[1]);
  if (!Number.isSafeInteger(offset) || offset < 5 || offset >= bytes.length)
    return false;
  return /^(?:xref\b|\d+\s+\d+\s+obj\b)/.test(content.slice(offset));
}

async function checkAsset(ref, htmlPath, errors) {
  const value = ref.trim();
  if (!value || value.startsWith("#")) return;
  if (value.startsWith("data:")) {
    if (!/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value))
      errors.push(`unchecked data asset: ${value.slice(0, 60)}`);
    return;
  }
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
    if (/\.svg$/i.test(path)) {
      const svg = await readFile(path, "utf8");
      if (
        /<(?:script|foreignObject|style|iframe|object|embed)\b|\bon\w+\s*=|@import\b|\burl\s*\(|\b(?:href|src)\s*=\s*["']?(?:https?:|\/\/|data:)/i.test(
          svg,
        )
      )
        errors.push(`unsafe local SVG asset: ${value}`);
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
  if (!hasEarlyOfflineCsp(html))
    errors.push("offline Content Security Policy is missing or too late");
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
  if (/<base\b/i.test(html))
    errors.push("base URLs are not allowed in an offline deck");
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attrs(tag).href;
    if (href && !safeLink(href)) errors.push(`unsafe link: ${href}`);
  }
  if (/<(?:iframe|object|embed)\b|\bsrcdoc\s*=/i.test(html))
    errors.push(
      "embedded documents are not inspected; inline their safe content",
    );
  if (/<meta\b[^>]*\bhttp-equiv\s*=\s*["']?refresh\b/i.test(html))
    errors.push("automatic redirects are not allowed in an offline deck");
  if (
    /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|EventSource\s*\(|sendBeacon\s*\(|importScripts\s*\(|serviceWorker\b|RTCPeerConnection\s*\()/i.test(
      html,
    )
  ) {
    errors.push("deck contains runtime network code");
  }
  const refs = [];
  for (const tag of html.match(
    /<(?:img|script|source|iframe|embed|object|video|audio|link|image|use|feImage)\b[^>]*>/gi,
  ) ?? []) {
    const properties = attrs(tag);
    for (const key of ["src", "poster", "data"])
      if (properties[key]) refs.push(properties[key]);
    for (const key of ["href", "xlink:href"])
      if (/^<(?:image|use|feImage)\b/i.test(tag) && properties[key])
        refs.push(properties[key]);
    if (properties.srcset) {
      for (const candidate of properties.srcset.split(",")) {
        const target = candidate.trim().split(/\s+/)[0];
        if (target) refs.push(target);
      }
    }
    if (
      /^<script\b/i.test(tag) &&
      properties.src &&
      !/^(?:https?:)?\/\//i.test(properties.src)
    )
      errors.push("external script is not inspected; inline it in the deck");
    if (
      /^<link\b/i.test(tag) &&
      /\b(?:stylesheet|icon|preload|modulepreload)\b/i.test(
        properties.rel ?? "",
      ) &&
      properties.href
    ) {
      refs.push(properties.href);
      if (
        properties.rel?.toLowerCase().split(/\s+/).includes("stylesheet") &&
        !/^(?:https?:)?\/\//i.test(properties.href)
      )
        errors.push(
          "external stylesheet is not inspected; inline it in the deck",
        );
    }
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
      if (!pdfStructure(bytes)) {
        errors.push("PDF is missing or invalid");
      }
      const pages = [...bytes.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)]
        .length;
      if (pages !== slides.length) {
        errors.push(
          `PDF pages (${pages}) differ from slide count (${slides.length})`,
        );
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
