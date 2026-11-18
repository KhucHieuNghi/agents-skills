import Ajv from "ajv";
import addFormats from "ajv-formats";
import { execFileSync } from "node:child_process";
import { saveEnterpriseRun } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  renderEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
  reviseEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";

function fixture() {
  const run = resolveAuditContext(
    {
      customerId: "tenant-private-841",
      runId: "run",
      assessmentAt: "2026-11-18T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  const evidence = {
    evidenceId: "trace",
    customerId: run.customerId,
    runId: run.runId,
    entityId: "site",
    digest: "a".repeat(64),
    source: "supplied-test-trace",
    observedAt: "2026-11-18T11:00:00Z",
    validUntil: "2026-11-19T12:00:00Z",
    content: undefined,
  };
  delete evidence.content;
  run.evidence.push(evidence);
  run.checks[0] = {
    ...run.checks[0],
    status: "fail",
    evidenceIds: ["trace"],
    dependencies: ["trace"],
    assessedAt: run.assessmentAt,
    reason: "Synthetic redirect defect",
  };
  const finding = {
    findingId: "F-1",
    checkId: run.checks[0].checkId,
    evidenceIds: ["trace"],
    severity: "high",
    confidence: "high",
    title: "Redirect broken",
    description: "Observed failure",
    businessImpact: "Visitors cannot reach product",
    recommendation: "Repair the redirect",
    verification: "Retest the declared route",
  };
  const bundle = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report-1",
    generatedAt: "2026-11-18T13:00:00Z",
    authorId: "author",
    brand: { name: "Customer <script>alert(1)</script>", accent: "#14532d" },
    findings: [finding],
    actions: [
      {
        actionId: "A-1",
        findingIds: ["F-1"],
        status: "proposed",
        ownerRole: "Web team",
        effort: "Small estimate",
        description: "Repair redirect",
        verification: "Re-run route",
        dependencies: [],
      },
    ],
    observations: [],
    narrative: [],
    decisions: [],
  };
  return { run, bundle };
}

it("accounts for every module and separates report completeness from assessment coverage", () => {
  const { run, bundle } = fixture();
  const report = buildEnterpriseReport(run, bundle);
  expect(report.coverage.modules).toHaveProperty("tracking");
  expect(report.summary).toMatchObject({
    reportComplete: true,
    assessedChecks: 1,
    unknownChecks: 9,
    failedChecks: 1,
    implementationStatus: "proposed",
    reviewStatus: "pending",
  });
  expect(report.dataRequests).toHaveLength(run.dataRequests.length);
  const artifacts = renderEnterpriseReport(report, "customer");
  expect(JSON.parse(artifacts.json).summary).toEqual(report.summary);
  expect(artifacts.markdown).toContain("Redirect broken");
  expect(artifacts.markdown).not.toMatch(/\|\n\n\|/);
  expect(artifacts.html).toContain("Redirect broken");
  expect(artifacts.html).not.toContain("<script>");
  expect(artifacts.html).toContain("&lt;script&gt;");
  expect(artifacts.html).toContain("Content-Security-Policy");
  expect(renderEnterpriseReport(report, "customer")).toEqual(artifacts);
});

it("keeps historical 40/100 observations explicit rather than summarizing that no citations exist", () => {
  const { run, bundle } = fixture();
  const report = buildEnterpriseReport(run, {
    ...bundle,
    observations: [
      {
        observationId: "O-1",
        label: "Historical citations",
        value: { numerator: 40, denominator: 100 },
        unit: "cited responses / responses",
        classification: "historical",
        precision: "exact",
        period: { from: "2026-10-01", to: "2026-10-31" },
        scopeDescription: "Supplied historical study",
        evidenceIds: ["trace"],
      },
    ],
  });
  expect(report.summary.historicalObservations).toBe(1);
  const outputs = renderEnterpriseReport(report, "customer");
  expect(outputs.markdown).toContain("40/100");
  expect(outputs.html).toContain("40/100");
  expect(outputs.markdown).not.toMatch(/no citations|no measurements/i);
});

it("rejects stale binding, findings without failed checks and actions claiming applied without execution evidence", () => {
  const { run, bundle } = fixture();
  expect(() =>
    buildEnterpriseReport(run, { ...bundle, sourceRunDigest: "0".repeat(64) }),
  ).toThrow(/binding/);
  expect(() =>
    buildEnterpriseReport(run, {
      ...bundle,
      findings: [{ ...bundle.findings[0], checkId: run.checks[1].checkId }],
    }),
  ).toThrow(/failed check/);
  expect(() =>
    buildEnterpriseReport(run, {
      ...bundle,
      actions: [{ ...bundle.actions[0], status: "applied" }],
    }),
  ).toThrow(/proposed/);
  expect(() =>
    buildEnterpriseReport(run, {
      ...bundle,
      decisions: [
        {
          targetType: "finding",
          targetId: "F-1",
          targetDigest: "a".repeat(64),
          reviewerId: "author",
          reviewerType: "independent-ai",
          reviewedAt: bundle.generatedAt,
          verdict: "accept",
          reason: "Fine",
        },
      ],
    }),
  ).toThrow();
});

it("redacts configured confidential text in every output and excludes raw evidence", () => {
  const { run, bundle } = fixture();
  const report = buildEnterpriseReport(run, {
    ...bundle,
    narrative: [
      {
        narrativeId: "N-1",
        kind: "observation",
        text: "Private customer@example.com secret-token-123",
        evidenceIds: ["trace"],
      },
    ],
    sensitiveValues: ["customer@example.com", "secret-token-123"],
  });
  for (const output of Object.values(
    renderEnterpriseReport(report, "customer"),
  )) {
    expect(JSON.stringify(output)).not.toContain("customer@example.com");
    expect(JSON.stringify(output)).not.toContain("secret-token-123");
  }
  const publicFiles = renderEnterpriseReport(report, "public");
  expect(publicFiles.json).not.toContain("Private");
  expect(publicFiles.markdown).not.toContain(run.customerId);
  expect(JSON.parse(publicFiles.json).edition).toBe("public");
});

it("does not copy unknown source fields or payloads into report artifacts", () => {
  const { run, bundle } = fixture();
  run.checks[0].privatePayload = "secret-unrecognized-xyz";
  run.dataRequests[0].privatePayload = "secret-unrecognized-xyz";
  const report = buildEnterpriseReport(run, {
    ...bundle,
    sourceRunDigest: enterpriseDigest(run),
  });
  expect(JSON.stringify(renderEnterpriseReport(report))).not.toContain(
    "secret-unrecognized-xyz",
  );
});

it("preserves immutable report folders and detects edited Markdown even with a forged file hash", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "enterprise-report-"));
  try {
    const { run, bundle } = fixture(),
      report = buildEnterpriseReport(run, bundle),
      directory = path.join(root, "report");
    await saveEnterpriseReport(directory, report, "customer");
    expect((await loadEnterpriseReport(directory)).revisionId).toBe("report-1");
    await expect(
      saveEnterpriseReport(directory, report, "customer"),
    ).rejects.toThrow();
    await writeFile(path.join(directory, "report.md"), "Everything passed");
    const manifest = JSON.parse(
      await readFile(path.join(directory, "manifest.json"), "utf8"),
    );
    manifest.files["report.md"] = createHash("sha256")
      .update("Everything passed")
      .digest("hex");
    await writeFile(
      path.join(directory, "manifest.json"),
      JSON.stringify(manifest),
    );
    await expect(loadEnterpriseReport(directory)).rejects.toThrow(
      /integrity|projection/,
    );
    expect(
      await readFile(path.join(directory, "report.json"), "utf8"),
    ).toContain("Redirect broken");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("rejects private data smuggled into a public model and hides private revision identifiers", () => {
  const { run, bundle } = fixture();
  const report = buildEnterpriseReport(run, {
    ...bundle,
    revisionId: "private-customer-initiative",
  });
  const publicModel = JSON.parse(renderEnterpriseReport(report, "public").json);
  expect(publicModel.revisionId).not.toBe(report.revisionId);
  expect(() =>
    renderEnterpriseReport(
      { ...publicModel, assessment: report.assessment },
      "public",
    ),
  ).toThrow();
});

it("rejects unexpected nested payloads in public aggregates", () => {
  const { run, bundle } = fixture();
  const model = JSON.parse(
    renderEnterpriseReport(buildEnterpriseReport(run, bundle), "public").json,
  );
  for (const field of ["tool", "summary", "coverage", "brand"]) {
    const edited = structuredClone(model);
    edited[field].privatePayload = "confidential";
    expect(() => renderEnterpriseReport(edited, "public")).toThrow();
  }
});

it("rejects sensitive bundle identifiers and malformed tool metadata before public projection", () => {
  const { run, bundle } = fixture();
  expect(() =>
    buildEnterpriseReport(run, {
      ...bundle,
      revisionId: "secret-token-123",
      sensitiveValues: ["secret-token-123"],
    }),
  ).toThrow();
  const report = buildEnterpriseReport(run, bundle);
  report.tool.privateToken = "customer@example.com";
  expect(() => renderEnterpriseReport(report, "public")).toThrow();
});

it("rejects misleading public coverage and review claims", () => {
  const { run, bundle } = fixture();
  const model = JSON.parse(
    renderEnterpriseReport(buildEnterpriseReport(run, bundle), "public").json,
  );
  for (const [key, value] of Object.entries({
    assessmentCoverage: 1,
    siteHealth: "all checks passed",
    reviewStatus: "reviewed",
    acceptedReviewTargets: 999,
  })) {
    const edited = structuredClone(model);
    edited.summary[key] = value;
    expect(() => renderEnterpriseReport(edited, "public")).toThrow();
  }
});

it("preserves sanitized historical verdicts and request responses separately from current counts", () => {
  const { run, bundle } = fixture();
  run.history = [
    {
      customerId: run.customerId,
      sourceRunId: run.runId,
      sourceDigest: enterpriseDigest(run),
      check: {
        ...run.checks[0],
        reason: "Prior private@example.com",
        privatePayload: "DO-NOT-EXPORT",
      },
      invalidatedAt: run.assessmentAt,
      reasons: ["evidence-replaced"],
    },
  ];
  run.requestResponses = [
    {
      customerId: run.customerId,
      sourceRunId: run.runId,
      requestId: run.dataRequests[0].id,
      actor: "private@example.com",
      at: run.assessmentAt,
      outcome: "declined",
      reason: "Owner declined access",
      privatePayload: "DO-NOT-EXPORT",
    },
  ];
  const report = buildEnterpriseReport(run, {
    ...bundle,
    sourceRunDigest: enterpriseDigest(run),
  });
  expect(report.assessment.history).toHaveLength(1);
  expect(report.assessment.requestResponses).toHaveLength(1);
  const files = renderEnterpriseReport(report);
  expect(files.markdown).toContain("evidence-replaced");
  expect(files.html).toContain("Owner declined access");
  expect(JSON.stringify(files)).not.toMatch(
    /private@example.com|DO-NOT-EXPORT/,
  );
  expect(report.summary.assessedChecks).toBe(1);
});

it("requires verified parent snapshots and preserves historical observations during revision", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "report-revision-"));
  try {
    const { run, bundle } = fixture();
    const observation = {
      observationId: "O-1",
      label: "Historical citations",
      value: { numerator: 40, denominator: 100 },
      unit: "responses",
      classification: "historical",
      precision: "exact",
      period: { from: "2026-10-01", to: "2026-10-31" },
      scopeDescription: "Historical sample",
      evidenceIds: ["trace"],
    };
    const parent = buildEnterpriseReport(run, {
      ...bundle,
      observations: [observation],
    });
    const source = path.join(root, "parent");
    await saveEnterpriseReport(source, parent);
    const revision = {
      ...bundle,
      revisionId: "report-2",
      parentReportDigest: enterpriseDigest(parent),
      generatedAt: "2026-11-18T14:00:00Z",
      observations: [observation],
    };
    expect(() => buildEnterpriseReport(run, revision)).toThrow(/parent/i);
    await expect(
      reviseEnterpriseReport(
        source,
        run,
        { ...revision, observations: [] },
        path.join(root, "drop"),
      ),
    ).rejects.toThrow(/observation/i);
    await expect(
      reviseEnterpriseReport(
        source,
        run,
        { ...revision, parentReportDigest: "0".repeat(64) },
        path.join(root, "forged"),
      ),
    ).rejects.toThrow(/parent/i);
    await reviseEnterpriseReport(
      source,
      run,
      revision,
      path.join(root, "child"),
    );
    expect(
      (await loadEnterpriseReport(path.join(root, "child"))).observations,
    ).toEqual([observation]);
    await writeFile(path.join(source, "report.md"), "tampered");
    await expect(
      reviseEnterpriseReport(
        source,
        run,
        { ...revision, revisionId: "report-3" },
        path.join(root, "tampered"),
      ),
    ).rejects.toThrow(/integrity|projection/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("supports source-bound report creation validation and revision through the CLI", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "report-cli-"));
  try {
    const { run, bundle } = fixture();
    await saveEnterpriseRun(path.join(root, "run"), run);
    await writeFile(path.join(root, "bundle.json"), JSON.stringify(bundle));
    const cli = (...args) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          ["skills/content-search-audit/scripts/audit.mjs", ...args],
          { encoding: "utf8" },
        ),
      );
    cli(
      "enterprise-report",
      path.join(root, "run"),
      path.join(root, "bundle.json"),
      path.join(root, "report"),
    );
    expect(
      cli("enterprise-report-validate", path.join(root, "report")),
    ).toMatchObject({ valid: true, semanticAcceptance: false });
    const parent = await loadEnterpriseReport(path.join(root, "report"));
    await writeFile(
      path.join(root, "bundle.json"),
      JSON.stringify({
        ...bundle,
        revisionId: "second",
        generatedAt: "2026-11-18T14:00:00Z",
        parentReportDigest: enterpriseDigest(parent),
      }),
    );
    cli(
      "enterprise-report-revise",
      path.join(root, "report"),
      path.join(root, "run"),
      path.join(root, "bundle.json"),
      path.join(root, "second"),
    );
    expect(
      (await loadEnterpriseReport(path.join(root, "second"))).revisionId,
    ).toBe("second");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("publishes a compilable report schema matching valid reports and rejecting malformed claims", async () => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  for (const name of [
    "enterprise-check",
    "enterprise-evidence",
    "data-request",
    "enterprise-run",
  ])
    ajv.addSchema(
      JSON.parse(
        await readFile(
          `skills/content-search-audit/schemas/${name}.schema.json`,
          "utf8",
        ),
      ),
    );
  const schema = JSON.parse(
    await readFile(
      "skills/content-search-audit/schemas/enterprise-report.schema.json",
      "utf8",
    ),
  );
  const validate = ajv.compile(schema);
  const { run, bundle } = fixture();
  const report = buildEnterpriseReport(run, bundle);
  expect(validate(report), JSON.stringify(validate.errors)).toBe(true);
  expect(
    validate({ ...report, observations: [{ observationId: "O-1" }] }),
  ).toBe(false);
  expect(
    validate({
      ...report,
      summary: { ...report.summary, assessmentCoverage: 2 },
    }),
  ).toBe(false);
});

it("rejects rewritten source runs and rebound historical observation evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "report-binding-"));
  try {
    const { run, bundle } = fixture();
    const parent = buildEnterpriseReport(run, bundle);
    await saveEnterpriseReport(path.join(root, "parent"), parent);
    const changed = structuredClone(run);
    changed.checks[0].status = "unknown";
    const next = {
      ...bundle,
      revisionId: "new",
      generatedAt: "2026-11-18T14:00:00Z",
      parentReportDigest: enterpriseDigest(parent),
      sourceRunDigest: enterpriseDigest(changed),
      findings: [],
      actions: [],
    };
    await expect(
      reviseEnterpriseReport(
        path.join(root, "parent"),
        changed,
        next,
        path.join(root, "child"),
      ),
    ).rejects.toThrow(/source|run/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("rejects sensitive values smuggled into allowed public metadata fields", () => {
  const { run, bundle } = fixture();
  const model = JSON.parse(
    renderEnterpriseReport(buildEnterpriseReport(run, bundle), "public").json,
  );
  for (const [field, key, value] of [
    ["tool", "name", "customer@example.com"],
    ["brand", "name", "Bearer private-token"],
  ]) {
    const edited = structuredClone(model);
    edited[field][key] = value;
    expect(() => renderEnterpriseReport(edited, "public")).toThrow();
  }
});

it("requires archived verdicts and immutable evidence on a new source run", () => {
  const { run, bundle } = fixture();
  const observation = {
    observationId: "O-1",
    label: "Historical citations",
    value: 40,
    unit: "citations",
    classification: "historical",
    precision: "exact",
    period: { from: "2026-10-01", to: "2026-10-31" },
    scopeDescription: "Historical sample",
    evidenceIds: ["trace"],
  };
  const parent = buildEnterpriseReport(run, {
    ...bundle,
    observations: [observation],
  });
  const next = resolveAuditContext(
    {
      customerId: run.customerId,
      runId: "run-2",
      assessmentAt: run.assessmentAt,
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  next.parentRunIds = [run.runId];
  next.evidence = structuredClone(run.evidence);
  const revision = () => ({
    ...bundle,
    revisionId: "second",
    generatedAt: "2026-11-18T14:00:00Z",
    sourceRunDigest: enterpriseDigest(next),
    parentReportDigest: enterpriseDigest(parent),
    findings: [],
    actions: [],
    observations: [observation],
  });
  expect(() => buildEnterpriseReport(next, revision(), parent)).toThrow(
    /historical record/,
  );
  next.history = [
    {
      customerId: run.customerId,
      sourceRunId: run.runId,
      sourceDigest: enterpriseDigest(run),
      check: run.checks[0],
      invalidatedAt: run.assessmentAt,
      reasons: ["reassessment"],
    },
  ];
  expect(
    buildEnterpriseReport(next, revision(), parent).assessment.history,
  ).toHaveLength(1);
  next.evidence[0].digest = "b".repeat(64);
  expect(() => buildEnterpriseReport(next, revision(), parent)).toThrow(
    /evidence binding/,
  );
});
