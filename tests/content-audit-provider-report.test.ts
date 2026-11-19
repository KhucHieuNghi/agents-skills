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
