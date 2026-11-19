import { importAnalytics } from "./analytics.mjs";
import { importSearchConsole } from "./search-console.mjs";
import { importBing } from "./bing.mjs";
import {
  enterpriseDigest,
  stableJson,
  textValue,
  timestampValue,
  validateEnterpriseRun,
} from "./enterprise-state.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const artifacts = {
  "ga4-report": "ga4-report",
  "ga4-config": "ga4-config",
  "gsc-search": "search-export",
  "bing-search": "bing-search",
  "bing-ai-mapped": "bing-ai-mapped",
  "gtm-version": "gtm-container",
};
export const supportsProviderSnapshot = (kind) =>
  Object.hasOwn(artifacts, kind);
function gtmVersion(payload, context) {
  const version = payload.version;
  assert(
    version &&
      typeof version === "object" &&
      !Array.isArray(version) &&
      /^accounts\/\d+\/containers\/\d+$/.test(context.resource) &&
      /^\d+$/.test(context.versionId),
    "Invalid GTM version scope",
  );
  const [, accountId, , containerId] = context.resource.split("/");
  assert(
    version.accountId === accountId &&
      version.containerId === containerId &&
      version.containerVersionId === context.versionId &&
      version.path === `${context.resource}/versions/${context.versionId}`,
    "GTM account/container/version mismatch",
  );
  if (version.container !== undefined)
    assert(
      version.container &&
        version.container.accountId === accountId &&
        version.container.containerId === containerId &&
        (version.container.path === undefined ||
          version.container.path === context.resource),
      "Foreign nested GTM container",
    );
  for (const [key, id] of [
    ["tag", "tagId"],
    ["trigger", "triggerId"],
    ["variable", "variableId"],
  ]) {
    const items = version[key] ?? [];
    assert(
      Array.isArray(items) &&
        items.length <= 100000 &&
        items.every(
          (item) =>
            item && typeof item[id] === "string" && /^\d+$/.test(item[id]),
        ) &&
        new Set(items.map((item) => item[id])).size === items.length,
      `Invalid GTM ${key} collection`,
    );
    for (const item of items)
      assert(
        (item.path === undefined ||
          (typeof item.path === "string" &&
            /^accounts\/\d+\/containers\/\d+\/(?:workspaces\/\d+\/)?(?:tags|triggers|variables)\/\d+$/.test(
              item.path,
            ) &&
            item.path.startsWith(`${context.resource}/`) &&
            item.path.endsWith(`/${key}s/${item[id]}`))) &&
          (item.accountId === undefined || item.accountId === accountId) &&
          (item.containerId === undefined || item.containerId === containerId),
        "Foreign GTM component",
      );
  }
  return {
    provider: "google-tag-manager",
    resource: context.resource,
    versionId: context.versionId,
    version: globalThis.structuredClone(version),
    publicationVerified: false,
    runtimeVerified: false,
    populationComplete: false,
    limitations: [
      "Supplied version configuration, not authenticated provider state",
      "A version snapshot does not establish publication, tag execution, consent behavior or provider receipt",
    ],
  };
}

function ga4Config(payload, context, gap) {
  assert(
    /^properties\/\d+$/.test(context.resource) &&
      payload.property?.name === context.resource,
    "GA4 configuration property mismatch",
  );
  const property = payload.property;
  if (!textValue(property.timeZone))
    gap("missing-timezone", "Supply the property reporting timezone.");
  else {
    try {
      new Intl.DateTimeFormat("en", { timeZone: property.timeZone });
    } catch {
      throw new Error("Invalid property timezone");
    }
    if (context.expectedTimezone)
      assert(
        property.timeZone === context.expectedTimezone,
        "Property timezone mismatch",
      );
  }
  if (!property.currencyCode)
    gap("missing-currency", "Supply the property reporting currency.");
  else {
    assert(
      /^[A-Z]{3}$/.test(property.currencyCode),
      "Invalid property currency",
    );
    if (context.expectedCurrency)
      assert(
        property.currencyCode === context.expectedCurrency,
        "Property currency mismatch",
      );
  }
  const output = {
    provider: "google-analytics-admin",
    property: globalThis.structuredClone(property),
    runtimeVerified: false,
    publicationVerified: false,
    populationComplete: false,
  };
  for (const collection of ["dataStreams", "keyEvents"]) {
    const values = payload[collection],
      receipt = payload.collections?.[collection];
    if (values === undefined) {
      output[collection] = null;
      gap(
        `missing-config-${collection}`,
        `Supply ${collection} with list pagination metadata.`,
      );
      continue;
    }
    assert(
      Array.isArray(values) &&
        values.length <= 100000 &&
        new Set(values.map((item) => item?.name)).size === values.length,
      `Invalid ${collection} snapshot`,
    );
    for (const item of values) {
      assert(
        item &&
          typeof item.name === "string" &&
          item.name.startsWith(`${context.resource}/${collection}/`) &&
          /^properties\/\d+\/(?:dataStreams|keyEvents)\/\d+$/.test(item.name),
        "Foreign property stream/key event",
      );
      if (collection === "dataStreams")
        assert(
          [
            "WEB_DATA_STREAM",
            "ANDROID_APP_DATA_STREAM",
            "IOS_APP_DATA_STREAM",
          ].includes(item.type),
          "Invalid data stream type",
        );
      else assert(textValue(item.eventName), "Missing key-event name");
    }
    if (!receipt || receipt.complete !== true)
      gap(
        `incomplete-config-${collection}`,
        `Supply remaining ${collection} pages or retain collection completeness as unknown.`,
      );
    if (receipt?.complete === true)
      assert(!receipt.nextPageToken, "Contradictory config pagination receipt");
    output[collection] = globalThis.structuredClone(values);
  }
  output.collections = globalThis.structuredClone(payload.collections ?? {});
  output.limitations = [
    "Supplied configuration and pagination declarations are not authenticated provider state",
    "Key-event definitions do not establish business conversion, tag delivery or consent behavior",
  ];
  return output;
}

/** Supplied exports only. Never mutates a run or treats importer success as an audit verdict. */
function normalizeSnapshot(kind, input, context) {
  assert(
    Object.hasOwn(artifacts, kind) && context && input,
    "Unsupported provider snapshot kind",
  );
  const run = context.run,
    payload = input.payload;
  assert(
    input.customerId === run.customerId &&
      input.entityId === context.entityId &&
      run.entities.some((entity) => entity.entityId === context.entityId),
    "Foreign provider snapshot ownership/entity",
  );
  assert(
    textValue(context.resource) &&
      textValue(context.windowId) &&
      Number.isSafeInteger(context.maxAgeSeconds) &&
      context.maxAgeSeconds > 0 &&
      context.maxAgeSeconds <= 366 * 86400,
    "Invalid snapshot scope/freshness policy",
  );
  assert(
    payload &&
      typeof payload === "object" &&
      textValue(payload.sourceId) &&
      typeof payload.synthetic === "boolean" &&
      timestampValue(payload.capturedAt) &&
      Date.parse(payload.capturedAt) <= Date.parse(run.assessmentAt),
    "Invalid or future provider capture",
  );
  const gaps = [];
  const gap = (code, instructions) => {
    if (!gaps.some((item) => item.code === code))
      gaps.push({ code, instructions });
  };
  let normalized;
  if (kind === "ga4-report" || kind === "gsc-search") {
    assert(payload.property === context.resource, "Provider property mismatch");
    normalized =
      kind === "ga4-report"
        ? importAnalytics(payload)
        : importSearchConsole(payload);
    assert(
      context.expectedQuery &&
        stableJson(context.expectedQuery) === stableJson(normalized.query),
      "Provider query/window mismatch",
    );
    if (!normalized.paginationExhausted)
      gap(
        "incomplete-pagination",
        "Supply the next response page for the identical property/query; preserve limit/offset and metadata.",
      );
    if (kind === "ga4-report") {
      const zones = new Set(),
        currencies = new Set();
      for (const page of normalized.pages) {
        const metadata = page.metadata;
        if (!metadata) {
          gap(
            "missing-provider-metadata",
            "Supply GA4 response metadata including timezone, currency and quality limitations.",
          );
          continue;
        }
        if (metadata.timeZone) zones.add(metadata.timeZone);
        else gap("missing-timezone", "Supply the property reporting timezone.");
        if (metadata.currencyCode) currencies.add(metadata.currencyCode);
        else
          gap(
            "missing-currency",
            "Supply the reporting currency or explain metric applicability.",
          );
        if (metadata.subjectToThresholding)
          gap(
            "provider-thresholding",
            "Retain thresholding limitations; do not infer omitted counts as zero.",
          );
        if (metadata.samplingMetadatas?.length)
          gap(
            "provider-sampling",
            "Retain sampling metadata and avoid exact-population claims.",
          );
        if (
          metadata.dataLossFromOtherRow ||
          metadata.dataTruncationReasons?.length
        )
          gap(
            "provider-truncation",
            "Retain truncation/data-loss limitations; request a suitable narrower query if needed.",
          );
        if (
          metadata.schemaRestrictionResponse?.activeMetricRestrictions?.length
        )
          gap(
            "metric-restrictions",
            "Request a permitted export for restricted metrics or keep them unknown.",
          );
      }
      assert(
        zones.size <= 1 &&
          (!context.expectedTimezone ||
            [...zones].every((value) => value === context.expectedTimezone)),
        "Provider timezone mismatch",
      );
      assert(
        currencies.size <= 1 &&
          (!context.expectedCurrency ||
            [...currencies].every(
              (value) => value === context.expectedCurrency,
            )),
        "Provider currency mismatch",
      );
    } else if (context.expectedTimezone)
      assert(
        normalized.timezone === context.expectedTimezone,
        "Search Console timezone mismatch",
      );
  } else if (kind.startsWith("bing-")) {
    assert(payload.siteUrl === context.resource, "Bing site mismatch");
    assert(
      payload.kind ===
        (kind === "bing-search"
          ? "search-query-stats"
          : "ai-performance-mapped"),
      "Bing source kind mismatch",
    );
    normalized = importBing(payload);
    assert(
      context.expectedScope &&
        stableJson(context.expectedScope) === stableJson(normalized.scope),
      "Bing period/scope mismatch",
    );
    gap(
      "provider-limited-population",
      "Retain supplied scope and top-query/dashboard limitations; missing rows remain unknown.",
    );
  } else if (kind === "ga4-config")
    normalized = ga4Config(payload, context, gap);
  else normalized = gtmVersion(payload, context);
  const validUntil = new Date(
    Date.parse(payload.capturedAt) + context.maxAgeSeconds * 1000,
  ).toISOString();
  if (Date.parse(validUntil) <= Date.parse(run.assessmentAt))
    gap(
      "stale-snapshot",
      "Provide a fresh export for this exact property/container and scope.",
    );
  if (kind === "gtm-version" && normalized.version.deleted === true)
    gap(
      "deleted-configuration",
      "Provide a non-deleted version or retain deletion as configuration evidence; do not infer active deployment.",
    );
  const content = {
    kind,
    resource: context.resource,
    windowId: context.windowId,
    sourceId: payload.sourceId,
    synthetic: payload.synthetic,
    normalized,
    gaps,
    sourceDigest: enterpriseDigest(payload),
  };
  const digest = enterpriseDigest(content);
  const evidence = {
    evidenceId: `provider-${enterpriseDigest([run.customerId, run.runId, context.entityId, kind, context.resource, context.windowId, payload.capturedAt, validUntil, digest])}`,
    customerId: run.customerId,
    runId: run.runId,
    entityId: context.entityId,
    source: `${payload.synthetic ? "synthetic-" : ""}supplied-${kind}`,
    artifactType: artifacts[kind],
    scopeKey: context.entityId,
    windowId: context.windowId,
    observedAt: payload.capturedAt,
    validUntil,
    digest,
    content,
  };
  return {
    schemaVersion: 1,
    kind,
    evidence,
    normalized,
    gaps,
    synthetic: payload.synthetic,
    providerAuthenticated: false,
    assessmentAccepted: false,
    usableForCurrentAssessment: !gaps.some((item) =>
      ["stale-snapshot", "deleted-configuration"].includes(item.code),
    ),
    limitations: [
      "Supplied export integrity is not provider authenticity",
      "Eligibility to inspect evidence is not a passed audit check; retain all gaps and provider limitations",
    ],
  };
}

export function normalizeProviderSnapshot(kind, input, context) {
  validateEnterpriseRun(context?.run);
  return normalizeSnapshot(kind, input, context);
}
/** Pure original-input replay under an explicitly attributed owner; no import authority. */
export function replayProviderSnapshotInput(kind, input, context, owner) {
  assert(
    owner &&
      Object.getPrototypeOf(owner) === Object.prototype &&
      Object.keys(owner).length === 4 &&
      ["customerId", "runId", "assessmentAt", "entityId"].every((k) =>
        Object.hasOwn(owner, k),
      ) &&
      textValue(owner.customerId) &&
      textValue(owner.runId) &&
      textValue(owner.entityId) &&
      timestampValue(owner.assessmentAt) &&
      context.entityId === owner.entityId,
    "Invalid provider replay owner",
  );
  return normalizeSnapshot(kind, input, {
    ...context,
    run: {
      customerId: owner.customerId,
      runId: owner.runId,
      assessmentAt: owner.assessmentAt,
      entities: [{ entityId: owner.entityId }],
    },
  });
}
