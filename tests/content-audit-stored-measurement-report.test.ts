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
import { evaluateEnterpriseMeasurement } from "../skills/content-search-audit/scripts/lib/measurement-assessment/workflow.mjs";
import { projectStoredMeasurement } from "../scripts/enterprise-measurement/report.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "stored-measurement-report-"));
  const example = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-measurement.json",
      "utf8",
    ),
  );
  example.evaluations[0].input.payload.notes =
    "private-measurement-report-canary";
  const initial = resolveAuditContext(example.config, []);
  await saveEnterpriseRun(join(root, "initial"), initial);
  const result = await evaluateEnterpriseMeasurement(
    join(root, "initial"),
    {
      sourceDigest: enterpriseDigest(initial),
      newRunId: example.newRunId,
      assessmentAt: example.assessmentAt,
      evaluations: example.evaluations,
    },
    join(root, "evaluated"),
  );
  return {
    root,
    example,
    result,
    run: await loadEnterpriseRun(join(root, "evaluated")),
  };
}
it("assembles replayed measurement findings and requests without exposing original payloads", async () => {
  const f = await setup(),
    p = projectStoredMeasurement(f.run);
  expect(p.findings).toEqual(f.result.findings);
  expect(p.observations).toHaveLength(3);
  await buildStoredEnterpriseReport(
    join(f.root, "evaluated"),
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
  expect(report.findings).toHaveLength(3);
  expect(report.dataRequests.length).toBeGreaterThan(0);
  for (const file of ["report.json", "report.md", "report.html"])
    expect(await readFile(join(f.root, "report", file), "utf8")).not.toContain(
      "private-measurement-report-canary",
    );
});
it("requires final-clock reassessment before current measurement claims", async () => {
  const f = await setup();
  const later = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-20T12:00:00Z",
  ).run;
  expect(() => projectStoredMeasurement(later)).toThrow(
    "Reassess measurement evidence",
  );
});
it("rejects altered retained sources even with updated outer digest", async () => {
  const f = await setup();
  const evidence = f.run.evidence.find((e) => e.content?.entry);
  evidence.content.entry.input.payload.property.timeZone = "Europe/London";
  evidence.digest = enterpriseDigest(evidence.content);
  expect(() => projectStoredMeasurement(f.run)).toThrow();
});
it("does not restore a finding suppressed by current conservative unknown state", async () => {
  const f = await setup();
  const check = f.run.checks.find((c) => c.status === "fail");
  check.status = "unknown";
  check.reason = "reassessment-required";
  check.assessedAt = null;
  check.review = null;
  expect(
    projectStoredMeasurement(f.run).findings.some(
      (x) => x.checkId === check.checkId,
    ),
  ).toBe(false);
});

it.each(["base", "row"])("rejects unowned %s evidence", async (kind) => {
  const f = await setup();
  const source = f.run.evidence.find((e) =>
    kind === "base" ? e.content?.entry : e.content?.row,
  );
  const orphan = structuredClone(source);
  orphan.evidenceId = `orphan-${kind}`;
  f.run.evidence.push(orphan);
  expect(() => projectStoredMeasurement(f.run)).toThrow(
    "Unowned measurement evidence",
  );
});
it("retains ordinary reassessment history and rejects a removed history reference", async () => {
  const f = await setup();
  f.example.evaluations[0].contract.expectations[0].expected = "UTC";
  await evaluateEnterpriseMeasurement(
    join(f.root, "evaluated"),
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "retest",
      assessmentAt: f.run.assessmentAt,
      evaluations: f.example.evaluations,
    },
    join(f.root, "retest"),
  );
  const next = await loadEnterpriseRun(join(f.root, "retest"));
  const p = projectStoredMeasurement(next);
  expect(
    p.observations.filter((o) => o.classification === "historical"),
  ).toHaveLength(3);
  expect(p.findings).toHaveLength(2);
  next.measurementEvaluations.find(
    (e) => e.evaluationId === "ga4",
  ).historyEvidenceIds = [];
  expect(() => projectStoredMeasurement(next)).toThrow(
    "Unowned measurement evidence",
  );
});
