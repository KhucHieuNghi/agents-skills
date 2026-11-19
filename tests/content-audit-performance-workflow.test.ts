import { mkdtemp, access, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
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
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import {
  evaluateEnterprisePerformance,
  mergePerformanceObservations,
} from "../scripts/enterprise-performance/workflow.mjs";

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "performance-report-"));
  const run = resolveAuditContext(
    {
      customerId: "synthetic-performance",
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
    target: { kind: "url", value: "https://example.com/page" },
    formFactor: "PHONE",
    period: { from: "2026-10-21", to: "2026-11-17" },
    maxAgeDays: 7,
    authorizedNormalizedUrls: [],
  };
  const payload = {
    record: {
      key: { url: context.target.value, formFactor: "PHONE" },
      collectionPeriod: {
        firstDate: { year: 2026, month: 10, day: 21 },
        lastDate: { year: 2026, month: 11, day: 17 },
      },
      metrics: {
        largest_contentful_paint: { percentiles: { p75: 5000 } },
        interaction_to_next_paint: { percentiles: { p75: 200 } },
        cumulative_layout_shift: { percentiles: { p75: "0.10" } },
      },
    },
  };
  const source = {
    sourceId: "field",
    sourceKind: "crux-query-record",
    scope: {
      customerId: run.customerId,
      entityId: "site",
      environment: "production",
    },
    request: { target: context.target, formFactor: "PHONE" },
    capturedAt: "2026-11-19T11:00:00Z",
    httpStatus: 200,
    artifactText: "",
    artifactHash: "",
  };
  const encode = (p = payload, s = source) => {
    s.artifactText = JSON.stringify(p);
    s.artifactHash = createHash("sha256").update(s.artifactText).digest("hex");
    return s;
  };
  encode();
  const entry = {
    evaluationId: "field-phone",
    kind: "crux",
    context,
    sources: [source],
  };
  const bundle = {
    sourceDigest: enterpriseDigest(run),
    newRunId: "assessed",
    assessmentAt: run.assessmentAt,
    evaluations: [entry],
  };
  return { root, run, context, payload, source, encode, entry, bundle };
}
function reportBundle(run, result, extra = {}) {
  return {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report-1",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic customer", accent: "#174f7b" },
    findings: result.findings,
    actions: [],
    observations: result.observations,
    narrative: [],
    decisions: [],
    ...extra,
  };
}
it("projects scoped field findings through canonical JSON/Markdown/HTML without leaking native payloads", async () => {
  const f = await setup();
  const result = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(result.findings).toHaveLength(1);
  expect(result.observations).toHaveLength(3);
  expect(run.checks).toHaveLength(f.run.checks.length + 4);
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("performance-"))
      .map((c) => c.status),
  ).toEqual(["fail", "pass", "pass", "fail"]);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  expect(JSON.stringify(report)).not.toContain("artifactText");
  for (const file of ["report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).toContain("Field CrUX LCP p75");
    expect(text).toContain("Scoped field performance threshold exceeded");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("keeps a current failing metric and aggregate failure despite unrelated stale sources", async () => {
  const f = await setup();
  delete f.payload.record.metrics.interaction_to_next_paint;
  f.encode();
  const older = structuredClone(f.source),
    p = structuredClone(f.payload);
  older.sourceId = "old";
  p.record.collectionPeriod.firstDate.day = 10;
  p.record.collectionPeriod.lastDate.day = 6;
  p.record.metrics.interaction_to_next_paint = { percentiles: { p75: 200 } };
  f.encode(p, older);
  f.entry.sources.push(older);
  await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(
    run.checks.find((c) => c.ruleId.endsWith("cwv-all-three-v1")).status,
  ).toBe("fail");
  expect(run.checks.find((c) => c.ruleId.endsWith("cwv-inp-p75")).status).toBe(
    "unknown",
  );
});
it("expires at the exact canonical boundary and produces actionable unknown requests", async () => {
  const f = await setup();
  f.bundle.assessmentAt = "2026-11-25T08:00:00Z";
  const result = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(result.findings).toEqual([]);
  expect(
    result.observations.every((o) => o.classification === "historical"),
  ).toBe(true);
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("performance-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
  expect(
    run.dataRequests
      .filter((r) => r.requestedArtifact.startsWith("performance-field-phone-"))
      .every((r) => r.exportInstructions.includes("https://example.com/page")),
  ).toBe(true);
});
it("reassesses immutably, archives old verdicts and preserves declined requests", async () => {
  const f = await setup();
  delete f.payload.record.metrics.interaction_to_next_paint;
  f.encode();
  const first = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  let run = await loadEnterpriseRun(join(f.root, "assessed"));
  const pending = run.dataRequests.find((r) =>
    r.requestedArtifact.endsWith("cwv-inp-p75"),
  );
  pending.status = "declined";
  pending.reason = "Owner declined this export";
  await saveEnterpriseRun(join(f.root, "declined"), run);
  const sourceDigest = enterpriseDigest(run);
  const parent = buildEnterpriseReport(run, reportBundle(run, first));
  const nextBundle = {
    ...f.bundle,
    sourceDigest,
    newRunId: "reassessed",
    assessmentAt: "2026-11-19T13:00:00Z",
  };
  const next = await evaluateEnterprisePerformance(
    join(f.root, "declined"),
    nextBundle,
    join(f.root, "reassessed"),
  );
  run = await loadEnterpriseRun(join(f.root, "reassessed"));
  expect(run.history.some((h) => h.check.status === "fail")).toBe(true);
  expect(
    run.dataRequests.find((r) => r.requestedArtifact.endsWith("cwv-inp-p75"))
      .status,
  ).toBe("declined");
  const observations = mergePerformanceObservations(
    run,
    parent.observations,
    next.observations,
  );
  expect(
    observations.slice(0, 2).every((o) => o.classification === "historical"),
  ).toBe(true);
  const revised = buildEnterpriseReport(
    run,
    reportBundle(run, next, {
      revisionId: "report-2",
      parentReportDigest: enterpriseDigest(parent),
      observations,
    }),
    parent,
  );
  await saveEnterpriseReport(join(f.root, "report-2"), revised);
  expect(
    (await loadEnterpriseReport(join(f.root, "report-2"))).observations,
  ).toHaveLength(4);
});
it("rejects stale reviewer timestamps even for an unchanged reviewed finding", async () => {
  const f = await setup();
  const first = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const oldRun = await loadEnterpriseRun(join(f.root, "assessed"));
  const nextBundle = {
    ...f.bundle,
    sourceDigest: enterpriseDigest(oldRun),
    newRunId: "reassessed",
    assessmentAt: "2026-11-19T13:00:00Z",
  };
  const next = await evaluateEnterprisePerformance(
    join(f.root, "assessed"),
    nextBundle,
    join(f.root, "reassessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "reassessed"));
  const bundle = reportBundle(run, next);
  const draft = buildEnterpriseReport(run, bundle);
  const decision = {
    targetType: "finding",
    targetId: next.findings[0].findingId,
    verdict: "accept",
    reviewerId: "independent",
    reviewerType: "independent-ai",
    reviewedAt: "2026-11-19T12:30:00Z",
    reason: "Scoped supplied metric reviewed",
    targetDigest: enterpriseReviewTargetDigest(
      draft,
      "finding",
      next.findings[0].findingId,
    ),
  };
  expect(first.findings[0].findingId).toBe(next.findings[0].findingId);
  expect(() =>
    buildEnterpriseReport(run, { ...bundle, decisions: [decision] }),
  ).toThrow(/Invalid independent review attribution/);
  expect(() =>
    buildEnterpriseReport(run, {
      ...bundle,
      decisions: [{ ...decision, reviewedAt: run.assessmentAt }],
    }),
  ).not.toThrow();
});
it("rejects injected verdicts, scope changes, duplicate populations and altered bytes before creating output", async () => {
  for (const kind of [
    "verdict",
    "host",
    "scope",
    "bytes",
    "duplicate",
    "context",
  ]) {
    const f = await setup();
    if (kind === "verdict") f.entry.result = { status: "pass" };
    if (kind === "host") f.bundle.host = { verifiedRuns: [] };
    if (kind === "scope") f.source.scope.customerId = "other";
    if (kind === "bytes") f.source.artifactText += " ";
    if (kind === "duplicate")
      f.bundle.evaluations.push({
        ...f.entry,
        evaluationId: "another",
        context: { ...f.context, maxAgeDays: 8 },
      });
    if (kind === "context") f.context.assessmentAt = f.bundle.assessmentAt;
    await expect(
      evaluateEnterprisePerformance(
        join(f.root, "initial"),
        f.bundle,
        join(f.root, "rejected"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "rejected"))).rejects.toThrow();
  }
});
it("does not overwrite an existing output or rebind a previous evaluation to another URL", async () => {
  const f = await setup();
  await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  await expect(
    evaluateEnterprisePerformance(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    ),
  ).rejects.toThrow();
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "assessed"))),
  ).toBe(enterpriseDigest(run));
  f.context.target.value = "https://example.com/other";
  f.payload.record.key.url = f.context.target.value;
  f.encode();
  await expect(
    evaluateEnterprisePerformance(
      join(f.root, "assessed"),
      { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "changed" },
      join(f.root, "changed"),
    ),
  ).rejects.toThrow(/rebind/);
});
it("binds each field observation to its own expiry rather than the newest source", async () => {
  const f = await setup();
  const older = structuredClone(f.source),
    p = structuredClone(f.payload);
  older.sourceId = "older";
  p.record.collectionPeriod.firstDate.day = 20;
  p.record.collectionPeriod.lastDate.day = 16;
  f.encode(p, older);
  f.entry.sources.push(older);
  const result = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const o = result.observations.find((x) =>
    x.observationId.endsWith("older-lcp"),
  );
  expect(
    run.evidence.find((e) => e.evidenceId === o.evidenceIds[0]).validUntil,
  ).toBe("2026-11-24T08:00:00.000Z");
});

function labEntry(f) {
  const context = {
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/page",
    formFactor: "mobile",
    window: { from: "2026-11-19T10:00:00Z", to: "2026-11-19T11:00:00Z" },
    maxAgeSeconds: 86400,
    protocolDigest: "a".repeat(64),
  };
  const sources = [],
    verifiedRuns = [];
  for (let i = 1; i <= 3; i++) {
    const payload = {
      lighthouseVersion: "13.6.0",
      gatherMode: "navigation",
      requestedUrl: context.targetUrl,
      mainDocumentUrl: context.targetUrl,
      finalDisplayedUrl: context.targetUrl,
      fetchTime: `2026-11-19T10:0${i}:00Z`,
      runWarnings: [],
      configSettings: {
        formFactor: "mobile",
        throttlingMethod: "simulate",
        throttling: {
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          mobile: true,
          disabled: false,
        },
        disableStorageReset: false,
      },
      environment: {
        hostUserAgent: "Synthetic Chrome",
        networkUserAgent: "Synthetic mobile",
      },
      audits: Object.fromEntries(
        [
          "largest-contentful-paint",
          "first-contentful-paint",
          "total-blocking-time",
          "cumulative-layout-shift",
          "speed-index",
        ].map((key) => [
          key,
          {
            id: key,
            scoreDisplayMode: "numeric",
            numericValue: key === "cumulative-layout-shift" ? 0.1 : 1000 * i,
            numericUnit:
              key === "cumulative-layout-shift" ? "unitless" : "millisecond",
          },
        ]),
      ),
      categories: { performance: { score: 0.9 } },
    };
    const artifactText = JSON.stringify(payload),
      artifactHash = createHash("sha256").update(artifactText).digest("hex");
    const source = {
      sourceId: `lab-${i}`,
      sourceKind: "lighthouse-json",
      scope: structuredClone(f.source.scope),
      capturedAt: "2026-11-19T11:00:00Z",
      artifactText,
      artifactHash,
    };
    sources.push(source);
    verifiedRuns.push({
      runId: `run-${i}`,
      artifactHash,
      startedAt: payload.fetchTime,
      finishedAt: `2026-11-19T10:0${i}:30Z`,
      protocolDigest: context.protocolDigest,
      machineId: "test-runner",
      scope: source.scope,
      targetUrl: context.targetUrl,
      formFactor: "mobile",
    });
  }
  return {
    entry: { evaluationId: "lab-mobile", kind: "lighthouse", context, sources },
    host: { evaluations: { "lab-mobile": { verifiedRuns } } },
  };
}
it("renders field and lab separately and never promotes imported receipts into execution authority", async () => {
  const f = await setup(),
    lab = labEntry(f);
  f.bundle.evaluations.push(lab.entry);
  const result = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(
    run.checks.find((c) => c.ruleId.endsWith("lab-repeat-evidence")).status,
  ).toBe("unknown");
  expect(
    result.observations.some((o) => o.label.startsWith("Lab Lighthouse")),
  ).toBe(true);
  expect(
    result.observations.some((o) => o.label.startsWith("Lab repeated")),
  ).toBe(false);
  expect(result.findings).toHaveLength(1);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  const html = await readFile(join(f.root, "report", "report.html"), "utf8");
  expect(html).toContain("Field CrUX");
  expect(html).toContain("Lab Lighthouse");
  expect(JSON.stringify(report)).not.toContain("artifactText");
  expect(JSON.stringify(report)).not.toContain("verifiedRuns");
});
it("uses live host evidence for lab diagnostics, but does not trust stored receipts on reassessment", async () => {
  const f = await setup(),
    lab = labEntry(f);
  f.bundle.evaluations = [lab.entry];
  const result = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
    lab.host,
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(
    run.checks.find((c) => c.ruleId.endsWith("lab-repeat-evidence")).status,
  ).toBe("unknown");
  expect(
    result.observations.filter((o) => o.label.startsWith("Lab repeated")),
  ).toHaveLength(0);
  expect(
    result.liveCollectorResults[0].result.groups.some(
      (g) => g.statistics !== null,
    ),
  ).toBe(true);
  expect(
    run.evidence
      .filter((e) => e.content?.entry)
      .every((e) => e.content.executionReceiptDigests.length === 0),
  ).toBe(true);
  expect(result.findings).toEqual([]);
  const parent = buildEnterpriseReport(run, reportBundle(run, result));
  const next = await evaluateEnterprisePerformance(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(run),
      newRunId: "reassessed",
      assessmentAt: "2026-11-19T13:00:00Z",
    },
    join(f.root, "reassessed"),
  );
  const newRun = await loadEnterpriseRun(join(f.root, "reassessed"));
  expect(
    newRun.checks.find((c) => c.ruleId.endsWith("lab-repeat-evidence")).status,
  ).toBe("unknown");
  expect(
    next.observations.some((o) => o.label.startsWith("Lab repeated")),
  ).toBe(false);
  const merged = mergePerformanceObservations(
    newRun,
    parent.observations,
    next.observations,
  );
  expect(
    merged
      .filter((o) => o.label.startsWith("Lab repeated"))
      .every((o) => o.classification === "historical"),
  ).toBe(true);
  const revised = buildEnterpriseReport(
    newRun,
    reportBundle(newRun, next, {
      revisionId: "report-2",
      parentReportDigest: enterpriseDigest(parent),
      observations: merged,
    }),
    parent,
  );
  await saveEnterpriseReport(join(f.root, "report-2"), revised);
  await expect(loadEnterpriseReport(join(f.root, "report-2"))).resolves.toEqual(
    revised,
  );
});
it("expires lab eligibility at validUntil without creating a field finding", async () => {
  const f = await setup(),
    lab = labEntry(f);
  f.bundle.evaluations = [lab.entry];
  f.bundle.assessmentAt = "2026-11-20T10:01:00Z";
  const result = await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
    lab.host,
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(
    run.checks.find((c) => c.ruleId.endsWith("lab-repeat-evidence")).status,
  ).toBe("unknown");
  expect(result.findings).toEqual([]);
});

it("rejects a forged persisted index before it can delete unrelated intake checks", async () => {
  const f = await setup();
  const dimensions = { ...f.context };
  delete dimensions.maxAgeDays;
  delete dimensions.authorizedNormalizedUrls;
  f.run.performanceEvaluations = [
    {
      evaluationId: f.entry.evaluationId,
      kind: "crux",
      scopeDigest: enterpriseDigest(["crux", dimensions]),
      evidenceId: "nonexistent",
      checkIds: f.run.checks.map((c) => c.checkId),
      dataRequestArtifacts: f.run.dataRequests.map((r) => r.requestedArtifact),
    },
  ];
  await saveEnterpriseRun(join(f.root, "tampered"), f.run);
  await expect(
    evaluateEnterprisePerformance(
      join(f.root, "tampered"),
      { ...f.bundle, sourceDigest: enterpriseDigest(f.run) },
      join(f.root, "rejected"),
    ),
  ).rejects.toThrow(/index evidence/);
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("validates untouched indexes, scope digests and foreign check/request ownership", async () => {
  for (const kind of [
    "scope",
    "checks",
    "requests",
    "duplicate",
    "untouched",
    "missing-index",
  ]) {
    const f = await setup();
    await evaluateEnterprisePerformance(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    );
    const run = await loadEnterpriseRun(join(f.root, "assessed")),
      index = run.performanceEvaluations[0];
    if (kind === "scope") index.scopeDigest = "0".repeat(64);
    if (kind === "checks") index.checkIds = f.run.checks.map((c) => c.checkId);
    if (kind === "requests")
      index.dataRequestArtifacts = f.run.dataRequests.map(
        (r) => r.requestedArtifact,
      );
    if (kind === "duplicate") run.performanceEvaluations.push({ ...index });
    if (kind === "missing-index") run.performanceEvaluations = [];
    if (kind === "untouched") {
      index.evidenceId = "missing";
      const lab = labEntry(f);
      f.bundle.evaluations = [lab.entry];
    }
    await saveEnterpriseRun(join(f.root, "tampered"), run);
    await expect(
      evaluateEnterprisePerformance(
        join(f.root, "tampered"),
        { ...f.bundle, newRunId: "next", sourceDigest: enterpriseDigest(run) },
        join(f.root, "rejected"),
      ),
    ).rejects.toThrow(/index/i);
    await expect(access(join(f.root, "rejected"))).rejects.toThrow();
  }
});

it("rejects rehashed cached field passes that contradict unchanged raw measurements", async () => {
  const f = await setup();
  await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  for (const check of run.checks.filter((c) => c.status === "fail")) {
    const e = run.evidence.find((e) => e.evidenceId === check.evidenceIds[0]),
      old = e.evidenceId;
    e.content.row.status = "pass";
    e.content.row.reason = "invented pass";
    e.content.row.p75 = 1;
    e.content.row.classification = "good";
    e.digest = enterpriseDigest(e.content);
    e.evidenceId = `performance-check-${e.digest}`;
    check.evidenceIds = [e.evidenceId];
    check.dependencies = [e.evidenceId];
    check.status = "pass";
    check.reason = "invented pass";
    expect(old).not.toBe(e.evidenceId);
  }
  await saveEnterpriseRun(join(f.root, "tampered"), run);
  const lab = labEntry(f);
  await expect(
    evaluateEnterprisePerformance(
      join(f.root, "tampered"),
      {
        ...f.bundle,
        newRunId: "next",
        sourceDigest: enterpriseDigest(run),
        evaluations: [lab.entry],
      },
      join(f.root, "rejected"),
    ),
  ).rejects.toThrow(/cached field/);
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("rebuilds untouched lab evaluations without inheriting stored execution authority", async () => {
  const f = await setup(),
    lab = labEntry(f);
  await evaluateEnterprisePerformance(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [lab.entry] },
    join(f.root, "lab"),
    lab.host,
  );
  const run = await loadEnterpriseRun(join(f.root, "lab"));
  expect(
    run.checks.some(
      (c) => c.ruleId.endsWith("lab-repeat-evidence") && c.status === "unknown",
    ),
  ).toBe(true);
  const result = await evaluateEnterprisePerformance(
    join(f.root, "lab"),
    {
      ...f.bundle,
      newRunId: "next",
      sourceDigest: enterpriseDigest(run),
      assessmentAt: "2026-11-19T13:00:00Z",
    },
    join(f.root, "next"),
  );
  const next = await loadEnterpriseRun(join(f.root, "next"));
  expect(
    next.checks.find((c) => c.ruleId.endsWith("lab-repeat-evidence")).status,
  ).toBe("unknown");
  expect(
    next.dataRequests.some((r) =>
      r.requestedArtifact.endsWith("lab-repeat-evidence"),
    ),
  ).toBe(true);
  expect(
    result.observations.some((o) => o.label.startsWith("Lab repeated")),
  ).toBe(false);
});

it("rejects an oversized source bundle before writing any run", async () => {
  const f = await setup();
  f.source.artifactText = " ".repeat(16 * 1024 * 1024 + 1);
  await expect(
    evaluateEnterprisePerformance(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "rejected"),
    ),
  ).rejects.toThrow(/byte budget/);
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});

it("executes the packaged synthetic example through the CLI and refuses imported host authority", async () => {
  const root = await mkdtemp(join(tmpdir(), "performance-cli-"));
  const example = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-performance.json",
      "utf8",
    ),
  );
  const run = resolveAuditContext(example.config, []);
  await saveEnterpriseRun(join(root, "initial"), run);
  const bundle = {
    sourceDigest: enterpriseDigest(run),
    newRunId: example.newRunId,
    assessmentAt: example.assessmentAt,
    evaluations: example.evaluations,
  };
  const input = join(root, "input.json");
  await writeFile(input, JSON.stringify(bundle));
  const cli = (out) =>
    execFileSync(
      process.execPath,
      [
        "skills/content-search-audit/scripts/audit.mjs",
        "enterprise-performance-evaluate",
        join(root, "initial"),
        input,
        join(root, out),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  const result = JSON.parse(cli("evaluated"));
  expect(result.findings).toHaveLength(1);
  expect(result.observations).toHaveLength(3);
  await writeFile(
    input,
    JSON.stringify({ ...bundle, host: { evaluations: {} } }),
  );
  expect(() => cli("rejected")).toThrow();
  await expect(access(join(root, "rejected"))).rejects.toThrow();
});

it.each(["lab-pass", "missing-request", "observation"])(
  "rejects persisted replay-only performance tampering: %s",
  async (kind) => {
    const f = await setup();
    const lab = labEntry(f);
    f.bundle.evaluations = [lab.entry];
    await evaluateEnterprisePerformance(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    );
    const run = await loadEnterpriseRun(join(f.root, "assessed"));
    if (kind === "lab-pass") {
      const check = run.checks.find(
        (c) => c.ruleId.startsWith("performance-") && c.status === "unknown",
      );
      check.status = "pass";
      check.reason = "forged-success";
      check.assessedAt = run.assessmentAt;
    } else if (kind === "missing-request") {
      const index = run.performanceEvaluations[0];
      run.dataRequests = run.dataRequests.filter(
        (r) => !index.dataRequestArtifacts.includes(r.requestedArtifact),
      );
      index.dataRequestArtifacts = [];
    } else {
      const e = run.evidence.find((e) => e.content?.observation);
      e.content.observation.value = 987654321;
      e.digest = enterpriseDigest(e.content);
      e.evidenceId = `performance-observation-${e.digest}`;
    }
    await saveEnterpriseRun(join(f.root, "tampered"), run);
    await expect(
      evaluateEnterprisePerformance(
        join(f.root, "tampered"),
        { ...f.bundle, newRunId: "next", sourceDigest: enterpriseDigest(run) },
        join(f.root, "rejected"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "rejected"))).rejects.toThrow();
  },
);
