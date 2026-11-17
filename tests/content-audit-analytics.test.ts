import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { importAnalytics } from "../skills/content-search-audit/scripts/lib/analytics.mjs";
function fixture() {
  const response = {
    dimensionHeaders: [{ name: "landingPagePlusQueryString" }],
    metricHeaders: [
      { name: "activeUsers", type: "TYPE_INTEGER" },
      { name: "purchaseRevenue", type: "TYPE_CURRENCY" },
    ],
    rowCount: 1,
    rows: [
      {
        dimensionValues: [{ value: "/page?lang=vi" }],
        metricValues: [{ value: "9007199254740993" }, { value: "-1.25" }],
      },
    ],
    metadata: {
      timeZone: "Asia/Ho_Chi_Minh",
      currencyCode: "VND",
      subjectToThresholding: true,
      dataLossFromOtherRow: true,
      samplingMetadatas: [{ samplesReadCount: "10", samplingSpaceSize: "100" }],
      dataTruncationReasons: [{ reason: "fixture" }],
      schemaRestrictionResponse: {
        activeMetricRestrictions: [{ metricName: "purchaseRevenue" }],
      },
    },
    totals: [
      { metricValues: [{ value: "9007199254740993" }, { value: "-1.25" }] },
    ],
  };
  const responseText = JSON.stringify(response);
  return {
    sourceId: "ga4-fixture",
    property: "properties/123",
    locator: "supplied-export",
    capturedAt: "2026-11-16T00:00:00Z",
    synthetic: true,
    pages: [
      {
        request: {
          dateRanges: [{ startDate: "2026-10-01", endDate: "2026-10-31" }],
          dimensions: [{ name: "landingPagePlusQueryString" }],
          metrics: [{ name: "activeUsers" }, { name: "purchaseRevenue" }],
          limit: "1",
          offset: "0",
        },
        responseText,
        responseHash: createHash("sha256").update(responseText).digest("hex"),
      },
    ],
  };
}
function replaceResponse(
  input: ReturnType<typeof fixture>,
  mutate: (response: {
    rowCount: number;
    dimensionHeaders: Array<{ name: string }>;
    metricHeaders: Array<{ name: string; type: string }>;
    rows: Array<{
      dimensionValues: Array<{ value: string }>;
      metricValues: Array<{ value: string }>;
    }>;
    metadata: Record<string, unknown>;
  }) => void,
) {
  const response = JSON.parse(input.pages[0].responseText);
  mutate(response);
  input.pages[0].responseText = JSON.stringify(response);
  input.pages[0].responseHash = createHash("sha256")
    .update(input.pages[0].responseText)
    .digest("hex");
  return input;
}
it("preserves precision, units, query strings and provider limitations without computing totals", () => {
  const result = importAnalytics(fixture());
  expect(result.rows[0].metrics.activeUsers.value).toBe("9007199254740993");
  expect(result.rows[0].metrics.purchaseRevenue).toEqual({
    value: "-1.25",
    type: "TYPE_CURRENCY",
  });
  expect(result.rows[0].dimensions.landingPagePlusQueryString).toBe(
    "/page?lang=vi",
  );
  expect(result.pages[0].metadata.subjectToThresholding).toBe(true);
  expect(result.pages[0].metadata.samplingMetadatas).toHaveLength(1);
  expect(result.pages[0].providerAggregates.totals).toHaveLength(1);
  expect(result.paginationExhausted).toBe(true);
  expect(result.populationComplete).toBe(false);
  expect(result.totals).toBeNull();
});
it("keeps incomplete and empty query results distinct from missing zero observations", () => {
  expect(
    importAnalytics(
      replaceResponse(fixture(), (r) => {
        r.rowCount = 2;
      }),
    ).pendingQueue[0].offset,
  ).toBe(1);
  const empty = importAnalytics(
    replaceResponse(fixture(), (r) => {
      r.rowCount = 0;
      r.rows = [];
      r.metadata = { emptyReason: "restricted" };
    }),
  );
  expect(empty.rows).toEqual([]);
  expect(empty.pages[0].metadata.emptyReason).toBe("restricted");
  expect(empty.populationComplete).toBe(false);
});
it("rejects tampering and changed pagination scope or duplicate rows", () => {
  const broken = fixture();
  broken.pages[0].responseHash = "0".repeat(64);
  expect(() => importAnalytics(broken)).toThrow(/hash/i);
  const input = replaceResponse(fixture(), (r) => {
    r.rowCount = 2;
  });
  input.pages.push({
    ...input.pages[0],
    request: { ...input.pages[0].request, offset: "1" },
  });
  expect(() => importAnalytics(input)).toThrow(/duplicate/i);
  input.pages[1].request.offset = "2";
  expect(() => importAnalytics(input)).toThrow(/pagination/i);
  input.pages[1].request.offset = "1";
  input.pages[1].request.dateRanges = [
    { startDate: "2026-09-01", endDate: "2026-09-30" },
  ];
  expect(() => importAnalytics(input)).toThrow(/query changed/i);
});
it("rejects mismatched headers, malformed values and ambiguous relative dates", () => {
  expect(() =>
    importAnalytics(
      replaceResponse(fixture(), (r) => {
        r.metricHeaders.reverse();
      }),
    ),
  ).toThrow(/header/i);
  expect(() =>
    importAnalytics(
      replaceResponse(fixture(), (r) => {
        r.rows[0].metricValues[0].value = "NaN";
      }),
    ),
  ).toThrow(/values/i);
  const relative = fixture();
  relative.pages[0].request.dateRanges[0].startDate = "30daysAgo";
  expect(() => importAnalytics(relative)).toThrow(/absolute date/i);
  const credential = fixture();
  Object.assign(credential.pages[0].request, { accessToken: "do not import" });
  expect(() => importAnalytics(credential)).toThrow(/fields/i);
});
it("preserves separate date-range dimensions instead of merging overlapping periods", () => {
  const input = replaceResponse(fixture(), (r) => {
    r.dimensionHeaders.push({ name: "dateRange" });
    r.rowCount = 2;
    r.rows[0].dimensionValues.push({ value: "date_range_0" });
    r.rows.push({
      ...r.rows[0],
      dimensionValues: [{ value: "/page?lang=vi" }, { value: "date_range_1" }],
    });
  });
  input.pages[0].request.limit = "2";
  input.pages[0].request.dateRanges.push({
    startDate: "2026-10-10",
    endDate: "2026-10-31",
  });
  const result = importAnalytics(input);
  expect(result.rows).toHaveLength(2);
  expect(result.rows[1].dimensions.dateRange).toBe("date_range_1");
  expect(result.totals).toBeNull();
});
