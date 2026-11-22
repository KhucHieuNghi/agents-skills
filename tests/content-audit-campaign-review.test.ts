import { studySource } from "./helpers/content-audit-study.js";
import { Ajv } from "ajv";
import {
  analyticsExport,
  bingExport,
  serverLogExport,
  searchConsoleExport,
} from "./helpers/content-audit-measurements.js";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { discoverInventory } from "../skills/content-search-audit/scripts/lib/discovery.mjs";
import { startCampaign } from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { indexCampaign } from "../skills/content-search-audit/scripts/lib/campaign-index.mjs";
import {
  renderCampaignReport,
  renderRedactedCampaignReport,
} from "../skills/content-search-audit/scripts/lib/campaign-report.mjs";
import { networkFixture } from "./helpers/content-audit-network.js";
import { reviewCampaignParts } from "../skills/content-search-audit/scripts/lib/campaign-part-review.mjs";
import { loadAuditData } from "../skills/content-search-audit/scripts/lib/validate.mjs";
import {
  evaluateCampaignReview,
  reviewCampaign,
  validateCampaignReview,
} from "../skills/content-search-audit/scripts/lib/campaign-review.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup(resolveLocal = false) {
  const root = await mkdtemp(path.join(tmpdir(), "global-review-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const inputs = await Promise.all(
    ["a", "b"].map(async (name) => {
      const file = path.join(content, `${name}.md`);
      await writeFile(file, `# ${name}\nSynthetic fixture.`);
      return { path: file, source: "fixture" };
    }),
  );
  let source = await startCampaign(
    {
      inputs,
      localRoots: [content],
      inventoryComplete: true,
      partitionSize: 1,
    },
    path.join(root, "source"),
  );
  if (resolveLocal) {
    const manifestPath = path.join(source.directory, "campaign.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const parts = [];
    for (const part of manifest.parts) {
      const audit = await loadAuditData(path.join(source.directory, part.path));
      const reviews = audit.checks.map((check) => ({
        itemId: check.itemId,
        ruleId: check.ruleId,
        status: "not-applicable",
        reason:
          "Synthetic completion gate fixture only; not a real content applicability judgment",
        reviewer: "fixture",
        reviewedAt: new Date().toISOString(),
        evidenceIds: audit.evidence
          .filter((record) => record.itemId === check.itemId)
          .map((record) => record.evidenceId),
      }));
      parts.push({
        path: part.path,
        sourceSnapshotHash: createHash("sha256")
          .update(JSON.stringify(audit))
          .digest("hex"),
        bundle: { reviews },
      });
    }
    source = await reviewCampaignParts(
      source.directory,
      {
        schemaVersion: 1,
        campaignId: manifest.campaignId,
        sourceManifestHash: createHash("sha256")
          .update(await readFile(manifestPath))
          .digest("hex"),
        parts,
      },
      path.join(root, "reviewed-source"),
    );
  }

  const index = await indexCampaign(source.directory, path.join(root, "index"));
  const rows = async (name: string) =>
    (await readFile(path.join(index.directory, name), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
  const itemIds = (await rows("items.jsonl")).map((item) => item.itemId);
  const evidenceReferences = (await rows("evidence.jsonl"))
    .filter((record) => record.kind === "content")
    .map((record) => record.reference);
  const contextEvidence = [
    "inventory-map",
    "question-set",
    "entity-record",
    "link-graph",
    "audience-context",
  ].map((kind) => ({
    evidenceId: kind,
    kind,
    locator: "fixture:provided-context",
    collectedAt: new Date().toISOString(),
    value: `Synthetic ${kind}`,
    snapshotHash: createHash("sha256")
      .update(`Synthetic ${kind}`)
      .digest("hex"),
    sourceReferences: evidenceReferences,
  }));
  const bundle = {
    schemaVersion: 1,
    campaignId: index.campaignId,
    sourceManifestHash: index.sourceManifestHash,
    partSnapshotHashes: index.partSnapshotHashes,
    contextEvidence,
    findings: [] as Record<string, unknown>[],
    reviews: [
      "portfolio-task-gaps",
      "portfolio-duplication",
      "portfolio-contradictions",
      "portfolio-journey-links",
    ].map((ruleId) => ({
      ruleId,
      status: "pass",
      reason:
        "Synthetic assessment for contract testing, not a quality benchmark",
      reviewer: "fixture",
      reviewedAt: new Date().toISOString(),
      itemIds,
      evidenceReferences,
      contextEvidenceIds: contextEvidence.map((record) => record.evidenceId),
    })),
  };
  return { root, source, bundle };
}
it("accepts cross-part evidence while retaining unresolved item coverage and immutable source", async () => {
  const { root, source, bundle } = await setup();
  const before = await readFile(path.join(source.directory, "campaign.json"));
  const result = await reviewCampaign(
    source.directory,
    bundle,
    path.join(root, "review"),
  );
  expect(result.globalReviewComplete).toBe(true);
  expect(result.completionAllowed).toBe(false);
  expect(result.status).toBe("partial");
  expect(result.itemCoverage.unresolvedItems).toBe(2);
  expect(await readFile(path.join(source.directory, "campaign.json"))).toEqual(
    before,
  );
  await writeFile(
    path.join(result.directory, "review-result.json"),
    '{"completionAllowed":true}',
  );
  expect(
    (await validateCampaignReview(source.directory, result.directory))
      .completionAllowed,
  ).toBe(false);
  await expect(
    reviewCampaign(source.directory, bundle, result.directory),
  ).rejects.toThrow();
  await expect(
    reviewCampaign(
      source.directory,
      bundle,
      path.join(source.directory, "nested"),
    ),
  ).rejects.toThrow(/outside/);
});
it("rejects stale bindings, unresolved references and incomplete global denominators before writing", async () => {
  const { root, source, bundle } = await setup();
  for (const alter of [
    (b) => {
      b.sourceManifestHash = "0".repeat(64);
    },
    (b) => {
      b.partSnapshotHashes["parts/000001"] = "0".repeat(64);
    },
    (b) => {
      b.reviews[0].evidenceReferences[0].part = "parts/999999";
    },
    (b) => {
      b.reviews[0].itemIds.pop();
    },
    (b) => {
      b.reviews[0].evidenceReferences.pop();
    },
    (b) => {
      b.reviews[0].contextEvidenceIds = [];
    },
    (b) => {
      b.contextEvidence[0].value = "tampered";
    },
  ]) {
    const changed = structuredClone(bundle);
    alter(changed);
    await expect(
      reviewCampaign(source.directory, changed, path.join(root, "bad")),
    ).rejects.toThrow();
    await expect(access(path.join(root, "bad"))).rejects.toThrow();
  }
});
it("requires actionable evidence-backed findings for failures and preserves unknown global rules", async () => {
  const { source, bundle } = await setup();
  bundle.reviews[0].status = "fail";
  await expect(
    evaluateCampaignReview(source.directory, bundle),
  ).rejects.toThrow(/lacks finding/);
  bundle.findings.push({
    findingId: "gap",
    ruleId: bundle.reviews[0].ruleId,
    severity: "medium",
    confidence: "high",
    observation: "Synthetic missing task",
    recommendation: "Review the missing task",
    verification: "Compare supplied questions with revised content",
    affectedItemIds: bundle.reviews[0].itemIds,
    evidenceReferences: bundle.reviews[0].evidenceReferences,
  });
  expect(
    (await evaluateCampaignReview(source.directory, bundle)).findings,
  ).toBe(1);
  bundle.reviews[1].status = "unknown";
  bundle.reviews[1].evidenceReferences = [];
  const result = await evaluateCampaignReview(source.directory, bundle);
  expect(result.globalReviewComplete).toBe(false);
  expect(result.unresolvedRuleIds).toEqual(["portfolio-duplication"]);
});
it("exposes review and recomputed validation through the standalone CLI", async () => {
  const { root, source, bundle } = await setup();
  const file = path.join(root, "bundle.json");
  await writeFile(file, JSON.stringify(bundle));
  const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const run = promisify(execFile);
  const review = path.join(root, "review");
  const created = await run(process.execPath, [
    cli,
    "campaign-review",
    source.directory,
    file,
    review,
  ]);
  expect(JSON.parse(created.stdout).globalReviewComplete).toBe(true);
  const checked = await run(process.execPath, [
    cli,
    "campaign-review-validate",
    source.directory,
    review,
  ]);
  expect(JSON.parse(checked.stdout).completionAllowed).toBe(false);
});

it("permits completion only when local coverage and global judgments both resolve", async () => {
  const { source, bundle } = await setup(true);
  const complete = await evaluateCampaignReview(source.directory, bundle);
  expect(complete.itemCoverage.unresolvedItems).toBe(0);
  expect(complete.completionAllowed).toBe(true);
  expect(complete.status).toBe("complete");
  bundle.reviews.pop();
  expect(
    (await evaluateCampaignReview(source.directory, bundle)).completionAllowed,
  ).toBe(false);
});

async function partBundle(source, globalBundle) {
  const partPath = Object.keys(globalBundle.partSnapshotHashes)[0];
  const audit = await loadAuditData(path.join(source.directory, partPath));
  return {
    schemaVersion: 1,
    campaignId: globalBundle.campaignId,
    sourceManifestHash: globalBundle.sourceManifestHash,
    parts: [
      {
        path: partPath,
        sourceSnapshotHash: globalBundle.partSnapshotHashes[partPath],
        bundle: {
          reviews: [
            {
              itemId: audit.inventory[0].itemId,
              ruleId: "seo-response",
              status: "not-applicable",
              reviewer: "fixture",
              reviewedAt: new Date().toISOString(),
              reason: "Synthetic offline applicability fixture",
              evidenceIds: [audit.evidence[0].evidenceId],
            },
          ],
        },
      },
    ],
  };
}
it("applies a selected part through CLI while retaining unselected snapshots and invalidating old global bindings", async () => {
  const { root, source, bundle } = await setup();
  const input = await partBundle(source, bundle);
  const original = await readFile(path.join(source.directory, "campaign.json"));
  const file = path.join(root, "parts-bundle.json");
  await writeFile(file, JSON.stringify(input));
  const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const { stdout } = await promisify(execFile)(process.execPath, [
    cli,
    "campaign-review-parts",
    source.directory,
    file,
    path.join(root, "revised"),
  ]);
  const revised = JSON.parse(stdout);
  expect(revised.parentCampaignId).toBe(source.campaignId);
  expect(await readFile(path.join(source.directory, "campaign.json"))).toEqual(
    original,
  );
  const changedPath = input.parts[0].path;
  const unchangedPath = Object.keys(bundle.partSnapshotHashes).find(
    (value) => value !== changedPath,
  )!;
  expect(
    await loadAuditData(path.join(revised.directory, unchangedPath)),
  ).toEqual(await loadAuditData(path.join(source.directory, unchangedPath)));
  const changed = await loadAuditData(
    path.join(revised.directory, changedPath),
  );
  expect(
    changed.checks.find((check) => check.ruleId === "seo-response").status,
  ).toBe("not-applicable");
  expect(changed.run.runId).not.toBe(
    (await loadAuditData(path.join(source.directory, changedPath))).run.runId,
  );
  await expect(
    evaluateCampaignReview(revised.directory, bundle),
  ).rejects.toThrow(/binding/);
});
it("preflights all selected parts and rejects stale or non-owned assessments before output", async () => {
  const { root, source, bundle } = await setup();
  const input = await partBundle(source, bundle);
  const secondPath = Object.keys(bundle.partSnapshotHashes).find(
    (value) => value !== input.parts[0].path,
  )!;
  for (const alter of [
    (value) => {
      value.parts[0].sourceSnapshotHash = "0".repeat(64);
    },
    (value) => {
      value.parts.push(structuredClone(value.parts[0]));
    },
    (value) => {
      value.parts.push({
        ...structuredClone(value.parts[0]),
        path: secondPath,
        sourceSnapshotHash: bundle.partSnapshotHashes[secondPath],
      });
    },
    (value) => {
      value.parts[0].bundle.reviews[0].evidenceIds = ["missing"];
    },
  ]) {
    const changed = structuredClone(input);
    alter(changed);
    await expect(
      reviewCampaignParts(
        source.directory,
        changed,
        path.join(root, "bad-part-review"),
      ),
    ).rejects.toThrow();
    await expect(access(path.join(root, "bad-part-review"))).rejects.toThrow();
  }
  await expect(
    reviewCampaignParts(
      source.directory,
      input,
      path.join(source.directory, "nested"),
    ),
  ).rejects.toThrow(/outside/);
});

it("renders a unified safe report with scoped evidence, hashes and partial coverage", async () => {
  const { root, source, bundle } = await setup();
  bundle.reviews[0].status = "fail";
  bundle.findings.push({
    findingId: "=danger",
    ruleId: bundle.reviews[0].ruleId,
    severity: "high",
    confidence: "medium",
    observation: "<script>alert(1)</script> [click](javascript:alert(1))",
    recommendation: '=HYPERLINK("https://example.com")',
    verification: "Inspect actual evidence",
    action: "consolidate",
    actionReason: "=reviewer decision",
    ownerRole: "<script>owner</script>",
    effort: "=estimate",
    affectedItemIds: bundle.reviews[0].itemIds,
    evidenceReferences: bundle.reviews[0].evidenceReferences,
  });
  const receipt = await reviewCampaign(
    source.directory,
    bundle,
    path.join(root, "receipt"),
  );
  await writeFile(
    path.join(receipt.directory, "review-result.json"),
    '{"completionAllowed":true}',
  );
  const report = await renderCampaignReport(
    source.directory,
    receipt.directory,
    path.join(root, "report"),
    {
      studySources: [studySource()],
      searchConsoleExports: [searchConsoleExport()],
      analyticsExports: [analyticsExport()],
      bingExports: [bingExport()],
      serverLogExports: [serverLogExport()],
    },
  );
  expect(report.completionAllowed).toBe(false);
  expect(report.reportTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(report.coverage.total).toBe(2);
  const aggregate = JSON.parse(
    await readFile(path.join(report.directory, "coverage.json"), "utf8"),
  );
  expect(aggregate.scope).toBe("campaign");
  const delivery = await readFile(
    path.join(report.directory, "delivery-summary.md"),
    "utf8",
  );
  expect(delivery).toContain(
    `Partial. ${report.coverage.total} declared items; ${report.coverage.audited} fully audited`,
  );
  expect(delivery).toContain("Historical study sources attached: 1");
  expect(delivery).toContain("Search Console exports: attached");
  expect(
    (
      await readFile(path.join(report.directory, "report.md"), "utf8")
    ).replaceAll("\\", ""),
  ).toContain(delivery.trim());
  expect(
    await readFile(path.join(report.directory, "report.html"), "utf8"),
  ).toContain(delivery.trim());

  const brandedHtml = await readFile(
    path.join(report.directory, "report.html"),
    "utf8",
  );
  expect(brandedHtml).toContain('class="wordmark"');
  expect(brandedHtml.indexOf('id="priorities"')).toBeLessThan(
    brandedHtml.indexOf('class="audit-details"'),
  );
  const evidenceLinks = [
    ...brandedHtml.matchAll(/href="#(evidence-[a-f0-9]{64})"/g),
  ];
  expect(evidenceLinks.length).toBeGreaterThan(0);
  for (const [, target] of evidenceLinks)
    expect(brandedHtml).toContain(`id="${target}"`);

  expect(aggregate.itemCoverage).toEqual(report.coverage);
  expect(aggregate.completionAllowed).toBe(report.completionAllowed);
  expect(aggregate.unresolvedRuleIds).toEqual(report.unresolvedRuleIds);
  const ajv = new Ajv({ strict: true });
  ajv.addSchema(
    JSON.parse(
      await readFile(
        "skills/content-search-audit/schemas/common.schema.json",
        "utf8",
      ),
    ),
  );
  const validateCoverage = ajv.compile(
    JSON.parse(
      await readFile(
        "skills/content-search-audit/schemas/campaign-coverage.schema.json",
        "utf8",
      ),
    ),
  );
  expect(validateCoverage(aggregate)).toBe(true);
  expect(validateCoverage({ ...aggregate, scope: "standalone" })).toBe(false);
  expect(
    validateCoverage({
      ...aggregate,
      itemCoverage: { ...aggregate.itemCoverage, total: -1 },
    }),
  ).toBe(false);

  const registry = JSON.parse(
    await readFile("skills/content-search-audit/rules/core.json", "utf8"),
  );
  for (const name of ["report.html", "report.md"]) {
    const content = await readFile(path.join(report.directory, name), "utf8");
    expect(content).toContain("Rule provenance");
    expect(content).toContain("Source age reference");
    expect(content.replaceAll("\\", "")).toContain(report.reportTime);
    expect(content).toContain("full elapsed days");
    expect(content).toContain("UTC calendar days");
    for (const rule of registry.rules) {
      expect(content.replaceAll("\\", "")).toContain(rule.ruleId);
      expect(content.replaceAll("\\", "")).toContain(rule.lastReviewedAt);
    }
  }

  const optionsPath = path.join(root, "measurement-options.json");
  await writeFile(
    optionsPath,
    JSON.stringify({
      analyticsExports: [analyticsExport()],
      bingExports: [bingExport()],
      serverLogExports: [serverLogExport()],
      studySources: [studySource()],
      searchConsoleExports: [searchConsoleExport()],
    }),
  );
  const cli = await promisify(execFile)(process.execPath, [
    "skills/content-search-audit/scripts/audit.mjs",
    "campaign-report",
    source.directory,
    receipt.directory,
    path.join(root, "cli-report"),
    optionsPath,
  ]);
  const cliResult = JSON.parse(cli.stdout);
  expect(cliResult.files["study-evidence.json"]).toMatch(/^[a-f0-9]{64}$/);
  expect(cliResult.files["analytics-evidence.json"]).toMatch(/^[a-f0-9]{64}$/);
  expect(cliResult.files["search-console-evidence.json"]).toMatch(
    /^[a-f0-9]{64}$/,
  );
  expect(cliResult.files["bing-evidence.json"]).toMatch(/^[a-f0-9]{64}$/);
  const bing = JSON.parse(
    await readFile(path.join(report.directory, "bing-evidence.json"), "utf8"),
  );
  expect(bing.exports).toEqual([bingExport()]);
  expect(bing.receipts[0].rows[0].metrics.opportunityCitations.kind).toBe(
    "range",
  );
  expect(cliResult.files["server-log-evidence.json"]).toMatch(/^[a-f0-9]{64}$/);
  const logs = JSON.parse(
    await readFile(
      path.join(report.directory, "server-log-evidence.json"),
      "utf8",
    ),
  );
  expect(logs.exports).toEqual([serverLogExport()]);
  expect(logs.receipts[0].pendingQueue).toHaveLength(1);
  expect(cliResult.completionAllowed).toBe(report.completionAllowed);

  expect(report.globalFindings).toBe(1);
  expect(report.files["analytics-evidence.json"]).toMatch(/^[a-f0-9]{64}$/);
  const analytics = JSON.parse(
    await readFile(
      path.join(report.directory, "analytics-evidence.json"),
      "utf8",
    ),
  );
  expect(analytics.exports).toEqual([analyticsExport()]);
  expect(analytics.receipts[0].rows[0].metrics.activeUsers.value).toBe(
    "9007199254740993",
  );
  expect(report.files["search-console-evidence.json"]).toMatch(
    /^[a-f0-9]{64}$/,
  );
  const measurement = JSON.parse(
    await readFile(
      path.join(report.directory, "search-console-evidence.json"),
      "utf8",
    ),
  );
  expect(measurement.exports).toEqual([searchConsoleExport()]);
  expect(measurement.receipts[0].populationComplete).toBe(false);
  const badExport = searchConsoleExport();
  badExport.pages[0].responseHash = "0".repeat(64);
  await expect(
    renderCampaignReport(
      source.directory,
      receipt.directory,
      path.join(root, "bad-measurement"),
      { searchConsoleExports: [badExport] },
    ),
  ).rejects.toThrow(/hash/i);
  await expect(
    readFile(path.join(root, "bad-measurement", "report.html")),
  ).rejects.toMatchObject({ code: "ENOENT" });
  const html = await readFile(
    path.join(report.directory, "report.html"),
    "utf8",
  );
  expect(html).toContain("Partial");
  expect(html).toContain("Content-Security-Policy");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain("../source/parts/000001/");
  const actions = await readFile(
    path.join(report.directory, "content-actions.csv"),
    "utf8",
  );
  expect(actions).toContain("'=danger");
  expect(actions).toContain("'=HYPERLINK");
  expect(actions).toContain('"owner_role","effort"');
  expect(actions).toContain("'=estimate");
  expect(actions).toContain('"consolidate","reviewer-proposal"');
  expect(actions).toContain("'=reviewer decision");

  expect(html).toContain("&lt;script&gt;owner&lt;/script&gt;");
  expect(
    await readFile(path.join(report.directory, "report.md"), "utf8"),
  ).toContain("estimate");
  for (const [name, expected] of Object.entries(report.files))
    expect(
      createHash("sha256")
        .update(await readFile(path.join(report.directory, name)))
        .digest("hex"),
    ).toBe(expected);
  await expect(
    renderCampaignReport(source.directory, receipt.directory, report.directory),
  ).rejects.toThrow();
  await expect(
    renderCampaignReport(
      source.directory,
      receipt.directory,
      path.join(receipt.directory, "nested"),
    ),
  ).rejects.toThrow(/outside/);
});
it("includes local HTTP findings and emits a unified report through CLI without claiming global review", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "campaign-report-"));
  roots.push(root);
  const target = "https://example.com/missing?token=PRIVATE-FIXTURE";
  const discovery = {
    sources: [
      {
        id: "sitemap",
        kind: "url-list",
        locator: "https://example.com/sitemap.xml",
        collectedAt: "2026-11-20T00:00:00Z",
        complete: false,
        content: target,
        pendingQueue: Array.from({ length: 750 }, (_, i) => ({
          kind: "sitemap-limit",
          locator:
            i === 0
              ? "  https://example.com/padded.xml?token=QUEUE-PRIVATE-FIXTURE"
              : `https://example.com/sitemap-${i}.xml?token=QUEUE-PRIVATE-FIXTURE`,
          reason: "Pending sitemap fetch at the configured discovery limit",
        })),
      },
    ],
    expectedSourceIds: ["sitemap"],
    scopeComplete: false,
  };
  const network = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    [target]: {
      status: 404,
      headers: { "content-type": "text/html" },
      body: "missing",
    },
  });
  const source = await startCampaign(
    {
      inputs: discoverInventory(discovery).inputs,
      discovery,
      localRoots: [],
      inventoryComplete: false,
      network: { allowedOrigins: ["https://example.com"], retries: 0 },
    },
    path.join(root, "source"),
    { network: network.adapters },
  );
  const index = await indexCampaign(source.directory, path.join(root, "index"));
  const receipt = await reviewCampaign(
    source.directory,
    {
      schemaVersion: 1,
      campaignId: index.campaignId,
      sourceManifestHash: index.sourceManifestHash,
      partSnapshotHashes: index.partSnapshotHashes,
      reviews: [],
      contextEvidence: [],
      findings: [],
    },
    path.join(root, "receipt"),
  );
  const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const { stdout } = await promisify(execFile)(process.execPath, [
    cli,
    "campaign-report",
    source.directory,
    receipt.directory,
    path.join(root, "report"),
  ]);
  const report = JSON.parse(stdout);
  expect(report.localFindings).toBe(1);
  const json = await readFile(
    path.join(report.directory, "report.json"),
    "utf8",
  );
  const canonical = JSON.parse(json);
  expect(canonical).toMatchObject({
    campaignId: report.campaignId,
    reportTime: report.reportTime,
    status: "Partial",
  });
  expect(report.files["report.json"]).toBe(
    createHash("sha256").update(json).digest("hex"),
  );
  expect(report.coverage.pendingQueue.length).toBeGreaterThanOrEqual(750);
  expect(
    (await readFile(path.join(report.directory, "report-manifest.json")))
      .length,
  ).toBeGreaterThan(128 * 1024);
  expect(json).not.toContain("PRIVATE-FIXTURE");
  for (const name of ["coverage.json", "report-manifest.json"]) {
    expect(
      await readFile(path.join(report.directory, name), "utf8"),
    ).not.toContain("QUEUE-PRIVATE-FIXTURE");
  }
  expect(
    await readFile(path.join(source.directory, "config.json"), "utf8"),
  ).toContain("QUEUE-PRIVATE-FIXTURE");
  const integrity = await promisify(execFile)(process.execPath, [
    cli,
    "public-report-validate",
    report.directory,
  ]);
  expect(JSON.parse(integrity.stdout)).toEqual({
    valid: true,
    campaignId: report.campaignId,
  });
  const backlog = canonical.blocks.find((block: { headers?: string[] }) =>
    block.headers?.includes("Affected URLs"),
  );
  expect(backlog.rows[0]).toContain(
    "https://example.com/missing (query omitted)",
  );
  for (const name of ["report.md", "report.html"]) {
    const document = await readFile(path.join(report.directory, name), "utf8");
    expect(document).not.toContain("PRIVATE-FIXTURE");
    expect(document.replaceAll("\\", "")).toContain(
      "https://example.com/missing",
    );
  }
  expect(
    await readFile(path.join(report.directory, "content-actions.csv"), "utf8"),
  ).toContain('"update","default-triage"');

  expect(report.globalReviewComplete).toBe(false);
  const local = await loadAuditData(
    path.join(source.directory, "parts/000001"),
  );
  for (const name of ["report.html", "report.md", "content-actions.csv"]) {
    const rendered = await readFile(path.join(report.directory, name), "utf8");
    expect(rendered).toContain(local.findings[0].ownerRole);
    expect(rendered).toContain(local.findings[0].effort);
  }
  expect(
    await readFile(path.join(report.directory, "content-actions.csv"), "utf8"),
  ).toContain("parts/000001");
  const saved = JSON.parse(
    await readFile(path.join(receipt.directory, "review.json"), "utf8"),
  );
  saved.sourceManifestHash = "0".repeat(64);
  await writeFile(
    path.join(receipt.directory, "review.json"),
    JSON.stringify(saved),
  );
  await expect(
    renderCampaignReport(
      source.directory,
      receipt.directory,
      path.join(root, "invalid"),
    ),
  ).rejects.toThrow(/binding/);
  await expect(access(path.join(root, "invalid"))).rejects.toThrow();
});

it("refuses future global review or context timestamps before writing a receipt", async () => {
  const { root, source, bundle } = await setup();
  for (const kind of ["review", "context"]) {
    const changed = structuredClone(bundle);
    if (kind === "review")
      changed.reviews[0].reviewedAt = "2099-01-01T00:00:00Z";
    else changed.contextEvidence[0].collectedAt = "2099-01-01T00:00:00Z";
    const output = path.join(root, kind);
    await expect(
      reviewCampaign(source.directory, changed, output),
    ).rejects.toThrow(/Future/);
    await expect(access(output)).rejects.toThrow();
  }
});

it("retains legacy global findings with explicit missing assignments and rejects malformed supplied assignments", async () => {
  const { root, source, bundle } = await setup();
  bundle.reviews[0].status = "fail";
  const finding = {
    findingId: "legacy-owner",
    ruleId: bundle.reviews[0].ruleId,
    severity: "high",
    confidence: "medium",
    observation: "Conflicting fixture claims",
    recommendation: "Ask the content owner to reconcile the claims",
    verification: "Compare revised source snapshots",
    affectedItemIds: bundle.reviews[0].itemIds,
    evidenceReferences: bundle.reviews[0].evidenceReferences,
  };
  bundle.findings.push(finding);
  for (const field of ["ownerRole", "effort"]) {
    for (const invalid of [null, "", "   ", 4, []]) {
      const bad = structuredClone(bundle);
      bad.findings[0][field] = invalid;
      await expect(
        evaluateCampaignReview(source.directory, bad),
      ).rejects.toThrow(/finding/i);
    }
  }
  for (const extra of [
    { action: "delete", actionReason: "unsupported" },
    { actionCondition: " " },
    { actionCondition: false },
    { action: "keep" },
    { actionReason: "orphan" },
    { action: "update", actionReason: "" },
  ]) {
    const bad = structuredClone(bundle);
    Object.assign(bad.findings[0], extra);
    await expect(evaluateCampaignReview(source.directory, bad)).rejects.toThrow(
      /action/i,
    );
  }
  const review = await reviewCampaign(
    source.directory,
    bundle,
    path.join(root, "legacy-review"),
  );
  const output = await renderCampaignReport(
    source.directory,
    review.directory,
    path.join(root, "legacy-report"),
  );
  for (const file of ["report.html", "report.md", "content-actions.csv"])
    expect(await readFile(path.join(output.directory, file), "utf8")).toContain(
      "Not supplied",
    );
});

it("exports a redacted campaign with local evidence links and preserved global coverage", async () => {
  const { root, source, bundle } = await setup();
  const receipt = await reviewCampaign(
    source.directory,
    bundle,
    path.join(root, "receipt"),
  );
  const original = await readFile(path.join(receipt.directory, "review.json"));
  const output = await renderRedactedCampaignReport(
    source.directory,
    receipt.directory,
    path.join(root, "shared"),
    { values: ["Synthetic fixture.", root, "example.com"] },
    {
      studySources: [studySource()],
      searchConsoleExports: [searchConsoleExport()],
      analyticsExports: [analyticsExport()],
      bingExports: [bingExport()],
      serverLogExports: [serverLogExport()],
    },
  );
  const html = await readFile(
    path.join(output.directory, "report.html"),
    "utf8",
  );
  expect(html).toContain("Redacted presentation");
  expect(html).not.toContain(root);
  expect(html).not.toContain('href="../');
  expect(output.coverage.total).toBe(2);
  expect(output.completionAllowed).toBe(false);
  const sharedMeasurement = JSON.parse(
    await readFile(
      path.join(output.directory, "search-console-evidence.json"),
      "utf8",
    ),
  );
  expect(sharedMeasurement.kind).toBe("redacted-measurement-presentation");
  expect(JSON.stringify(sharedMeasurement.data)).not.toContain("example.com");
  expect(output.redaction.derivatives.length).toBeGreaterThan(1);
  for (const record of output.redaction.derivatives) {
    const bytes = await readFile(path.join(output.directory, record.artifact));
    expect(bytes.toString()).not.toContain("Synthetic fixture.");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.snapshotHash,
    );
    expect(html).toContain(`href="${record.artifact}"`);
  }
  expect(await readFile(path.join(receipt.directory, "review.json"))).toEqual(
    original,
  );
});

it("preserves a global action condition on both action and verification", async () => {
  const { root, source, bundle } = await setup();
  bundle.reviews[0].status = "fail";
  bundle.findings.push({
    findingId: "conditional",
    ruleId: bundle.reviews[0].ruleId,
    severity: "medium",
    confidence: "high",
    observation: "Captured comment",
    recommendation: "Remove the comment",
    verification: "Confirm the comment is absent",
    actionCondition: "the owner confirms the comment is unintended",
    affectedItemIds: bundle.reviews[0].itemIds,
    evidenceReferences: bundle.reviews[0].evidenceReferences,
  });
  const receipt = await reviewCampaign(
    source.directory,
    bundle,
    path.join(root, "conditional-review"),
  );
  const report = await renderCampaignReport(
    source.directory,
    receipt.directory,
    path.join(root, "conditional-report"),
  );
  for (const file of ["report.md", "report.html", "content-actions.csv"]) {
    const text = (
      await readFile(path.join(report.directory, file), "utf8")
    ).replaceAll("\\", "");
    expect(text).toContain(
      "Only if the owner confirms the comment is unintended: Remove the comment",
    );
    expect(text).toContain(
      "Only if the owner confirms the comment is unintended: Confirm the comment is absent",
    );
  }
});
