import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { digestTree } from "../../../../dist/integrity.js";
import { networkFixture } from "../../../../tests/helpers/content-audit-network.ts";

const repo = fileURLToPath(new URL("../../../../", import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), "nks-http-barriers-0126-"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const results = [];
const versions = [
  [
    "0.1.25",
    "2d5051e7981c0ea6a199520bc98f612ff54816e8290dfea8aa29012bfe24cc49",
    "1cd662b8c2c244d97a1cffe7409526e3c641832f11fbc87185a6e2a1bc9c4a4d",
    "b6b9a1d81f786cfe25c85047187108791d42e208748446a97ae2a20657cc819f",
  ],
  [
    "0.1.26",
    "d92c38498e985a0f3bd9b164e83dcaf1aec45cb693c56639ed44b5ff77135b1d",
    "c7be68b999586dc65258443c9f7a4f370ca0b9843a37a923794e8fc86e0e8971",
    "4a868a76c72cfcee613d202fc63743b604d93b4815feea554c1a2ec0e00b8477",
  ],
];
function fixture(recovered = false) {
  return networkFixture(
    Object.fromEntries([
      ["https://example.com/robots.txt", { status: 404 }],
      ...[401, 403, 429, 404].map((status) => [
        `https://example.com/status-${status}`,
        {
          status: recovered && status !== 404 ? 200 : status,
          body: "Synthetic response",
        },
      ]),
    ]),
  );
}
for (const [version, archiveHash, releaseDigest, componentDigest] of versions) {
  const versionRoot = path.join(root, version);
  await mkdir(versionRoot);
  const archive = path.join(
    repo,
    `build/agent-skills-solution-content-search-audit-${version}.tgz`,
  );
  assert.equal(sha(await readFile(archive)), archiveHash);
  execFileSync("rtk", ["proxy", "tar", "-xzf", archive, "-C", versionRoot]);
  for (const target of ["codex", "claude-code", "codex,claude-code"]) {
    const project = path.join(versionRoot, target.replaceAll(",", "-"));
    await mkdir(project);
    const installation = execFileSync(
      "rtk",
      [
        "proxy",
        process.execPath,
        path.join(repo, "dist/cli.js"),
        "install-solution",
        "--release",
        path.join(versionRoot, "package"),
        "--digest",
        releaseDigest,
        "--project",
        project,
        "--target",
        target,
      ],
      { encoding: "utf8" },
    );
    await writeFile(path.join(project, "installation.json"), installation);
    const skill = path.join(
      project,
      target === "claude-code" ? ".claude" : ".agents",
      "skills/content-search-audit",
    );
    assert.equal(await digestTree(skill), componentDigest);
    const load = (name) =>
      import(
        pathToFileURL(path.join(skill, "scripts/lib", `${name}.mjs`)).href
      );
    const { startAudit } = await load("run");
    const { loadAuditData, validateAudit } = await load("validate");
    const { resumeAudit } = await load("resume");
    const { startCampaign, validateCampaign } = await load("campaign");
    const config = {
      inputs: [401, 403, 429, 404].map((status) => ({
        uri: `https://example.com/status-${status}`,
        source: "fixture",
      })),
      inventoryComplete: true,
      localRoots: [],
      partitionSize: 1,
      network: { allowedOrigins: ["https://example.com"], retries: 0 },
    };
    const started = await startAudit(config, path.join(project, "run"), {
      network: fixture().adapters,
    });
    const data = await loadAuditData(started.directory);
    const validation = await validateAudit(started.directory);
    assert.equal(validation.valid, true);
    assert.equal(validation.completionAllowed, false);
    assert.equal(data.findings.length, version === "0.1.25" ? 4 : 1);
    assert.equal(validation.coverage.states.blocked, 3);
    assert.equal(validation.coverage.states.failed, 1);
    for (const status of [401, 403, 429]) {
      const item = data.inventory.find((i) => i.uri.endsWith(`-${status}`));
      assert.equal(
        data.checks.find(
          (c) => c.itemId === item.itemId && c.ruleId === "seo-response",
        ).status,
        version === "0.1.25" ? "fail" : "unknown",
      );
    }
    const campaign = await startCampaign(
      config,
      path.join(project, "campaign"),
      { network: fixture().adapters },
    );
    const campaignValidation = await validateCampaign(campaign.directory);
    assert.equal(campaignValidation.valid, true);
    assert.equal(campaignValidation.findings, version === "0.1.25" ? 4 : 1);
    assert.equal(campaignValidation.coverage.complete, false);
    const refreshed = await resumeAudit(
      started.directory,
      config,
      path.join(project, "resumed"),
      { network: fixture(true).adapters },
    );
    const after = await loadAuditData(refreshed.directory);
    assert.equal(after.findings.length, 1);
    assert.equal(refreshed.coverage.states.blocked, 0);
    assert.equal(refreshed.coverage.states.pending, 3);
    assert.equal((await validateAudit(refreshed.directory)).valid, true);
    assert.equal(await digestTree(skill), componentDigest);
    const result = {
      version,
      target,
      componentDigest,
      validation,
      campaignValidation,
      initialFindings: data.findings.length,
      refreshedFindings: after.findings.length,
      refreshedCoverage: refreshed.coverage,
      sourcePackageUnchanged: true,
    };
    await writeFile(
      path.join(project, "result.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    results.push(result);
  }
}
await writeFile(
  path.join(root, "receipt.json"),
  JSON.stringify(
    {
      root,
      runnerSha256: sha(await readFile(fileURLToPath(import.meta.url))),
      results,
      limits:
        "Installed module replay with deterministic transport fixtures; not live HTTP or native model evaluation. Historical runs use their own frozen version.",
      releaseAccepted: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(root);
