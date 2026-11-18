import {
  enterpriseDigest,
  textValue,
  timestampValue,
} from "./enterprise-state.mjs";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const profiles = new Set([
  "lead-generation",
  "commerce",
  "booking",
  "subscription",
  "publishing",
]);
const statuses = new Set([
  "attempt",
  "accepted",
  "rejected",
  "settled",
  "refunded",
  "cancelled",
  "active",
  "expired",
  "completed",
]);
/** Validate planning and ingestion against the same outcome/window definitions. */
export function validateBusinessObservationContract(dictionary, context) {
  assert(
    context &&
      textValue(context.customerId) &&
      textValue(context.entityId) &&
      textValue(context.sourceSystem) &&
      timestampValue(context.assessmentAt) &&
      timestampValue(context.window?.from) &&
      timestampValue(context.window?.to) &&
      Date.parse(context.window.from) < Date.parse(context.window.to) &&
      Date.parse(context.window.to) <= Date.parse(context.assessmentAt),
    "Invalid business observation context/window",
  );
  assert(
    dictionary &&
      textValue(dictionary.version) &&
      dictionary.sourceSystem === context.sourceSystem &&
      Array.isArray(dictionary.outcomes) &&
      dictionary.outcomes.length > 0,
    "Business outcome dictionary required",
  );
  const outcomes = new Map();
  for (const outcome of dictionary.outcomes) {
    assert(
      textValue(outcome.outcomeId) &&
        !outcomes.has(outcome.outcomeId) &&
        profiles.has(outcome.businessModel) &&
        Array.isArray(outcome.allowedStatuses) &&
        outcome.allowedStatuses.length > 0 &&
        outcome.allowedStatuses.every((status) => statuses.has(status)) &&
        new Set(outcome.allowedStatuses).size ===
          outcome.allowedStatuses.length &&
        Array.isArray(outcome.successStatuses) &&
        outcome.successStatuses.every((status) =>
          outcome.allowedStatuses.includes(status),
        ),
      "Invalid business outcome definition",
    );
    outcomes.set(outcome.outcomeId, outcome);
  }
  return outcomes;
}
/** Attributed supplied outcomes; no event-to-revenue inference, matching or aggregation. */
export function normalizeBusinessObservations(input, dictionary, context) {
  const outcomes = validateBusinessObservationContract(dictionary, context);
  assert(
    input &&
      input.customerId === context.customerId &&
      input.entityId === context.entityId &&
      input.sourceSystem === context.sourceSystem &&
      input.dictionaryVersion === dictionary.version &&
      textValue(input.sourceId) &&
      ["export", "manual"].includes(input.sourceKind) &&
      typeof input.synthetic === "boolean" &&
      timestampValue(input.capturedAt) &&
      Date.parse(input.capturedAt) <= Date.parse(context.assessmentAt) &&
      Array.isArray(input.records) &&
      input.records.length <= 100000,
    "Invalid business observation source/ownership",
  );
  const gaps = [],
    seen = new Set(),
    currencies = new Set();
  const gap = (code, instructions) => {
    if (!gaps.some((item) => item.code === code))
      gaps.push({ code, instructions });
  };
  assert(
    Date.parse(input.capturedAt) >= Date.parse(context.window.from),
    "Snapshot predates requested business window",
  );
  if (Date.parse(input.capturedAt) < Date.parse(context.window.to))
    gap(
      "partial-capture-window",
      "Supply a later capture covering the requested window; this snapshot predates its end.",
    );
  if (!input.records.length)
    gap(
      "empty-export",
      "No supplied records; verify export filters and coverage before inferring absence of business activity.",
    );
  let provenance = null;
  if (input.provenance !== undefined) {
    assert(
      input.provenance &&
        ["actor", "method", "locator"].every((key) =>
          textValue(input.provenance[key]),
        ),
      "Invalid business source provenance",
    );
    provenance = {
      actor: input.provenance.actor,
      method: input.provenance.method,
      locator: input.provenance.locator,
    };
  } else
    gap(
      "missing-source-provenance",
      "Supply the source locator, responsible actor and export/assertion method.",
    );
  if (input.sourceKind === "manual")
    gap(
      "manual-assertion",
      "Obtain a source-system export or retain this as an attributed manual assertion; do not claim system verification.",
    );
  const records = input.records.map((record) => {
    const outcome = outcomes.get(record?.outcomeId);
    assert(
      record &&
        (record.customerId === undefined ||
          record.customerId === context.customerId) &&
        (record.entityId === undefined || record.entityId === context.entityId),
      "Contradictory business record ownership",
    );
    assert(
      record &&
        textValue(record.recordId) &&
        !seen.has(record.recordId) &&
        outcome &&
        outcome.allowedStatuses.includes(record.status) &&
        timestampValue(record.occurredAt) &&
        Date.parse(record.occurredAt) >= Date.parse(context.window.from) &&
        Date.parse(record.occurredAt) < Date.parse(context.window.to) &&
        Date.parse(record.occurredAt) <= Date.parse(input.capturedAt),
      "Invalid, duplicate or out-of-window business record",
    );
    seen.add(record.recordId);
    assert(
      record.subjectId === null || textValue(record.subjectId),
      "Business identity must be supplied or explicitly null",
    );
    if (record.subjectId === null)
      gap(
        "unmatched-business-identity",
        "Supply a permitted correlation identifier if matching to a journey is needed; do not infer matches from timestamps alone.",
      );
    let amount;
    if (record.amount !== undefined) {
      assert(
        typeof record.amount?.value === "string" &&
          /^[+-]?\d+(?:\.\d+)?$/.test(record.amount.value) &&
          typeof record.amount.currency === "string" &&
          /^[A-Z]{3}$/.test(record.amount.currency),
        "Invalid business amount/currency",
      );
      assert(
        ["exact", "approximate", "unknown"].includes(
          record.amount.precision ?? "unknown",
        ),
        "Unsupported business amount precision",
      );
      amount = {
        precision: record.amount.precision ?? "unknown",
        value: record.amount.value,
        currency: record.amount.currency,
      };
      currencies.add(amount.currency);
    }
    return {
      recordId: record.recordId,
      subjectId: record.subjectId,
      outcomeId: record.outcomeId,
      businessModel: outcome.businessModel,
      status: record.status,
      occurredAt: record.occurredAt,
      ...(amount ? { amount } : {}),
      matchesDeclaredSuccess: outcome.successStatuses.includes(record.status),
    };
  });
  if (currencies.size > 1)
    gap(
      "mixed-currency",
      "Keep currencies separate; supply an explicit conversion policy before any monetary aggregation.",
    );
  return {
    schemaVersion: 1,
    customerId: context.customerId,
    entityId: context.entityId,
    sourceId: input.sourceId,
    sourceSystem: input.sourceSystem,
    sourceKind: input.sourceKind,
    provenance,
    capturedAt: input.capturedAt,
    synthetic: input.synthetic,
    dictionaryVersion: dictionary.version,
    dictionaryDigest: enterpriseDigest(dictionary),
    sourceDigest: enterpriseDigest(input),
    window: globalThis.structuredClone(context.window),
    records,
    gaps,
    totals: null,
    providerAuthenticated: false,
    causalAttribution: false,
    limitations: [
      "Declared outcome matches describe supplied records, not independently verified business success.",
      "Status transitions are retained; no final-state, net-revenue or cross-record deduplication is inferred.",
      "Raw business identifiers belong in private evidence, not public reports.",
    ],
  };
}
