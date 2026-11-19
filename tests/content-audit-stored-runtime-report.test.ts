import { createHash } from "node:crypto";
import { evaluateEnterpriseTasks } from "../scripts/enterprise-journeys/task-workflow.mjs";
import { mkdtemp, readFile, access } from "node:fs/promises";
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
import { evaluateEnterpriseRuntime } from "../skills/content-search-audit/scripts/lib/enterprise-runtime-workflow.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { projectStoredRuntime } from "../scripts/enterprise-runtime-report.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "stored-runtime-report-"));
  const fixture = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-runtime-evaluations.json",
      "utf8",
    ),
  );
  for (const e of fixture.evaluations)
    for (const s of e.sources) s.locator = "private-source-canary";
  const initial = resolveAuditContext(fixture.config, []);
  await saveEnterpriseRun(join(root, "initial"), initial);
  const evaluated = await evaluateEnterpriseRuntime(
    join(root, "initial"),
    {
      sourceDigest: enterpriseDigest(initial),
      newRunId: "evaluated",
      assessmentAt: initial.assessmentAt,
      evaluations: fixture.evaluations,
    },
    join(root, "evaluated"),
  );
  const run = await loadEnterpriseRun(join(root, "evaluated"));
  const metadata = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "r1",
    authorId: "fixture",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
  };
  return { root, fixture, run, evaluated, metadata };
}
it("assembles tracking and consent from stored sources without supplied projections", async () => {
  const f = await setup();
  const projection = projectStoredRuntime(f.run);
  expect(projection.findings).toEqual(
    f.evaluated.evaluations.flatMap((e) => e.findings),
  );
  expect(projection.observations).toHaveLength(2);
  await buildStoredEnterpriseReport(
    join(f.root, "evaluated"),
    f.metadata,
    join(f.root, "report"),
  );
  const report = await loadEnterpriseReport(join(f.root, "report"));
  expect(report.findings).toEqual(
    projection.findings.map((x) => expect.objectContaining(x)),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("private-source-canary");
    expect(text).not.toContain("artifactText");
    expect(text).toContain("supplied");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "evaluated"))),
  ).toBe(f.metadata.sourceRunDigest);
});
it("rejects an advanced assessment clock instead of reviving historical runtime failures", async () => {
  const f = await setup();
  const later = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-20T12:00:00Z",
  ).run;
  await saveEnterpriseRun(join(f.root, "later"), later);
  await expect(
    buildStoredEnterpriseReport(
      join(f.root, "later"),
      {
        ...f.metadata,
        sourceRunDigest: enterpriseDigest(later),
        generatedAt: later.assessmentAt,
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/Reassess runtime/);
  await expect(access(join(f.root, "bad"))).rejects.toThrow();
});
it("retains historical runtime observations after a fresh expired-source assessment", async () => {
  const f = await setup();
  const next = await evaluateEnterpriseRuntime(
    join(f.root, "evaluated"),
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "expired",
      assessmentAt: "2026-11-20T12:00:00Z",
      evaluations: f.fixture.evaluations,
    },
    join(f.root, "expired"),
  );
  const run = await loadEnterpriseRun(join(f.root, "expired"));
  const p = projectStoredRuntime(run);
  expect(p.findings).toEqual([]);
  expect(next.evaluations.every((e) => e.findings.length === 0)).toBe(true);
  expect(
    p.observations.filter((o) => o.classification === "historical"),
  ).toHaveLength(2);
  expect(
    p.observations.filter((o) => o.classification === "current"),
  ).toHaveLength(2);
  expect(p.narrative.some((n) => n.text.includes("Historical"))).toBe(true);
  await buildStoredEnterpriseReport(
    join(f.root, "expired"),
    {
      ...f.metadata,
      sourceRunDigest: enterpriseDigest(run),
      generatedAt: run.assessmentAt,
    },
    join(f.root, "report"),
  );
  expect((await loadEnterpriseReport(join(f.root, "report"))).findings).toEqual(
    [],
  );
});
it("refuses caller findings and retained unsupported module evidence", async () => {
  const f = await setup();
  await expect(
    buildStoredEnterpriseReport(
      join(f.root, "evaluated"),
      { ...f.metadata, findings: [] },
      join(f.root, "omitted"),
    ),
  ).rejects.toThrow(/metadata/);
  const run = structuredClone(f.run);
  const e = structuredClone(run.evidence[0]);
  e.evidenceId = "other-module-evidence";
  e.artifactType = "unimplemented-module";
  run.evidence.push(e);
  await saveEnterpriseRun(join(f.root, "unsupported"), run);
  await expect(
    buildStoredEnterpriseReport(
      join(f.root, "unsupported"),
      { ...f.metadata, sourceRunDigest: enterpriseDigest(run) },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/Unsupported evidence/);
});

it("assembles runtime and task projections after both are evaluated at the final clock", async () => {
  const f = await setup();
  const task = JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/task-commerce.json",
      "utf8",
    ),
  );
  const at = task.context.assessmentAt;
  delete task.context.customerId;
  delete task.context.assessmentAt;
  for (const source of task.sources) {
    const raw = JSON.parse(source.artifactText);
    const rebind = (value) => {
      if (value && typeof value === "object")
        for (const key of Object.keys(value)) {
          if (key === "customerId") value[key] = f.run.customerId;
          else rebind(value[key]);
        }
    };
    rebind(raw);
    source.artifactText = JSON.stringify(raw);
    source.artifactHash = createHash("sha256")
      .update(source.artifactText)
      .digest("hex");
  }
  await evaluateEnterpriseTasks(
    join(f.root, "evaluated"),
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "task",
      assessmentAt: at,
      evaluations: [
        {
          evaluationId: "checkout",
          context: task.context,
          sources: task.sources,
        },
      ],
    },
    join(f.root, "task"),
  );
  const taskRun = await loadEnterpriseRun(join(f.root, "task"));
  await evaluateEnterpriseRuntime(
    join(f.root, "task"),
    {
      sourceDigest: enterpriseDigest(taskRun),
      newRunId: "mixed",
      assessmentAt: at,
      evaluations: f.fixture.evaluations,
    },
    join(f.root, "mixed"),
  );
  const mixed = await loadEnterpriseRun(join(f.root, "mixed"));
  await buildStoredEnterpriseReport(
    join(f.root, "mixed"),
    {
      ...f.metadata,
      sourceRunDigest: enterpriseDigest(mixed),
      generatedAt: at,
    },
    join(f.root, "report"),
  );
  const report = await loadEnterpriseReport(join(f.root, "report"));
  expect(
    report.narrative.some((n) => n.text.includes("Current supplied task")),
  ).toBe(true);
  expect(
    report.narrative.some((n) => n.text.includes("Current supplied consent")),
  ).toBe(true);
  expect(
    report.narrative.some((n) => n.text.includes("Current supplied tracking")),
  ).toBe(true);
  expect(
    report.narrative.some((n) =>
      n.text.includes("Historical supplied consent"),
    ),
  ).toBe(true);
  expect(report.findings.length).toBeGreaterThan(0);
  expect(
    report.assessment.checks.filter((c) => c.ruleId.startsWith("ux-task-")),
  ).toHaveLength(2);
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "evaluated"))),
  ).toBe(f.metadata.sourceRunDigest);
});
