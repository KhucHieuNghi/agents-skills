import { mkdtemp, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  saveEnterpriseRun,
  loadEnterpriseRun,
  enterpriseDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseTechnicalSeo } from "../scripts/enterprise-technical-seo/workflow.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "technicalSeo-report-"));
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: "2026-11-19T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  const context = {
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/",
    stateId: "anonymous",
    profileId: "mobile",
    maxAgeSeconds: 3600,
    expectedCanonical: null,
  };
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: run.customerId,
      entityId: "site",
      environment: "production",
      targetUrl: context.targetUrl,
      stateId: context.stateId,
      profileId: context.profileId,
    },
    capturedAt: "2026-11-19T11:30:00Z",
    layers: {
      sourceHead: {
        complete: true,
        targets: ["https://example.com/PRIVATE_TARGET"],
      },
      renderedHead: { complete: true, targets: ["https://example.com/other"] },
      httpLink: { complete: true, targets: [] },
    },
  };
  const artifactText = JSON.stringify(raw);
  const entry = {
    evaluationId: "canonical-phone",
    kind: "canonical",
    window: { from: "2026-11-19T11:00:00Z", to: "2026-11-19T12:00:00Z" },
    context,
    sources: [
      {
        sourceId: "native",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      },
    ],
  };
  const bundle = {
    sourceDigest: enterpriseDigest(run),
    newRunId: "assessed",
    assessmentAt: run.assessmentAt,
    evaluations: [entry],
  };
  return { root, run, entry, bundle };
}
function reportBundle(run, result, extra = {}) {
  return {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report",
    generatedAt: run.assessmentAt,
    authorId: "author",
    brand: { name: "Synthetic customer", accent: "#174f7b" },
    findings: result.findings,
    actions: [],
    observations: result.observations,
    narrative: [],
    decisions: [],
    ...extra,
  };
}
it("projects canonical conflicts and unknowns through canonical reports without raw leakage", async () => {
  const f = await setup(),
    result = await evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    ),
    run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(result.findings).toHaveLength(1);
  expect(run.checks).toHaveLength(f.run.checks.length + 4);
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .map((c) => c.status)
      .sort(),
  ).toEqual(["fail", "pass", "unknown", "unknown"]);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE_");
    expect(text).not.toContain("private-selector");
    expect(text).toContain("single-supplied-capture");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("reassesses expiry immutably and keeps historical report snapshots", async () => {
  const f = await setup(),
    first = await evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "first"),
    );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  const parent = buildEnterpriseReport(old, reportBundle(old, first));
  const second = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "first"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(old),
      newRunId: "expired",
      assessmentAt: "2026-11-19T12:30:00Z",
    },
    join(f.root, "expired"),
  );
  const run = await loadEnterpriseRun(join(f.root, "expired"));
  expect(second.findings).toEqual([]);
  expect(run.history.some((x) => x.check.status === "fail")).toBe(true);
  const report = buildEnterpriseReport(
    run,
    reportBundle(run, second, {
      revisionId: "report-2",
      parentReportDigest: enterpriseDigest(parent),
      observations: [...parent.observations, ...second.observations],
    }),
    parent,
  );
  await saveEnterpriseReport(join(f.root, "report-2"), report);
  expect(
    (await loadEnterpriseReport(join(f.root, "report-2"))).observations,
  ).toHaveLength(2);
});
it.each(["missing-index", "foreign-index", "duplicate-index", "forged-row"])(
  "rejects %s before writing output",
  async (kind) => {
    const f = await setup();
    await evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "first"),
    );
    const run = await loadEnterpriseRun(join(f.root, "first"));
    if (kind === "missing-index") run.technicalSeoEvaluations = [];
    if (kind === "foreign-index")
      run.technicalSeoEvaluations[0].evidenceId = run.evidence.find(
        (e) => e.artifactType !== "canonical-evaluation",
      ).evidenceId;
    if (kind === "duplicate-index")
      run.technicalSeoEvaluations.push({ ...run.technicalSeoEvaluations[0] });
    if (kind === "forged-row") {
      const check = run.checks.find(
          (c) => c.ruleId.startsWith("canonical-eval-") && c.status === "fail",
        ),
        e = run.evidence.find((e) => e.evidenceId === check.evidenceIds[0]);
      e.content.row.status = "pass";
      e.digest = enterpriseDigest(e.content);
      e.evidenceId = "canonical-row-" + e.digest;
      check.evidenceIds = [e.evidenceId];
      check.dependencies = [e.evidenceId];
      check.status = "pass";
    }
    await saveEnterpriseRun(join(f.root, "tampered"), run);
    await expect(
      evaluateEnterpriseTechnicalSeo(
        join(f.root, "tampered"),
        { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "next" },
        join(f.root, "rejected"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "rejected"))).rejects.toThrow();
  },
);
it("rejects scope rebinding and extra authority keys", async () => {
  const f = await setup();
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      { ...f.bundle, host: { trusted: true } },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  f.entry.context.stateId = "other";

  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "first"),
      { ...f.bundle, sourceDigest: enterpriseDigest(old), newRunId: "rebound" },
      join(f.root, "bad-scope"),
    ),
  ).rejects.toThrow(/scope/i);
});

it("rebuilds retained evaluations at expiry and preserves declined requests", async () => {
  const f = await setup();
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  const request = old.dataRequests.find((r) =>
    r.requestedArtifact.endsWith("provider-index-state"),
  );
  request.status = "declined";
  request.reason = "Owner declined provider access";
  await saveEnterpriseRun(join(f.root, "declined"), old);
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "declined"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(old),
      newRunId: "expired",
      assessmentAt: "2026-11-19T12:30:00Z",
      evaluations: [],
    },
    join(f.root, "expired"),
  );
  expect(result.findings).toEqual([]);
  const next = await loadEnterpriseRun(join(f.root, "expired"));
  expect(next.technicalSeoEvaluations).toHaveLength(1);
  expect(
    next.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
  expect(
    next.dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ).status,
  ).toBe("declined");
});
it("rejects paired index and check deletion while retaining source evidence", async () => {
  const f = await setup();
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  old.technicalSeoEvaluations = [];
  old.checks = old.checks.filter(
    (c) => !c.ruleId.startsWith("canonical-eval-"),
  );
  old.dataRequests = old.dataRequests.filter(
    (r) => !r.requestedArtifact.startsWith("canonical-eval-"),
  );
  await saveEnterpriseRun(join(f.root, "tampered"), old);
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "tampered"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(old),
        newRunId: "next",
        evaluations: [],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/index/i);
  await expect(access(join(f.root, "bad"))).rejects.toThrow();
});
it("allows explicit owner-policy revision without changing page scope", async () => {
  const f = await setup();
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  f.entry.context.expectedCanonical = "https://example.com/";
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "first"),
    { ...f.bundle, sourceDigest: enterpriseDigest(old), newRunId: "policy" },
    join(f.root, "policy"),
  );
  expect(result.findings).toHaveLength(2);
  expect(enterpriseDigest(await loadEnterpriseRun(join(f.root, "first")))).toBe(
    enterpriseDigest(old),
  );
});
it("rejects duplicate populations, out-of-window captures and foreign source scope", async () => {
  for (const kind of ["duplicate", "window", "foreign"]) {
    const f = await setup();
    if (kind === "duplicate")
      f.bundle.evaluations.push({
        ...structuredClone(f.entry),
        evaluationId: "overlap",
      });
    if (kind === "window") f.entry.window.from = "2026-11-19T11:35:00Z";
    if (kind === "foreign") {
      const raw = JSON.parse(f.entry.sources[0].artifactText);
      raw.scope.customerId = "other";
      f.entry.sources[0].artifactText = JSON.stringify(raw);
      f.entry.sources[0].artifactHash = createHash("sha256")
        .update(f.entry.sources[0].artifactText)
        .digest("hex");
    }
    await expect(
      evaluateEnterpriseTechnicalSeo(
        join(f.root, "initial"),
        f.bundle,
        join(f.root, "bad"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "bad"))).rejects.toThrow();
  }
});

it("retains a same-time owner-policy revert as a new revision occurrence", async () => {
  const f = await setup();
  let source = join(f.root, "initial"),
    old = f.run;
  for (const [runId, policy] of [
    ["a", null],
    ["b", "https://example.com/"],
    ["c", null],
  ]) {
    f.entry.context.expectedCanonical = policy;
    await evaluateEnterpriseTechnicalSeo(
      source,
      { ...f.bundle, sourceDigest: enterpriseDigest(old), newRunId: runId },
      join(f.root, runId),
    );
    source = join(f.root, runId);
    old = await loadEnterpriseRun(source);
  }
  await evaluateEnterpriseTechnicalSeo(
    source,
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(old),
      newRunId: "replayed",
      evaluations: [],
    },
    join(f.root, "replayed"),
  );
  expect(
    (await loadEnterpriseRun(join(f.root, "replayed"))).technicalSeoEvaluations,
  ).toHaveLength(1);
});

it("bounds the retained population across incremental revisions", async () => {
  const f = await setup();
  const entry = (i) => {
    const e = structuredClone(f.entry);
    e.evaluationId = `capture-${i}`;
    e.context.profileId = `profile-${i}`;
    const raw = JSON.parse(e.sources[0].artifactText);
    raw.scope.profileId = e.context.profileId;
    e.sources[0].artifactText = JSON.stringify(raw);
    e.sources[0].artifactHash = createHash("sha256")
      .update(e.sources[0].artifactText)
      .digest("hex");
    return e;
  };
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    {
      ...f.bundle,
      evaluations: Array.from({ length: 50 }, (_, i) => entry(i)),
    },
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "first"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(old),
        newRunId: "overflow",
        evaluations: [entry(50)],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/limit|budget/i);
  await expect(access(join(f.root, "bad"))).rejects.toThrow();
});

it("projects provider inspection separately and replays expiry without a live-index claim", async () => {
  const f = await setup();
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: f.run.customerId,
      entityId: "site",
      environment: "production",
    },
    request: {
      inspectionUrl: "https://example.com/",
      siteUrl: "sc-domain:example.com",
    },
    retrievedAt: "2026-11-19T11:30:00Z",
    response: {
      inspectionResult: {
        indexStatusResult: {
          verdict: "PASS",
          googleCanonical: "https://example.com/PRIVATE_PROVIDER_TARGET",
          userCanonical: "https://example.com/",
          lastCrawlTime: "2026-11-18T10:00:00Z",
          coverageState: "PRIVATE_PROVIDER_TEXT",
        },
      },
    },
  };
  const artifactText = JSON.stringify(raw);
  const entry = {
    evaluationId: "provider",
    kind: "gsc-url-inspection",
    window: f.entry.window,
    context: {
      entityId: "site",
      environment: "production",
      targetUrl: "https://example.com/",
      property: "sc-domain:example.com",
      maxAgeSeconds: 3600,
      expectedIndexed: true,
      expectedCanonical: "https://example.com/",
    },
    sources: [
      {
        sourceId: "provider",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      },
    ],
  };
  const first = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [entry] },
    join(f.root, "first"),
  );
  expect(first.findings).toHaveLength(1);
  const run = await loadEnterpriseRun(join(f.root, "first"));
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .map((c) => c.status)
      .sort(),
  ).toEqual(["fail", "pass"]);
  const report = buildEnterpriseReport(run, reportBundle(run, first));
  await saveEnterpriseReport(join(f.root, "report"), report);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE_PROVIDER");
    expect(text).toContain("provider verdict PASS");
    expect(text).toContain("not a live URL test");
  }
  const second = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "first"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(run),
      newRunId: "expired",
      assessmentAt: "2026-11-19T12:30:00Z",
      evaluations: [],
    },
    join(f.root, "expired"),
  );
  expect(second.findings).toEqual([]);
});
it("does not publish unsupported provider verdict text", async () => {
  const f = await setup();
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: f.run.customerId,
      entityId: "site",
      environment: "production",
    },
    request: {
      inspectionUrl: "https://example.com/",
      siteUrl: "sc-domain:example.com",
    },
    retrievedAt: "2026-11-19T11:30:00Z",
    response: {
      inspectionResult: {
        indexStatusResult: { verdict: "PRIVATE_PROVIDER_SENTINEL" },
      },
    },
  };
  const artifactText = JSON.stringify(raw);
  const entry = {
    evaluationId: "provider",
    kind: "gsc-url-inspection",
    window: f.entry.window,
    context: {
      entityId: "site",
      environment: "production",
      targetUrl: "https://example.com/",
      property: "sc-domain:example.com",
      maxAgeSeconds: 3600,
      expectedIndexed: true,
      expectedCanonical: null,
    },
    sources: [
      {
        sourceId: "provider",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      },
    ],
  };
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [entry] },
    join(f.root, "first"),
  );
  const run = await loadEnterpriseRun(join(f.root, "first")),
    report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report)).not.toContain("PRIVATE_PROVIDER_SENTINEL");
  expect(JSON.stringify(result.observations)).not.toContain(
    "PRIVATE_PROVIDER_SENTINEL",
  );
});
it("reports index controls with separate robots expiry and no provider indexing claim", async () => {
  const f = await setup();
  const context = {
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/",
    profileId: "mobile",
    stateId: "anonymous",
    crawler: "googlebot",
    maxAgeSeconds: 3600,
    expectedCrawlAllowed: true,
    expectedIndexable: true,
    expectedHttpStatus: 200,
  };
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: f.run.customerId,
      entityId: "site",
      environment: "production",
      targetUrl: context.targetUrl,
      profileId: "mobile",
      stateId: "anonymous",
    },
    capturedAt: "2026-11-19T11:30:00Z",
    response: { url: context.targetUrl, status: 200 },
    robots: {
      url: "https://example.com/robots.txt",
      capturedAt: "2026-11-19T11:00:00Z",
      status: 200,
      body: "User-agent: *\nAllow: /\n# PRIVATE_ROBOTS",
      complete: true,
    },
    sourceDocument: {
      complete: true,
      meta: [{ name: "robots", content: "noindex" }],
    },
    renderedDocument: { complete: true, meta: [] },
    httpHeaders: { complete: true, values: [] },
  };
  const artifactText = JSON.stringify(raw),
    entry = {
      evaluationId: "controls",
      kind: "index-controls",
      window: f.entry.window,
      context,
      sources: [
        {
          sourceId: "controls",
          artifactText,
          artifactHash: createHash("sha256").update(artifactText).digest("hex"),
        },
      ],
    };
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [entry] },
    join(f.root, "first"),
  );
  expect(result.findings).toHaveLength(1);
  const run = await loadEnterpriseRun(join(f.root, "first"));
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .map((c) => c.status)
      .sort(),
  ).toEqual(["fail", "pass", "unknown", "unknown"]);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(
    JSON.stringify(await loadEnterpriseReport(join(f.root, "report"))),
  ).not.toContain("PRIVATE_ROBOTS");
  entry.window.from = "2026-11-19T11:15:00Z";
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      { ...f.bundle, evaluations: [entry] },
      join(f.root, "bad-robots-window"),
    ),
  ).rejects.toThrow(/window/);
});
