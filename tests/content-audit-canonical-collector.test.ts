import { expect, it } from "vitest";
// @ts-expect-error development ESM collector
import { collectCanonicalReadOnly } from "../scripts/enterprise-technical-seo/collector.mjs";
function fixture() {
  let launched = 0;
  const grant = {
    authorizationRef: "session",
    customerId: "customer",
    environment: "production",
    assetIds: ["site"],
    identityId: "anonymous",
    allowedActions: ["read"],
    grantedAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    revokedAt: null,
    sideEffectConstraints: { allowRealTransactions: false },
  };
  return {
    plan: {
      url: "https://example.com/",
      authorizationRef: "session",
      observeMs: 0,
      timeoutMs: 1000,
      maxBytes: 1024,
      maxRequests: 10,
    },
    host: {
      chromium: {
        launch: () => {
          launched++;
          throw Error("Must not launch");
        },
      },
      synthetic: true,
      allowedOrigins: ["https://example.com"],
      profile: { id: "desktop", width: 1280, height: 800 },
      context: {
        customerId: "customer",
        assetId: "site",
        environment: "production",
        identityId: "anonymous",
        operationMode: "audit",
        trustedAuthorizations: [grant],
      },
    },
    launched: () => launched,
  };
}
it.each([null, undefined, 0, -1, Infinity, 9 * 1024 * 1024])(
  "rejects invalid body limit %s before launch",
  async (maxBytes) => {
    const f = fixture();
    await expect(
      collectCanonicalReadOnly({ ...f.plan, maxBytes }, f.host),
    ).rejects.toThrow();
    expect(f.launched()).toBe(0);
  },
);
it.each(["customerId", "assetId", "environment", "identityId"])(
  "rejects mismatched host scope %s before launch",
  async (key) => {
    const f = fixture();
    Object.assign(f.host.context, { [key]: "other" });
    await expect(collectCanonicalReadOnly(f.plan, f.host)).rejects.toThrow(
      "not authorized",
    );
    expect(f.launched()).toBe(0);
  },
);
it("rejects injected authority and foreign origin before launch", async () => {
  const f = fixture();
  await expect(
    collectCanonicalReadOnly({ ...f.plan, trustedAuthorizations: [] }, f.host),
  ).rejects.toThrow();
  await expect(
    collectCanonicalReadOnly(
      { ...f.plan, url: "https://other.example/" },
      f.host,
    ),
  ).rejects.toThrow("not authorized");
  expect(f.launched()).toBe(0);
});
