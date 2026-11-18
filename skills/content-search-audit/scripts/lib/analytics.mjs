import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : object(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const integer = (value) =>
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) ||
  (typeof value === "string" &&
    /^(0|[1-9]\d*)$/.test(value) &&
    Number.isSafeInteger(Number(value)));
const date = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const requestKeys = new Set([
  "dimensions",
  "metrics",
  "dateRanges",
  "dimensionFilter",
  "metricFilter",
  "offset",
  "limit",
  "metricAggregations",
  "orderBys",
  "currencyCode",
  "cohortSpec",
  "keepEmptyRows",
  "returnPropertyQuota",
  "comparisons",
]);
/** Shared supplied-export query contract; does not verify provider metric compatibility. */
export function normalizeAnalyticsQuery(request) {
  if (
    !object(request) ||
    Object.keys(request).some((key) => !requestKeys.has(key)) ||
    !Array.isArray(request.metrics) ||
    !request.metrics.length ||
    !Array.isArray(request.dimensions ?? []) ||
    [...request.metrics, ...(request.dimensions ?? [])].some(
      (entry) => !object(entry) || !text(entry.name),
    )
  )
    throw new Error("Invalid analytics query fields/headers");
  if (
    !request.cohortSpec &&
    (!Array.isArray(request.dateRanges) ||
      !request.dateRanges.length ||
      request.dateRanges.some(
        (range) =>
          !object(range) ||
          !date(range.startDate) ||
          !date(range.endDate) ||
          range.startDate > range.endDate,
      ))
  )
    throw new Error(
      "Analytics exports require absolute date ranges (resolve relative dates before export)",
    );
  const normalized = { ...request };
  delete normalized.offset;
  delete normalized.limit;
  return normalized;
}
/** Supplied GA4 runReport pages. Values stay strings; no inferred totals or attribution. */
export function importAnalytics(input) {
  if (
    !object(input) ||
    !text(input.sourceId) ||
    !/^properties\/\d+$/.test(input.property ?? "") ||
    !text(input.locator) ||
    typeof input.synthetic !== "boolean" ||
    !text(input.capturedAt) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(input.capturedAt) ||
    !Number.isFinite(Date.parse(input.capturedAt)) ||
    !Array.isArray(input.pages) ||
    !input.pages.length ||
    input.pages.length > 1000
  )
    throw new Error("Invalid analytics export metadata/pages");
  let query,
    queryText,
    headersText,
    declaredRows,
    offset = 0,
    bytes = 0;
  const rows = [],
    pages = [],
    seen = new Set();
  for (const [pageIndex, page] of input.pages.entries()) {
    const request = page?.request;
    const normalized = normalizeAnalyticsQuery(request);
    const start = request.offset ?? "0",
      limit = request.limit ?? "10000";
    if (
      !integer(start) ||
      !integer(limit) ||
      Number(limit) < 1 ||
      Number(limit) > 250000 ||
      Number(start) !== offset ||
      (declaredRows !== undefined && offset >= declaredRows)
    )
      throw new Error("Invalid analytics pagination gap/overlap/limit");
    const identity = JSON.stringify(canonical(normalized));
    if (queryText !== undefined && queryText !== identity)
      throw new Error("Analytics query changed across pages");
    queryText = identity;
    query = normalized;
    if (
      typeof page.responseText !== "string" ||
      !/^[a-f0-9]{64}$/.test(page.responseHash ?? "") ||
      hash(page.responseText) !== page.responseHash
    )
      throw new Error("Analytics response artifact hash mismatch");
    bytes += Buffer.byteLength(page.responseText);
    if (bytes > 32 * 1024 * 1024)
      throw new Error("Analytics export exceeds 32 MiB");
    const response = JSON.parse(page.responseText);
    if (
      !object(response) ||
      response.error ||
      !Number.isSafeInteger(response.rowCount) ||
      response.rowCount < 0 ||
      !Array.isArray(response.rows ?? []) ||
      !Array.isArray(response.dimensionHeaders ?? []) ||
      !Array.isArray(response.metricHeaders)
    )
      throw new Error("Invalid analytics response");
    const dimensions = response.dimensionHeaders ?? [],
      metrics = response.metricHeaders;
    if (
      [...dimensions, ...metrics].some(
        (header) => !object(header) || !text(header.name),
      ) ||
      metrics.some((header) => !text(header.type)) ||
      new Set(dimensions.map((header) => header.name)).size !==
        dimensions.length ||
      new Set(metrics.map((header) => header.name)).size !== metrics.length ||
      JSON.stringify(metrics.map((header) => header.name)) !==
        JSON.stringify(request.metrics.map((metric) => metric.name)) ||
      (request.dimensions ?? []).some(
        (dimension) =>
          !dimensions.some((header) => header.name === dimension.name),
      )
    )
      throw new Error("Analytics response header mismatch");
    const headerIdentity = JSON.stringify([dimensions, metrics]);
    if (
      (headersText !== undefined && headersText !== headerIdentity) ||
      (declaredRows !== undefined && declaredRows !== response.rowCount)
    )
      throw new Error(
        "Analytics response schema/rowCount changed during pagination",
      );
    headersText = headerIdentity;
    declaredRows = response.rowCount;
    const pageRows = response.rows ?? [];
    if (
      pageRows.length > Number(limit) ||
      offset + pageRows.length > declaredRows
    )
      throw new Error("Analytics row count exceeds query bounds");
    for (const [rowIndex, row] of pageRows.entries()) {
      if (
        !object(row) ||
        !Array.isArray(row.dimensionValues ?? []) ||
        !Array.isArray(row.metricValues) ||
        (row.dimensionValues ?? []).length !== dimensions.length ||
        row.metricValues.length !== metrics.length ||
        (row.dimensionValues ?? []).some(
          (value) => !object(value) || typeof value.value !== "string",
        ) ||
        row.metricValues.some(
          (value) =>
            !object(value) ||
            typeof value.value !== "string" ||
            !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(
              value.value,
            ),
        )
      )
        throw new Error("Invalid analytics row values");
      const tuple = JSON.stringify(
        (row.dimensionValues ?? []).map((value) => value.value),
      );
      if (seen.has(tuple))
        throw new Error(
          "Duplicate analytics dimension tuple; pagination may have shifted",
        );
      seen.add(tuple);
      rows.push({
        dimensions: Object.fromEntries(
          dimensions.map((header, index) => [
            header.name,
            row.dimensionValues[index].value,
          ]),
        ),
        metrics: Object.fromEntries(
          metrics.map((header, index) => [
            header.name,
            { value: row.metricValues[index].value, type: header.type },
          ]),
        ),
        pageIndex,
        rowIndex,
        responseHash: page.responseHash,
      });
    }
    offset += pageRows.length;
    pages.push({
      pageIndex,
      request,
      responseHash: page.responseHash,
      rowCount: pageRows.length,
      declaredRowCount: declaredRows,
      dimensionHeaders: dimensions,
      metricHeaders: metrics,
      metadata: response.metadata ?? null,
      providerAggregates: {
        totals: response.totals ?? null,
        minimums: response.minimums ?? null,
        maximums: response.maximums ?? null,
      },
    });
  }
  return {
    schemaVersion: 1,
    provider: "google-analytics-data-api",
    sourceId: input.sourceId,
    property: input.property,
    locator: input.locator,
    capturedAt: input.capturedAt,
    synthetic: input.synthetic,
    query,
    queryHash: hash(queryText),
    pages,
    rows,
    paginationExhausted: offset === declaredRows,
    populationComplete: false,
    totals: null,
    pendingQueue:
      offset === declaredRows
        ? []
        : [
            {
              kind: "analytics-pagination",
              offset,
              reason: "Supplied rows do not reach the provider rowCount",
            },
          ],
    limitations: [
      "Supplied bytes are integrity-checked, not authenticated to the provider",
      "Metadata retains sampling, thresholding, restrictions, currency, timezone and truncation; missing metadata is unknown",
      "Metrics retain provider strings and types; users, sessions, rates and revenue are never summed across rows or queries",
      "No URL authorization, content coverage, AI visibility or causal attribution follows from analytics rows",
    ],
  };
}
