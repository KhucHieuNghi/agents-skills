import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { indexCampaign } from "../skills/content-search-audit/scripts/lib/campaign-index.mjs";
import { promisify } from "node:util";
import { networkFixture } from "./helpers/content-audit-network.js";
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
import {
  startCampaign,
  resumeCampaign,
  validateCampaign,
} from "../skills/content-search-audit/scripts/lib/campaign.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup(sizes = [250000, 250000, 250000]) {
  const root = await mkdtemp(path.join(tmpdir(), "audit-campaign-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const inputs = await Promise.all(
    sizes.map(async (size, index) => {
      const file = path.join(content, `${index}.md`);
      await writeFile(file, "x".repeat(size));
      return { path: file, source: "fixture" };
    }),
  );
  return {
    root,
    config: {
      inputs,
      localRoots: [content],
      inventoryComplete: true,
      maxRunBytes: 1024 * 1024,
    },
  };
}
it("continues storage partitions and counts every original item once", async () => {
  const { root, config } = await setup();
  const source = await readFile(config.inputs[0].path);
  const result = await startCampaign(
    {
      ...config,
      inputs: [
        ...config.inputs,
        { ...config.inputs[0], source: "second-source" },
      ],
    },
    path.join(root, "campaign"),
  );
  expect(result.coverage.total).toBe(3);
  expect(result.coverage.owned).toBe(3);
  expect(result.coverage.collectionAccounted).toBe(true);
  expect(result.coverage.complete).toBe(false);
  const manifest = JSON.parse(
    await readFile(path.join(result.directory, "campaign.json"), "utf8"),
  );
  expect(
    manifest.parts.filter((part) => part.ownedItemIds.length),
  ).toHaveLength(3);
  expect(
    new Set(manifest.parts.flatMap((part) => part.ownedItemIds)).size,
  ).toBe(3);
  expect((await validateCampaign(result.directory)).valid).toBe(true);
  expect(await readFile(config.inputs[0].path)).toEqual(source);
});
it("rejects duplicate ownership rather than double-counting a partial shard", async () => {
  const { root, config } = await setup();
  const result = await startCampaign(config, path.join(root, "campaign"));
  const file = path.join(result.directory, "campaign.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.parts[1].ownedItemIds.push(manifest.parts[0].ownedItemIds[0]);
  await writeFile(file, JSON.stringify(manifest));
  const validation = await validateCampaign(result.directory);
  expect(validation.valid).toBe(false);
  expect(validation.errors.join(" ")).toMatch(/ownership|owned/i);
});
it("leaves a single oversized item explicit while continuing other items without looping", async () => {
  const { root, config } = await setup([1024 * 1024, 100]);
  const result = await startCampaign(config, path.join(root, "campaign"));
  expect(result.coverage.total).toBe(2);
  expect(result.coverage.owned).toBe(1);
  expect(result.coverage.collectionAccounted).toBe(false);
  expect(
    result.coverage.pendingQueue.some(
      (entry) => entry.kind === "unpartitionable-item",
    ),
  ).toBe(true);
  expect((await validateCampaign(result.directory)).valid).toBe(true);
  const manifestFile = path.join(result.directory, "campaign.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.pendingQueue = [];
  await writeFile(manifestFile, JSON.stringify(manifest));
  const invalid = await validateCampaign(result.directory);
  expect(invalid.valid).toBe(false);
  expect(invalid.errors.join(" ")).toMatch(/omitted unowned/i);
});

it("shares robots and host policy across public partitions", async () => {
  const { root } = await setup([10]);
  const f = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/a": { body: "A" },
    "https://example.com/b": { body: "B" },
  });
  const config = {
    inputs: [
      { uri: "https://example.com/a", source: "declared" },
      { uri: "https://example.com/b", source: "declared" },
    ],
    localRoots: [],
    inventoryComplete: false,
    partitionSize: 1,
    network: { allowedOrigins: ["https://example.com"] },
  };
  const result = await startCampaign(config, path.join(root, "public"), {
    network: f.adapters,
  });
  expect(result.coverage.owned).toBe(2);
  expect(result.parts).toHaveLength(2);
  expect(f.calls.filter((url) => url.endsWith("robots.txt"))).toHaveLength(1);
});
it("runs campaign creation and validation through the standalone CLI", async () => {
  const { root, config } = await setup([100, 100]);
  const file = path.join(root, "config.json");
  await writeFile(file, JSON.stringify({ ...config, partitionSize: 1 }));
  const execute = promisify(execFile),
    cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const started = JSON.parse(
    (
      await execute(process.execPath, [
        cli,
        "campaign",
        file,
        path.join(root, "cli"),
      ])
    ).stdout,
  );
  const validation = JSON.parse(
    (
      await execute(process.execPath, [
        cli,
        "campaign-validate",
        started.directory,
      ])
    ).stdout,
  );
  expect(validation.valid).toBe(true);
  expect(validation.coverage.owned).toBe(2);
  expect(
    await readFile(path.join(started.directory, "campaign-report.md"), "utf8"),
  ).toContain("Global portfolio review remains required");
});

it("continues an interrupted campaign immutably and retains registered snapshots", async () => {
  const { root, config } = await setup([100, 100, 100]);
  const original = await startCampaign(
    { ...config, partitionSize: 1 },
    path.join(root, "original"),
  );
  const manifestFile = path.join(original.directory, "campaign.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const retained = manifest.parts[0];
  const orphanPath = path.join(
    original.directory,
    manifest.parts[1].path,
    "run.json",
  );
  await writeFile(orphanPath, "not a valid registered checkpoint");
  manifest.status = "collecting";
  manifest.parts = [retained];
  manifest.remainingItemIds = manifest.itemIds.filter(
    (id) => !retained.ownedItemIds.includes(id),
  );
  await writeFile(manifestFile, JSON.stringify(manifest));
  const before = await readFile(manifestFile);
  const inventory = JSON.parse(
    (
      await readFile(
        path.join(original.directory, retained.path, "inventory.jsonl"),
        "utf8",
      )
    ).trim(),
  );
  await writeFile(inventory.path, "Changed after old capture");
  const resumed = await resumeCampaign(
    original.directory,
    path.join(root, "resumed"),
  );
  const current = JSON.parse(
    await readFile(path.join(resumed.directory, "campaign.json"), "utf8"),
  );
  expect(current.parentCampaignId).toBe(manifest.campaignId);
  expect(current.parts[0].runId).toBe(retained.runId);
  expect(current.recovery.skippedUnregisteredParts).toHaveLength(2);
  expect(await readFile(manifestFile)).toEqual(before);
  expect(await readFile(orphanPath, "utf8")).toBe(
    "not a valid registered checkpoint",
  );
  const oldEvidence = await readFile(
    path.join(original.directory, retained.path, "evidence.jsonl"),
  );
  expect(
    await readFile(
      path.join(resumed.directory, current.parts[0].path, "evidence.jsonl"),
    ),
  ).toEqual(oldEvidence);
  expect(resumed.coverage.owned).toBe(3);
  expect(resumed.coverage.complete).toBe(false);
  expect((await validateCampaign(resumed.directory)).valid).toBe(true);
});
it("refuses invalid source checkpoints and output nested inside the prior campaign", async () => {
  const { root, config } = await setup([100]);
  const original = await startCampaign(config, path.join(root, "original"));
  await expect(
    resumeCampaign(original.directory, path.join(original.directory, "nested")),
  ).rejects.toThrow(/source campaign/i);
  const file = path.join(original.directory, "campaign.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.parts[0].ownedItemIds = [];
  await writeFile(file, JSON.stringify(manifest));
  const target = path.join(root, "invalid");
  await expect(resumeCampaign(original.directory, target)).rejects.toThrow(
    /source campaign/i,
  );
  await expect(access(target)).rejects.toThrow();
});
it("exposes immutable campaign continuation through the CLI", async () => {
  const { root, config } = await setup([100]);
  const original = await startCampaign(config, path.join(root, "original"));
  const execute = promisify(execFile),
    cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const result = JSON.parse(
    (
      await execute(process.execPath, [
        cli,
        "campaign-resume",
        original.directory,
        path.join(root, "continued"),
      ])
    ).stdout,
  );
  expect(result.coverage.owned).toBe(1);
  expect(result.status).toBe("partial");
});
it("carries server cooldowns from retained public parts into pending collection", async () => {
  const { root } = await setup([10]);
  const config = {
    inputs: [
      { uri: "https://example.com/a", source: "declared" },
      { uri: "https://example.com/b", source: "declared" },
    ],
    localRoots: [],
    inventoryComplete: false,
    partitionSize: 1,
    network: { allowedOrigins: ["https://example.com"], retries: 0 },
  };
  const first = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/a": {
      status: 429,
      headers: { "retry-after": "3600" },
    },
    "https://example.com/b": {
      status: 429,
      headers: { "retry-after": "3600" },
    },
  });
  const original = await startCampaign(config, path.join(root, "original"), {
    network: first.adapters,
  });
  const file = path.join(original.directory, "campaign.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  const retained = manifest.parts[0];
  manifest.parts = [retained];
  manifest.status = "collecting";
  manifest.remainingItemIds = manifest.itemIds.filter(
    (id) => !retained.ownedItemIds.includes(id),
  );
  await writeFile(file, JSON.stringify(manifest));
  const next = networkFixture({});
  const resumed = await resumeCampaign(
    original.directory,
    path.join(root, "resumed"),
    { network: next.adapters },
  );
  expect(next.calls).toEqual([]);
  expect(resumed.coverage.owned).toBe(2);
  expect(
    resumed.coverage.pendingQueue.some(
      (entry) => entry.kind === "deferred-collection",
    ),
  ).toBe(true);
});

it("exports globally unique references without raw bodies or duplicate ownership", async () => {
  const { root, config } = await setup([100, 100]);
  const source = await startCampaign(
    { ...config, partitionSize: 1 },
    path.join(root, "campaign"),
  );
  const before = await readFile(path.join(source.directory, "campaign.json"));
  const result = await indexCampaign(
    source.directory,
    path.join(root, "index"),
  );
  const items = (
    await readFile(path.join(result.directory, "items.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(items.map((item) => item.itemId)).size).toBe(2);
  expect(items.every((item) => item.collectionOwned && item.ownerPart)).toBe(
    true,
  );
  const evidenceBytes = await readFile(
    path.join(result.directory, "evidence.jsonl"),
  );
  const records = evidenceBytes
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(records).toHaveLength(2);
  expect(records.every((record) => !Object.hasOwn(record, "value"))).toBe(true);
  expect(
    new Set(records.map((record) => JSON.stringify(record.reference))).size,
  ).toBe(2);
  expect(result.files["evidence.jsonl"].sha256).toBe(
    createHash("sha256").update(evidenceBytes).digest("hex"),
  );
  expect(result.files["checks.jsonl"].records).toBe(52);
  expect(result.globalReviewRequired).toBe(true);
  expect(result.coverage.complete).toBe(false);
  expect(await readFile(path.join(source.directory, "campaign.json"))).toEqual(
    before,
  );
  await expect(
    indexCampaign(source.directory, result.directory),
  ).rejects.toThrow();
  await expect(
    indexCampaign(source.directory, path.join(source.directory, "index")),
  ).rejects.toThrow(/outside/);
});
it("keeps unowned oversized content visible in the global index", async () => {
  const { root, config } = await setup([1024 * 1024, 100]);
  const source = await startCampaign(config, path.join(root, "campaign"));
  const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const { stdout } = await promisify(execFile)(process.execPath, [
    cli,
    "campaign-index",
    source.directory,
    path.join(root, "index"),
  ]);
  const result = JSON.parse(stdout);
  const items = (
    await readFile(path.join(result.directory, "items.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(items).toHaveLength(2);
  expect(items.filter((item) => item.ownerPart === null)).toHaveLength(1);
  expect(
    result.coverage.pendingQueue.some(
      (entry) => entry.kind === "unpartitionable-item",
    ),
  ).toBe(true);
});
