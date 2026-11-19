import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseTasks } from "../scripts/enterprise-journeys/task-workflow.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "task-workflow-"));
  const fixture = JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/task-commerce.json",
      "utf8",
    ),
  );
  const run = resolveAuditContext(
    {
      customerId: fixture.context.customerId,
      runId: "initial",
      assessmentAt: fixture.context.assessmentAt,
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  const { customerId, assessmentAt, ...context } = fixture.context;
  void customerId;
  const entry = { evaluationId: "checkout", context, sources: fixture.sources };
  return {
    root,
    run,
    entry,
    bundle: {
      sourceDigest: enterpriseDigest(run),
      newRunId: "assessed",
      assessmentAt,
      evaluations: [entry],
    },
  };
}
const reportBundle = (run, result, extra = {}) => ({
  sourceRunDigest: enterpriseDigest(run),
  revisionId: "r1",
  authorId: "author",
  generatedAt: run.assessmentAt,
  brand: { name: "Synthetic", accent: "#174f7b" },
  findings: [],
  actions: [],
  observations: result.observations,
  narrative: result.narrative,
  decisions: [],
  ...extra,
});
it("projects task predicates in JSON Markdown and HTML without raw backend identities or a UX pass", async () => {
  const f = await setup();
  const result = await evaluateEnterpriseTasks(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(run.checks.length).toBe(f.run.checks.length + 2);
  expect(
    run.checks
      .filter((c) => c.moduleId === "ux-cro")
      .every((c) => c.status === "unknown"),
  ).toBe(true);
  expect(result.findings).toEqual([]);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const bytes = await readFile(join(f.root, "report", file), "utf8");
    expect(bytes).toContain("synthetic");
    expect(bytes).toContain("declared-business-outcome-matched");
    expect(bytes).not.toContain("pseudonymous-attempt");
    expect(bytes).not.toContain("artifactText");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("replays expired sources, preserves history and permits an immutable report revision", async () => {
  const f = await setup();
  const first = await evaluateEnterpriseTasks(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const parent = buildEnterpriseReport(run, reportBundle(run, first));
  const result = await evaluateEnterpriseTasks(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(run),
      newRunId: "expired",
      assessmentAt: "2026-11-20T01:00:00Z",
    },
    join(f.root, "expired"),
  );
  const next = await loadEnterpriseRun(join(f.root, "expired"));
  expect(result.narrative.some((n) => n.text.includes("Historical"))).toBe(
    true,
  );
  expect(result.narrative.some((n) => n.text.includes("stale-attempt"))).toBe(
    true,
  );
  const report = buildEnterpriseReport(
    next,
    reportBundle(next, result, {
      revisionId: "r2",
      parentReportDigest: enterpriseDigest(parent),
    }),
    parent,
  );
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
});
it("rejects a rebound task scope without creating a destination", async () => {
  const f = await setup();
  await evaluateEnterpriseTasks(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  f.entry.context.market = "US";
  await expect(
    evaluateEnterpriseTasks(
      join(f.root, "assessed"),
      { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "bad" },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await expect(access(join(f.root, "bad"))).rejects.toThrow();
});
it.each(["declined", "invalid"])(
  "preserves %s response state and other modules across replay",
  async (status) => {
    const f = await setup();
    await evaluateEnterpriseTasks(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    );
    const prior = await loadEnterpriseRun(join(f.root, "assessed"));
    const request = prior.dataRequests.find((r) =>
      r.requestedArtifact.startsWith("ux-task-"),
    );
    request.status = status;
    request.reason = "Owner response retained";
    await saveEnterpriseRun(join(f.root, "responded"), prior);
    await evaluateEnterpriseTasks(
      join(f.root, "responded"),
      { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
      join(f.root, "next"),
    );
    const next = await loadEnterpriseRun(join(f.root, "next"));
    expect(
      next.dataRequests.find(
        (r) => r.requestedArtifact === request.requestedArtifact,
      ),
    ).toMatchObject({ status, reason: request.reason });
    for (const check of f.run.checks)
      expect(next.checks.find((c) => c.checkId === check.checkId)).toEqual(
        check,
      );
  },
);
it("rejects forged historical task evidence even after manifest regeneration", async () => {
  const f = await setup();
  await evaluateEnterpriseTasks(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  const forged = structuredClone(
    prior.evidence.find((e) => e.artifactType === "ux-task-evaluation"),
  );
  forged.evidenceId = "foreign";
  forged.source = "unrelated";
  prior.evidence.push(forged);
  await saveEnterpriseRun(join(f.root, "forged"), prior);
  await expect(
    evaluateEnterpriseTasks(
      join(f.root, "forged"),
      { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
      join(f.root, "next"),
    ),
  ).rejects.toThrow();
});
it("does not invent a required backend check for an explicitly UI-only protocol", async () => {
  const f = await setup(),
    step = f.entry.context.protocol.steps[0];
  step.definition.businessRequired = false;
  step.definition.expectedBusinessStatuses = [];
  step.businessBinding = null;
  f.entry.context.protocolDigest = enterpriseDigest(f.entry.context.protocol);
  const source = f.entry.sources[0],
    raw = JSON.parse(source.artifactText);
  raw.scope.protocolDigest = f.entry.context.protocolDigest;
  raw.attempts[0].business = null;
  source.artifactText = JSON.stringify(raw);
  source.artifactHash = createHash("sha256")
    .update(source.artifactText)
    .digest("hex");
  const result = await evaluateEnterpriseTasks(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(run.checks.length).toBe(f.run.checks.length + 1);
  expect(
    result.narrative.some((n) => n.text.includes("declared-ui-only-task")),
  ).toBe(true);
});
it("rejects duplicate scope aliases and immutable-directory overwrites", async () => {
  const f = await setup();
  await expect(
    evaluateEnterpriseTasks(
      join(f.root, "initial"),
      {
        ...f.bundle,
        evaluations: [f.entry, { ...f.entry, evaluationId: "alias" }],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await expect(
    evaluateEnterpriseTasks(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "initial"),
    ),
  ).rejects.toThrow();
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("rejects an omitted active index before an alias can duplicate task checks", async () => {
  const f = await setup();
  await evaluateEnterpriseTasks(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  prior.taskEvaluations = [];
  await saveEnterpriseRun(join(f.root, "forged"), prior);
  await expect(
    evaluateEnterpriseTasks(
      join(f.root, "forged"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(prior),
        newRunId: "alias",
        evaluations: [{ ...f.entry, evaluationId: "alias" }],
      },
      join(f.root, "alias"),
    ),
  ).rejects.toThrow();
});
