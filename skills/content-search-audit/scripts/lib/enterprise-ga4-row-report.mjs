import { enterpriseDigest } from "./enterprise-state.mjs";

const countMetrics = Object.freeze({
  activeUsers: "Active users",
  totalUsers: "Total users",
  newUsers: "New users",
  sessions: "Sessions",
  screenPageViews: "Page and screen views",
  eventCount: "Events",
});
const has = (x, key) => Object.hasOwn(x, key);
const arrayFlag = (metadata, key) =>
  !has(metadata, key)
    ? "unknown"
    : Array.isArray(metadata[key])
      ? metadata[key].length
        ? "reported"
        : "none declared"
      : "invalid";
const boolFlag = (metadata, key) =>
  !has(metadata, key)
    ? "unknown"
    : metadata[key] === true
      ? "reported"
      : metadata[key] === false
        ? "none declared"
        : "invalid";
/** Pure projection after the provider owner has replayed the entire supplied source. */
export function projectGa4Rows(data, selected, classification, assessmentAt) {
  const q = data.query,
    metrics = q.metrics.map((m) => m.name);
  if (
    q.cohortSpec ||
    q.comparisons ||
    q.dateRanges?.length !== 1 ||
    q.dateRanges[0].endDate > assessmentAt.slice(0, 10)
  )
    return { state: "unsupported-query-window", observations: [] };
  if (
    q.metrics.some(
      (metric) =>
        Object.keys(metric).some(
          (key) => !["name", "invisible"].includes(key),
        ) ||
        (has(metric, "invisible") && metric.invisible !== false),
    )
  )
    return { state: "unsupported-metric-definition", observations: [] };
  if (
    !metrics.length ||
    metrics.length > 6 ||
    metrics.some((m) => !has(countMetrics, m))
  )
    return { state: "unsupported-metric", observations: [] };
  if (!data.paginationExhausted)
    return { state: "incomplete-pagination", observations: [] };
  const flags = [];
  let zone;
  for (const page of data.pages) {
    const m = page.metadata;
    if (
      !m ||
      typeof m !== "object" ||
      Array.isArray(m) ||
      typeof m.timeZone !== "string"
    )
      return { state: "missing-or-invalid-timezone", observations: [] };
    try {
      new Intl.DateTimeFormat("en", { timeZone: m.timeZone });
    } catch {
      return { state: "invalid-timezone", observations: [] };
    }
    if (zone !== undefined && zone !== m.timeZone)
      return { state: "inconsistent-timezone", observations: [] };
    zone = m.timeZone;
    if (
      has(m, "samplingMetadatas") &&
      (!Array.isArray(m.samplingMetadatas) ||
        m.samplingMetadatas.some(
          (sample) =>
            !sample ||
            typeof sample !== "object" ||
            Array.isArray(sample) ||
            Object.keys(sample).some(
              (key) => !["samplesReadCount", "samplingSpaceSize"].includes(key),
            ) ||
            ![sample.samplesReadCount, sample.samplingSpaceSize].every(
              (value) =>
                typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value),
            ),
        ))
    )
      return { state: "invalid-quality-metadata", observations: [] };
    if (
      has(m, "dataTruncationReasons") &&
      (!Array.isArray(m.dataTruncationReasons) ||
        m.dataTruncationReasons.some(
          (reason) =>
            typeof reason !== "string" ||
            !/^[A-Z][A-Z0-9_]{0,127}$/.test(reason),
        ))
    )
      return { state: "invalid-quality-metadata", observations: [] };
    const threshold = boolFlag(m, "subjectToThresholding"),
      sampling = arrayFlag(m, "samplingMetadatas"),
      truncation = boolFlag(m, "dataLossFromOtherRow"),
      truncationReasons = arrayFlag(m, "dataTruncationReasons");
    if (
      [threshold, sampling, truncation, truncationReasons].includes("invalid")
    )
      return { state: "invalid-quality-metadata", observations: [] };
    if (has(m, "schemaRestrictionResponse")) {
      const restrictions = m.schemaRestrictionResponse;
      if (
        !restrictions ||
        typeof restrictions !== "object" ||
        Array.isArray(restrictions) ||
        Object.keys(restrictions).some(
          (key) => key !== "activeMetricRestrictions",
        ) ||
        !Array.isArray(restrictions.activeMetricRestrictions) ||
        restrictions.activeMetricRestrictions.length
      )
        return { state: "restricted-or-invalid-metrics", observations: [] };
    }
    flags.push({
      threshold,
      sampling,
      truncation,
      truncationReasons,
      restrictions: has(m, "schemaRestrictionResponse")
        ? "none declared"
        : "unknown",
    });
  }
  const combine = (key) =>
    flags.some((f) => f[key] === "reported")
      ? "reported"
      : flags.some((f) => f[key] === "unknown")
        ? "unknown"
        : "none declared";
  const observations = [];
  for (const [index, row] of data.rows.entries()) {
    for (const metric of metrics) {
      const item = row.metrics[metric];
      if (
        !item ||
        item.type !== "TYPE_INTEGER" ||
        !/^(0|[1-9][0-9]*)$/.test(item.value) ||
        !Number.isSafeInteger(Number(item.value))
      )
        return { state: "unsupported-numeric-precision", observations: [] };
      observations.push({
        observationId: `ga4-row-${enterpriseDigest([selected, row.pageIndex, row.rowIndex, metric])}`,
        label: `Supplied analytics row ${index + 1}: ${countMetrics[metric]}`,
        value: Number(item.value),
        unit: "count",
        classification,
        precision: "approximate",
        period: {
          from: q.dateRanges[0].startDate,
          to: q.dateRanges[0].endDate,
        },
        scopeDescription: `${data.synthetic ? "Synthetic" : "Real-declared"} supplied GA4 row with ${(q.dimensions ?? []).length} declared dimensions; dimension values withheld; dimension filter ${q.dimensionFilter ? "present" : "not declared"}, metric filter ${q.metricFilter ? "present" : "not declared"}; timezone ${zone}. Provider declarations: thresholding ${combine("threshold")}, sampling ${combine("sampling")}, other-row loss ${combine("truncation")}, truncation reasons ${combine("truncationReasons")}, restrictions ${combine("restrictions")}; other metadata is not assessed. Values are supplied and not provider-authenticated; pagination exhaustion does not establish population completeness. No cross-row totals or causal effects.`,
        evidenceIds: [selected],
      });
    }
  }
  return { state: "supplied-row-metrics", observations };
}
