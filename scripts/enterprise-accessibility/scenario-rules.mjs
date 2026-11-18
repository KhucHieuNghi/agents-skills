// Pure internal predicates. Callers must validate attribution, attachments and freshness.
// This module does not accept evidence envelopes or grant semantic acceptance.
const bool = [true, false];
const registry = {
  "keyboard-exit": {
    criterion: "2.1.2",
    fields: {
      enteredByKeyboard: bool,
      exitOutcome: ["exited", "contained", "untested"],
      exitMethod: [
        "standard",
        "documented-alternative",
        "undocumented-alternative",
        "none",
      ],
      exitPathsReviewed: bool,
      usableStandardExitVerified: bool,
    },
  },
  "keyboard-operation": {
    criterion: "2.1.1",
    fields: {
      operationOutcome: ["achieved", "blocked", "untested"],
      keyboardEquivalentReviewed: bool,
      functionAvailableByOtherInput: bool,
      pathDependentException: ["applies", "does-not-apply", "unresolved"],
    },
  },
  "focus-visible": {
    criterion: "2.4.7",
    fields: {
      keyboardFocused: bool,
      indicatorVisible: bool,
      indicatorReviewed: bool,
    },
  },
  "focus-not-obscured": {
    criterion: "2.4.11",
    fields: {
      keyboardFocused: bool,
      authorContentEntirelyHides: bool,
      revealWithoutMovingFocus: ["possible", "impossible", "unreviewed"],
      userOpenedPersistentContent: bool,
      initialPositionReviewed: bool,
    },
  },
  "error-identification": {
    criterion: "3.3.1",
    fields: {
      automaticInputErrorDetected: bool,
      affectedItemIdentified: bool,
      errorDescribedInText: bool,
    },
  },
  "focus-order": {
    criterion: "2.4.3",
    fields: {
      sequentialNavigation: bool,
      orderAffectsMeaningOrOperation: bool,
      preservesMeaningAndOperation: bool,
      sequenceReviewed: bool,
    },
  },
  "dialog-name": {
    criterion: "4.1.2",
    fields: {
      dialogExposed: bool,
      accessibleNamePresent: bool,
      nameSourceReviewed: bool,
    },
  },
  reflow: {
    criterion: "1.4.10",
    fields: {
      contentDirection: ["vertical", "horizontal"],
      requiredCssExtent: "number",
      twoDimensionalScrollRequired: bool,
      informationOrFunctionLost: bool,
      twoDimensionalException: ["applies", "does-not-apply", "unresolved"],
      extentVerified: bool,
    },
  },
  "error-recovery": {
    criterion: null,
    fields: {
      priorErrorObserved: bool,
      correctedInputAttempted: bool,
      recoveryOutcome: ["completed", "failed", "unobserved"],
    },
  },
  "journey-outcome": {
    criterion: null,
    fields: {
      actionAttempted: bool,
      terminalOutcome: ["confirmed", "rejected", "pending", "unobserved"],
      outcomeScope: ["sandbox", "production"],
      outcomeEvidenceReviewed: bool,
    },
  },
};
const assert = (x, m) => {
  if (!x) throw Error(m);
};
const object = (x) =>
  x !== null &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));
export function scenarioRuleDefinition(ruleId) {
  assert(Object.hasOwn(registry, ruleId), "Unknown scenario rule");
  return globalThis.structuredClone({
    ruleId,
    version: 1,
    ...registry[ruleId],
  });
}
export function evaluateScenarioRule(ruleId, facts, context) {
  const rule = scenarioRuleDefinition(ruleId);
  assert(object(facts), "Invalid scenario facts");
  for (const [key, value] of Object.entries(facts)) {
    assert(Object.hasOwn(rule.fields, key), "Unexpected fact");
    if (value === null) continue;
    const type = rule.fields[key];
    assert(
      type === "number"
        ? Number.isFinite(value) && value > 0 && value <= 100000
        : type.includes(value),
      "Invalid fact value",
    );
  }
  assert(
    object(context) &&
      Object.keys(context).length === 3 &&
      ["keyboard", "pointer", "programmatic", "mixed"].includes(
        context.inputMode,
      ) &&
      object(context.viewport) &&
      Object.keys(context.viewport).length === 2 &&
      ["width", "height"].every(
        (k) =>
          Number.isInteger(context.viewport[k]) &&
          context.viewport[k] > 0 &&
          context.viewport[k] <= 100000,
      ) &&
      [null, "sandbox", "production"].includes(context.expectedOutcomeScope),
    "Invalid predicate context",
  );
  const used = new Set();
  const get = (k) => {
    used.add(k);
    return Object.hasOwn(facts, k) ? facts[k] : null;
  };
  const result = (status, reason) => ({
    ruleId,
    ruleVersion: 1,
    criterion: rule.criterion,
    namespace: rule.criterion
      ? "attributed-accessibility-scenario"
      : "attributed-journey-diagnostic",
    status,
    reason,
    usedFacts: [...used].sort(),
    coverage: "declared-step-only",
    semanticAcceptance: false,
  });
  const unknown = () => result("unknown", "insufficient-or-inapplicable-facts");
  const verdict = (v) =>
    v === true
      ? result("pass", "supplied-predicate-satisfied")
      : v === false
        ? result("fail", "supplied-predicate-not-satisfied")
        : unknown();
  if (ruleId === "keyboard-exit") {
    const outcome = facts.exitOutcome,
      method = facts.exitMethod;
    assert(
      !(outcome === "exited" && method === "none") &&
        !(outcome === "contained" && method != null && method !== "none") &&
        !(
          outcome === "exited" &&
          method === "standard" &&
          facts.usableStandardExitVerified === false
        ) &&
        !(
          outcome === "contained" &&
          method === "none" &&
          facts.exitPathsReviewed === true &&
          facts.usableStandardExitVerified === true
        ),
      "Contradictory exit facts",
    );
  }
  if (
    [
      "keyboard-exit",
      "keyboard-operation",
      "focus-visible",
      "focus-not-obscured",
      "focus-order",
    ].includes(ruleId) &&
    context.inputMode !== "keyboard"
  )
    return result("unknown", "keyboard-evidence-required");
  if (ruleId === "keyboard-exit") {
    if (get("enteredByKeyboard") !== true) return unknown();
    const exit = get("exitOutcome");
    if (exit === "exited") {
      const m = get("exitMethod");
      if (m === "standard" || m === "documented-alternative")
        return verdict(true);
      if (m === "undocumented-alternative") {
        const standard = get("usableStandardExitVerified");
        if (standard === true) return verdict(true);
        if (standard === false && get("exitPathsReviewed") === true)
          return verdict(false);
      }
    }
    if (
      exit === "contained" &&
      get("exitMethod") === "none" &&
      get("exitPathsReviewed") === true &&
      get("usableStandardExitVerified") === false
    )
      return verdict(false);
    return unknown();
  }
  if (ruleId === "keyboard-operation") {
    const o = get("operationOutcome");
    if (o === "achieved") return verdict(true);
    if (
      o === "blocked" &&
      get("keyboardEquivalentReviewed") === true &&
      get("functionAvailableByOtherInput") === true &&
      get("pathDependentException") === "does-not-apply"
    )
      return verdict(false);
    return unknown();
  }
  if (ruleId === "focus-visible") {
    if (get("keyboardFocused") === true && get("indicatorReviewed") === true)
      return verdict(get("indicatorVisible"));
    return unknown();
  }
  if (ruleId === "focus-not-obscured") {
    if (
      get("keyboardFocused") !== true ||
      get("initialPositionReviewed") !== true
    )
      return unknown();
    const hidden = get("authorContentEntirelyHides");
    if (hidden === false) return verdict(true);
    if (hidden === true) {
      const opened = get("userOpenedPersistentContent");
      if (opened === false) return verdict(false);
      if (opened === true) {
        const reveal = get("revealWithoutMovingFocus");
        if (reveal === "possible") return verdict(true);
        if (reveal === "impossible") return verdict(false);
      }
    }
    return unknown();
  }
  if (ruleId === "error-identification") {
    if (get("automaticInputErrorDetected") !== true) return unknown();
    // Choose a sufficient negative fact without depending on an unrelated missing fact.
    for (const key of ["affectedItemIdentified", "errorDescribedInText"])
      if (facts[key] === false) {
        get(key);
        return verdict(false);
      }
    return get("affectedItemIdentified") === true &&
      get("errorDescribedInText") === true
      ? verdict(true)
      : unknown();
  }
  if (ruleId === "focus-order") {
    if (
      get("sequentialNavigation") === true &&
      get("orderAffectsMeaningOrOperation") === true &&
      get("sequenceReviewed") === true
    )
      return verdict(get("preservesMeaningAndOperation"));
    return unknown();
  }
  if (ruleId === "dialog-name") {
    if (get("dialogExposed") === true && get("nameSourceReviewed") === true)
      return verdict(get("accessibleNamePresent"));
    return unknown();
  }
  if (ruleId === "reflow") {
    const direction = get("contentDirection"),
      extent = get("requiredCssExtent");
    if (
      !(
        (direction === "vertical" &&
          extent === 320 &&
          context.viewport.width === 320) ||
        (direction === "horizontal" &&
          extent === 256 &&
          context.viewport.height === 256)
      ) ||
      get("extentVerified") !== true
    )
      return unknown();
    const loss = get("informationOrFunctionLost");
    if (loss === true) return verdict(false);
    if (loss !== false) return unknown();
    const scroll = get("twoDimensionalScrollRequired");
    if (scroll === false) return verdict(true);
    if (scroll === true && get("twoDimensionalException") === "does-not-apply")
      return verdict(false);
    return unknown();
  }
  if (ruleId === "error-recovery") {
    assert(
      !(
        facts.priorErrorObserved === false &&
        ["completed", "failed"].includes(facts.recoveryOutcome)
      ),
      "Contradictory recovery facts",
    );
    if (
      get("priorErrorObserved") !== true ||
      get("correctedInputAttempted") !== true
    )
      return unknown();
    const o = get("recoveryOutcome");
    return o === "completed"
      ? verdict(true)
      : o === "failed"
        ? verdict(false)
        : unknown();
  }
  if (
    context.expectedOutcomeScope === null ||
    get("outcomeScope") !== context.expectedOutcomeScope
  )
    return result("unknown", "outcome-scope-unproven");
  if (
    get("actionAttempted") !== true ||
    get("outcomeEvidenceReviewed") !== true
  )
    return unknown();
  const o = get("terminalOutcome");
  return o === "confirmed"
    ? verdict(true)
    : o === "rejected"
      ? verdict(false)
      : unknown();
}
