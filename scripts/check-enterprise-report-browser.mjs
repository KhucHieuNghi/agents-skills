import process from "node:process";
import console from "node:console";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../site/node_modules/@playwright/test/index.mjs";

// Dev-only check: uses the site's pinned Playwright, never a customer dependency.
const root = path.resolve(
  process.argv[2] ?? "build/enterprise-report-examples",
);
const output = path.join(root, "browser");
await mkdir(output);
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const edition of [
    "partial",
    "complete-accounting",
    "partial-public",
    "complete-accounting-public",
  ]) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        offline: true,
      });
      const page = await context.newPage();
      const failures = [],
        requests = [];
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") failures.push(message.text());
      });
      page.on("request", (request) => {
        if (/^https?:/.test(request.url())) requests.push(request.url());
      });
      await page.goto(
        pathToFileURL(path.join(root, edition, "report.html")).href,
      );
      await page.locator("h1").waitFor();
      const dimensions = await page.evaluate(() => ({
        width: globalThis.innerWidth,
        scrollWidth: globalThis.document.documentElement.scrollWidth,
        background: globalThis.getComputedStyle(globalThis.document.body)
          .backgroundColor,
      }));
      assert.ok(
        dimensions.scrollWidth <= width,
        `Page overflow: ${edition}/${width}`,
      );
      assert.equal(
        dimensions.background,
        "rgb(246, 247, 248)",
        "Offline CSP stylesheet did not apply",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.locator(":focus").textContent(),
        "Skip to report",
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => globalThis.location.hash),
        "#main",
      );
      let focusedTables = 0;
      for (let step = 0; step < 35; step++) {
        await page.keyboard.press("Tab");
        if (
          (await page.evaluate(() =>
            globalThis.document.activeElement?.getAttribute("role"),
          )) === "region"
        )
          focusedTables++;
      }
      assert.ok(
        focusedTables > 0,
        "Scrollable tables must be reachable by keyboard",
      );
      assert.equal(await page.locator("script").count(), 0);
      assert.deepEqual(failures, []);
      assert.deepEqual(requests, []);
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(output, `${edition}-${width}.png`),
        fullPage: true,
      });
      checks.push({
        edition,
        width,
        dimensions,
        focusedTables,
        offline: true,
        networkRequests: requests,
        errors: failures,
      });
      await context.close();
    }
  }
  await writeFile(
    path.join(output, "checks.json"),
    JSON.stringify(
      {
        browser: await browser.version(),
        checks,
        limitations: [
          "Synthetic reports only",
          "Keyboard reachability, viewport overflow, offline CSS and JS/network checks are bounded checks, not WCAG conformance",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ checks: checks.length, output }));
} finally {
  await browser.close();
}
