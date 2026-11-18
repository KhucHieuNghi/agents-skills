import { expect, it } from "vitest";
// @ts-expect-error development ESM collector
import {
  collectCanonicalReadOnly,
  collectHreflangReadOnly,
  collectIndexControlsReadOnly,
} from "../scripts/enterprise-technical-seo/collector.mjs";
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

it("applies the same no-network preflight to the index-controls entrypoint", async () => {
  const f = fixture();
  let lookups = 0;
  const adapters = {
    robots: {
      lookup: async () => {
        lookups++;
        throw Error("must not resolve");
      },
    },
  };
  await expect(
    collectIndexControlsReadOnly(
      { ...f.plan, authorizationRef: "forged" },
      f.host,
      adapters,
    ),
  ).rejects.toThrow();
  await expect(
    collectIndexControlsReadOnly(
      { ...f.plan, trustedAuthorizations: [] },
      f.host,
      adapters,
    ),
  ).rejects.toThrow();
  await expect(
    collectIndexControlsReadOnly(
      { ...f.plan, url: "https://other.example/" },
      f.host,
      adapters,
    ),
  ).rejects.toThrow();
  expect(lookups).toBe(0);
  expect(f.launched()).toBe(0);
});
it("keeps private DNS and revoked-during-DNS robots requests off the network", async () => {
  for (const mode of ["private", "revoked"]) {
    const f = fixture();
    let sent = 0;
    const result = await collectIndexControlsReadOnly(f.plan, f.host, {
      robots: {
        lookup: async () => {
          if (mode === "revoked")
            f.host.context.trustedAuthorizations[0].revokedAt =
              new Date().toISOString();
          return [
            {
              address: mode === "private" ? "127.0.0.1" : "93.184.216.34",
              family: 4,
            },
          ];
        },
        request: () => {
          sent++;
          throw Error("must not send");
        },
      },
    });
    expect(sent).toBe(0);
    expect(f.launched()).toBe(0);
    expect(result.status).toBe("unknown");
    expect(result.source).toBeUndefined();
    expect(result.sources).toBeUndefined();
    expect(result.privateEvidence).toBeUndefined();
  }
});

it("applies the same no-network preflight to the hreflang entrypoint", async () => {
  const f = fixture();
  let lookups = 0;
  const adapters = {
    robots: {
      lookup: async () => {
        lookups++;
        throw Error("must not resolve");
      },
    },
  };
  await expect(
    collectHreflangReadOnly(
      { ...f.plan, authorizationRef: "forged" },
      f.host,
      adapters,
    ),
  ).rejects.toThrow();
  await expect(
    collectHreflangReadOnly(
      { ...f.plan, trustedAuthorizations: [] },
      f.host,
      adapters,
    ),
  ).rejects.toThrow();
  await expect(
    collectHreflangReadOnly(
      { ...f.plan, url: "https://other.example/" },
      f.host,
      adapters,
    ),
  ).rejects.toThrow();
  expect(lookups).toBe(0);
  expect(f.launched()).toBe(0);
});
it("keeps hreflang private DNS and revoked-during-DNS requests off the network", async () => {
  for (const mode of ["private", "revoked"]) {
    const f = fixture();
    let sent = 0;
    const result = await collectHreflangReadOnly(f.plan, f.host, {
      robots: {
        lookup: async () => {
          if (mode === "revoked")
            f.host.context.trustedAuthorizations[0].revokedAt =
              new Date().toISOString();
          return [
            {
              address: mode === "private" ? "127.0.0.1" : "93.184.216.34",
              family: 4,
            },
          ];
        },
        request: () => {
          sent++;
          throw Error("must not send");
        },
      },
    });
    expect(sent).toBe(0);
    expect(f.launched()).toBe(0);
    expect(result.status).toBe("unknown");
    expect(result.source).toBeUndefined();
    expect(result.sources).toBeUndefined();
    expect(result.privateEvidence).toBeUndefined();
  }
});
