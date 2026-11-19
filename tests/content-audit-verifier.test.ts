import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { loadAuditData } from "../skills/content-search-audit/scripts/lib/validate.mjs";
import { buildSolutionRelease } from "../src/release.js";
import { loadIndexedSolution } from "../src/solutions.js";
import { startCampaign } from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { reviewCampaign } from "../skills/content-search-audit/scripts/lib/campaign-review.mjs";
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { digestTree } from "../src/integrity.js";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { verifyContentAudit } from "../scripts/verify-content-audit.mjs";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "audit-verifier-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const file = path.join(content, "page.md");
  await writeFile(file, "# Evidence\n");
  const run = await startAudit(
    {
      inputs: [{ path: file, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
    },
    path.join(root, "run"),
  );
  return {
    root,
    run,
    config: {
      schemaVersion: 1,
      packageDirectory: path.resolve("skills/content-search-audit"),
      expectedComponentDigest: await digestTree("skills/content-search-audit"),
      artifacts: [{ kind: "run", directory: run.directory }],
    },
  };
}
it("separates valid partial artifacts from completed audit and release acceptance", async () => {
  const { config } = await setup();
  const result = await verifyContentAudit(config);
  expect(result.valid).toBe(true);
  expect(result.allAuditsComplete).toBe(false);
  expect(result.releaseAccepted).toBe(false);
  expect(result.release).toBeNull();
  expect(result.artifacts[0].valid).toBe(true);
  expect(result.package.sourceIds).toHaveLength(7);
});
it("rejects a package that does not match the externally supplied digest", async () => {
  const { root, config } = await setup();
  const copy = path.join(root, "package");
  await cp(config.packageDirectory, copy, { recursive: true });
  await writeFile(path.join(copy, "SKILL.md"), "changed");
  await expect(
    verifyContentAudit({ ...config, packageDirectory: copy }),
  ).rejects.toThrow(/digest/i);
});
it("does not accept tampered evidence even when package validation passes", async () => {
  const { config, run } = await setup();
  const rows = (
    await readFile(path.join(run.directory, "evidence.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map(JSON.parse);
  await writeFile(path.join(run.directory, rows[0].artifact), "corrupted");
  const result = await verifyContentAudit(config);
  expect(result.valid).toBe(false);
  expect(result.artifacts[0].valid).toBe(false);
  expect(result.allAuditsComplete).toBe(false);
});
it("rejects missing digests, unknown artifact kinds and vacuous completion", async () => {
  const { config } = await setup();
  await expect(
    verifyContentAudit({ ...config, expectedComponentDigest: "" }),
  ).rejects.toThrow(/digest/i);
  await expect(
    verifyContentAudit({
      ...config,
      artifacts: [{ kind: "guess", directory: "." }],
    }),
  ).rejects.toThrow(/kind/i);
  const result = await verifyContentAudit({ ...config, artifacts: [] });
  expect(result.valid).toBe(true);
  expect(result.allAuditsComplete).toBe(false);
});

it("binds a built release to the same component and exactly the two supported hosts", async () => {
  const { root, config } = await setup();
  const release = path.join(root, "release");
  await buildSolutionRelease({
    manifest: await loadIndexedSolution(
      "catalog.content-search-audit-candidate.yaml",
      "content-search-audit",
    ),
    upstreams: new Map(),
    repositoryRoot: process.cwd(),
    cacheDirectory: path.join(root, "cache"),
    outputDirectory: release,
  });
  const bound = {
    ...config,
    release: { directory: release, expectedDigest: await digestTree(release) },
  };
  expect((await verifyContentAudit(bound)).release.version).toBe("0.3.21");
  await expect(
    verifyContentAudit({
      ...bound,
      release: { ...bound.release, expectedDigest: "0".repeat(64) },
    }),
  ).rejects.toThrow(/Release digest/);
  const file = path.join(release, "solution-release.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.hosts = ["codex"];
  await writeFile(file, JSON.stringify(manifest));
  await expect(
    verifyContentAudit({
      ...bound,
      release: {
        directory: release,
        expectedDigest: await digestTree(release),
      },
    }),
  ).rejects.toThrow(/exactly Codex/);
});
it("dispatches campaign and linked global review validation without treating collection as completion", async () => {
  const { root, run, config } = await setup();
  const source = JSON.parse(
    await readFile(path.join(run.directory, "config.json"), "utf8"),
  );
  const campaign = await startCampaign(source, path.join(root, "campaign"));
  const manifestBytes = await readFile(
    path.join(campaign.directory, "campaign.json"),
  );
  const manifest = JSON.parse(manifestBytes.toString());
  const partSnapshotHashes = {};
  for (const part of manifest.parts)
    partSnapshotHashes[part.path] = createHash("sha256")
      .update(
        JSON.stringify(
          await loadAuditData(path.join(campaign.directory, part.path)),
        ),
      )
      .digest("hex");
  const review = await reviewCampaign(
    campaign.directory,
    {
      schemaVersion: 1,
      campaignId: manifest.campaignId,
      sourceManifestHash: createHash("sha256")
        .update(manifestBytes)
        .digest("hex"),
      partSnapshotHashes,
      reviews: [],
      contextEvidence: [],
      findings: [],
      reviewedAt: new Date().toISOString(),
      reviewer: "fixture",
    },
    path.join(root, "review"),
  );
  const result = await verifyContentAudit({
    ...config,
    artifacts: [
      { kind: "campaign", directory: campaign.directory },
      {
        kind: "campaign-review",
        directory: review.directory,
        sourceDirectory: campaign.directory,
      },
    ],
  });
  expect(result.valid).toBe(true);
  expect(result.allAuditsComplete).toBe(false);
  const wrong = await verifyContentAudit({
    ...config,
    artifacts: [
      {
        kind: "campaign-review",
        directory: review.directory,
        sourceDirectory: root,
      },
    ],
  });
  expect(wrong.valid).toBe(false);
});

it("writes a bound CLI receipt once and preserves it on a repeated command", async () => {
  const { root, config } = await setup();
  const input = path.join(root, "verify.json"),
    output = path.join(root, "result.json");
  const text = JSON.stringify(config);
  await writeFile(input, text);
  const args = [
    path.resolve("scripts/verify-content-audit.mjs"),
    input,
    output,
  ];
  await promisify(execFile)(process.execPath, args);
  const before = await readFile(output, "utf8");
  const result = JSON.parse(before);
  expect(result.configSha256).toBe(
    createHash("sha256").update(text).digest("hex"),
  );
  expect(result.releaseAccepted).toBe(false);
  await expect(promisify(execFile)(process.execPath, args)).rejects.toThrow(
    /EEXIST/,
  );
  expect(await readFile(output, "utf8")).toBe(before);
});
