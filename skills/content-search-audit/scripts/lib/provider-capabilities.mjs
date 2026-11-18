import { URL } from "node:url";
import { authorizeAction } from "./authorization.mjs";
import { textValue, timestampValue } from "./enterprise-state.mjs";

const operations = {
  "ga4-report": {
    provider: "ga4",
    artifact: "ga4-report",
    instructions:
      "Export all runReport response pages with property identity, absolute date ranges, query, headers, metadata, rowCount and capture time.",
  },
  "ga4-config": {
    provider: "ga4",
    artifact: "ga4-config",
    instructions:
      "Supply a read-only property/stream configuration snapshot with property identity, timezone, currency, key-event definitions and capture time.",
  },
  "gsc-search": {
    provider: "gsc",
    artifact: "search-export",
    instructions:
      "Export Search Analytics response pages with exact property, query dimensions/filters, date range, search type, data state, pagination and capture time.",
  },
  "gsc-inspection": {
    provider: "gsc",
    artifact: "gsc-inspection",
    instructions:
      "Supply URL Inspection results with inspected URL, property, inspection time and provider-reported index verdict; public crawling cannot substitute for this evidence.",
  },
  "bing-search": {
    provider: "bing",
    artifact: "bing-search",
    instructions:
      "Supply GetQueryStats response with exact registered site, period, locale, timezone and capture time; retain top-query limitations.",
  },
  "bing-ai-mapped": {
    provider: "bing",
    artifact: "bing-ai-mapped",
    exportOnly: true,
    instructions:
      "Supply an attributed Bing AI dashboard mapping with source capture, reviewer/method, period, surfaces and original approximate/range precision.",
  },
  "gtm-version": {
    provider: "gtm",
    artifact: "gtm-container",
    instructions:
      "Export the explicit account/container/version snapshot, identifying workspace versus published version and capture time. Include tags, triggers, variables and configuration; this does not prove runtime delivery.",
  },
};
const states = new Set([
  "ready",
  "authentication-expired",
  "permission-denied",
  "quota-limited",
]);
const validResource = (provider, value) => {
  if (!textValue(value)) return false;
  if (provider === "ga4") return /^properties\/\d+$/.test(value);
  if (provider === "gtm") return /^accounts\/\d+\/containers\/\d+$/.test(value);
  if (provider === "gsc" && /^sc-domain:[a-zA-Z0-9.-]+$/.test(value))
    return true;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !url.search
    );
  } catch {
    return false;
  }
};

/** Inventory and grants must come from trusted host session state, never target/import JSON.
 * This planner performs no network call and does not establish observed provider behavior.
 */
export function inspectProviderAccess(context, session, at) {
  if (
    !context ||
    !["codex", "claude-code"].includes(context.host) ||
    !textValue(context.customerId) ||
    !textValue(context.environment) ||
    !["audit", "plan", "remediate", "verify"].includes(context.operationMode) ||
    !Array.isArray(context.targets) ||
    !timestampValue(at) ||
    !session ||
    !Array.isArray(session.inventory) ||
    !Array.isArray(session.trustedAuthorizations)
  )
    throw new Error("Invalid provider capability context");
  const seen = new Set();
  const targets = context.targets.map((target) => {
    const method =
      target && Object.hasOwn(operations, target.operation)
        ? operations[target.operation]
        : null;
    if (
      !method ||
      method.provider !== target.provider ||
      !textValue(target.entityId) ||
      !validResource(target.provider, target.resource)
    )
      throw new Error("Invalid provider target/operation");
    const key = JSON.stringify([
      target.entityId,
      target.provider,
      target.resource,
      target.operation,
    ]);
    if (seen.has(key)) throw new Error("Duplicate provider target");
    seen.add(key);
    const fallback = {
      mode: "supplied-export",
      artifactType: method.artifact,
      instructions: method.instructions,
      access:
        "Read-only export; use the host's normal sign-in flow for account access, never paste credentials into an audit.",
    };
    const candidates = method.exportOnly
      ? []
      : session.inventory.filter(
          (item) =>
            item?.host === context.host &&
            item.customerId === context.customerId &&
            item.environment === context.environment &&
            item.entityId === target.entityId &&
            item.provider === target.provider &&
            item.resource === target.resource &&
            Array.isArray(item.operations) &&
            item.operations.includes(target.operation),
        );
    const attempts = candidates.map((item) => {
      if (
        !textValue(item.capabilityId) ||
        !textValue(item.identityId) ||
        !states.has(item.state) ||
        !timestampValue(item.observedAt) ||
        !timestampValue(item.validUntil) ||
        Date.parse(item.observedAt) > Date.parse(at) ||
        Date.parse(item.validUntil) <= Date.parse(at)
      )
        return { status: "stale-capability" };
      if (item.state !== "ready") return { status: item.state };
      const grant = session.trustedAuthorizations.find(
        (grant) => grant.authorizationRef === item.authorizationRef,
      );
      const authorization = authorizeAction(
        grant,
        { kind: "read", realTransaction: false },
        {
          customerId: context.customerId,
          environment: context.environment,
          assetId: target.entityId,
          identityId: item.identityId,
          operationMode: context.operationMode,
          sessionId: session.sessionId,
          trustedAuthorizations: session.trustedAuthorizations,
        },
        at,
      );
      if (!authorization.allowed) return { status: "authorization-required" };
      return {
        status: "available",
        capabilityId: item.capabilityId,
        authorizationRef: authorization.authorizationRef,
      };
    });
    const selected = attempts.find((item) => item.status === "available") ??
      attempts[0] ?? { status: "unavailable" };
    return {
      entityId: target.entityId,
      provider: target.provider,
      resource: target.resource,
      operation: target.operation,
      ...selected,
      mode: selected.status === "available" ? "live-read" : "supplied-export",
      fallback,
    };
  });
  return {
    schemaVersion: 1,
    host: context.host,
    customerId: context.customerId,
    assessedAt: at,
    targets,
    performsNetworkRequests: false,
    assessmentAccepted: false,
    limitations: [
      "Capability and permission planning is not a successful provider query or verified evidence.",
      "Recheck trusted session state and authorization immediately before any external read.",
      "Exports are an available input route, not an assertion that the customer has supplied valid data.",
    ],
  };
}

export function providerOperationContract(kind) {
  if (!Object.hasOwn(operations, kind))
    throw new Error("Unsupported provider operation");
  return globalThis.structuredClone(operations[kind]);
}
export { validResource as validProviderResource };
