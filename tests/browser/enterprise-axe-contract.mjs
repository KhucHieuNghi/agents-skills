import { URL } from "node:url";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import process from "node:process";
import assert from "node:assert/strict";
import { evaluateAxe } from "../../scripts/enterprise-accessibility/axe.mjs";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";

assert(
  process.argv[2] && process.argv[3],
  "Usage: node tests/browser/enterprise-axe-contract.mjs DEPENDENCY_ROOT NEW_OUTPUT",
);
const require = createRequire(import.meta.url);
const axe = require(
  require.resolve("axe-core", { paths: [resolve(process.argv[2])] }),
);
assert.equal(axe.version, "4.14.1");
const output = resolve(process.argv[3]);
await mkdir(output);
const body =
  '<!doctype html><html lang="en"><head><title>Local accessibility fixture</title></head><body><main><h1>Buttons</h1><button id="named">Named button</button><button id="empty"></button><button id="empty2"></button><div hidden><button id="hidden"></button></div></main></body></html>';
const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(url).origin
      ? route.continue()
      : route.abort(),
  );
  await page.goto(url);
  await page.addScriptTag({ content: axe.source });
  const cases = [
    {
      id: "mixed",
      context: "document",
      options: { runOnly: { type: "rule", values: ["button-name"] } },
    },
    {
      id: "filtered",
      context: "document",
      options: {
        runOnly: { type: "rule", values: ["button-name"] },
        resultTypes: ["passes"],
      },
    },
    {
      id: "excluded",
      context: { include: ["#named"] },
      options: { runOnly: { type: "rule", values: ["button-name"] } },
    },
  ];
  cases.push({
    id: "no-html",
    context: "document",
    configure: { noHtml: true },
    options: { runOnly: { type: "rule", values: ["button-name"] } },
  });
  cases.push({
    id: "no-selectors",
    context: "document",
    options: {
      runOnly: { type: "rule", values: ["button-name"] },
      selectors: false,
    },
  });
  const receipts = [];
  for (const fixture of cases) {
    const result = await page.evaluate(async (f) => {
      globalThis.axe.reset();
      if (f.configure) globalThis.axe.configure(f.configure);
      return globalThis.axe.run(
        f.context === "document" ? globalThis.document : f.context,
        f.options,
      );
    }, fixture);
    const artifactText = JSON.stringify(result, null, 2) + "\n";
    await writeFile(resolve(output, fixture.id + ".json"), artifactText);
    const capturedAt = new Date().toISOString();
    const context = {
      customerId: "synthetic-accessibility",
      entityId: "site",
      environment: "test",
      targetUrl: url,
      stateId: fixture.id,
      viewport: { width: 390, height: 844 },
      assessmentAt: capturedAt,
      maxAgeSeconds: 3600,
      expectedRuleIds: ["button-name"],
    };
    const evaluation = evaluateAxe(context, [
      {
        sourceId: fixture.id,
        sourceKind: "axe-results",
        scope: {
          customerId: context.customerId,
          entityId: "site",
          environment: "test",
          stateId: fixture.id,
          viewport: context.viewport,
        },
        capturedAt,
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      },
    ]);
    assert.equal(
      evaluation.checks[0].status,
      fixture.id === "excluded" ? "pass" : "fail",
    );
    assert.equal(evaluation.coverage, "unknown");
    if (fixture.id.startsWith("no-"))
      assert(
        evaluation.dataRequests.some(
          (r) => r.reason === "node-details-missing",
        ),
      );
    assert.equal(evaluation.conformanceAssessed, false);
    await writeFile(
      resolve(output, fixture.id + "-evaluation.json"),
      JSON.stringify(evaluation, null, 2) + "\n",
    );
    receipts.push({
      id: fixture.id,
      context: fixture.context,
      options: fixture.options,
      configure: fixture.configure ?? null,
      artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      testEngine: result.testEngine,
      testEnvironment: result.testEnvironment,
      categories: Object.fromEntries(
        ["violations", "passes", "incomplete", "inapplicable"].map((k) => [
          k,
          result[k].map((r) => ({
            id: r.id,
            nodes: r.nodes.length,
            targets: r.nodes.map((n) => n.target),
          })),
        ]),
      ),
    });
  }
  assert.equal(receipts[0].categories.violations[0].nodes, 2);
  assert.equal(receipts[0].categories.passes[0].nodes, 1);
  assert.equal(receipts[1].categories.violations[0].nodes, 1);
  assert.equal(receipts[2].categories.violations.length, 0);
  assert.equal(receipts[2].categories.passes[0].nodes, 1);
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(
      {
        synthetic: true,
        loopbackOnly: true,
        engineVersion: axe.version,
        scopeClaim: "native API semantics only",
        receipts,
      },
      null,
      2,
    ) + "\n",
  );
  globalThis.console.log(
    JSON.stringify({
      passed: true,
      cases: receipts.length,
      engineVersion: axe.version,
      mixedCategories: true,
      filteredCountsTruncated: true,
      excludedScanNotWholePage: true,
    }),
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
