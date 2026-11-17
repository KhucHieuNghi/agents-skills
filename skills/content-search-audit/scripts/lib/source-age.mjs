const DAY = 86400000;
function instant(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    )
  )
    return NaN;
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== value.slice(0, 10)
  )
    return NaN;
  return Date.parse(value);
}
/** Age describes capture/review timing, never factual freshness or quality. */
export function sourceAge(value, reportTime) {
  const end = instant(reportTime);
  if (!Number.isFinite(end)) throw new Error("Invalid source-age report time");
  if (typeof value !== "string" || !value.trim())
    return "Unavailable: source date missing";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const start = instant(dateOnly ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(start))
    return "Unavailable: invalid or timezone-ambiguous source date";
  const reference = dateOnly
    ? Date.parse(new Date(end).toISOString().slice(0, 10) + "T00:00:00Z")
    : end;
  if (start > reference) return "Unavailable: source date is after report time";
  const days = Math.floor((reference - start) / DAY);
  return `${days} ${dateOnly ? "UTC calendar days (date only)" : "full elapsed days"}`;
}
export function sourceAgeContext(reportTime) {
  sourceAge(reportTime, reportTime);
  return `Age reference: ${reportTime}. Timestamp ages count complete 24-hour intervals; date-only reviews use UTC calendar-day differences without inventing a time. Capture/export age is not the age of underlying facts or measurement windows. Rule review age is not a new source verification. Missing or future dates remain unavailable; no stale-content verdict follows from age alone.`;
}

/** Read already validated report bundles; retain date roles and scoped identities. */
export function measurementAgeRows(documents, reportTime) {
  const rows = [];
  for (const [file, text] of Object.entries(documents)) {
    if (!file.endsWith("-evidence.json")) continue;
    const bundle = JSON.parse(text);
    for (const receipt of bundle.receipts ?? [])
      rows.push([
        file,
        receipt.sourceId,
        "Export captured",
        receipt.capturedAt,
        sourceAge(receipt.capturedAt, reportTime),
      ]);
    for (const observation of bundle.receipt?.observations ?? []) {
      rows.push([
        file,
        observation.observationId,
        observation.status === "error"
          ? "Capture attempt"
          : "Response captured",
        observation.capturedAt,
        sourceAge(observation.capturedAt, reportTime),
      ]);
      const review = observation.accuracyReview;
      if (!review) continue;
      rows.push([
        file,
        observation.observationId,
        "Accuracy review",
        review.reviewedAt,
        sourceAge(review.reviewedAt, reportTime),
      ]);
      for (const claim of review.claims)
        for (const source of claim.sources)
          rows.push([
            file,
            `${observation.observationId}/${claim.claimId}/${source.artifact}`,
            "Claim source captured",
            source.capturedAt,
            sourceAge(source.capturedAt, reportTime),
          ]);
    }
  }
  return rows;
}
