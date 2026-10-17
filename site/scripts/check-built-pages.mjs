import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { routePair, seoLinks } from "../src/lib/routes.ts";

const dist = new URL("../dist/", import.meta.url);
const mode = process.env.SITE_MODE === "production" ? "production" : "preview";
const origin = process.env.SITE_ORIGIN ?? "";
const kinds = ["home", "solution", "codex-guide", "claude-guide"];
const errors = [];
const titles = new Set();

for (const kind of kinds) {
  const paths = routePair(kind);
  for (const locale of ["en", "vi"]) {
    const path = paths[locale];
    const file = new URL(`.${path}index.html`, dist);
    if (!existsSync(file)) {
      errors.push(`Missing locale page: ${path}`);
      continue;
    }
    const html = readFileSync(file, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    if (!title || titles.has(title))
      errors.push(`Missing or duplicate title: ${path}`);
    if (title) titles.add(title);
    if (!html.includes(`<html lang="${locale}"`))
      errors.push(`Wrong language: ${path}`);
    if (!/<h1\b[^>]*>.*?<\/h1>/s.test(html)) errors.push(`Missing H1: ${path}`);
    if (!html.includes('name="description"'))
      errors.push(`Missing description: ${path}`);
    const links = seoLinks(kind, locale, mode, origin);
    if (links) {
      if (!html.includes(`rel="canonical" href="${links.canonical}"`))
        errors.push(`Bad canonical: ${path}`);
      for (const [language, url] of Object.entries(links.alternates)) {
        if (!html.includes(`hreflang="${language}" href="${url}"`))
          errors.push(`Bad alternate ${language}: ${path}`);
      }
      if (html.includes('name="robots" content="noindex'))
        errors.push(`Production noindex: ${path}`);
    } else {
      if (!html.includes('name="robots" content="noindex, nofollow"'))
        errors.push(`Preview indexable: ${path}`);
      if (html.includes('rel="canonical"'))
        errors.push(`Preview canonical: ${path}`);
    }
  }
}

const sitemap = fileURLToPath(new URL("sitemap.xml", dist));
if (mode === "production" && !existsSync(sitemap))
  errors.push("Missing production sitemap");
if (mode !== "production" && existsSync(sitemap))
  errors.push("Preview sitemap must be absent");

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${kinds.length * 2} paired ${mode} pages.`);
}
