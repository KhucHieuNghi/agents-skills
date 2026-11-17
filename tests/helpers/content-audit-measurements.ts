import { createHash } from "node:crypto";
export function searchConsoleExport() {
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
  return {
    sourceId: "gsc-fixture",
    property: "sc-domain:example.com",
    locator: "<script>supplied locator</script>",
    capturedAt: "2026-11-16T00:00:00Z",
    synthetic: true,
    pages: [
      {
        request: {
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          dimensions: ["page"],
          rowLimit: 1,
        },
        responseText,
        responseHash: createHash("sha256").update(responseText).digest("hex"),
      },
    ],
  };
}

export function analyticsExport() {
  const responseText = JSON.stringify({
    dimensionHeaders: [{ name: "pagePath" }],
    metricHeaders: [{ name: "activeUsers", type: "TYPE_INTEGER" }],
    rowCount: 1,
    rows: [
      {
        dimensionValues: [{ value: "/page" }],
        metricValues: [{ value: "9007199254740993" }],
      },
    ],
    metadata: {
      subjectToThresholding: true,
      timeZone: "Asia/Ho_Chi_Minh",
      currencyCode: "VND",
      samplingMetadatas: [{ samplesReadCount: "10", samplingSpaceSize: "100" }],
    },
  });
  return {
    sourceId: "ga4-fixture",
    property: "properties/123",
    locator: "<script>analytics fixture</script>",
    capturedAt: "2026-11-16T00:00:00Z",
    synthetic: true,
    pages: [
      {
        request: {
          dateRanges: [{ startDate: "2026-10-01", endDate: "2026-10-31" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "activeUsers" }],
        },
        responseText,
        responseHash: createHash("sha256").update(responseText).digest("hex"),
      },
    ],
  };
}

export function bingExport() {
  const sourceText = "Synthetic dashboard: opportunity citations 100–200";
  const responseText = JSON.stringify({
    rows: [
      {
        dimensions: { topic: "Example" },
        metrics: {
          opportunityCitations: { kind: "range", lower: 100, upper: 200 },
          citations: { kind: "unknown", reason: "not supplied" },
        },
      },
    ],
  });
  return {
    sourceId: "bing-fixture",
    kind: "ai-performance-mapped",
    siteUrl: "https://example.com",
    locator: "<script>Bing fixture</script>",
    capturedAt: "2026-11-16T00:00:00Z",
    synthetic: true,
    scope: {
      locale: "unknown",
      market: "unknown",
      timezone: "unknown",
      period: "2026-10",
      surfaces: "Bing supported AI surfaces",
    },
    mapping: {
      method: "fixture mapping",
      reviewer: "fixture reviewer",
      reviewedAt: "2026-11-16T00:00:00Z",
    },
    sourceText,
    sourceHash: createHash("sha256").update(sourceText).digest("hex"),
    responseText,
    responseHash: createHash("sha256").update(responseText).digest("hex"),
  };
}

export function serverLogExport() {
  const sourceText =
    JSON.stringify({
      timestamp: "2026-11-16T00:00:00Z",
      method: "GET",
      url: "https://example.com/?lang=vi",
      status: 200,
      userAgent: "Googlebot",
    }) + "\ninvalid fixture line";
  return {
    sourceId: "logs-fixture",
    locator: "<script>log fixture</script>",
    capturedAt: "2026-11-16T01:00:00Z",
    synthetic: true,
    scope: {
      from: "2026-11-16T00:00:00Z",
      to: "2026-11-16T01:00:00Z",
      system: "fixture",
      filters: "none",
      exportComplete: true,
    },
    normalization: {
      method: "fixture JSONL",
      reviewer: "fixture reviewer",
      redaction: "no IPs or headers",
      limitations: ["synthetic"],
    },
    sourceText,
    sourceHash: createHash("sha256").update(sourceText).digest("hex"),
  };
}
