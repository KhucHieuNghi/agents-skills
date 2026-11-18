import { expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkIdentity,
  validateEnterpriseRun,
  reconcileEnterpriseChecks,
  saveEnterpriseRun,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { enterpriseCoverage } from "../skills/content-search-audit/scripts/lib/enterprise-coverage.mjs";

const now = "2026-11-18T12:00:00.000Z";
function fixture() {
  const identity = {
    moduleId: "consent",
    ruleId: "consent-timing",
    ruleVersion: "1",
    entityId: "site",
    windowId: null,
  };
  const checks = ["accept", "reject"].map((scenarioId) => ({
    ...identity,
    scenarioId,
    checkId: checkIdentity({ ...identity, scenarioId }),
    status: "pass",
    evidenceIds: [scenarioId],
    dependencies: [scenarioId],
    policyIds: ["cmp"],
    assessedAt: now,
    reason: "Observed expected behavior",
  }));
  return {
    schemaFamily: "enterprise-audit",
    schemaVersion: 1,
    customerId: "customer-a",
    runId: "run-a",
    operationMode: "audit",
    inventoryMode: "sample",
    assessmentAt: now,
    profileVersions: { commerce: "1" },
    ruleVersions: { "consent/consent-timing": "1" },
    policyVersions: { cmp: "1" },
    entities: [
      {
        entityId: "site",
        type: "site",
        customerId: "customer-a",
        runId: "run-a",
      },
    ],
    declaredScope: {
      moduleIds: ["consent", "performance"],
      checks: checks.map(({ checkId, moduleId, entityId }) => ({
        checkId,
        moduleId,
        entityId,
      })),
    },
    moduleIds: ["consent", "performance"],
    checks,
    evidence: ["accept", "reject"].map((evidenceId) => ({
      evidenceId,
      customerId: "customer-a",
      runId: "run-a",
      entityId: "site",
      digest: "a".repeat(64),
      observedAt: now,
      validUntil: "2026-11-19T12:00:00.000Z",
      source: "supplied-trace",
    })),
  };
}

it("keeps accept and reject scenarios distinct and accounts for a missing module", () => {
  const run = fixture();
  expect(validateEnterpriseRun(run)).toEqual(run);
  const coverage = enterpriseCoverage(run);
  expect(coverage.modules.consent).toMatchObject({
    passed: 2,
    unknown: 0,
    assessmentCoverage: 1,
  });
  expect(coverage.modules.performance).toMatchObject({
    total: 0,
    assessmentCoverage: null,
    status: "unplanned",
  });
  expect(coverage.reportComplete).toBe(false);
  expect(
    checkIdentity({ ...run.checks[0], windowId: "previous-month" }),
  ).not.toBe(run.checks[0].checkId);
});

it("refuses mismatched identity, cross-customer evidence and unknown references", () => {
  for (const mutate of [
    (run: ReturnType<typeof fixture>) => {
      run.checks[0].scenarioId = "forged";
    },
    (run: ReturnType<typeof fixture>) => {
      run.evidence[0].customerId = "other";
    },
    (run: ReturnType<typeof fixture>) => {
      run.checks[0].evidenceIds = ["absent"];
    },
    (run: ReturnType<typeof fixture>) => {
      run.evidence.push({ ...run.evidence[0] });
    },
  ]) {
    const run = fixture();
    mutate(run);
    expect(() => validateEnterpriseRun(run)).toThrow();
  }
});

it("invalidates only changed dependencies while retaining historical observations", () => {
  const previous = fixture();
  const next = structuredClone(previous);
  next.evidence[0].digest = "b".repeat(64);
  const result = reconcileEnterpriseChecks(previous, next, now);
  expect(result.invalidatedCheckIds).toEqual([previous.checks[0].checkId]);
  expect(result.run.checks.map((c: { status: string }) => c.status)).toEqual([
    "unknown",
    "pass",
  ]);
  expect(result.run.history[0].check.status).toBe("pass");
  expect(previous.checks[0].status).toBe("pass");
});

it("expires identical evidence and rejects reuse after policy or profile changes", () => {
  const previous = fixture();
  const expired = reconcileEnterpriseChecks(
    previous,
    previous,
    "2026-11-20T12:00:00.000Z",
  );
  expect(expired.invalidatedCheckIds).toHaveLength(2);
  const policy = structuredClone(previous);
  policy.policyVersions.cmp = "2";
  expect(
    reconcileEnterpriseChecks(previous, policy, now).invalidatedCheckIds,
  ).toHaveLength(2);
  const profile = structuredClone(previous);
  profile.profileVersions.commerce = "2";
  expect(
    reconcileEnterpriseChecks(previous, profile, now).invalidatedCheckIds,
  ).toHaveLength(2);
});

it("rejects foreign entity ownership and invalidates changed entity identity", () => {
  const previous = fixture();
  expect(() =>
    validateEnterpriseRun({
      ...previous,
      entities: [{ ...previous.entities[0], customerId: "other" }],
    }),
  ).toThrow();
  const changed = {
    ...previous,
    entities: [{ ...previous.entities[0], url: "https://different.example" }],
  };
  expect(
    reconcileEnterpriseChecks(previous, changed, now).invalidatedCheckIds,
  ).toHaveLength(2);
});

it("does not count not-applicable or unknown as assessed and rejects unsupported modes", () => {
  const run = fixture();
  run.checks[0] = { ...run.checks[0], status: "unknown", reason: "Need trace" };
  const coverage = enterpriseCoverage(run);
  expect(coverage.modules.consent.assessmentCoverage).toBe(0.5);
  expect(() =>
    validateEnterpriseRun({ ...run, operationMode: "full" }),
  ).toThrow();
  expect(() =>
    validateEnterpriseRun({ ...run, inventoryMode: "audit" }),
  ).toThrow();
  expect(() => validateEnterpriseRun({ ...run, schemaVersion: 2 })).toThrow();
});

it("persists an immutable enterprise run and rejects tampered contents", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "enterprise-state-"));
  try {
    const directory = path.join(root, "run");
    await saveEnterpriseRun(directory, fixture());
    expect(await loadEnterpriseRun(directory)).toEqual(fixture());
    await expect(saveEnterpriseRun(directory, fixture())).rejects.toThrow();
    const raw = await readFile(
      path.join(directory, "enterprise-run.json"),
      "utf8",
    );
    expect(JSON.parse(raw).schemaFamily).toBe("enterprise-audit");
    await writeFile(
      path.join(directory, "enterprise-run.json"),
      raw.replace("Observed expected behavior", "tampered conclusion"),
    );
    await expect(loadEnterpriseRun(directory)).rejects.toThrow(/digest/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("requires explicit lineage and reuses unchanged assets across a declared parent revision", () => {
  const previous = fixture();
  const next = {
    ...previous,
    runId: "next",
    entities: previous.entities.map((entity) => ({ ...entity, runId: "next" })),
    evidence: previous.evidence.map((item) => ({ ...item, runId: "next" })),
  };
  expect(() => reconcileEnterpriseChecks(previous, next, now)).toThrow(
    /lineage/,
  );
  const child = {
    ...next,
    parentRunIds: [previous.runId],
    evidence: previous.evidence,
  };
  expect(
    reconcileEnterpriseChecks(previous, child, now).retainedCheckIds,
  ).toHaveLength(2);
});

it("preserves removed verdicts and declared coverage instead of silently shrinking scope", () => {
  const previous = fixture();
  const next = {
    ...previous,
    checks: [previous.checks[0]],
    moduleIds: ["consent"],
  };
  const result = reconcileEnterpriseChecks(previous, next, now);
  expect(result.run.history).toHaveLength(1);
  expect(result.invalidatedCheckIds).toEqual([previous.checks[1].checkId]);
  expect(enterpriseCoverage(result.run).modules.consent).toMatchObject({
    total: 2,
    passed: 1,
    unknown: 1,
  });
  expect(enterpriseCoverage(result.run).reportComplete).toBe(false);
});

it("rejects future observations, expired dependencies and future N/A reviews at validation", () => {
  for (const change of [
    { observedAt: "2026-11-19T12:00:00Z", validUntil: "2026-11-20T12:00:00Z" },
    { observedAt: "2026-11-17T12:00:00Z", validUntil: "2026-11-18T11:00:00Z" },
  ]) {
    const run = fixture();
    run.evidence[0] = { ...run.evidence[0], ...change };
    expect(() => validateEnterpriseRun(run)).toThrow(/temporal|freshness/);
  }
  const run = fixture();
  expect(() =>
    validateEnterpriseRun({
      ...run,
      checks: [
        {
          ...run.checks[0],
          status: "not-applicable",
          review: {
            reviewer: "r",
            rationale: "not relevant",
            reviewedAt: "2099-01-01T00:00:00Z",
          },
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    validateEnterpriseRun({
      ...run,
      history: [
        { customerId: "other", sourceRunId: "foreign", check: run.checks[0] },
      ],
    }),
  ).toThrow(/history/);
});

it("cannot persist a future assessment or a request claiming evidence from another customer", () => {
  const run = fixture();
  expect(() =>
    validateEnterpriseRun({
      ...run,
      checks: [{ ...run.checks[0], assessedAt: "2099-01-01T00:00:00Z" }],
    }),
  ).toThrow();
  expect(() =>
    validateEnterpriseRun({
      ...run,
      dataRequests: [
        {
          id: "fake",
          customerId: "other",
          runId: run.runId,
          affectedCheckIds: [run.checks[0].checkId],
        },
      ],
    }),
  ).toThrow();
});

it("requires a declared scope and rejects tampered embedded evidence and foreign response history", () => {
  const run = fixture();
  expect(() =>
    validateEnterpriseRun({ ...run, declaredScope: undefined }),
  ).toThrow(/scope/);
  expect(() =>
    validateEnterpriseRun({
      ...run,
      evidence: [{ ...run.evidence[0], content: "tampered" }, run.evidence[1]],
    }),
  ).toThrow(/digest/);
  expect(() =>
    validateEnterpriseRun({
      ...run,
      requestResponses: [{ customerId: "other", sourceRunId: "foreign" }],
    }),
  ).toThrow(/response/);
});
