import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { enterpriseDigest, stableJson } from "./enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const shape = (x, keys, label) =>
  assert(
    object(x) &&
      Object.keys(x).every((k) => keys.includes(k)) &&
      keys.every((k) => Object.hasOwn(x, k)),
    `Invalid ${label}`,
  );
const id = (x) => typeof x === "string" && /^[a-z][a-z0-9-]{0,127}$/.test(x);
const hash = (x) => createHash("sha256").update(x).digest("hex");
const date = (x) => {
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
const url = (x) => {
  assert(typeof x === "string", "Invalid target URL");
  const u = new URL(x);
  assert(
    ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.hash &&
      u.href === x,
    "Invalid canonical target URL",
  );
  return x;
};
const viewport = (x) => {
  shape(x, ["width", "height"], "viewport");
  for (const k of ["width", "height"])
    assert(
      Number.isInteger(x[k]) && x[k] > 0 && x[k] <= 100000,
      "Invalid viewport dimension",
    );
};
const categories = ["violations", "passes", "incomplete", "inapplicable"];
function validateContext(c) {
  shape(
    c,
    [
      "customerId",
      "entityId",
      "environment",
      "targetUrl",
      "stateId",
      "viewport",
      "assessmentAt",
      "maxAgeSeconds",
      "expectedRuleIds",
    ],
    "context",
  );
  for (const k of ["customerId", "entityId", "environment", "stateId"])
    assert(id(c[k]), "Invalid context identifier");
  url(c.targetUrl);
  viewport(c.viewport);
  date(c.assessmentAt);
  assert(
    Number.isInteger(c.maxAgeSeconds) &&
      c.maxAgeSeconds >= 0 &&
      c.maxAgeSeconds <= 31622400,
    "Invalid freshness",
  );
  assert(
    Array.isArray(c.expectedRuleIds) &&
      c.expectedRuleIds.length > 0 &&
      c.expectedRuleIds.length <= 1000 &&
      c.expectedRuleIds.every(id) &&
      new Set(c.expectedRuleIds).size === c.expectedRuleIds.length,
    "Invalid expected rules",
  );
}
function boundedJson(text) {
  let nodes = 0;
  const parsed = JSON.parse(text);
  const visit = (v, depth) => {
    assert(++nodes <= 200000 && depth <= 40, "JSON complexity limit");
    if (v && typeof v === "object")
      for (const x of Object.values(v)) visit(x, depth + 1);
  };
  visit(parsed, 0);
  return parsed;
}
function selector(x, depth = 0) {
  assert(depth <= 8, "Selector depth limit");
  if (typeof x === "string") {
    assert(x.length > 0 && x.length <= 8192, "Invalid selector string");
    return;
  }
  assert(
    Array.isArray(x) && x.length > 0 && x.length <= 1000,
    "Invalid selector",
  );
  for (const v of x) selector(v, depth + 1);
}
/** Native supplied exports only. No execution, page coverage or WCAG conformance authority. */
export function normalizeAxe(input, context) {
  validateContext(context);
  shape(
    input,
    [
      "sourceId",
      "sourceKind",
      "scope",
      "capturedAt",
      "artifactText",
      "artifactHash",
    ],
    "source envelope",
  );
  assert(
    id(input.sourceId) && input.sourceKind === "axe-results",
    "Invalid source identity",
  );
  shape(
    input.scope,
    ["customerId", "entityId", "environment", "stateId", "viewport"],
    "source scope",
  );
  viewport(input.scope.viewport);
  for (const k of [
    "customerId",
    "entityId",
    "environment",
    "stateId",
    "viewport",
  ])
    assert(
      stableJson(input.scope[k]) === stableJson(context[k]),
      "Source scope mismatch",
    );
  assert(
    typeof input.artifactText === "string" &&
      Buffer.byteLength(input.artifactText) <= 8 * 1024 * 1024,
    "Artifact byte limit",
  );
  assert(
    typeof input.artifactHash === "string" &&
      /^[a-f0-9]{64}$/.test(input.artifactHash) &&
      hash(input.artifactText) === input.artifactHash,
    "Artifact hash mismatch",
  );
  const raw = boundedJson(input.artifactText);
  assert(
    object(raw) &&
      object(raw.testEngine) &&
      typeof raw.testEngine.name === "string" &&
      typeof raw.testEngine.version === "string" &&
      /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(
        raw.testEngine.version,
      ) &&
      raw.testEngine.version.length <= 64 &&
      /^[a-z][a-z0-9-]{0,63}$/.test(raw.testEngine.name),
    "Invalid engine",
  );
  assert(url(raw.url) === context.targetUrl, "Native target mismatch");
  const observed = date(raw.timestamp),
    captured = date(input.capturedAt),
    assessed = date(context.assessmentAt);
  assert(observed <= captured && captured <= assessed, "Invalid chronology");
  assert(
    object(raw.testEnvironment) &&
      typeof raw.testEnvironment.userAgent === "string" &&
      raw.testEnvironment.userAgent.length > 0 &&
      raw.testEnvironment.userAgent.length <= 8192,
    "Invalid browser environment",
  );
  assert(
    raw.testEnvironment.windowWidth === context.viewport.width &&
      raw.testEnvironment.windowHeight === context.viewport.height,
    "Native viewport mismatch",
  );
  assert(object(raw.toolOptions), "Missing tool options");
  const normalized = {};
  for (const category of categories) {
    assert(
      Array.isArray(raw[category]) && raw[category].length <= 1000,
      "Missing or invalid native category",
    );
    const seen = new Set();
    normalized[category] = raw[category]
      .map((rule) => {
        assert(
          object(rule) && id(rule.id) && !seen.has(rule.id),
          "Invalid or duplicate rule",
        );
        seen.add(rule.id);
        assert(
          rule.error === undefined ||
            (category === "incomplete" && object(rule.error)),
          "Contradictory native rule error",
        );
        assert(
          raw.toolOptions.rules?.[rule.id]?.enabled !== false,
          "Disabled rule present in results",
        );
        assert(
          Array.isArray(rule.tags) &&
            rule.tags.length <= 100 &&
            rule.tags.every((t) => typeof t === "string" && t.length <= 256),
          "Invalid tags",
        );
        assert(
          Array.isArray(rule.nodes) && rule.nodes.length <= 10000,
          "Invalid nodes",
        );
        if (["passes", "violations"].includes(category))
          assert(rule.nodes.length > 0, "Empty asserted rule result");
        const nodes = rule.nodes
          .map((node) => {
            assert(object(node), "Invalid node");
            assert(
              node.html == null || typeof node.html === "string",
              "Invalid node HTML",
            );
            if (node.target !== undefined) {
              assert(Array.isArray(node.target), "Invalid node target");
              selector(node.target);
            }
            for (const k of ["any", "all", "none"]) {
              assert(Array.isArray(node[k]), "Invalid native checks");
              for (const check of node[k])
                assert(
                  object(check) &&
                    id(check.id) &&
                    typeof check.message === "string" &&
                    (check.impact === null ||
                      ["minor", "moderate", "serious", "critical"].includes(
                        check.impact,
                      )),
                  "Invalid native check item",
                );
            }
            return {
              targetDigest:
                node.target === undefined
                  ? null
                  : enterpriseDigest(node.target),
              htmlDigest: node.html == null ? null : hash(node.html),
            };
          })
          .sort((a, b) => stableJson(a).localeCompare(stableJson(b)));
        return {
          ruleId: rule.id,
          reportedNodeCount: nodes.length,
          nodes,
          tagsDigest: enterpriseDigest(rule.tags),
          errorPresent: rule.error !== undefined,
        };
      })
      .sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  }
  const validUntil = new Date(
    observed + context.maxAgeSeconds * 1000,
  ).toISOString();
  const supported =
    raw.testEngine.name === "axe-core" && raw.testEngine.version === "4.14.1";
  const scopeDigest = enterpriseDigest([
    context.customerId,
    context.entityId,
    context.environment,
    context.targetUrl,
    context.stateId,
    context.viewport,
    "reported-tested-elements",
  ]);
  const optionsDigest = enterpriseDigest([
    raw.toolOptions,
    raw.testEnvironment,
    raw.testEngine,
  ]);
  const result = {
    sourceId: input.sourceId,
    artifactHash: input.artifactHash,
    engineVersion: raw.testEngine.version,
    supported,
    observedAt: raw.timestamp,
    validUntil,
    eligible: supported && assessed < Date.parse(validUntil),
    scopeDigest,
    optionsDigest,
    categories: normalized,
    coverage: "reported-tested-elements",
    configurationProvenance: "unknown",
    scanContextDigest: null,
  };
  return {
    ...result,
    measurementId: enterpriseDigest([
      scopeDigest,
      optionsDigest,
      raw.timestamp,
      normalized,
    ]),
  };
}
export function evaluateAxe(context, inputs) {
  validateContext(context);
  assert(Array.isArray(inputs) && inputs.length <= 100, "Source count limit");
  assert(
    inputs.reduce(
      (n, s) =>
        n +
        (typeof s?.artifactText === "string"
          ? Buffer.byteLength(s.artifactText)
          : 0),
      0,
    ) <=
      16 * 1024 * 1024,
    "Bundle byte limit",
  );
  const ids = new Set();
  for (const s of inputs) {
    assert(!ids.has(s.sourceId), "Duplicate source ID");
    ids.add(s.sourceId);
  }
  const records = inputs
    .map((s) => normalizeAxe(s, context))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const current = records.filter((r) => r.eligible);
  const checks = [...context.expectedRuleIds].sort().map((ruleId) => {
    const outcomes = current.map((r) => {
      const found = categories.filter((c) =>
        r.categories[c].some((x) => x.ruleId === ruleId),
      );
      return {
        sourceId: r.sourceId,
        status: found.includes("violations")
          ? "fail"
          : found.includes("incomplete")
            ? "unknown"
            : found.includes("passes")
              ? "pass"
              : "unknown",
      };
    });
    const conflict = new Set(outcomes.map((x) => x.status)).size > 1;
    const configMismatch =
      new Set(current.map((r) => r.optionsDigest)).size > 1;
    const status =
      !outcomes.length || conflict || configMismatch
        ? "unknown"
        : outcomes[0].status;
    const reason = !outcomes.length
      ? "missing-current-supported-evidence"
      : configMismatch
        ? "configuration-populations-differ"
        : conflict
          ? "conflicting-reported-outcomes"
          : status === "unknown"
            ? "rule-not-assessed-or-incomplete"
            : "reported-automated-" + status;
    return {
      ruleId,
      status,
      reason,
      sourceIds: outcomes.map((x) => x.sourceId),
      coverage: "reported-tested-elements",
      identityDigest: enterpriseDigest([
        "axe-reported-rule-v1",
        context.customerId,
        context.entityId,
        context.environment,
        context.targetUrl,
        context.stateId,
        context.viewport,
        ruleId,
      ]),
    };
  });
  const request = (reason) => ({
    reason,
    targetUrl: context.targetUrl,
    stateId: context.stateId,
    viewport: context.viewport,
    ownerRole: "accessibility-owner",
    acceptedFormat:
      "Native axe-core 4.14.1 full JSON plus original invocation context and effective configuration provenance",
    exportInstructions:
      "Include URL, state, viewport, expected rule IDs, all four result categories, scan timestamp and exclusions. Retain raw bytes privately. Do not send credentials.",
    fallback:
      "Arrange a scoped manual review and retain unknown coverage; continue other modules.",
  });
  return {
    records,
    checks,
    uniqueMeasurementCount: new Set(records.map((r) => r.measurementId)).size,
    dataRequests: [
      {
        ...request("scan-context-unproven"),
        expectedRuleIds: [...context.expectedRuleIds].sort(),
      },
      ...records
        .filter((r) =>
          categories.some((c) =>
            r.categories[c].some((rule) =>
              rule.nodes.some(
                (n) => n.targetDigest === null || n.htmlDigest === null,
              ),
            ),
          ),
        )
        .map((r) => ({
          ...request("node-details-missing"),
          sourceIds: [r.sourceId],
          expectedRuleIds: [...context.expectedRuleIds].sort(),
        })),
      ...checks
        .filter((c) => c.status === "unknown")
        .map((c) => ({ ...request(c.reason), expectedRuleIds: [c.ruleId] })),
    ],
    coverage: "unknown",
    conformanceAssessed: false,
    executionAuthenticated: false,
  };
}
