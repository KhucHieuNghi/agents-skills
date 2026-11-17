import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { reviewAudit } from "../skills/content-search-audit/scripts/lib/review.mjs";
import { resumeAudit } from "../skills/content-search-audit/scripts/lib/resume.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
import {
  recoverCollections,
  validateCollectionRecoveryReceipts,
} from "../skills/content-search-audit/scripts/lib/extraction-recovery.mjs";
import { startCampaign } from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { reviewCampaignParts } from "../skills/content-search-audit/scripts/lib/campaign-part-review.mjs";
const roots: string[] = [];
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "extract-recover-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const file = path.join(content, "guide.pdf"),
    source =
      "%PDF-1.7\nSynthetic bytes for source hash tests, not a parser fixture.";
  await writeFile(file, source);
  const config = {
    inputs: [{ path: file, source: "fixture", type: "pdf" }],
    localRoots: [content],
    inventoryComplete: true,
  };
  const run = await startAudit(config, path.join(root, "initial"));
  const audit = await loadAuditData(run.directory);
  const item = audit.inventory[0];
  const pages = [
    { page: 1, text: "At most 5000 records." },
    { page: 2, text: "Tối đa 5000 bản ghi." },
  ];
  const text = pages.map((p) => p.text).join("\f");
  const manifest = {
    schemaVersion: 1,
    sourceSha256: hash(source),
    sourceByteLength: Buffer.byteLength(source),
    extractor: { name: "fixture", version: "1" },
    pageCount: 2,
    pages,
    coverage: "complete",
    limitations: ["Synthetic extraction supplied by test."],
  };
  const artifacts: Record<string, string> = {};
  function evidence(
    id: string,
    kind: string,
    value: unknown,
    dependencies: string[],
  ) {
    const encoding = typeof value === "string" ? "utf8" : "json";
    const bytes = typeof value === "string" ? value : JSON.stringify(value);
    const artifact = `evidence/${id}.txt`;
    artifacts[artifact] = bytes;
    return {
      evidenceId: id,
      itemId: item.itemId,
      kind,
      method: "fixture-extraction",
      locator: file,
      collectedAt: new Date().toISOString(),
      redaction: "synthetic",
      limitations: ["No parser fidelity claimed."],
      sourceEvidenceIds: dependencies,
      artifact,
      encoding,
      value,
      snapshotHash: hash(bytes),
    };
  }
  const records = [
    evidence("manifest", "extraction-provenance", manifest, []),
    evidence("content", "content", text, ["manifest"]),
    evidence("text", "extracted-text", text, ["content"]),
  ];
  const recovery = {
    itemId: item.itemId,
    manifestEvidenceId: "manifest",
    contentEvidenceId: "content",
    textEvidenceId: "text",
    reviewer: "fixture-reviewer",
    reviewedAt: new Date().toISOString(),
    reason: "All declared pages have reviewed text-layer extraction.",
  };
  const bundle = {
    reviews: [],
    evidence: records,
    artifacts,
    collectionRecoveries: [recovery],
  };
  return {
    root,
    content,
    file,
    source,
    config,
    run,
    audit,
    item,
    manifest,
    bundle,
  };
}
it("recovers unsupported local PDF to pending without completing semantic checks, and invalidates on resume", async () => {
  const s = await setup();
  const before = await readFile(path.join(s.run.directory, "run.json"));
  const result = await reviewAudit(
    s.run.directory,
    s.bundle,
    path.join(s.root, "recovered"),
  );
  const audit = await loadAuditData(result.directory);
  expect(audit.inventory[0].state).toBe("pending");
  expect(
    audit.checks.find((c) => c.ruleId === "quality-readable-text")?.status,
  ).toBe("pass");
  expect(
    audit.checks.find((c) => c.ruleId === "quality-task-fit")?.status,
  ).toBe("unknown");
  expect((await validateAudit(result.directory)).completionAllowed).toBe(false);
  expect(audit.run.collectionRecoveries[0].sourceSha256).toBe(hash(s.source));
  expect(await readFile(path.join(s.run.directory, "run.json"))).toEqual(
    before,
  );
  await writeFile(s.file, s.source + " changed");
  const resumed = await resumeAudit(
    result.directory,
    s.config,
    path.join(s.root, "resumed"),
  );
  const next = await loadAuditData(resumed.directory);
  expect(next.inventory[0].state).toBe("unsupported");
  expect(next.evidence).toEqual([]);
  expect(
    next.checks.find((c) => c.ruleId === "quality-readable-text")?.status,
  ).toBe("unknown");
  expect(resumed.reconciliation.invalidatedItemIds).toContain(s.item.itemId);
});
it.each([
  "source-hash",
  "empty-page",
  "partial",
  "missing-reviewer",
  "future",
  "wrong-item",
  "duplicate",
  "different-text",
])("rejects invalid recovery %s before output", async (kind) => {
  const s = await setup();
  const b = structuredClone(s.bundle);
  if (kind === "source-hash") await writeFile(s.file, s.source + " changed");
  if (kind === "empty-page" || kind === "partial") {
    const m = b.evidence[0].value as typeof s.manifest;
    if (kind === "empty-page") m.pages[1].text = "";
    else m.coverage = "partial";
    b.artifacts[b.evidence[0].artifact] = JSON.stringify(m);
    b.evidence[0].snapshotHash = hash(JSON.stringify(m));
  }
  if (kind === "missing-reviewer") b.collectionRecoveries[0].reviewer = "";
  if (kind === "future")
    b.collectionRecoveries[0].reviewedAt = "2099-01-01T00:00:00Z";
  if (kind === "wrong-item") b.collectionRecoveries[0].itemId = "unknown";
  if (kind === "duplicate")
    b.collectionRecoveries.push(b.collectionRecoveries[0]);
  if (kind === "different-text") {
    b.evidence[2].value = "Different extraction";
    b.artifacts[b.evidence[2].artifact] = "Different extraction";
    b.evidence[2].snapshotHash = hash("Different extraction");
  }
  const output = path.join(s.root, "rejected");
  await expect(reviewAudit(s.run.directory, b, output)).rejects.toThrow();
  await expect(access(output)).rejects.toThrow();
});
it("rejects out-of-root source replacement and source byte-budget overflow", async () => {
  const s = await setup();
  const external = path.join(s.root, "outside.pdf");
  await writeFile(external, s.source);
  await rm(s.file);
  await symlink(external, s.file);
  await expect(
    reviewAudit(s.run.directory, s.bundle, path.join(s.root, "escape")),
  ).rejects.toThrow(/root|symlink/i);
  await rm(s.file);
  await writeFile(s.file, s.source);
  const small = await startAudit(
    { ...s.config, maxBytes: 8 },
    path.join(s.root, "small"),
  );
  await expect(
    reviewAudit(small.directory, s.bundle, path.join(s.root, "budget")),
  ).rejects.toThrow(/limit|budget/i);
});

it.each(["blocked", "failed", "excluded"])(
  "cannot clear %s collection through extraction",
  async (state) => {
    const s = await setup();
    const audit = structuredClone(s.audit);
    audit.inventory[0].state = state;
    audit.evidence.push(...s.bundle.evidence);
    Object.assign(audit.artifacts, s.bundle.artifacts);
    await expect(
      recoverCollections(audit, s.config, s.bundle.collectionRecoveries),
    ).rejects.toThrow(/Only unsupported/);
    expect(audit.inventory[0].state).toBe(state);
  },
);
it("rejects cross-item evidence and tampered accepted receipts", async () => {
  const s = await setup();
  const bad = structuredClone(s.bundle);
  bad.evidence[0].itemId = "other-item";
  await expect(
    reviewAudit(s.run.directory, bad, path.join(s.root, "cross-item")),
  ).rejects.toThrow();
  const result = await reviewAudit(
    s.run.directory,
    s.bundle,
    path.join(s.root, "good"),
  );
  const audit = await loadAuditData(result.directory);
  audit.run.collectionRecoveries[0].sourceSha256 = "0".repeat(64);
  expect(() => validateCollectionRecoveryReceipts(audit)).toThrow(/Stale/);
});
it("recovers only owned campaign items and retains pending coverage", async () => {
  const s = await setup();
  const campaign = await startCampaign(
    { ...s.config, partitionSize: 1 },
    path.join(s.root, "campaign"),
  );
  const bytes = await readFile(path.join(campaign.directory, "campaign.json"));
  const manifest = JSON.parse(bytes.toString());
  const part = manifest.parts[0];
  const audit = await loadAuditData(path.join(campaign.directory, part.path));
  const bundle = {
    schemaVersion: 1,
    campaignId: manifest.campaignId,
    sourceManifestHash: hash(bytes),
    parts: [
      {
        path: part.path,
        sourceSnapshotHash: hash(JSON.stringify(audit)),
        bundle: s.bundle,
      },
    ],
  };
  const bad = structuredClone(bundle);
  bad.parts[0].bundle.collectionRecoveries[0].itemId = "non-owned";
  await expect(
    reviewCampaignParts(
      campaign.directory,
      bad,
      path.join(s.root, "wrong-part"),
    ),
  ).rejects.toThrow(/non-owned/);
  await expect(access(path.join(s.root, "wrong-part"))).rejects.toThrow();
  const result = await reviewCampaignParts(
    campaign.directory,
    bundle,
    path.join(s.root, "recovered-campaign"),
  );
  const recovered = await loadAuditData(path.join(result.directory, part.path));
  expect(recovered.inventory[0].state).toBe("pending");
  expect(result.coverage.audited).toBe(0);
  expect(result.status).toBe("partial");
  expect(
    await readFile(path.join(campaign.directory, "campaign.json")),
  ).toEqual(bytes);
});
