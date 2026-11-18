import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { resolveAuditContext } from "../../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  saveEnterpriseRun,
  loadEnterpriseRun,
  enterpriseDigest,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseAccessibility } from "../../scripts/enterprise-accessibility/workflow.mjs";
assert(
  process.argv[2] && process.argv[3] && process.argv[4],
  "Usage: node tests/browser/enterprise-accessibility-report.mjs AXE_TRIAL TRACE_IMPORT NEW_OUTPUT",
);
const axeRoot = resolve(process.argv[2]),
  traceRoot = resolve(process.argv[3]),
  output = resolve(process.argv[4]);
await mkdir(output);
const sha = (x) => createHash("sha256").update(x).digest("hex"),
  now = new Date().toISOString();
const manifest = JSON.parse(
  await readFile(join(traceRoot, "verification.json"), "utf8"),
);
assert(manifest.passed && manifest.synthetic);
const evaluations = [];
for (const receipt of manifest.results) {
  assert(/^[a-z][a-z0-9-]{0,127}$/.test(receipt.id));
  const input = JSON.parse(
    await readFile(join(traceRoot, receipt.id + "-input.json"), "utf8"),
  );
  const { customerId, assessmentAt, ...context } = input.context;
  assert.equal(customerId, "synthetic-scenarios");
  assert(assessmentAt <= now);
  const payloads = input.sources.map((s) => JSON.parse(s.artifactText));
  const from = new Date(
    Math.min(...payloads.map((p) => Date.parse(p.startedAt))) - 1,
  ).toISOString();
  evaluations.push({
    evaluationId: receipt.id,
    kind: "scenario",
    window: { from, to: now },
    context,
    sources: input.sources,
  });
}
const artifactText = await readFile(join(axeRoot, "mixed.json"), "utf8"),
  raw = JSON.parse(artifactText);
const axeContext = {
  entityId: "local-fixture",
  environment: "test",
  targetUrl: raw.url,
  stateId: "mixed",
  viewport: {
    width: raw.testEnvironment.windowWidth,
    height: raw.testEnvironment.windowHeight,
  },
  maxAgeSeconds: 86400,
  expectedRuleIds: ["button-name"],
};
evaluations.push({
  evaluationId: "axe-mixed",
  kind: "axe",
  window: {
    from: new Date(Date.parse(raw.timestamp) - 1).toISOString(),
    to: now,
  },
  context: axeContext,
  sources: [
    {
      sourceId: "native-mixed",
      sourceKind: "axe-results",
      scope: {
        customerId: "synthetic-scenarios",
        entityId: "local-fixture",
        environment: "test",
        stateId: "mixed",
        viewport: axeContext.viewport,
      },
      capturedAt: now,
      artifactText,
      artifactHash: sha(artifactText),
    },
  ],
});
const run = resolveAuditContext(
  {
    customerId: "synthetic-scenarios",
    runId: "initial",
    assessmentAt: now,
    profileIds: ["commerce"],
    entities: [{ entityId: "local-fixture", type: "site" }],
  },
  [],
);
await saveEnterpriseRun(join(output, "initial"), run);
const bundle = {
  sourceDigest: enterpriseDigest(run),
  newRunId: "assessed",
  assessmentAt: now,
  evaluations,
};
await writeFile(
  join(output, "import.json"),
  JSON.stringify(bundle, null, 2) + "\n",
);
const first = await evaluateEnterpriseAccessibility(
  join(output, "initial"),
  bundle,
  join(output, "assessed"),
);
const assessed = await loadEnterpriseRun(join(output, "assessed"));
const reportBundle = (state, result, extra = {}) => ({
  sourceRunDigest: enterpriseDigest(state),
  revisionId: "report",
  authorId: "root-fixture-author",
  generatedAt: state.assessmentAt,
  brand: { name: "Synthetic accessibility review", accent: "#174f7b" },
  findings: result.findings,
  observations: result.observations,
  actions: [],
  narrative: [],
  decisions: [],
  ...extra,
});
const parent = buildEnterpriseReport(assessed, reportBundle(assessed, first));
await saveEnterpriseReport(join(output, "report-1"), parent);
await loadEnterpriseReport(join(output, "report-1"));
const later = new Date().toISOString();
const nextBundle = {
  ...bundle,
  sourceDigest: enterpriseDigest(assessed),
  newRunId: "reassessed",
  assessmentAt: later,
  evaluations: [evaluations[0]],
};
await writeFile(
  join(output, "revision-import.json"),
  JSON.stringify(nextBundle, null, 2) + "\n",
);
const second = await evaluateEnterpriseAccessibility(
  join(output, "assessed"),
  nextBundle,
  join(output, "reassessed"),
);
const next = await loadEnterpriseRun(join(output, "reassessed"));
const report = buildEnterpriseReport(
  next,
  reportBundle(next, second, {
    revisionId: "report-2",
    parentReportDigest: enterpriseDigest(parent),
    observations: [...parent.observations, ...second.observations],
  }),
  parent,
);
await saveEnterpriseReport(join(output, "report-2"), report);
await loadEnterpriseReport(join(output, "report-2"));
assert.equal(report.observations.length, 20);
assert.equal(report.findings.length, 2);
let browser;
const renders = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (route) => {
      if (route.request().url().startsWith("file:")) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    await page.goto(pathToFileURL(join(output, "report-2/report.html")).href);
    const overflow = await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.screenshot({
      path: join(output, `report-${width}.png`),
      fullPage: true,
    });
    renders.push({ width, overflow, errors, external });
    await page.close();
  }
} finally {
  await browser?.close();
}
const files = {};
for (const f of ["report.json", "report.md", "report.html"])
  files[f] = sha(await readFile(join(output, "report-2", f)));
await writeFile(
  join(output, "verification.json"),
  JSON.stringify(
    {
      passed: true,
      synthetic: true,
      semanticAcceptance: false,
      evaluations: evaluations.length,
      findings: report.findings.length,
      observations: report.observations.length,
      renders,
      files,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  JSON.stringify({
    passed: true,
    evaluations: evaluations.length,
    findings: report.findings.length,
    observations: report.observations.length,
    renders: renders.length,
  }) + "\n",
);
