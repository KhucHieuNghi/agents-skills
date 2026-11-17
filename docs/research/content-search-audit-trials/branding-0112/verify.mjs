import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { digestTree } from "../../../../dist/integrity.js";

const repo = fileURLToPath(new URL("../../../../", import.meta.url));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const archive = path.join(
  repo,
  "build/agent-skills-solution-content-search-audit-0.1.12.tgz",
);
assert.equal(
  hash(await readFile(archive)),
  "9355b5a27f5e093d2c40e24060c766fc9207cdd5a4c6f75d9bc89f33c0b3cfeb",
);
const root = await mkdtemp(path.join(tmpdir(), "nks-branding-0112-"));
await mkdir(path.join(root, "extracted"));
execFileSync("tar", ["-xzf", archive, "-C", path.join(root, "extracted")]);
const componentDigest =
  "f16024dfa2475d1c6dd3c5b08225024dad338b8b350706af83502f4e3e6d43ae";
const brand = 'Khách hàng Ánh Dương <script>bad</script> & "Team"';
const results = [];
for (const target of ["codex", "claude-code", "codex,claude-code"]) {
  const project = path.join(root, target.replaceAll(",", "-"));
  await mkdir(project);
  execFileSync(process.execPath, [
    path.join(repo, "dist/cli.js"),
    "install-solution",
    "--release",
    path.join(root, "extracted/package"),
    "--digest",
    "9632eb3d61816651ff3a3615623d57c78027824bb7a3ba87165979f9643dd135",
    "--project",
    project,
    "--target",
    target,
  ]);
  const skill = path.join(
    project,
    target === "claude-code" ? ".claude" : ".agents",
    "skills/content-search-audit",
  );
  assert.equal(await digestTree(skill), componentDigest);
  const cli = (...args) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(skill, "scripts/audit.mjs"), ...args],
        { encoding: "utf8", cwd: project },
      ),
    );
  const content = path.join(project, "content");
  await mkdir(content);
  const bytes = "# Supplied synthetic content\nCustomer brand fixture only.\n";
  await writeFile(path.join(content, "page.md"), bytes);
  const config = {
    brandName: brand,
    localRoots: [content],
    inputs: [{ path: path.join(content, "page.md"), source: "fixture" }],
    inventoryComplete: true,
    partitionSize: 1,
  };
  const configPath = path.join(project, "config.json");
  await writeFile(configPath, JSON.stringify(config));
  const standalone = path.join(project, "standalone");
  cli("start", configPath, standalone);
  const campaign = path.join(project, "campaign");
  cli("campaign", configPath, campaign);
  const index = cli("campaign-index", campaign, path.join(project, "index"));
  const registry = JSON.parse(
    await readFile(path.join(skill, "rules/core.json"), "utf8"),
  );
  const review = {
    schemaVersion: 1,
    campaignId: index.campaignId,
    sourceManifestHash: index.sourceManifestHash,
    partSnapshotHashes: index.partSnapshotHashes,
    contextEvidence: [],
    findings: [],
    reviews: registry.rules
      .filter((r) => r.dimension === "portfolio")
      .map((r) => ({
        ruleId: r.ruleId,
        status: "unknown",
        reason: "Synthetic branding trial has no semantic assessment",
        reviewer: "fixture author",
        reviewedAt: new Date().toISOString(),
        itemIds: [],
        evidenceReferences: [],
        contextEvidenceIds: [],
      })),
  };
  const bundle = path.join(project, "review.json");
  await writeFile(bundle, JSON.stringify(review));
  cli("campaign-review", campaign, bundle, path.join(project, "review"));
  const report = cli(
    "campaign-report",
    campaign,
    path.join(project, "review"),
    path.join(project, "report"),
  );
  assert.equal(report.completionAllowed, false);
  const evidenceRows = (
    await readFile(path.join(project, "index/evidence.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map(JSON.parse);
  const standaloneEvidence = (
    await readFile(path.join(standalone, "evidence.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map(JSON.parse);
  const documents = {};
  for (const [label, directory, evidence] of [
    ["standalone", standalone, standaloneEvidence],
    ["campaign", report.directory, evidenceRows],
  ]) {
    const html = await readFile(path.join(directory, "report.html"), "utf8");
    const md = await readFile(path.join(directory, "report.md"), "utf8");
    assert.ok(
      html.includes(
        "Khách hàng Ánh Dương &lt;script&gt;bad&lt;/script&gt; &amp; &quot;Team&quot;",
      ),
    );
    assert.ok(md.includes("Khách hàng Ánh Dương"));
    for (const document of [html, md]) {
      assert.ok(!document.includes("<script>bad</script>"));
      assert.ok(!document.includes("NKSkills"));
      assert.match(document, /unavailable/i);
      assert.match(document, /partial/i);
      const visible = document.replaceAll("\\", "");
      for (const record of evidence)
        assert.ok(visible.includes(record.collectedAt));
      for (const rule of registry.rules)
        assert.ok(visible.includes(rule.lastReviewedAt));
    }
    documents[label] = {
      htmlSha256: hash(html),
      markdownSha256: hash(md),
      evidenceDatesChecked: evidence.length,
      ruleDatesChecked: registry.rules.length,
    };
  }
  for (const [name, sha] of Object.entries(report.files))
    assert.equal(hash(await readFile(path.join(report.directory, name))), sha);
  assert.equal(await readFile(path.join(content, "page.md"), "utf8"), bytes);
  assert.equal(await digestTree(skill), componentDigest);
  results.push({
    target,
    documents,
    brandPreservedAndEscaped: true,
    sourceAndPackageUnchanged: true,
    missingMeasurementsVisible: true,
    completionAllowed: report.completionAllowed,
    campaignManifestVerified: true,
  });
}
await writeFile(
  path.join(root, "receipt.json"),
  JSON.stringify(
    {
      root,
      version: "0.1.12",
      componentDigest,
      runnerSha256: hash(await readFile(fileURLToPath(import.meta.url))),
      results,
      limits:
        "Local synthetic content via installed CLI. Verifies brand and timestamps, not computed source age, semantic audit, browser rendering or live measurement.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ root, receipt: path.join(root, "receipt.json") }));
