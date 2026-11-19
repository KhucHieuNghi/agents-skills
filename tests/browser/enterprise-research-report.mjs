import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { RESEARCH_DRAFT_LIMITATIONS } from "../../scripts/enterprise-journeys/research-projection.mjs";
import {
  renderResearchDraft,
  validateResearchDraftArtifacts,
} from "../../scripts/enterprise-journeys/research-report.mjs";
const root = resolve(
  process.argv[2] ?? "build/enterprise-research-report-browser",
);
await mkdir(root);
const fields = [
  "taskContext",
  "summary",
  "limitation",
  "recommendation",
  "retest",
];
const draft = {
  schemaVersion: 1,
  editionId: "a0000000-0000-4000-8000-000000000001",
  assessmentDate: "2026-11-19",
  status: "reviewed-material-draft",
  synthetic: true,
  items: [
    {
      reference: "b0000000-0000-4000-8000-000000000001",
      kind: "observed-behavior",
      taskContext: "Checkout — synthetic task",
      summary:
        '<script>globalThis.injected=true</script> [link](https://example.com) & "quote"\nSecond line',
      limitation: "Synthetic fixture; no real participant evidence.",
      recommendation: "Clarify the delivery options before payment.",
      retest:
        "Repeat the authorized checkout task with revised copy. " +
        "longword".repeat(80),
      reviewType: "ai",
    },
  ],
  limitations: [...RESEARCH_DRAFT_LIMITATIONS],
};
const browser = await chromium.launch(),
  checks = [];
try {
  for (const mode of ["reviewed", "empty"]) {
    const d = globalThis.structuredClone(draft);
    if (mode === "empty") {
      d.items = [];
      d.status = "inconclusive";
      d.synthetic = null;
    }
    const artifacts = renderResearchDraft(d);
    validateResearchDraftArtifacts(artifacts);
    await writeFile(join(root, mode + ".html"), artifacts.html);
    await writeFile(join(root, mode + ".json"), artifacts.json);
    await writeFile(join(root, mode + ".md"), artifacts.markdown);
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
          viewport: { width, height: 900 },
        }),
        page = await context.newPage(),
        requests = [];
      page.on("request", (r) => {
        if (!r.url().startsWith("file:")) requests.push(r.url());
      });
      await page.goto(pathToFileURL(join(root, mode + ".html")).href);
      assert.equal(await page.locator("script,iframe,img,form").count(), 0);
      assert.equal(await page.evaluate(() => globalThis.injected), undefined);
      for (const item of d.items)
        for (const field of fields)
          assert.equal(
            await page.locator(`[data-field="${field}"]`).textContent(),
            item[field],
          );
      assert.equal(await page.locator("article").count(), d.items.length);
      assert.equal(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth,
        ),
        true,
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () => globalThis.document.activeElement.textContent,
        ),
        "Skip to report",
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.evaluate(() => globalThis.document.activeElement.id),
        "main",
      );
      await page.screenshot({
        path: join(root, `${mode}-${width}.png`),
        fullPage: true,
      });
      await page.evaluate(
        () => (globalThis.document.body.style.fontSize = "36px"),
      );
      assert.equal(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth,
        ),
        true,
      );
      assert.deepEqual(requests, []);
      checks.push({
        mode,
        width,
        textParity: true,
        externalRequests: 0,
        scriptNodes: 0,
        keyboardSkip: true,
        noOverflow: true,
        enlargedTextNoOverflow: true,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  join(root, "checks.json"),
  JSON.stringify(checks, null, 2) + "\n",
);
console.log(JSON.stringify({ cases: checks.length, root }));
