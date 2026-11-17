/** Admission checks for newly submitted reviews, not historical artifact loading. */
export const REVIEW_CLOCK_SKEW_MS = 5 * 60 * 1000;
function instant(value, field, now) {
  const match =
    typeof value === "string" &&
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  const timestamp = match ? Date.parse(value) : NaN;
  if (!match || !Number.isFinite(timestamp))
    throw new Error(
      `Invalid ${field}: explicit ISO timestamp and timezone required`,
    );
  const [, year, month, day, hour, minute, second] = match;
  // Date.parse normalizes some invalid calendar dates instead of rejecting them.
  const y = Number(year);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    Number(month) - 1
  ];
  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > days ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    throw new Error(`Invalid ${field}: impossible calendar date or time`);
  if (timestamp > now + REVIEW_CLOCK_SKEW_MS)
    throw new Error(
      `Future ${field}: use the actual observation/review time, not an invented date`,
    );
}
export function validateNewReviewTimes(
  reviews,
  evidence = [],
  now = Date.now(),
) {
  if (!Number.isFinite(now)) throw new Error("Invalid review admission clock");
  for (const review of reviews) instant(review?.reviewedAt, "reviewedAt", now);
  for (const record of evidence)
    instant(record?.collectedAt, "collectedAt", now);
  return new Date(now).toISOString();
}
