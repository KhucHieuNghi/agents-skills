import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import process from "node:process";
import assert from "node:assert/strict";
import { evaluateAccessibilityScenarios } from "../../scripts/enterprise-accessibility/scenarios.mjs";
assert(
  process.argv[2] && process.argv[3],
  "Usage: node tests/browser/enterprise-scenario-import.mjs NATIVE_TRIAL NEW_OUTPUT",
);
const source = resolve(process.argv[2]),
  output = resolve(process.argv[3]);
await mkdir(output);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const verification = JSON.parse(
  await readFile(resolve(source, "verification.json"), "utf8"),
);
assert(
  verification.synthetic && verification.loopbackOnly && verification.passed,
);
const results = [];
for (const receipt of verification.receipts) {
  assert(
    /^[a-z][a-z0-9-]{0,127}$/.test(receipt.id),
    "Invalid fixture receipt ID",
  );
  const raw = await readFile(resolve(source, receipt.id + ".json"), "utf8");
  assert.equal(sha(raw), receipt.artifactHash);
  const native = JSON.parse(raw);
  assert(native.synthetic);
  const now = new Date().toISOString(),
    observedAt = native.trace[0].at;
  const scope = {
    customerId: "synthetic-scenarios",
    entityId: "local-fixture",
    environment: "test",
    targetUrl: native.url,
    viewport: native.viewport,
    journeyId: receipt.id,
    protocolId: "local-scenario",
    protocolVersion: 1,
  };
  let ruleId,
    values,
    expected = "unknown",
    review =
      "Browser observations alone do not establish the remaining semantic prerequisites.";
  const last = native.trace.at(-1).facts;
  if (native.fixture.startsWith("modal-")) {
    ruleId = "keyboard-exit";
    const entered = native.trace.some(
      (t) =>
        t.action === "Enter" &&
        t.facts.dialogOpen === true &&
        t.facts.focusedId === "first",
    );
    values = {
      enteredByKeyboard: entered,
      exitOutcome: last.dialogOpen ? "contained" : "exited",
      exitMethod: last.dialogOpen ? "none" : "standard",
      exitPathsReviewed: null,
      usableStandardExitVerified: last.dialogOpen ? null : true,
    };
    if (!last.dialogOpen) expected = "pass";
  } else if (native.fixture.startsWith("focus-")) {
    ruleId = "focus-not-obscured";
    values = {
      keyboardFocused: native.trace.some(
        (t) => t.facts?.focusedId === "target",
      ),
      initialPositionReviewed: null,
      authorContentEntirelyHides: null,
      userOpenedPersistentContent: null,
      revealWithoutMovingFocus: "unreviewed",
    };
  } else if (native.fixture.startsWith("error-")) {
    ruleId = "error-identification";
    const text = last.errorText;
    assert.equal(last.invalid, "true");
    assert(["", "Email is required"].includes(text));
    values = {
      automaticInputErrorDetected: true,
      affectedItemIdentified: text !== "",
      errorDescribedInText: text !== "",
    };
    expected = text ? "pass" : "fail";
    review =
      "Root AI interpretation of the inspected local invalid-submit fixture and captured response: invalid email state is set; text 'Email is required' identifies the field and error when present. Empty text does neither. This is supplied attribution, not independent acceptance.";
  } else if (native.fixture === "overflow") {
    ruleId = "reflow";
    values = {
      contentDirection: "vertical",
      requiredCssExtent: native.viewport.width,
      extentVerified: true,
      twoDimensionalScrollRequired: null,
      informationOrFunctionLost: null,
      twoDimensionalException: "unresolved",
    };
  } else {
    ruleId = "journey-outcome";
    values = {
      actionAttempted: true,
      terminalOutcome: "unobserved",
      outcomeScope: "sandbox",
      outcomeEvidenceReviewed: false,
    };
    review =
      "The local UI displayed booking failed. This captured UI trace does not contain a terminal provider receipt, so the outcome remains unobserved for this import.";
  }
  const context = {
    ...scope,
    assessmentAt: now,
    maxAgeSeconds: 86400,
    requiredSteps: [
      {
        stepId: "observed",
        stateId: "fixture",
        ruleIds: [ruleId],
        expectedOutcomeScope: ruleId === "journey-outcome" ? "sandbox" : null,
      },
    ],
  };
  const attachments = [
    {
      attachmentId: "native",
      kind: "keyboard-trace",
      observedAt,
      artifactText: raw,
      artifactHash: sha(raw),
    },
    {
      attachmentId: "interpretation",
      kind: "review-note",
      observedAt: now,
      artifactText: review,
      artifactHash: sha(review),
    },
  ];
  const artifact = {
    schemaVersion: 1,
    scope,
    author: {
      authorId: "root-ai-fixture-interpreter",
      authorType: "ai-assisted",
    },
    browser: { name: "Chromium", version: native.browser },
    assistiveTechnology: null,
    startedAt: observedAt,
    finishedAt: now,
    attachments,
    steps: [
      {
        stepId: "observed",
        stateId: "fixture",
        observedAt: now,
        inputMode: native.fixture === "overflow" ? "programmatic" : "keyboard",
        actionId: "inspect-trace",
        attachmentIds: ["native", "interpretation"],
        facts: Object.fromEntries(
          Object.entries(values).map(([key, value]) => [
            key,
            { value, attachmentIds: ["native", "interpretation"] },
          ]),
        ),
      },
    ],
  };
  const artifactText = JSON.stringify(artifact);
  const envelope = {
    sourceId: receipt.id,
    sourceKind: "accessibility-scenario-v1",
    capturedAt: now,
    artifactText,
    artifactHash: sha(artifactText),
  };
  const result = evaluateAccessibilityScenarios(context, [envelope]);
  assert.equal(result.checks[0].status, expected);
  assert.equal(result.semanticAcceptance, false);
  assert.equal(result.coverage, "unknown");
  assert(!JSON.stringify(result).includes("Root AI interpretation"));
  await writeFile(
    resolve(output, receipt.id + "-input.json"),
    JSON.stringify({ context, sources: [envelope] }, null, 2) + "\n",
  );
  const bytes = JSON.stringify(result, null, 2) + "\n";
  await writeFile(resolve(output, receipt.id + "-result.json"), bytes);
  results.push({
    id: receipt.id,
    status: result.checks[0].status,
    resultHash: sha(bytes),
    nativeHash: receipt.artifactHash,
  });
}
await writeFile(
  resolve(output, "verification.json"),
  JSON.stringify(
    { passed: true, synthetic: true, semanticAcceptance: false, results },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  JSON.stringify({
    passed: true,
    cases: results.length,
    statuses: results.map((r) => r.status),
  }) + "\n",
);
