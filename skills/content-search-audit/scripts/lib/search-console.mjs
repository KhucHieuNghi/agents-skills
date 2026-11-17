import { URL } from "node:url";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
function date(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
const dimensions = new Set([
  "country",
  "device",
  "page",
  "query",
  "searchAppearance",
  "date",
  "hour",
]);
const requestKeys = new Set([
  "startDate",
  "endDate",
  "dimensions",
  "type",
  "dimensionFilterGroups",
  "aggregationType",
  "rowLimit",
  "startRow",
  "dataState",
]);
/** Import one supplied query's response pages. No credentials, fetching or cross-query aggregation. */
export function importSearchConsole(input) {
  if (
    !object(input) ||
    !text(input.sourceId) ||
    !text(input.property) ||
    !text(input.locator) ||
    typeof input.synthetic !== "boolean" ||
    !text(input.capturedAt) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(input.capturedAt) ||
    !Number.isFinite(Date.parse(input.capturedAt)) ||
    !Array.isArray(input.pages) ||
    input.pages.length === 0 ||
    input.pages.length > 1000
  )
    throw new Error("Invalid Search Console export metadata/pages");
  if (!/^sc-domain:[a-zA-Z0-9.-]+$/.test(input.property)) {
    const property = new URL(input.property);
    if (
      !["https:", "http:"].includes(property.protocol) ||
      property.username ||
      property.password
    )
      throw new Error("Invalid Search Console property");
  }
  let queryIdentity,
    offset = 0,
    exhausted = false,
    aggregation;
  const rows = [],
    pageReceipts = [],
    seen = new Set(),
    pendingQueue = [];
  let bytes = 0;
  for (const [pageIndex, page] of input.pages.entries()) {
    const request = page?.request;
    if (
      !object(request) ||
      Object.keys(request).some((key) => !requestKeys.has(key)) ||
      !date(request.startDate) ||
      !date(request.endDate) ||
      request.startDate > request.endDate ||
      !Array.isArray(request.dimensions ?? []) ||
      (request.dimensions ?? []).some((key) => !dimensions.has(key)) ||
      new Set(request.dimensions ?? []).size !==
        (request.dimensions ?? []).length
    )
      throw new Error("Invalid Search Console query dimensions/date/fields");
    if (
      !["web", "image", "video", "news", "discover", "googleNews"].includes(
        request.type ?? "web",
      ) ||
      !["auto", "byPage", "byProperty", "byNewsShowcasePanel"].includes(
        request.aggregationType ?? "auto",
      ) ||
      !["final", "all", "hourly_all"].includes(request.dataState ?? "final")
    )
      throw new Error(
        "Invalid Search Console query type/aggregation/dataState",
      );
    if (
      request.dimensionFilterGroups !== undefined &&
      (!Array.isArray(request.dimensionFilterGroups) ||
        request.dimensionFilterGroups.some(
          (group) =>
            !object(group) ||
            group.groupType !== "and" ||
            Object.keys(group).some(
              (key) => !["groupType", "filters"].includes(key),
            ) ||
            !Array.isArray(group.filters) ||
            group.filters.some(
              (filter) =>
                !object(filter) ||
                !dimensions.has(filter.dimension) ||
                Object.keys(filter).some(
                  (key) =>
                    !["dimension", "operator", "expression"].includes(key),
                ) ||
                ![
                  "equals",
                  "notEquals",
                  "contains",
                  "notContains",
                  "includingRegex",
                  "excludingRegex",
                ].includes(filter.operator ?? "equals") ||
                typeof filter.expression !== "string" ||
                filter.expression.length > 4096,
            ),
        ))
    )
      throw new Error("Invalid Search Console filters");
    const limit = request.rowLimit ?? 1000,
      start = request.startRow ?? 0;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 25000 ||
      !Number.isSafeInteger(start) ||
      start < 0 ||
      start !== offset ||
      exhausted
    )
      throw new Error(
        "Search Console pagination gap, overlap or page after exhaustion",
      );
    const normalized = {
      ...request,
      dimensions: request.dimensions ?? [],
      type: request.type ?? "web",
      aggregationType: request.aggregationType ?? "auto",
      dataState: request.dataState ?? "final",
    };
    delete normalized.rowLimit;
    delete normalized.startRow;
    // Sort top-level fields; nested filters are retained exactly, without silently rewriting scope.
    const identity = JSON.stringify(
      Object.fromEntries(
        Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    if (queryIdentity !== undefined && identity !== queryIdentity)
      throw new Error("Changed Search Console query across pages");
    queryIdentity = identity;
    if (
      typeof page.responseText !== "string" ||
      !/^[a-f0-9]{64}$/.test(page.responseHash ?? "") ||
      hash(page.responseText) !== page.responseHash
    )
      throw new Error("Search Console response artifact hash mismatch");
    bytes += Buffer.byteLength(page.responseText);
    if (bytes > 32 * 1024 * 1024)
      throw new Error("Search Console import byte limit exceeded");
    const response = JSON.parse(page.responseText);
    if (
      !object(response) ||
      response.error ||
      !Array.isArray(response.rows ?? []) ||
      (response.rows ?? []).length > limit
    )
      throw new Error("Invalid Search Console response rows/error");
    const responseAggregation = response.responseAggregationType ?? "unknown";
    if (aggregation !== undefined && responseAggregation !== aggregation)
      throw new Error("Changed Search Console response aggregation");
    aggregation = responseAggregation;
    const pageRows = response.rows ?? [];
    for (const [rowIndex, row] of pageRows.entries()) {
      if (
        !object(row) ||
        !Array.isArray(row.keys ?? []) ||
        (row.keys ?? []).length !== normalized.dimensions.length ||
        (row.keys ?? []).some((key) => typeof key !== "string") ||
        ["clicks", "impressions", "ctr", "position"].some(
          (key) =>
            typeof row[key] !== "number" ||
            !Number.isFinite(row[key]) ||
            row[key] < 0,
        ) ||
        row.ctr > 1
      )
        throw new Error("Invalid Search Console row metrics or dimension keys");
      const keys = row.keys ?? [],
        key = JSON.stringify(keys);
      if (seen.has(key))
        throw new Error(
          "Duplicate Search Console dimension tuple; export may have shifted during pagination",
        );
      seen.add(key);
      const values = Object.fromEntries(
        normalized.dimensions.map((name, index) => [name, keys[index]]),
      );
      if (
        values.date &&
        (!date(values.date) ||
          values.date < request.startDate ||
          values.date > request.endDate)
      )
        throw new Error("Search Console row date outside query");
      rows.push({
        dimensions: values,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        pageIndex,
        rowIndex,
        responseHash: page.responseHash,
      });
    }
    offset += pageRows.length;
    exhausted = pageRows.length < limit;
    pageReceipts.push({
      pageIndex,
      request,
      responseHash: page.responseHash,
      rowCount: pageRows.length,
      responseAggregationType: responseAggregation,
      metadata: response.metadata ?? null,
    });
  }
  if (!exhausted)
    pendingQueue.push({
      kind: "search-console-pagination",
      startRow: offset,
      reason:
        "Last page reached its row limit; another response page is required",
    });
  return {
    schemaVersion: 1,
    provider: "google-search-console",
    sourceId: input.sourceId,
    property: input.property,
    locator: input.locator,
    capturedAt: input.capturedAt,
    synthetic: input.synthetic,
    query: JSON.parse(queryIdentity),
    queryHash: hash(queryIdentity),
    timezone: "America/Los_Angeles",
    pages: pageReceipts,
    rows,
    pendingQueue,
    paginationExhausted: exhausted,
    populationComplete: false,
    totals: null,
    limitations: [
      "Supplied export; hashes establish integrity, not provider authenticity",
      "API top-row limits and omitted data prevent whole-site population completeness",
      "Missing rows are not zero; row CTR/position are preserved, never summed or averaged across queries",
      "Search traffic does not measure AI mentions, citations, answer accuracy or causal uplift",
    ],
  };
}
