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
it("rejects an internally consistent unsupported evaluator fingerprint before replay or output", async () => {
  const f = await setup();
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const run = await loadEnterpriseRun(join(f.root, "first"));
  const version = "0".repeat(64);
  const base = run.evidence.find(
    (e) => e.artifactType === "canonical-evaluation",
  );
  base.content.evaluatorDigest = version;
  base.digest = enterpriseDigest(base.content);
  base.evidenceId = `canonical-${base.digest}`;
  run.technicalSeoEvaluations[0].evidenceId = base.evidenceId;
  run.policyVersions[`canonical-${f.entry.evaluationId}`] = enterpriseDigest([
    f.entry.context,
    f.entry.window,
    version,
  ]);
  const changed = new Map();
  for (const evidence of run.evidence.filter(
    (e) => e.artifactType === "canonical-check",
  )) {
    const oldId = evidence.evidenceId;
    evidence.content.evaluatorDigest = version;
    evidence.content.evaluationEvidenceId = base.evidenceId;
    evidence.digest = enterpriseDigest(evidence.content);
    evidence.evidenceId = `canonical-row-${evidence.digest}`;
    changed.set(oldId, evidence.evidenceId);
  }
  for (const check of run.checks) {
    check.evidenceIds = check.evidenceIds.map((id) => changed.get(id) ?? id);
    check.dependencies = check.dependencies.map((id) => changed.get(id) ?? id);
  }
  await saveEnterpriseRun(join(f.root, "unsupported"), run);
  const before = enterpriseDigest(
    await loadEnterpriseRun(join(f.root, "unsupported")),
  );
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "unsupported"),
      { ...f.bundle, sourceDigest: before, newRunId: "next" },
      join(f.root, "rejected-version"),
    ),
  ).rejects.toThrow(/unsupported.*fingerprint/i);
  await expect(access(join(f.root, "rejected-version"))).rejects.toThrow();
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "unsupported"))),
  ).toBe(before);
});

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

it.each(["provided", "invalid", "expired", "declined"])(
  "preserves compatible %s request state without assessing its unknown check",
  async (status) => {
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
    const content = { note: "Supplied material awaiting assessment" };
    const evidence = {
      evidenceId: "owner-response",
      customerId: old.customerId,
      runId: old.runId,
      entityId: "site",
      source: "supplied-response",
      artifactType: request.requestedArtifact,
      scopeKey: request.scopeKey,
      windowId: request.windowId,
      observedAt: old.assessmentAt,
      validUntil: "2026-11-19T13:00:00Z",
      digest: enterpriseDigest(content),
      content,
    };
    old.evidence.push(evidence);
    Object.assign(request, {
      status,
      reason: `Owner response ${status}`,
      evidenceIds: status === "provided" ? [evidence.evidenceId] : [],
      evidenceDigests:
        status === "provided" ? { [evidence.evidenceId]: evidence.digest } : {},
    });
    await saveEnterpriseRun(join(f.root, "response"), old);
    await evaluateEnterpriseTechnicalSeo(
      join(f.root, "response"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(old),
        newRunId: "reassessed",
      },
      join(f.root, "reassessed"),
    );
    const next = await loadEnterpriseRun(join(f.root, "reassessed"));
    const carried = next.dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    );
    expect(carried.status).toBe(status);
    expect(carried.reason).toBe(request.reason);
    expect(carried.evidenceDigests).toEqual(request.evidenceDigests);
    expect(
      next.checks.find((c) => c.checkId === request.affectedCheckIds[0]).status,
    ).toBe("unknown");
    expect(carried.runId).toBe("reassessed");
    expect(carried.id).not.toBe(request.id);
    if (status === "provided") {
      await evaluateEnterpriseTechnicalSeo(
        join(f.root, "reassessed"),
        {
          ...f.bundle,
          sourceDigest: enterpriseDigest(next),
          newRunId: "expired-response",
          assessmentAt: evidence.validUntil,
        },
        join(f.root, "expired-response"),
      );
      const expired = await loadEnterpriseRun(join(f.root, "expired-response"));
      expect(
        expired.dataRequests.find(
          (r) => r.requestedArtifact === request.requestedArtifact,
        ).status,
      ).toBe("expired");
    }
  },
);

it.each([
  "acceptedFormats",
  "exportInstructions",
  "suggestedOwnerRole",
  "fallback",
  "leastPrivilegeAccess",
  "priority",
])(
  "rejects modified canonical request descriptor %s before output",
  async (field) => {
    const f = await setup();
    await evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "first"),
    );
    const run = await loadEnterpriseRun(join(f.root, "first"));
    const request = run.dataRequests.find((r) =>
      r.requestedArtifact.startsWith("canonical-eval-"),
    );
    request[field] =
      field === "acceptedFormats"
        ? ["unrelated-input"]
        : field === "priority"
          ? "high"
          : "Unrelated requirement";
    await saveEnterpriseRun(join(f.root, "modified-request"), run);
    await expect(
      evaluateEnterpriseTechnicalSeo(
        join(f.root, "modified-request"),
        {
          ...f.bundle,
          sourceDigest: enterpriseDigest(run),
          newRunId: "next",
        },
        join(f.root, "rejected-request"),
      ),
    ).rejects.toThrow(/request descriptor/i);
    await expect(access(join(f.root, "rejected-request"))).rejects.toThrow();
  },
);

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

async function hreflangSetup() {
  const f = await setup();
  delete f.entry.context.expectedCanonical;
  Object.assign(f.entry.context, { method: "html-source" });
  f.entry.kind = "hreflang";
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: "customer",
      entityId: "site",
      environment: "production",
      targetUrl: f.entry.context.targetUrl,
      profileId: "mobile",
      stateId: "anonymous",
    },
    method: "html-source",
    pages: [
      {
        url: f.entry.context.targetUrl,
        capturedAt: "2026-11-19T11:30:00Z",
        complete: true,
        alternates: [
          { language: "en", targetUrl: f.entry.context.targetUrl },
          { language: "en", targetUrl: "https://example.de/PRIVATE_ALTERNATE" },
        ],
      },
    ],
  };
  const replace = () => {
    const artifactText = JSON.stringify(raw);
    f.entry.sources = [
      {
        sourceId: "native",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      },
    ];
  };
  replace();
  return { ...f, raw, replace };
}
it("projects hreflang conflicts, requests and scoped report without raw alternate leakage", async () => {
  const f = await hreflangSetup();
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const checks = run.checks.filter((c) =>
    c.ruleId.startsWith("canonical-eval-"),
  );
  expect(checks).toHaveLength(6);
  expect(checks.filter((c) => c.status === "fail")).toHaveLength(1);
  expect(
    run.dataRequests.some((r) =>
      r.acceptedFormats.includes("hreflang-capture-v1"),
    ),
  ).toBe(true);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report)).not.toContain("PRIVATE_ALTERNATE");
  expect(JSON.stringify(report)).toContain("missing-target-capture");
  expect(JSON.stringify(report)).toContain("pages[0].alternates[1].targetUrl");
  expect(JSON.stringify(report)).toContain("root-only code validation/mapping");
  await saveEnterpriseReport(join(f.root, "report"), report);
  await loadEnterpriseReport(join(f.root, "report"));
});
it("rejects hreflang target evidence outside declared window", async () => {
  const f = await hreflangSetup();
  f.raw.pages.push({
    ...f.raw.pages[0],
    url: "https://example.de/PRIVATE_ALTERNATE",
    capturedAt: "2026-11-19T10:59:59Z",
  });
  f.replace();
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    ),
  ).rejects.toThrow("Hreflang page outside observation window");
});
it("reassesses retained hreflang evidence when it expires", async () => {
  const f = await hreflangSetup();
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "assessed"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "expired",
      assessmentAt: "2026-11-19T13:00:00Z",
      evaluations: [],
    },
    join(f.root, "expired"),
  );
  const expired = await loadEnterpriseRun(join(f.root, "expired"));
  expect(
    expired.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
});

it("preserves nested graph provenance and recovery locators through report replay", async () => {
  const f = await hreflangSetup();
  const artifactText = JSON.stringify({
    schemaVersion: 2,
    scope: f.raw.scope,
    method: f.raw.method,
    captures: [f.entry.sources[0]],
  });
  f.entry.sources = [
    {
      sourceId: "assembled",
      artifactText,
      artifactHash: createHash("sha256").update(artifactText).digest("hex"),
    },
  ];
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(
    JSON.stringify(report).includes(
      "captures[0].artifactText (parse JSON), pages[0].alternates[1].targetUrl",
    ),
  ).toBe(true);
  expect(JSON.stringify(report).includes("PRIVATE_ALTERNATE")).toBe(false);
  expect(
    run.dataRequests.some((r) =>
      r.acceptedFormats.includes("hreflang-capture-v2"),
    ),
  ).toBe(true);
  await saveEnterpriseReport(join(f.root, "report"), report);
  await loadEnterpriseReport(join(f.root, "report"));
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "assessed"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "replayed",
      assessmentAt: run.assessmentAt,
      evaluations: [],
    },
    join(f.root, "replayed"),
  );
});

it("reports shared-label contradiction separately from reciprocal topology", async () => {
  const f = await hreflangSetup();
  f.raw.pages[0].alternates[1].language = "de";
  f.raw.pages.push({
    ...f.raw.pages[0],
    url: "https://example.de/PRIVATE_ALTERNATE",
    alternates: [
      { language: "en", targetUrl: f.entry.context.targetUrl },
      { language: "de", targetUrl: "https://example.de/PRIVATE_OTHER" },
      { language: "fr", targetUrl: "https://example.de/PRIVATE_ALTERNATE" },
    ],
  });
  f.replace();
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const failed = run.checks.filter((c) => c.status === "fail");
  expect(failed).toHaveLength(1);
  expect(failed[0].ruleId).toContain("hreflang-shared-language-mapping");
  expect(
    run.checks.find((c) => c.ruleId.endsWith("hreflang-return-links"))?.status,
  ).toBe("pass");
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report).includes("PRIVATE_OTHER")).toBe(false);
  await saveEnterpriseReport(join(f.root, "report"), report);
  await loadEnterpriseReport(join(f.root, "report"));
});

async function targetControlSetup() {
  const f = await setup();
  const declaration = JSON.parse(f.entry.sources[0].artifactText);
  declaration.layers.renderedHead.targets = [
    ...declaration.layers.sourceHead.targets,
  ];
  const target = declaration.layers.sourceHead.targets[0];
  const controls = {
    schemaVersion: 1,
    scope: { ...declaration.scope, targetUrl: target },
    capturedAt: declaration.capturedAt,
    response: { url: target, status: 200 },
    robots: {
      url: "https://example.com/robots.txt",
      capturedAt: declaration.capturedAt,
      status: 200,
      body: "User-agent: *\nAllow: /",
      complete: true,
    },
    sourceDocument: {
      complete: true,
      meta: [{ name: "robots", content: "noindex" }],
    },
    renderedDocument: { complete: true, meta: [] },
    httpHeaders: { complete: true, values: [] },
  };
  const pack = (raw: unknown) => {
    const artifactText = JSON.stringify(raw);
    return {
      sourceId: "controls",
      artifactText,
      artifactHash: createHash("sha256").update(artifactText).digest("hex"),
    };
  };
  delete f.entry.context.expectedCanonical;
  Object.assign(f.entry.context, { relationship: "canonical", method: null });
  f.entry.kind = "declared-target-controls";
  const replace = () => {
    f.entry.sources = [
      pack({
        schemaVersion: 1,
        declaration: pack(declaration),
        targets: [pack(controls)],
      }),
    ];
  };
  replace();
  return { ...f, controls, replace };
}
it("reports known target-control failure with private locator and no raw URL", async () => {
  const f = await targetControlSetup();
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const failed = run.checks.filter((c) => c.status === "fail");
  expect(failed).toHaveLength(1);
  expect(failed[0].reason).toContain("layers.sourceHead.targets[0]");
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report).includes("PRIVATE_TARGET")).toBe(false);
  expect(JSON.stringify(report)).toContain(
    "direct-200, Googlebot robots allowance",
  );
  await saveEnterpriseReport(join(f.root, "report"), report);
  await loadEnterpriseReport(join(f.root, "report"));
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "assessed"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "expired",
      assessmentAt: "2026-11-19T13:00:00Z",
      evaluations: [],
    },
    join(f.root, "expired"),
  );
  const expired = await loadEnterpriseRun(join(f.root, "expired"));
  expect(
    expired.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
});
it("rejects target robots evidence outside the report window", async () => {
  const f = await targetControlSetup();
  f.controls.robots.capturedAt = "2026-11-19T10:59:59Z";
  f.replace();
  await expect(
    evaluateEnterpriseTechnicalSeo(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    ),
  ).rejects.toThrow("Target controls outside observation window");
});

async function structuredDataSetup() {
  const f = await setup();
  delete f.entry.context.expectedCanonical;
  Object.assign(f.entry.context, {
    method: "html-source",
    expectedTypes: null,
  });
  f.entry.kind = "structured-data";
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: "customer",
      entityId: "site",
      environment: "production",
      targetUrl: f.entry.context.targetUrl,
      profileId: "mobile",
      stateId: "anonymous",
    },
    method: "html-source",
    capturedAt: "2026-11-19T11:30:00Z",
    projection: {
      complete: true,
      blocks: [
        {
          id: "jsonld-0",
          text: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "PRIVATE_PRODUCT",
          }),
        },
      ],
    },
    otherFormatsObserved: [],
  };
  const replace = () => {
    const artifactText = JSON.stringify(raw);
    f.entry.sources = [
      {
        sourceId: "native",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      },
    ];
  };
  replace();
  return { ...f, raw, replace };
}
it("projects structured-data policy unknowns without leaking JSONLD payload", async () => {
  const f = await structuredDataSetup();
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const checks = run.checks.filter((c) =>
    c.ruleId.startsWith("canonical-eval-"),
  );
  expect(checks).toHaveLength(6);
  expect(checks.filter((c) => c.status === "pass")).toHaveLength(3);
  expect(
    run.dataRequests.some((r) =>
      r.acceptedFormats.includes("owner-jsonld-policy-json"),
    ),
  ).toBe(true);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report).includes("PRIVATE_PRODUCT")).toBe(false);
  expect(JSON.stringify(report)).toContain(
    "no full vocabulary validity, required-property",
  );
  await saveEnterpriseReport(join(f.root, "report"), report);
  await loadEnterpriseReport(join(f.root, "report"));
  Object.assign(f.entry.context, { expectedTypes: ["Product"] });
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "assessed"),
    { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "policy" },
    join(f.root, "policy"),
  );
  const policy = await loadEnterpriseRun(join(f.root, "policy"));
  expect(
    policy.checks.find((c) => c.ruleId.endsWith("jsonld-owner-type-presence"))
      ?.status,
  ).toBe("pass");
  await evaluateEnterpriseTechnicalSeo(
    join(f.root, "policy"),
    {
      sourceDigest: enterpriseDigest(policy),
      newRunId: "expired",
      assessmentAt: "2026-11-19T13:00:00Z",
      evaluations: [],
    },
    join(f.root, "expired"),
  );
  const expired = await loadEnterpriseRun(join(f.root, "expired"));
  expect(
    expired.checks
      .filter((c) => c.ruleId.startsWith("canonical-eval-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
});
it("reports malformed JSON syntax without exposing the invalid source text", async () => {
  const f = await structuredDataSetup();
  f.raw.projection.blocks[0].text = '{"PRIVATE_INVALID":';
  f.replace();
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(result.findings).toHaveLength(1);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report).includes("PRIVATE_INVALID")).toBe(false);
  expect(JSON.stringify(report)).toContain("projection.blocks[0].text");
});

it("projects pinned non-class findings with provenance and private block locators", async () => {
  const f = await structuredDataSetup();
  f.raw.projection.blocks[0].text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "name",
    name: "PRIVATE_SCHEMA_VALUE",
  });
  f.replace();
  const result = await evaluateEnterpriseTechnicalSeo(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(result.findings).toHaveLength(1);
  const report = buildEnterpriseReport(run, reportBundle(run, result));
  expect(JSON.stringify(report)).toContain("jsonld-schema-class-membership");
  expect(JSON.stringify(report)).toContain("snapshot 30.1");
  expect(JSON.stringify(report)).toContain("projection.blocks[0].text");
  expect(JSON.stringify(report)).not.toContain("PRIVATE_SCHEMA_VALUE");
  await saveEnterpriseReport(join(f.root, "report"), report);
  await loadEnterpriseReport(join(f.root, "report"));
});
