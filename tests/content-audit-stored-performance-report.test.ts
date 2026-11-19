import { mkdtemp, readFile } from "node:fs/promises";
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
import { evaluateEnterprisePerformance } from "../skills/content-search-audit/scripts/lib/enterprise-performance-workflow.mjs";
import { projectStoredPerformance } from "../scripts/enterprise-performance/report.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "stored-performance-report-"));
  const fixture = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-performance.json",
      "utf8",
    ),
  );
  const initial = resolveAuditContext(fixture.config, []);
  await saveEnterpriseRun(join(root, "initial"), initial);
  const result = await evaluateEnterprisePerformance(
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
it("assembles replayed field measurements and findings without serializing native sources", async () => {
  const f = await setup(),
    p = projectStoredPerformance(f.run);
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
  for (const file of ["report.json", "report.md", "report.html"])
    expect(await readFile(join(f.root, "report", file), "utf8")).not.toContain(
      "artifactText",
    );
});
it("requires final-clock reassessment instead of presenting stale checks as current", async () => {
  const f = await setup();
  const next = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-20T12:00:00Z",
  ).run;
  expect(() => projectStoredPerformance(next)).toThrow(
    "Reassess performance evidence",
  );
});
it("does not revive a conservatively unknown field finding", async () => {
  const f = await setup();
  const check = f.run.checks.find(
    (c) => c.status === "fail" && !c.ruleId.endsWith("cwv-all-three-v1"),
  );
  check.status = "unknown";
  check.reason = "reassessment-required";
  check.assessedAt = null;
  check.review = null;
  expect(
    projectStoredPerformance(f.run).findings.some(
      (f) => f.checkId === check.checkId,
    ),
  ).toBe(false);
});
