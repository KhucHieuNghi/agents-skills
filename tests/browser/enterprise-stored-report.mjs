import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import {
  loadEnterpriseReport,
  saveEnterpriseReport,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
assert(
  process.argv[2] && process.argv[3],
  "Provide canonical source report and fresh browser output directory",
);
const report = await loadEnterpriseReport(resolve(process.argv[2])),
  root = resolve(process.argv[3]);
await mkdir(root);
const browser = await chromium.launch({ headless: true }),
  checks = [];
try {
  for (const edition of ["customer", "public"]) {
    const directory = join(root, edition);
    await saveEnterpriseReport(directory, report, edition);
    const expected = await loadEnterpriseReport(directory);
    const expectedNarrative = expected.narrative ?? [];
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        offline: true,
      });
      try {
        const page = await context.newPage(),
          errors = [],
          external = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          if (/^https?:/.test(r.url())) external.push(r.url());
        });
        await page.goto(pathToFileURL(join(directory, "report.html")).href);
        const body = await page.locator("body").textContent();
        assert(!body.includes("private-source-canary"));
        assert(!body.includes("artifactText"));
        assert(!body.includes("pseudonymous-attempt"));
        assert.equal(await page.locator("script").count(), 0);
        assert(
          await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth,
          ),
        );
        await page.keyboard.press("Tab");
        assert.equal(
          await page.locator(":focus").textContent(),
          "Skip to report",
        );
        const narrative = page.locator(".narrative-text");
        assert.equal(await narrative.count(), expectedNarrative.length);
        for (let i = 0; i < expectedNarrative.length; i++)
          assert.equal(
            await narrative.nth(i).textContent(),
            expectedNarrative[i].text,
          );
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        await page.screenshot({ path: join(root, `${edition}-${width}.png`) });
        checks.push({
          edition,
          width,
          narrativeCount: expectedNarrative.length,
          passed: true,
        });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  join(root, "checks.json"),
  JSON.stringify(
    {
      scope:
        "Offline canonical report mechanics; not accessibility conformance or native host acceptance",
      checks,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(checks));
