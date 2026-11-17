import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { reviewAudit } from "../skills/content-search-audit/scripts/lib/review.mjs";
import { writeRevision } from "../skills/content-search-audit/scripts/lib/revision.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
import { networkFixture } from "./helpers/content-audit-network.js";
import {
  startCampaign,
  validateCampaign,
} from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { indexCampaign } from "../skills/content-search-audit/scripts/lib/campaign-index.mjs";
import { reviewCampaignParts } from "../skills/content-search-audit/scripts/lib/campaign-part-review.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "evidence-refresh-"));
  roots.push(root);
  const network = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/a": { body: "A plain text export" },
    "https://example.com/b": { body: "B source context" },
  });
  const run = await startAudit(
    {
      inputs: ["a", "b"].map((name) => ({
        uri: `https://example.com/${name}`,
        source: "fixture",
      })),
      localRoots: [],
      inventoryComplete: true,
      network: { allowedOrigins: ["https://example.com"], retries: 0 },
    },
    path.join(root, "source"),
    { network: network.adapters },
  );
  const audit = await loadAuditData(run.directory);
  const content = audit.evidence.find(
    (e) => e.kind === "content" && e.locator.endsWith("/a"),
  );
  const other = audit.evidence.find(
    (e) => e.kind === "content" && e.locator.endsWith("/b"),
  );
  return { root, run, audit, content, other };
}
function extraction(
  content: { evidenceId: string; itemId: string; [key: string]: unknown },
  value: string,
  id = "derived-text",
  extraSources: string[] = [],
) {
  const record = {
    ...content,
    evidenceId: id,
    kind: "extracted-text",
    method: "fixture-identity-extraction",
    value,
    artifact: `evidence/${id}.txt`,
    snapshotHash: createHash("sha256").update(value).digest("hex"),
    collectedAt: new Date().toISOString(),
    sourceEvidenceIds: [content.evidenceId, ...extraSources],
  };
  return {
    reviews: [],
    evidence: [record],
    artifacts: { [record.artifact]: value },
  };
}
it("repairs an unattributed stale unknown from an older accepted evidence-only revision", async () => {
  const { root, run, audit, content } = await setup();
  const bundle = extraction(content, "Previously attached text", "legacy-text");
  // Reproduce the structurally valid pre-0.1.5 state without changing the source.
  audit.evidence.push(...bundle.evidence);
  Object.assign(audit.artifacts, bundle.artifacts);
  const config = JSON.parse(
    await readFile(path.join(run.directory, "config.json"), "utf8"),
  );
  const registry = JSON.parse(
    await readFile("skills/content-search-audit/rules/core.json", "utf8"),
  );
  const legacy = await writeRevision(
    audit,
    config,
    registry,
    path.join(root, "legacy"),
  );
  expect((await validateAudit(legacy.directory)).valid).toBe(true);
  const before = await readFile(path.join(legacy.directory, "checks.jsonl"));
  const next = await reviewAudit(
    legacy.directory,
    { reviews: [] },
    path.join(root, "repaired"),
  );
  const check = (await loadAuditData(next.directory)).checks.find(
    (c) => c.itemId === content.itemId && c.ruleId === "quality-readable-text",
  );
  expect(check.status).toBe("pass");
  expect(check.evidenceIds).toEqual(["legacy-text"]);
  expect(await readFile(path.join(legacy.directory, "checks.jsonl"))).toEqual(
    before,
  );
});
it("refreshes a newly evidenced deterministic check without host verdicts, preserving source and unrelated checks", async () => {
  const { root, run, audit, content, other } = await setup();
  const before = await readFile(path.join(run.directory, "checks.jsonl"));
  const next = await reviewAudit(
    run.directory,
    extraction(content, "A plain text export", "derived-text", [
      other.evidenceId,
    ]),
    path.join(root, "next"),
  );
  const data = await loadAuditData(next.directory);
  const check = data.checks.find(
    (c) => c.itemId === content.itemId && c.ruleId === "quality-readable-text",
  );
  expect(check.status).toBe("pass");
  expect(check.evidenceIds).toEqual(["derived-text"]);
  expect(check.dependencies.sort()).toEqual(
    [content.itemId, other.itemId].sort(),
  );
  expect(check.reviewer).toBeUndefined();
  expect(data.checks.filter((c) => c !== check)).toEqual(
    audit.checks.filter(
      (c) =>
        !(c.itemId === content.itemId && c.ruleId === "quality-readable-text"),
    ),
  );
  expect(await readFile(path.join(run.directory, "checks.jsonl"))).toEqual(
    before,
  );
  expect((await validateAudit(next.directory)).valid).toBe(true);
  expect(next.status).toBe("partial");
});
it("reopens an audited item when multiple extracted snapshots need reconciliation", async () => {
  const { root, run, content, audit } = await setup();
  const first = await reviewAudit(
    run.directory,
    {
      ...extraction(content, "First", "first"),
      reviews: audit.checks
        .filter(
          (c) =>
            c.itemId === content.itemId && c.ruleId !== "quality-readable-text",
        )
        .map((c) => ({
          itemId: content.itemId,
          ruleId: c.ruleId,
          status: "not-applicable",
          evidenceIds: [content.evidenceId],
          reason:
            "Synthetic state-transition fixture only; not a real applicability verdict",
          reviewer: "fixture",
          reviewedAt: new Date().toISOString(),
        })),
    },
    path.join(root, "first"),
  );
  expect(
    (await loadAuditData(first.directory)).inventory.find(
      (i) => i.itemId === content.itemId,
    ).state,
  ).toBe("audited");
  const second = await reviewAudit(
    first.directory,
    extraction(content, "Second", "second"),
    path.join(root, "second"),
  );
  const check = (await loadAuditData(second.directory)).checks.find(
    (c) => c.itemId === content.itemId && c.ruleId === "quality-readable-text",
  );
  expect(check.status).toBe("unknown");
  expect(check.reason).toMatch(/Multiple snapshots/);
  expect(check.evidenceIds).toEqual(["first", "second"]);
  expect(
    (await loadAuditData(second.directory)).inventory.find(
      (i) => i.itemId === content.itemId,
    ).state,
  ).toBe("pending");
});
it("requires a supported finding for new deterministic failure and explicit reconciliation when that finding becomes stale", async () => {
  const { root, run, content } = await setup();
  const bundle = extraction(content, "", "empty");
  await expect(
    reviewAudit(run.directory, bundle, path.join(root, "missing-finding")),
  ).rejects.toThrow(/lacks finding/);
  await expect(access(path.join(root, "missing-finding"))).rejects.toThrow();
  const finding = {
    findingId: "empty-extraction",
    title: "Supplied extraction is empty",
    affectedItemIds: [content.itemId],
    ruleIds: ["quality-readable-text"],
    dimensions: ["quality"],
    evidenceIds: ["empty"],
    classification: "observed",
    severity: "low",
    confidence: "high",
    remediation: "Verify extraction fidelity",
    verification: "Compare extraction against source",
    ownerRole: "Reviewer",
    effort: "Small",
  };
  const failed = await reviewAudit(
    run.directory,
    { ...bundle, findings: [finding] },
    path.join(root, "failed"),
  );
  const addition = extraction(content, "New text", "later");
  await expect(
    reviewAudit(failed.directory, addition, path.join(root, "stale")),
  ).rejects.toThrow(/reconcil.*finding/i);
  await expect(access(path.join(root, "stale"))).rejects.toThrow();
  const reconciled = await reviewAudit(
    failed.directory,
    { ...addition, findings: [] },
    path.join(root, "reconciled"),
  );
  const data = await loadAuditData(reconciled.directory);
  expect(data.findings).toEqual([]);
  expect(
    data.checks.find(
      (c) =>
        c.itemId === content.itemId && c.ruleId === "quality-readable-text",
    ).status,
  ).toBe("unknown");
  expect((await loadAuditData(failed.directory)).findings).toEqual([finding]);
});
it("rejects fabricated host deterministic verdicts and malformed added evidence before output", async () => {
  const { root, run, content } = await setup();
  const bundle = extraction(content, "Text");
  const review = {
    itemId: content.itemId,
    ruleId: "quality-readable-text",
    status: "pass",
    evidenceIds: ["derived-text"],
    reason: "Host assertion",
    reviewer: "fixture",
    reviewedAt: new Date().toISOString(),
  };
  await expect(
    reviewAudit(
      run.directory,
      { ...bundle, reviews: [review] },
      path.join(root, "override"),
    ),
  ).rejects.toThrow(/cannot override/);
  bundle.evidence[0].snapshotHash = "0".repeat(64);
  await expect(
    reviewAudit(run.directory, bundle, path.join(root, "bad-hash")),
  ).rejects.toThrow(/hash/i);
  await expect(access(path.join(root, "bad-hash"))).rejects.toThrow();
});
it("refreshes owned campaign evidence while retaining other parts and rejecting foreign evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "campaign-evidence-refresh-"));
  roots.push(root);
  const network = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/a": { body: "A plain text export" },
    "https://example.com/b": { body: "B source context" },
  });
  const source = await startCampaign(
    {
      inputs: ["a", "b"].map((name) => ({
        uri: `https://example.com/${name}`,
        source: "fixture",
      })),
      localRoots: [],
      inventoryComplete: true,
      partitionSize: 1,
      network: { allowedOrigins: ["https://example.com"], retries: 0 },
    },
    path.join(root, "source"),
    { network: network.adapters },
  );
  const index = await indexCampaign(source.directory, path.join(root, "index"));
  const first = await loadAuditData(
    path.join(source.directory, "parts/000001"),
  );
  const second = await loadAuditData(
    path.join(source.directory, "parts/000002"),
  );
  const content = first.evidence.find((e) => e.kind === "content");
  const bundle = {
    schemaVersion: 1,
    campaignId: index.campaignId,
    sourceManifestHash: index.sourceManifestHash,
    parts: [
      {
        path: "parts/000001",
        sourceSnapshotHash: index.partSnapshotHashes["parts/000001"],
        bundle: extraction(content, String(content.value)),
      },
    ],
  };
  const revised = await reviewCampaignParts(
    source.directory,
    bundle,
    path.join(root, "revised"),
  );
  const data = await loadAuditData(
    path.join(revised.directory, "parts/000001"),
  );
  expect(
    data.checks.find((c) => c.ruleId === "quality-readable-text").status,
  ).toBe("pass");
  expect(
    await loadAuditData(path.join(revised.directory, "parts/000002")),
  ).toEqual(second);
  expect(
    await loadAuditData(path.join(source.directory, "parts/000001")),
  ).toEqual(first);
  expect((await validateCampaign(revised.directory)).valid).toBe(true);
  const foreign = second.evidence.find((e) => e.kind === "content");
  bundle.parts[0].bundle = extraction(foreign, String(foreign.value));
  await expect(
    reviewCampaignParts(source.directory, bundle, path.join(root, "foreign")),
  ).rejects.toThrow(/non-owned/);
  await expect(access(path.join(root, "foreign"))).rejects.toThrow();
});
