import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { enterpriseDigest, stableJson } from "./enterprise-state.mjs";
import {
  evaluateScenarioRule,
  scenarioRuleDefinition,
} from "./accessibility-scenario-rules.mjs";
const assert = (ok, m) => {
  if (!ok) throw Error(m);
};
const object = (x) =>
  x !== null &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));
const shape = (x, keys, label) =>
  assert(
    object(x) &&
      Object.keys(x).length === keys.length &&
      keys.every((k) => Object.hasOwn(x, k)),
    `Invalid ${label}`,
  );
const id = (x) => typeof x === "string" && /^[a-z][a-z0-9-]{0,127}$/.test(x);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const time = (x) => {
  assert(
    typeof x === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x) &&
      Number.isFinite(Date.parse(x)),
    "Invalid timestamp",
  );
  const t = Date.parse(x);
  assert(
    new Date(t).toISOString().replace(".000Z", "Z") === x.replace(".000Z", "Z"),
    "Invalid calendar timestamp",
  );
  return t;
};
const ids = (xs, max = 1000, nonempty = true) =>
  assert(
    Array.isArray(xs) &&
      xs.length <= max &&
      (!nonempty || xs.length > 0) &&
      xs.every(id) &&
      new Set(xs).size === xs.length,
    "Invalid identifiers",
  );
const scopeKeys = [
  "customerId",
  "entityId",
  "environment",
  "targetUrl",
  "viewport",
  "journeyId",
  "protocolId",
  "protocolVersion",
];
function contextScope(c) {
  return Object.fromEntries(scopeKeys.map((k) => [k, c[k]]));
}
function validateContext(c) {
  shape(
    c,
    [...scopeKeys, "assessmentAt", "maxAgeSeconds", "requiredSteps"],
    "scenario context",
  );
  for (const k of [
    "customerId",
    "entityId",
    "environment",
    "journeyId",
    "protocolId",
  ])
    assert(id(c[k]), "Invalid context ID");
  assert(
    Number.isSafeInteger(c.protocolVersion) && c.protocolVersion > 0,
    "Invalid protocol version",
  );
  assert(typeof c.targetUrl === "string", "Invalid target");
  const u = new URL(c.targetUrl);
  assert(
    ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.hash &&
      u.href === c.targetUrl,
    "Invalid canonical target",
  );
  shape(c.viewport, ["width", "height"], "viewport");
  for (const n of Object.values(c.viewport))
    assert(Number.isInteger(n) && n > 0 && n <= 100000, "Invalid viewport");
  time(c.assessmentAt);
  assert(
    Number.isInteger(c.maxAgeSeconds) &&
      c.maxAgeSeconds >= 0 &&
      c.maxAgeSeconds <= 31622400,
    "Invalid freshness",
  );
  assert(
    Array.isArray(c.requiredSteps) &&
      c.requiredSteps.length > 0 &&
      c.requiredSteps.length <= 100,
    "Invalid obligations",
  );
  const seen = new Set();
  for (const step of c.requiredSteps) {
    shape(
      step,
      ["stepId", "stateId", "ruleIds", "expectedOutcomeScope"],
      "obligation",
    );
    assert(
      id(step.stepId) && id(step.stateId) && !seen.has(step.stepId),
      "Invalid obligation ID",
    );
    seen.add(step.stepId);
    ids(step.ruleIds, 10);
    step.ruleIds.forEach(scenarioRuleDefinition);
    assert(
      step.ruleIds.includes("journey-outcome")
        ? ["sandbox", "production"].includes(step.expectedOutcomeScope)
        : step.expectedOutcomeScope === null,
      "Invalid expected outcome scope",
    );
  }
}
function parse(text) {
  let count = 0;
  const raw = JSON.parse(text);
  function visit(v, d) {
    assert(++count <= 200000 && d <= 40, "JSON complexity limit");
    if (v && typeof v === "object")
      for (const x of Object.values(v)) visit(x, d + 1);
  }
  visit(raw, 0);
  return raw;
}
function bytes(text, digest) {
  assert(
    typeof text === "string" && Buffer.byteLength(text) <= 8 * 1024 * 1024,
    "Artifact byte limit",
  );
  assert(
    typeof digest === "string" &&
      /^[a-f0-9]{64}$/.test(digest) &&
      sha(text) === digest,
    "Artifact hash mismatch",
  );
}
function environment(x) {
  shape(x, ["name", "version"], "browser or assistive technology");
  assert(
    Object.values(x).every(
      (v) => typeof v === "string" && v.length > 0 && v.length <= 512,
    ),
    "Invalid environment declaration",
  );
}
function normalize(source, c) {
  shape(
    source,
    ["sourceId", "sourceKind", "capturedAt", "artifactText", "artifactHash"],
    "source",
  );
  assert(
    id(source.sourceId) && source.sourceKind === "accessibility-scenario-v1",
    "Invalid source identity",
  );
  bytes(source.artifactText, source.artifactHash);
  const r = parse(source.artifactText);
  shape(
    r,
    [
      "schemaVersion",
      "scope",
      "author",
      "browser",
      "assistiveTechnology",
      "startedAt",
      "finishedAt",
      "attachments",
      "steps",
    ],
    "scenario artifact",
  );
  assert(r.schemaVersion === 1, "Unsupported schema");
  shape(r.scope, scopeKeys, "source scope");
  assert(
    stableJson(r.scope) === stableJson(contextScope(c)),
    "Source scope mismatch",
  );
  shape(r.author, ["authorId", "authorType"], "author");
  assert(
    id(r.author.authorId) &&
      ["human", "ai-assisted"].includes(r.author.authorType),
    "Invalid supplied author",
  );
  environment(r.browser);
  if (r.assistiveTechnology !== null) environment(r.assistiveTechnology);
  const start = time(r.startedAt),
    end = time(r.finishedAt),
    captured = time(source.capturedAt),
    now = time(c.assessmentAt);
  assert(
    start <= end && end <= captured && captured <= now,
    "Invalid source chronology",
  );
  assert(
    Array.isArray(r.attachments) &&
      r.attachments.length > 0 &&
      r.attachments.length <= 1000,
    "Invalid attachments",
  );
  const attachments = new Map();
  for (const a of r.attachments) {
    shape(
      a,
      ["attachmentId", "kind", "observedAt", "artifactText", "artifactHash"],
      "attachment",
    );
    assert(
      id(a.attachmentId) && !attachments.has(a.attachmentId),
      "Invalid attachment ID",
    );
    assert(
      [
        "dom",
        "screenshot-description",
        "keyboard-trace",
        "review-note",
        "screen-reader-transcript",
      ].includes(a.kind),
      "Invalid attachment kind",
    );
    bytes(a.artifactText, a.artifactHash);
    const at = time(a.observedAt);
    assert(start <= at && at <= end, "Invalid attachment chronology");
    attachments.set(a.attachmentId, {
      attachmentId: a.attachmentId,
      kind: a.kind,
      observedAt: a.observedAt,
      artifactHash: a.artifactHash,
    });
  }
  assert(Array.isArray(r.steps) && r.steps.length <= 100, "Invalid steps");
  const seen = new Set();
  let previous = start;
  const steps = r.steps.map((step) => {
    shape(
      step,
      [
        "stepId",
        "stateId",
        "observedAt",
        "inputMode",
        "actionId",
        "attachmentIds",
        "facts",
      ],
      "step",
    );
    assert(
      id(step.stepId) && !seen.has(step.stepId) && id(step.actionId),
      "Invalid step ID",
    );
    seen.add(step.stepId);
    const obligation = c.requiredSteps.find((s) => s.stepId === step.stepId);
    assert(
      obligation && obligation.stateId === step.stateId,
      "Undeclared step or state",
    );
    assert(
      ["keyboard", "pointer", "programmatic", "mixed"].includes(step.inputMode),
      "Invalid input mode",
    );
    const at = time(step.observedAt);
    assert(previous <= at && at <= end, "Invalid step chronology");
    previous = at;
    ids(step.attachmentIds);
    for (const key of step.attachmentIds)
      assert(
        attachments.has(key) && time(attachments.get(key).observedAt) <= at,
        "Missing or future step attachment",
      );
    assert(object(step.facts), "Invalid facts");
    const allowed = new Set(
      obligation.ruleIds.flatMap((rule) =>
        Object.keys(scenarioRuleDefinition(rule).fields),
      ),
    );
    const facts = {};
    for (const [key, fact] of Object.entries(step.facts)) {
      assert(allowed.has(key), "Unexpected fact");
      shape(fact, ["value", "attachmentIds"], "fact");
      ids(fact.attachmentIds);
      for (const aid of fact.attachmentIds)
        assert(
          step.attachmentIds.includes(aid),
          "Fact attachment outside step",
        );
      const expires =
        Math.min(
          at,
          ...fact.attachmentIds.map((aid) =>
            time(attachments.get(aid).observedAt),
          ),
        ) +
        c.maxAgeSeconds * 1000;
      facts[key] = {
        value: fact.value,
        attachmentIds: [...fact.attachmentIds].sort(),
        validUntil: new Date(expires).toISOString(),
        current: now < expires,
      };
    }
    const checks = [...obligation.ruleIds].sort().map((ruleId) => {
      const keys = Object.keys(scenarioRuleDefinition(ruleId).fields);
      const subset = Object.fromEntries(
        Object.entries(facts)
          .filter(([key]) => keys.includes(key))
          .map(([key, f]) => [key, f.value]),
      );
      const predicateContext = {
        inputMode: step.inputMode,
        viewport: c.viewport,
        expectedOutcomeScope: obligation.expectedOutcomeScope,
      };
      evaluateScenarioRule(ruleId, subset, predicateContext); // Validate original contradictions before masking expired facts.
      const eligible = Object.fromEntries(
        Object.keys(subset).map((key) => [
          key,
          facts[key].current ? facts[key].value : null,
        ]),
      );
      const result = evaluateScenarioRule(ruleId, eligible, predicateContext);
      const supportingFacts = result.usedFacts.filter(
        (key) => facts[key]?.current && facts[key].value !== null,
      );
      const validUntil = supportingFacts.length
        ? new Date(
            Math.min(
              ...supportingFacts.map((key) => time(facts[key].validUntil)),
            ),
          ).toISOString()
        : null;
      return {
        ...result,
        validUntil,
        evidenceAttachmentIds: [
          ...new Set(
            supportingFacts.flatMap((key) => facts[key].attachmentIds),
          ),
        ].sort(),
      };
    });
    return {
      stepId: step.stepId,
      stateId: step.stateId,
      observedAt: step.observedAt,
      inputMode: step.inputMode,
      actionId: step.actionId,
      attachmentIds: [...step.attachmentIds].sort(),
      facts,
      checks,
      current: now < at + c.maxAgeSeconds * 1000,
    };
  });
  const record = {
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    scopeDigest: enterpriseDigest(r.scope),
    environmentDigest: enterpriseDigest([r.browser, r.assistiveTechnology]),
    author: { ...r.author },
    attribution: "supplied-attribution",
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    attachments: [...attachments.values()].sort((a, b) =>
      a.attachmentId.localeCompare(b.attachmentId),
    ),
    steps,
  };
  // Canonical original payload, independent of assessment-time eligibility and byte formatting.
  const canonical = {
    ...r,
    attachments: [...r.attachments].sort((a, b) =>
      a.attachmentId.localeCompare(b.attachmentId),
    ),
    steps: r.steps.map((step) => ({
      ...step,
      attachmentIds: [...step.attachmentIds].sort(),
      facts: Object.fromEntries(
        Object.entries(step.facts).map(([key, f]) => [
          key,
          { ...f, attachmentIds: [...f.attachmentIds].sort() },
        ]),
      ),
    })),
  };
  return { ...record, traceDigest: enterpriseDigest(canonical) };
}
export function evaluateAccessibilityScenarios(context, sources) {
  validateContext(context);
  assert(Array.isArray(sources) && sources.length <= 100, "Source count limit");
  assert(
    sources.reduce(
      (sum, s) =>
        sum +
        (typeof s?.artifactText === "string"
          ? Buffer.byteLength(s.artifactText)
          : 0),
      0,
    ) <=
      16 * 1024 * 1024,
    "Bundle byte limit",
  );
  const seen = new Set();
  for (const s of sources) {
    assert(object(s) && !seen.has(s.sourceId), "Duplicate or invalid source");
    seen.add(s.sourceId);
  }
  const records = sources
    .map((s) => normalize(s, context))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const checks = [...context.requiredSteps]
    .sort((a, b) => a.stepId.localeCompare(b.stepId))
    .flatMap((step) =>
      [...step.ruleIds].sort().map((ruleId) => {
        const keys = Object.keys(scenarioRuleDefinition(ruleId).fields);
        const candidates = records.flatMap((record) => {
          const observation = record.steps.find(
            (s) => s.stepId === step.stepId,
          );
          if (!observation?.current) return [];
          const facts = Object.fromEntries(
            Object.entries(observation.facts).filter(
              ([key, f]) => keys.includes(key) && f.current && f.value !== null,
            ),
          );
          if (!Object.keys(facts).length) return [];
          return [
            {
              sourceId: record.sourceId,
              environmentDigest: enterpriseDigest([
                record.environmentDigest,
                observation.inputMode,
              ]),
              inputMode: observation.inputMode,
              facts,
            },
          ];
        });
        const conflictedFacts = keys
          .filter(
            (key) =>
              new Set(
                candidates
                  .filter((c) => Object.hasOwn(c.facts, key))
                  .map((c) => stableJson(c.facts[key].value)),
              ).size > 1,
          )
          .sort();
        const outcomes = candidates.map((c) => {
          const values = Object.fromEntries(
            Object.entries(c.facts).map(([key, f]) => [
              key,
              conflictedFacts.includes(key) ? null : f.value,
            ]),
          );
          const check = evaluateScenarioRule(ruleId, values, {
            inputMode: c.inputMode,
            viewport: context.viewport,
            expectedOutcomeScope: step.expectedOutcomeScope,
          });
          const supporting = check.usedFacts.filter(
            (key) => Object.hasOwn(values, key) && values[key] !== null,
          );
          return {
            sourceId: c.sourceId,
            environmentDigest: c.environmentDigest,
            check: {
              ...check,
              validUntil: supporting.length
                ? new Date(
                    Math.min(
                      ...supporting.map((key) => time(c.facts[key].validUntil)),
                    ),
                  ).toISOString()
                : null,
              evidenceAttachmentIds: [
                ...new Set(
                  supporting.flatMap((key) => c.facts[key].attachmentIds),
                ),
              ].sort(),
            },
          };
        });
        const configs = new Set(outcomes.map((x) => x.environmentDigest));
        const failed = outcomes.find((x) => x.check.status === "fail");
        const passed = outcomes.find((x) => x.check.status === "pass");
        const status =
          configs.size !== 1
            ? "unknown"
            : failed
              ? "fail"
              : passed && !conflictedFacts.length
                ? "pass"
                : "unknown";
        const definition = scenarioRuleDefinition(ruleId);
        return {
          stepId: step.stepId,
          stateId: step.stateId,
          ruleId,
          ruleVersion: 1,
          criterion: definition.criterion,
          namespace: definition.criterion
            ? "attributed-accessibility-scenario"
            : "attributed-journey-diagnostic",
          status,
          reason: !outcomes.length
            ? "step-not-observed-or-stale"
            : configs.size > 1
              ? "environment-populations-differ"
              : status === "fail"
                ? "nonconflicted-scenario-failure"
                : conflictedFacts.length
                  ? "conflicting-current-facts"
                  : status === "pass"
                    ? "complete-source-predicate-satisfied"
                    : "insufficient-current-facts",
          conflictedFacts,
          resolutions: outcomes.map((o) => ({
            sourceId: o.sourceId,
            ...o.check,
          })),
          sourceIds: outcomes.map((o) => o.sourceId),
          expectedOutcomeScope: step.expectedOutcomeScope,
          coverage: "declared-step-only",
          identityDigest: enterpriseDigest([
            "scenario-v1",
            contextScope(context),
            step.stepId,
            step.stateId,
            ruleId,
            step.expectedOutcomeScope,
          ]),
          semanticAcceptance: false,
        };
      }),
    );
  const request = (reason, step = null, ruleId = null) => ({
    reason,
    ownerRole: "accessibility-owner",
    customerId: context.customerId,
    entityId: context.entityId,
    environment: context.environment,
    maxAgeSeconds: context.maxAgeSeconds,
    expectedOutcomeScope: step?.expectedOutcomeScope ?? null,
    targetUrl: context.targetUrl,
    viewport: context.viewport,
    journeyId: context.journeyId,
    protocolId: context.protocolId,
    protocolVersion: context.protocolVersion,
    stepId: step?.stepId ?? null,
    stateId: step?.stateId ?? null,
    requiredFacts: ruleId
      ? Object.keys(scenarioRuleDefinition(ruleId).fields)
      : [],
    acceptedFormat:
      "accessibility-scenario-v1 exact JSON with scoped steps, attributed facts and hash-bound attachments",
    exportInstructions:
      "Provide current original observations for the declared steps and required facts. Include keyboard/focus sequence, assistive-technology evidence, hidden states, iframe/shadow coverage and complete task flow where applicable. Never send passwords or tokens.",
    fallback:
      "Retain unknown coverage and arrange scoped manual review; continue other modules.",
  });
  return {
    records,
    checks,
    uniqueTraceCount: new Set(records.map((r) => r.traceDigest)).size,
    visitedStepCount: new Set(
      records.flatMap((r) => r.steps.map((s) => s.stepId)),
    ).size,
    declaredStepCount: context.requiredSteps.length,
    declaredObligationsAccounted: checks.every((c) => c.status !== "unknown"),
    coverage: "unknown",
    dataRequests: [
      request("manual-coverage-unproven"),
      ...checks
        .filter((c) => c.status === "unknown")
        .map((c) => request(c.reason, c, c.ruleId)),
    ],
    conformanceAssessed: false,
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
}
