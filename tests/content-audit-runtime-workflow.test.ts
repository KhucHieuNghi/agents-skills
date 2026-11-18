import { mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  saveEnterpriseRun,
  loadEnterpriseRun,
  enterpriseDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateEnterpriseRuntime } from "../skills/content-search-audit/scripts/lib/enterprise-runtime-workflow.mjs";
import { buildEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report-model.mjs";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "runtime-workflow-"));
  const run = resolveAuditContext(
    {
      customerId: "c",
      runId: "initial",
      assessmentAt: "2026-11-18T11:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "source"), run);
  const scope = { customerId: "c", entityId: "site", environment: "staging" };
  const policy = {
    policyId: "policy",
    owner: "owner",
    scope,
    categories: ["analytics_storage"],
    deniedRules: {
      analytics_storage: {
        requests: "blocked",
        storageRead: false,
        storageWrite: false,
        cookies: false,
        identifiers: false,
      },
    },
    scenarios: [
      {
        scenarioId: "fresh",
        kind: "fresh",
        region: "AU",
        surface: "client",
        mode: "basic",
        window: { from: "2026-11-18T10:00:00Z", to: "2026-11-18T10:10:00Z" },
        transitions: [
          { transition: "default", state: { analytics_storage: "denied" } },
        ],
      },
    ],
  };
  const artifact = {
    scope,
    scenarioId: "fresh",
    region: "AU",
    surface: "client",
    mode: "basic",
    clockId: "browser",
    window: policy.scenarios[0].window,
    complete: true,
    records: [
      {
        id: "default",
        sequence: 0,
        at: "2026-11-18T10:00:00Z",
        kind: "state",
        transition: "default",
        state: { analytics_storage: "denied" },
      },
      {
        id: "leak",
        sequence: 1,
        at: "2026-11-18T10:01:00Z",
        kind: "request",
        category: "analytics_storage",
        cookieless: false,
        cookiesAttached: true,
        identifiersPresent: true,
      },
    ],
  };
  const makeSource = () => {
    const artifactText = JSON.stringify(artifact);
    return {
      sourceId: "private-source",
      locator: "private-secret-location",
      sourceKind: "browser-trace",
      synthetic: true,
      capturedAt: "2026-11-18T10:10:00Z",
      artifactText,
      artifactHash: hash(artifactText),
    };
  };
  const entry = () => ({
    evaluationId: "consent-test",
    kind: "consent",
    context: { entityId: "site", environment: "staging", maxAgeSeconds: 7200 },
    contract: policy,
    sources: [makeSource()],
  });
  const bundle = () => ({
    sourceDigest: enterpriseDigest(run),
    newRunId: "evaluated",
    assessmentAt: run.assessmentAt,
    evaluations: [entry()],
  });
  return { root, run, artifact, entry, bundle };
}
it("projects evaluated checks, candidate findings and missing scenarios into the existing report", async () => {
  const f = await setup();
  const receipt = await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    f.bundle(),
    join(f.root, "next"),
  );
  const run = await loadEnterpriseRun(join(f.root, "next"));
  expect(receipt.assessmentAccepted).toBe(false);
  expect(run.checks.filter((c) => c.status === "fail")).toHaveLength(1);
  expect(run.dataRequests.length).toBeGreaterThan(f.run.dataRequests.length);
  const report = buildEnterpriseReport(run, {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "r1",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Customer", accent: "#174f7b" },
    findings: receipt.evaluations.flatMap((x) => x.findings),
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  expect(report.findings).toHaveLength(1);
  expect(JSON.stringify(report)).not.toContain("private-secret-location");
  expect(
    run.checks
      .filter((c) => !c.ruleId.startsWith("runtime-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
});
it("archives a prior failed assessment and replaces it only after fresh evaluation", async () => {
  const f = await setup();
  await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    f.bundle(),
    join(f.root, "first"),
  );
  const before = await loadEnterpriseRun(join(f.root, "first"));
  f.artifact.records.pop();
  const b = {
    ...f.bundle(),
    sourceDigest: enterpriseDigest(before),
    newRunId: "fixed",
    assessmentAt: "2026-11-18T11:01:00Z",
  };
  await evaluateEnterpriseRuntime(
    join(f.root, "first"),
    b,
    join(f.root, "fixed"),
  );
  const after = await loadEnterpriseRun(join(f.root, "fixed"));
  expect(after.checks.some((c) => c.status === "fail")).toBe(false);
  expect(after.checks.some((c) => c.status === "pass")).toBe(true);
  expect(after.history.some((h) => h.check.status === "fail")).toBe(true);
  expect(enterpriseDigest(await loadEnterpriseRun(join(f.root, "first")))).toBe(
    enterpriseDigest(before),
  );
});
it("rejects stale bindings, foreign scope, supplied verdicts and invalid hashes without output", async () => {
  const f = await setup();
  for (const [i, b] of [
    { ...f.bundle(), sourceDigest: "0".repeat(64) },
    { ...f.bundle(), evaluations: [{ ...f.entry(), status: "pass" }] },
    {
      ...f.bundle(),
      evaluations: [
        { ...f.entry(), context: { ...f.entry().context, entityId: "other" } },
      ],
    },
    {
      ...f.bundle(),
      evaluations: [
        {
          ...f.entry(),
          sources: [{ ...f.entry().sources[0], artifactHash: "0".repeat(64) }],
        },
      ],
    },
  ].entries()) {
    const dest = join(f.root, `invalid-${i}`);
    await expect(
      evaluateEnterpriseRuntime(join(f.root, "source"), b, dest),
    ).rejects.toThrow();
    await expect(access(dest)).rejects.toThrow();
  }
});
it("runs CLI evaluation and keeps stale evidence unknown", async () => {
  const f = await setup();
  const b = { ...f.bundle(), assessmentAt: "2026-11-19T11:00:00Z" };
  await writeFile(join(f.root, "bundle.json"), JSON.stringify(b));
  execFileSync(process.execPath, [
    "skills/content-search-audit/scripts/audit.mjs",
    "enterprise-runtime-evaluate",
    join(f.root, "source"),
    join(f.root, "bundle.json"),
    join(f.root, "cli"),
  ]);
  const run = await loadEnterpriseRun(join(f.root, "cli"));
  expect(run.checks.every((c) => c.status === "unknown")).toBe(true);
  const bytes = await readFile(
    join(f.root, "cli", "enterprise-run.json"),
    "utf8",
  );
  expect(bytes).not.toContain("private-secret-location");
});

it("evaluates tracking evidence while preserving explicit unassessed capabilities", async () => {
  const f = await setup();
  const scope = {
    customerId: "c",
    entityId: "site",
    environment: "staging",
    journeyId: "purchase",
    scenarioId: "success",
    windowId: "w",
  };
  const window = { from: "2026-11-18T10:00:00Z", to: "2026-11-18T10:10:00Z" };
  const correlation = hash("opaque");
  const artifactText = JSON.stringify({
    scope,
    clockId: "browser",
    coverage: [{ stage: "data-layer", ...window, complete: true }],
    records: [
      {
        observationId: "event",
        stage: "data-layer",
        eventKey: "one",
        correlationDigest: correlation,
        eventName: "purchase",
        status: "emitted",
        observedAt: "2026-11-18T10:01:00Z",
      },
    ],
  });
  const entry = {
    evaluationId: "tracking-test",
    kind: "tracking",
    context: {
      entityId: "site",
      environment: "staging",
      journeyId: "purchase",
      scenarioId: "success",
      windowId: "w",
      window,
      maxAgeSeconds: 7200,
    },
    contract: {
      contractId: "contract",
      owner: "owner",
      scope,
      correlations: [correlation],
      minimumSampleSize: 1,
      providerLagSeconds: 0,
      expectations: [
        {
          stage: "data-layer",
          eventName: "purchase",
          acceptedStatuses: ["emitted"],
          forbiddenStatuses: [],
          minCount: 1,
          maxCount: 1,
        },
      ],
    },
    sources: [
      {
        sourceId: "trace",
        sourceKind: "browser-trace",
        locator: "private",
        capturedAt: window.to,
        synthetic: true,
        artifactText,
        artifactHash: hash(artifactText),
      },
    ],
  };
  await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    { ...f.bundle(), evaluations: [entry] },
    join(f.root, "tracking"),
  );
  const run = await loadEnterpriseRun(join(f.root, "tracking"));
  expect(run.checks.filter((c) => c.status === "pass")).toHaveLength(1);
  expect(
    run.dataRequests.some((r) => r.reason.includes("payload-validation")),
  ).toBe(true);
});
it("renders and validates JSON/Markdown/HTML through source CLI command paths", async () => {
  const f = await setup();
  const receipt = await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    f.bundle(),
    join(f.root, "evaluated"),
  );
  const run = await loadEnterpriseRun(join(f.root, "evaluated"));
  const bundle = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "r1",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Customer", accent: "#174f7b" },
    findings: receipt.evaluations.flatMap((x) => x.findings),
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  };
  await writeFile(join(f.root, "report-bundle.json"), JSON.stringify(bundle));
  const cli = "skills/content-search-audit/scripts/audit.mjs";
  execFileSync(process.execPath, [
    cli,
    "enterprise-report",
    join(f.root, "evaluated"),
    join(f.root, "report-bundle.json"),
    join(f.root, "report"),
  ]);
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "enterprise-report-validate", join(f.root, "report")],
      { encoding: "utf8" },
    ),
  );
  expect(result.semanticAcceptance).toBe(false);
  for (const name of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", name), "utf8");
    expect(text).toContain("Declared consent rule mismatch");
    expect(text).not.toContain("private-secret-location");
  }
});

it("preserves a fresh scenario failure when an unrelated scenario capture is stale", async () => {
  const f = await setup();
  const entry = f.entry();
  entry.context.maxAgeSeconds = 1800;
  const second = { ...entry.contract.scenarios[0], scenarioId: "fresh-second" };
  entry.contract.scenarios.push(second);
  const a = { ...f.artifact, scenarioId: second.scenarioId };
  const artifactText = JSON.stringify(a);
  entry.sources.push({
    ...entry.sources[0],
    sourceId: "second",
    capturedAt: "2026-11-18T11:00:00Z",
    artifactText,
    artifactHash: hash(artifactText),
  });
  await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    { ...f.bundle(), evaluations: [entry] },
    join(f.root, "independent"),
  );
  const run = await loadEnterpriseRun(join(f.root, "independent"));
  expect(run.checks.find((c) => c.scenarioId === "fresh-second")?.status).toBe(
    "fail",
  );
  expect(run.checks.find((c) => c.scenarioId === "fresh")?.status).toBe(
    "unknown",
  );
});
it("reuses immutable evidence for unchanged same-time reevaluation", async () => {
  const f = await setup();
  await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    f.bundle(),
    join(f.root, "first"),
  );
  const before = await loadEnterpriseRun(join(f.root, "first"));
  await evaluateEnterpriseRuntime(
    join(f.root, "first"),
    {
      ...f.bundle(),
      sourceDigest: enterpriseDigest(before),
      newRunId: "same-time",
    },
    join(f.root, "again"),
  );
  const after = await loadEnterpriseRun(join(f.root, "again"));
  expect(after.evidence.length).toBe(before.evidence.length);
});

it("keeps payload and stage checks distinct in runtime report projection", async () => {
  const f = await setup();
  const sample = JSON.parse(
    (
      await readFile(
        "skills/content-search-audit/examples/enterprise-runtime-evaluations.json",
        "utf8",
      )
    ).replaceAll("synthetic-runtime", "c"),
  );
  const entry = sample.evaluations.find((e) => e.kind === "tracking");
  entry.contract.expectations = entry.contract.expectations.slice(0, 1);
  delete entry.contract.orderRules;
  entry.contract.expectations[0].payloadRules = [
    { name: "currency", type: "enum", required: true, allowedValues: ["USD"] },
  ];
  const artifact = JSON.parse(entry.sources[0].artifactText);
  artifact.records[0].payload = {
    complete: true,
    fields: [{ name: "currency", type: "enum", value: "EUR" }],
  };
  entry.sources[0].artifactText = JSON.stringify(artifact);
  entry.sources[0].artifactHash = hash(entry.sources[0].artifactText);
  await evaluateEnterpriseRuntime(
    join(f.root, "source"),
    {
      ...f.bundle(),
      assessmentAt: "2026-11-18T12:00:00Z",
      evaluations: [entry],
    },
    join(f.root, "payload"),
  );
  const run = await loadEnterpriseRun(join(f.root, "payload"));
  expect(run.checks.filter((c) => c.status === "pass")).toHaveLength(1);
  expect(run.checks.filter((c) => c.status === "fail")).toHaveLength(1);
  expect(new Set(run.checks.map((c) => c.checkId)).size).toBe(
    run.checks.length,
  );
});
