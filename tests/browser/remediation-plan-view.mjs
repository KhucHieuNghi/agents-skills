// Run from repository root: node --import tsx tests/browser/remediation-plan-view.mjs
import assert from "node:assert/strict";
import console from "node:console";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { input } from "../helpers/remediation-fixture.ts";
import { planChanges } from "../../scripts/enterprise-remediation/change-plan.mjs";
import { renderChangePlan } from "../../scripts/enterprise-remediation/change-plan-view.mjs";

await mkdir("build/change-plan-browser", { recursive: true });
const output = await mkdtemp("build/change-plan-browser/run-");
const planningInput = input();
planningInput.proposals[0].changeId = "x".repeat(256);
planningInput.proposals[0].ownerRole =
  "<script>alert(1)</script> ![x](https://evil.test)";
const artifacts = renderChangePlan({
  plan: planChanges(planningInput),
  planningInput,
  hostContext: {
    trustedAssetBindings: planningInput.trustedAssetBindings,
    trustedAcceptancePolicies: [],
  },
});
await writeFile(`${output}/plan.html`, artifacts.html);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 360, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.setContent(artifacts.html);
    assert.equal(await page.locator("script,iframe,img,link").count(), 0);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").textContent(), "Skip to plan");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "main");
    for (const item of await page.locator("details").all())
      await item.evaluate((el) => {
        el.open = true;
      });
    assert.equal(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth,
      ),
      true,
      `Overflow at ${width}px`,
    );
    assert.equal(requests.length, 0);
    await page.screenshot({ path: `${output}/${width}.png`, fullPage: true });
    results.push({
      width,
      noOverflow: true,
      skipLink: true,
      externalRequests: 0,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/verification.json`,
  JSON.stringify(results, null, 2) + "\n",
);
console.log({ output, results });
