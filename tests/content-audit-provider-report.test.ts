import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
  loadEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  planProviderRequests,
  importProviderSnapshots,
} from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";
import { projectStoredProviders } from "../scripts/enterprise-provider-report.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "provider-report-"));
  const fixture = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-ga4-config.json",
      "utf8",
    ),
  );
  fixture.input.payload.locator = "private-provider-report-canary";
  const run = resolveAuditContext(
    {
      customerId: fixture.input.customerId,
      runId: "initial",
      assessmentAt: fixture.input.payload.capturedAt,
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  await planProviderRequests(
    join(root, "initial"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "planned",
      assessmentAt: run.assessmentAt,
      targets: [fixture.target],
    },
    join(root, "planned"),
  );
  let source = join(root, "planned"),
    current = await loadEnterpriseRun(source);
  const add = async (input, id) => {
    await importProviderSnapshots(
      source,
      {
        sourceDigest: enterpriseDigest(current),
        newRunId: id,
        assessmentAt: current.assessmentAt,
        imports: [{ targetId: current.providerTargets[0].targetId, input }],
      },
      join(root, id),
    );
    source = join(root, id);
    current = await loadEnterpriseRun(source);
    return current;
  };
  return { root, fixture, planned: current, add };
}
it("reports pending sources with actionable requests without inventing measurements", async () => {
  const f = await setup(),
    p = projectStoredProviders(f.planned);
  expect(p.selections[0].state).toBe("missing-source");
  expect(p.selections[0].candidateEvidenceIds).toEqual([]);
  await buildStoredEnterpriseReport(
    join(f.root, "planned"),
    {
      sourceRunDigest: enterpriseDigest(f.planned),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.planned.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  const report = await loadEnterpriseReport(join(f.root, "report"));
  expect(report.narrative).toEqual([]);
  expect(
    report.dataRequests.some(
      (r) => r.requestedArtifact === "ga4-config" && r.status === "requested",
    ),
  ).toBe(true);
  expect(report.findings).toEqual([]);
});
it("retains exact-input aliases without treating repeat imports as independent sources", async () => {
  const f = await setup();
  await f.add(f.fixture.input, "first");
  const run = await f.add(f.fixture.input, "second");
  const p = projectStoredProviders(run);
  expect(p.selections[0]).toMatchObject({
    state: "single-input-candidate",
    freshSnapshotCount: 2,
    distinctFreshInputCount: 1,
  });
  expect(p.selections[0].candidateEvidenceIds).toHaveLength(2);
  expect(p.observations).toHaveLength(2);
  expect(p.findings).toEqual([]);
  expect(JSON.stringify(p)).not.toContain("private-provider-report-canary");
});
it("keeps different fresh inputs unresolved even when the request points to the newest import", async () => {
  const f = await setup();
  await f.add(f.fixture.input, "first");
  const other = structuredClone(f.fixture.input);
  other.payload.sourceId = "different-input";
  const run = await f.add(other, "second"),
    p = projectStoredProviders(run);
  expect(p.selections[0]).toMatchObject({
    state: "competing-inputs",
    distinctFreshInputCount: 2,
    candidateEvidenceIds: [],
  });
  expect(
    p.narrative.some((n) =>
      n.text.includes("not proof of conflicting metric values"),
    ),
  ).toBe(true);
  await buildStoredEnterpriseReport(
    join(f.root, "second"),
    {
      sourceRunDigest: enterpriseDigest(run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  const report = await loadEnterpriseReport(join(f.root, "report"));
  expect(
    report.narrative.some((n) => n.text.includes("competing-inputs")),
  ).toBe(true);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("private-provider-report-canary");
    expect(text).not.toContain("sourceEnvelope");
  }
});
it.each(["declined", "invalid"])(
  "preserves %s disposition despite usable retained input",
  async (status) => {
    const f = await setup(),
      run = await f.add(f.fixture.input, "first");
    run.dataRequests.find(
      (r) => r.id === run.providerTargets[0].requestId,
    ).status = status;
    expect(projectStoredProviders(run).selections[0]).toMatchObject({
      state: status,
      candidateEvidenceIds: [],
    });
  },
);
it("keeps expired snapshots historical and blocks input selection", async () => {
  const f = await setup(),
    run = await f.add(f.fixture.input, "first");
  const later = reconcileEnterpriseChecks(
    run,
    structuredClone(run),
    "2026-11-20T12:00:00Z",
  ).run;
  const p = projectStoredProviders(later);
  expect(p.selections[0]).toMatchObject({
    state: "expired",
    freshSnapshotCount: 0,
    candidateEvidenceIds: [],
  });
  expect(p.observations[0].classification).toBe("historical");
});

it("does not select a fresh input when provided fulfillment has no evidence membership", async () => {
  const f = await setup(),
    run = await f.add(f.fixture.input, "first");
  const request = run.dataRequests.find(
    (r) => r.id === run.providerTargets[0].requestId,
  );
  request.evidenceIds = [];
  request.evidenceDigests = {};
  expect(() => projectStoredProviders(run)).toThrow(
    "Invalid data request evidence bindings",
  );
  request.status = "requested";
  expect(projectStoredProviders(run).selections[0]).toMatchObject({
    state: "awaiting-reassessment",
    candidateEvidenceIds: [],
  });
});
