import { expect, it } from "vitest";
import { evaluateScenarioRule } from "../scripts/enterprise-accessibility/scenario-rules.mjs";
const context = {
  inputMode: "keyboard",
  viewport: { width: 320, height: 844 },
  expectedOutcomeScope: null,
};
const assess = (id, facts, extra = {}) =>
  evaluateScenarioRule(id, facts, { ...context, ...extra });
it("does not call an escapable modal a trap", () => {
  expect(
    assess("keyboard-exit", {
      enteredByKeyboard: true,
      exitOutcome: "exited",
      exitMethod: "standard",
    }).status,
  ).toBe("pass");
  expect(
    assess("keyboard-exit", {
      enteredByKeyboard: true,
      exitOutcome: "contained",
      exitMethod: "none",
    }).status,
  ).toBe("unknown");
  expect(
    assess("keyboard-exit", {
      enteredByKeyboard: true,
      exitOutcome: "contained",
      exitMethod: "none",
      exitPathsReviewed: true,
      usableStandardExitVerified: false,
    }).status,
  ).toBe("fail");
});
it("an undocumented shortcut is not failure when a usable standard exit exists", () => {
  const f = {
    enteredByKeyboard: true,
    exitOutcome: "exited",
    exitMethod: "undocumented-alternative",
    exitPathsReviewed: true,
    usableStandardExitVerified: true,
  };
  expect(assess("keyboard-exit", f).status).toBe("pass");
  expect(
    assess("keyboard-exit", { ...f, usableStandardExitVerified: false }).status,
  ).toBe("fail");
  expect(
    assess("keyboard-exit", { ...f, usableStandardExitVerified: null }).status,
  ).toBe("unknown");
});
it("distinguishes user-opened reveal exception from automatic obscuration", () => {
  const f = {
    keyboardFocused: true,
    initialPositionReviewed: true,
    authorContentEntirelyHides: true,
    revealWithoutMovingFocus: "possible",
    userOpenedPersistentContent: false,
  };
  expect(assess("focus-not-obscured", f).status).toBe("fail");
  expect(
    assess("focus-not-obscured", { ...f, userOpenedPersistentContent: true })
      .status,
  ).toBe("pass");
  expect(
    assess("focus-not-obscured", { ...f, userOpenedPersistentContent: null })
      .status,
  ).toBe("unknown");
  expect(
    assess("focus-not-obscured", {
      keyboardFocused: true,
      initialPositionReviewed: true,
      authorContentEntirelyHides: false,
    }).status,
  ).toBe("pass");
});
it("backend failure alone is not keyboard failure", () => {
  const f = {
    operationOutcome: "blocked",
    keyboardEquivalentReviewed: true,
    pathDependentException: "does-not-apply",
    functionAvailableByOtherInput: false,
  };
  expect(assess("keyboard-operation", f).status).toBe("unknown");
  expect(
    assess("keyboard-operation", { ...f, functionAvailableByOtherInput: true })
      .status,
  ).toBe("fail");
  expect(
    assess(
      "keyboard-operation",
      { operationOutcome: "achieved" },
      { inputMode: "pointer" },
    ).status,
  ).toBe("unknown");
});
it("keeps error identification separate from successful recovery", () => {
  expect(
    assess("error-identification", {
      automaticInputErrorDetected: true,
      affectedItemIdentified: true,
      errorDescribedInText: true,
    }).status,
  ).toBe("pass");
  const r = assess("error-identification", {
    automaticInputErrorDetected: true,
    errorDescribedInText: false,
  });
  expect(r.status).toBe("fail");
  expect(r.usedFacts).toEqual([
    "automaticInputErrorDetected",
    "errorDescribedInText",
  ]);
  expect(
    assess("error-recovery", {
      priorErrorObserved: true,
      correctedInputAttempted: true,
      recoveryOutcome: "failed",
    }).status,
  ).toBe("fail");
});
it("does not accept sandbox outcomes for production obligations", () => {
  const f = {
    actionAttempted: true,
    terminalOutcome: "confirmed",
    outcomeScope: "sandbox",
    outcomeEvidenceReviewed: true,
  };
  expect(
    assess("journey-outcome", f, { expectedOutcomeScope: "production" }).status,
  ).toBe("unknown");
  expect(
    assess("journey-outcome", f, { expectedOutcomeScope: "sandbox" }).status,
  ).toBe("pass");
  expect(
    assess(
      "journey-outcome",
      { ...f, outcomeScope: "production" },
      { expectedOutcomeScope: "sandbox" },
    ).status,
  ).toBe("unknown");
});
it("bounds reflow to the correct CSS extent and reviewed exceptions", () => {
  const f = {
    contentDirection: "vertical",
    requiredCssExtent: 320,
    extentVerified: true,
    informationOrFunctionLost: false,
    twoDimensionalScrollRequired: true,
    twoDimensionalException: "does-not-apply",
  };
  expect(assess("reflow", f).status).toBe("fail");
  expect(
    assess("reflow", f, { viewport: { width: 390, height: 844 } }).status,
  ).toBe("unknown");
  expect(
    assess("reflow", { ...f, twoDimensionalException: "applies" }).status,
  ).toBe("unknown");
  expect(
    assess("reflow", { ...f, twoDimensionalScrollRequired: false }).status,
  ).toBe("pass");
});
it.each([
  "keyboard-exit",
  "keyboard-operation",
  "focus-visible",
  "focus-not-obscured",
  "error-identification",
  "focus-order",
  "dialog-name",
  "reflow",
  "error-recovery",
  "journey-outcome",
])("missing %s facts stay unknown", (id) => {
  expect(assess(id, {}).status).toBe("unknown");
});
it("rejects unknown rules, untyped facts and contradictory exits", () => {
  expect(() => assess("unknown", {})).toThrow();
  expect(() =>
    assess("dialog-name", { accessibleNamePresent: "yes" }),
  ).toThrow();
  expect(() =>
    assess("keyboard-exit", {
      enteredByKeyboard: true,
      exitOutcome: "exited",
      exitMethod: "none",
    }),
  ).toThrow();
  expect(() => assess("dialog-name", { status: "pass" })).toThrow();
});

it.each([
  [
    "focus-visible",
    { keyboardFocused: true, indicatorReviewed: true, indicatorVisible: true },
    "pass",
  ],
  [
    "focus-visible",
    { keyboardFocused: true, indicatorReviewed: true, indicatorVisible: false },
    "fail",
  ],
  [
    "focus-order",
    {
      sequentialNavigation: true,
      orderAffectsMeaningOrOperation: true,
      sequenceReviewed: true,
      preservesMeaningAndOperation: true,
    },
    "pass",
  ],
  [
    "focus-order",
    {
      sequentialNavigation: true,
      orderAffectsMeaningOrOperation: true,
      sequenceReviewed: true,
      preservesMeaningAndOperation: false,
    },
    "fail",
  ],
  [
    "dialog-name",
    {
      dialogExposed: true,
      nameSourceReviewed: true,
      accessibleNamePresent: true,
    },
    "pass",
  ],
  [
    "dialog-name",
    {
      dialogExposed: true,
      nameSourceReviewed: true,
      accessibleNamePresent: false,
    },
    "fail",
  ],
  ["keyboard-operation", { operationOutcome: "achieved" }, "pass"],
  [
    "error-recovery",
    {
      priorErrorObserved: true,
      correctedInputAttempted: true,
      recoveryOutcome: "completed",
    },
    "pass",
  ],
])("evaluates bounded %s facts", (id, facts, status) => {
  expect(assess(id, facts).status).toBe(status);
});
it("checks horizontal reflow and independent information loss", () => {
  const f = {
    contentDirection: "horizontal",
    requiredCssExtent: 256,
    extentVerified: true,
    informationOrFunctionLost: true,
  };
  const r = assess("reflow", f, { viewport: { width: 1280, height: 256 } });
  expect(r.status).toBe("fail");
  expect(r.usedFacts).not.toContain("twoDimensionalException");
});
it("rejects inherited facts and contradictions even outside keyboard mode", () => {
  expect(() =>
    assess(
      "error-identification",
      Object.assign(Object.create({ errorDescribedInText: false }), {
        automaticInputErrorDetected: true,
      }),
    ),
  ).toThrow();
  expect(() =>
    assess(
      "keyboard-exit",
      { exitOutcome: "exited", exitMethod: "none" },
      { inputMode: "pointer" },
    ),
  ).toThrow();
});

it.each([
  {
    enteredByKeyboard: true,
    exitOutcome: "exited",
    exitMethod: "standard",
    exitPathsReviewed: true,
    usableStandardExitVerified: false,
  },
  {
    enteredByKeyboard: true,
    exitOutcome: "contained",
    exitMethod: "none",
    exitPathsReviewed: true,
    usableStandardExitVerified: true,
  },
])("rejects contradictory reviewed standard exit availability", (facts) => {
  expect(() => assess("keyboard-exit", facts)).toThrow(/Contradictory/);
});
