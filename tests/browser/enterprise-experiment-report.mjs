import { reviewedFixture } from "../helpers/experiment-reviewed.ts";
import { hash } from "../helpers/experiment-exports.ts";
import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { resolveAuditContext } from "../../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
  loadEnterpriseRun,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseExperiments } from "../../scripts/enterprise-journeys/experiment-workflow.mjs";

const root = resolve(
  process.argv[2] ?? "build/enterprise-experiment-report-browser",
);
await mkdir(root);
const fixture = reviewedFixture();
let run = resolveAuditContext(
  {
    customerId: fixture.context.scope.customerId,
    runId: "initial",
    assessmentAt: fixture.context.assessmentAt,
    profileIds: ["commerce"],
    entities: [{ entityId: "site", type: "site" }],
  },
  [],
);
let source = join(root, "initial");
await saveEnterpriseRun(source, run);
const { assessmentAt, ...context } = fixture.context;
const artifactText = JSON.stringify(fixture.receipt);
const entry = {
  evaluationId: "checkout-experiment",
  context,
  aggregateSources: fixture.aggregates,
  supportSources: fixture.supports,
  reviewPolicy: fixture.policy,
  receipt: { artifactText, artifactHash: hash(artifactText) },
  presentation: {
    experimentLabel: "Synthetic checkout experiment",
    metricLabels: [
      {
        metricId: "conversion",
        label:
          'Completed purchases <img src=x onerror="globalThis.EXPERIMENT_LABEL_ATTACK=1">',
      },
      { metricId: "harm", label: "Refund outcome" },
    ],
  },
};
const checks = [],
  browser = await chromium.launch();
let parent = null;
try {
  for (const [revision, at] of [
    ["fresh", assessmentAt],
    ["expired", "2026-11-06T00:00:00Z"],
  ]) {
    const output = join(root, revision);
    const result = await evaluateEnterpriseExperiments(
      source,
      {
        sourceDigest: enterpriseDigest(run),
        newRunId: revision,
        assessmentAt: at,
        evaluations: [entry],
      },
      output,
    );
    run = await loadEnterpriseRun(output);
    const report = buildEnterpriseReport(
      run,
      {
        sourceRunDigest: enterpriseDigest(run),
        revisionId: revision,
        authorId: "synthetic-author",
        generatedAt: at,
        brand: { name: "Synthetic experiment evidence", accent: "#174f7b" },
        findings: [],
        actions: [],
        observations: result.observations,
        narrative: result.narrative,
        decisions: [],
        ...(parent ? { parentReportDigest: enterpriseDigest(parent) } : {}),
      },
      parent,
    );
    for (const edition of ["customer", "public"]) {
      const directory = join(root, `${revision}-${edition}`);
      await saveEnterpriseReport(directory, report, edition);
      const projected = await loadEnterpriseReport(directory);
      for (const width of [390, 1440]) {
        const browserContext = await browser.newContext({
          viewport: { width, height: 900 },
          offline: true,
        });
        try {
          const page = await browserContext.newPage(),
            errors = [],
            external = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("request", (r) => {
            if (/^https?:/.test(r.url())) external.push(r.url());
          });
          await page.goto(pathToFileURL(join(directory, "report.html")).href);
          const body = await page.locator("body").textContent();
          assert(!body.includes("Original registration history"));
          assert(!body.includes("artifactText"));
          assert.equal(await page.locator("script").count(), 0);
          assert.equal(await page.locator('img[src="x"]').count(), 0);
          assert.equal(
            await page.evaluate(() => globalThis.EXPERIMENT_LABEL_ATTACK),
            undefined,
          );
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
          const articles = page.locator(".narrative-text");
          assert.equal(
            await articles.count(),
            (projected.narrative ?? []).length,
          );
          for (
            let index = 0;
            index < (projected.narrative ?? []).length;
            index++
          )
            assert.equal(
              await articles.nth(index).textContent(),
              projected.narrative[index].text,
            );
          if (edition === "customer") {
            assert(body.includes("synthetic"));
            assert(body.includes("insufficient-evidence"));
            if (revision === "expired")
              assert(body.includes("blocked") && body.includes("Historical"));
          }
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          await page.screenshot({
            path: join(root, `${revision}-${edition}-${width}.png`),
          });
          checks.push({
            revision,
            edition,
            width,
            narrativeCount: (projected.narrative ?? []).length,
            passed: true,
          });
        } finally {
          await browserContext.close();
        }
      }
    }
    parent = report;
    source = output;
  }
} finally {
  await browser.close();
}
await writeFile(
  join(root, "checks.json"),
  JSON.stringify(
    {
      scope:
        "Synthetic experiment report projections only; not native host, real experiment or usability acceptance",
      checks,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ root, passed: checks.length }));
