import { routePair } from "../src/lib/routes.ts";

const origin = process.argv[2];
if (!origin || !origin.startsWith("https://")) {
  throw new Error(
    "Usage: npx tsx scripts/smoke-live.mjs https://nkskills.getgroove.me",
  );
}

const errors = [];
const root = await fetch(origin, { redirect: "manual" });
if (root.status !== 308 || root.headers.get("location") !== `${origin}/en/`)
  errors.push(`Root redirect: ${root.status} ${root.headers.get("location")}`);

for (const kind of ["home", "solution", "codex-guide", "claude-guide"]) {
  for (const locale of ["en", "vi"]) {
    const path = routePair(kind)[locale];
    const response = await fetch(`${origin}${path}`);
    const html = await response.text();
    if (response.status !== 200)
      errors.push(`${path}: HTTP ${response.status}`);
    if (!html.includes(`<html lang="${locale}"`))
      errors.push(`${path}: wrong locale`);
    if (!html.includes(`rel="canonical" href="${origin}${path}"`))
      errors.push(`${path}: missing self canonical`);
    if (response.headers.get("x-robots-tag"))
      errors.push(`${path}: noindex header`);
    if (!html.includes('hreflang="en"') || !html.includes('hreflang="vi"'))
      errors.push(`${path}: missing reciprocal hreflang`);
    if (!response.headers.get("content-security-policy"))
      errors.push(`${path}: missing CSP`);
  }
}

const sitemap = await fetch(`${origin}/sitemap.xml`);
if (sitemap.status !== 200 || !(await sitemap.text()).includes(`${origin}/vi/`))
  errors.push("Sitemap missing Vietnamese routes");
const robots = await fetch(`${origin}/robots.txt`);
if (
  robots.status !== 200 ||
  !(await robots.text()).includes(`${origin}/sitemap.xml`)
)
  errors.push("Robots missing sitemap");
const missing = await fetch(`${origin}/definitely-not-a-page/`);
if (missing.status !== 404)
  errors.push(`Missing route: HTTP ${missing.status}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Live smoke passed: ${origin}, eight pages, root, sitemap, robots, 404.`,
  );
}
