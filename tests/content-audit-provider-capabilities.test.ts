import { expect, it } from "vitest";
import { inspectProviderAccess } from "../skills/content-search-audit/scripts/lib/provider-capabilities.mjs";

const now = "2026-11-18T12:00:00Z";
function fixture() {
  const context = {
    host: "codex",
    customerId: "customer",
    environment: "production",
    operationMode: "audit",
    targets: [
      {
        entityId: "analytics-property",
        provider: "ga4",
        resource: "properties/123",
        operation: "ga4-report",
      },
    ],
  };
  const grant = {
    authorizationRef: "read-ga4",
    customerId: "customer",
    environment: "production",
    assetIds: ["analytics-property"],
    identityId: "reader",
    allowedActions: ["read"],
    grantedAt: "2026-11-18T10:00:00Z",
    expiresAt: "2026-11-18T15:00:00Z",
    revokedAt: null,
    sideEffectConstraints: { allowRealTransactions: false },
  };
  const capability = {
    capabilityId: "ga4-connector",
    host: "codex",
    customerId: "customer",
    environment: "production",
    entityId: "analytics-property",
    provider: "ga4",
    resource: "properties/123",
    operations: ["ga4-report"],
    identityId: "reader",
    authorizationRef: "read-ga4",
    state: "ready",
    observedAt: "2026-11-18T11:00:00Z",
    validUntil: "2026-11-18T13:00:00Z",
  };
  return {
    context,
    session: {
      sessionId: "session",
      inventory: [capability],
      trustedAuthorizations: [grant],
    },
  };
}
it("uses a scoped fresh authorized read capability while preserving export fallback", () => {
  const { context, session } = fixture();
  const result = inspectProviderAccess(context, session, now);
  expect(result.targets[0]).toMatchObject({
    status: "available",
    mode: "live-read",
    capabilityId: "ga4-connector",
    fallback: { mode: "supplied-export" },
  });
  expect(result).toMatchObject({
    performsNetworkRequests: false,
    assessmentAccepted: false,
  });
});
it("continues with concrete export instructions when connectors or authorization are absent", () => {
  const { context, session } = fixture();
  const unavailable = inspectProviderAccess(
    context,
    { ...session, inventory: [] },
    now,
  ).targets[0];
  expect(unavailable).toMatchObject({
    status: "unavailable",
    mode: "supplied-export",
  });
  expect(unavailable.fallback.instructions).toMatch(/property|date|metadata/);
  expect(
    inspectProviderAccess(
      context,
      { ...session, trustedAuthorizations: [] },
      now,
    ).targets[0].status,
  ).toBe("authorization-required");
});
it("keeps distinct actionable states without leaking provider errors or credentials", () => {
  for (const state of [
    "authentication-expired",
    "permission-denied",
    "quota-limited",
  ]) {
    const { context, session } = fixture();
    Object.assign(session.inventory[0], {
      state,
      rawError: "Bearer PRIVATE-TOKEN",
    });
    const result = inspectProviderAccess(context, session, now);
    expect(result.targets[0].status).toBe(state);
    expect(JSON.stringify(result)).not.toContain("PRIVATE-TOKEN");
  }
});
it("rejects stale capability, expired grants, wrong property and foreign scope", () => {
  for (const mutate of [
    (session) => (session.inventory[0].resource = "properties/999"),
    (session) => (session.inventory[0].customerId = "foreign"),
    (session) => (session.inventory[0].environment = "staging"),
    (session) => (session.inventory[0].host = "claude-code"),
    (session) => (session.inventory[0].operations = ["ga4-config"]),
  ]) {
    const { context, session } = fixture();
    mutate(session);
    expect(inspectProviderAccess(context, session, now).targets[0].mode).toBe(
      "supplied-export",
    );
  }
  const { context, session } = fixture();
  session.inventory[0].validUntil = now;
  expect(inspectProviderAccess(context, session, now).targets[0].status).toBe(
    "stale-capability",
  );
  session.inventory[0].validUntil = "2026-11-19T12:00:00Z";
  session.trustedAuthorizations[0].expiresAt = now;
  expect(inspectProviderAccess(context, session, now).targets[0].status).toBe(
    "authorization-required",
  );
});
it("does not grant capabilities from target claims and rejects unsupported hosts or mutations", () => {
  const { context, session } = fixture();
  context.targets[0].trustedAuthorizations = session.trustedAuthorizations;
  expect(
    inspectProviderAccess(context, { ...session, inventory: [] }, now)
      .targets[0].status,
  ).toBe("unavailable");
  expect(() =>
    inspectProviderAccess({ ...context, host: "other" }, session, now),
  ).toThrow();
  expect(() =>
    inspectProviderAccess(
      {
        ...context,
        targets: [{ ...context.targets[0], operation: "publish" }],
      },
      session,
      now,
    ),
  ).toThrow();
});

it("rejects prototype keys masquerading as provider operations", () => {
  const { context, session } = fixture();
  expect(() =>
    inspectProviderAccess(
      {
        ...context,
        targets: [
          {
            entityId: "site",
            resource: "https://example.com",
            operation: "__proto__",
          },
        ],
      },
      session,
      now,
    ),
  ).toThrow();
});
