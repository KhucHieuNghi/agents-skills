import { expect, it } from "vitest";
import {
  validateNewReviewTimes,
  REVIEW_CLOCK_SKEW_MS,
} from "../skills/content-search-audit/scripts/lib/review-time.mjs";
const now = Date.parse("2026-11-15T22:15:35Z");
it("rejects the actual host's future timestamp for both review and new evidence", () => {
  const fabricated = "2026-11-16T00:00:00.000Z";
  expect(() =>
    validateNewReviewTimes([{ reviewedAt: fabricated }], [], now),
  ).toThrow(/Future reviewedAt/);
  expect(() =>
    validateNewReviewTimes([], [{ collectedAt: fabricated }], now),
  ).toThrow(/Future collectedAt/);
});
it("accepts historical times and equivalent timezone offsets without rewriting them", () => {
  const reviews = [{ reviewedAt: "2026-11-16T05:15:35+07:00" }];
  const evidence = [{ collectedAt: "2024-02-29T10:00:00Z" }];
  const original = structuredClone({ reviews, evidence });
  expect(validateNewReviewTimes(reviews, evidence, now)).toBe(
    "2026-11-15T22:15:35.000Z",
  );
  expect({ reviews, evidence }).toEqual(original);
});
it("enforces clock skew boundary and rejects missing timezone and normalized invalid dates", () => {
  expect(() =>
    validateNewReviewTimes(
      [{ reviewedAt: new Date(now + REVIEW_CLOCK_SKEW_MS).toISOString() }],
      [],
      now,
    ),
  ).not.toThrow();
  expect(() =>
    validateNewReviewTimes(
      [{ reviewedAt: new Date(now + REVIEW_CLOCK_SKEW_MS + 1).toISOString() }],
      [],
      now,
    ),
  ).toThrow(/Future/);
  for (const date of [
    undefined,
    "yesterday",
    "2026-11-15",
    "2026-11-15T10:00:00",
    "2026-02-30T00:00:00Z",
    "2025-02-29T00:00:00Z",
    "2026-11-15T24:00:00Z",
  ])
    expect(() =>
      validateNewReviewTimes([{ reviewedAt: date }], [], now),
    ).toThrow(/Invalid reviewedAt/);
});
