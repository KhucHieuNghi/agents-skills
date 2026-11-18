import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { normalizeProviderSnapshot } from "../skills/content-search-audit/scripts/lib/measurement-config.mjs";
function fixture() {
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "run",
      assessmentAt: "2026-11-18T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "property", type: "property" },
      ],
    },
    [],
  );
  const query = {
    dateRanges: [{ startDate: "2026-10-01", endDate: "2026-10-31" }],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "activeUsers" }],
  };
  const response = {
    dimensionHeaders: [{ name: "country" }],
    metricHeaders: [{ name: "activeUsers", type: "TYPE_INTEGER" }],
    rowCount: 1,
    rows: [
      {
        dimensionValues: [{ value: "VN" }],
        metricValues: [{ value: "9007199254740993" }],
      },
    ],
    metadata: {
      timeZone: "Asia/Ho_Chi_Minh",
      currencyCode: "VND",
      subjectToThresholding: true,
    },
  };
  const payload = {
    sourceId: "sample",
    property: "properties/123",
    locator: "supplied-export",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    pages: [
      {
        request: { ...query, offset: "0", limit: "1" },
        responseText: JSON.stringify(response),
        responseHash: createHash("sha256")
          .update(JSON.stringify(response))
          .digest("hex"),
      },
    ],
  };
  return {
    input: { customerId: "customer", entityId: "property", payload },
    context: {
      run,
      entityId: "property",
      resource: "properties/123",
      windowId: "october",
      expectedQuery: structuredClone(query),
      maxAgeSeconds: 7200,
      expectedTimezone: "Asia/Ho_Chi_Minh",
      expectedCurrency: "VND",
    },
  };
}
it("wraps validated GA4 observations as bound private evidence without granting assessment", () => {
  const { input, context } = fixture();
  const result = normalizeProviderSnapshot("ga4-report", input, context);
  expect(result.evidence.digest).toBe(
    enterpriseDigest(result.evidence.content),
  );
  expect(result.evidence).toMatchObject({
    customerId: "customer",
    runId: "run",
    entityId: "property",
    artifactType: "ga4-report",
    windowId: "october",
  });
  expect(result.normalized.rows[0].metrics.activeUsers.value).toBe(
    "9007199254740993",
  );
  expect(result).toMatchObject({
    assessmentAccepted: false,
    providerAuthenticated: false,
    synthetic: true,
  });
  expect(result.gaps.some((gap) => gap.code === "provider-thresholding")).toBe(
    true,
  );
  expect(context.run.checks.every((check) => check.status === "unknown")).toBe(
    true,
  );
});
it("rejects foreign ownership, property, query and future captures", () => {
  for (const mutate of [
    (input) => (input.customerId = "foreign"),
    (input) => (input.entityId = "foreign"),
    (input) => (input.payload.property = "properties/999"),
    (input) =>
      (input.payload.pages[0].request.dateRanges[0].startDate = "2026-09-01"),
    (input) => (input.payload.capturedAt = "2026-11-18T13:00:00Z"),
  ]) {
    const { input, context } = fixture();
    mutate(input);
    expect(() =>
      normalizeProviderSnapshot("ga4-report", input, context),
    ).toThrow();
  }
});
it("retains incomplete pagination, stale evidence and missing metadata as explicit gaps", () => {
  const { input, context } = fixture();
  const response = JSON.parse(input.payload.pages[0].responseText);
  response.rowCount = 2;
  delete response.metadata;
  input.payload.pages[0].responseText = JSON.stringify(response);
  input.payload.pages[0].responseHash = createHash("sha256")
    .update(input.payload.pages[0].responseText)
    .digest("hex");
  input.payload.capturedAt = "2026-11-17T11:00:00Z";
  const result = normalizeProviderSnapshot("ga4-report", input, context);
  expect(result.gaps.map((gap) => gap.code)).toEqual(
    expect.arrayContaining([
      "stale-snapshot",
      "incomplete-pagination",
      "missing-provider-metadata",
    ]),
  );
  expect(result.usableForCurrentAssessment).toBe(false);
});
it("rejects mixed timezone/currency against the declared reporting context", () => {
  const { input, context } = fixture();
  expect(() =>
    normalizeProviderSnapshot("ga4-report", input, {
      ...context,
      expectedCurrency: "USD",
    }),
  ).toThrow(/currency/i);
  expect(() =>
    normalizeProviderSnapshot("ga4-report", input, {
      ...context,
      expectedTimezone: "UTC",
    }),
  ).toThrow(/timezone/i);
});
it("retains an explicitly identified GTM version without claiming it is published or executed", () => {
  const { context } = fixture();
  const payload = {
    sourceId: "gtm",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    version: {
      path: "accounts/1/containers/2/versions/3",
      accountId: "1",
      containerId: "2",
      containerVersionId: "3",
      tag: [],
      trigger: [],
      variable: [],
    },
  };
  const result = normalizeProviderSnapshot(
    "gtm-version",
    { customerId: "customer", entityId: "property", payload },
    { ...context, resource: "accounts/1/containers/2", versionId: "3" },
  );
  expect(result.normalized).toMatchObject({
    versionId: "3",
    publicationVerified: false,
    runtimeVerified: false,
  });
  expect(() =>
    normalizeProviderSnapshot(
      "gtm-version",
      { customerId: "customer", entityId: "property", payload },
      { ...context, resource: "accounts/1/containers/2", versionId: "4" },
    ),
  ).toThrow(/version/i);
});

it("binds Search Console property/query while retaining its top-row limitation", () => {
  const { context } = fixture();
  const query = {
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    dimensions: ["page"],
    type: "web",
    aggregationType: "auto",
    dataState: "final",
  };
  const responseText = JSON.stringify({
    rows: [
      {
        keys: ["https://example.com/"],
        clicks: 2,
        impressions: 10,
        ctr: 0.2,
        position: 3.5,
      },
    ],
    responseAggregationType: "byPage",
  });
  const payload = {
    sourceId: "gsc",
    property: "sc-domain:example.com",
    locator: "export",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    pages: [
      {
        request: { ...query, rowLimit: 10 },
        responseText,
        responseHash: createHash("sha256").update(responseText).digest("hex"),
      },
    ],
  };
  const expected = {
    ...context,
    resource: payload.property,
    expectedQuery: query,
    expectedTimezone: "America/Los_Angeles",
  };
  const result = normalizeProviderSnapshot(
    "gsc-search",
    { customerId: "customer", entityId: "property", payload },
    expected,
  );
  expect(result.normalized.populationComplete).toBe(false);
  expect(result.normalized.rows[0].position).toBe(3.5);
  expect(() =>
    normalizeProviderSnapshot(
      "gsc-search",
      { customerId: "customer", entityId: "property", payload },
      { ...expected, resource: "sc-domain:other.example" },
    ),
  ).toThrow(/property/);
});
it("preserves mapped Bing range precision and rejects scope drift", () => {
  const { context } = fixture();
  const sourceText = "Synthetic dashboard range 100–200";
  const responseText = JSON.stringify({
    rows: [
      {
        dimensions: { topic: "Sample" },
        metrics: {
          opportunityCitations: { kind: "range", lower: 100, upper: 200 },
        },
      },
    ],
  });
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const payload = {
    sourceId: "bing",
    siteUrl: "https://example.com",
    locator: "export",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    kind: "ai-performance-mapped",
    scope: {
      locale: "vi",
      market: "VN",
      timezone: "UTC",
      period: "2026-10-01 to 2026-10-31",
      surfaces: "Bing supported AI surfaces",
    },
    responseText,
    responseHash: hash(responseText),
    sourceText,
    sourceHash: hash(sourceText),
    mapping: {
      method: "Synthetic mapping",
      reviewer: "fixture-reviewer",
      reviewedAt: "2026-11-18T11:00:00Z",
    },
  };
  const expected = {
    ...context,
    resource: payload.siteUrl,
    expectedScope: payload.scope,
  };
  const result = normalizeProviderSnapshot(
    "bing-ai-mapped",
    { customerId: "customer", entityId: "property", payload },
    expected,
  );
  expect(result.normalized.rows[0].metrics.opportunityCitations).toMatchObject({
    kind: "range",
    lower: 100,
    upper: 200,
  });
  expect(() =>
    normalizeProviderSnapshot(
      "bing-ai-mapped",
      { customerId: "customer", entityId: "property", payload },
      { ...expected, expectedScope: { ...payload.scope, period: "other" } },
    ),
  ).toThrow(/scope/);
});

it("binds freshness policy to evidence identity and rejects foreign nested GTM containers", () => {
  const { input, context } = fixture();
  const a = normalizeProviderSnapshot("ga4-report", input, context),
    b = normalizeProviderSnapshot("ga4-report", input, {
      ...context,
      maxAgeSeconds: 14400,
    });
  expect(a.evidence.evidenceId).not.toBe(b.evidence.evidenceId);
  const payload = {
    sourceId: "gtm",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    version: {
      path: "accounts/1/containers/2/versions/3",
      accountId: "1",
      containerId: "2",
      containerVersionId: "3",
      container: { accountId: "FOREIGN", containerId: "999" },
    },
  };
  expect(() =>
    normalizeProviderSnapshot(
      "gtm-version",
      { customerId: "customer", entityId: "property", payload },
      { ...context, resource: "accounts/1/containers/2", versionId: "3" },
    ),
  ).toThrow(/container/i);
});

it("accepts same-container workspace component paths and rejects foreign ones", () => {
  const { context } = fixture();
  const payload = {
    sourceId: "gtm",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    version: {
      path: "accounts/1/containers/2/versions/3",
      accountId: "1",
      containerId: "2",
      containerVersionId: "3",
      tag: [
        {
          tagId: "7",
          accountId: "1",
          containerId: "2",
          path: "accounts/1/containers/2/workspaces/9/tags/7",
        },
      ],
    },
  };
  const expected = {
    ...context,
    resource: "accounts/1/containers/2",
    versionId: "3",
  };
  expect(
    normalizeProviderSnapshot(
      "gtm-version",
      { customerId: "customer", entityId: "property", payload },
      expected,
    ).normalized.version.tag,
  ).toHaveLength(1);
  payload.version.tag[0].path = "accounts/1/containers/999/workspaces/9/tags/7";
  expect(() =>
    normalizeProviderSnapshot(
      "gtm-version",
      { customerId: "customer", entityId: "property", payload },
      expected,
    ),
  ).toThrow(/component/);
});

it("normalizes GA4 configuration without treating key-event definitions as measured conversions", () => {
  const { context } = fixture();
  const payload = {
    sourceId: "admin-export",
    capturedAt: "2026-11-18T11:00:00Z",
    synthetic: true,
    property: {
      name: "properties/123",
      timeZone: "Asia/Ho_Chi_Minh",
      currencyCode: "VND",
    },
    dataStreams: [
      {
        name: "properties/123/dataStreams/7",
        type: "WEB_DATA_STREAM",
        webStreamData: {
          measurementId: "G-SAMPLE",
          defaultUri: "https://example.com",
        },
      },
    ],
    keyEvents: [{ name: "properties/123/keyEvents/8", eventName: "purchase" }],
    collections: {
      dataStreams: { complete: true },
      keyEvents: { complete: false, nextPageToken: "opaque-next-page" },
    },
  };
  const result = normalizeProviderSnapshot(
    "ga4-config",
    { customerId: "customer", entityId: "property", payload },
    context,
  );
  expect(result.normalized.runtimeVerified).toBe(false);
  expect(result.normalized.keyEvents[0].eventName).toBe("purchase");
  expect(result.gaps.map((gap) => gap.code)).toContain(
    "incomplete-config-keyEvents",
  );
  payload.dataStreams[0].name = "properties/999/dataStreams/7";
  expect(() =>
    normalizeProviderSnapshot(
      "ga4-config",
      { customerId: "customer", entityId: "property", payload },
      context,
    ),
  ).toThrow(/property|stream/i);
});
