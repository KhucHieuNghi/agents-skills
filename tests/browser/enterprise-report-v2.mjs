import console from "node:console";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import {
  loadEnterpriseReport,
  saveEnterpriseReport,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
const root = resolve(process.argv[2] ?? "build/enterprise-report-v2-browser");
await mkdir(root);
const checks = [],
  browser = await chromium.launch();
try {
  for (const site of [
    "quokkaguide.com",
    "cake.vn",
    "infinity.racing",
    "cake-original",
  ]) {
    const report = await loadEnterpriseReport(
      resolve(
        site === "cake-original"
          ? "docs/research/enterprise-public-pilot-20261118"
          : "docs/research/enterprise-performance-public-20261119/frozen",
        site === "cake-original" ? "cake.vn" : site,
        "report",
      ),
    );
    for (const edition of ["customer", "public"]) {
      const dir = join(root, site + "-" + edition);
      await saveEnterpriseReport(dir, report, edition, { rendererVersion: 2 });
      await loadEnterpriseReport(dir);
      for (const width of [390, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          offline: true,
        });
        const page = await context.newPage(),
          errors = [],
          requests = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        await page.goto(pathToFileURL(join(dir, "report.html")).href);
        assert.equal(await page.locator("script").count(), 0);
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
        const dimensions = await page.evaluate(() => ({
          width: globalThis.innerWidth,
          scrollWidth: globalThis.document.documentElement.scrollWidth,
          height: globalThis.document.documentElement.scrollHeight,
          background: globalThis.getComputedStyle(globalThis.document.body)
            .backgroundColor,
        }));
        assert.ok(dimensions.scrollWidth <= width);
        assert.equal(dimensions.background, "rgb(246, 247, 248)");
        let narrativeHeight = null;
        if (edition === "customer") {
          const articles = page.locator(".narrative-article");
          assert.equal(await articles.count(), report.narrative.length);
          for (let i = 0; i < report.narrative.length; i++)
            assert.equal(
              await articles.nth(i).locator(".narrative-text").textContent(),
              report.narrative[i].text,
            );
          for (let i = 0; i < report.narrative.length; i++)
            assert.deepEqual(
              await articles
                .nth(i)
                .locator(".evidence-references a")
                .allTextContents(),
              report.narrative[i].evidenceIds,
            );
          for (let i = 0; i < report.observations.length; i++)
            assert.deepEqual(
              await page
                .locator("#measurements .record")
                .nth(i)
                .locator(".evidence-references a")
                .allTextContents(),
              report.observations[i].evidenceIds,
            );
          for (let i = 0; i < report.findings.length; i++)
            assert.deepEqual(
              await page
                .locator("#findings .record")
                .nth(i)
                .locator(".evidence-references a")
                .allTextContents(),
              report.findings[i].evidenceIds,
            );
          const box = await page.locator("#narrative").boundingBox();
          narrativeHeight = box.height;
          if (width === 390 && site === "quokkaguide.com")
            assert.ok(
              narrativeHeight <= 27332 * 0.25,
              "Narrative must reduce by >=75% without hidden prose",
            );
          const prose = await articles
            .first()
            .locator(".narrative-text")
            .boundingBox();
          assert.ok(prose.width >= Math.min(width - 70, 600));
          await page.locator("#narrative").scrollIntoViewIfNeeded();
          await page.screenshot({
            path: join(root, `${site}-${width}-narrative.png`),
          });
          const details = articles.first().locator("details"),
            summary = details.locator("summary");
          await summary.focus();
          await page.keyboard.press("Enter");
          assert.equal(await details.getAttribute("open"), "");
          assert.equal(
            await details.locator("a").count(),
            report.narrative[0].evidenceIds.length,
          );
          for (const link of await page
            .locator(".evidence-references a")
            .all()) {
            const href = await link.getAttribute("href");
            assert.equal(await page.locator(href).count(), 1);
          }
          await page.screenshot({
            path: join(root, `${site}-${width}-expanded.png`),
          });
          await page.keyboard.press("Enter");
          assert.equal(await details.getAttribute("open"), null);
          await page.keyboard.press("Enter");
          await page.keyboard.press("Tab");
          assert.equal(
            await page.locator(":focus").getAttribute("href"),
            await details.locator("a").first().getAttribute("href"),
          );
          await page.keyboard.press("Enter");
          assert.ok(
            (await page.evaluate(() => globalThis.location.hash)).startsWith(
              "#evidence-",
            ),
          );
          await page.screenshot({
            path: join(root, `${site}-${width}-evidence.png`),
          });
          await page.evaluate(() => {
            globalThis.document.body.style.fontSize = "32px";
          });
          assert.ok(
            await page.evaluate(
              () =>
                globalThis.document.documentElement.scrollWidth <=
                globalThis.innerWidth,
            ),
          );
          assert.equal(
            await articles.first().locator(".narrative-text").textContent(),
            report.narrative[0].text,
          );
        } else {
          assert.equal(await page.locator(".narrative-article").count(), 0);
          assert.equal(await page.locator(".evidence-references").count(), 0);
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(requests, []);
        checks.push({
          site,
          edition,
          width,
          dimensions,
          narrativeHeight,
          offline: true,
          keyboard: true,
          enlargedBodyText: edition === "customer",
        });
        await context.close();
      }
    }
  }
  await writeFile(
    join(root, "checks.json"),
    JSON.stringify(checks, null, 2) + "\n",
  );
  console.log(JSON.stringify({ checks: checks.length, root }));
} finally {
  await browser.close();
}
