import { createDataRequest } from "../skills/content-search-audit/scripts/lib/data-requests.mjs";
import { inspectEnterpriseMeasurement } from "../skills/content-search-audit/scripts/lib/measurement-assessment/workflow.mjs";
import {
  proposeMeasurementReplacement,
  validateMeasurementReplacementReview,
  prepareMeasurementDisposition,
  applyMeasurementDispositions,
  revokeMeasurementDispositions,
} from "../scripts/enterprise-measurement/disposition.mjs";
import { mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
  reviseEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseMeasurement } from "../scripts/enterprise-measurement/workflow.mjs";
import { forkEnterpriseEvidenceRun } from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";

async function setup(entityType = "property") {
  const root = await mkdtemp(
    join(tmpdir(), "measurement-assessment-workflow-"),
  );
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: "2026-11-19T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "analytics", type: entityType },
      ],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  const entry = {
    evaluationId: "ga4",
    kind: "configuration",
    context: {
      entityId: "analytics",
      resource: "properties/123",
      versionId: null,
      windowId: "snapshot",
      maxAgeSeconds: 7200,
    },
    input: {
      customerId: "customer",
      entityId: "analytics",
      payload: {
        sourceId: "private-export",
        synthetic: true,
        capturedAt: "2026-11-19T11:00:00Z",
        notes: "PRIVATE-CUSTOMER-TOKEN",
        property: {
          name: "properties/123",
          timeZone: "UTC",
          currencyCode: "USD",
        },
        dataStreams: [],
        keyEvents: [],
        collections: {
          dataStreams: { complete: true },
          keyEvents: { complete: true },
        },
      },
    },
    contract: {
      schemaVersion: 1,
      contractId: "contract",
      customerId: "customer",
      entityId: "analytics",
      resource: "properties/123",
      versionId: null,
      ownerRole: "measurement-assessment-owner",
      confirmedAt: "2026-11-19T10:00:00Z",
      validUntil: "2026-11-20T10:00:00Z",
      expectations: [
        {
          id: "zone",
          rule: "ga4-timezone",
          subject: null,
          expected: "Asia/Ho_Chi_Minh",
        },
      ],
    },
  };
  return {
    root,
    run,
    entry,
    bundle: {
      sourceDigest: enterpriseDigest(run),
      newRunId: "assessed",
      assessmentAt: run.assessmentAt,
      evaluations: [entry],
    },
  };
}
it("evaluates supplied configuration through the packaged CLI and rejects authority fields", async () => {
  const f = await setup(),
    input = join(f.root, "input.json");
  await writeFile(input, JSON.stringify(f.bundle));
  const invoke = (out) =>
    execFileSync(
      process.execPath,
      [
        "skills/content-search-audit/scripts/audit.mjs",
        "enterprise-measurement-evaluate",
        join(f.root, "initial"),
        input,
        join(f.root, out),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  const result = JSON.parse(invoke("cli"));
  expect(result.findings).toHaveLength(1);
  expect(result.assessmentAccepted).toBe(false);
  const run = await loadEnterpriseRun(join(f.root, "cli"));
  expect(run.measurementEvaluations).toHaveLength(1);
  await writeFile(
    input,
    JSON.stringify({ ...f.bundle, host: { approved: true } }),
  );
  expect(() => invoke("rejected")).toThrow();
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("runs all three packaged synthetic evaluations into the canonical customer report", async () => {
  const root = await mkdtemp(join(tmpdir(), "measurement-example-"));
  const example = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-measurement.json",
      "utf8",
    ),
  );
  const initial = resolveAuditContext(example.config, []);
  await saveEnterpriseRun(join(root, "initial"), initial);
  const input = join(root, "input.json");
  await writeFile(
    input,
    JSON.stringify({
      sourceDigest: enterpriseDigest(initial),
      newRunId: example.newRunId,
      assessmentAt: example.assessmentAt,
      evaluations: example.evaluations,
    }),
  );
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "skills/content-search-audit/scripts/audit.mjs",
        "enterprise-measurement-evaluate",
        join(root, "initial"),
        input,
        join(root, "evaluated"),
      ],
      { encoding: "utf8" },
    ),
  );
  const run = await loadEnterpriseRun(join(root, "evaluated"));
  expect(run.measurementEvaluations).toHaveLength(3);
  expect(result.findings).toHaveLength(3);
  expect(
    run.dataRequests.some((r) =>
      r.requestedArtifact.startsWith("measurement-assessment-gtm-"),
    ),
  ).toBe(true);
  expect(
    run.evidence
      .filter((e) => e.artifactType === "measurement-assessment-evaluation")
      .every((e) => e.source.startsWith("synthetic-")),
  ).toBe(true);
  const report = buildEnterpriseReport(run, {
    sourceRunDigest: result.digest,
    revisionId: "example",
    authorId: "example-author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic example", accent: "#174f7b" },
    findings: result.findings,
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  await saveEnterpriseReport(join(root, "report"), report);
  expect(await loadEnterpriseReport(join(root, "report"))).toEqual(report);
});
it("runs the installed end-to-end measurement example without hand-building bundles", async () => {
  const root = await mkdtemp(join(tmpdir(), "worked-measurement-")),
    out = join(root, "example");
  const run = () =>
    execFileSync(
      process.execPath,
      [
        "skills/content-search-audit/scripts/examples/worked-measurement.mjs",
        out,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  const result = JSON.parse(run());
  expect(result.synthetic).toBe(true);
  const report = await loadEnterpriseReport(join(out, "report"));
  expect(report.findings).toHaveLength(3);
  expect(() => run()).toThrow();
  expect(await loadEnterpriseReport(join(out, "report"))).toEqual(report);
});
it("projects configuration findings into canonical reports without exposing raw exports", async () => {
  const f = await setup(),
    r = await evaluateEnterpriseMeasurement(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(r.findings).toHaveLength(1);
  const report = buildEnterpriseReport(run, {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic customer", accent: "#174f7b" },
    findings: r.findings,
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE-CUSTOMER-TOKEN");
    expect(text).toContain("Supplied measurement configuration mismatch");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});
it("replays stored assessments and refreshes verdicts without deleting unrelated checks", async () => {
  const f = await setup();
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  f.entry.input.payload.property.timeZone = "Asia/Ho_Chi_Minh";
  const result = await evaluateEnterpriseMeasurement(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(first),
      newRunId: "retest",
      evaluations: [f.entry],
    },
    join(f.root, "retest"),
  );
  const next = await loadEnterpriseRun(join(f.root, "retest"));
  expect(result.findings).toHaveLength(0);
  expect(
    next.checks
      .filter((c) => c.ruleId.startsWith("measurement-assessment-"))
      .map((c) => c.status),
  ).toEqual(["pass", "pass"]);
  for (const old of f.run.checks)
    expect(next.checks.some((c) => c.checkId === old.checkId)).toBe(true);
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "assessed"))),
  ).toBe(enterpriseDigest(first));
});
it("preserves the failed verdict in reassessment and refuses lossy stored V1 revision", async () => {
  const f = await setup();
  const result = await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  const reportBundle = {
    sourceRunDigest: enterpriseDigest(first),
    revisionId: "report",
    authorId: "author",
    generatedAt: first.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: result.findings,
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  };
  const parent = buildEnterpriseReport(first, reportBundle);
  await saveEnterpriseReport(join(f.root, "report"), parent);
  f.entry.input.payload.property.timeZone = "Asia/Ho_Chi_Minh";
  const retest = await evaluateEnterpriseMeasurement(
    join(f.root, "assessed"),
    { ...f.bundle, sourceDigest: enterpriseDigest(first), newRunId: "retest" },
    join(f.root, "retest"),
  );
  const next = await loadEnterpriseRun(join(f.root, "retest"));
  const revisionBundle = {
    ...reportBundle,
    sourceRunDigest: enterpriseDigest(next),
    revisionId: "revision",
    parentReportDigest: enterpriseDigest(parent),
    generatedAt: "2026-11-19T12:01:00Z",
    findings: retest.findings,
  };
  const revised = buildEnterpriseReport(next, revisionBundle, parent);
  expect(
    revised.assessment.history.some(
      (h) =>
        h.sourceRunId === first.runId &&
        h.sourceDigest === enterpriseDigest(first) &&
        h.check.status === "fail",
    ),
  ).toBe(true);
  await expect(
    reviseEnterpriseReport(
      join(f.root, "report"),
      next,
      revisionBundle,
      join(f.root, "revision"),
    ),
  ).rejects.toThrow(/editorial.*history/i);
});
it("generates requests for missing contracts and preserves owner refusal on re-evaluation", async () => {
  const f = await setup();
  f.entry.contract = null;
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  const request = first.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("measurement-assessment-"),
  );
  expect(request.affectedCheckIds).toHaveLength(1);
  request.status = "declined";
  request.reason = "Owner declined access";
  await saveEnterpriseRun(join(f.root, "declined"), first);
  await evaluateEnterpriseMeasurement(
    join(f.root, "declined"),
    { ...f.bundle, sourceDigest: enterpriseDigest(first), newRunId: "again" },
    join(f.root, "again"),
  );
  const next = await loadEnterpriseRun(join(f.root, "again"));
  expect(
    next.dataRequests.find(
      (r) => r.requestedArtifact === request.requestedArtifact,
    ).status,
  ).toBe("declined");
});
it("rejects forged index ownership and unindexed measurement checks", async () => {
  for (const mode of ["foreign-check", "missing-index"]) {
    const f = await setup();
    await evaluateEnterpriseMeasurement(
      join(f.root, "initial"),
      f.bundle,
      join(f.root, "assessed"),
    );
    const first = await loadEnterpriseRun(join(f.root, "assessed"));
    if (mode === "foreign-check")
      first.measurementEvaluations[0].checkIds.push(first.checks[0].checkId);
    else first.measurementEvaluations = [];
    await saveEnterpriseRun(join(f.root, "forged"), first);
    await expect(
      evaluateEnterpriseMeasurement(
        join(f.root, "forged"),
        {
          ...f.bundle,
          sourceDigest: enterpriseDigest(first),
          newRunId: "again",
        },
        join(f.root, "again"),
      ),
    ).rejects.toThrow(/measurement.*ownership|unindexed/i);
  }
});
it("resolves contract acquisition with stable coverage and retained history", async () => {
  const f = await setup();
  const contract = f.entry.contract;
  f.entry.contract = null;
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  const placeholder = first.measurementEvaluations[0].checkIds[0];
  f.entry.contract = contract;
  const result = await evaluateEnterpriseMeasurement(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(first),
      newRunId: "supplied",
    },
    join(f.root, "supplied"),
  );
  const next = await loadEnterpriseRun(join(f.root, "supplied"));
  expect(result.findings).toHaveLength(1);
  expect(result).toMatchObject({
    assessmentAccepted: false,
    providerAuthenticated: false,
    contractAuthenticated: false,
    runtimeVerified: false,
    businessOutcomeVerified: false,
  });
  expect(next.checks.find((c) => c.checkId === placeholder)).toMatchObject({
    status: "pass",
    reason: "current-contract-supplied-not-authenticated",
  });
  expect(
    next.dataRequests.some((r) => r.affectedCheckIds.includes(placeholder)),
  ).toBe(false);
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "assessed"))),
  ).toBe(enterpriseDigest(first));
  const replayResult = await evaluateEnterpriseMeasurement(
    join(f.root, "supplied"),
    { ...f.bundle, sourceDigest: enterpriseDigest(next), newRunId: "replayed" },
    join(f.root, "replayed"),
  );
  const replayed = await loadEnterpriseRun(join(f.root, "replayed"));
  expect(replayed.checks.find((c) => c.checkId === placeholder).status).toBe(
    "pass",
  );
  const report = buildEnterpriseReport(replayed, {
    sourceRunDigest: enterpriseDigest(replayed),
    revisionId: "report",
    authorId: "author",
    generatedAt: replayed.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: replayResult.findings,
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  expect(
    next.history.some(
      (h) =>
        h.check.checkId === placeholder &&
        h.check.status === "unknown" &&
        h.sourceDigest === enterpriseDigest(first),
    ),
  ).toBe(true);
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    { ...f.bundle, newRunId: "direct" },
    join(f.root, "direct"),
  );
  const direct = await loadEnterpriseRun(join(f.root, "direct"));
  expect(direct.measurementEvaluations[0].checkIds).toEqual(
    next.measurementEvaluations[0].checkIds,
  );
});
it("re-evaluates expiry and rejects scope rebinding", async () => {
  const f = await setup();
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  await evaluateEnterpriseMeasurement(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(first),
      newRunId: "expired",
      assessmentAt: "2026-11-19T14:00:00Z",
    },
    join(f.root, "expired"),
  );
  const expired = await loadEnterpriseRun(join(f.root, "expired"));
  expect(
    expired.checks
      .filter((c) => c.ruleId.startsWith("measurement-assessment-"))
      .map((c) => c.status),
  ).toEqual(["pass", "unknown"]);
  f.entry.context.windowId = "other";
  await expect(
    evaluateEnterpriseMeasurement(
      join(f.root, "assessed"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(first),
        newRunId: "rebound",
      },
      join(f.root, "rebound"),
    ),
  ).rejects.toThrow(/scope/);
});
it("rejects unvalidated owner contracts before acquiring or writing evidence", async () => {
  for (const mode of ["foreign", "future", "empty"]) {
    const f = await setup();
    if (mode === "foreign") f.entry.contract.resource = "properties/456";
    else if (mode === "future")
      f.entry.contract.confirmedAt = "2026-11-19T12:01:00Z";
    else f.entry.contract.expectations = [];
    await expect(
      evaluateEnterpriseMeasurement(
        join(f.root, "initial"),
        f.bundle,
        join(f.root, "rejected"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "rejected"))).rejects.toThrow();
  }
});
it.each(["configuration", "business-mapping"])(
  "tracks %s contract acquisition independently through expiry, renewal and removal",
  async (kind) => {
    const example = JSON.parse(
      await readFile(
        "skills/content-search-audit/examples/enterprise-measurement.json",
        "utf8",
      ),
    );
    const root = await mkdtemp(join(tmpdir(), "contract-acquisition-"));
    const initial = resolveAuditContext(example.config, []);
    await saveEnterpriseRun(join(root, "initial"), initial);
    const entry = example.evaluations.find((e) => e.kind === kind);
    entry.input.payload.capturedAt = "2026-11-18T11:00:00Z";
    entry.contract.validUntil = "2026-11-19T13:00:00Z";
    if (kind === "business-mapping") entry.mappingSource = null;
    const bundle = {
      sourceDigest: enterpriseDigest(initial),
      newRunId: "current",
      assessmentAt: initial.assessmentAt,
      evaluations: [entry],
    };
    await evaluateEnterpriseMeasurement(
      join(root, "initial"),
      bundle,
      join(root, "current"),
    );
    const current = await loadEnterpriseRun(join(root, "current"));
    const ids = current.measurementEvaluations[0].checkIds;
    const presence = current.checks.find((c) => c.checkId === ids[0]);
    expect(
      ids.map((id) => current.checks.find((c) => c.checkId === id).status),
    ).toEqual(["pass", "unknown", "unknown"]);
    const receipt = current.evidence.find(
      (e) => e.evidenceId === presence.evidenceIds[0],
    );
    expect(receipt.validUntil).toBe("2026-11-19T13:00:00.000Z");
    expect(receipt.content.row.contractDigest).toBe(
      enterpriseDigest(entry.contract),
    );
    expect(receipt.content.row.purpose).toBe("contract-acquisition");
    await evaluateEnterpriseMeasurement(
      join(root, "current"),
      {
        ...bundle,
        sourceDigest: enterpriseDigest(current),
        newRunId: "expired",
        assessmentAt: "2026-11-19T13:00:00Z",
      },
      join(root, "expired"),
    );
    const expired = await loadEnterpriseRun(join(root, "expired"));
    expect(
      ids.map((id) => expired.checks.find((c) => c.checkId === id).status),
    ).toEqual(["unknown", "unknown", "unknown"]);
    expect(
      expired.dataRequests.some((r) =>
        r.affectedCheckIds.includes(presence.checkId),
      ),
    ).toBe(true);
    const renewal = expired.dataRequests.filter((r) =>
      r.affectedCheckIds.some((id) => ids.includes(id)),
    );
    expect(renewal).toHaveLength(1);
    expect([...renewal[0].affectedCheckIds].sort()).toEqual([...ids].sort());
    entry.contract.confirmedAt = "2026-11-19T12:30:00Z";
    entry.contract.validUntil = "2026-11-20T13:00:00Z";
    await evaluateEnterpriseMeasurement(
      join(root, "expired"),
      {
        ...bundle,
        sourceDigest: enterpriseDigest(expired),
        newRunId: "renewed",
        assessmentAt: expired.assessmentAt,
      },
      join(root, "renewed"),
    );
    const renewed = await loadEnterpriseRun(join(root, "renewed"));
    expect(
      renewed.checks.find((c) => c.checkId === presence.checkId).status,
    ).toBe("pass");
    expect(
      renewed.dataRequests.some((r) =>
        r.affectedCheckIds.includes(presence.checkId),
      ),
    ).toBe(false);
    entry.contract = null;
    await evaluateEnterpriseMeasurement(
      join(root, "renewed"),
      {
        ...bundle,
        sourceDigest: enterpriseDigest(renewed),
        newRunId: "removed",
        assessmentAt: renewed.assessmentAt,
      },
      join(root, "removed"),
    );
    const removed = await loadEnterpriseRun(join(root, "removed"));
    expect(
      ids.map((id) => removed.checks.find((c) => c.checkId === id).status),
    ).toEqual(["unknown", "unknown", "unknown"]);
    expect(
      removed.dataRequests.some((r) =>
        r.affectedCheckIds.includes(presence.checkId),
      ),
    ).toBe(true);
    expect(
      removed.history.some(
        (h) =>
          h.check.checkId === presence.checkId && h.check.status === "pass",
      ),
    ).toBe(true);
  },
);
it("bounds total active and historical checks before writing a revision", async () => {
  const f = await setup("container");
  function entry(id, offset) {
    return {
      evaluationId: `gtm-${id}`,
      kind: "dependencies",
      context: {
        ...f.entry.context,
        resource: "accounts/1/containers/2",
        versionId: "3",
        windowId: id,
      },
      input: {
        customerId: "customer",
        entityId: "analytics",
        payload: {
          sourceId: `gtm-${id}`,
          synthetic: true,
          capturedAt: "2026-11-19T11:00:00Z",
          version: {
            accountId: "1",
            containerId: "2",
            containerVersionId: "3",
            path: "accounts/1/containers/2/versions/3",
            tag: Array.from({ length: 26 }, (_, i) => ({
              tagId: String(offset + i + 1),
              name: `Tag ${i + 1}`,
              firingTriggerId: Array.from({ length: 100 }, (_, j) =>
                String(offset + i * 100 + j + 1),
              ),
            })),
            trigger: [],
            variable: [],
            builtInVariable: [],
          },
          collections: {
            tag: { complete: true },
            trigger: { complete: true },
            variable: { complete: true },
            builtInVariable: { complete: true },
          },
        },
      },
      builtinTriggerInventory: null,
    };
  }
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [entry("a", 0), entry("b", 0)] },
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  await expect(
    evaluateEnterpriseMeasurement(
      join(f.root, "assessed"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(first),
        newRunId: "overflow",
        evaluations: [entry("a", 10000), entry("b", 10000)],
      },
      join(f.root, "overflow"),
    ),
  ).rejects.toThrow("Measurement check budget exceeded");
  await expect(loadEnterpriseRun(join(f.root, "overflow"))).rejects.toThrow();
}, 30000);
it("replays measurement after another workflow invalidates expired evidence", async () => {
  const f = await setup();
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  const expired = forkEnterpriseEvidenceRun(
    first,
    {
      sourceDigest: enterpriseDigest(first),
      newRunId: "external",
      assessmentAt: "2026-11-19T14:00:00Z",
      responses: [{}],
    },
    "responses",
  );
  await saveEnterpriseRun(join(f.root, "external"), expired);
  await evaluateEnterpriseMeasurement(
    join(f.root, "external"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(expired),
      newRunId: "resumed",
      assessmentAt: expired.assessmentAt,
    },
    join(f.root, "resumed"),
  );
  const resumed = await loadEnterpriseRun(join(f.root, "resumed"));
  expect(
    resumed.checks
      .filter((c) => c.ruleId.startsWith("measurement-assessment-"))
      .map((c) => c.status),
  ).toEqual(["pass", "unknown"]);
});
it("preserves supplied request evidence and expiry without promoting unknown checks", async () => {
  const f = await setup();
  f.entry.contract = null;
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const first = await loadEnterpriseRun(join(f.root, "assessed"));
  const request = first.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("measurement-assessment-"),
  );
  const content = { note: "Owner supplied material pending assessment" };
  const evidence = {
    evidenceId: "response",
    customerId: first.customerId,
    runId: first.runId,
    entityId: "analytics",
    source: "supplied-response",
    artifactType: request.requestedArtifact,
    scopeKey: request.scopeKey,
    windowId: request.windowId,
    observedAt: first.assessmentAt,
    validUntil: "2026-11-19T13:00:00Z",
    digest: enterpriseDigest(content),
    content,
  };
  first.evidence.push(evidence);
  Object.assign(request, {
    status: "provided",
    evidenceIds: [evidence.evidenceId],
    evidenceDigests: { [evidence.evidenceId]: evidence.digest },
  });
  await saveEnterpriseRun(join(f.root, "provided"), first);
  for (const [name, at, status] of [
    ["current", first.assessmentAt, "provided"],
    ["expired", "2026-11-19T14:00:00Z", "expired"],
  ]) {
    await evaluateEnterpriseMeasurement(
      join(f.root, "provided"),
      {
        ...f.bundle,
        sourceDigest: enterpriseDigest(first),
        newRunId: name,
        assessmentAt: at,
      },
      join(f.root, name),
    );
    const run = await loadEnterpriseRun(join(f.root, name)),
      actual = run.dataRequests.find(
        (r) => r.requestedArtifact === request.requestedArtifact,
      );
    expect(actual.status).toBe(status);
    expect(actual.evidenceIds).toEqual(
      status === "provided" ? ["response"] : [],
    );
    expect(
      run.checks.find((c) => c.checkId === request.affectedCheckIds[0]).status,
    ).toBe("unknown");
  }
});
it("integrates GTM dependency failures and grouped unknown requests with source lineage", async () => {
  const f = await setup("container");
  const entry = {
    evaluationId: "gtm",
    kind: "dependencies",
    context: {
      ...f.entry.context,
      resource: "accounts/1/containers/2",
      versionId: "3",
    },
    input: {
      ...f.entry.input,
      payload: {
        sourceId: "gtm",
        synthetic: true,
        capturedAt: "2026-11-19T11:00:00Z",
        version: {
          accountId: "1",
          containerId: "2",
          containerVersionId: "3",
          path: "accounts/1/containers/2/versions/3",
          tag: [
            {
              tagId: "1",
              name: "Tag",
              firingTriggerId: ["99"],
              parameter: [{ key: "v", type: "template", value: "{{Missing}}" }],
            },
          ],
          trigger: [],
          variable: [],
          builtInVariable: [],
        },
        collections: {
          tag: { complete: true },
          trigger: { complete: true },
          variable: { complete: true },
          builtInVariable: { complete: true },
        },
      },
    },
    builtinTriggerInventory: null,
  };
  const r = await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [entry] },
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(r.findings).toHaveLength(1);
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("measurement-assessment-"))
      .every((c) => c.moduleId === "tracking"),
  ).toBe(true);
  expect(
    run.dataRequests.filter((q) =>
      q.requestedArtifact.startsWith("measurement-assessment-"),
    ),
  ).toHaveLength(1);
  expect(
    run.evidence.some((e) =>
      e.source.startsWith("synthetic-supplied-measurement-dependencies"),
    ),
  ).toBe(true);
  const previousCheckIds = run.checks
    .filter(
      (c) =>
        run.measurementEvaluations[0].checkIds.includes(c.checkId) &&
        c.status !== "pass",
    )
    .map((c) => c.checkId);
  entry.input.payload.version.tag = [];
  await evaluateEnterpriseMeasurement(
    join(f.root, "assessed"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(run),
      newRunId: "removed",
      evaluations: [entry],
    },
    join(f.root, "removed"),
  );
  const removed = await loadEnterpriseRun(join(f.root, "removed"));
  for (const id of previousCheckIds)
    expect(removed.checks.find((c) => c.checkId === id)).toMatchObject({
      status: "unknown",
      reason: "superseded-measurement-check-needs-review",
    });
  for (const mode of ["promote", "remove-history"]) {
    const forged = structuredClone(removed);
    if (mode === "promote")
      Object.assign(
        forged.checks.find((c) => c.checkId === previousCheckIds[0]),
        { status: "pass", assessedAt: forged.assessmentAt },
      );
    else forged.measurementEvaluations[0].historyEvidenceIds = [];
    await saveEnterpriseRun(join(f.root, mode), forged);
    await expect(
      evaluateEnterpriseMeasurement(
        join(f.root, mode),
        {
          ...f.bundle,
          evaluations: [entry],
          sourceDigest: enterpriseDigest(forged),
          newRunId: `reject-${mode}`,
        },
        join(f.root, `reject-${mode}`),
      ),
    ).rejects.toThrow(/measurement.*mismatch/i);
  }
});
it("keeps current business semantics in the report when unrelated GA4 config expires", async () => {
  const f = await setup();
  const contract = {
    schemaVersion: 1,
    contractId: "business",
    customerId: "customer",
    entityId: "analytics",
    resource: "properties/123",
    ownerRole: "business-owner",
    confirmedAt: "2026-11-19T10:00:00Z",
    validUntil: "2026-11-20T10:00:00Z",
    businessWindow: {
      from: "2026-11-01T00:00:00Z",
      to: "2026-11-18T00:00:00Z",
    },
    dictionary: {
      version: "1",
      sourceSystem: "orders",
      outcomes: [
        {
          outcomeId: "paid",
          businessModel: "commerce",
          allowedStatuses: ["attempt", "settled"],
          successStatuses: ["settled"],
        },
      ],
    },
    requirements: [
      {
        requirementId: "paid",
        outcomeId: "paid",
        meaning: "success",
        expectedKeyEvent: true,
        countingMethod: "ONCE_PER_EVENT",
      },
    ],
  };
  const entry = {
    ...f.entry,
    kind: "business-mapping",
    contract,
    mappingSource: {
      sourceId: "mapping",
      customerId: "customer",
      entityId: "analytics",
      resource: "properties/123",
      contractDigest: enterpriseDigest(contract),
      capturedAt: "2026-11-19T11:00:00Z",
      synthetic: true,
      complete: true,
      mappings: [
        {
          mappingId: "paid",
          requirementId: "paid",
          outcomeId: "paid",
          eventName: "purchase",
          representedStatuses: ["attempt"],
          meaning: "success",
        },
      ],
    },
  };
  entry.input.payload.capturedAt = "2026-11-18T11:00:00Z";
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    {
      ...f.bundle,
      newRunId: "missing",
      evaluations: [{ ...entry, contract: null, mappingSource: null }],
    },
    join(f.root, "missing"),
  );
  const missing = await loadEnterpriseRun(join(f.root, "missing"));
  const r = await evaluateEnterpriseMeasurement(
    join(f.root, "missing"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(missing),
      evaluations: [entry],
    },
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  expect(r.findings).toHaveLength(1);
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("measurement-assessment-"))
      .map((c) => c.status),
  ).toEqual(["pass", "fail", "unknown"]);
  const report = buildEnterpriseReport(run, {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: r.findings,
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
});

it("binds replacement proposals to replay-proven historical and current checks without changing verdicts", async () => {
  const f = await setup();
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const first = await loadEnterpriseRun(join(f.root, "first"));
  f.entry.contract.expectations[0].id = "new-zone";
  await evaluateEnterpriseMeasurement(
    join(f.root, "first"),
    { ...f.bundle, sourceDigest: enterpriseDigest(first), newRunId: "second" },
    join(f.root, "second"),
  );
  const run = await loadEnterpriseRun(join(f.root, "second"));
  const original = enterpriseDigest(run);
  const prior = run.checks.find(
    (c) => c.reason === "superseded-measurement-check-needs-review",
  );
  const record = run.measurementEvaluations[0];
  const replacement = run.checks.find(
    (c) => record.checkIds.includes(c.checkId) && c.status === "fail",
  );
  const acquisition = run.checks.find(
    (c) =>
      record.checkIds.includes(c.checkId) &&
      c.reason === "current-contract-supplied-not-authenticated",
  );
  const input = {
    sourceRunDigest: original,
    proposerId: "author",
    proposedAt: run.assessmentAt,
    validUntil: "2026-11-19T12:30:00Z",
    evaluationId: record.evaluationId,
    checkId: prior.checkId,
    replacementCheckIds: [replacement.checkId],
    rationale:
      "Owner expectation ID changed; review semantic equivalence separately",
  };
  const proposed = proposeMeasurementReplacement(run, input);
  expect(proposed).toMatchObject({
    reviewRequired: true,
    applied: false,
    reviewerAuthenticated: false,
  });
  expect(proposed.targetDigest).toBe(enterpriseDigest(proposed.target));
  expect(enterpriseDigest(run)).toBe(original);
  expect(replacement.status).toBe("fail");
  expect(prior.status).toBe("unknown");
  expect(proposeMeasurementReplacement(run, input)).toEqual(proposed);
  const review = {
    targetDigest: proposed.targetDigest,
    reviewerId: "independent-reviewer",
    reviewerKind: "independent-ai",
    verdict: "accept",
    rationale: "Synthetic target-specific review",
    reviewedAt: input.proposedAt,
    validUntil: input.validUntil,
  };
  expect(
    validateMeasurementReplacementReview(
      run,
      proposed,
      review,
      input.proposedAt,
    ),
  ).toMatchObject({
    attributedReviewValid: true,
    reviewerAuthenticated: false,
    applied: false,
  });
  expect(
    validateMeasurementReplacementReview(
      run,
      proposed,
      { ...review, verdict: "reject" },
      input.proposedAt,
    ).verdict,
  ).toBe("reject");
  for (const mutation of [
    { reviewerId: input.proposerId },
    { targetDigest: "0".repeat(64) },
    { reviewedAt: "2026-11-20T12:00:00Z" },
    { validUntil: input.proposedAt },
    { verdict: "approved" },
  ])
    expect(() =>
      validateMeasurementReplacementReview(
        run,
        proposed,
        { ...review, ...mutation },
        input.proposedAt,
      ),
    ).toThrow();
  expect(() =>
    validateMeasurementReplacementReview(
      run,
      proposed,
      review,
      input.validUntil,
    ),
  ).toThrow();
  const receipt = {
    targetDigest: proposed.targetDigest,
    reviewDigest: enterpriseDigest(review),
    reviewerId: review.reviewerId,
    proposerId: input.proposerId,
    independentlyObserved: true,
    provenanceRef: "synthetic-independent-session",
  };
  const prepared = prepareMeasurementDisposition(run, proposed, review, {
    assessmentAt: input.proposedAt,
    trustedReviews: [receipt],
  });
  expect(prepared).toMatchObject({
    checkId: prior.checkId,
    proposedStatus: "not-applicable",
    applied: false,
    reviewerAuthenticated: false,
  });
  expect(prepared.evidence.digest).toBe(
    enterpriseDigest(prepared.evidence.content),
  );
  expect(enterpriseDigest(run)).toBe(original);
  for (const receipts of [
    [],
    [{ ...receipt, independentlyObserved: false }],
    [{ ...receipt, reviewDigest: "0".repeat(64) }],
    [{ ...receipt, provenanceRef: "" }],
  ])
    expect(() =>
      prepareMeasurementDisposition(run, proposed, review, {
        assessmentAt: input.proposedAt,
        trustedReviews: receipts,
      }),
    ).toThrow();
  expect(() =>
    prepareMeasurementDisposition(
      run,
      proposed,
      { ...review, verdict: "reject" },
      { assessmentAt: input.proposedAt, trustedReviews: [receipt] },
    ),
  ).toThrow();
  expect(() =>
    validateMeasurementReplacementReview(
      run,
      { ...proposed, applied: true },
      review,
      input.proposedAt,
    ),
  ).toThrow();

  for (const mutation of [
    { sourceRunDigest: "0".repeat(64) },
    { checkId: replacement.checkId },
    { replacementCheckIds: [prior.checkId] },
    { replacementCheckIds: [acquisition.checkId] },
    { replacementCheckIds: [] },
    { replacementCheckIds: [replacement.checkId, replacement.checkId] },
    { validUntil: "2026-11-20T12:00:00Z" },
    { approved: true },
  ])
    expect(() =>
      proposeMeasurementReplacement(run, { ...input, ...mutation }),
    ).toThrow();

  const appliedResult = await applyMeasurementDispositions(
    join(f.root, "second"),
    {
      sourceDigest: original,
      newRunId: "applied",
      assessmentAt: "2026-11-19T12:01:00Z",
      dispositions: [{ proposal: proposed, review }],
    },
    join(f.root, "applied"),
    { trustedReviews: [receipt] },
  );
  expect(appliedResult.appliedCheckIds).toEqual([prior.checkId]);
  const applied = await loadEnterpriseRun(join(f.root, "applied"));
  expect(applied.checks.find((c) => c.checkId === prior.checkId).status).toBe(
    "not-applicable",
  );
  expect(applied.checks.find((c) => c.checkId === replacement.checkId)).toEqual(
    replacement,
  );
  expect(applied.declaredScope).toEqual(run.declaredScope);
  expect(
    applied.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    ),
  ).toMatchObject({
    status: "provided",
    affectedCheckIds: [prior.checkId],
    revalidateOnCheckInvalidation: true,
  });
  expect(
    applied.dataRequests.some(
      (r) =>
        r.requestedArtifact.endsWith("-scope-transition") &&
        r.affectedCheckIds.includes(prior.checkId),
    ),
  ).toBe(false);
  expect(() => inspectEnterpriseMeasurement(applied)).not.toThrow();
  await revokeMeasurementDispositions(
    join(f.root, "applied"),
    {
      sourceDigest: enterpriseDigest(applied),
      newRunId: "revoked",
      assessmentAt: "2026-11-19T12:02:00Z",
      revocations: [
        {
          checkId: prior.checkId,
          actorId: "owner",
          reason: "Synthetic review withdrawn",
        },
      ],
    },
    join(f.root, "revoked"),
  );
  const revoked = await loadEnterpriseRun(join(f.root, "revoked"));
  expect(revoked.checks.find((c) => c.checkId === prior.checkId).status).toBe(
    "unknown",
  );
  expect(
    revoked.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    ).status,
  ).toBe("invalid");
  expect(
    revoked.evidence.some(
      (e) => e.artifactType === "measurement-disposition-revocation",
    ),
  ).toBe(true);
  expect(() => inspectEnterpriseMeasurement(revoked)).not.toThrow();
  const restored = structuredClone(revoked);
  Object.assign(
    restored.checks.find((c) => c.checkId === prior.checkId),
    applied.checks.find((c) => c.checkId === prior.checkId),
  );
  expect(() => inspectEnterpriseMeasurement(restored)).toThrow();

  const reportBundle = {
    revisionId: "base",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
    sourceRunDigest: original,
  };
  const parentReport = buildEnterpriseReport(run, reportBundle);
  const appliedReport = buildEnterpriseReport(
    applied,
    {
      ...reportBundle,
      revisionId: "applied",
      generatedAt: applied.assessmentAt,
      sourceRunDigest: enterpriseDigest(applied),
      parentReportDigest: enterpriseDigest(parentReport),
    },
    parentReport,
  );
  await saveEnterpriseReport(join(f.root, "applied-report"), appliedReport);
  expect(
    enterpriseDigest(
      await loadEnterpriseReport(join(f.root, "applied-report")),
    ),
  ).toBe(enterpriseDigest(appliedReport));
  expect(() =>
    buildEnterpriseReport(restored, {
      ...reportBundle,
      revisionId: "forged-restore",
      generatedAt: restored.assessmentAt,
      sourceRunDigest: enterpriseDigest(restored),
    }),
  ).toThrow();
  const unrelated = structuredClone(applied);
  unrelated.policyVersions["unrelated-policy"] = "v1";
  expect(() => inspectEnterpriseMeasurement(unrelated)).not.toThrow();
  for (const mutation of [
    "reason",
    "assessedAt",
    "window",
    "module",
    "fallback",
  ]) {
    const tampered = structuredClone(
      mutation === "reason" || mutation === "assessedAt" ? applied : revoked,
    );
    const targetCheck = tampered.checks.find(
      (c) => c.checkId === prior.checkId,
    );
    const targetRequest = tampered.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    );
    if (mutation === "reason")
      targetCheck.reason = "Unsupported clean assertion";
    if (mutation === "assessedAt") targetCheck.assessedAt = run.assessmentAt;
    if (mutation === "window") {
      targetRequest.windowId = "other";
      targetRequest.id = createDataRequest(targetRequest).id;
    }
    if (mutation === "module")
      targetRequest.moduleIds = [
        tampered.moduleIds.find((id) => id !== targetCheck.moduleId),
      ];
    if (mutation === "fallback")
      targetRequest.fallback = "Mark clean without review";
    expect(() => inspectEnterpriseMeasurement(tampered)).toThrow();
  }
  const expired = forkEnterpriseEvidenceRun(
    applied,
    {
      sourceDigest: enterpriseDigest(applied),
      newRunId: "expired-disposition",
      assessmentAt: review.validUntil,
      responses: [{}],
    },
    "responses",
  );
  expect(expired.checks.find((c) => c.checkId === prior.checkId).status).toBe(
    "unknown",
  );
  expect(
    expired.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    ).status,
  ).toBe("expired");
  expect(() => inspectEnterpriseMeasurement(expired)).not.toThrow();
  await evaluateEnterpriseMeasurement(
    join(f.root, "applied"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(applied),
      newRunId: "after-disposition",
      assessmentAt: "2026-11-19T12:02:00Z",
    },
    join(f.root, "after-disposition"),
  );
  const reassessed = await loadEnterpriseRun(join(f.root, "after-disposition"));
  expect(
    reassessed.checks.find((c) => c.checkId === prior.checkId).status,
  ).toBe("unknown");
  expect(
    reassessed.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    ).status,
  ).toBe("invalid");
  expect(() => inspectEnterpriseMeasurement(reassessed)).not.toThrow();
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "second"))),
  ).toBe(original);

  f.entry.contract.expectations[0].id = "zone";
  await evaluateEnterpriseMeasurement(
    join(f.root, "applied"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(applied),
      newRunId: "returned-obligation",
      assessmentAt: "2026-11-19T12:03:00Z",
    },
    join(f.root, "returned-obligation"),
  );
  const returned = await loadEnterpriseRun(join(f.root, "returned-obligation"));
  expect(returned.checks.find((c) => c.checkId === prior.checkId).status).toBe(
    "fail",
  );
  expect(
    returned.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    ).status,
  ).toBe("invalid");
  expect(() => inspectEnterpriseMeasurement(returned)).not.toThrow();

  await revokeMeasurementDispositions(
    join(f.root, "returned-obligation"),
    {
      sourceDigest: enterpriseDigest(returned),
      newRunId: "revoke-historical",
      assessmentAt: "2026-11-19T12:04:00Z",
      revocations: [
        {
          checkId: prior.checkId,
          actorId: "owner",
          reason: "Withdraw old review; preserve current reassessment",
        },
      ],
    },
    join(f.root, "revoke-historical"),
  );
  const historicalRevoked = await loadEnterpriseRun(
    join(f.root, "revoke-historical"),
  );
  expect(
    historicalRevoked.checks.find((c) => c.checkId === prior.checkId),
  ).toEqual(returned.checks.find((c) => c.checkId === prior.checkId));
  expect(() => inspectEnterpriseMeasurement(historicalRevoked)).not.toThrow();

  f.entry.contract.expectations[0].id = "new-zone";
  await evaluateEnterpriseMeasurement(
    join(f.root, "returned-obligation"),
    {
      ...f.bundle,
      sourceDigest: enterpriseDigest(returned),
      newRunId: "disappeared-again",
      assessmentAt: "2026-11-19T12:05:00Z",
    },
    join(f.root, "disappeared-again"),
  );
  const disappeared = await loadEnterpriseRun(
    join(f.root, "disappeared-again"),
  );
  expect(
    disappeared.checks.find((c) => c.checkId === prior.checkId).status,
  ).toBe("unknown");
  expect(() => inspectEnterpriseMeasurement(disappeared)).not.toThrow();

  async function renewFrom(source, sourcePath, newRunId, assessmentAt) {
    const proposal = proposeMeasurementReplacement(source, {
      ...input,
      sourceRunDigest: enterpriseDigest(source),
      proposedAt: assessmentAt,
      validUntil: "2026-11-19T12:45:00Z",
    });
    const newReview = {
      ...review,
      targetDigest: proposal.targetDigest,
      reviewedAt: assessmentAt,
      validUntil: proposal.target.validUntil,
      rationale: "Fresh independent review for current source",
    };
    const receipt = {
      targetDigest: proposal.targetDigest,
      reviewDigest: enterpriseDigest(newReview),
      reviewerId: newReview.reviewerId,
      proposerId: proposal.target.proposerId,
      independentlyObserved: true,
      provenanceRef: `synthetic-${newRunId}`,
    };
    const bundle = {
      sourceDigest: enterpriseDigest(source),
      newRunId,
      assessmentAt,
      dispositions: [{ proposal, review: newReview }],
    };
    await writeFile(
      join(f.root, `${newRunId}-input.json`),
      JSON.stringify(bundle),
    );
    await writeFile(
      join(f.root, `${newRunId}-host.json`),
      JSON.stringify({ trustedReviews: [receipt] }),
    );
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "skills/content-search-audit/scripts/audit.mjs",
          "enterprise-measurement-renew",
          sourcePath,
          join(f.root, `${newRunId}-input.json`),
          join(f.root, `${newRunId}-host.json`),
          join(f.root, newRunId),
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
    expect(result.appliedCheckIds).toEqual([prior.checkId]);
    return loadEnterpriseRun(join(f.root, newRunId));
  }
  const renewed = await renewFrom(
    revoked,
    join(f.root, "revoked"),
    "renewed-revoked",
    "2026-11-19T12:03:00Z",
  );
  expect(renewed.checks.find((c) => c.checkId === prior.checkId).status).toBe(
    "not-applicable",
  );
  expect(renewed.measurementDispositions[0].historyEvidenceIds).toEqual([
    applied.measurementDispositions[0].evidenceId,
  ]);
  expect(
    renewed.dataRequests.find(
      (r) => r.requestedArtifact === "measurement-disposition",
    ).invalidatedEvidenceDigests,
  ).toContain(
    applied.evidence.find(
      (e) => e.evidenceId === applied.measurementDispositions[0].evidenceId,
    ).digest,
  );
  expect(
    renewed.evidence.some(
      (e) => e.artifactType === "measurement-disposition-revocation",
    ),
  ).toBe(true);
  expect(() => inspectEnterpriseMeasurement(renewed)).not.toThrow();
  expect(() =>
    proposeMeasurementReplacement(renewed, {
      ...input,
      sourceRunDigest: enterpriseDigest(renewed),
      proposedAt: renewed.assessmentAt,
    }),
  ).toThrow(/unresolved/);
  const renewedAssessment = await renewFrom(
    reassessed,
    join(f.root, "after-disposition"),
    "renewed-reassessment",
    "2026-11-19T12:03:00Z",
  );
  expect(() => inspectEnterpriseMeasurement(renewedAssessment)).not.toThrow();
  const droppedProof = structuredClone(renewed);
  droppedProof.measurementDispositions[0].historyEvidenceIds = [];
  expect(() => inspectEnterpriseMeasurement(droppedProof)).toThrow(/chain/);
  const forged = structuredClone(run);
  forged.measurementEvaluations[0].historyEvidenceIds = [];
  expect(() =>
    proposeMeasurementReplacement(forged, {
      ...input,
      sourceRunDigest: enterpriseDigest(forged),
    }),
  ).toThrow();
});

it("reslices only reviewed targets and refuses application without a trusted review channel", async () => {
  const f = await setup();
  f.entry.contract.expectations.push({
    id: "currency",
    rule: "ga4-currency",
    subject: null,
    expected: "VND",
  });
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const first = await loadEnterpriseRun(join(f.root, "first"));
  for (const expectation of f.entry.contract.expectations)
    expectation.id = `new-${expectation.id}`;
  await evaluateEnterpriseMeasurement(
    join(f.root, "first"),
    { ...f.bundle, sourceDigest: enterpriseDigest(first), newRunId: "second" },
    join(f.root, "second"),
  );
  const source = await loadEnterpriseRun(join(f.root, "second"));
  const group = source.dataRequests.find((r) =>
    r.requestedArtifact.endsWith("-scope-transition"),
  );
  expect(group.affectedCheckIds).toHaveLength(2);
  group.status = "declined";
  group.reason = "Owner postponed remaining reviews";
  await saveEnterpriseRun(join(f.root, "declined"), source);
  const target = group.affectedCheckIds[0],
    replacement = source.checks.find((c) => c.status === "fail");
  const proposal = proposeMeasurementReplacement(source, {
    sourceRunDigest: enterpriseDigest(source),
    proposerId: "author",
    proposedAt: source.assessmentAt,
    validUntil: "2026-11-19T12:30:00Z",
    evaluationId: "ga4",
    checkId: target,
    replacementCheckIds: [replacement.checkId],
    rationale: "Synthetic scoped replacement for review",
  });
  const review = {
    targetDigest: proposal.targetDigest,
    reviewerId: "reviewer",
    reviewerKind: "independent-ai",
    verdict: "accept",
    rationale: "Synthetic review",
    reviewedAt: source.assessmentAt,
    validUntil: proposal.target.validUntil,
  };
  const bundle = {
    sourceDigest: enterpriseDigest(source),
    newRunId: "applied",
    assessmentAt: "2026-11-19T12:01:00Z",
    dispositions: [{ proposal, review }],
  };
  await expect(
    applyMeasurementDispositions(
      join(f.root, "declined"),
      bundle,
      join(f.root, "denied"),
      { trustedReviews: [] },
    ),
  ).rejects.toThrow(/receipt/);
  await expect(access(join(f.root, "denied"))).rejects.toThrow();
  const receipt = {
    targetDigest: proposal.targetDigest,
    reviewDigest: enterpriseDigest(review),
    reviewerId: review.reviewerId,
    proposerId: proposal.target.proposerId,
    independentlyObserved: true,
    provenanceRef: "synthetic-separate-session",
  };
  const cli = (...args) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ["skills/content-search-audit/scripts/audit.mjs", ...args],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
  const proposalInput = Object.fromEntries(
    [
      "sourceRunDigest",
      "proposerId",
      "proposedAt",
      "validUntil",
      "evaluationId",
      "checkId",
      "replacementCheckIds",
      "rationale",
    ].map((key) => [key, proposal.target[key]]),
  );
  await writeFile(
    join(f.root, "proposal-input.json"),
    JSON.stringify(proposalInput),
  );
  expect(
    cli(
      "enterprise-measurement-propose",
      join(f.root, "declined"),
      join(f.root, "proposal-input.json"),
    ),
  ).toEqual(proposal);
  await writeFile(
    join(f.root, "review-input.json"),
    JSON.stringify({ proposal, review, assessmentAt: bundle.assessmentAt }),
  );
  expect(
    cli(
      "enterprise-measurement-review",
      join(f.root, "declined"),
      join(f.root, "review-input.json"),
    ),
  ).toMatchObject({
    attributedReviewValid: true,
    reviewerAuthenticated: false,
  });
  await writeFile(join(f.root, "apply-input.json"), JSON.stringify(bundle));
  await writeFile(
    join(f.root, "host-review.json"),
    JSON.stringify({ trustedReviews: [receipt] }),
  );
  const appliedReceipt = cli(
    "enterprise-measurement-apply",
    join(f.root, "declined"),
    join(f.root, "apply-input.json"),
    join(f.root, "host-review.json"),
    join(f.root, "applied"),
  );
  expect(appliedReceipt.appliedCheckIds).toEqual([target]);
  expect(() =>
    cli(
      "enterprise-measurement-apply",
      join(f.root, "declined"),
      join(f.root, "apply-input.json"),
      join(f.root, "host-review.json"),
      join(f.root, "applied"),
    ),
  ).toThrow();

  const applied = await loadEnterpriseRun(join(f.root, "applied"));
  const remaining = applied.dataRequests.find(
    (r) => r.requestedArtifact === group.requestedArtifact,
  );
  expect(remaining.affectedCheckIds).toEqual(
    group.affectedCheckIds.filter((id) => id !== target),
  );
  expect(remaining.status).toBe("declined");
  expect(
    applied.dataRequests.filter(
      (r) => r.requestedArtifact === "measurement-disposition",
    ),
  ).toHaveLength(1);
  expect(applied.checks).toHaveLength(source.checks.length);
  expect(() => inspectEnterpriseMeasurement(applied)).not.toThrow();
});

it("rejects unowned disposition requests on a run without dispositions", async () => {
  const f = await setup();
  await evaluateEnterpriseMeasurement(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "assessed"),
  );
  const run = await loadEnterpriseRun(join(f.root, "assessed"));
  const original = run.dataRequests[0];
  run.dataRequests.push(
    createDataRequest({
      ...original,
      requestedArtifact: "measurement-disposition",
      windowId: "foreign-window",
      exportInstructions: "FORGED INSTRUCTIONS",
    }),
  );
  expect(() => inspectEnterpriseMeasurement(run)).toThrow(
    "Unowned disposition request",
  );
});
