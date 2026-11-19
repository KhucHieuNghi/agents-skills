import { enterpriseDigest, timestampValue } from "./enterprise-state.mjs";

const mappedLabels = Object.freeze({
  citations: "Citations",
  averageCitedPages: "Average cited pages",
  topicSize: "Topic size",
  sitesCited: "Sites cited",
  queries: "Queries",
  opportunityCitations: "Opportunity citations",
});
const date = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && timestampValue(value + "T00:00:00Z");

/** Projection of replay-validated supplied inputs; no acquisition or disclosure authority. */
export function projectBingRows(data, selected, classification, assessmentAt) {
  const observations = [];
  const period = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/.exec(
    data.scope.period,
  );
  if (
    !period ||
    !date(period[1]) ||
    !date(period[2]) ||
    period[1] > period[2] ||
    period[2] > assessmentAt.slice(0, 10)
  )
    return { state: "unsupported-declared-period", observations: [] };
  if (data.kind === "search-query-stats") {
    for (const [index, row] of data.rows.entries()) {
      const day = row.instant.slice(0, 10);
      if (!date(day) || Date.parse(row.instant) > Date.parse(assessmentAt))
        return { state: "invalid-or-future-row-time", observations: [] };
      for (const [key, label, unit, precision] of [
        ["clicks", "Clicks", "clicks", "exact"],
        ["impressions", "Impressions", "impressions", "exact"],
        [
          "averageClickPosition",
          "Average click position",
          "position",
          "approximate",
        ],
        [
          "averageImpressionPosition",
          "Average impression position",
          "position",
          "approximate",
        ],
      ]) {
        observations.push({
          observationId: `bing-search-row-${enterpriseDigest([selected, row.rowIndex, key])}`,
          label: `Supplied Bing search row ${index + 1}: ${label}`,
          value: row[key],
          unit,
          precision,
          classification,
          period: { from: period[1], to: period[2] },
          scopeDescription: `${data.synthetic ? "Synthetic" : "Real-declared"} supplied Bing GetQueryStats row; query withheld; provider date marker ${row.instant}. Period shown is the declared export scope; row bucket boundaries and local date are unverified. Search query statistics are not AI citations. No provider authentication, total population, pooled positions or causal effect is established.`,
          evidenceIds: [selected],
        });
      }
    }
    return { state: "supplied-search-row-metrics", observations };
  }
  if (data.kind !== "ai-performance-mapped")
    return { state: "unsupported-bing-kind", observations: [] };
  if (Date.parse(data.mapping.reviewedAt) > Date.parse(assessmentAt))
    return { state: "future-mapping-review", observations: [] };
  for (const [index, row] of data.rows.entries()) {
    if (Object.hasOwn(row.dimensions, "date")) {
      const declaredDate = row.dimensions.date;
      if (
        !date(declaredDate) ||
        declaredDate < period[1] ||
        declaredDate > period[2]
      )
        return { state: "invalid-mapped-row-date", observations: [] };
    }
    for (const [key, metric] of Object.entries(row.metrics)) {
      if (!Object.hasOwn(mappedLabels, key))
        return { state: "unsupported-mapped-metric", observations: [] };
      if (
        metric.kind === "exact" &&
        key !== "averageCitedPages" &&
        !Number.isSafeInteger(metric.value)
      )
        return { state: "unsupported-numeric-precision", observations: [] };
      const value =
        metric.kind === "unknown"
          ? null
          : metric.kind === "range"
            ? { min: metric.lower, max: metric.upper }
            : metric.value;
      const precision =
        key === "averageCitedPages" && metric.kind === "exact"
          ? "approximate"
          : metric.kind;
      observations.push({
        observationId: `bing-ai-row-${enterpriseDigest([selected, row.rowIndex, key])}`,
        label: `Supplied mapped Bing AI row ${index + 1}: ${mappedLabels[key]}`,
        value,
        unit: key === "averageCitedPages" ? "pages per reported unit" : "count",
        precision,
        classification,
        period: { from: period[1], to: period[2] },
        scopeDescription: `${data.synthetic ? "Synthetic" : "Real-declared"} supplied dashboard mapping; ${Object.hasOwn(row.dimensions, "date") ? "row date is within declared scope" : "no row date declared"}; dimensions, declared surfaces and mapping reviewer withheld. Source and mapping are not independently authenticated or semantically verified. Mapped citations are not answer-level mention rates, rankings, traffic, answer accuracy or causal effects; no whole-AI-ecosystem coverage is established.`,
        evidenceIds: [selected],
      });
    }
  }
  return { state: "supplied-mapped-ai-metrics", observations };
}
