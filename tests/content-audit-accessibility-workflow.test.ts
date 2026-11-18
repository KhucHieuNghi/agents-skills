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
  enterpriseReviewTargetDigest,
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseAccessibility } from "../scripts/enterprise-accessibility/workflow.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "accessibility-report-"));
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
    stateId: "initial",
    viewport: { width: 390, height: 844 },
    maxAgeSeconds: 3600,
    expectedRuleIds: ["button-name"],
  };
  const raw = {
    testEngine: { name: "axe-core", version: "4.14.1" },
    testEnvironment: {
      userAgent: "PRIVATE_BROWSER_431",
      windowWidth: 390,
      windowHeight: 844,
    },
    url: context.targetUrl,
    timestamp: "2026-11-19T11:30:00Z",
    toolOptions: { reporter: "v1" },
    violations: [
      {
        id: "button-name",
        tags: [],
        nodes: [
          {
            html: "PRIVATE_HTML_431",
            target: ["#private-selector"],
            any: [],
            all: [],
            none: [],
          },
        ],
      },
    ],
    passes: [],
    incomplete: [],
    inapplicable: [],
  };
  const artifactText = JSON.stringify(raw);
  const source = {
    sourceId: "native",
    sourceKind: "axe-results",
    scope: {
      customerId: run.customerId,
      entityId: "site",
      environment: "production",
      stateId: "initial",
      viewport: context.viewport,
    },
    capturedAt: "2026-11-19T11:40:00Z",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
  const entry = {
    evaluationId: "axe-phone",
    kind: "axe",
    window: { from: "2026-11-19T11:00:00Z", to: "2026-11-19T12:00:00Z" },
    context,
    sources: [source],
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
it("projects axe failures and coverage gaps through canonical reports without raw leakage", async () => {
  const f = await setup(),
    result = await evaluateEnterpriseAccessibility(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    ),
    run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(result.findings).toHaveLength(1);
  expect(run.checks).toHaveLength(f.run.checks.length + 2);
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("accessibility-eval-"))
      .map((c) => c.status)
      .sort(),
  ).toEqual(["fail", "unknown"]);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE_");
    expect(text).not.toContain("private-selector");
    expect(text).toContain("reported-tested-elements");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("reassesses expiry immutably and keeps historical report snapshots", async () => {
  const f = await setup(),
    first = await evaluateEnterpriseAccessibility(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "first"),
    );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  const parent = buildEnterpriseReport(old, reportBundle(old, first));
  const second = await evaluateEnterpriseAccessibility(
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
    await evaluateEnterpriseAccessibility(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "first"),
    );
    const run = await loadEnterpriseRun(join(f.root, "first"));
    if (kind === "missing-index") run.accessibilityEvaluations = [];
    if (kind === "foreign-index")
      run.accessibilityEvaluations[0].evidenceId = run.evidence.find(
        (e) => e.artifactType !== "accessibility-evaluation",
      ).evidenceId;
    if (kind === "duplicate-index")
      run.accessibilityEvaluations.push({ ...run.accessibilityEvaluations[0] });
    if (kind === "forged-row") {
      const check = run.checks.find(
          (c) =>
            c.ruleId.startsWith("accessibility-eval-") && c.status === "fail",
        ),
        e = run.evidence.find((e) => e.evidenceId === check.evidenceIds[0]);
      e.content.row.status = "pass";
      e.digest = enterpriseDigest(e.content);
      e.evidenceId = "accessibility-row-" + e.digest;
      check.evidenceIds = [e.evidenceId];
      check.dependencies = [e.evidenceId];
      check.status = "pass";
    }
    await saveEnterpriseRun(join(f.root, "tampered"), run);
    await expect(
      evaluateEnterpriseAccessibility(
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
    evaluateEnterpriseAccessibility(
      join(f.root, "initial"),
      { ...f.bundle, host: { trusted: true } },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  f.entry.context.stateId = "other";
  f.entry.sources[0].scope.stateId = "other";
  await expect(
    evaluateEnterpriseAccessibility(
      join(f.root, "first"),
      { ...f.bundle, sourceDigest: enterpriseDigest(old), newRunId: "rebound" },
      join(f.root, "bad-scope"),
    ),
  ).rejects.toThrow(/scope/i);
});

function scenarioEntry(f) {
  const context = {
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/",
    viewport: { width: 390, height: 844 },
    journeyId: "booking",
    protocolId: "test-booking",
    protocolVersion: 1,
    maxAgeSeconds: 3600,
    requiredSteps: [
      {
        stepId: "submit",
        stateId: "invalid",
        ruleIds: ["error-identification", "journey-outcome"],
        expectedOutcomeScope: "sandbox",
      },
    ],
  };
  const scope = { ...context, customerId: f.run.customerId };
  delete scope.maxAgeSeconds;
  delete scope.requiredSteps;
  const text = "PRIVATE_TRACE_431",
    sha = (x) => createHash("sha256").update(x).digest("hex"),
    fact = (value) => ({ value, attachmentIds: ["source"] });
  const payload = {
    schemaVersion: 1,
    scope,
    author: { authorId: "source-author", authorType: "ai-assisted" },
    browser: { name: "Chromium", version: "156" },
    assistiveTechnology: null,
    startedAt: "2026-11-19T11:00:00Z",
    finishedAt: "2026-11-19T11:50:00Z",
    attachments: [
      {
        attachmentId: "source",
        kind: "review-note",
        observedAt: "2026-11-19T11:40:00Z",
        artifactText: text,
        artifactHash: sha(text),
      },
    ],
    steps: [
      {
        stepId: "submit",
        stateId: "invalid",
        observedAt: "2026-11-19T11:45:00Z",
        inputMode: "keyboard",
        actionId: "submit",
        attachmentIds: ["source"],
        facts: {
          automaticInputErrorDetected: fact(true),
          affectedItemIdentified: fact(true),
          errorDescribedInText: fact(false),
          actionAttempted: fact(true),
          terminalOutcome: fact("rejected"),
          outcomeScope: fact("sandbox"),
          outcomeEvidenceReviewed: fact(true),
        },
      },
    ],
  };
  const artifactText = JSON.stringify(payload);
  return {
    evaluationId: "scenario-phone",
    kind: "scenario",
    window: f.entry.window,
    context,
    sources: [
      {
        sourceId: "trace",
        sourceKind: "accessibility-scenario-v1",
        capturedAt: "2026-11-19T11:55:00Z",
        artifactText,
        artifactHash: sha(artifactText),
      },
    ],
  };
}
it("maps scenario criteria and product outcomes separately with explicit sandbox labels", async () => {
  const f = await setup();
  f.bundle.evaluations.push(scenarioEntry(f));
  const r = await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(r.findings).toHaveLength(3);
  const diagnostic = run.checks.find(
    (c) => c.moduleId === "ux-cro" && c.status === "fail",
  );
  expect(diagnostic.reason).toContain("expected outcome scope sandbox");
  expect(diagnostic.reason).toContain("product diagnostic");
  const report = buildEnterpriseReport(run, reportBundle(run, r));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(JSON.stringify(report)).not.toContain("PRIVATE_TRACE_431");
  expect(
    (await loadEnterpriseReport(join(f.root, "report"))).findings,
  ).toHaveLength(3);
});
it("rejects paired index and check removal despite retained base evidence", async () => {
  const f = await setup();
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const run = await loadEnterpriseRun(join(f.root, "first"));
  run.accessibilityEvaluations = [];
  run.checks = run.checks.filter(
    (c) => !c.ruleId.startsWith("accessibility-eval-"),
  );
  run.dataRequests = run.dataRequests.filter(
    (r) => !r.requestedArtifact.startsWith("accessibility-eval-"),
  );
  await saveEnterpriseRun(join(f.root, "tampered"), run);
  await expect(
    evaluateEnterpriseAccessibility(
      join(f.root, "tampered"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(run),
        newRunId: "next",
        evaluations: [scenarioEntry(f)],
      },
      join(f.root, "rejected"),
    ),
  ).rejects.toThrow(/index/);
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("rebuilds untouched evaluations and preserves declined requests", async () => {
  const f = await setup();
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const run = await loadEnterpriseRun(join(f.root, "first"));
  const request = run.dataRequests.find((r) =>
    r.requestedArtifact.endsWith("manual-coverage"),
  );
  request.status = "declined";
  request.reason = "Owner declined extra review";
  await saveEnterpriseRun(join(f.root, "declined"), run);
  const r = await evaluateEnterpriseAccessibility(
    join(f.root, "declined"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(run),
      newRunId: "next",
      assessmentAt: "2026-11-19T13:00:00Z",
      evaluations: [scenarioEntry(f)],
    },
    join(f.root, "next"),
  );
  expect(r.findings).toHaveLength(0);
  const next = await loadEnterpriseRun(join(f.root, "next"));
  expect(next.accessibilityEvaluations).toHaveLength(2);
  expect(
    next.dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ).status,
  ).toBe("declined");
});
it("canonicalizes obligation ordering and rejects overlapping populations", async () => {
  const f = await setup();
  f.entry.context.expectedRuleIds.push("color-contrast");
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const run = await loadEnterpriseRun(join(f.root, "first"));
  f.entry.context.expectedRuleIds.reverse();
  await evaluateEnterpriseAccessibility(
    join(f.root, "first"),
    { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "ordered" },
    join(f.root, "ordered"),
  );
  const other = structuredClone(f.entry);
  other.evaluationId = "overlap";
  other.context.expectedRuleIds = ["button-name"];
  await expect(
    evaluateEnterpriseAccessibility(
      join(f.root, "first"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(run),
        newRunId: "bad",
        evaluations: [other],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/population/);
});
it("rejects out-of-window source and existing destination", async () => {
  const f = await setup();
  f.entry.window.from = "2026-11-19T11:35:00Z";
  await expect(
    evaluateEnterpriseAccessibility(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "bad-window"),
    ),
  ).rejects.toThrow(/window/);
  await expect(access(join(f.root, "bad-window"))).rejects.toThrow();
  f.entry.window.from = "2026-11-19T11:00:00Z";
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  await expect(
    evaluateEnterpriseAccessibility(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "first"),
    ),
  ).rejects.toThrow();
});

it("rejects a rollback index even if its old checks remain internally consistent", async () => {
  const f = await setup();
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  await evaluateEnterpriseAccessibility(
    join(f.root, "first"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(old),
      newRunId: "second",
      assessmentAt: "2026-11-19T12:01:00Z",
    },
    join(f.root, "second"),
  );
  const run = await loadEnterpriseRun(join(f.root, "second"));
  run.accessibilityEvaluations = old.accessibilityEvaluations;
  const priorChecks = new Map(
    old.checks
      .filter((c) => c.ruleId.startsWith("accessibility-eval-"))
      .map((c) => [c.checkId, c]),
  );
  run.checks = run.checks.map((c) => priorChecks.get(c.checkId) ?? c);
  await saveEnterpriseRun(join(f.root, "rollback"), run);
  await expect(
    evaluateEnterpriseAccessibility(
      join(f.root, "rollback"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(run),
        newRunId: "third",
        assessmentAt: run.assessmentAt,
      },
      join(f.root, "rejected"),
    ),
  ).rejects.toThrow(/superseded/);
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("requires fresh independent verdict timestamps for a new assessment", async () => {
  const f = await setup();
  await evaluateEnterpriseAccessibility(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const old = await loadEnterpriseRun(join(f.root, "first"));
  const result = await evaluateEnterpriseAccessibility(
    join(f.root, "first"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(old),
      newRunId: "second",
      assessmentAt: "2026-11-19T12:01:00Z",
    },
    join(f.root, "second"),
  );
  const run = await loadEnterpriseRun(join(f.root, "second"));
  const bundle = reportBundle(run, result);
  const draft = buildEnterpriseReport(run, bundle);
  const decision = {
    targetType: "finding",
    targetId: result.findings[0].findingId,
    verdict: "accept",
    reviewerId: "synthetic-independent",
    reviewerType: "independent-ai",
    reviewedAt: "2026-11-19T12:00:00Z",
    reason: "Synthetic review test",
    targetDigest: enterpriseReviewTargetDigest(
      draft,
      "finding",
      result.findings[0].findingId,
    ),
  };
  expect(() =>
    buildEnterpriseReport(run, { ...bundle, decisions: [decision] }),
  ).toThrow(/review/i);
  expect(() =>
    buildEnterpriseReport(run, {
      ...bundle,
      decisions: [{ ...decision, reviewedAt: run.assessmentAt }],
    }),
  ).not.toThrow();
});
