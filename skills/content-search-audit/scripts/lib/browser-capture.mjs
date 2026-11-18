import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { timestampValue, textValue } from "./enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const shape = (x, keys, label) =>
  assert(
    x &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.keys(x).every((k) => keys.includes(k)),
    "Invalid " + label,
  );
const integer = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;
const strings = (x, max) =>
  Array.isArray(x) &&
  x.length <= max &&
  x.every((v) => typeof v === "string" && v.length > 0 && v.length <= 1000);
/** Validate supplied capture bytes and scope. Integrity is not collector/provider authentication. */
export function normalizeBrowserCapture(input, context) {
  shape(
    input,
    [
      "sourceId",
      "artifactText",
      "artifactHash",
      "expectedPlanDigest",
      "maxAgeSeconds",
    ],
    "browser envelope",
  );
  assert(
    textValue(input.sourceId) &&
      typeof input.artifactText === "string" &&
      Buffer.byteLength(input.artifactText) <= 8 * 1024 * 1024 &&
      hash(input.artifactHash) &&
      createHash("sha256").update(input.artifactText).digest("hex") ===
        input.artifactHash &&
      hash(input.expectedPlanDigest),
    "Invalid browser source/hash/plan binding",
  );
  assert(
    Number.isSafeInteger(input.maxAgeSeconds) &&
      input.maxAgeSeconds > 0 &&
      input.maxAgeSeconds <= 366 * 86400 &&
      timestampValue(context.assessmentAt),
    "Invalid browser freshness",
  );
  const c = JSON.parse(input.artifactText);
  shape(
    c,
    [
      "schemaVersion",
      "synthetic",
      "browserVersion",
      "status",
      "scope",
      "planDigest",
      "startedAt",
      "finishedAt",
      "initialUrlDigest",
      "finalUrlDigest",
      "dom",
      "observations",
      "transport",
      "transportTelemetry",
      "gaps",
      "coverage",
      "limitations",
    ],
    "browser capture",
  );
  assert(
    c.schemaVersion === 1 &&
      typeof c.synthetic === "boolean" &&
      c.status === "partial" &&
      (c.browserVersion === null ||
        (typeof c.browserVersion === "string" &&
          /^\d+(?:\.\d+){1,3}$/.test(c.browserVersion))) &&
      c.planDigest === input.expectedPlanDigest &&
      hash(c.initialUrlDigest) &&
      (c.finalUrlDigest === null || hash(c.finalUrlDigest)),
    "Invalid browser capture identity",
  );
  shape(c.scope, ["customerId", "assetId", "environment"], "browser scope");
  assert(
    c.scope.customerId === context.customerId &&
      c.scope.assetId === context.entityId &&
      c.scope.environment === context.environment &&
      Object.values(c.scope).every(textValue),
    "Browser capture scope mismatch",
  );
  assert(
    timestampValue(c.startedAt) &&
      timestampValue(c.finishedAt) &&
      Date.parse(c.startedAt) <= Date.parse(c.finishedAt) &&
      Date.parse(c.finishedAt) <= Date.parse(context.assessmentAt),
    "Invalid/future browser capture window",
  );
  assert(
    strings(c.gaps, 100) &&
      new Set(c.gaps).size === c.gaps.length &&
      strings(c.limitations, 50),
    "Invalid browser gaps/limitations",
  );
  shape(
    c.coverage,
    ["dataLayer", "network", "tag", "consent", "provider", "business"],
    "browser coverage",
  );
  assert(
    c.coverage.dataLayer === "partial" &&
      c.coverage.network === "partial" &&
      ["tag", "consent", "provider", "business"].every(
        (k) => c.coverage[k] === "unobserved",
      ),
    "Unsupported browser coverage claim",
  );
  if (c.dom !== null) {
    shape(
      c.dom,
      ["lang", "titleLength", "clientWidth", "scrollWidth"],
      "browser DOM",
    );
    assert(
      typeof c.dom.lang === "string" &&
        c.dom.lang.length <= 128 &&
        ["titleLength", "clientWidth", "scrollWidth"].every((k) =>
          integer(c.dom[k], 1000000),
        ),
      "Invalid browser DOM measurements",
    );
  }
  assert(
    Array.isArray(c.observations) && c.observations.length <= 2000,
    "Invalid browser observations",
  );
  let previous = -Infinity;
  c.observations.forEach((o, i) => {
    const layer = o?.kind === "data-layer";
    shape(
      o,
      layer
        ? ["kind", "eventName", "sequence", "observedAt"]
        : [
            "kind",
            "urlDigest",
            "method",
            "httpStatus",
            "sequence",
            "observedAt",
          ],
      "browser observation",
    );
    assert(
      ["data-layer", "blocked", "response", "request-failed"].includes(
        o.kind,
      ) &&
        o.sequence === i &&
        timestampValue(o.observedAt) &&
        Date.parse(o.observedAt) >= Date.parse(c.startedAt) &&
        Date.parse(o.observedAt) <= Date.parse(c.finishedAt) &&
        Date.parse(o.observedAt) >= previous,
      "Invalid browser observation order/window",
    );
    previous = Date.parse(o.observedAt);
    if (layer)
      assert(
        typeof o.eventName === "string" &&
          /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(o.eventName),
        "Invalid browser event name",
      );
    else {
      assert(
        hash(o.urlDigest) &&
          typeof o.method === "string" &&
          /^[A-Z][A-Z0-9_-]{0,31}$/.test(o.method),
        "Invalid browser request identity",
      );
      if (o.kind === "response")
        assert(["GET", "HEAD"].includes(o.method), "Non-read browser response");
      assert(
        o.kind === "response"
          ? Number.isInteger(o.httpStatus) &&
              o.httpStatus >= 100 &&
              o.httpStatus <= 599
          : o.httpStatus === undefined,
        "Invalid browser HTTP status",
      );
    }
  });
  assert(
    Array.isArray(c.transport) && c.transport.length <= 1000,
    "Invalid browser transport events",
  );
  for (const e of c.transport) {
    shape(e, ["kind", "targetDigest", "reason"], "browser transport event");
    assert(
      ["allowed", "blocked"].includes(e.kind) &&
        hash(e.targetDigest) &&
        textValue(e.reason) &&
        e.reason.length <= 100,
      "Invalid browser transport event",
    );
  }
  if (c.transportTelemetry !== null) {
    shape(
      c.transportTelemetry,
      ["admissionAttempts", "droppedEvents"],
      "browser transport telemetry",
    );
    assert(
      integer(
        c.transportTelemetry.admissionAttempts,
        Number.MAX_SAFE_INTEGER,
      ) && integer(c.transportTelemetry.droppedEvents, Number.MAX_SAFE_INTEGER),
      "Invalid browser transport counts",
    );
    assert(
      !c.transportTelemetry.droppedEvents ||
        c.gaps.includes("transport-events-truncated"),
      "Unreported browser transport truncation",
    );
  } else
    assert(c.transport.length === 0, "Missing browser transport telemetry");
  for (const [present, gap] of [
    [c.observations.some((o) => o.kind === "blocked"), "request-blocked"],
    [c.observations.some((o) => o.kind === "request-failed"), "request-failed"],
    [c.transport.some((e) => e.kind === "blocked"), "transport-denied"],
  ])
    assert(!present || c.gaps.includes(gap), "Missing browser gap: " + gap);
  const validUntil = new Date(
    Date.parse(c.finishedAt) + input.maxAgeSeconds * 1000,
  ).toISOString();
  return {
    capture: c,
    artifactHash: input.artifactHash,
    validUntil,
    fresh: Date.parse(validUntil) > Date.parse(context.assessmentAt),
    authenticated: false,
  };
}
