import { Buffer } from "node:buffer";
import { boundedJson, evaluateMeasurementConfiguration } from "./config.mjs";
import { validateBusinessObservationContract } from "../business-observations.mjs";
import { enterpriseDigest, timestampValue } from "../enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const label = (v) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 256;
const counting = (v) => ["ONCE_PER_EVENT", "ONCE_PER_SESSION"].includes(v);
function exact(value, keys, name) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${name} fields`,
  );
}
function unique(values, name) {
  assert(
    Array.isArray(values) &&
      values.length > 0 &&
      values.length <= 100 &&
      values.every(label) &&
      new Set(values).size === values.length,
    `Invalid ${name}`,
  );
}
function validateContract(contract, context) {
  exact(
    contract,
    [
      "schemaVersion",
      "contractId",
      "customerId",
      "entityId",
      "resource",
      "ownerRole",
      "confirmedAt",
      "validUntil",
      "businessWindow",
      "dictionary",
      "requirements",
    ],
    "business contract",
  );
  assert(
    contract.schemaVersion === 1 &&
      label(contract.contractId) &&
      label(contract.ownerRole),
    "Invalid business contract identity",
  );
  assert(
    contract.customerId === context.run.customerId &&
      contract.entityId === context.entityId &&
      contract.resource === context.resource,
    "Foreign business contract scope",
  );
  assert(
    timestampValue(contract.confirmedAt) &&
      timestampValue(contract.validUntil) &&
      Date.parse(contract.confirmedAt) <=
        Date.parse(context.run.assessmentAt) &&
      Date.parse(contract.confirmedAt) < Date.parse(contract.validUntil),
    "Invalid business contract validity",
  );
  exact(contract.businessWindow, ["from", "to"], "business window");
  exact(
    contract.dictionary,
    ["version", "sourceSystem", "outcomes"],
    "business dictionary",
  );
  assert(
    label(contract.dictionary.version) &&
      label(contract.dictionary.sourceSystem) &&
      Array.isArray(contract.dictionary.outcomes) &&
      contract.dictionary.outcomes.length <= 100,
    "Invalid dictionary identity/count",
  );
  for (const outcome of contract.dictionary.outcomes) {
    exact(
      outcome,
      ["outcomeId", "businessModel", "allowedStatuses", "successStatuses"],
      "business outcome",
    );
    assert(label(outcome.outcomeId), "Invalid outcome identity");
    unique(outcome.allowedStatuses, "allowed statuses");
    assert(
      Array.isArray(outcome.successStatuses) &&
        outcome.successStatuses.length <= 100 &&
        new Set(outcome.successStatuses).size ===
          outcome.successStatuses.length,
      "Invalid success statuses",
    );
  }
  const outcomes = validateBusinessObservationContract(contract.dictionary, {
    customerId: context.run.customerId,
    entityId: context.entityId,
    sourceSystem: contract.dictionary.sourceSystem,
    assessmentAt: context.run.assessmentAt,
    window: contract.businessWindow,
  });
  assert(
    Array.isArray(contract.requirements) &&
      contract.requirements.length > 0 &&
      contract.requirements.length <= 100,
    "Invalid mapping requirements",
  );
  const seen = new Set();
  for (const req of contract.requirements) {
    exact(
      req,
      [
        "requirementId",
        "outcomeId",
        "meaning",
        "expectedKeyEvent",
        "countingMethod",
      ],
      "mapping requirement",
    );
    assert(
      label(req.requirementId) &&
        !seen.has(req.requirementId) &&
        outcomes.has(req.outcomeId),
      "Invalid/duplicate requirement or unknown outcome",
    );
    seen.add(req.requirementId);
    assert(
      ["milestone", "success"].includes(req.meaning) &&
        typeof req.expectedKeyEvent === "boolean" &&
        (req.expectedKeyEvent
          ? counting(req.countingMethod)
          : req.countingMethod === null),
      "Invalid mapping requirement semantics",
    );
    assert(
      Object.hasOwn(
        context.run.profileVersions,
        outcomes.get(req.outcomeId).businessModel,
      ),
      "Business profile outside run scope",
    );
    assert(
      req.meaning !== "success" ||
        outcomes.get(req.outcomeId).successStatuses.length > 0,
      "Success definition required",
    );
  }
  return outcomes;
}
function validateSource(source, contract, context) {
  if (source === null) return;
  assert(contract !== null, "Mapping source requires bound business contract");
  exact(
    source,
    [
      "sourceId",
      "customerId",
      "entityId",
      "resource",
      "contractDigest",
      "capturedAt",
      "synthetic",
      "complete",
      "mappings",
    ],
    "mapping source",
  );
  assert(
    label(source.sourceId) &&
      source.customerId === context.run.customerId &&
      source.entityId === context.entityId &&
      source.resource === context.resource &&
      source.contractDigest === enterpriseDigest(contract),
    "Foreign mapping source/binding",
  );
  assert(
    timestampValue(source.capturedAt) &&
      Date.parse(source.capturedAt) <= Date.parse(context.run.assessmentAt) &&
      typeof source.synthetic === "boolean" &&
      typeof source.complete === "boolean" &&
      Array.isArray(source.mappings) &&
      source.mappings.length <= 100,
    "Invalid mapping source metadata",
  );
  const ids = new Set();
  for (const mapping of source.mappings) {
    exact(
      mapping,
      [
        "mappingId",
        "requirementId",
        "outcomeId",
        "eventName",
        "representedStatuses",
        "meaning",
      ],
      "business mapping",
    );
    assert(
      label(mapping.mappingId) &&
        !ids.has(mapping.mappingId) &&
        contract.requirements.some(
          (r) => r.requirementId === mapping.requirementId,
        ),
      "Invalid mapping identity/requirement",
    );
    ids.add(mapping.mappingId);
    assert(
      label(mapping.outcomeId) &&
        label(mapping.eventName) &&
        ["milestone", "success"].includes(mapping.meaning),
      "Invalid mapping semantics",
    );
    unique(mapping.representedStatuses, "represented statuses");
  }
}
const outcome = (status, reason) => ({ status, reason });
/** Supplied application-event mapping consistency, not proof that the application implements or emits it. */
export function evaluateBusinessMapping(args) {
  boundedJson(args);
  exact(
    args,
    ["input", "context", "contract", "mappingSource"],
    "business mapping assessment",
  );
  const { input, context, contract, mappingSource: source } = args;
  assert(
    label(context?.resource) &&
      label(context?.entityId) &&
      label(context?.run?.customerId) &&
      label(context?.run?.runId),
    "Expected bounded mapping scope",
  );
  const config = evaluateMeasurementConfiguration({
    kind: "ga4-config",
    input,
    context,
    contract: null,
  });
  const outcomes =
    contract === null ? null : validateContract(contract, context);
  validateSource(source, contract, context);
  const contractDigest = contract === null ? null : enterpriseDigest(contract),
    checks = [];
  const assessment = Date.parse(context.run.assessmentAt);
  const mappingCurrent =
    source !== null &&
    Date.parse(source.capturedAt) + context.maxAgeSeconds * 1000 > assessment;
  const configCurrent = !config.providerGaps.some(
    (g) => g.code === "stale-snapshot",
  );
  function emit(req, ruleId, result) {
    checks.push({
      checkId: enterpriseDigest([
        context.run.customerId,
        context.entityId,
        context.resource,
        context.windowId,
        contract?.contractId ?? null,
        req?.requirementId ?? null,
        ruleId,
      ]),
      requirementId: req?.requirementId ?? null,
      ruleId,
      ruleVersion: "1",
      ...result,
    });
  }
  if (contract === null)
    emit(
      null,
      "business-contract-required",
      outcome("unknown", "missing-business-contract"),
    );
  else
    for (const req of contract.requirements) {
      const matching =
        source?.mappings.filter((m) => m.requirementId === req.requirementId) ??
        [];
      let unresolved = null;
      if (Date.parse(contract.validUntil) <= assessment)
        unresolved = "expired-business-contract";
      else if (source === null) unresolved = "missing-mapping-source";
      else if (!mappingCurrent) unresolved = "stale-mapping-source";
      else if (matching.length > 1) unresolved = "ambiguous-mapping";
      else if (!source.complete) unresolved = "incomplete-mapping-source";
      const mapping = matching[0];
      if (
        !unresolved &&
        mapping &&
        source.mappings.some(
          (m) =>
            m.requirementId !== req.requirementId &&
            m.eventName === mapping.eventName,
        )
      )
        unresolved = "event-name-reused-needs-discriminator";
      if (unresolved) {
        emit(req, "business-event-semantics", outcome("unknown", unresolved));
        emit(req, "business-key-event-config", outcome("unknown", unresolved));
        continue;
      }
      if (!mapping) {
        emit(
          req,
          "business-event-semantics",
          outcome("fail", "required-mapping-absent"),
        );
        emit(
          req,
          "business-key-event-config",
          outcome("unknown", "missing-mapping-source"),
        );
        continue;
      }
      const definition = outcomes.get(req.outcomeId);
      let semantic = outcome("pass", "declared-mapping-consistent");
      if (mapping.outcomeId !== req.outcomeId)
        semantic = outcome("fail", "mapped-outcome-mismatch");
      else if (mapping.meaning !== req.meaning)
        semantic = outcome("fail", "mapped-meaning-mismatch");
      else if (
        mapping.representedStatuses.some(
          (s) => !definition.allowedStatuses.includes(s),
        )
      )
        semantic = outcome("fail", "status-outside-business-dictionary");
      else if (
        req.meaning === "success" &&
        mapping.representedStatuses.some(
          (s) => !definition.successStatuses.includes(s),
        )
      )
        semantic = outcome("fail", "non-success-status-mapped-as-success");
      emit(req, "business-event-semantics", semantic);
      const events = input.payload.keyEvents,
        receipt = input.payload.collections?.keyEvents;
      let configured;
      if (!configCurrent)
        configured = outcome("unknown", "stale-ga4-configuration");
      else if (!Array.isArray(events) || receipt?.complete !== true)
        configured = outcome("unknown", "incomplete-key-event-collection");
      else {
        const matches = events.filter((e) => e.eventName === mapping.eventName);
        if (matches.length > 1)
          configured = outcome("unknown", "ambiguous-key-event");
        else if (!matches.length)
          configured = req.expectedKeyEvent
            ? outcome("fail", "required-key-event-absent")
            : outcome("pass", "key-event-absent-as-required");
        else if (!req.expectedKeyEvent)
          configured = outcome("fail", "unexpected-key-event-definition");
        else if (
          matches[0].countingMethod === undefined ||
          matches[0].countingMethod === "COUNTING_METHOD_UNSPECIFIED"
        )
          configured = outcome("unknown", "missing-counting-method");
        else {
          assert(
            counting(matches[0].countingMethod),
            "Malformed counting method",
          );
          configured =
            matches[0].countingMethod === req.countingMethod
              ? outcome("pass", "key-event-configured-as-required")
              : outcome("fail", "key-event-counting-mismatch");
        }
      }
      emit(req, "business-key-event-config", configured);
    }
  const groups = new Map();
  for (const check of checks.filter((c) => c.status === "unknown")) {
    const artifact = [
      "missing-business-contract",
      "expired-business-contract",
    ].includes(check.reason)
      ? "owner-business-contract"
      : [
            "stale-ga4-configuration",
            "incomplete-key-event-collection",
            "ambiguous-key-event",
            "missing-counting-method",
          ].includes(check.reason)
        ? "ga4-key-event-configuration"
        : "application-business-event-map";
    if (!groups.has(artifact))
      groups.set(artifact, {
        neededArtifact: artifact,
        checkIds: [],
        reasons: new Set(),
      });
    const group = groups.get(artifact);
    group.checkIds.push(check.checkId);
    group.reasons.add(check.reason);
  }
  const dataRequests = [...groups.values()].map((g) => ({
    requestId: enterpriseDigest([
      context.run.customerId,
      context.entityId,
      context.resource,
      contractDigest,
      g.neededArtifact,
    ]),
    neededArtifact: g.neededArtifact,
    checkIds: g.checkIds,
    reasons: [...g.reasons].sort(),
    customerId: context.run.customerId,
    entityId: context.entityId,
    resource: context.resource,
    ownerRole: contract?.ownerRole ?? "business-measurement-owner",
    acceptedFormats: [
      g.neededArtifact === "owner-business-contract"
        ? "Owner-confirmed business dictionary and measurement requirements JSON"
        : g.neededArtifact === "ga4-key-event-configuration"
          ? "GA4 property-scoped key-event export with complete pagination metadata"
          : "Versioned application event mapping with source provenance and business statuses; conditional mappings require independent interpretation",
    ],
    instructions:
      "Supply the requested artifact for this customer/property and contract. Preserve failed, partial and stale evidence; never send credentials or personal transaction records.",
    fallback:
      "Keep affected checks unknown, continue unrelated audit modules and re-evaluate after receiving valid evidence.",
  }));
  const result = {
    schemaFamily: "enterprise-business-mapping",
    schemaVersion: 1,
    customerId: context.run.customerId,
    runId: config.runId,
    entityId: context.entityId,
    assessmentAt: context.run.assessmentAt,
    contractDigest,
    mappingSourceDigest: source === null ? null : enterpriseDigest(source),
    sourceDigest: config.sourceDigest,
    evidenceId: config.evidenceId,
    evidenceDigest: config.evidenceDigest,
    synthetic: config.synthetic || source?.synthetic === true,
    checks,
    dataRequests,
    mappingAuthenticated: false,
    contractAuthenticated: false,
    providerAuthenticated: false,
    runtimeVerified: false,
    businessOutcomeVerified: false,
    assessmentAccepted: false,
    limitations: [
      "Declared mapping consistency and key-event configuration only; neither proves application implementation, event delivery or terminal business outcomes.",
      "Business dictionary quality and supplied mapping provenance require independent owner/domain review; JSON confirmation fields do not authenticate either.",
      "Shared event names need a verified conditional/discriminator contract; they remain unknown here.",
      "No revenue reconciliation, currency aggregation, attribution or causal uplift is inferred. Customer report integration remains required.",
    ],
  };
  assert(
    Buffer.byteLength(JSON.stringify({ ...result, digest: "0".repeat(64) })) <=
      2 * 1024 * 1024,
    "Mapping output budget exceeded",
  );
  return { ...result, digest: enterpriseDigest(result) };
}
