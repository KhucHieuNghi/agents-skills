import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { parseCaptureJson } from "./strict-json.mjs";
import { evaluateCanonicalCapture } from "./canonical.mjs";
import { evaluateHreflangCapture } from "./hreflang.mjs";
import { evaluateIndexControls } from "./index-controls.mjs";
const hash = (text) => createHash("sha256").update(text).digest("hex");
function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error("Invalid target-control fields");
}
function normalizedUrl(value) {
  try {
    return new URL(value).href;
  } catch {
    throw new Error("Invalid target URL");
  }
}
function read(source) {
  exact(source, ["sourceId", "artifactText", "artifactHash"]);
  if (
    typeof source.sourceId !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(source.sourceId) ||
    typeof source.artifactText !== "string" ||
    Buffer.byteLength(source.artifactText) > 2 * 1024 * 1024 ||
    source.artifactHash !== hash(source.artifactText)
  )
    throw new Error("Invalid target-control bytes or hash");
  return parseCaptureJson(source.artifactText);
}
/** Observed conditions of declared targets, never provider indexing or owner approval. */
export function evaluateDeclaredTargetControls(context, source) {
  const scopeKeys = [
    "customerId",
    "entityId",
    "environment",
    "targetUrl",
    "profileId",
    "stateId",
  ];
  exact(context, [
    ...scopeKeys,
    "relationship",
    "method",
    "assessmentAt",
    "maxAgeSeconds",
  ]);
  if (!["canonical", "hreflang"].includes(context.relationship))
    throw new Error("Unsupported target relationship");
  const raw = read(source);
  exact(raw, ["schemaVersion", "declaration", "targets"]);
  if (
    raw.schemaVersion !== 1 ||
    !Array.isArray(raw.targets) ||
    raw.targets.length > 100
  )
    throw new Error("Invalid target-control version or count");
  const base = Object.fromEntries(
    [...scopeKeys, "assessmentAt", "maxAgeSeconds"].map((key) => [
      key,
      context[key],
    ]),
  );
  if (context.relationship === "canonical" && context.method !== null)
    throw new Error("Canonical method must be null");
  const declaration =
    context.relationship === "canonical"
      ? evaluateCanonicalCapture(
          { ...base, expectedCanonical: null },
          raw.declaration,
        )
      : evaluateHreflangCapture(
          { ...base, method: context.method },
          raw.declaration,
        );
  const declaredRaw = read(raw.declaration);
  const locations = new Map();
  const remember = (value, path) => {
    const url = normalizedUrl(value);
    if (!locations.has(url)) locations.set(url, path);
  };
  if (context.relationship === "canonical") {
    for (const [layer, value] of Object.entries(declaredRaw.layers))
      value.targets.forEach((target, index) =>
        remember(
          target,
          `declaration.artifactText (parse JSON), layers.${layer}.targets[${index}]`,
        ),
      );
  } else {
    const captures =
      declaredRaw.schemaVersion === 2
        ? declaredRaw.captures.map(read)
        : [declaredRaw];
    captures.forEach((capture, componentIndex) =>
      capture.pages.forEach((page, pageIndex) => {
        if (normalizedUrl(page.url) !== declaration.scope.targetUrl) return;
        const prefix =
          declaredRaw.schemaVersion === 2
            ? `declaration.artifactText (parse JSON), captures[${componentIndex}].artifactText (parse JSON)`
            : "declaration.artifactText (parse JSON)";
        page.alternates.forEach((item, index) =>
          remember(
            item.targetUrl,
            `${prefix}, pages[${pageIndex}].alternates[${index}].targetUrl`,
          ),
        );
      }),
    );
  }
  const targets = [...locations.keys()];
  const rootExpiry =
    declaration.capturedAt === null
      ? Date.parse(context.assessmentAt)
      : Date.parse(declaration.capturedAt) + context.maxAgeSeconds * 1000;
  const rootFresh = Date.parse(context.assessmentAt) < rootExpiry;
  const supplied = new Map(),
    observationTimes = (
      declaration.pageCapturedAt ?? [declaration.capturedAt]
    ).filter(Boolean);
  for (const component of raw.targets) {
    const capture = read(component);
    const target = capture.scope?.targetUrl;
    if (typeof target !== "string")
      throw new Error("Missing target capture scope");
    const targetUrl = normalizedUrl(target);
    if (!targets.includes(targetUrl))
      throw new Error("Undeclared target capture");
    if (supplied.has(targetUrl)) throw new Error("Duplicate target capture");
    const result = evaluateIndexControls(
      {
        ...base,
        targetUrl,
        crawler: "googlebot",
        expectedHttpStatus: 200,
        expectedCrawlAllowed: true,
        expectedIndexable: true,
      },
      component,
    );
    supplied.set(targetUrl, { result, component, capture });
    observationTimes.push(
      result.capturedAt,
      result.observation.robotsCapturedAt,
    );
  }
  const checks = [],
    dataRequests = [],
    provenance = [];
  for (const targetUrl of targets) {
    const observed = supplied.get(targetUrl),
      targetRef = hash(targetUrl);
    provenance.push({
      targetRef,
      targetUrl,
      artifactHash: observed?.component.artifactHash ?? null,
      locator: locations.get(targetUrl),
    });
    const definitions = [
      "http-200",
      "googlebot-crawl-allowed",
      "noindex-absent",
    ];
    definitions.forEach((name, index) => {
      const check = observed?.result.checks[index];
      let status = !rootFresh || !check ? "unknown" : check.status;
      // The HTTP criterion explicitly tests a direct 200 response; a final URL mismatch is a failed criterion, not an indexing verdict.
      if (
        rootFresh &&
        observed &&
        index === 0 &&
        Date.parse(context.assessmentAt) < Date.parse(check.validUntil) &&
        !observed.result.observation.responseMatchesTarget
      )
        status = "fail";
      const reason = !rootFresh
        ? "expired-or-missing-declaration"
        : !observed
          ? "missing-target-controls"
          : status === "unknown"
            ? "incomplete-or-expired-target-controls"
            : status === "pass"
              ? "observed-target-condition-satisfied"
              : "observed-target-condition-not-satisfied";
      checks.push({
        ruleId: `declared-target-${targetRef}-${name}`,
        ruleVersion: "1",
        status,
        reason: `${reason}; private source ${source.sourceId} at ${locations.get(targetUrl)}`,
        sourceIds: [source.sourceId],
        validUntil: new Date(
          Math.min(
            rootExpiry,
            check ? Date.parse(check.validUntil) : rootExpiry,
          ),
        ).toISOString(),
      });
      if (status === "unknown")
        dataRequests.push({
          targetRef,
          reason,
          scope: declaration.scope,
          ownerRole: "website-engineering",
          requestedArtifact: `Fresh scoped declaration and index-controls capture for target reference ${targetRef}; resolve exact URL in private source ${source.sourceId} at ${locations.get(targetUrl)}`,
          acceptedFormats: ["declared-target-controls-v1", "index-controls-v1"],
          fallback: "Keep the condition unknown; continue independent checks.",
        });
    });
  }
  if (!targets.length) {
    checks.push({
      ruleId: "declared-target-presence",
      ruleVersion: "1",
      status: "unknown",
      reason: "no-observed-targets",
      sourceIds: [source.sourceId],
      validUntil: context.assessmentAt,
    });
    dataRequests.push({
      reason: "no-observed-targets",
      scope: declaration.scope,
      ownerRole: "seo-owner",
      requestedArtifact:
        "Complete scoped declaration capture and intended canonical/language strategy",
      acceptedFormats: ["declared-target-controls-v1"],
      fallback: "No declaration alone is not a website defect.",
    });
  }
  return {
    scope: declaration.scope,
    relationship: context.relationship,
    sourceId: source.sourceId,
    artifactHash: source.artifactHash,
    capturedAt: declaration.capturedAt,
    observationTimes,
    checks,
    dataRequests,
    provenance,
    indexingStatus: "unknown",
    contentEquivalence: "unknown",
    executionAuthenticated: false,
    semanticAcceptance: false,
    limitations: [
      "Checks are direct-200, Googlebot robots allowance and observed noindex absence only",
      "Not owner policy, actual crawler access, content quality, soft-404 detection or provider indexing",
      "Target evidence is separately scoped and independently aged",
    ],
  };
}
