import { expect, it } from "vitest";
import { evaluateJourneyTask } from "../scripts/enterprise-journeys/task-rules.mjs";

function fixture() {
  return {
    definition: {
      taskId: "checkout",
      condition: "valid-input",
      expectedUi: "success-feedback",
      expectedBusinessStatuses: ["settled"],
      businessRequired: true,
      environment: "sandbox",
    },
    facts: {
      condition: "valid-input",
      conditionsReviewed: true,
      actionAttempted: true,
      uiOutcome: "success-feedback",
      uiEvidenceReviewed: true,
      businessStatus: "settled",
      businessEvidenceReviewed: true,
      correlationVerified: true,
      outcomeEnvironment: "sandbox",
      outcomeMature: true,
    },
  };
}
it("keeps scoped task predicates separate from UX quality and causal acceptance", () => {
  const f = fixture(),
    r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("pass");
  expect(r.business.status).toBe("pass");
  expect(r.uxQualityAssessment).toBe("not-assessed");
  expect(r.semanticAcceptance).toBe(false);
  expect(r.causalAcceptance).toBe(false);
});
it("accepts a declared invalid-input rejection with appropriate feedback", () => {
  const f = fixture();
  f.definition.condition = f.facts.condition = "invalid-input";
  f.definition.expectedUi = f.facts.uiOutcome = "error-feedback";
  f.definition.expectedBusinessStatuses = ["rejected"];
  f.facts.businessStatus = "rejected";
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("pass");
  expect(r.business.status).toBe("pass");
});
it("does not turn backend rejection or UI success into a UX defect or settlement", () => {
  const f = fixture();
  f.facts.businessStatus = "rejected";
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("pass");
  expect(r.business.status).toBe("fail");
  expect(r.uxQualityAssessment).toBe("not-assessed");
});
it.each(["pending", "attempt", null])(
  "keeps nonterminal outcome %s unknown",
  (status) => {
    const f = fixture();
    f.facts.businessStatus = status;
    expect(evaluateJourneyTask(f.definition, f.facts).business.status).toBe(
      "unknown",
    );
  },
);
it.each(["businessEvidenceReviewed", "correlationVerified", "outcomeMature"])(
  "requires %s for terminal attribution",
  (key) => {
    const f = fixture();
    f.facts[key] = false;
    expect(evaluateJourneyTask(f.definition, f.facts).business.status).toBe(
      "unknown",
    );
  },
);
it("rejects mismatched conditions and environments as insufficient, not UX failure", () => {
  const f = fixture();
  f.facts.condition = "unavailable";
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("unknown");
  expect(r.business.status).toBe("unknown");
  f.facts.condition = f.definition.condition;
  f.facts.outcomeEnvironment = "production";
  expect(evaluateJourneyTask(f.definition, f.facts).business.status).toBe(
    "unknown",
  );
});
it("reports a scoped missing-feedback predicate without asserting a site-wide UX defect", () => {
  const f = fixture();
  f.facts.uiOutcome = "no-feedback";
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("fail");
  expect(r.uxQualityAssessment).toBe("not-assessed");
});
it("does not require backend evidence for an explicitly UI-only task", () => {
  const f = fixture();
  f.definition.businessRequired = false;
  f.definition.expectedBusinessStatuses = [];
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.business.status).toBe("not-assessed");
});
it("matches unavailable conditions with declared feedback and cancellation", () => {
  const f = fixture();
  f.definition.condition = f.facts.condition = "unavailable";
  f.definition.expectedUi = f.facts.uiOutcome = "unavailable-feedback";
  f.definition.expectedBusinessStatuses = ["cancelled"];
  f.facts.businessStatus = "cancelled";
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("pass");
  expect(r.business.status).toBe("pass");
});
it.each([
  ["conditionsReviewed", false],
  ["conditionsReviewed", null],
  ["actionAttempted", false],
  ["actionAttempted", null],
])("requires proven %s=%s task prerequisites", (key, value) => {
  const f = fixture();
  f.facts[key] = value;
  const r = evaluateJourneyTask(f.definition, f.facts);
  expect(r.ui.status).toBe("unknown");
  expect(r.business.status).toBe("unknown");
});
it.each([
  ["uiOutcome", null],
  ["uiEvidenceReviewed", false],
  ["uiEvidenceReviewed", null],
])("withholds UI assessment for %s=%s", (key, value) => {
  const f = fixture();
  f.facts[key] = value;
  expect(evaluateJourneyTask(f.definition, f.facts).ui.status).toBe("unknown");
});
it("rejects undeclared fields, coercion, duplicate expectations and nonterminal success definitions", () => {
  const f = fixture();
  for (const facts of [
    { ...f.facts, execute: true },
    { ...f.facts, actionAttempted: "true" },
  ])
    expect(() => evaluateJourneyTask(f.definition, facts)).toThrow();
  for (const statuses of [["settled", "settled"], ["pending"], []])
    expect(() =>
      evaluateJourneyTask(
        { ...f.definition, expectedBusinessStatuses: statuses },
        f.facts,
      ),
    ).toThrow();
});
