import { enterpriseDigest, textValue } from "./enterprise-state.mjs";
import { normalizeTrackingObservations } from "./tracking-observations.mjs";
import {
  validatePayloadRules,
  evaluateTrackingPayload,
} from "./tracking-payload.mjs";
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
const scopeKeys = [
  "customerId",
  "entityId",
  "environment",
  "journeyId",
  "scenarioId",
  "windowId",
];
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const shape = (value, keys, label) =>
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).every((k) => keys.includes(k)),
    `Invalid ${label} fields`,
  );
const unique = (a) => new Set(a).size === a.length;
const digest = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
/** Evaluate declared stage, typed payload and same-source order rules; not causality or release acceptance.
 * Sources are re-normalized from bytes; caller-supplied normalized verdicts are never trusted.
 */
export function evaluateTrackingJourney(contract, inputs, context) {
  shape(
    contract,
    [
      "contractId",
      "owner",
      "scope",
      "correlations",
      "minimumSampleSize",
      "providerLagSeconds",
      "expectations",
      "orderRules",
    ],
    "tracking contract",
  );
  assert(
    textValue(contract.contractId) && textValue(contract.owner),
    "Invalid tracking contract attribution",
  );
  shape(contract.scope, scopeKeys, "contract scope");
  assert(
    scopeKeys.every(
      (k) => textValue(contract.scope[k]) && contract.scope[k] === context?.[k],
    ),
    "Tracking contract scope mismatch",
  );
  assert(
    Array.isArray(contract.correlations) &&
      contract.correlations.length > 0 &&
      contract.correlations.length <= 10000 &&
      contract.correlations.every(digest) &&
      unique(contract.correlations),
    "Invalid contract correlations",
  );
  assert(
    Number.isSafeInteger(contract.minimumSampleSize) &&
      contract.minimumSampleSize > 0 &&
      Number.isSafeInteger(contract.providerLagSeconds) &&
      contract.providerLagSeconds >= 0 &&
      contract.providerLagSeconds <= 366 * 86400,
    "Invalid contract sample/latency",
  );
  assert(
    Array.isArray(contract.expectations) &&
      contract.expectations.length > 0 &&
      contract.expectations.length <= 6,
    "Invalid contract expectations",
  );
  const seenStages = new Set();
  for (const e of contract.expectations) {
    shape(
      e,
      [
        "stage",
        "eventName",
        "acceptedStatuses",
        "forbiddenStatuses",
        "minCount",
        "maxCount",
        "acceptedHttpStatuses",
        "payloadRules",
      ],
      "tracking expectation",
    );
    assert(
      typeof e.stage === "string" &&
        Object.hasOwn(statuses, e.stage) &&
        !seenStages.has(e.stage) &&
        textValue(e.eventName),
      "Invalid or duplicate expectation stage/event",
    );
    seenStages.add(e.stage);
    if (e.payloadRules !== undefined) validatePayloadRules(e.payloadRules);
    assert(
      Array.isArray(e.acceptedStatuses) &&
        e.acceptedStatuses.length > 0 &&
        Array.isArray(e.forbiddenStatuses) &&
        unique([...e.acceptedStatuses, ...e.forbiddenStatuses]) &&
        [...e.acceptedStatuses, ...e.forbiddenStatuses].every((s) =>
          statuses[e.stage].includes(s),
        ),
      "Invalid expectation statuses",
    );
    if (e.stage === "network" && e.acceptedStatuses.includes("responded")) {
      assert(
        Array.isArray(e.acceptedHttpStatuses) &&
          e.acceptedHttpStatuses.length > 0 &&
          unique(e.acceptedHttpStatuses) &&
          e.acceptedHttpStatuses.every(
            (s) => Number.isInteger(s) && s >= 100 && s <= 599,
          ),
        "Explicit accepted HTTP statuses required for response evaluation",
      );
    } else assert(e.acceptedHttpStatuses === undefined, "Unexpected HTTP rule");
    assert(
      Number.isSafeInteger(e.minCount) &&
        e.minCount >= 0 &&
        Number.isSafeInteger(e.maxCount) &&
        e.maxCount >= e.minCount &&
        e.maxCount <= 100000,
      "Invalid expectation cardinality",
    );
  }
  assert(
    Array.isArray(inputs) && inputs.length > 0 && inputs.length <= 100,
    "Invalid tracking sources",
  );
  const orderRules =
    contract.orderRules === undefined ? [] : contract.orderRules;
  assert(
    Array.isArray(orderRules) && orderRules.length <= 30,
    "Invalid order rules",
  );
  const orderIds = new Set();
  for (const rule of orderRules) {
    shape(
      rule,
      ["id", "beforeStage", "afterStage", "allowEqual", "maxDelayMs"],
      "order rule",
    );
    assert(
      typeof rule.id === "string" &&
        /^[a-z][a-z0-9-]{0,63}$/.test(rule.id) &&
        !orderIds.has(rule.id) &&
        seenStages.has(rule.beforeStage) &&
        seenStages.has(rule.afterStage) &&
        rule.beforeStage !== rule.afterStage &&
        typeof rule.allowEqual === "boolean" &&
        Number.isSafeInteger(rule.maxDelayMs) &&
        rule.maxDelayMs >= 0 &&
        rule.maxDelayMs <= 366 * 86400000,
      "Invalid order rule identity/stages/bounds",
    );
    orderIds.add(rule.id);
  }
  const sources = inputs.map((input) =>
    normalizeTrackingObservations(input, context),
  );
  const envelopeDigests = new Map(
    inputs.map((input) => [input.sourceId, enterpriseDigest(input)]),
  );
  assert(
    unique(sources.map((x) => x.sourceId)),
    "Duplicate tracking source IDs",
  );
  assert(
    new Set(sources.map((x) => x.synthetic)).size === 1,
    "Mixed synthetic and real sources",
  );
  const checks = [];
  for (const e of contract.expectations) {
    const candidates = sources.filter(
      (s) => s.stageCoverage[e.stage] !== "missing",
    );
    for (const correlation of contract.correlations) {
      const check = {
        stage: e.stage,
        eventName: e.eventName,
        correlationDigest: correlation,
        status: "unknown",
        reason: "missing-source",
        evidence: [],
      };
      checks.push(check);
      if (!candidates.length) continue;
      if (candidates.length > 1) {
        check.reason = "overlapping-sources";
        continue;
      }
      const source = candidates[0];
      check.evidence = [
        {
          sourceId: source.sourceId,
          sourceDigest: source.sourceDigest,
          envelopeDigest: envelopeDigests.get(source.sourceId),
        },
      ];
      if (!source.usableForCurrentAssessment) {
        check.reason = "stale-source";
        continue;
      }
      if (source.sourceKind === "manual") {
        check.reason = "manual-source";
        continue;
      }
      if (source.stageCoverage[e.stage] !== "complete") {
        check.reason = "incomplete-coverage";
        continue;
      }
      if (
        e.stage === "provider" &&
        Date.parse(context.assessmentAt) <
          Date.parse(context.window.to) + contract.providerLagSeconds * 1000
      ) {
        check.reason = "provider-lag";
        continue;
      }
      if (
        e.stage === "provider" &&
        Date.parse(source.capturedAt) <
          Date.parse(context.window.to) + contract.providerLagSeconds * 1000
      ) {
        check.reason = "provider-capture-too-early";
        continue;
      }
      if (contract.correlations.length < contract.minimumSampleSize) {
        check.reason = "insufficient-sample";
        continue;
      }
      const stageRecords = source.records.filter((r) => r.stage === e.stage);
      const relevant = stageRecords.filter((r) => r.eventName === e.eventName);
      if (
        relevant.some(
          (r) => !contract.correlations.includes(r.correlationDigest),
        )
      ) {
        check.reason = "unmapped-correlation";
        continue;
      }
      const records = relevant.filter(
        (r) => r.correlationDigest === correlation,
      );
      check.evidence[0].observationIds = records.map((r) => r.observationId);
      if (!unique(stageRecords.map((r) => r.eventKey))) {
        check.evidence[0].observationIds = stageRecords.map(
          (r) => r.observationId,
        );
        check.reason = "ambiguous-event-identity";
        continue;
      }
      const responses = records.filter(
        (r) => r.stage === "network" && r.status === "responded",
      );
      if (
        e.acceptedHttpStatuses &&
        responses.some((r) => r.httpStatus === undefined)
      ) {
        check.reason = "missing-http-status";
        continue;
      }
      if (
        e.acceptedHttpStatuses &&
        responses.some((r) => !e.acceptedHttpStatuses.includes(r.httpStatus))
      ) {
        check.status = "fail";
        check.reason = "unexpected-http-status";
        continue;
      }
      if (records.some((r) => e.forbiddenStatuses.includes(r.status))) {
        check.status = "fail";
        check.reason = "forbidden-status";
        continue;
      }
      const count = records.filter((r) =>
        e.acceptedStatuses.includes(r.status),
      ).length;
      check.observedCount = count;
      check.status =
        count >= e.minCount && count <= e.maxCount ? "pass" : "fail";
      check.reason =
        check.status === "pass"
          ? "declared-stage-rule-satisfied"
          : "count-out-of-range";
    }
  }
  const payloadChecks = [];
  for (const expectation of contract.expectations.filter(
    (e) => e.payloadRules !== undefined,
  )) {
    for (const base of checks.filter((c) => c.stage === expectation.stage)) {
      const source = sources.find(
        (s) => s.sourceId === base.evidence[0]?.sourceId,
      );
      const result =
        base.status === "pass" && source
          ? evaluateTrackingPayload(
              expectation.payloadRules,
              source.records
                .filter(
                  (r) =>
                    r.stage === base.stage &&
                    r.eventName === base.eventName &&
                    r.correlationDigest === base.correlationDigest &&
                    expectation.acceptedStatuses.includes(r.status),
                )
                .map((r) => r.payload),
            )
          : { status: "unknown", reason: "payload-stage-not-eligible" };
      payloadChecks.push({
        ...globalThis.structuredClone(base),
        ...result,
        checkKind: "payload",
      });
    }
  }
  checks.push(...payloadChecks);
  const orderChecks = [];
  for (const rule of orderRules)
    for (const correlation of contract.correlations) {
      const before = checks.find(
        (c) =>
          !c.checkKind &&
          c.stage === rule.beforeStage &&
          c.correlationDigest === correlation,
      );
      const after = checks.find(
        (c) =>
          !c.checkKind &&
          c.stage === rule.afterStage &&
          c.correlationDigest === correlation,
      );
      const check = {
        stage: rule.afterStage,
        eventName: after.eventName,
        correlationDigest: correlation,
        checkKind: `ordering-${rule.id}`,
        status: "unknown",
        reason: "ordering-stage-not-eligible",
        evidence: [],
      };
      const bindings = new Map();
      for (const b of [...before.evidence, ...after.evidence]) {
        const existing = bindings.get(b.sourceId);
        bindings.set(b.sourceId, {
          ...b,
          observationIds: [
            ...new Set([
              ...(existing?.observationIds ?? []),
              ...(b.observationIds ?? []),
            ]),
          ],
        });
      }
      check.evidence = [...bindings.values()];
      orderChecks.push(check);
      if (before.status !== "pass" || after.status !== "pass") continue;
      if (before.evidence[0]?.sourceId !== after.evidence[0]?.sourceId) {
        check.reason = "cross-source-order-unverified";
        continue;
      }
      const source = sources.find(
        (s) => s.sourceId === before.evidence[0].sourceId,
      );
      const pair = [before, after].map((base) => {
        const e = contract.expectations.find((e) => e.stage === base.stage);
        return source.records.filter(
          (r) =>
            r.stage === base.stage &&
            r.eventName === base.eventName &&
            r.correlationDigest === correlation &&
            e.acceptedStatuses.includes(r.status),
        );
      });
      if (pair.some((records) => records.length !== 1)) {
        check.reason = "ambiguous-order-pair";
        continue;
      }
      const elapsed =
        Date.parse(pair[1][0].observedAt) - Date.parse(pair[0][0].observedAt);
      if (elapsed === 0 && !rule.allowEqual) {
        check.reason = "ordering-resolution-ambiguous";
        continue;
      }
      check.status = elapsed < 0 || elapsed > rule.maxDelayMs ? "fail" : "pass";
      check.reason =
        check.status === "pass"
          ? "declared-order-rule-satisfied"
          : "event-order-violation";
    }
  checks.push(...orderChecks);
  const status = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "unknown")
      ? "unknown"
      : "pass";
  return {
    schemaVersion: 1,
    contractId: contract.contractId,
    contractDigest: enterpriseDigest(contract),
    contextDigest: enterpriseDigest(context),
    sourceDigests: sources.map((s) => ({
      sourceId: s.sourceId,
      digest: s.sourceDigest,
      envelopeDigest: envelopeDigests.get(s.sourceId),
      sourceKind: s.sourceKind,
      capturedAt: s.capturedAt,
    })),
    synthetic: sources[0].synthetic,
    assessmentAt: context.assessmentAt,
    status,
    checks,
    dataRequests: checks
      .filter((c) => c.status === "unknown")
      .map((c) => ({
        stage: c.stage,
        correlationDigest: c.correlationDigest,
        reason: c.reason,
        instructions: `Supply attributable ${c.stage} evidence and resolve ${c.reason} for the declared scope; do not substitute another stage's observations.`,
      })),
    unassessed: [
      ...(contract.expectations.every((e) => e.payloadRules !== undefined)
        ? []
        : ["payload-validation"]),
      "cross-clock-ordering",
      "dedup-implementation",
      "consent-policy",
      "causal-attribution",
    ],
    assessmentAccepted: false,
    providerAuthenticated: false,
    causalAttribution: false,
    limitations: [
      "Pass applies only to declared stage, typed payload or same-source ordering rules on supplied observations, not all tracking requirements.",
      "Contract ownership, source completeness and correlation semantics are supplied assertions requiring independent review.",
      "Distinct event keys prove excess records under the declared contract, not necessarily duplicate real conversions.",
      "Provider lag uses the owner's declared bound; time elapsed alone does not authenticate source completeness.",
    ],
  };
}
