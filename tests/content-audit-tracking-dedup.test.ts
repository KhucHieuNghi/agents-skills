import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  evaluateDedupReceipts,
  validateDeliveryReceipt,
} from "../skills/content-search-audit/scripts/lib/tracking-dedup.mjs";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const record = (
  attempt: string,
  disposition = "accepted",
  logical = "purchase",
) => ({
  stage: "provider",
  eventName: "purchase",
  status: "observed",
  correlationDigest: hash("customer-event"),
  delivery: {
    attemptDigest: hash(attempt),
    logicalEventDigest: hash(logical),
    disposition,
  },
});
it("distinguishes log copies from distinct accepted delivery attempts", () => {
  expect(evaluateDedupReceipts([record("a"), record("a")], 2).reason).toBe(
    "insufficient-distinct-attempts",
  );
  expect(evaluateDedupReceipts([record("a"), record("b")], 2)).toMatchObject({
    status: "fail",
    reason: "duplicate-accepted-event",
  });
});
it("requires actual suppression receipts for retry proof", () => {
  expect(
    evaluateDedupReceipts([record("a"), record("b", "duplicate-suppressed")], 2)
      .status,
  ).toBe("pass");
  expect(
    evaluateDedupReceipts([record("a"), record("b", "rejected")], 2).status,
  ).toBe("unknown");
});
it("keeps ambiguous identity and absent receipts unknown", () => {
  expect(
    evaluateDedupReceipts([record("a"), record("a", "duplicate-suppressed")], 2)
      .reason,
  ).toBe("conflicting-attempt-receipt");
  expect(evaluateDedupReceipts([{ stage: "provider" }], 2).reason).toBe(
    "missing-delivery-receipt",
  );
  expect(evaluateDedupReceipts([], 2).status).toBe("unknown");
});
it("does not merge different logical lifecycle events into one conversion", () => {
  const records = [
    record("a"),
    record("b", "duplicate-suppressed"),
    record("c", "accepted", "refund"),
    record("d", "duplicate-suppressed", "refund"),
  ];
  expect(evaluateDedupReceipts(records, 2).status).toBe("pass");
});
it("does not accept one attempt identity mapped to different logical events", () => {
  expect(
    evaluateDedupReceipts([record("a"), record("a", "accepted", "refund")], 2)
      .reason,
  ).toBe("conflicting-attempt-receipt");
});
it("rejects browser receipt spoofing and invalid attempt identifiers", () => {
  expect(() =>
    validateDeliveryReceipt(record("a").delivery, "network"),
  ).toThrow();
  expect(() =>
    validateDeliveryReceipt(
      { ...record("a").delivery, attemptDigest: "raw-identity" },
      "provider",
    ),
  ).toThrow();
  expect(() => evaluateDedupReceipts([record("a")], 1)).toThrow();
});

it("keeps a logical event shared across correlations unknown", () => {
  const a = record("a"),
    b = record("b", "duplicate-suppressed");
  b.correlationDigest = hash("different");
  expect(evaluateDedupReceipts([a, b], 2).reason).toBe(
    "conflicting-logical-event",
  );
});
it("compares receipt payload objects independently of object property order", () => {
  const a = { ...record("a"), payload: { complete: true, fields: [] } };
  const b = { ...record("a"), payload: { fields: [], complete: true } };
  expect(evaluateDedupReceipts([a, b], 2).reason).toBe(
    "insufficient-distinct-attempts",
  );
});
it("rejects malformed record entries", () => {
  expect(() => evaluateDedupReceipts([null], 2)).toThrow(
    /Invalid dedup records/,
  );
});

it("does not accept contradictory rejected or attempted acceptance receipts", () => {
  for (const [stage, status] of [
    ["provider", "rejected"],
    ["business", "rejected"],
    ["business", "attempt"],
  ]) {
    const records = [
      { ...record("a"), stage, status },
      { ...record("b", "duplicate-suppressed"), stage, status },
    ];
    expect(evaluateDedupReceipts(records, 2)).toMatchObject({
      status: "unknown",
      reason: "contradictory-delivery-status",
    });
  }
  const a = record("a"),
    b = { ...record("b", "duplicate-suppressed"), status: "rejected" };
  expect(evaluateDedupReceipts([a, b], 2).status).toBe("pass");
});

it("does not classify refund and purchase sharing a logical ID as duplicate purchases", () => {
  const a = { ...record("a"), stage: "business", status: "settled" };
  const b = { ...record("b"), stage: "business", status: "refunded" };
  expect(evaluateDedupReceipts([a, b], 2)).toMatchObject({
    status: "unknown",
    reason: "conflicting-logical-event",
  });
  b.delivery.logicalEventDigest = hash("refund");
  const c = {
    ...b,
    delivery: {
      ...b.delivery,
      attemptDigest: hash("c"),
      disposition: "duplicate-suppressed",
    },
  };
  const d = {
    ...a,
    delivery: {
      ...a.delivery,
      attemptDigest: hash("d"),
      disposition: "duplicate-suppressed",
    },
  };
  expect(evaluateDedupReceipts([a, b, c, d], 2).status).toBe("pass");
});
