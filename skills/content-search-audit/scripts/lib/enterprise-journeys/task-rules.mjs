// Internal predicates only. The caller must establish source bytes, scope,
// freshness, task correlation and attribution before calling this module.
// Imported facts never authorize actions or authenticate business outcomes.
import { enterpriseDigest } from "../enterprise-state.mjs";

const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const shape = (value, fields) =>
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === fields.length &&
      fields.every((k) => Object.hasOwn(value, k)),
    "Invalid task predicate shape",
  );
const conditions = ["valid-input", "invalid-input", "unavailable"];
const uiOutcomes = [
  "success-feedback",
  "error-feedback",
  "unavailable-feedback",
  "no-feedback",
];
// Aligned with business-observations.mjs; pending/attempt are never terminal.
const terminal = [
  "accepted",
  "rejected",
  "settled",
  "refunded",
  "cancelled",
  "active",
  "expired",
  "completed",
];
const member = (value, values) =>
  assert(values.includes(value), "Invalid task fact value");
const result = (status, reason) => ({ status, reason });

export function evaluateJourneyTask(definition, facts) {
  shape(definition, [
    "taskId",
    "condition",
    "expectedUi",
    "expectedBusinessStatuses",
    "businessRequired",
    "environment",
  ]);
  assert(
    typeof definition.taskId === "string" &&
      /^[a-zA-Z0-9._:-]{1,128}$/.test(definition.taskId),
    "Invalid task ID",
  );
  member(definition.condition, conditions);
  member(
    definition.expectedUi,
    uiOutcomes.filter((v) => v !== "no-feedback"),
  );
  member(definition.businessRequired, [true, false]);
  member(definition.environment, ["sandbox", "production"]);
  const expected = definition.expectedBusinessStatuses;
  assert(
    Array.isArray(expected) &&
      expected.length <= terminal.length &&
      expected.every((v) => terminal.includes(v)) &&
      new Set(expected).size === expected.length &&
      (definition.businessRequired
        ? expected.length > 0
        : expected.length === 0),
    "Invalid expected business outcomes",
  );
  shape(facts, [
    "condition",
    "conditionsReviewed",
    "actionAttempted",
    "uiOutcome",
    "uiEvidenceReviewed",
    "businessStatus",
    "businessEvidenceReviewed",
    "correlationVerified",
    "outcomeEnvironment",
    "outcomeMature",
  ]);
  member(facts.condition, [...conditions, null]);
  member(facts.uiOutcome, [...uiOutcomes, null]);
  member(facts.businessStatus, [...terminal, "pending", "attempt", null]);
  member(facts.outcomeEnvironment, ["sandbox", "production", null]);
  for (const key of [
    "conditionsReviewed",
    "actionAttempted",
    "uiEvidenceReviewed",
    "businessEvidenceReviewed",
    "correlationVerified",
    "outcomeMature",
  ])
    member(facts[key], [true, false, null]);

  const ready =
    facts.condition === definition.condition &&
    facts.conditionsReviewed === true &&
    facts.actionAttempted === true;
  let ui = result("unknown", "task-conditions-or-attempt-unproven");
  let business = definition.businessRequired
    ? result("unknown", "task-conditions-or-attempt-unproven")
    : result("not-assessed", "declared-ui-only-task");
  if (ready) {
    ui =
      facts.uiEvidenceReviewed !== true || facts.uiOutcome === null
        ? result("unknown", "ui-observation-unproven")
        : facts.uiOutcome === definition.expectedUi
          ? result("pass", "declared-ui-response-matched")
          : result("fail", "declared-ui-response-mismatched");
    if (definition.businessRequired) {
      if (
        facts.businessEvidenceReviewed !== true ||
        facts.correlationVerified !== true ||
        facts.outcomeEnvironment !== definition.environment
      )
        business = result("unknown", "correlated-business-evidence-unproven");
      else if (
        facts.outcomeMature !== true ||
        !terminal.includes(facts.businessStatus)
      )
        business = result("unknown", "terminal-business-outcome-unproven");
      else
        business = expected.includes(facts.businessStatus)
          ? result("pass", "declared-business-outcome-matched")
          : result("fail", "declared-business-outcome-mismatched");
    }
  }
  return {
    schemaVersion: 1,
    namespace: "attributed-task-predicate",
    taskId: definition.taskId,
    definition: globalThis.structuredClone(definition),
    definitionDigest: enterpriseDigest(definition),
    factsDigest: enterpriseDigest(facts),
    ui,
    business,
    uxQualityAssessment: "not-assessed",
    semanticAcceptance: false,
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
    limitations: [
      "Only the declared task and supplied facts are evaluated; source validation is the caller's responsibility.",
      "UI feedback is not backend acceptance, settlement or a verified business outcome.",
      "A mismatched business outcome is not proof of a UX defect; rejection can be legitimate.",
      "A matched rejection may satisfy an invalid-input task; it does not establish successful conversion.",
      "No automatic UX-quality, accessibility-conformance, prevalence or causal conclusion follows from these predicates.",
    ],
  };
}
