import { execFileSync } from "node:child_process";
import process from "node:process";
import { it, expect } from "vitest";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  loadEnterpriseReport,
  saveEnterpriseReport,
  renderEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
const fixture =
  "docs/research/enterprise-performance-public-20261119/frozen/quokkaguide.com/report";
it("preserves exact archived V1 artifacts and produces deterministic V2 with identical canonical JSON/MD", async () => {
  const report = await loadEnterpriseReport(fixture);
  const v1 = renderEnterpriseReport(report, "customer", { rendererVersion: 1 });
  for (const [key, name] of Object.entries({
    json: "report.json",
    markdown: "report.md",
    html: "report.html",
    manifest: "manifest.json",
  }))
    expect(v1[key]).toBe(await readFile(join(fixture, name), "utf8"));
  const v2 = renderEnterpriseReport(report, "customer", { rendererVersion: 2 });
  expect(JSON.parse(v2.manifest)).toMatchObject({
    schemaVersion: 2,
    renderer: { id: "enterprise-html", version: 2 },
  });
  expect(v2.json).toBe(v1.json);
  expect(v2.markdown).toBe(v1.markdown);
  expect(v2.html).not.toBe(v1.html);
  expect(renderEnterpriseReport(report)).toEqual(v2);
  expect(
    renderEnterpriseReport(report, "customer", { rendererVersion: 2 }),
  ).toEqual(v2);
});
it("round trips both renderer versions and rejects unsupported or contradictory metadata", async () => {
  const report = await loadEnterpriseReport(fixture);
  const root = await mkdtemp(join(tmpdir(), "report-renderer-"));
  for (const version of [1, 2]) {
    const dir = join(root, String(version));
    await saveEnterpriseReport(dir, report, "customer", {
      rendererVersion: version,
    });
    expect(await loadEnterpriseReport(dir)).toEqual(report);
    const file = join(dir, "manifest.json"),
      manifest = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, JSON.stringify({ ...manifest, schemaVersion: 9 }));
    await expect(loadEnterpriseReport(dir)).rejects.toThrow();
    await writeFile(
      file,
      JSON.stringify({
        ...manifest,
        renderer: { id: "enterprise-html", version: 1 },
      }),
    );
    await expect(loadEnterpriseReport(dir)).rejects.toThrow();
  }
  expect(() =>
    renderEnterpriseReport(report, "customer", { rendererVersion: 3 }),
  ).toThrow();
});
it("rejects modified V2 HTML even with recomputed hashes", async () => {
  const report = await loadEnterpriseReport(fixture),
    root = await mkdtemp(join(tmpdir(), "report-tamper-")),
    dir = join(root, "report");
  await saveEnterpriseReport(dir, report);
  const html = (await readFile(join(dir, "report.html"), "utf8")).replace(
    "Attributed analysis",
    "Fabricated analysis",
  );
  await writeFile(join(dir, "report.html"), html);
  const file = join(dir, "manifest.json"),
    m = JSON.parse(await readFile(file, "utf8"));
  m.files["report.html"] = createHash("sha256").update(html).digest("hex");
  await writeFile(file, JSON.stringify(m));
  await expect(loadEnterpriseReport(dir)).rejects.toThrow(/projection/i);
});
it("keeps narrative visible and every original evidence reference as an escaped link", async () => {
  const report = await loadEnterpriseReport(fixture);
  report.narrative[0].text += ' <script>alert("x")</script>';
  const { html } = renderEnterpriseReport(report);
  expect(html).toContain('class="narrative-article"');
  expect(html).toContain("24 evidence references");
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  for (const e of report.assessment.evidence) {
    const id =
      "evidence-" + createHash("sha256").update(e.evidenceId).digest("hex");
    expect(html.split('id="' + id + '"')).toHaveLength(2);
  }
  for (const n of report.narrative)
    for (const id of n.evidenceIds)
      expect(html).toContain(
        'href="#evidence-' +
          createHash("sha256").update(id).digest("hex") +
          '"',
      );
});
it("uses the validated public projection without private records", async () => {
  const report = await loadEnterpriseReport(fixture);
  const a = renderEnterpriseReport(report, "public", { rendererVersion: 1 }),
    b = renderEnterpriseReport(report, "public", { rendererVersion: 2 });
  expect(a.json).toBe(b.json);
  expect(a.markdown).toBe(b.markdown);
  for (const id of report.narrative.flatMap((n) => n.evidenceIds))
    expect(b.html).not.toContain(id);
  expect(b.html).not.toContain(report.narrative[0].text);
  expect(b.html).not.toContain('class="narrative-article"');
});

it("CLI upgrades only presentation into a fresh directory without changing canonical bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "report-cli-")),
    dir = join(root, "v2");
  execFileSync(process.execPath, [
    "skills/content-search-audit/scripts/audit.mjs",
    "enterprise-report-render",
    fixture,
    dir,
  ]);
  expect(await readFile(join(dir, "report.json"), "utf8")).toBe(
    await readFile(join(fixture, "report.json"), "utf8"),
  );
  expect(await readFile(join(dir, "report.md"), "utf8")).toBe(
    await readFile(join(fixture, "report.md"), "utf8"),
  );
  expect(
    JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")).renderer
      .version,
  ).toBe(2);
  expect(() =>
    execFileSync(
      process.execPath,
      [
        "skills/content-search-audit/scripts/audit.mjs",
        "enterprise-report-render",
        fixture,
        dir,
      ],
      { stdio: "pipe" },
    ),
  ).toThrow();
  await loadEnterpriseReport(dir);
  await loadEnterpriseReport(fixture);
});

it("accepts an immutable V1 parent when creating a V2 report revision", async () => {
  const { resolveAuditContext } =
    await import("../skills/content-search-audit/scripts/lib/enterprise-context.mjs");
  const { enterpriseDigest } =
    await import("../skills/content-search-audit/scripts/lib/enterprise-state.mjs");
  const { buildEnterpriseReport, reviseEnterpriseReport } =
    await import("../skills/content-search-audit/scripts/lib/enterprise-report.mjs");
  const run = resolveAuditContext(
    {
      customerId: "renderer-test",
      runId: "intake",
      assessmentAt: "2026-11-19T08:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  const bundle = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "r1",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Renderer regression", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  };
  const report = buildEnterpriseReport(run, bundle),
    root = await mkdtemp(join(tmpdir(), "report-parent-")),
    parent = join(root, "parent"),
    next = join(root, "next");
  await saveEnterpriseReport(parent, report, "customer", {
    rendererVersion: 1,
  });
  const bytes = await readFile(join(parent, "manifest.json"), "utf8");
  await reviseEnterpriseReport(
    parent,
    run,
    {
      ...bundle,
      revisionId: "r2",
      generatedAt: "2026-11-19T08:01:00Z",
      parentReportDigest: enterpriseDigest(report),
    },
    next,
  );
  expect((await loadEnterpriseReport(next)).parentReportDigest).toBe(
    enterpriseDigest(report),
  );
  expect(await readFile(join(parent, "manifest.json"), "utf8")).toBe(bytes);
  expect(
    JSON.parse(await readFile(join(next, "manifest.json"), "utf8")).renderer
      .version,
  ).toBe(2);
});
