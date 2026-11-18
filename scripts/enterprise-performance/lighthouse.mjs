import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import {
  enterpriseDigest,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

const SUPPORTED_VERSION = "13.6.0";
const names = {
  lcp: "largest-contentful-paint",
  fcp: "first-contentful-paint",
  tbt: "total-blocking-time",
  cls: "cumulative-layout-shift",
  speedIndex: "speed-index",
};
const assert = (v, m) => {
  if (!v) throw Error(m);
};
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const shape = (x, keys, label) =>
  assert(
    object(x) && Object.keys(x).every((k) => keys.includes(k)),
    `Invalid ${label}`,
  );
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const finite = (x) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1e12;
function url(x) {
  assert(typeof x === "string" && x.length <= 4096, "Invalid Lighthouse URL");
  const u = new URL(x);
  assert(
    ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.hash &&
      u.href === x,
    "Invalid/noncanonical Lighthouse URL",
  );
  return x;
}
function boundedTree(x) {
  const pending = [[x, 0]];
  let count = 0;
  while (pending.length) {
    const [value, depth] = pending.pop();
    assert(
      ++count <= 200000 && depth <= 40,
      "Lighthouse JSON complexity exceeded",
    );
    if (value && typeof value === "object")
      for (const child of Object.values(value))
        pending.push([child, depth + 1]);
  }
}
function validateContext(c) {
  shape(
    c,
    [
      "customerId",
      "entityId",
      "environment",
      "targetUrl",
      "formFactor",
      "assessmentAt",
      "window",
      "maxAgeSeconds",
      "protocolDigest",
    ],
    "lab context",
  );
  assert(
    [c.customerId, c.entityId, c.environment].every(id),
    "Invalid lab identity",
  );
  url(c.targetUrl);
  shape(c.window, ["from", "to"], "lab window");
  assert(
    [c.assessmentAt, c.window.from, c.window.to].every(timestampValue) &&
      Date.parse(c.window.from) < Date.parse(c.window.to) &&
      Date.parse(c.window.to) <= Date.parse(c.assessmentAt),
    "Invalid lab assessment/window",
  );
  assert(
    ["mobile", "desktop"].includes(c.formFactor) &&
      hash(c.protocolDigest) &&
      Number.isSafeInteger(c.maxAgeSeconds) &&
      c.maxAgeSeconds > 0 &&
      c.maxAgeSeconds <= 366 * 86400,
    "Invalid lab protocol/device/freshness",
  );
}
function settings(lhr, issues) {
  const s = lhr.configSettings;
  if (!object(s)) {
    issues.push("missing-configuration");
    return null;
  }
  if (!["mobile", "desktop"].includes(s.formFactor))
    issues.push("missing-or-unsupported-form-factor");
  if (!["simulate", "devtools", "provided"].includes(s.throttlingMethod))
    issues.push("missing-or-unsupported-throttling-method");
  const required =
    s.throttlingMethod === "simulate"
      ? ["rttMs", "throughputKbps", "cpuSlowdownMultiplier"]
      : [
          "requestLatencyMs",
          "downloadThroughputKbps",
          "uploadThroughputKbps",
          "cpuSlowdownMultiplier",
        ];
  if (
    !object(s.throttling) ||
    required.some((k) => !finite(s.throttling[k])) ||
    s.throttling.cpuSlowdownMultiplier < 1 ||
    (s.throttlingMethod === "simulate" && s.throttling.throughputKbps === 0)
  )
    issues.push("incomplete-throttling-settings");
  if (s.throttlingMethod === "provided")
    issues.push("external-throttling-unverified");
  const screen = s.screenEmulation;
  if (
    !object(screen) ||
    typeof screen.disabled !== "boolean" ||
    typeof screen.mobile !== "boolean" ||
    ![screen.width, screen.height, screen.deviceScaleFactor].every(finite) ||
    ![screen.width, screen.height].every(
      (x) => Number.isSafeInteger(x) && x <= 10000000,
    )
  )
    issues.push("incomplete-screen-emulation");
  else if (
    screen.disabled ||
    screen.width === 0 ||
    screen.height === 0 ||
    screen.deviceScaleFactor === 0
  )
    issues.push("external-screen-emulation-unverified");
  if (typeof s.disableStorageReset !== "boolean")
    issues.push("missing-storage-reset-setting");
  const env = lhr.environment;
  if (
    !object(env) ||
    [env.hostUserAgent, env.networkUserAgent].some(
      (x) => typeof x !== "string" || x.length === 0 || x.length > 2048,
    )
  )
    issues.push("missing-browser-environment");
  // Full settings digest avoids pooling different unprojected options (headers, blocked URLs, etc.).
  return {
    formFactor: s.formFactor ?? null,
    throttlingMethod: s.throttlingMethod ?? null,
    configurationDigest: enterpriseDigest(s),
    browserDigest: object(env)
      ? enterpriseDigest([
          env.hostUserAgent ?? null,
          env.networkUserAgent ?? null,
        ])
      : null,
  };
}

/** Supplied LHR bytes only. Unknown versions remain visible but cannot yield assessed metrics. */
export function normalizeLighthouse(input, context) {
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
    "Lighthouse envelope",
  );
  shape(
    input.scope,
    ["customerId", "entityId", "environment"],
    "Lighthouse scope",
  );
  assert(
    ["customerId", "entityId", "environment"].every(
      (k) => input.scope[k] === context[k],
    ),
    "Lighthouse scope mismatch",
  );
  assert(
    id(input.sourceId) &&
      input.sourceKind === "lighthouse-json" &&
      typeof input.artifactText === "string" &&
      Buffer.byteLength(input.artifactText) <= 16 * 1024 * 1024 &&
      hash(input.artifactHash) &&
      sha(input.artifactText) === input.artifactHash,
    "Invalid Lighthouse source/hash/size",
  );
  assert(
    timestampValue(input.capturedAt) &&
      Date.parse(input.capturedAt) <= Date.parse(context.assessmentAt),
    "Invalid Lighthouse capture time",
  );
  const lhr = JSON.parse(input.artifactText);
  boundedTree(lhr);
  assert(
    object(lhr) &&
      typeof lhr.lighthouseVersion === "string" &&
      /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(lhr.lighthouseVersion) &&
      lhr.lighthouseVersion.length <= 64,
    "Invalid Lighthouse version",
  );
  assert(
    timestampValue(lhr.fetchTime) &&
      Date.parse(lhr.fetchTime) <= Date.parse(input.capturedAt),
    "Invalid Lighthouse fetch time",
  );
  const base = {
    sourceId: input.sourceId,
    artifactHash: input.artifactHash,
    capturedAt: input.capturedAt,
    fetchTime: lhr.fetchTime,
    lighthouseVersion: lhr.lighthouseVersion,
    authenticated: false,
  };
  if (lhr.lighthouseVersion !== SUPPORTED_VERSION)
    return {
      ...base,
      status: "unsupported",
      issues: ["unsupported-version"],
      metrics: {},
      groupId: null,
      measurementId: enterpriseDigest([
        "unsupported-lhr-v1",
        lhr.lighthouseVersion,
        lhr.fetchTime,
        input.artifactHash,
      ]),
    };
  if (lhr.gatherMode !== "navigation")
    return {
      ...base,
      status: "unsupported",
      issues: ["unsupported-gather-mode"],
      metrics: {},
      groupId: null,
      measurementId: enterpriseDigest([
        "unsupported-lhr-v1",
        lhr.lighthouseVersion,
        lhr.fetchTime,
        input.artifactHash,
      ]),
    };
  assert(
    url(lhr.requestedUrl) === context.targetUrl,
    "Lighthouse requested target mismatch",
  );
  let runtimeError = null;
  if (Object.hasOwn(lhr, "runtimeError")) {
    assert(
      object(lhr.runtimeError) &&
        id(lhr.runtimeError.code) &&
        typeof lhr.runtimeError.message === "string" &&
        lhr.runtimeError.message.length <= 8192,
      "Invalid Lighthouse runtime error",
    );
    runtimeError = {
      code: lhr.runtimeError.code,
      messageDigest: sha(lhr.runtimeError.message),
    };
  }
  function documentUrl(value) {
    if (!runtimeError) return url(value);
    assert(
      value === undefined ||
        value === null ||
        (typeof value === "string" && value.length <= 4096),
      "Invalid failed-document URL",
    );
    try {
      return url(value);
    } catch {
      return null;
    }
  }
  const finalDisplayedUrl = documentUrl(lhr.finalDisplayedUrl),
    mainDocumentUrl = documentUrl(lhr.mainDocumentUrl);
  const failedDocumentDigests = runtimeError
    ? [lhr.finalDisplayedUrl, lhr.mainDocumentUrl].map((x) =>
        typeof x === "string" ? sha(x) : null,
      )
    : null;
  if (Object.hasOwn(lhr, "finalUrl") && !runtimeError)
    assert(
      lhr.finalUrl === mainDocumentUrl,
      "Contradictory deprecated finalUrl",
    );
  assert(
    Array.isArray(lhr.runWarnings) &&
      lhr.runWarnings.length <= 100 &&
      lhr.runWarnings.every((x) => typeof x === "string" && x.length <= 8192),
    "Invalid Lighthouse warnings",
  );
  const issues = runtimeError ? ["runtime-error"] : [];
  const config = settings(lhr, issues);
  if (
    finalDisplayedUrl !== context.targetUrl ||
    mainDocumentUrl !== context.targetUrl
  )
    issues.push("redirected-target");
  if (config?.formFactor !== context.formFactor) issues.push("device-mismatch");
  if (
    Date.parse(lhr.fetchTime) < Date.parse(context.window.from) ||
    Date.parse(lhr.fetchTime) >= Date.parse(context.window.to)
  )
    issues.push("outside-window");
  const validUntil = new Date(
    Date.parse(lhr.fetchTime) + context.maxAgeSeconds * 1000,
  ).toISOString();
  if (Date.parse(context.assessmentAt) > Date.parse(validUntil))
    issues.push("stale-lab-data");
  if (lhr.runWarnings.length) issues.push("run-warnings-require-review");
  const metrics = {};
  if (!runtimeError) {
    assert(object(lhr.audits), "Invalid Lighthouse audits");
    for (const [name, key] of Object.entries(names)) {
      const audit = lhr.audits[key];
      if (audit === undefined) {
        issues.push(`missing-${name}`);
        continue;
      }
      assert(
        object(audit) && audit.id === key,
        "Invalid Lighthouse metric audit identity",
      );
      if (audit.scoreDisplayMode !== "numeric") {
        issues.push(`unavailable-${name}`);
        continue;
      }
      const unit = name === "cls" ? "unitless" : "millisecond";
      assert(
        audit.numericUnit === unit && finite(audit.numericValue),
        "Invalid Lighthouse metric value/unit",
      );
      metrics[name] = { value: audit.numericValue, unit };
    }
  }
  const score = lhr.categories?.performance?.score;
  assert(
    score === undefined || score === null || (finite(score) && score <= 1),
    "Invalid Lighthouse performance score",
  );
  if (!runtimeError && (score === undefined || score === null))
    issues.push("missing-performance-score");
  const configurationIssues = issues.some((x) =>
    /configuration|form-factor|throttling|screen-emulation|storage-reset|browser-environment/.test(
      x,
    ),
  );
  const groupId =
    config && !configurationIssues
      ? enterpriseDigest([
          "lab-group-v1",
          context.customerId,
          context.entityId,
          context.environment,
          context.protocolDigest,
          context.window,
          lhr.requestedUrl,
          lhr.lighthouseVersion,
          config,
        ])
      : null;
  const measurementId = enterpriseDigest([
    "lab-measurement-v1",
    lhr.requestedUrl,
    lhr.fetchTime,
    lhr.lighthouseVersion,
    config,
  ]);
  return {
    ...base,
    status: runtimeError
      ? "runtime-error"
      : issues.length
        ? "partial"
        : "measured",
    requestedUrl: lhr.requestedUrl,
    finalDisplayedUrl,
    mainDocumentUrl,
    failedDocumentDigests,
    config,
    groupId,
    measurementId,
    validUntil,
    issues,
    metrics,
    performanceScore: runtimeError ? null : (score ?? null),
    warningDigests: lhr.runWarnings.map(sha),
    runtimeError,
  };
}

function validateReceipts(host, context) {
  shape(host, ["verifiedRuns"], "trusted lab host");
  assert(
    Array.isArray(host.verifiedRuns) && host.verifiedRuns.length <= 100,
    "Invalid trusted run count",
  );
  const ids = new Set();
  for (const r of host.verifiedRuns) {
    shape(
      r,
      [
        "runId",
        "artifactHash",
        "startedAt",
        "finishedAt",
        "protocolDigest",
        "machineId",
        "scope",
        "targetUrl",
        "formFactor",
      ],
      "trusted run receipt",
    );
    shape(
      r.scope,
      ["customerId", "entityId", "environment"],
      "trusted run scope",
    );
    assert(
      ["customerId", "entityId", "environment"].every(
        (k) => r.scope[k] === context[k],
      ) &&
        r.targetUrl === context.targetUrl &&
        r.formFactor === context.formFactor &&
        r.protocolDigest === context.protocolDigest,
      "Trusted run scope/protocol mismatch",
    );
    assert(
      id(r.runId) &&
        !ids.has(r.runId) &&
        id(r.machineId) &&
        hash(r.artifactHash),
      "Invalid/duplicate trusted run identity",
    );
    ids.add(r.runId);
    assert(
      timestampValue(r.startedAt) &&
        timestampValue(r.finishedAt) &&
        Date.parse(r.startedAt) < Date.parse(r.finishedAt) &&
        Date.parse(r.finishedAt) <= Date.parse(context.assessmentAt),
      "Invalid trusted run interval",
    );
  }
  return host.verifiedRuns;
}
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    i = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    min: sorted[0],
    median: sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2,
    max: sorted.at(-1),
    values,
  };
};

/** `host` is trusted in-session collector state, never an imported artifact or report field. */
export function evaluateLighthouseLab(
  context,
  inputs,
  host = { verifiedRuns: [] },
) {
  validateContext(context);
  assert(
    Array.isArray(inputs) &&
      inputs.length <= 100 &&
      new Set(inputs.map((x) => x?.sourceId)).size === inputs.length,
    "Invalid/duplicate lab sources",
  );
  const receipts = validateReceipts(host, context);
  const records = inputs
    .map((x) => normalizeLighthouse(x, context))
    .sort((a, b) =>
      a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
    );
  assert(
    receipts.every((r) =>
      records.some((x) => x.artifactHash === r.artifactHash),
    ),
    "Unbound trusted run receipt",
  );
  const measurements = [];
  for (const measurementId of [
    ...new Set(records.map((r) => r.measurementId)),
  ].sort()) {
    const aliases = records.filter((r) => r.measurementId === measurementId);
    const first = aliases[0];
    const fingerprints = new Set(
      aliases.map((r) =>
        enterpriseDigest([
          r.status,
          r.metrics,
          r.performanceScore ?? null,
          r.issues,
          r.warningDigests ?? [],
          r.runtimeError ?? null,
          r.finalDisplayedUrl ?? null,
          r.mainDocumentUrl ?? null,
          r.failedDocumentDigests ?? null,
        ]),
      ),
    );
    const matching = receipts.filter((r) =>
      aliases.some((a) => a.artifactHash === r.artifactHash),
    );
    const receipt = matching.length === 1 ? matching[0] : null;
    if (receipt)
      assert(
        Date.parse(receipt.startedAt) <= Date.parse(first.fetchTime) &&
          Date.parse(first.fetchTime) <= Date.parse(receipt.finishedAt) &&
          aliases
            .filter((a) => a.artifactHash === receipt.artifactHash)
            .every(
              (a) => Date.parse(receipt.finishedAt) <= Date.parse(a.capturedAt),
            ),
        "Trusted run timestamp binding mismatch",
      );
    measurements.push({
      ...first,
      sourceIds: aliases.map((r) => r.sourceId),
      artifactHashes: [...new Set(aliases.map((r) => r.artifactHash))].sort(),
      conflicting: fingerprints.size > 1,
      receipt,
      receiptAmbiguous: matching.length > 1,
    });
  }
  const overlapping = new Set();
  for (let i = 0; i < receipts.length; i++)
    for (let j = i + 1; j < receipts.length; j++) {
      const a = receipts[i],
        b = receipts[j];
      if (
        a.machineId === b.machineId &&
        Date.parse(a.startedAt) < Date.parse(b.finishedAt) &&
        Date.parse(b.startedAt) < Date.parse(a.finishedAt)
      ) {
        overlapping.add(a.runId);
        overlapping.add(b.runId);
      }
    }
  const groups = [];
  for (const groupId of [
    ...new Set(measurements.map((r) => r.groupId).filter(Boolean)),
  ].sort()) {
    const runs = measurements.filter((r) => r.groupId === groupId);
    const successful = runs.filter(
      (r) => r.status === "measured" && !r.conflicting,
    );
    const bound = runs.every((r) => r.receipt && !r.receiptAmbiguous);
    const ordered = bound
      ? runs
          .map((r) => r.receipt)
          .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
      : [];
    const sequential =
      bound &&
      ordered.every(
        (r, i) =>
          !i ||
          Date.parse(r.startedAt) >= Date.parse(ordered[i - 1].finishedAt),
      );
    const sameMachine =
      bound && new Set(ordered.map((r) => r.machineId)).size === 1;
    const canSummarize =
      successful.length >= 3 &&
      sequential &&
      sameMachine &&
      runs.every((r) => !overlapping.has(r.receipt?.runId)) &&
      runs.every((r) => !r.conflicting);
    groups.push({
      groupId,
      measurements: runs.map((r) => r.measurementId),
      attempts: runs.length,
      successful: successful.length,
      runtimeFailures: runs.filter((r) => r.status === "runtime-error").length,
      otherUnassessed:
        runs.length -
        successful.length -
        runs.filter((r) => r.status === "runtime-error").length,
      summaryStatus: canSummarize
        ? "repeated-lab-summary"
        : "insufficient-comparable-run-evidence",
      statistics: canSummarize
        ? Object.fromEntries(
            [...Object.keys(names), "performanceScore"].map((name) => [
              name,
              stats(
                successful.map((r) =>
                  name === "performanceScore"
                    ? r.performanceScore
                    : r.metrics[name].value,
                ),
              ),
            ]),
          )
        : null,
    });
  }
  const ungroupedMeasurementIds = measurements
    .filter((r) => r.groupId === null)
    .map((r) => r.measurementId);
  const accounting = {
    submittedUniqueRecords: measurements.length,
    successful: measurements.filter(
      (r) => !r.conflicting && r.status === "measured",
    ).length,
    runtimeFailed: measurements.filter(
      (r) => !r.conflicting && r.status === "runtime-error",
    ).length,
    unsupported: measurements.filter(
      (r) => !r.conflicting && r.status === "unsupported",
    ).length,
    partial: measurements.filter(
      (r) => !r.conflicting && r.status === "partial",
    ).length,
    conflicted: measurements.filter((r) => r.conflicting).length,
  };
  return {
    moduleId: "performance",
    namespace: "lab",
    accounting,
    ungroupedMeasurementIds,
    overlappingRunIds: [...overlapping].sort(),
    supportedLighthouseVersion: SUPPORTED_VERSION,
    artifactCount: records.length,
    measurementCount: measurements.length,
    duplicateArtifactCount: records.length - measurements.length,
    measurements,
    groups,
    fieldAssessment: "not-assessed",
    assessmentAccepted: false,
    providerAuthenticated: false,
    dataRequests:
      ungroupedMeasurementIds.length > 0 ||
      groups.length === 0 ||
      groups.some((g) => g.statistics === null)
        ? [
            {
              requestedArtifact:
                "Comparable sequential Lighthouse navigation runs",
              targetUrl: context.targetUrl,
              formFactor: context.formFactor,
              protocolDigest: context.protocolDigest,
              window: { ...context.window },
              ownerRole: "Website performance owner",
              instructions:
                "Supply at least three distinct runs with supported version, complete settings and collector-bound execution receipts. Retain failed attempts, warnings and each original JSON. Do not submit credentials. Imported run IDs alone do not prove distinct execution.",
              fallback:
                "Retain individual supplied observations; no repeated-run summary or field CWV conclusion.",
            },
          ]
        : [],
  };
}
