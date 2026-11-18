import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { evaluateAccessibilityScenarios } from "../scripts/enterprise-accessibility/scenarios.mjs";
const hash = (x) => createHash("sha256").update(x).digest("hex");
function fixture() {
  const scope = {
    customerId: "customer",
    entityId: "site",
    environment: "test",
    targetUrl: "https://example.com/",
    viewport: { width: 320, height: 844 },
    journeyId: "signup",
    protocolId: "keyboard",
    protocolVersion: 1,
  };
  const context = {
    ...scope,
    assessmentAt: "2026-11-19T12:00:00Z",
    maxAgeSeconds: 3600,
    requiredSteps: [
      {
        stepId: "error",
        stateId: "invalid",
        ruleIds: ["error-identification"],
        expectedOutcomeScope: null,
      },
      {
        stepId: "next",
        stateId: "confirmation",
        ruleIds: ["dialog-name"],
        expectedOutcomeScope: null,
      },
    ],
  };
  const a = {
    attachmentId: "current",
    kind: "dom",
    observedAt: "2026-11-19T11:40:00Z",
    artifactText: "PRIVATE_SOURCE_826",
    artifactHash: hash("PRIVATE_SOURCE_826"),
  };
  const fact = (value) => ({ value, attachmentIds: ["current"] });
  const payload = {
    schemaVersion: 1,
    scope,
    author: { authorId: "reviewer", authorType: "ai-assisted" },
    browser: { name: "Chromium", version: "156" },
    assistiveTechnology: null,
    startedAt: "2026-11-19T10:00:00Z",
    finishedAt: "2026-11-19T11:50:00Z",
    attachments: [a],
    steps: [
      {
        stepId: "error",
        stateId: "invalid",
        observedAt: "2026-11-19T11:45:00Z",
        inputMode: "keyboard",
        actionId: "submit-invalid",
        attachmentIds: ["current"],
        facts: {
          automaticInputErrorDetected: fact(true),
          affectedItemIdentified: fact(true),
          errorDescribedInText: fact(true),
        },
      },
    ],
  };
  const source = {
    sourceId: "trace",
    sourceKind: "accessibility-scenario-v1",
    capturedAt: "2026-11-19T11:55:00Z",
    artifactText: "",
    artifactHash: "",
  };
  const encode = () => {
    source.artifactText = JSON.stringify(payload);
    source.artifactHash = hash(source.artifactText);
    return source;
  };
  return { scope, context, payload, source, encode, fact, a };
}
it("keeps unvisited steps unknown and supplied author separate from acceptance", () => {
  const f = fixture(),
    r = evaluateAccessibilityScenarios(f.context, [f.encode()]);
  expect(r.checks.map((c) => c.status)).toEqual(["pass", "unknown"]);
  expect(r.semanticAcceptance).toBe(false);
  expect(r.conformanceAssessed).toBe(false);
  expect(r.records[0].attribution).toBe("supplied-attribution");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_SOURCE_826");
  expect(
    r.dataRequests.some((x) => x.reason === "manual-coverage-unproven"),
  ).toBe(true);
});
it("a new step cannot refresh an old attachment", () => {
  const f = fixture();
  f.a.observedAt = "2026-11-19T10:00:00Z";
  expect(
    evaluateAccessibilityScenarios(f.context, [f.encode()]).checks[0].status,
  ).toBe("unknown");
});
it("stale unrelated evidence does not hide a sufficient current failure", () => {
  const f = fixture();
  const old = {
    ...f.a,
    attachmentId: "old",
    observedAt: "2026-11-19T10:00:00Z",
  };
  f.payload.attachments.push(old);
  const step = f.payload.steps[0];
  step.attachmentIds.push("old");
  step.facts.affectedItemIdentified = { value: false, attachmentIds: ["old"] };
  step.facts.errorDescribedInText = f.fact(false);
  const r = evaluateAccessibilityScenarios(f.context, [f.encode()]);
  expect(r.checks[0].status).toBe("fail");
  expect(r.records[0].steps[0].checks[0].usedFacts).not.toContain(
    "affectedItemIdentified",
  );
});
it("expires at attachment boundary and preserves original source hashes", () => {
  const f = fixture();
  f.context.assessmentAt = "2026-11-19T12:40:00Z";
  const s = f.encode();
  const r = evaluateAccessibilityScenarios(f.context, [s]);
  expect(r.checks[0].status).toBe("unknown");
  expect(r.records[0].artifactHash).toBe(s.artifactHash);
});
it("detects conflicts and is input-order invariant", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "other";
  g.payload.steps[0].facts.errorDescribedInText.value = false;
  const a = f.encode(),
    b = g.encode();
  const r = evaluateAccessibilityScenarios(f.context, [a, b]);
  expect(r.checks[0].status).toBe("unknown");
  expect(r).toEqual(evaluateAccessibilityScenarios(f.context, [b, a]));
});
it("deduplicates reformatted sources without erasing attribution", () => {
  const f = fixture(),
    a = { ...f.encode() },
    b = {
      ...a,
      sourceId: "copy",
      artifactText: JSON.stringify(f.payload, null, 2),
    };
  b.artifactHash = hash(b.artifactText);
  const r = evaluateAccessibilityScenarios(f.context, [a, b]);
  expect(r.uniqueTraceCount).toBe(1);
  expect(r.records).toHaveLength(2);
});
it("does not combine browser or assistive-technology populations", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "other";
  g.payload.assistiveTechnology = { name: "Screen reader", version: "1" };
  expect(
    evaluateAccessibilityScenarios(f.context, [f.encode(), g.encode()])
      .checks[0].status,
  ).toBe("unknown");
});
it.each([
  "tenant",
  "protocol",
  "viewport",
  "hash",
  "attachment-hash",
  "dangling",
  "sibling",
  "future",
  "calendar",
  "author",
  "unknown-fact",
  "extra",
  "contradiction",
])("rejects %s", (kind) => {
  const f = fixture();
  if (kind === "tenant") f.payload.scope.customerId = "other";
  if (kind === "protocol") f.payload.scope.protocolVersion = 2;
  if (kind === "viewport")
    f.payload.scope.viewport = { width: 390, height: 844 };
  if (kind === "attachment-hash") f.a.artifactHash = "0".repeat(64);
  if (kind === "dangling")
    f.payload.steps[0].facts.affectedItemIdentified.attachmentIds = ["missing"];
  if (kind === "sibling") {
    f.payload.attachments.push({ ...f.a, attachmentId: "sibling" });
    f.payload.steps[0].facts.affectedItemIdentified.attachmentIds = ["sibling"];
  }
  if (kind === "future") f.a.observedAt = "2026-11-19T13:00:00Z";
  if (kind === "calendar") f.payload.startedAt = "2026-02-30T10:00:00Z";
  if (kind === "author")
    f.payload.author.authorType = "independent-human-accepted";
  if (kind === "unknown-fact") f.payload.steps[0].facts.accepted = f.fact(true);
  if (kind === "extra") f.payload.accepted = true;
  if (kind === "contradiction") {
    f.context.requiredSteps[0].ruleIds = ["keyboard-exit"];
    f.payload.steps[0].facts = {
      enteredByKeyboard: f.fact(true),
      exitOutcome: f.fact("exited"),
      exitMethod: f.fact("none"),
    };
  }
  const source = f.encode();
  if (kind === "hash") source.artifactHash = "0".repeat(64);
  expect(() => evaluateAccessibilityScenarios(f.context, [source])).toThrow();
});
it("no sources still accounts for every declared rule", () => {
  const f = fixture(),
    r = evaluateAccessibilityScenarios(f.context, []);
  expect(r.checks).toHaveLength(2);
  expect(r.checks.every((x) => x.status === "unknown")).toBe(true);
});

it("does not let an entirely stale source hide a current failed check", () => {
  const f = fixture(),
    g = fixture();
  f.a.observedAt = "2026-11-19T10:00:00Z";
  g.source.sourceId = "current";
  g.payload.steps[0].facts.errorDescribedInText.value = false;
  expect(
    evaluateAccessibilityScenarios(f.context, [f.encode(), g.encode()])
      .checks[0].status,
  ).toBe("fail");
});
it("bounds source bytes, count and duplicate IDs", () => {
  const f = fixture(),
    s = f.encode();
  expect(() => evaluateAccessibilityScenarios(f.context, [s, s])).toThrow(
    /Duplicate/,
  );
  expect(() =>
    evaluateAccessibilityScenarios(f.context, Array(101).fill(s)),
  ).toThrow(/count/);
  expect(() =>
    evaluateAccessibilityScenarios(f.context, [
      { ...s, artifactText: " ".repeat(8 * 1024 * 1024 + 1) },
    ]),
  ).toThrow(/byte/);
});
it("keeps sibling states and viewport/protocol identities distinct", () => {
  const f = fixture(),
    a = evaluateAccessibilityScenarios(f.context, [f.encode()]).checks[0]
      .identityDigest;
  f.context.protocolVersion = 2;
  f.payload.scope.protocolVersion = 2;
  const b = evaluateAccessibilityScenarios(f.context, [f.encode()]).checks[0]
    .identityDigest;
  expect(b).not.toBe(a);
  f.context.viewport = { width: 390, height: 844 };
  f.payload.scope.viewport = f.context.viewport;
  expect(
    evaluateAccessibilityScenarios(f.context, [f.encode()]).checks[0]
      .identityDigest,
  ).not.toBe(b);
});

it("resolves contradictory facts even when individual statuses both fail", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "other";
  f.payload.steps[0].facts.affectedItemIdentified.value = false;
  g.payload.steps[0].facts.errorDescribedInText.value = false;
  const r = evaluateAccessibilityScenarios(f.context, [f.encode(), g.encode()]);
  expect(r.checks[0].status).toBe("unknown");
  expect(r.checks[0].conflictedFacts).toEqual([
    "affectedItemIdentified",
    "errorDescribedInText",
  ]);
});
it("preserves a sufficient nonconflicted failure", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "other";
  f.payload.steps[0].facts.affectedItemIdentified.value = false;
  f.payload.steps[0].facts.errorDescribedInText.value = false;
  g.payload.steps[0].facts.errorDescribedInText.value = false;
  const r = evaluateAccessibilityScenarios(f.context, [f.encode(), g.encode()]);
  expect(r.checks[0].status).toBe("fail");
  expect(r.checks[0].conflictedFacts).toEqual(["affectedItemIdentified"]);
});
it("does not assemble a pass from separate incomplete traces", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "other";
  delete f.payload.steps[0].facts.affectedItemIdentified;
  delete f.payload.steps[0].facts.errorDescribedInText;
  delete g.payload.steps[0].facts.automaticInputErrorDetected;
  expect(
    evaluateAccessibilityScenarios(f.context, [f.encode(), g.encode()])
      .checks[0].status,
  ).toBe("unknown");
});

it("a partial trace can oppose a current assertion without fabricating a full assessment", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "partial";
  f.payload.steps[0].facts.errorDescribedInText.value = false;
  delete g.payload.steps[0].facts.automaticInputErrorDetected;
  delete g.payload.steps[0].facts.affectedItemIdentified;
  expect(
    evaluateAccessibilityScenarios(f.context, [f.encode(), g.encode()])
      .checks[0].status,
  ).toBe("unknown");
});
