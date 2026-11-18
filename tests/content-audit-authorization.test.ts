import { expect, it } from "vitest";
import { authorizeAction } from "../skills/content-search-audit/scripts/lib/authorization.mjs";
const now = "2026-11-18T12:00:00Z";
const grant = {
  authorizationRef: "session-grant-1",
  customerId: "a",
  environment: "staging",
  assetIds: ["checkout"],
  allowedActions: ["read", "submit-test"],
  identityId: "test-user",
  grantedAt: "2026-11-18T11:00:00Z",
  expiresAt: "2026-11-18T13:00:00Z",
  revokedAt: null,
  sideEffectConstraints: { allowRealTransactions: false },
};
const context = {
  customerId: "a",
  environment: "staging",
  assetId: "checkout",
  identityId: "test-user",
  trustedAuthorizations: [grant],
  operationMode: "audit",
};
const read = { kind: "read", realTransaction: false };
it("allows a scoped read and a separately authorized test submission", () => {
  expect(authorizeAction(grant, read, context, now).allowed).toBe(true);
  expect(
    authorizeAction(
      grant,
      { kind: "submit-test", realTransaction: false },
      context,
      now,
    ).allowed,
  ).toBe(true);
});
it("does not grant action authority from source data or network access", () => {
  expect(
    authorizeAction(grant, read, { ...context, trustedAuthorizations: [] }, now)
      .allowed,
  ).toBe(false);
  expect(
    authorizeAction(
      { ...grant, allowedActions: ["read"] },
      { kind: "submit-test", realTransaction: false },
      context,
      now,
    ).allowed,
  ).toBe(false);
  expect(
    authorizeAction(
      grant,
      { kind: "publish", realTransaction: false },
      context,
      now,
    ).allowed,
  ).toBe(false);
  expect(
    authorizeAction(grant, { ...read, realTransaction: true }, context, now)
      .allowed,
  ).toBe(false);
});
it("rejects expiry, revocation, wrong customer, production environment and wrong identity", () => {
  for (const scoped of [
    { ...context, customerId: "b" },
    { ...context, environment: "production" },
    { ...context, identityId: "real-user" },
    { ...context, assetId: "other" },
  ])
    expect(authorizeAction(grant, read, scoped, now).allowed).toBe(false);
  expect(authorizeAction(grant, read, context, grant.expiresAt).allowed).toBe(
    false,
  );
  expect(
    authorizeAction({ ...grant, revokedAt: now }, read, context, now).allowed,
  ).toBe(false);
  expect(authorizeAction(grant, read, context, "invalid-date").allowed).toBe(
    false,
  );
});
it("fails closed for malformed grants and requires remediate for changes", () => {
  for (const value of [
    null,
    {},
    { ...grant, assetIds: ["*"] },
    { ...grant, expiresAt: null },
  ])
    expect(authorizeAction(value, read, context, now).allowed).toBe(false);
  const patch = { ...grant, allowedActions: ["apply-patch"] };
  expect(
    authorizeAction(
      patch,
      { kind: "apply-patch", realTransaction: false },
      context,
      now,
    ).allowed,
  ).toBe(false);
  expect(
    authorizeAction(
      patch,
      { kind: "apply-patch", realTransaction: false },
      {
        ...context,
        operationMode: "remediate",
        trustedAuthorizations: [patch],
      },
      now,
    ).allowed,
  ).toBe(true);
});

it("rejects a forged grant that reuses a real reference with broader permissions", () => {
  const forged = { ...grant, allowedActions: ["publish"] };
  expect(
    authorizeAction(
      forged,
      { kind: "publish", realTransaction: false },
      {
        ...context,
        operationMode: "remediate",
        trustedAuthorizations: [grant],
      },
      now,
    ).allowed,
  ).toBe(false);
});
