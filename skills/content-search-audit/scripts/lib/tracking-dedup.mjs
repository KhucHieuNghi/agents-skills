import { enterpriseDigest } from "./enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const shape = (x, keys) =>
  assert(
    x &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.keys(x).every((k) => keys.includes(k)),
    "Invalid delivery receipt fields",
  );
const digest = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
export function validateDeliveryReceipt(receipt, stage) {
  shape(receipt, ["attemptDigest", "logicalEventDigest", "disposition"]);
  assert(
    ["provider", "business"].includes(stage),
    "Delivery disposition requires provider/business evidence",
  );
  assert(
    digest(receipt.attemptDigest) &&
      digest(receipt.logicalEventDigest) &&
      ["accepted", "duplicate-suppressed", "rejected", "unknown"].includes(
        receipt.disposition,
      ),
    "Invalid delivery receipt identity/disposition",
  );
  return receipt;
}
/** Supplied per-attempt receipt consistency, not proof of live dedup code or provider authenticity. */
export function evaluateDedupReceipts(records, minimumAttempts) {
  assert(
    Array.isArray(records) &&
      Number.isSafeInteger(minimumAttempts) &&
      minimumAttempts >= 2 &&
      minimumAttempts <= 1000,
    "Invalid dedup sample contract",
  );
  if (!records.length) return { status: "unknown", reason: "no-dedup-sample" };
  assert(
    records.every((r) => r && typeof r === "object" && !Array.isArray(r)),
    "Invalid dedup records",
  );
  if (records.some((r) => r.delivery === undefined))
    return { status: "unknown", reason: "missing-delivery-receipt" };
  const attempts = new Map();
  for (const r of records) {
    validateDeliveryReceipt(r.delivery, r.stage);
    const d = r.delivery;
    if (
      d.disposition === "accepted" &&
      !(r.stage === "provider"
        ? r.status === "observed"
        : [
            "accepted",
            "settled",
            "refunded",
            "cancelled",
            "active",
            "expired",
            "completed",
          ].includes(r.status))
    )
      return { status: "unknown", reason: "contradictory-delivery-status" };
    const signature = enterpriseDigest([
      r.stage,
      d.logicalEventDigest,
      d.disposition,
      r.correlationDigest,
      r.eventName,
      r.status,
      r.payload ?? null,
    ]);
    const previous = attempts.get(d.attemptDigest);
    if (previous && previous.signature !== signature)
      return { status: "unknown", reason: "conflicting-attempt-receipt" };
    attempts.set(d.attemptDigest, { signature, delivery: d });
  }
  const logicalScopes = new Map();
  for (const r of records) {
    const identity = enterpriseDigest([
      r.stage,
      r.correlationDigest,
      r.eventName,
      r.stage === "business" &&
      ["refunded", "cancelled", "expired"].includes(r.status)
        ? r.status
        : "original",
    ]);
    const key = r.delivery.logicalEventDigest;
    if (logicalScopes.has(key) && logicalScopes.get(key) !== identity)
      return { status: "unknown", reason: "conflicting-logical-event" };
    logicalScopes.set(key, identity);
  }
  const groups = new Map();
  for (const { delivery: d } of attempts.values()) {
    if (!groups.has(d.logicalEventDigest)) groups.set(d.logicalEventDigest, []);
    groups.get(d.logicalEventDigest).push(d.disposition);
  }
  let gap = null;
  const counts = [];
  for (const dispositions of groups.values()) {
    const accepted = dispositions.filter((x) => x === "accepted").length,
      suppressed = dispositions.filter(
        (x) => x === "duplicate-suppressed",
      ).length;
    counts.push({ attempts: dispositions.length, accepted, suppressed });
    if (accepted > 1)
      return { status: "fail", reason: "duplicate-accepted-event", counts };
    if (dispositions.length < minimumAttempts)
      gap = "insufficient-distinct-attempts";
    else if (accepted !== 1 || suppressed !== dispositions.length - 1)
      gap = "incomplete-dedup-dispositions";
  }
  return {
    status: gap ? "unknown" : "pass",
    reason: gap ?? "supplied-dedup-receipts-consistent",
    counts,
  };
}
