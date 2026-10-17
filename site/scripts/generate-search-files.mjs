import { writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { routePair, seoLinks } from "../src/lib/routes.ts";

const dist = new URL("../dist/", import.meta.url);
const mode = process.env.SITE_MODE === "production" ? "production" : "preview";
const origin = process.env.SITE_ORIGIN ?? "";
const kinds = ["home", "solution", "codex-guide", "claude-guide"];

if (mode === "production") {
  const site = seoLinks("home", "en", mode, origin);
  const urls = kinds.flatMap((kind) => Object.values(routePair(kind)));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${new URL(path, site.canonical).href}</loc></url>`).join("\n")}\n</urlset>\n`;
  writeFileSync(new URL("sitemap.xml", dist), sitemap);
  writeFileSync(
    new URL("robots.txt", dist),
    `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", site.canonical).href}\n`,
  );
} else {
  rmSync(fileURLToPath(new URL("sitemap.xml", dist)), { force: true });
  writeFileSync(new URL("robots.txt", dist), "User-agent: *\nAllow: /\n");
}
