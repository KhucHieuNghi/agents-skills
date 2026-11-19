import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { evaluateEnterpriseFunnels } from "../scripts/enterprise-journeys/workflow.mjs";

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "journey-workflow-"));
  const fixture = JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/commerce.json",
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
  const bundle = {
    sourceDigest: enterpriseDigest(run),
    newRunId: "assessed",
    assessmentAt,
    evaluations: [entry],
  };
  return { root, run, entry, bundle };
}
it("projects retained funnel denominators into all report formats without passing UX or exposing raw exports", async () => {
  const f = await setup();
  const result = await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(run.checks.length).toBe(f.run.checks.length + 1);
  expect(
    run.checks
      .filter((c) => c.moduleId === "ux-cro")
      .every((c) => c.status === "unknown"),
  ).toBe(true);
  expect(
    result.observations.find((o) => o.label.endsWith("retention")).value,
  ).toEqual({ numerator: 24, denominator: 80 });
  expect(result.findings).toEqual([]);
  const report = buildEnterpriseReport(run, {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "r1",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: result.observations,
    narrative: [],
    decisions: [],
  });
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  expect(JSON.stringify(report)).not.toContain("artifactText");
  for (const filename of ["report.md", "report.html"])
    expect(await readFile(join(f.root, "report", filename), "utf8")).toContain(
      "synthetic",
    );
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("reassesses untouched funnels at expiry and retains prior observations as historical", async () => {
  const f = await setup();
  const first = await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const second = await evaluateEnterpriseFunnels(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(run),
      newRunId: "expired",
      assessmentAt: "2026-11-05T00:00:00Z",
      evaluations: [f.entry],
    },
    join(f.root, "expired"),
  );
  expect(
    second.observations.filter((o) => o.classification === "historical"),
  ).toHaveLength(first.observations.length);
  expect(
    second.observations
      .filter((o) => o.classification === "current")
      .every((o) => o.value === null),
  ).toBe(true);
  const next = await loadEnterpriseRun(join(f.root, "expired"));
  expect(
    next.dataRequests.some((r) => r.requestedArtifact.startsWith("ux-funnel-")),
  ).toBe(true);
});
it("rejects rebinding evaluation identity and preserves the destination on failure", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  f.entry.context.population.device = "desktop";
  await expect(
    evaluateEnterpriseFunnels(
      join(f.root, "assessed"),
      { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "bad" },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await expect(access(join(f.root, "bad"))).rejects.toThrow();
});
it("preserves declined requests, intake placeholders and other module checks across revisions", async () => {
  const f = await setup();
  f.entry.sources = [];
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  const request = prior.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("ux-funnel-"),
  );
  request.status = "declined";
  request.reason = "Customer declined exporting this cohort";
  await saveEnterpriseRun(join(f.root, "declined"), prior);
  await evaluateEnterpriseFunnels(
    join(f.root, "declined"),
    { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
    join(f.root, "next"),
  );
  const next = await loadEnterpriseRun(join(f.root, "next"));
  expect(
    next.dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ),
  ).toMatchObject({ status: "declined", reason: request.reason });
  for (const check of f.run.checks)
    expect(next.checks.find((c) => c.checkId === check.checkId)).toEqual(check);
});
it("rejects a forged cached index even after the enterprise manifest is recomputed", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  prior.funnelEvaluations[0].evaluationId = "foreign";
  await saveEnterpriseRun(join(f.root, "forged"), prior);
  await expect(
    evaluateEnterpriseFunnels(
      join(f.root, "forged"),
      { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
      join(f.root, "next"),
    ),
  ).rejects.toThrow();
});
it("retains an invalid evidence response and its reason during unchanged replay", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  const request = prior.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("ux-funnel-"),
  );
  request.status = "invalid";
  request.reason = "Supplied research used the wrong cohort";
  await saveEnterpriseRun(join(f.root, "responded"), prior);
  await evaluateEnterpriseFunnels(
    join(f.root, "responded"),
    { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
    join(f.root, "next"),
  );
  expect(
    (await loadEnterpriseRun(join(f.root, "next"))).dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ),
  ).toMatchObject({ status: "invalid", reason: request.reason });
});
it("rejects aliases of one scope and never overwrites a source directory", async () => {
  const f = await setup();
  await expect(
    evaluateEnterpriseFunnels(
      join(f.root, "initial"),
      {
        ...f.bundle,
        evaluations: [f.entry, { ...f.entry, evaluationId: "alias" }],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await expect(
    evaluateEnterpriseFunnels(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "initial"),
    ),
  ).rejects.toThrow();
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("replays untouched evaluations when a different journey is added", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  const second = structuredClone(f.entry);
  second.evaluationId = "other";
  second.context.journeyId = "other";
  second.sources = [];
  const result = await evaluateEnterpriseFunnels(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      evaluations: [second],
      sourceDigest: enterpriseDigest(prior),
      newRunId: "next",
      assessmentAt: "2026-11-05T00:00:00Z",
    },
    join(f.root, "next"),
  );
  expect(
    result.observations.filter((o) => o.classification === "current"),
  ).toHaveLength(8);
  expect(
    result.observations
      .filter((o) => o.classification === "current")
      .every((o) => o.value === null),
  ).toBe(true);
  expect(
    (await loadEnterpriseRun(join(f.root, "next"))).funnelEvaluations,
  ).toHaveLength(2);
});
it("rejects foreign historical evidence even when its inner funnel export is valid", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  const foreign = structuredClone(
    prior.evidence.find((e) => e.artifactType === "ux-funnel-evaluation"),
  );
  foreign.evidenceId = "unrelated-evidence";
  foreign.source = "other-importer";
  foreign.windowId = "wrong-window";
  prior.evidence.push(foreign);
  await saveEnterpriseRun(join(f.root, "forged"), prior);
  await expect(
    evaluateEnterpriseFunnels(
      join(f.root, "forged"),
      { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
      join(f.root, "next"),
    ),
  ).rejects.toThrow();
});
it("retains provided response bindings until their own evidence expires", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  const request = prior.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("ux-funnel-"),
  );
  const content = {
    note: "Synthetic scoped research response; not semantic acceptance",
  };
  const evidence = {
    evidenceId: "response",
    customerId: prior.customerId,
    runId: prior.runId,
    entityId: "site",
    source: "synthetic-owner",
    artifactType: request.requestedArtifact,
    scopeKey: request.scopeKey,
    windowId: request.windowId,
    observedAt: prior.assessmentAt,
    validUntil: "2026-11-04T00:00:00Z",
    digest: enterpriseDigest(content),
    content,
  };
  prior.evidence.push(evidence);
  request.status = "provided";
  request.evidenceIds = [evidence.evidenceId];
  request.evidenceDigests = { response: evidence.digest };
  await saveEnterpriseRun(join(f.root, "provided"), prior);
  await evaluateEnterpriseFunnels(
    join(f.root, "provided"),
    { ...f.bundle, sourceDigest: enterpriseDigest(prior), newRunId: "next" },
    join(f.root, "next"),
  );
  const next = await loadEnterpriseRun(join(f.root, "next"));
  expect(
    next.dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ),
  ).toMatchObject({
    status: "provided",
    evidenceIds: ["response"],
    evidenceDigests: request.evidenceDigests,
  });
  await evaluateEnterpriseFunnels(
    join(f.root, "next"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(next),
      newRunId: "expired",
      assessmentAt: "2026-11-05T00:00:00Z",
    },
    join(f.root, "expired"),
  );
  expect(
    (await loadEnterpriseRun(join(f.root, "expired"))).dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ).status,
  ).toBe("expired");
});
it("rejects an omitted active index before an alias can duplicate funnel checks", async () => {
  const f = await setup();
  await evaluateEnterpriseFunnels(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const prior = await loadEnterpriseRun(join(f.root, "assessed"));
  prior.funnelEvaluations = [];
  await saveEnterpriseRun(join(f.root, "forged"), prior);
  await expect(
    evaluateEnterpriseFunnels(
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
