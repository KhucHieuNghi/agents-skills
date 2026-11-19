import { normalizeProviderSnapshot } from "../../skills/content-search-audit/scripts/lib/measurement-config.mjs";
import { Buffer } from "node:buffer";
import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const text = (v) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 256;
const numericId = (v) => typeof v === "string" && /^\d{1,32}$/.test(v);
function exact(value, keys, label) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${label} fields`,
  );
}
const ids = (v) =>
  Array.isArray(v) &&
  v.length <= 100 &&
  v.every(numericId) &&
  new Set(v).size === v.length;
export function boundedJson(value) {
  let nodes = 0,
    characters = 0;
  const active = new Set();
  function walk(item, depth) {
    assert(++nodes <= 20000 && depth <= 32, "Expected bounded JSON input");
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "number") {
      assert(Number.isFinite(item), "Expected bounded JSON input");
      return;
    }
    if (typeof item === "string") {
      characters += item.length;
      assert(characters <= 1024 * 1024, "Expected bounded JSON input");
      return;
    }
    assert(
      item &&
        typeof item === "object" &&
        !active.has(item) &&
        (Array.isArray(item) ||
          [Object.prototype, null].includes(Object.getPrototypeOf(item))),
      "Expected bounded JSON input",
    );
    active.add(item);
    const keys = Reflect.ownKeys(item);
    if (Array.isArray(item))
      assert(
        item.length <= 20000 && keys.length === item.length + 1,
        "Expected bounded JSON array",
      );
    for (const key of keys) {
      if (Array.isArray(item) && key === "length") continue;
      assert(typeof key === "string", "Expected bounded JSON input");
      if (Array.isArray(item))
        assert(
          /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < item.length,
          "Expected bounded JSON array",
        );
      characters += key.length;
      assert(characters <= 1024 * 1024, "Expected bounded JSON input");
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      assert(
        descriptor.enumerable && Object.hasOwn(descriptor, "value"),
        "Expected bounded JSON input",
      );
      walk(descriptor.value, depth + 1);
    }
    active.delete(item);
  }
  walk(value, 0);
  assert(
    Buffer.byteLength(JSON.stringify(value)) <= 2 * 1024 * 1024,
    "Expected bounded JSON input",
  );
}
const rules = {
  "ga4-timezone": {
    kind: "ga4-config",
    collection: null,
    field: "timeZone",
    type: "text",
  },
  "ga4-currency": {
    kind: "ga4-config",
    collection: null,
    field: "currencyCode",
    type: "currency",
  },
  "ga4-web-measurement-id": {
    kind: "ga4-config",
    collection: "dataStreams",
    field: "measurementId",
    type: "measurement",
  },
  "ga4-key-event-counting": {
    kind: "ga4-config",
    collection: "keyEvents",
    field: "countingMethod",
    type: "counting",
  },
  "gtm-tag-paused": {
    kind: "gtm-version",
    collection: "tag",
    field: "paused",
    type: "boolean",
  },
  "gtm-tag-firing-triggers": {
    kind: "gtm-version",
    collection: "tag",
    field: "firingTriggerId",
    type: "ids",
  },
  "gtm-tag-blocking-triggers": {
    kind: "gtm-version",
    collection: "tag",
    field: "blockingTriggerId",
    type: "ids",
  },
  "gtm-trigger-present": {
    kind: "gtm-version",
    collection: "trigger",
    field: null,
    type: "present",
  },
  "gtm-variable-present": {
    kind: "gtm-version",
    collection: "variable",
    field: null,
    type: "present",
  },
};
function validValue(type, value) {
  if (type === "boolean") return typeof value === "boolean";
  if (type === "present") return value === true;
  if (type === "ids") return ids(value);
  if (type === "currency")
    return typeof value === "string" && /^[A-Z]{3}$/.test(value);
  if (type === "measurement")
    return typeof value === "string" && /^G-[A-Z0-9]{1,64}$/.test(value);
  if (type === "counting")
    return ["ONCE_PER_EVENT", "ONCE_PER_SESSION"].includes(value);
  if (type === "text") {
    if (!text(value)) return false;
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
function validateContract(contract, kind, context) {
  exact(
    contract,
    [
      "schemaVersion",
      "contractId",
      "customerId",
      "entityId",
      "resource",
      "versionId",
      "ownerRole",
      "confirmedAt",
      "validUntil",
      "expectations",
    ],
    "measurement contract",
  );
  assert(
    contract.schemaVersion === 1 &&
      text(contract.contractId) &&
      text(contract.ownerRole),
    "Invalid contract identity",
  );
  assert(
    contract.customerId === context.run.customerId &&
      contract.entityId === context.entityId &&
      contract.resource === context.resource &&
      contract.versionId ===
        (kind === "gtm-version" ? context.versionId : null),
    "Foreign measurement contract scope/version",
  );
  assert(
    timestampValue(contract.confirmedAt) &&
      timestampValue(contract.validUntil) &&
      Date.parse(contract.confirmedAt) <=
        Date.parse(context.run.assessmentAt) &&
      Date.parse(contract.confirmedAt) < Date.parse(contract.validUntil),
    "Invalid contract confirmation/validity",
  );
  assert(
    Array.isArray(contract.expectations) &&
      contract.expectations.length > 0 &&
      contract.expectations.length <= 100,
    "Invalid expectation count",
  );
  const names = new Set(),
    subjects = new Set();
  for (const expectation of contract.expectations) {
    exact(expectation, ["id", "rule", "subject", "expected"], "expectation");
    const rule = Object.hasOwn(rules, expectation.rule)
      ? rules[expectation.rule]
      : null;
    assert(
      text(expectation.id) && !names.has(expectation.id) && rule?.kind === kind,
      "Duplicate expectation or unsupported rule",
    );
    names.add(expectation.id);
    const subjectKey = stableJson([expectation.rule, expectation.subject]);
    assert(!subjects.has(subjectKey), "Conflicting duplicate rule/subject");
    subjects.add(subjectKey);
    const subjectValid =
      rule.collection === null
        ? expectation.subject === null
        : kind === "gtm-version"
          ? numericId(expectation.subject)
          : rule.collection === "dataStreams"
            ? typeof expectation.subject === "string" &&
              expectation.subject.startsWith(
                `${context.resource}/dataStreams/`,
              ) &&
              /^properties\/\d+\/dataStreams\/\d+$/.test(expectation.subject)
            : text(expectation.subject);
    assert(
      subjectValid && validValue(rule.type, expectation.expected),
      "Invalid expectation subject/value",
    );
  }
}
function validateCollections(payload, kind) {
  if (kind === "gtm-version")
    assert(
      payload.version.deleted === undefined ||
        typeof payload.version.deleted === "boolean",
      "Invalid GTM deleted flag",
    );
  const names =
    kind === "ga4-config"
      ? ["dataStreams", "keyEvents"]
      : ["tag", "trigger", "variable"];
  if (payload.collections !== undefined)
    assert(
      payload.collections &&
        typeof payload.collections === "object" &&
        !Array.isArray(payload.collections),
      "Invalid collection receipts",
    );
  for (const name of names) {
    const receipt = payload.collections?.[name];
    if (receipt === undefined) continue;
    assert(
      receipt &&
        typeof receipt === "object" &&
        !Array.isArray(receipt) &&
        typeof receipt.complete === "boolean",
      "Invalid collection completeness",
    );
    assert(
      receipt.nextPageToken === undefined ||
        typeof receipt.nextPageToken === "string",
      "Invalid pagination token",
    );
    assert(
      !(receipt.complete && receipt.nextPageToken),
      "Contradictory collection completeness",
    );
  }
}
function inspectExpectation(expectation, normalized, payload, kind) {
  const rule = rules[expectation.rule];
  let item = kind === "ga4-config" ? normalized.property : null;
  if (rule.collection) {
    // Use original collection presence: normalizers must not turn omitted arrays into proven absence.
    const collection =
      kind === "ga4-config"
        ? payload[rule.collection]
        : payload.version[rule.collection];
    if (!Array.isArray(collection))
      return { status: "unknown", reason: "missing-collection" };
    const matches = collection.filter((entry) =>
      kind === "gtm-version"
        ? entry[`${rule.collection}Id`] === expectation.subject
        : entry[rule.collection === "dataStreams" ? "name" : "eventName"] ===
          expectation.subject,
    );
    if (matches.length > 1)
      return { status: "unknown", reason: "ambiguous-subject" };
    if (!matches.length)
      return payload.collections?.[rule.collection]?.complete === true
        ? { status: "fail", reason: "required-object-absent" }
        : { status: "unknown", reason: "incomplete-collection" };
    if (
      rule.collection === "keyEvents" &&
      payload.collections?.keyEvents?.complete !== true
    )
      return { status: "unknown", reason: "incomplete-collection" };
    item = matches[0];
  }
  if (rule.type === "present")
    return { status: "pass", reason: "required-object-present" };
  if (
    expectation.rule === "ga4-web-measurement-id" &&
    item.type !== "WEB_DATA_STREAM"
  )
    return { status: "fail", reason: "stream-type-mismatch" };
  const actual =
    expectation.rule === "ga4-web-measurement-id"
      ? item.webStreamData?.measurementId
      : item[rule.field];
  if (
    actual === undefined ||
    (rule.type === "counting" && actual === "COUNTING_METHOD_UNSPECIFIED")
  )
    return { status: "unknown", reason: "missing-config-field" };
  assert(
    validValue(rule.type, actual),
    "Malformed observed configuration field",
  );
  const matches =
    rule.type === "ids"
      ? stableJson([...actual].sort()) ===
        stableJson([...expectation.expected].sort())
      : rule.type === "text"
        ? new Intl.DateTimeFormat("en", { timeZone: actual }).resolvedOptions()
            .timeZone ===
          new Intl.DateTimeFormat("en", {
            timeZone: expectation.expected,
          }).resolvedOptions().timeZone
        : actual === expectation.expected;
  return {
    status: matches ? "pass" : "fail",
    reason: matches ? "configured-value-matches" : "configured-value-mismatch",
  };
}

/** Pure, supplied-configuration comparison. Caller supplies an owner-confirmed contract separately from target content. */
export function evaluateMeasurementConfiguration(args) {
  boundedJson(args);
  exact(args, ["kind", "input", "context", "contract"], "assessment");
  const { kind, input, context, contract } = args;
  exact(input, ["customerId", "entityId", "payload"], "source input");
  exact(
    context,
    ["run", "entityId", "resource", "versionId", "windowId", "maxAgeSeconds"],
    "assessment context",
  );
  assert(
    ["ga4-config", "gtm-version"].includes(kind),
    "Unsupported configuration kind",
  );
  assert(
    kind !== "ga4-config" || context.versionId === null,
    "GA4 configuration has no GTM version",
  );
  // Always re-normalize source input; a caller-provided normalized success is not evidence.
  const snapshot = normalizeProviderSnapshot(kind, input, context);
  validateCollections(input.payload, kind);
  if (contract !== null) validateContract(contract, kind, context);
  const contractDigest = contract === null ? null : enterpriseDigest(contract);
  const current = snapshot.usableForCurrentAssessment;
  const expiredContract =
    contract !== null &&
    Date.parse(contract.validUntil) <= Date.parse(context.run.assessmentAt);
  const checks =
    contract === null
      ? [
          {
            expectationId: null,
            ruleId: "measurement-contract-required",
            ruleVersion: "1",
            status: "unknown",
            reason: "missing-measurement-contract",
          },
        ]
      : contract.expectations.map((expectation) => ({
          expectationId: expectation.id,
          ruleId: expectation.rule,
          ruleVersion: "1",
          ...(expiredContract
            ? { status: "unknown", reason: "expired-measurement-contract" }
            : !current
              ? { status: "unknown", reason: "ineligible-snapshot" }
              : inspectExpectation(
                  expectation,
                  snapshot.normalized,
                  input.payload,
                  kind,
                )),
        }));
  const dataRequests = checks
    .filter((c) => c.status === "unknown")
    .map((check) => ({
      expectationId: check.expectationId,
      ruleId: check.ruleId,
      customerId: context.run.customerId,
      entityId: context.entityId,
      resource: context.resource,
      versionId: kind === "gtm-version" ? context.versionId : null,
      ownerRole: contract?.ownerRole ?? "measurement-owner",
      reason: check.reason,
      instructions:
        check.reason === "missing-measurement-contract" ||
        check.reason === "expired-measurement-contract"
          ? "Provide or renew the owner-confirmed configuration expectations for this exact resource; do not infer business outcomes from event names."
          : "Provide a fresh, unambiguous configuration export for this resource/version, preserving required fields and collection pagination/completeness metadata.",
      acceptedFormats: [
        "owner-confirmed contract JSON",
        "provider configuration export JSON",
      ],
      fallback:
        "Retain this check as unknown and continue independent checks; do not interpret missing data as a website defect.",
    }));
  const result = {
    schemaFamily: "enterprise-measurement-assessment",
    schemaVersion: 1,
    kind,
    customerId: context.run.customerId,
    runId: context.run.runId,
    entityId: context.entityId,
    assessmentAt: context.run.assessmentAt,
    contractDigest,
    sourceDigest: snapshot.evidence.content.sourceDigest,
    evidenceDigest: snapshot.evidence.digest,
    evidenceId: snapshot.evidence.evidenceId,
    checks,
    dataRequests,
    providerGaps: snapshot.gaps,
    synthetic: snapshot.synthetic,
    providerAuthenticated: false,
    contractAuthenticated: false,
    runtimeVerified: false,
    publicationVerified: false,
    businessOutcomeVerified: false,
    assessmentAccepted: false,
    limitations: [
      "Only declared configuration expectations are assessed; this is not a full measurement audit.",
      "Completeness and owner confirmation are supplied assertions, not independently authenticated provider or owner state.",
      "No template/variable expression execution, automatic dependency graph assessment, deployment, consent or terminal business-outcome verification.",
      "Checks require independent review and immutable report integration before customer acceptance.",
    ],
  };
  return { ...result, digest: enterpriseDigest(result) };
}
