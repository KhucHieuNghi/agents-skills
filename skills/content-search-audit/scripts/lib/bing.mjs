import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const timestamp = (value) =>
  text(value) &&
  /(Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));
function artifact(value, digest) {
  if (
    typeof value !== "string" ||
    Buffer.byteLength(value) > 16 * 1024 * 1024 ||
    !/^[a-f0-9]{64}$/.test(digest ?? "") ||
    hash(value) !== digest
  )
    throw new Error("Invalid Bing artifact size/hash");
}
function url(value) {
  const parsed = new URL(value);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new Error("Invalid Bing site/page URL");
}
function metric(value, name) {
  if (
    !object(value) ||
    !["exact", "approximate", "range", "unknown"].includes(value.kind)
  )
    throw new Error("Invalid Bing measurement precision");
  if (value.kind === "unknown") {
    if (
      !text(value.reason) ||
      value.value !== undefined ||
      value.lower !== undefined ||
      value.upper !== undefined
    )
      throw new Error(
        "Unknown Bing metric must have a reason without numeric values",
      );
  } else if (value.kind === "range") {
    if (
      ![value.lower, value.upper].every(
        (n) =>
          typeof n === "number" &&
          Number.isFinite(n) &&
          n >= 0 &&
          n <= Number.MAX_SAFE_INTEGER,
      ) ||
      value.lower > value.upper ||
      value.value !== undefined
    )
      throw new Error("Invalid Bing metric range");
  } else if (
    typeof value.value !== "number" ||
    !Number.isFinite(value.value) ||
    value.value < 0 ||
    value.value > Number.MAX_SAFE_INTEGER ||
    value.lower !== undefined ||
    value.upper !== undefined
  )
    throw new Error("Invalid Bing metric value");
  if (
    ["topicSize", "sitesCited", "queries"].includes(name) &&
    value.kind === "exact"
  )
    throw new Error(
      "Bing topic ecosystem metrics must retain approximate precision",
    );
  return value;
}
/** Supplied Bing search response or explicitly attributed AI dashboard mapping. No network. */
export function importBing(input) {
  if (
    !object(input) ||
    !text(input.sourceId) ||
    !text(input.locator) ||
    !timestamp(input.capturedAt) ||
    typeof input.synthetic !== "boolean" ||
    !["search-query-stats", "ai-performance-mapped"].includes(input.kind) ||
    !object(input.scope) ||
    !["locale", "market", "timezone", "period", "surfaces"].every((key) =>
      text(input.scope[key]),
    )
  )
    throw new Error("Invalid Bing export metadata/scope");
  url(input.siteUrl);
  artifact(input.responseText, input.responseHash);
  const response = JSON.parse(input.responseText),
    rows = [],
    seen = new Set();
  let sourceHash = input.responseHash;
  if (input.kind === "search-query-stats") {
    if (
      !object(response) ||
      !Array.isArray(response.d) ||
      response.d.length > 100000
    )
      throw new Error("Expected Bing GetQueryStats d array");
    for (const [rowIndex, row] of response.d.entries()) {
      const nativeDate =
        typeof row?.Date === "string" &&
        /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(row.Date);
      if (
        !object(row) ||
        !text(row.Query) ||
        (!nativeDate && !timestamp(row.Date)) ||
        ["Clicks", "Impressions"].some(
          (key) => !Number.isSafeInteger(row[key]) || row[key] < 0,
        ) ||
        ["AvgClickPosition", "AvgImpressionPosition"].some(
          (key) =>
            typeof row[key] !== "number" ||
            !Number.isFinite(row[key]) ||
            row[key] < 0,
        )
      )
        throw new Error("Invalid Bing search row");
      const milliseconds = nativeDate
        ? Number(nativeDate[1])
        : Date.parse(row.Date);
      if (
        !Number.isSafeInteger(milliseconds) ||
        !Number.isFinite(new Date(milliseconds).getTime())
      )
        throw new Error("Invalid Bing date");
      if (
        nativeDate?.[2] &&
        (Number(nativeDate[2].slice(1, 3)) > 23 ||
          Number(nativeDate[2].slice(3)) > 59)
      )
        throw new Error("Invalid Bing date offset");
      const key = JSON.stringify([row.Query, milliseconds]);
      if (seen.has(key)) throw new Error("Duplicate Bing query/date tuple");
      seen.add(key);
      rows.push({
        rowIndex,
        query: row.Query,
        dateRaw: row.Date,
        instant: new Date(milliseconds).toISOString(),
        clicks: row.Clicks,
        impressions: row.Impressions,
        averageClickPosition: row.AvgClickPosition,
        averageImpressionPosition: row.AvgImpressionPosition,
        responseHash: input.responseHash,
      });
    }
  } else {
    if (
      !object(input.mapping) ||
      !text(input.mapping.method) ||
      !text(input.mapping.reviewer) ||
      !timestamp(input.mapping.reviewedAt)
    )
      throw new Error("Bing dashboard mapping requires method/reviewer/date");
    artifact(input.sourceText, input.sourceHash);
    sourceHash = input.sourceHash;
    if (
      !object(response) ||
      !Array.isArray(response.rows) ||
      response.rows.length > 100000
    )
      throw new Error("Expected mapped Bing AI rows");
    for (const [rowIndex, row] of response.rows.entries()) {
      if (
        !object(row) ||
        !object(row.dimensions) ||
        !object(row.metrics) ||
        Object.keys(row.metrics).length === 0 ||
        Object.keys(row.dimensions).some(
          (key) => !["page", "groundingQuery", "topic", "date"].includes(key),
        ) ||
        Object.values(row.dimensions).some((value) => !text(value))
      )
        throw new Error("Invalid Bing AI row dimensions/metrics");
      if (row.dimensions.page) url(row.dimensions.page);
      const key = JSON.stringify(
        Object.fromEntries(
          Object.entries(row.dimensions).sort(([a], [b]) => a.localeCompare(b)),
        ),
      );
      if (seen.has(key)) throw new Error("Duplicate Bing AI dimension tuple");
      seen.add(key);
      for (const [name, value] of Object.entries(row.metrics)) {
        if (
          ![
            "citations",
            "averageCitedPages",
            "topicSize",
            "sitesCited",
            "queries",
            "opportunityCitations",
          ].includes(name)
        )
          throw new Error("Unknown Bing AI metric");
        metric(value, name);
        if (
          name === "opportunityCitations" &&
          !["range", "unknown"].includes(value.kind)
        )
          throw new Error("Bing opportunity citations must retain ranges");
      }
      rows.push({
        ...row,
        rowIndex,
        responseHash: input.responseHash,
        sourceHash,
      });
    }
  }
  return {
    schemaVersion: 1,
    provider: "bing-webmaster",
    sourceId: input.sourceId,
    kind: input.kind,
    siteUrl: input.siteUrl,
    locator: input.locator,
    capturedAt: input.capturedAt,
    synthetic: input.synthetic,
    scope: input.scope,
    mapping: input.mapping ?? null,
    responseHash: input.responseHash,
    sourceHash,
    rows,
    populationComplete: false,
    totals: null,
    limitations:
      input.kind === "search-query-stats"
        ? [
            "GetQueryStats is top-query search traffic, not AI citation observations",
            "No pagination or whole-site completeness is inferred; missing rows are unknown",
            "Average positions retain their distinct click/impression denominators; no pooled position is calculated",
          ]
        : [
            "Mapped dashboard data; source authenticity and mapping accuracy require independent review",
            "Citations are not answer-level mention rates, rankings, traffic, answer accuracy or causality",
            "Grounding queries are sampled retrieval phrases, not necessarily original user prompts",
            "Topic ecosystem values remain approximate; opportunity citation ranges have no computed midpoint",
            "Supported surfaces and supplied period remain explicit; no whole-AI-ecosystem coverage is inferred",
          ],
  };
}
