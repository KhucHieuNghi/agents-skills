import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  enterpriseDigest,
  textValue,
  timestampValue,
} from "./enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const shape = (o, keys, label) =>
  assert(
    o &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      Object.keys(o).every((k) => keys.includes(k)),
    `Invalid ${label} fields`,
  );
const scopeKeys = ["customerId", "entityId", "environment"];
const kinds = [
  "fresh",
  "reject",
  "accept",
  "selective",
  "revoke",
  "persisted",
  "region-variant",
  "spa",
];
const transitions = [
  "default",
  "reject",
  "accept",
  "selective",
  "revoke",
  "persisted",
  "navigation",
];
const time = Date.parse;
const unique = (a) => new Set(a).size === a.length;
const nullableBoolean = (x) => x === null || typeof x === "boolean";
function validateState(state, categories) {
  shape(state, categories, "consent state");
  assert(
    categories.every((c) => ["granted", "denied"].includes(state[c])),
    "Incomplete consent state",
  );
}
/** Technical policy comparison only. Does not grant access or assess legal compliance. */
export function evaluateConsentScenarios(policy, inputs, context) {
  shape(
    policy,
    ["policyId", "owner", "scope", "categories", "deniedRules", "scenarios"],
    "consent policy",
  );
  assert(
    textValue(policy.policyId) && textValue(policy.owner),
    "Invalid policy identity/owner",
  );
  shape(policy.scope, scopeKeys, "policy scope");
  assert(
    scopeKeys.every(
      (k) => textValue(policy.scope[k]) && policy.scope[k] === context?.[k],
    ),
    "Consent policy scope mismatch",
  );
  assert(
    timestampValue(context.assessmentAt) &&
      Number.isSafeInteger(context.maxAgeSeconds) &&
      context.maxAgeSeconds > 0 &&
      context.maxAgeSeconds <= 366 * 86400,
    "Invalid consent assessment context",
  );
  assert(
    Array.isArray(policy.categories) &&
      policy.categories.length > 0 &&
      policy.categories.length <= 32 &&
      unique(policy.categories) &&
      policy.categories.every(
        (c) =>
          typeof c === "string" &&
          /^[a-z][a-z0-9_]{0,63}$/.test(c) &&
          !["constructor", "prototype"].includes(c),
      ),
    "Invalid policy categories",
  );
  shape(policy.deniedRules, policy.categories, "denied category rules");
  for (const category of policy.categories) {
    const rule = policy.deniedRules[category];
    shape(
      rule,
      ["requests", "storageRead", "storageWrite", "cookies", "identifiers"],
      "denied category rule",
    );
    assert(
      ["blocked", "cookieless", "allowed"].includes(rule.requests) &&
        [
          rule.storageRead,
          rule.storageWrite,
          rule.cookies,
          rule.identifiers,
        ].every((x) => typeof x === "boolean"),
      "Invalid denied category rule",
    );
    assert(
      rule.requests !== "cookieless" || rule.cookies === false,
      "Cookieless policy cannot allow cookies",
    );
  }
  assert(
    Array.isArray(policy.scenarios) &&
      policy.scenarios.length > 0 &&
      policy.scenarios.length <= 100,
    "Invalid consent scenario matrix",
  );
  const scenarios = new Map();
  for (const s of policy.scenarios) {
    shape(
      s,
      [
        "scenarioId",
        "kind",
        "region",
        "surface",
        "mode",
        "window",
        "transitions",
      ],
      "consent scenario",
    );
    assert(
      textValue(s.scenarioId) &&
        !scenarios.has(s.scenarioId) &&
        kinds.includes(s.kind) &&
        textValue(s.region) &&
        ["client", "server"].includes(s.surface) &&
        ["basic", "advanced"].includes(s.mode),
      "Invalid consent scenario scope/mode",
    );
    shape(s.window, ["from", "to"], "consent window");
    assert(
      timestampValue(s.window.from) &&
        timestampValue(s.window.to) &&
        time(s.window.from) < time(s.window.to) &&
        time(s.window.to) <= time(context.assessmentAt),
      "Invalid consent window",
    );
    assert(
      Array.isArray(s.transitions) &&
        s.transitions.length > 0 &&
        s.transitions.length <= 100 &&
        s.transitions[0].transition === "default",
      "Consent scenario requires ordered defaults",
    );
    for (const t of s.transitions) {
      shape(t, ["transition", "state"], "policy transition");
      assert(transitions.includes(t.transition), "Invalid policy transition");
      validateState(t.state, policy.categories);
    }
    const requiredTransition = {
      fresh: "default",
      reject: "reject",
      accept: "accept",
      selective: "selective",
      revoke: "revoke",
      persisted: "persisted",
      "region-variant": "default",
      spa: "navigation",
    }[s.kind];
    assert(
      s.transitions.some((t) => t.transition === requiredTransition),
      "Missing required scenario transition",
    );
    if (s.kind === "revoke") {
      const index = s.transitions.findIndex((t) => t.transition === "revoke");
      assert(
        index > 0 &&
          policy.categories.some(
            (c) =>
              s.transitions[index - 1].state[c] === "granted" &&
              s.transitions[index].state[c] === "denied",
          ),
        "Invalid revoke transition: no granted-to-denied change",
      );
    }
    if (s.kind === "selective") {
      const selected = s.transitions.find(
        (t) => t.transition === "selective",
      ).state;
      assert(
        Object.values(selected).includes("granted") &&
          Object.values(selected).includes("denied"),
        "Invalid selective state",
      );
    }
    if (["accept", "reject"].includes(s.kind)) {
      const target = s.transitions.find((t) => t.transition === s.kind).state;
      assert(
        Object.values(target).includes(
          s.kind === "accept" ? "granted" : "denied",
        ),
        "Invalid accept/reject scenario state",
      );
    }
    scenarios.set(s.scenarioId, s);
  }
  assert(
    Array.isArray(inputs) && inputs.length <= 100,
    "Invalid consent sources",
  );
  const seen = new Set(),
    sources = [];
  for (const input of inputs) {
    shape(
      input,
      [
        "sourceId",
        "sourceKind",
        "locator",
        "capturedAt",
        "synthetic",
        "artifactText",
        "artifactHash",
      ],
      "consent source",
    );
    assert(
      textValue(input.sourceId) &&
        !seen.has(input.sourceId) &&
        textValue(input.locator) &&
        ["browser-trace", "server-trace", "manual"].includes(
          input.sourceKind,
        ) &&
        typeof input.synthetic === "boolean",
      "Invalid or duplicate consent source",
    );
    seen.add(input.sourceId);
    assert(
      timestampValue(input.capturedAt) &&
        time(input.capturedAt) <= time(context.assessmentAt),
      "Invalid consent capture",
    );
    assert(
      typeof input.artifactText === "string" &&
        Buffer.byteLength(input.artifactText) <= 32 * 1024 * 1024 &&
        createHash("sha256").update(input.artifactText).digest("hex") ===
          input.artifactHash,
      "Consent source hash mismatch or byte limit",
    );
    const a = JSON.parse(input.artifactText);
    shape(
      a,
      [
        "scope",
        "scenarioId",
        "region",
        "surface",
        "mode",
        "clockId",
        "window",
        "complete",
        "records",
      ],
      "consent artifact",
    );
    shape(a.scope, scopeKeys, "consent artifact scope");
    const s = scenarios.get(a.scenarioId);
    assert(
      s &&
        scopeKeys.every((k) => a.scope[k] === policy.scope[k]) &&
        a.region === s.region &&
        a.surface === s.surface &&
        a.mode === s.mode,
      "Consent source scope/mode mismatch",
    );
    shape(a.window, ["from", "to"], "source window");
    assert(
      a.window.from === s.window.from &&
        a.window.to === s.window.to &&
        textValue(a.clockId) &&
        typeof a.complete === "boolean" &&
        time(input.capturedAt) >= time(a.window.from),
      "Invalid consent source window/clock/capture",
    );
    assert(
      input.sourceKind === "manual" ||
        (a.surface === "client"
          ? input.sourceKind === "browser-trace"
          : input.sourceKind === "server-trace"),
      "Consent source surface mismatch",
    );
    assert(
      Array.isArray(a.records) && a.records.length <= 100000,
      "Invalid consent records",
    );
    let sequence = -1,
      at = -Infinity;
    const ids = new Set();
    for (const r of a.records) {
      const fields = {
        state: ["transition", "state"],
        request: [
          "category",
          "cookieless",
          "cookiesAttached",
          "identifiersPresent",
        ],
        storage: ["category", "operation"],
        tag: ["category", "operation"],
      };
      assert(
        typeof r?.kind === "string" && Object.hasOwn(fields, r.kind),
        "Invalid consent record kind",
      );
      shape(
        r,
        ["id", "sequence", "at", "kind", ...fields[r.kind]],
        "consent record",
      );
      assert(
        textValue(r.id) &&
          !ids.has(r.id) &&
          Number.isSafeInteger(r.sequence) &&
          r.sequence > sequence &&
          timestampValue(r.at) &&
          time(r.at) >= at &&
          time(r.at) >= time(a.window.from) &&
          time(r.at) < time(a.window.to) &&
          time(r.at) <= time(input.capturedAt),
        "Invalid consent record order/time/identity",
      );
      ids.add(r.id);
      sequence = r.sequence;
      at = time(r.at);
      if (r.kind === "state") {
        assert(
          transitions.includes(r.transition),
          "Invalid observed transition",
        );
        validateState(r.state, policy.categories);
      } else {
        assert(
          policy.categories.includes(r.category),
          "Unknown consent category",
        );
        if (r.kind === "request")
          assert(
            [r.cookieless, r.cookiesAttached, r.identifiersPresent].every(
              nullableBoolean,
            ),
            "Invalid request inspection",
          );
        if (r.kind === "storage")
          assert(
            ["read", "write", "delete"].includes(r.operation),
            "Invalid storage operation",
          );
        if (r.kind === "tag")
          assert(
            ["fired", "blocked"].includes(r.operation),
            "Invalid tag operation",
          );
      }
    }
    sources.push({
      input,
      artifact: a,
      envelopeDigest: enterpriseDigest(input),
    });
  }
  assert(
    new Set(sources.map((s) => s.input.synthetic)).size <= 1,
    "Mixed synthetic and real consent sources",
  );
  const checks = [];
  for (const s of policy.scenarios) {
    const candidates = sources.filter(
      (x) => x.artifact.scenarioId === s.scenarioId,
    );
    const check = {
      scenarioId: s.scenarioId,
      kind: s.kind,
      region: s.region,
      surface: s.surface,
      mode: s.mode,
      status: "unknown",
      violations: [],
      gaps: [],
      sourceIds: candidates.map((x) => x.input.sourceId),
    };
    checks.push(check);
    if (candidates.length !== 1) {
      check.gaps.push(
        candidates.length ? "overlapping-sources" : "missing-source",
      );
      continue;
    }
    const { input, artifact: a } = candidates[0];
    if (input.sourceKind === "manual") check.gaps.push("manual-source");
    if (
      time(input.capturedAt) + context.maxAgeSeconds * 1000 <=
      time(context.assessmentAt)
    )
      check.gaps.push("stale-source");
    if (!a.complete || time(input.capturedAt) < time(s.window.to))
      check.gaps.push("incomplete-capture");
    let state = null;
    let choiceSeen = false;
    const observed = [];
    for (const r of a.records) {
      if (r.kind === "state") {
        observed.push({ transition: r.transition, state: r.state });
        if (
          ["accept", "reject", "selective", "revoke", "persisted"].includes(
            r.transition,
          )
        )
          choiceSeen = true;
        state = r.state;
        continue;
      }
      if (r.kind === "tag" && r.operation === "blocked") continue;
      if (!state) {
        check.violations.push("activity-before-default");
        continue;
      }
      if (
        s.mode === "basic" &&
        !choiceSeen &&
        (r.kind === "request" || (r.kind === "tag" && r.operation === "fired"))
      ) {
        check.violations.push("basic-before-choice");
      }
      if (state[r.category] === "granted") continue;
      if (r.kind === "tag" && r.operation === "fired" && s.mode === "basic")
        check.violations.push("denied-tag");
      const rule = policy.deniedRules[r.category];
      if (
        r.kind === "storage" &&
        ((r.operation === "read" && !rule.storageRead) ||
          (r.operation === "write" && !rule.storageWrite))
      )
        check.violations.push("denied-storage");
      if (r.kind === "request") {
        if (s.mode === "basic" || rule.requests === "blocked")
          check.violations.push("denied-request");
        else {
          if (
            (rule.requests === "cookieless" && r.cookieless === null) ||
            (!rule.cookies && r.cookiesAttached === null) ||
            (!rule.identifiers && r.identifiersPresent === null)
          )
            check.gaps.push("incomplete-request-inspection");
          if (
            (rule.requests === "cookieless" && r.cookieless === false) ||
            (!rule.cookies && r.cookiesAttached === true) ||
            (!rule.identifiers && r.identifiersPresent === true)
          )
            check.violations.push("identified-denied-request");
        }
      }
    }
    if (enterpriseDigest(observed) !== enterpriseDigest(s.transitions))
      check.violations.push("transition-mismatch");
    check.violations = [...new Set(check.violations)];
    check.gaps = [...new Set(check.gaps)];
    check.status = check.gaps.length
      ? "unknown"
      : check.violations.length
        ? "fail"
        : "pass";
  }
  const missingKinds = kinds.filter(
    (k) => !policy.scenarios.some((s) => s.kind === k),
  );
  const dataRequests = [
    ...checks.flatMap((c) =>
      c.gaps.map((reason) => ({
        scenarioId: c.scenarioId,
        reason,
        instructions: `Supply scoped ${c.surface} trace for ${c.region}/${c.mode}; resolve ${reason} with complete ordered state, request inspection and storage evidence.`,
      })),
    ),
    ...missingKinds.map((kind) => ({
      kind,
      reason: "missing-scenario-kind",
      instructions: `Declare owner policy and capture ${kind} scenario, including region, surface, mode and expected state transitions.`,
    })),
  ];
  return {
    schemaVersion: 1,
    moduleId: "consent",
    policyId: policy.policyId,
    policyDigest: enterpriseDigest(policy),
    contextDigest: enterpriseDigest(context),
    assessmentAt: context.assessmentAt,
    status: checks.some((c) => c.status === "fail")
      ? "fail"
      : checks.some((c) => c.status === "unknown") || missingKinds.length
        ? "unknown"
        : "pass",
    checks,
    dataRequests,
    sourceBindings: sources.map((s) => ({
      sourceId: s.input.sourceId,
      artifactDigest: s.input.artifactHash,
      envelopeDigest: s.envelopeDigest,
      sourceKind: s.input.sourceKind,
      capturedAt: s.input.capturedAt,
    })),
    legalCompliance: "not-assessed",
    assessmentAccepted: false,
    providerAuthenticated: false,
    limitations: [
      "Technical comparison against supplied owner policy, not legal or provider compliance certification.",
      "Completeness, category classification and request inspection are source assertions requiring independent review.",
      "Missing matrix variants remain explicit; scenario-kind coverage does not prove all regions or journeys are covered.",
      "No consent UI or browser actions are executed; cross-clock order is not inferred.",
    ],
  };
}
