import { mkdtemp, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
  loadEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateEnterpriseAccessibility } from "../skills/content-search-audit/scripts/lib/enterprise-accessibility-workflow.mjs";
import { projectStoredAccessibility } from "../scripts/enterprise-accessibility/report.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "stored-accessibility-report-"));
  const fixture = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-accessibility.json",
      "utf8",
    ),
  );
  for (const entry of fixture.evaluations)
    for (const source of entry.sources) {
      const raw = JSON.parse(source.artifactText);
      if (entry.kind === "axe")
        raw.violations[0].nodes[0].html = "PRIVATE_ACCESSIBILITY_REPORT_HTML";
      else
        for (const attachment of raw.attachments) {
          attachment.artifactText += " PRIVATE_ACCESSIBILITY_REPORT_ATTACHMENT";
          attachment.artifactHash = createHash("sha256")
            .update(attachment.artifactText)
            .digest("hex");
        }
      source.artifactText = JSON.stringify(raw);
      source.artifactHash = createHash("sha256")
        .update(source.artifactText)
        .digest("hex");
    }
  const initial = resolveAuditContext(fixture.config, []);
  await saveEnterpriseRun(join(root, "initial"), initial);
  const result = await evaluateEnterpriseAccessibility(
    join(root, "initial"),
    {
      sourceDigest: enterpriseDigest(initial),
      newRunId: fixture.newRunId,
      assessmentAt: fixture.assessmentAt,
      evaluations: fixture.evaluations,
    },
    join(root, "assessed"),
  );
  return { root, result, run: await loadEnterpriseRun(join(root, "assessed")) };
}
it("assembles replayed accessibility samples and findings without serializing native sources", async () => {
  const f = await setup(),
    p = projectStoredAccessibility(f.run);
  expect(p.observations).toEqual(f.result.observations);
  expect(p.findings).toEqual(f.result.findings);
  await buildStoredEnterpriseReport(
    join(f.root, "assessed"),
    {
      sourceRunDigest: enterpriseDigest(f.run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  const report = await loadEnterpriseReport(join(f.root, "report"));
  expect(report.observations).toEqual(p.observations);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("artifactText");
    expect(text).not.toContain("PRIVATE_ACCESSIBILITY_REPORT");
  }
});
it("requires final-clock reassessment instead of presenting stale checks as current", async () => {
  const f = await setup();
  const next = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-20T12:00:00Z",
  ).run;
  expect(() => projectStoredAccessibility(next)).toThrow(
    "Reassess accessibility evidence",
  );
});
it("does not revive a conservatively unknown accessibility finding", async () => {
  const f = await setup();
  const check = f.run.checks.find(
    (c) => c.status === "fail" && !c.ruleId.endsWith("cwv-all-three-v1"),
  );
  check.status = "unknown";
  check.reason = "reassessment-required";
  check.assessedAt = null;
  check.review = null;
  expect(
    projectStoredAccessibility(f.run).findings.some(
      (f) => f.checkId === check.checkId,
    ),
  ).toBe(false);
});
