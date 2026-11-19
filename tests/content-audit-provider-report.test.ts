import { previewProviderResolutions } from "../scripts/enterprise-provider-resolution-preview.mjs";
import { inspectGeneratedReportProvenance } from "../scripts/enterprise-report-provenance.mjs";
import {
  proposeProviderResolution,
  validateProviderResolutionReview,
} from "../scripts/enterprise-provider-resolution.mjs";
import { planProviderFollowups } from "../scripts/enterprise-provider-followups.mjs";
import { buildStoredGeneratedReportRevision } from "../scripts/enterprise-report-revision.mjs";
import { createHash } from "node:crypto";
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
import {
  loadEnterpriseReport,
  buildEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
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

async function searchFixture(rows, rowLimit = 1000, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "provider-gsc-report-"));
  const query = {
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    dimensions: ["query", "device"],
    ...(options.dataState ? { dataState: options.dataState } : {}),
    ...(options.queryAggregation
      ? { aggregationType: options.queryAggregation }
      : {}),
  };
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "source",
      assessmentAt: "2026-11-01T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "source"), run);
  await planProviderRequests(
    join(root, "source"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "planned",
      assessmentAt: run.assessmentAt,
      targets: [
        {
          kind: "gsc-search",
          entityId: "site",
          resource: "sc-domain:example.com",
          windowId: "oct",
          maxAgeSeconds: 86400,
          expectedQuery: query,
        },
      ],
    },
    join(root, "planned"),
  );
  const planned = await loadEnterpriseRun(join(root, "planned"));
  const responseText = JSON.stringify({
    rows,
    responseAggregationType: options.aggregation ?? "byProperty",
    ...(options.metadata ? { metadata: options.metadata } : {}),
  });
  const input = {
    customerId: "customer",
    entityId: "site",
    payload: {
      sourceId: "gsc",
      property: "sc-domain:example.com",
      locator: "PRIVATE_LOCATOR",
      capturedAt: run.assessmentAt,
      synthetic: true,
      pages: [
        {
          request: { ...query, rowLimit },
          responseText,
          responseHash: createHash("sha256").update(responseText).digest("hex"),
        },
      ],
    },
  };
  await importProviderSnapshots(
    join(root, "planned"),
    {
      sourceDigest: enterpriseDigest(planned),
      newRunId: "imported",
      assessmentAt: run.assessmentAt,
      imports: [{ targetId: planned.providerTargets[0].targetId, input }],
    },
    join(root, "imported"),
  );
  return { root, run: await loadEnterpriseRun(join(root, "imported")), input };
}
it("projects distinct GSC row metrics without summing or exposing private dimension values", async () => {
  const f = await searchFixture([
    {
      keys: ["PRIVATE_QUERY_A", "MOBILE"],
      clicks: 2,
      impressions: 10,
      ctr: 0.2,
      position: 3.5,
    },
    {
      keys: ["PRIVATE_QUERY_B", "MOBILE"],
      clicks: 2,
      impressions: 10,
      ctr: 0.2,
      position: 3.5,
    },
  ]);
  const p = projectStoredProviders(f.run);
  const metrics = p.observations.filter((o) =>
    o.observationId.startsWith("gsc-row-"),
  );
  expect(metrics).toHaveLength(8);
  expect(new Set(metrics.map((o) => o.observationId)).size).toBe(8);
  expect(
    metrics.filter((o) => o.unit === "clicks").map((o) => o.value),
  ).toEqual([2, 2]);
  expect(
    metrics.every((o) =>
      o.scopeDescription.includes("population completeness"),
    ),
  ).toBe(true);
  expect(JSON.stringify(p)).not.toContain("PRIVATE_QUERY");
  await buildStoredEnterpriseReport(
    join(f.root, "imported"),
    {
      sourceRunDigest: enterpriseDigest(f.run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE_QUERY");
    expect(text).not.toContain("PRIVATE_LOCATOR");
    expect(text).toContain("Supplied search row 1");
  }
});
it("does not convert missing pages or empty responses into zero metrics", async () => {
  const row = {
    keys: ["PRIVATE_QUERY", "MOBILE"],
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
  const incomplete = await searchFixture([row], 1);
  expect(
    projectStoredProviders(incomplete.run).observations.some((o) =>
      o.observationId.startsWith("gsc-row-"),
    ),
  ).toBe(false);
  expect(projectStoredProviders(incomplete.run).narrative[0].text).toContain(
    "incomplete-pagination",
  );
  const empty = await searchFixture([]);
  expect(
    projectStoredProviders(empty.run).observations.some((o) =>
      o.observationId.startsWith("gsc-row-"),
    ),
  ).toBe(false);
  const explicit = await searchFixture([row]);
  expect(
    projectStoredProviders(explicit.run)
      .observations.filter((o) => o.observationId.startsWith("gsc-row-"))
      .map((o) => o.value),
  ).toEqual([0, 0, 0, 0]);
});

it("withholds unsafe numerical values and oversized rowsets instead of rounding or truncating", async () => {
  const unsafe = await searchFixture([
    {
      keys: ["secret", "MOBILE"],
      clicks: Number.MAX_SAFE_INTEGER + 1,
      impressions: 1,
      ctr: 0.1,
      position: 1,
    },
  ]);
  expect(projectStoredProviders(unsafe.run).narrative[0].text).toContain(
    "unsupported-numeric-precision",
  );
  expect(
    projectStoredProviders(unsafe.run).observations.some((o) =>
      o.observationId.startsWith("gsc-row-"),
    ),
  ).toBe(false);
  const rows = Array.from({ length: 101 }, (_, i) => ({
    keys: [`private-${i}`, "MOBILE"],
    clicks: 1,
    impressions: 2,
    ctr: 0.5,
    position: 1,
  }));
  const large = await searchFixture(rows);
  expect(() => projectStoredProviders(large.run)).toThrow(
    /row budget exceeded/,
  );
});

it("retains stable GSC source rows through reimport, competition and expiry", async () => {
  const row = {
    keys: ["PRIVATE_QUERY", "MOBILE"],
    clicks: 2,
    impressions: 10,
    ctr: 0.2,
    position: 3,
  };
  const f = await searchFixture([row]);
  const original = projectStoredProviders(f.run).observations.filter((o) =>
    o.observationId.startsWith("gsc-row-"),
  );
  const metadata = {
    sourceRunDigest: enterpriseDigest(f.run),
    revisionId: "r1",
    authorId: "fixture",
    generatedAt: f.run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
  };
  const receipt = await buildStoredEnterpriseReport(
    join(f.root, "imported"),
    metadata,
    join(f.root, "parent"),
  );
  const parent = await loadEnterpriseReport(join(f.root, "parent"));
  const refused = structuredClone(f.run);
  refused.dataRequests.find(
    (r) => r.id === refused.providerTargets[0].requestId,
  ).status = "declined";
  const withheld = projectStoredProviders(refused);
  expect(
    withheld.observations.some((o) => o.observationId.startsWith("gsc-row-")),
  ).toBe(false);
  expect(withheld.narrative[0].text).toContain(
    "parent revision requires an authorized history disposition",
  );
  expect(() =>
    buildEnterpriseReport(
      f.run,
      {
        ...metadata,
        revisionId: "refused",
        generatedAt: "2026-11-01T12:00:01Z",
        parentReportDigest: enterpriseDigest(parent),
        findings: [],
        actions: [],
        decisions: [],
        observations: withheld.observations,
        narrative: withheld.narrative,
      },
      parent,
    ),
  ).toThrow(/Prior observation/);
  const parentBinding = {
    sourceDirectory: join(f.root, "imported"),
    reportDirectory: join(f.root, "parent"),
    sourceRunDigest: enterpriseDigest(f.run),
    reportDigest: enterpriseDigest(parent),
    manifestDigest: receipt.manifestDigest,
  };
  await importProviderSnapshots(
    join(f.root, "imported"),
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "alias",
      assessmentAt: f.run.assessmentAt,
      imports: [
        { targetId: f.run.providerTargets[0].targetId, input: f.input },
      ],
    },
    join(f.root, "alias"),
  );
  const alias = await loadEnterpriseRun(join(f.root, "alias"));
  expect(
    projectStoredProviders(alias).observations.filter((o) =>
      o.observationId.startsWith("gsc-row-"),
    ),
  ).toEqual(original);
  const other = structuredClone(f.input);
  other.payload.sourceId = "different-source";
  await importProviderSnapshots(
    join(f.root, "alias"),
    {
      sourceDigest: enterpriseDigest(alias),
      newRunId: "competing",
      assessmentAt: alias.assessmentAt,
      imports: [{ targetId: alias.providerTargets[0].targetId, input: other }],
    },
    join(f.root, "competing"),
  );
  const competing = await loadEnterpriseRun(join(f.root, "competing"));
  const all = projectStoredProviders(competing).observations.filter((o) =>
    o.observationId.startsWith("gsc-row-"),
  );
  expect(all).toHaveLength(8);
  expect(all.every((o) => o.classification === "historical")).toBe(true);
  await buildStoredGeneratedReportRevision(
    join(f.root, "competing"),
    {
      ...metadata,
      sourceRunDigest: enterpriseDigest(competing),
      revisionId: "r2",
      generatedAt: "2026-11-01T12:00:01Z",
    },
    [parentBinding],
    join(f.root, "child"),
  );
  const child = await loadEnterpriseReport(join(f.root, "child"));
  expect(child.parentReportDigest).toBe(enterpriseDigest(parent));
  for (const old of original)
    expect(
      child.observations.find((o) => o.observationId === old.observationId),
    ).toEqual({ ...old, classification: "historical" });
  for (const old of original)
    expect(all.find((o) => o.observationId === old.observationId)).toEqual({
      ...old,
      classification: "historical",
    });
  const later = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-03T12:00:00Z",
  ).run;
  const expired = projectStoredProviders(later).observations.filter((o) =>
    o.observationId.startsWith("gsc-row-"),
  );
  expect(expired).toEqual(
    original.map((o) => ({ ...o, classification: "historical" })),
  );
});

it.each([
  { dataState: "all" },
  { metadata: { first_incomplete_date: "2026-10-31" } },
  { metadata: 123 },
  { aggregation: "unknown" },
  { queryAggregation: "byPage", aggregation: "byProperty" },
])(
  "withholds unsupported preliminary or aggregation context %j",
  async (options) => {
    const f = await searchFixture(
      [
        {
          keys: ["secret", "MOBILE"],
          clicks: 1,
          impressions: 2,
          ctr: 0.5,
          position: 1,
        },
      ],
      1000,
      options,
    );
    const p = projectStoredProviders(f.run);
    expect(
      p.observations.some((o) => o.observationId.startsWith("gsc-row-")),
    ).toBe(false);
    expect(p.narrative[0].text).toMatch(
      /unsupported-preliminary-or-metadata|unsupported-aggregation|aggregation-mismatch/,
    );
    expect(p.narrative[0].text).toMatch(
      /Retain the original export|retain the original response|without modifying the original/,
    );
  },
);

async function analyticsFixture(options = {}) {
  const root = await mkdtemp(join(tmpdir(), "provider-ga4-report-"));
  const query = {
    dateRanges: [{ startDate: "2026-10-01", endDate: "2026-10-31" }],
    dimensions: [{ name: "city" }],
    ...(options.filter ? { dimensionFilter: options.filter } : {}),
    metrics: [
      {
        name: options.metric ?? "activeUsers",
        ...(options.expression ? { expression: options.expression } : {}),
      },
    ],
  };
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "source",
      assessmentAt: "2026-11-01T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "property", type: "property" },
      ],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "source"), run);
  await planProviderRequests(
    join(root, "source"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "planned",
      assessmentAt: run.assessmentAt,
      targets: [
        {
          kind: "ga4-report",
          entityId: "property",
          resource: "properties/123",
          windowId: "oct",
          maxAgeSeconds: 86400,
          expectedQuery: query,
        },
      ],
    },
    join(root, "planned"),
  );
  const planned = await loadEnterpriseRun(join(root, "planned"));
  const rows = options.rows ?? [
    {
      dimensionValues: [{ value: "PRIVATE_CITY_A" }],
      metricValues: [{ value: "3" }],
    },
    {
      dimensionValues: [{ value: "PRIVATE_CITY_B" }],
      metricValues: [{ value: "3" }],
    },
  ];
  const responseText = JSON.stringify({
    dimensionHeaders: [{ name: "city" }],
    metricHeaders: [
      {
        name: options.metric ?? "activeUsers",
        type: options.type ?? "TYPE_INTEGER",
      },
    ],
    rows,
    rowCount: options.rowCount ?? rows.length,
    ...(options.metadata === null
      ? {}
      : {
          metadata: options.metadata ?? {
            timeZone: "UTC",
            currencyCode: "USD",
            subjectToThresholding: true,
            samplingMetadatas: [
              { samplesReadCount: "10", samplingSpaceSize: "100" },
            ],
          },
        }),
  });
  const input = {
    customerId: "customer",
    entityId: "property",
    payload: {
      sourceId: "analytics",
      property: "properties/123",
      locator: "PRIVATE_GA4_LOCATOR",
      capturedAt: run.assessmentAt,
      synthetic: true,
      pages: [
        {
          request: { ...query, limit: "1000" },
          responseText,
          responseHash: createHash("sha256").update(responseText).digest("hex"),
        },
      ],
    },
  };
  if (options.splitPages) {
    input.payload.pages = rows.map((row, index) => {
      const pageText = JSON.stringify({
        ...JSON.parse(responseText),
        rows: [row],
      });
      return {
        request: { ...query, offset: String(index), limit: "1" },
        responseText: pageText,
        responseHash: createHash("sha256").update(pageText).digest("hex"),
      };
    });
  }
  await importProviderSnapshots(
    join(root, "planned"),
    {
      sourceDigest: enterpriseDigest(planned),
      newRunId: "imported",
      assessmentAt: run.assessmentAt,
      imports: [{ targetId: planned.providerTargets[0].targetId, input }],
    },
    join(root, "imported"),
  );
  return { root, run: await loadEnterpriseRun(join(root, "imported")), input };
}
it("projects supplied GA4 counts at row grain and discloses quality limitations", async () => {
  const f = await analyticsFixture();
  const p = projectStoredProviders(f.run);
  const rows = p.observations.filter((o) =>
    o.observationId.startsWith("ga4-row-"),
  );
  expect(rows.map((o) => o.value)).toEqual([3, 3]);
  const quality = p.narrative.find((n) =>
    n.narrativeId.startsWith("provider-quality-"),
  );
  expect(quality.text).toContain("thresholding warning");
  expect(quality.text).toContain("sampling warning");
  expect(
    rows.every(
      (o) =>
        o.precision === "approximate" &&
        o.scopeDescription.includes("thresholding reported") &&
        o.scopeDescription.includes("sampling reported") &&
        o.scopeDescription.includes("other metadata is not assessed"),
    ),
  ).toBe(true);
  expect(new Set(rows.map((o) => o.observationId)).size).toBe(2);
  await buildStoredEnterpriseReport(
    join(f.root, "imported"),
    {
      sourceRunDigest: enterpriseDigest(f.run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE_CITY");
    expect(text).not.toContain("PRIVATE_GA4_LOCATOR");
    expect(text).toContain("Supplied analytics row 1");
  }
});
it.each([
  [{ metadata: null }, "missing-or-invalid-timezone"],
  [
    { metadata: { timeZone: "UTC", samplingMetadatas: [null] } },
    "invalid-quality-metadata",
  ],
  [
    {
      metadata: { timeZone: "UTC", dataTruncationReasons: [{ private: "x" }] },
    },
    "invalid-quality-metadata",
  ],
  [
    { metadata: { timeZone: "UTC", subjectToThresholding: "false" } },
    "invalid-quality-metadata",
  ],
  [{ metric: "totalRevenue" }, "unsupported-metric"],
  [{ expression: "eventCount" }, "unsupported-metric-definition"],
  [{ type: "TYPE_FLOAT" }, "unsupported-numeric-precision"],
  [
    {
      rows: [
        {
          dimensionValues: [{ value: "secret" }],
          metricValues: [{ value: "9007199254740992" }],
        },
      ],
    },
    "unsupported-numeric-precision",
  ],
  [{ rowCount: 3 }, "incomplete-pagination"],
  [
    {
      metadata: {
        timeZone: "UTC",
        schemaRestrictionResponse: {
          activeMetricRestrictions: [{ metricName: "activeUsers" }],
        },
      },
    },
    "restricted-or-invalid-metrics",
  ],
])("withholds unsupported GA4 data %s", async (options, reason) => {
  const f = await analyticsFixture(options);
  const p = projectStoredProviders(f.run);
  expect(
    p.observations.some((o) => o.observationId.startsWith("ga4-row-")),
  ).toBe(false);
  expect(p.narrative[0].text).toContain(reason);
});

it("keeps GA4 filters private and distinguishes filtered rows", async () => {
  const f = await analyticsFixture({
    filter: {
      filter: { fieldName: "city", stringFilter: { value: "PRIVATE_FILTER" } },
    },
  });
  const p = projectStoredProviders(f.run);
  const row = p.observations.find((o) =>
    o.observationId.startsWith("ga4-row-"),
  );
  expect(row.scopeDescription).toContain("dimension filter present");
  expect(row.scopeDescription).toContain("1 declared dimensions");
  expect(JSON.stringify(p)).not.toContain("PRIVATE_FILTER");
});
it("keeps GA4 row identities through aliases, competing sources and expiry", async () => {
  const f = await analyticsFixture();
  const original = projectStoredProviders(f.run).observations.filter((o) =>
    o.observationId.startsWith("ga4-row-"),
  );
  const metadata = {
    sourceRunDigest: enterpriseDigest(f.run),
    revisionId: "r1",
    authorId: "fixture",
    generatedAt: f.run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
  };
  const receipt = await buildStoredEnterpriseReport(
    join(f.root, "imported"),
    metadata,
    join(f.root, "parent"),
  );
  const parent = await loadEnterpriseReport(join(f.root, "parent"));
  const parentBinding = {
    sourceDirectory: join(f.root, "imported"),
    reportDirectory: join(f.root, "parent"),
    sourceRunDigest: enterpriseDigest(f.run),
    reportDigest: enterpriseDigest(parent),
    manifestDigest: receipt.manifestDigest,
  };
  await importProviderSnapshots(
    join(f.root, "imported"),
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "alias",
      assessmentAt: f.run.assessmentAt,
      imports: [
        { targetId: f.run.providerTargets[0].targetId, input: f.input },
      ],
    },
    join(f.root, "alias"),
  );
  const alias = await loadEnterpriseRun(join(f.root, "alias"));
  expect(
    projectStoredProviders(alias).observations.filter((o) =>
      o.observationId.startsWith("ga4-row-"),
    ),
  ).toEqual(original);
  const other = structuredClone(f.input);
  other.payload.sourceId = "other-source";
  await importProviderSnapshots(
    join(f.root, "alias"),
    {
      sourceDigest: enterpriseDigest(alias),
      newRunId: "competing",
      assessmentAt: alias.assessmentAt,
      imports: [{ targetId: alias.providerTargets[0].targetId, input: other }],
    },
    join(f.root, "competing"),
  );
  const competing = await loadEnterpriseRun(join(f.root, "competing"));
  const rows = projectStoredProviders(competing).observations.filter((o) =>
    o.observationId.startsWith("ga4-row-"),
  );
  expect(rows).toHaveLength(4);
  await buildStoredGeneratedReportRevision(
    join(f.root, "competing"),
    {
      ...metadata,
      sourceRunDigest: enterpriseDigest(competing),
      revisionId: "r2",
      generatedAt: "2026-11-01T12:00:01Z",
    },
    [parentBinding],
    join(f.root, "child"),
  );
  const child = await loadEnterpriseReport(join(f.root, "child"));
  expect(child.parentReportDigest).toBe(enterpriseDigest(parent));
  for (const old of original)
    expect(
      child.observations.find((o) => o.observationId === old.observationId),
    ).toEqual({ ...old, classification: "historical" });
  for (const old of original)
    expect(rows.find((o) => o.observationId === old.observationId)).toEqual({
      ...old,
      classification: "historical",
    });
  const later = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-03T12:00:00Z",
  ).run;
  expect(
    projectStoredProviders(later).observations.filter((o) =>
      o.observationId.startsWith("ga4-row-"),
    ),
  ).toEqual(original.map((o) => ({ ...o, classification: "historical" })));
});

it("retains distinct GA4 source rows across multiple supplied pages", async () => {
  const f = await analyticsFixture({ splitPages: true });
  const rows = projectStoredProviders(f.run).observations.filter((o) =>
    o.observationId.startsWith("ga4-row-"),
  );
  expect(rows.map((o) => o.value)).toEqual([3, 3]);
  expect(new Set(rows.map((o) => o.observationId)).size).toBe(2);
});

async function bingFixture(
  kind,
  rows,
  period = "2026-10-01 to 2026-10-31",
  options = {},
) {
  const root = await mkdtemp(join(tmpdir(), "provider-bing-report-"));
  const scope = {
    locale: "en-US",
    market: "US",
    timezone: "UTC",
    period,
    surfaces: "PRIVATE_SURFACE",
  };
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "source",
      assessmentAt: "2026-11-01T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "source"), run);
  await planProviderRequests(
    join(root, "source"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "planned",
      assessmentAt: run.assessmentAt,
      targets: [
        {
          kind,
          entityId: "site",
          resource: "https://example.com/",
          windowId: "oct",
          maxAgeSeconds: 86400,
          expectedScope: scope,
        },
      ],
    },
    join(root, "planned"),
  );
  const planned = await loadEnterpriseRun(join(root, "planned"));
  const mapped = kind === "bing-ai-mapped";
  const responseText = JSON.stringify(mapped ? { rows } : { d: rows });
  const sourceText = "PRIVATE_MAPPED_SOURCE";
  const payload = {
    sourceId: "bing",
    siteUrl: "https://example.com/",
    locator: "PRIVATE_BING_LOCATOR",
    capturedAt: run.assessmentAt,
    synthetic: true,
    kind: mapped ? "ai-performance-mapped" : "search-query-stats",
    scope,
    responseText,
    responseHash: createHash("sha256").update(responseText).digest("hex"),
    ...(mapped
      ? {
          sourceText,
          sourceHash: createHash("sha256").update(sourceText).digest("hex"),
          mapping: {
            method: "PRIVATE_METHOD",
            reviewer: "PRIVATE_REVIEWER",
            reviewedAt: options.reviewedAt ?? run.assessmentAt,
          },
        }
      : {}),
  };
  const input = { customerId: "customer", entityId: "site", payload };
  await importProviderSnapshots(
    join(root, "planned"),
    {
      sourceDigest: enterpriseDigest(planned),
      newRunId: "imported",
      assessmentAt: run.assessmentAt,
      imports: [{ targetId: planned.providerTargets[0].targetId, input }],
    },
    join(root, "imported"),
  );
  return { root, run: await loadEnterpriseRun(join(root, "imported")), input };
}
it("reports Bing search row counts and position denominators separately without query text", async () => {
  const row = {
    Query: "PRIVATE_BING_QUERY",
    Date: "2026-10-15T23:30:00-07:00",
    Clicks: 3,
    Impressions: 20,
    AvgClickPosition: 2.5,
    AvgImpressionPosition: 4.5,
  };
  const f = await bingFixture("bing-search", [row]);
  const p = projectStoredProviders(f.run);
  const metrics = p.observations.filter((o) =>
    o.observationId.startsWith("bing-search-row-"),
  );
  expect(metrics.map((o) => o.value)).toEqual([3, 20, 2.5, 4.5]);
  expect(metrics[0].period).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  expect(metrics[0].scopeDescription).toContain(
    "row bucket boundaries and local date are unverified",
  );
  expect(metrics[2].label).toContain("click position");
  expect(metrics[3].label).toContain("impression position");
  await buildStoredEnterpriseReport(
    join(f.root, "imported"),
    {
      sourceRunDigest: enterpriseDigest(f.run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("PRIVATE_BING_QUERY");
    expect(text).not.toContain("PRIVATE_BING_LOCATOR");
    expect(text).toContain("Supplied Bing search row 1");
  }
});
it("retains supplied mapped Bing AI ranges and unknown values without exposing private mapping", async () => {
  const f = await bingFixture("bing-ai-mapped", [
    {
      dimensions: { topic: "PRIVATE_TOPIC" },
      metrics: {
        citations: { kind: "unknown", reason: "PRIVATE_REASON" },
        topicSize: { kind: "approximate", value: 100 },
        opportunityCitations: { kind: "range", lower: 20, upper: 40 },
      },
    },
  ]);
  const p = projectStoredProviders(f.run),
    metrics = p.observations.filter((o) =>
      o.observationId.startsWith("bing-ai-row-"),
    );
  expect(metrics.find((o) => o.label.endsWith(": Citations"))).toMatchObject({
    precision: "unknown",
    value: null,
  });
  expect(metrics.find((o) => o.label.endsWith(": Topic size"))).toMatchObject({
    precision: "approximate",
    value: 100,
  });
  expect(
    metrics.find((o) => o.label.endsWith(": Opportunity citations")),
  ).toMatchObject({ precision: "range", value: { min: 20, max: 40 } });
  expect(
    metrics.every((o) =>
      o.scopeDescription.includes(
        "not independently authenticated or semantically verified",
      ),
    ),
  ).toBe(true);
  await buildStoredEnterpriseReport(
    join(f.root, "imported"),
    {
      sourceRunDigest: enterpriseDigest(f.run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    for (const token of [
      "PRIVATE_TOPIC",
      "PRIVATE_REASON",
      "PRIVATE_METHOD",
      "PRIVATE_REVIEWER",
      "PRIVATE_SURFACE",
      "PRIVATE_MAPPED_SOURCE",
    ])
      expect(text).not.toContain(token);
    expect(text).toContain("Supplied mapped Bing AI row 1");
  }
});
it("withholds mapped Bing AI data with an ambiguous reporting period", async () => {
  const f = await bingFixture(
    "bing-ai-mapped",
    [
      {
        dimensions: { topic: "secret" },
        metrics: { citations: { kind: "exact", value: 1 } },
      },
    ],
    "last month",
  );
  const p = projectStoredProviders(f.run);
  expect(
    p.observations.some((o) => o.observationId.startsWith("bing-ai-row-")),
  ).toBe(false);
  expect(p.narrative[0].text).toContain("unsupported-declared-period");
});

it.each([
  [
    "bing-search",
    [
      {
        Query: "PRIVATE",
        Date: "2026-10-15T00:00:00Z",
        Clicks: 0,
        Impressions: 0,
        AvgClickPosition: 0,
        AvgImpressionPosition: 0,
      },
    ],
    "bing-search-row-",
  ],
  [
    "bing-ai-mapped",
    [
      {
        dimensions: { topic: "PRIVATE" },
        metrics: { citations: { kind: "exact", value: 0 } },
      },
    ],
    "bing-ai-row-",
  ],
])(
  "retains Bing %s row identities across competing inputs and parent revision",
  async (kind, inputRows, prefix) => {
    const f = await bingFixture(kind, inputRows);
    const original = projectStoredProviders(f.run).observations.filter((o) =>
      o.observationId.startsWith(prefix),
    );
    expect(original.length).toBeGreaterThan(0);
    expect(original.every((o) => o.value === 0)).toBe(true);
    const metadata = {
      sourceRunDigest: enterpriseDigest(f.run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: f.run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    };
    const receipt = await buildStoredEnterpriseReport(
      join(f.root, "imported"),
      metadata,
      join(f.root, "parent"),
    );
    const parent = await loadEnterpriseReport(join(f.root, "parent"));
    const binding = {
      sourceDirectory: join(f.root, "imported"),
      reportDirectory: join(f.root, "parent"),
      sourceRunDigest: enterpriseDigest(f.run),
      reportDigest: enterpriseDigest(parent),
      manifestDigest: receipt.manifestDigest,
    };
    await importProviderSnapshots(
      join(f.root, "imported"),
      {
        sourceDigest: enterpriseDigest(f.run),
        newRunId: "alias",
        assessmentAt: f.run.assessmentAt,
        imports: [
          { targetId: f.run.providerTargets[0].targetId, input: f.input },
        ],
      },
      join(f.root, "alias"),
    );
    const alias = await loadEnterpriseRun(join(f.root, "alias"));
    expect(
      projectStoredProviders(alias).observations.filter((o) =>
        o.observationId.startsWith(prefix),
      ),
    ).toEqual(original);
    const other = structuredClone(f.input);
    other.payload.sourceId = "different-source";
    await importProviderSnapshots(
      join(f.root, "alias"),
      {
        sourceDigest: enterpriseDigest(alias),
        newRunId: "competing",
        assessmentAt: alias.assessmentAt,
        imports: [
          { targetId: alias.providerTargets[0].targetId, input: other },
        ],
      },
      join(f.root, "competing"),
    );
    const competing = await loadEnterpriseRun(join(f.root, "competing"));
    await buildStoredGeneratedReportRevision(
      join(f.root, "competing"),
      {
        ...metadata,
        sourceRunDigest: enterpriseDigest(competing),
        revisionId: "r2",
        generatedAt: "2026-11-01T12:00:01Z",
      },
      [binding],
      join(f.root, "child"),
    );
    const child = await loadEnterpriseReport(join(f.root, "child"));
    for (const old of original)
      expect(
        child.observations.find((o) => o.observationId === old.observationId),
      ).toEqual({ ...old, classification: "historical" });
    const later = reconcileEnterpriseChecks(
      f.run,
      structuredClone(f.run),
      "2026-11-03T12:00:00Z",
    ).run;
    expect(
      projectStoredProviders(later).observations.filter((o) =>
        o.observationId.startsWith(prefix),
      ),
    ).toEqual(original.map((o) => ({ ...o, classification: "historical" })));
  },
);

it("withholds future Bing mapping reviews and ambiguous search scope rather than inventing a period", async () => {
  const mapped = await bingFixture(
    "bing-ai-mapped",
    [
      {
        dimensions: { topic: "secret" },
        metrics: { citations: { kind: "exact", value: 1 } },
      },
    ],
    "2026-10-01 to 2026-10-31",
    { reviewedAt: "2026-11-02T00:00:00Z" },
  );
  const mp = projectStoredProviders(mapped.run);
  expect(
    mp.observations.some((o) => o.observationId.startsWith("bing-ai-row-")),
  ).toBe(false);
  expect(mp.narrative[0].text).toContain("future-mapping-review");
  const search = await bingFixture(
    "bing-search",
    [
      {
        Query: "secret",
        Date: "2026-10-15T00:00:00Z",
        Clicks: 1,
        Impressions: 2,
        AvgClickPosition: 1,
        AvgImpressionPosition: 2,
      },
    ],
    "provider returned dates",
  );
  const sp = projectStoredProviders(search.run);
  expect(
    sp.observations.some((o) => o.observationId.startsWith("bing-search-row-")),
  ).toBe(false);
  expect(sp.narrative[0].text).toContain("unsupported-declared-period");
});

it("withholds future same-day Bing search markers and invalid mapped row dates", async () => {
  const search = await bingFixture("bing-search", [
    {
      Query: "secret",
      Date: "2026-11-01T23:00:00Z",
      Clicks: 1,
      Impressions: 2,
      AvgClickPosition: 1,
      AvgImpressionPosition: 2,
    },
  ]);
  expect(projectStoredProviders(search.run).narrative[0].text).toContain(
    "invalid-or-future-row-time",
  );
  for (const date of ["2099-01-01", "last year", "2026-02-31"]) {
    const mapped = await bingFixture("bing-ai-mapped", [
      {
        dimensions: { date },
        metrics: { citations: { kind: "exact", value: 1 } },
      },
    ]);
    const p = projectStoredProviders(mapped.run);
    expect(
      p.observations.some((o) => o.observationId.startsWith("bing-ai-row-")),
    ).toBe(false);
    expect(p.narrative[0].text).toContain("invalid-mapped-row-date");
    expect(p.narrative[0].text).toContain("Retain the original evidence");
    expect(p.narrative[0].text).not.toContain("omit an unverified date");
  }
  const valid = await bingFixture("bing-ai-mapped", [
    {
      dimensions: { date: "2026-10-15" },
      metrics: { citations: { kind: "exact", value: 1 } },
    },
  ]);
  expect(
    projectStoredProviders(valid.run).observations.find((o) =>
      o.observationId.startsWith("bing-ai-row-"),
    ).scopeDescription,
  ).toContain("row date is within declared scope");
});

it("assembles GA4, GSC and both Bing sources with a missing configuration request and isolated reassessment", async () => {
  const ga4 = await analyticsFixture();
  const gsc = await searchFixture([
    {
      keys: ["PRIVATE_QUERY", "MOBILE"],
      clicks: 2,
      impressions: 10,
      ctr: 0.2,
      position: 3,
    },
  ]);
  const bing = await bingFixture("bing-search", [
    {
      Query: "PRIVATE_BING_QUERY",
      Date: "2026-10-15T00:00:00Z",
      Clicks: 1,
      Impressions: 4,
      AvgClickPosition: 2,
      AvgImpressionPosition: 3,
    },
  ]);
  const ai = await bingFixture("bing-ai-mapped", [
    {
      dimensions: { topic: "PRIVATE_TOPIC" },
      metrics: {
        citations: { kind: "exact", value: 2 },
        opportunityCitations: { kind: "range", lower: 3, upper: 7 },
      },
    },
  ]);
  const sample = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-ga4-config.json",
      "utf8",
    ),
  );
  const root = await mkdtemp(join(tmpdir(), "mixed-provider-report-"));
  const initial = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: "2026-11-01T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "property", type: "property" },
      ],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), initial);
  const targets = [ga4, gsc, bing, ai].map(
    (f) => f.run.providerTargets[0].configuration,
  );
  targets.push({ ...sample.target, windowId: "config" });
  await planProviderRequests(
    join(root, "initial"),
    {
      sourceDigest: enterpriseDigest(initial),
      newRunId: "planned",
      assessmentAt: initial.assessmentAt,
      targets,
    },
    join(root, "planned"),
  );
  const planned = await loadEnterpriseRun(join(root, "planned"));
  const imports = [ga4, gsc, bing, ai].map((f) => ({
    targetId: planned.providerTargets.find(
      (t) =>
        t.configuration.kind === f.run.providerTargets[0].configuration.kind,
    ).targetId,
    input: f.input,
  }));
  await importProviderSnapshots(
    join(root, "planned"),
    {
      sourceDigest: enterpriseDigest(planned),
      newRunId: "imported",
      assessmentAt: initial.assessmentAt,
      imports,
    },
    join(root, "imported"),
  );
  const mixed = await loadEnterpriseRun(join(root, "imported"));
  const projected = projectStoredProviders(mixed);
  for (const prefix of [
    "ga4-row-",
    "gsc-row-",
    "bing-search-row-",
    "bing-ai-row-",
  ])
    expect(
      projected.observations.some(
        (o) =>
          o.observationId.startsWith(prefix) && o.classification === "current",
      ),
    ).toBe(true);
  expect(
    mixed.dataRequests.find(
      (r) =>
        r.id ===
        mixed.providerTargets.find((t) => t.configuration.kind === "ga4-config")
          .requestId,
    ),
  ).toMatchObject({ status: "requested" });
  const metadata = {
    sourceRunDigest: enterpriseDigest(mixed),
    revisionId: "r1",
    authorId: "fixture",
    generatedAt: mixed.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
  };
  const receipt = await buildStoredEnterpriseReport(
    join(root, "imported"),
    metadata,
    join(root, "parent"),
  );
  const parent = await loadEnterpriseReport(join(root, "parent"));
  const numeric = (observations) =>
    observations
      .filter((o) =>
        /^(ga4-row-|gsc-row-|bing-search-row-|bing-ai-row-)/.test(
          o.observationId,
        ),
      )
      .sort((a, b) => a.observationId.localeCompare(b.observationId));
  expect(numeric(parent.observations)).toEqual(numeric(projected.observations));
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(root, "parent", file), "utf8");
    for (const token of [
      "PRIVATE_CITY",
      "PRIVATE_QUERY",
      "PRIVATE_BING_QUERY",
      "PRIVATE_TOPIC",
      "PRIVATE_METHOD",
      "PRIVATE_SURFACE",
      "PRIVATE_GA4_LOCATOR",
    ])
      expect(text).not.toContain(token);
  }
  const alternate = structuredClone(gsc.input);
  alternate.payload.sourceId = "competing-gsc";
  const gscTarget = mixed.providerTargets.find(
    (t) => t.configuration.kind === "gsc-search",
  );
  await importProviderSnapshots(
    join(root, "imported"),
    {
      sourceDigest: enterpriseDigest(mixed),
      newRunId: "reassessed",
      assessmentAt: mixed.assessmentAt,
      imports: [{ targetId: gscTarget.targetId, input: alternate }],
    },
    join(root, "reassessed"),
  );
  const reassessed = await loadEnterpriseRun(join(root, "reassessed"));
  const binding = {
    sourceDirectory: join(root, "imported"),
    reportDirectory: join(root, "parent"),
    sourceRunDigest: enterpriseDigest(mixed),
    reportDigest: enterpriseDigest(parent),
    manifestDigest: receipt.manifestDigest,
  };
  await buildStoredGeneratedReportRevision(
    join(root, "reassessed"),
    {
      ...metadata,
      sourceRunDigest: enterpriseDigest(reassessed),
      revisionId: "r2",
      generatedAt: "2026-11-01T12:00:01Z",
    },
    [binding],
    join(root, "child"),
  );
  const child = await loadEnterpriseReport(join(root, "child"));
  const gscRows = child.observations.filter((o) =>
    o.observationId.startsWith("gsc-row-"),
  );
  expect(gscRows).toHaveLength(8);
  expect(gscRows.every((o) => o.classification === "historical")).toBe(true);
  expect(
    numeric(child.observations).filter(
      (o) => !o.observationId.startsWith("gsc-row-"),
    ),
  ).toEqual(
    numeric(parent.observations).filter(
      (o) => !o.observationId.startsWith("gsc-row-"),
    ),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(root, "child", file), "utf8");
    for (const token of [
      "PRIVATE_CITY",
      "PRIVATE_QUERY",
      "PRIVATE_BING_QUERY",
      "PRIVATE_TOPIC",
      "PRIVATE_METHOD",
      "PRIVATE_SURFACE",
      "PRIVATE_GA4_LOCATOR",
    ])
      expect(text).not.toContain(token);
  }
  for (const observation of parent.observations.filter((o) =>
    /^(ga4-row-|gsc-row-|bing-search-row-|bing-ai-row-)/.test(o.observationId),
  )) {
    expect(
      child.observations.find(
        (o) => o.observationId === observation.observationId,
      ),
    ).toEqual({
      ...observation,
      classification: observation.observationId.startsWith("gsc-row-")
        ? "historical"
        : "current",
    });
  }
  expect(
    child.dataRequests.find(
      (r) =>
        r.id ===
        reassessed.providerTargets.find(
          (t) => t.configuration.kind === "ga4-config",
        ).requestId,
    ).status,
  ).toBe("requested");
});

it("keeps incomplete GA4 configuration actionable even when the source request is provided", async () => {
  const f = await setup();
  const input = structuredClone(f.fixture.input);
  input.payload.collections.dataStreams.complete = false;
  input.payload.collections.keyEvents.complete = false;
  const run = await f.add(input, "partial-config");
  const request = run.dataRequests.find(
    (r) => r.id === run.providerTargets[0].requestId,
  );
  expect(request.status).toBe("provided");
  const p = projectStoredProviders(run);
  const quality = p.narrative.find((n) =>
    n.narrativeId.startsWith("provider-quality-"),
  );
  expect(quality.text).toContain("remaining data-stream pages");
  expect(quality.text).toContain("remaining key-event pages");
  expect(quality.text).toContain("not an assessment verdict");
  expect(quality.evidenceIds).toHaveLength(1);
  const later = reconcileEnterpriseChecks(
    run,
    structuredClone(run),
    "2026-11-20T12:00:00Z",
  ).run;
  expect(
    projectStoredProviders(later).narrative.find((n) =>
      n.narrativeId.startsWith("provider-quality-"),
    ).text,
  ).toContain("Historical capture");
  const refused = structuredClone(run);
  refused.dataRequests.find(
    (r) => r.id === refused.providerTargets[0].requestId,
  ).status = "declined";
  expect(
    projectStoredProviders(refused).narrative.some((n) =>
      n.narrativeId.startsWith("provider-quality-"),
    ),
  ).toBe(false);
  await buildStoredEnterpriseReport(
    join(f.root, "partial-config"),
    {
      sourceRunDigest: enterpriseDigest(run),
      revisionId: "r1",
      authorId: "fixture",
      generatedAt: run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "partial-report"),
  );
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "partial-report", file), "utf8");
    expect(text).toContain("remaining data-stream pages");
    expect(text).not.toContain("private-provider-report-canary");
  }
});

it.each([
  { timeZone: "UTC", subjectToThresholding: "false" },
  { timeZone: "UTC", samplingMetadatas: [null] },
])(
  "treats malformed GA4 quality metadata as an unverified warning",
  async (metadata) => {
    const f = await analyticsFixture({ metadata });
    const p = projectStoredProviders(f.run);
    expect(
      p.observations.some((o) => o.observationId.startsWith("ga4-row-")),
    ).toBe(false);
    const quality = p.narrative.find((n) =>
      n.narrativeId.startsWith("provider-quality-"),
    );
    expect(quality.text).toContain("triggered a");
    expect(quality.text).toContain("ask the owner to validate it");
    expect(quality.text).not.toContain("provider's thresholding limitation");
    expect(quality.text).not.toContain("provider's sampling limitation");
  },
);

it("plans separate source-bound quality and competing-input obligations without declaring fulfillment", async () => {
  const f = await setup();
  const input = structuredClone(f.fixture.input);
  input.payload.collections.dataStreams.complete = false;
  input.payload.collections.keyEvents.complete = false;
  const first = await f.add(input, "followup-first");
  const plan = planProviderFollowups(first);
  expect(plan).toMatchObject({
    applied: false,
    fulfillmentVerified: false,
    disclosureAuthorized: false,
  });
  expect(plan.obligations.map((o) => o.code)).toEqual([
    "incomplete-config-dataStreams",
    "incomplete-config-keyEvents",
  ]);
  for (const item of plan.obligations) {
    expect(item.kind).toBe("mechanical");
    expect(item.request.status).toBe("requested");
    expect(item.request.scopeKey).toBe(first.providerTargets[0].targetId);
    expect(item.sourceBindings).toHaveLength(1);
    expect(JSON.stringify(item)).not.toContain(
      "private-provider-report-canary",
    );
  }
  const alias = await f.add(input, "followup-alias");
  const duplicate = planProviderFollowups(alias);
  expect(duplicate.obligations).toHaveLength(2);
  expect(duplicate.obligations[0].sourceBindings).toHaveLength(2);
  const other = structuredClone(input);
  other.payload.sourceId = "different-source";
  const competing = await f.add(other, "followup-competing");
  const conflict = planProviderFollowups(competing).obligations.find(
    (o) => o.code === "competing-inputs",
  );
  expect(conflict).toMatchObject({
    kind: "resolution",
    request: { status: "requested" },
  });
  expect(conflict.sourceBindings).toHaveLength(3);
  const refused = structuredClone(competing);
  refused.dataRequests.find(
    (r) => r.id === refused.providerTargets[0].requestId,
  ).status = "declined";
  expect(planProviderFollowups(refused).obligations).toEqual([]);
});

it("plans business outcome follow-ups from the business owner's replayed gap location", async () => {
  const root = await mkdtemp(join(tmpdir(), "provider-business-followup-"));
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: "2026-11-02T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  const dictionary = {
    version: "1",
    sourceSystem: "orders",
    outcomes: [
      {
        outcomeId: "sale",
        businessModel: "commerce",
        allowedStatuses: ["settled"],
        successStatuses: ["settled"],
      },
    ],
  };
  const target = {
    kind: "business-observations",
    entityId: "site",
    resource: "orders",
    windowId: "oct",
    maxAgeSeconds: 259200,
    dictionary,
    window: { from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" },
  };
  await planProviderRequests(
    join(root, "initial"),
    {
      sourceDigest: enterpriseDigest(run),
      newRunId: "planned",
      assessmentAt: run.assessmentAt,
      targets: [target],
    },
    join(root, "planned"),
  );
  const planned = await loadEnterpriseRun(join(root, "planned"));
  const input = {
    customerId: "customer",
    entityId: "site",
    sourceId: "private-business-source",
    sourceSystem: "orders",
    sourceKind: "manual",
    dictionaryVersion: "1",
    capturedAt: "2026-10-31T12:00:00Z",
    synthetic: true,
    records: [],
  };
  await importProviderSnapshots(
    join(root, "planned"),
    {
      sourceDigest: enterpriseDigest(planned),
      newRunId: "imported",
      assessmentAt: run.assessmentAt,
      imports: [{ targetId: planned.providerTargets[0].targetId, input }],
    },
    join(root, "imported"),
  );
  const current = await loadEnterpriseRun(join(root, "imported"));
  const plan = planProviderFollowups(current);
  expect(plan.obligations.map((o) => o.code).sort()).toEqual([
    "empty-export",
    "manual-assertion",
    "missing-source-provenance",
    "partial-capture-window",
  ]);
  expect(
    plan.obligations.every(
      (o) => o.request.status === "requested" && o.sourceBindings.length === 1,
    ),
  ).toBe(true);
  expect(JSON.stringify(plan)).not.toContain("private-business-source");
});

it("snapshots report metadata before reading the stored source", async () => {
  const f = await setup();
  const metadata = {
    sourceRunDigest: enterpriseDigest(f.planned),
    revisionId: "original-revision",
    authorId: "original-author",
    generatedAt: f.planned.assessmentAt,
    brand: { name: "Original customer", accent: "#174f7b" },
  };
  const pending = buildStoredEnterpriseReport(
    join(f.root, "planned"),
    metadata,
    join(f.root, "snapshot-report"),
  );
  metadata.sourceRunDigest = "0".repeat(64);
  metadata.revisionId = "mutated-revision";
  metadata.authorId = "mutated-author";
  metadata.brand.name = "Mutated customer";
  await pending;
  const report = await loadEnterpriseReport(join(f.root, "snapshot-report"));
  expect(report.revisionId).toBe("original-revision");
  expect(report.authorId).toBe("original-author");
  expect(report.brand.name).toBe("Original customer");
});

it("binds an independent provider source decision to all fresh originals without applying it", async () => {
  const f = await setup();
  await f.add(f.fixture.input, "decision-first");
  await f.add(f.fixture.input, "decision-alias");
  const other = structuredClone(f.fixture.input);
  other.payload.sourceId = "private-source-two";
  const run = await f.add(other, "decision-second");
  const selection = projectStoredProviders(run).selections[0];
  const allSources = run.evidence.filter(
    (e) => e.artifactType === "ga4-config",
  );
  const input = {
    sourceRunDigest: enterpriseDigest(run),
    targetId: selection.targetId,
    selectedEvidenceId: allSources[0].evidenceId,
    proposerId: "owner",
    proposedAt: run.assessmentAt,
    validUntil: new Date(
      Date.parse(run.assessmentAt) + 3600 * 1000,
    ).toISOString(),
    reason: "Owner reviewed export source",
  };
  const proposal = proposeProviderResolution(run, input);
  expect(proposal.target.groups).toHaveLength(2);
  expect(
    proposal.target.groups.map((group) => group.bindings.length).sort(),
  ).toEqual([1, 2]);
  expect(() =>
    proposeProviderResolution(run, {
      ...input,
      validUntil: new Date(
        Date.parse(input.proposedAt) + 2 * 86400 * 1000,
      ).toISOString(),
    }),
  ).toThrow(/validity/);
  expect(() =>
    proposeProviderResolution(run, {
      ...input,
      proposedAt: new Date(
        Date.parse(input.proposedAt) + 2 * 86400 * 1000,
      ).toISOString(),
      validUntil: new Date(
        Date.parse(input.proposedAt) + 3 * 86400 * 1000,
      ).toISOString(),
    }),
  ).toThrow(/competing fresh/);
  expect(proposal.applied).toBe(false);
  expect(JSON.stringify(proposal)).not.toContain(
    "private-provider-report-canary",
  );
  const review = {
    targetDigest: proposal.targetDigest,
    reviewerId: "reviewer",
    reviewerKind: "independent-ai",
    verdict: "accept",
    reason: "Checked selection scope",
    reviewedAt: input.proposedAt,
    validUntil: input.validUntil,
  };
  const receipt = {
    targetDigest: proposal.targetDigest,
    reviewDigest: enterpriseDigest(review),
    reviewerId: review.reviewerId,
    independentlyObserved: true,
    provenanceRef: "private-host-review",
  };
  const options = { assessmentAt: input.proposedAt, trustedReviews: [receipt] };
  expect(
    validateProviderResolutionReview(run, proposal, review, options),
  ).toMatchObject({
    verdict: "accept",
    attributedReviewValid: true,
    reviewerAuthenticated: false,
    providerAuthenticated: false,
    selectionApplied: false,
    disclosureAuthorized: false,
  });
  expect(projectStoredProviders(run).selections[0].state).toBe(
    "competing-inputs",
  );
  expect(() =>
    validateProviderResolutionReview(run, proposal, review, {
      ...options,
      trustedReviews: [receipt, receipt],
    }),
  ).toThrow(/receipt/);
  const rejectedReview = { ...review, verdict: "reject" };
  const rejectedReceipt = {
    ...receipt,
    reviewDigest: enterpriseDigest(rejectedReview),
  };
  expect(
    validateProviderResolutionReview(run, proposal, rejectedReview, {
      ...options,
      trustedReviews: [rejectedReceipt],
    }),
  ).toMatchObject({ verdict: "reject", selectionApplied: false });
  expect(() =>
    validateProviderResolutionReview(
      run,
      proposal,
      { ...review, reviewerId: "owner" },
      options,
    ),
  ).toThrow();
  expect(() =>
    validateProviderResolutionReview(run, proposal, review, {
      ...options,
      trustedReviews: [],
    }),
  ).toThrow(/receipt/);
  expect(() =>
    validateProviderResolutionReview(run, proposal, review, {
      ...options,
      assessmentAt: review.validUntil,
    }),
  ).toThrow(/expired/);
  const forged = structuredClone(proposal);
  forged.target.groups.pop();
  expect(() =>
    validateProviderResolutionReview(run, forged, review, options),
  ).toThrow(/binding/);
  const third = structuredClone(other);
  third.payload.sourceId = "third-source";
  const revised = await f.add(third, "decision-third");
  expect(() =>
    validateProviderResolutionReview(revised, proposal, review, options),
  ).toThrow(/Stale/);
});

it("previews reviewed GSC source selection with historical continuity but no delivery authority", async () => {
  const f = await searchFixture([
    {
      keys: ["PRIVATE_QUERY", "MOBILE"],
      clicks: 2,
      impressions: 10,
      ctr: 0.2,
      position: 3,
    },
  ]);
  const other = structuredClone(f.input);
  other.payload.sourceId = "other-source";
  await importProviderSnapshots(
    join(f.root, "imported"),
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "competing",
      assessmentAt: f.run.assessmentAt,
      imports: [{ targetId: f.run.providerTargets[0].targetId, input: other }],
    },
    join(f.root, "competing"),
  );
  const run = await loadEnterpriseRun(join(f.root, "competing"));
  const metadata = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "parent",
    authorId: "author",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic", accent: "#174f7b" },
  };
  await buildStoredEnterpriseReport(
    join(f.root, "competing"),
    metadata,
    join(f.root, "parent"),
  );
  const parent = await loadEnterpriseReport(join(f.root, "parent"));
  const selected = run.evidence.find(
    (e) => e.artifactType === "search-export",
  ).evidenceId;
  const input = {
    sourceRunDigest: enterpriseDigest(run),
    targetId: run.providerTargets[0].targetId,
    selectedEvidenceId: selected,
    proposerId: "PRIVATE_PROPOSER",
    proposedAt: run.assessmentAt,
    validUntil: "2026-11-01T13:00:00Z",
    reason: "PRIVATE_PROPOSAL_REASON",
  };
  const proposal = proposeProviderResolution(run, input);
  const review = {
    targetDigest: proposal.targetDigest,
    reviewerId: "PRIVATE_REVIEWER",
    reviewerKind: "independent-ai",
    verdict: "accept",
    reason: "PRIVATE_REVIEW_REASON",
    reviewedAt: run.assessmentAt,
    validUntil: input.validUntil,
  };
  const receipt = {
    targetDigest: proposal.targetDigest,
    reviewDigest: enterpriseDigest(review),
    reviewerId: review.reviewerId,
    independentlyObserved: true,
    provenanceRef: "PRIVATE_RECEIPT",
  };
  const meta = {
    ...metadata,
    revisionId: "preview",
    generatedAt: "2026-11-01T12:00:01Z",
  };
  const parentInput = { run, report: parent, ancestors: [] };
  const preview = await previewProviderResolutions(
    run,
    meta,
    [{ proposal, review }],
    [receipt],
    parentInput,
  );
  const snapshotMetadata = structuredClone(meta);
  const snapshotProposal = structuredClone(proposal);
  const snapshotReview = structuredClone(review);
  const snapshotReceipt = structuredClone(receipt);
  const pending = previewProviderResolutions(
    run,
    snapshotMetadata,
    [{ proposal: snapshotProposal, review: snapshotReview }],
    [snapshotReceipt],
    parentInput,
  );
  snapshotMetadata.brand.name = "MUTATED_BRAND";
  snapshotProposal.target.reason = "MUTATED_PROPOSAL";
  snapshotReview.reason = "MUTATED_REVIEW";
  snapshotReceipt.provenanceRef = "MUTATED_RECEIPT";
  const stable = await pending;
  expect(stable.report.brand.name).toBe("Synthetic");
  expect(stable.privateProvenance[0].targetDigest).toBe(proposal.targetDigest);
  const changed = structuredClone(run);
  changed.dataRequests.find(
    (r) => r.id === changed.providerTargets[0].requestId,
  ).status = "declined";
  await expect(
    previewProviderResolutions(
      changed,
      { ...meta, sourceRunDigest: enterpriseDigest(changed) },
      [{ proposal, review }],
      [receipt],
      parentInput,
    ),
  ).rejects.toThrow();
  expect(preview).toMatchObject({
    persistable: false,
    selectionAppliedToRun: false,
    disclosureAuthorized: false,
    deliveryAuthorized: false,
  });
  for (const old of parent.observations)
    expect(
      preview.report.observations.find(
        (o) => o.observationId === old.observationId,
      ),
    ).toEqual(old);
  const selectedRows = preview.report.observations.filter((o) =>
    o.observationId.startsWith("provider-selected-"),
  );
  expect(selectedRows).toHaveLength(4);
  expect(selectedRows.every((o) => o.classification === "current")).toBe(true);
  expect(preview.privateProvenance[0]).toMatchObject({
    sourceRunDigest: enterpriseDigest(run),
    targetDigest: proposal.targetDigest,
    reviewDigest: enterpriseDigest(review),
  });
  expect(preview.privateProvenance[0].compilerDigest).toMatch(/^[a-f0-9]{64}$/);
  const sourceRows = parent.observations.filter(
    (o) =>
      o.observationId.startsWith("gsc-row-") &&
      preview.privateProvenance[0].selectedEvidenceIds.includes(
        o.evidenceIds[0],
      ),
  );
  expect(sourceRows).toHaveLength(4);
  for (const source of sourceRows) {
    const id = `provider-selected-${enterpriseDigest([proposal.targetDigest, enterpriseDigest(review), source.observationId])}`;
    expect(selectedRows.find((o) => o.observationId === id)).toMatchObject({
      value: source.value,
      precision: source.precision,
      period: source.period,
      unit: source.unit,
      evidenceIds: source.evidenceIds,
    });
  }

  for (const text of [
    preview.artifacts.json,
    preview.artifacts.markdown,
    preview.artifacts.html,
  ])
    for (const token of [
      "PRIVATE_QUERY",
      "PRIVATE_PROPOSER",
      "PRIVATE_PROPOSAL_REASON",
      "PRIVATE_REVIEWER",
      "PRIVATE_REVIEW_REASON",
      "PRIVATE_RECEIPT",
    ])
      expect(text).not.toContain(token);
  await expect(
    inspectGeneratedReportProvenance(run, preview.report, [
      { run, report: parent },
    ]),
  ).rejects.toThrow(/replay mismatch/);
  await expect(
    previewProviderResolutions(
      run,
      { ...meta, generatedAt: input.validUntil },
      [{ proposal, review }],
      [receipt],
      parentInput,
    ),
  ).rejects.toThrow(/expired/);
  await expect(
    previewProviderResolutions(
      run,
      meta,
      [{ proposal, review }],
      [],
      parentInput,
    ),
  ).rejects.toThrow(/receipt/);
  await expect(
    previewProviderResolutions(
      run,
      meta,
      [{ proposal, review }],
      [receipt, receipt],
      parentInput,
    ),
  ).rejects.toThrow(/receipt/);
  const rejected = { ...review, verdict: "reject" };
  await expect(
    previewProviderResolutions(
      run,
      meta,
      [{ proposal, review: rejected }],
      [{ ...receipt, reviewDigest: enterpriseDigest(rejected) }],
      parentInput,
    ),
  ).rejects.toThrow(/Rejected/);
  const alternateReview = { ...review, reviewerId: "other-reviewer" };
  const alternate = await previewProviderResolutions(
    run,
    { ...meta, revisionId: "preview-other" },
    [{ proposal, review: alternateReview }],
    [
      {
        ...receipt,
        reviewDigest: enterpriseDigest(alternateReview),
        reviewerId: alternateReview.reviewerId,
      },
    ],
    parentInput,
  );
  expect(
    alternate.report.observations.find((o) =>
      o.observationId.startsWith("provider-selected-"),
    ).observationId,
  ).not.toBe(selectedRows[0].observationId);
  await expect(
    previewProviderResolutions(
      run,
      {
        ...meta,
        revisionId: "bad-parent",
        generatedAt: "2026-11-01T12:00:02Z",
      },
      [{ proposal, review }],
      [receipt],
      { run, report: preview.report, ancestors: [{ run, report: parent }] },
    ),
  ).rejects.toThrow();
});
