import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { validateDeliveryReceipt } from "./tracking-dedup.mjs";
import { validateTrackingPayload } from "./tracking-payload.mjs";
import {
  enterpriseDigest,
  textValue,
  timestampValue,
} from "./enterprise-state.mjs";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const shape = (x, keys, label) =>
  assert(
    object(x) && Object.keys(x).every((k) => keys.includes(k)),
    `Invalid ${label} fields`,
  );
const digest = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const scopeKeys = [
  "customerId",
  "entityId",
  "environment",
  "journeyId",
  "scenarioId",
  "windowId",
];
const statuses = {
  action: ["attempted", "completed", "failed"],
  "data-layer": ["emitted"],
  tag: ["fired", "blocked"],
  network: ["requested", "responded", "failed"],
  provider: ["observed", "rejected"],
  business: [
    "attempt",
    "accepted",
    "rejected",
    "settled",
    "refunded",
    "cancelled",
    "active",
    "expired",
    "completed",
  ],
};
const sources = {
  "browser-trace": ["action", "data-layer", "tag", "network"],
  "provider-export": ["provider"],
  "business-export": ["business"],
  manual: Object.keys(statuses),
};
const time = (value) => Date.parse(value);
/** Normalize supplied traces only. No browser execution, inferred receipt, evaluation or authorization. */
export function normalizeTrackingObservations(input, context) {
  assert(
    object(context) &&
      scopeKeys.every((k) => textValue(context[k])) &&
      timestampValue(context.assessmentAt) &&
      timestampValue(context.window?.from) &&
      timestampValue(context.window?.to) &&
      time(context.window.from) < time(context.window.to) &&
      time(context.window.to) <= time(context.assessmentAt) &&
      Number.isSafeInteger(context.maxAgeSeconds) &&
      context.maxAgeSeconds > 0 &&
      context.maxAgeSeconds <= 366 * 86400,
    "Invalid tracking context/window/freshness",
  );
  shape(context.window, ["from", "to"], "tracking context window");
  shape(
    input,
    [
      "sourceId",
      "sourceKind",
      "locator",
      "capturedAt",
      "synthetic",
      "artifactText",
      "artifactHash",
      "provenance",
    ],
    "tracking source",
  );
  assert(
    textValue(input.sourceId) &&
      typeof input.sourceKind === "string" &&
      Object.hasOwn(sources, input.sourceKind) &&
      textValue(input.locator) &&
      timestampValue(input.capturedAt) &&
      time(input.capturedAt) <= time(context.assessmentAt) &&
      time(input.capturedAt) >= time(context.window.from) &&
      typeof input.synthetic === "boolean",
    "Invalid tracking source/capture",
  );
  assert(
    typeof input.artifactText === "string" &&
      Buffer.byteLength(input.artifactText) <= 32 * 1024 * 1024 &&
      digest(input.artifactHash) &&
      createHash("sha256").update(input.artifactText).digest("hex") ===
        input.artifactHash,
    "Tracking artifact hash mismatch or byte limit",
  );
  const artifact = JSON.parse(input.artifactText);
  shape(
    artifact,
    ["scope", "clockId", "coverage", "records"],
    "tracking artifact",
  );
  shape(artifact.scope, scopeKeys, "tracking scope");
  assert(
    scopeKeys.every((k) => artifact.scope[k] === context[k]),
    "Tracking scope mismatch",
  );
  assert(
    textValue(artifact.clockId) &&
      Array.isArray(artifact.coverage) &&
      artifact.coverage.length <= 6 &&
      Array.isArray(artifact.records) &&
      artifact.records.length <= 100000,
    "Invalid tracking clock/collections",
  );
  const gaps = [],
    seen = new Set(),
    eventKeys = new Set(),
    coverageSeen = new Set();
  const gap = (code, instructions) => {
    if (!gaps.some((x) => x.code === code)) gaps.push({ code, instructions });
  };
  let provenance = null;
  if (input.provenance !== undefined) {
    shape(input.provenance, ["actor", "method"], "tracking provenance");
    assert(
      textValue(input.provenance.actor) && textValue(input.provenance.method),
      "Invalid tracking attribution",
    );
    provenance = globalThis.structuredClone(input.provenance);
  }
  if (input.sourceKind === "manual" && provenance === null)
    gap(
      "missing-manual-attribution",
      "Supply the responsible observer and observation method; keep this as an unattributed assertion until supplied.",
    );
  const stageCoverage = Object.fromEntries(
    Object.keys(statuses).map((stage) => [stage, "missing"]),
  );
  const validUntil = new Date(
    time(input.capturedAt) + context.maxAgeSeconds * 1000,
  ).toISOString();
  if (time(validUntil) <= time(context.assessmentAt))
    gap(
      "stale-capture",
      "Supply a fresh trace for the same declared scope; retain this capture as historical evidence.",
    );
  if (input.sourceKind === "manual")
    gap(
      "manual-observation",
      "Retain attributed manual observations separately; obtain a browser/provider/business export where independent receipt evidence is needed.",
    );
  if (time(input.capturedAt) < time(context.window.to))
    gap(
      "partial-capture-window",
      "Supply a later capture covering the declared end of the window.",
    );
  for (const c of artifact.coverage) {
    shape(c, ["stage", "from", "to", "complete"], "tracking coverage");
    assert(
      Object.hasOwn(statuses, c.stage) &&
        sources[input.sourceKind].includes(c.stage) &&
        !coverageSeen.has(c.stage),
      "Invalid tracking coverage stage/source or duplicate",
    );
    coverageSeen.add(c.stage);
    assert(
      timestampValue(c.from) &&
        timestampValue(c.to) &&
        time(c.from) < time(c.to) &&
        time(c.to) <= time(input.capturedAt) &&
        time(c.from) < time(context.window.to) &&
        time(c.to) > time(context.window.from) &&
        typeof c.complete === "boolean",
      "Invalid tracking coverage interval",
    );
    stageCoverage[c.stage] =
      c.complete &&
      time(c.from) <= time(context.window.from) &&
      time(c.to) >= time(context.window.to)
        ? "complete"
        : "partial";
  }
  const records = artifact.records.map((record) => {
    shape(
      record,
      [
        "observationId",
        "stage",
        "eventKey",
        "correlationDigest",
        "eventName",
        "status",
        "observedAt",
        "httpStatus",
        "payload",
        "delivery",
      ],
      "tracking record",
    );
    assert(
      textValue(record.observationId) &&
        !seen.has(record.observationId) &&
        textValue(record.eventKey) &&
        (record.correlationDigest === null ||
          digest(record.correlationDigest)) &&
        textValue(record.eventName),
      "Invalid tracking identity or correlation digest",
    );
    seen.add(record.observationId);
    if (record.correlationDigest === null)
      gap(
        "missing-correlation",
        "Supply a permitted tenant-scoped correlation digest to compare stages; do not join observations by name or timestamps alone.",
      );
    assert(
      Object.hasOwn(statuses, record.stage) &&
        sources[input.sourceKind].includes(record.stage),
      "Tracking stage incompatible with source",
    );
    assert(
      statuses[record.stage].includes(record.status),
      "Invalid tracking stage status",
    );
    assert(
      timestampValue(record.observedAt) &&
        time(record.observedAt) >= time(context.window.from) &&
        time(record.observedAt) < time(context.window.to) &&
        time(record.observedAt) <= time(input.capturedAt),
      "Out-of-window or future tracking observation",
    );
    const bounds = artifact.coverage.find((c) => c.stage === record.stage);
    assert(
      !bounds ||
        (time(record.observedAt) >= time(bounds.from) &&
          time(record.observedAt) < time(bounds.to)),
      "Tracking record contradicts declared coverage interval",
    );
    if (record.httpStatus !== undefined)
      assert(
        record.stage === "network" &&
          record.status === "responded" &&
          Number.isInteger(record.httpStatus) &&
          record.httpStatus >= 100 &&
          record.httpStatus <= 599,
        "Invalid tracking HTTP status",
      );
    if (record.delivery !== undefined)
      validateDeliveryReceipt(record.delivery, record.stage);
    if (record.payload !== undefined) validateTrackingPayload(record.payload);
    const eventKey = JSON.stringify([record.stage, record.eventKey]);
    if (eventKeys.has(eventKey))
      gap(
        "repeated-event-key",
        "Repeated source event keys may be log copies, retries or duplicates; preserve records and obtain attempt/dedup semantics before classifying conversions.",
      );
    eventKeys.add(eventKey);
    if (stageCoverage[record.stage] === "missing")
      stageCoverage[record.stage] = "partial";
    return globalThis.structuredClone(record);
  });
  for (const [stage, state] of Object.entries(stageCoverage))
    if (state !== "complete")
      gap(
        `coverage-${stage}`,
        `Supply ${stage} observations and capture completeness for this exact customer/environment/journey/scenario/window; no upstream stage proves downstream receipt.`,
      );
  if (records.length === 0)
    gap(
      "empty-trace",
      "Confirm capture scope and completeness; an empty trace alone does not establish absence of activity.",
    );
  return {
    schemaVersion: 1,
    scope: globalThis.structuredClone(artifact.scope),
    window: globalThis.structuredClone(context.window),
    sourceId: input.sourceId,
    sourceKind: input.sourceKind,
    locator: input.locator,
    provenance,
    clockId: artifact.clockId,
    capturedAt: input.capturedAt,
    validUntil,
    synthetic: input.synthetic,
    sourceDigest: input.artifactHash,
    contextDigest: enterpriseDigest(context),
    records,
    coverage: globalThis.structuredClone(artifact.coverage),
    stageCoverage,
    gaps,
    usableForCurrentAssessment: time(validUntil) > time(context.assessmentAt),
    providerAuthenticated: false,
    assessmentAccepted: false,
    causalAttribution: false,
    limitations: [
      "Supplied source kind and completeness are attributed assertions, not authenticated provenance.",
      "Network response status does not establish provider processing or business outcome.",
      "Correlation digests must be tenant-scoped pseudonyms; this function cannot verify the upstream pseudonymization method.",
      "Different source clocks must not be assumed synchronized; no cross-source ordering or matching is inferred.",
      "Private source locators/identifiers require disclosure review before report projection.",
    ],
  };
}
