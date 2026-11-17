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
  "build/agent-skills-solution-content-search-audit-0.1.13.tgz",
);
assert.equal(
  hash(await readFile(archive)),
  "2d9852a9ea18fa0cbf69f9a139301a120f76b08f71643ee70c1dd34a8e22f751",
);
const root = await mkdtemp(path.join(tmpdir(), "nks-age-0113-"));
await mkdir(path.join(root, "extracted"));
execFileSync("tar", ["-xzf", archive, "-C", path.join(root, "extracted")]);
const componentDigest =
  "356413af2f8cc4d840c719d11bba03a88c9605f5bba54496e80cf9bdcbea0243";
const brand = 'Khách hàng Ánh Dương <script>bad</script> & "Team"';
const results = [];
const { tsImport } = await import("tsx/esm/api");
const fixtures = await tsImport(
  "../../../../tests/helpers/content-audit-measurements.ts",
  import.meta.url,
);
const measurements = JSON.parse(
  await readFile(
    path.join(repo, "docs/research/content-search-audit-accuracy-fixture.json"),
    "utf8",
  ),
);
const options = {
  searchConsoleExports: [fixtures.searchConsoleExport()],
  analyticsExports: [fixtures.analyticsExport()],
  bingExports: [fixtures.bingExport()],
  serverLogExports: [fixtures.serverLogExport()],
  measurements,
};
for (const target of ["codex", "claude-code", "codex,claude-code"]) {
  const project = path.join(root, target.replaceAll(",", "-"));
  await mkdir(project);
  execFileSync(process.execPath, [
    path.join(repo, "dist/cli.js"),
    "install-solution",
    "--release",
    path.join(root, "extracted/package"),
    "--digest",
    "16e0f91110158220cf7f192e3dfa2bffddfb3b7a56a3a5b64bc7eec13857705f",
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
  const optionsPath = path.join(project, "measurement-options.json");
  await writeFile(optionsPath, JSON.stringify(options));
  const report = cli(
    "campaign-report",
    campaign,
    path.join(project, "review"),
    path.join(project, "report"),
    optionsPath,
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
      assert.ok(visible.includes("Source age reference"));
      assert.ok(visible.includes("full elapsed days"));
      assert.ok(visible.includes("UTC calendar days (date only)"));
      assert.ok(
        visible.includes("no stale-content verdict follows from age alone"),
      );
      if (label === "campaign") {
        assert.ok(visible.includes(report.reportTime));
        for (const role of [
          "Export captured",
          "Response captured",
          "Accuracy review",
          "Claim source captured",
        ])
          assert.ok(visible.includes(role));
      }
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
  const bundleData = JSON.parse(
    await readFile(
      path.join(report.directory, "ai-observation-evidence.json"),
      "utf8",
    ),
  );
  assert.deepEqual(bundleData.input, measurements);
  for (const [file, key] of [
    ["search-console-evidence.json", "searchConsoleExports"],
    ["analytics-evidence.json", "analyticsExports"],
    ["bing-evidence.json", "bingExports"],
    ["server-log-evidence.json", "serverLogExports"],
  ]) {
    const value = JSON.parse(
      await readFile(path.join(report.directory, file), "utf8"),
    );
    assert.deepEqual(value.exports, options[key]);
  }
  results.push({
    allMeasurementDateRolesShown: true,
    originalMeasurementInputsUnchanged: true,
    reportTime: report.reportTime,
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
      version: "0.1.13",
      componentDigest,
      runnerSha256: hash(await readFile(fileURLToPath(import.meta.url))),
      results,
      limits:
        "Local synthetic content via installed CLI. Verifies explicit source ages/date roles and unchanged measurement inputs; not semantic audit, browser rendering or live measurement.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ root, receipt: path.join(root, "receipt.json") }));
