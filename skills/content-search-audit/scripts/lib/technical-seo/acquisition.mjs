import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../enterprise-state.mjs";
import { parseCaptureJson } from "./strict-json.mjs";
import { evaluateCanonicalCapture } from "./canonical.mjs";
import { evaluateIndexControls } from "./index-controls.mjs";
import { evaluateHreflangCapture } from "./hreflang.mjs";
import { evaluateStructuredData } from "./structured-data.mjs";
const scopeKeys = [
  "customerId",
  "entityId",
  "environment",
  "targetUrl",
  "profileId",
  "stateId",
];
const kinds = ["canonical", "index-controls", "hreflang", "structured-data"];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
function shape(value, required, optional = []) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) =>
        [...required, ...optional].includes(key),
      ),
    "Invalid acquisition record fields",
  );
}
const label = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value);
function time(value) {
  assert(timestampValue(value), "Invalid acquisition timestamp");
  return Date.parse(value);
}
function validateTarget(target) {
  shape(target, [
    "targetId",
    "kind",
    "scope",
    "method",
    "window",
    "maxAgeSeconds",
  ]);
  assert(
    label(target.targetId) && kinds.includes(target.kind),
    "Invalid acquisition target",
  );
  shape(target.scope, scopeKeys);
  for (const key of scopeKeys.filter((key) => key !== "targetUrl"))
    assert(label(target.scope[key]), "Invalid target scope");
  const url = new URL(target.scope.targetUrl);
  assert(
    ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !target.scope.targetUrl.includes("#") &&
      url.href === target.scope.targetUrl,
    "Invalid target URL",
  );
  assert(
    ["canonical", "index-controls"].includes(target.kind)
      ? target.method === null
      : ["html-source", "html-rendered"].includes(target.method),
    "Invalid acquisition method",
  );
  shape(target.window, ["from", "to"]);
  assert(
    time(target.window.from) < time(target.window.to),
    "Invalid acquisition window",
  );
  assert(
    Number.isSafeInteger(target.maxAgeSeconds) &&
      target.maxAgeSeconds >= 0 &&
      target.maxAgeSeconds <= 31622400,
    "Invalid acquisition age budget",
  );
}
function readSource(source) {
  shape(source, ["sourceId", "artifactText", "artifactHash"]);
  assert(
    label(source.sourceId) &&
      typeof source.artifactText === "string" &&
      Buffer.byteLength(source.artifactText) <= 2 * 1024 * 1024 &&
      createHash("sha256").update(source.artifactText).digest("hex") ===
        source.artifactHash,
    "Invalid capture envelope or hash",
  );
  return parseCaptureJson(source.artifactText);
}
/** Pure attribution adapter. Does not collect, authorize, persist or accept a semantic audit. */
export function normalizeTechnicalSeoAttempt(input) {
  shape(input, ["target", "attempt", "assessmentAt"]);
  const { target, attempt, assessmentAt } = input;
  validateTarget(target);
  const at = time(assessmentAt);
  assert(time(target.window.to) <= at, "Observation window not complete");
  shape(attempt, ["attemptId", "collectorVersion", "result"]);
  assert(
    label(attempt.attemptId) && label(attempt.collectorVersion),
    "Invalid acquisition attempt identity",
  );
  const result = attempt.result;
  shape(
    result,
    [
      "status",
      "synthetic",
      "scope",
      "startedAt",
      "finishedAt",
      "gaps",
      "executionAuthenticated",
      "semanticAcceptance",
    ],
    [
      "source",
      "sources",
      "privateEvidence",
      "browserVersion",
      "transportSummary",
    ],
  );
  assert(
    ["captured", "unknown"].includes(result.status) &&
      typeof result.synthetic === "boolean" &&
      result.executionAuthenticated === false &&
      result.semanticAcceptance === false,
    "Invalid acquisition status or authority",
  );
  assert(
    stableJson(result.scope) === stableJson(target.scope),
    "Acquisition scope mismatch",
  );
  const start = time(result.startedAt),
    finish = time(result.finishedAt);
  assert(
    start <= finish && finish <= at,
    "Invalid or future acquisition attempt",
  );
  assert(
    Array.isArray(result.gaps) &&
      result.gaps.length <= 64 &&
      new Set(result.gaps).size === result.gaps.length &&
      result.gaps.every(
        (gap) => typeof gap === "string" && /^[a-z][a-z0-9-]{0,127}$/.test(gap),
      ),
    "Invalid acquisition gap codes",
  );
  let capture = null,
    captureObservedAt = null,
    captureValidUntil = null;
  let reason = "capture-unavailable";
  if (result.status === "unknown") {
    assert(
      !Object.hasOwn(result, "source") && !Object.hasOwn(result, "sources"),
      "Failed attempt cannot contain a capture",
    );
  } else {
    const methodCapture = target.method !== null;
    assert(
      methodCapture
        ? !Object.hasOwn(result, "source") &&
            Array.isArray(result.sources) &&
            result.sources.length > 0 &&
            result.sources.length <= 2
        : !Object.hasOwn(result, "sources") && Object.hasOwn(result, "source"),
      "Invalid capture population",
    );
    const candidates = methodCapture ? result.sources : [result.source];
    const parsed = candidates.map((source) => ({
      source,
      raw: readSource(source),
    }));
    if (methodCapture) {
      assert(
        parsed.every(({ raw }) =>
          ["html-source", "html-rendered"].includes(raw.method),
        ) &&
          new Set(parsed.map(({ raw }) => raw.method)).size === parsed.length,
        "Invalid or duplicate capture method",
      );
    }
    const validated = parsed.map(({ source, raw }) => {
      const context = {
        ...target.scope,
        assessmentAt,
        maxAgeSeconds: target.maxAgeSeconds,
      };
      let evaluated;
      if (target.kind === "canonical")
        evaluated = evaluateCanonicalCapture(
          { ...context, expectedCanonical: null },
          source,
        );
      else if (target.kind === "index-controls")
        evaluated = evaluateIndexControls(
          {
            ...context,
            crawler: "googlebot",
            expectedCrawlAllowed: null,
            expectedIndexable: null,
            expectedHttpStatus: null,
          },
          source,
        );
      else if (target.kind === "hreflang") {
        assert(
          raw.schemaVersion === 1 &&
            Array.isArray(raw.pages) &&
            raw.pages.length === 1 &&
            raw.pages[0].url === target.scope.targetUrl,
          "Acquisition requires one scoped root page",
        );
        evaluated = evaluateHreflangCapture(
          { ...context, method: raw.method },
          source,
        );
      } else
        evaluated = evaluateStructuredData(
          { ...context, method: raw.method, expectedTypes: null },
          source,
        );
      const observed = evaluated.capturedAt;
      const observations =
        target.kind === "index-controls"
          ? [observed, evaluated.observation.robotsCapturedAt]
          : [observed];
      for (const observation of observations) {
        const observedMs = time(observation);
        assert(
          observedMs >= start && observedMs <= finish,
          "Capture outside acquisition attempt",
        );
        assert(
          observedMs >= time(target.window.from) &&
            observedMs < time(target.window.to),
          "Capture outside observation window",
        );
      }
      return { source, raw, evaluated, observed, observations };
    });
    const selected = validated.find(
      ({ raw }) => !methodCapture || raw.method === target.method,
    );
    reason = "requested-method-unavailable";
    if (selected) {
      const { source, evaluated, observed, observations } = selected;
      capture = globalThis.structuredClone(source);
      captureObservedAt = observed;
      captureValidUntil = new Date(
        Math.min(
          ...observations.map(
            (value) => time(value) + target.maxAgeSeconds * 1000,
          ),
        ),
      ).toISOString();
      reason = result.synthetic
        ? "synthetic-capture"
        : result.gaps.some((gap) =>
              [
                "redirected-scope",
                "response-status-not-200",
                "navigation-binding-unavailable",
                "response-unavailable",
                "authorization-ended",
                "collection-deadline",
                "collection-incomplete",
              ].includes(gap),
            )
          ? "collection-scope-or-response-unavailable"
          : target.method === "html-rendered" &&
              result.gaps.includes("rendered-environment-incomplete")
            ? "rendered-capture-unavailable"
            : at >= time(captureValidUntil)
              ? "expired-capture"
              : target.kind === "index-controls" &&
                  (!evaluated.observation.responseMatchesTarget ||
                    evaluated.observation.httpStatus !== 200)
                ? "response-not-direct-success"
                : "supplied-capture-available";
    }
  }
  const retainedResult = Object.fromEntries(
    [
      "status",
      "synthetic",
      "scope",
      "startedAt",
      "finishedAt",
      "gaps",
      "executionAuthenticated",
      "semanticAcceptance",
      "source",
      "sources",
    ]
      .filter((key) => Object.hasOwn(result, key))
      .map((key) => [key, globalThis.structuredClone(result[key])]),
  );
  const sourceRecord = {
    target: globalThis.structuredClone(target),
    attempt: {
      attemptId: attempt.attemptId,
      collectorVersion: attempt.collectorVersion,
      result: retainedResult,
    },
  };
  return {
    sourceRecord,
    sourceDigest: enterpriseDigest(sourceRecord),
    assessmentAt,
    target: globalThis.structuredClone(target),
    targetDigest: enterpriseDigest(target),
    attemptId: attempt.attemptId,
    collectorVersion: attempt.collectorVersion,
    status: result.status,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    synthetic: result.synthetic,
    gaps: [...result.gaps],
    capture,
    captureObservedAt,
    captureValidUntil,
    availability: {
      status: reason === "supplied-capture-available" ? "pass" : "unknown",
      reason,
    },
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
}
