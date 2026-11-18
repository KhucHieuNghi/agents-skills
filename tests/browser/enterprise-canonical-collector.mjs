import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { collectCanonicalReadOnly } from "../../scripts/enterprise-technical-seo/collector.mjs";
const output = path.resolve(process.argv[2]);
await fs.mkdir(output);
const received = [];
const server = http.createServer((req, res) => {
  received.push({ method: req.method, url: req.url });
  res.setHeader("content-type", "text/html; charset=utf-8");
  if (req.url === "/repeated")
    res.setHeader("link", [
      '</preferred>; rel="canonical"',
      '</asset>; rel="preload"; as="script"',
    ]);
  res.end(
    '<!doctype html><head><link rel="canonical" href="/preferred"></head><body>' +
      (req.url === "/denied"
        ? '<script>fetch("/api").then(r=>r.text()).catch(()=>{});</script>'
        : req.url === "/hang"
          ? "<script>while(true){}</script>"
          : req.url === "/blocked"
            ? '<script>fetch("/submit",{method:"POST"}).catch(()=>{});fetch("http://127.0.0.1:9/private").catch(()=>{});</script>'
            : "") +
      "</body>",
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const grant = {
  authorizationRef: "host-session",
  customerId: "synthetic",
  environment: "sandbox",
  assetIds: ["site"],
  allowedActions: ["read"],
  identityId: "anonymous",
  grantedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  revokedAt: null,
  sideEffectConstraints: { allowRealTransactions: false },
};
const host = {
  chromium,
  synthetic: true,
  allowedOrigins: ["http://public.example"],
  profile: { id: "desktop", width: 1280, height: 800 },
  context: {
    customerId: "synthetic",
    environment: "sandbox",
    assetId: "site",
    identityId: "anonymous",
    operationMode: "audit",
    trustedAuthorizations: [grant],
  },
};
const plan = {
  url: "http://public.example/",
  authorizationRef: "host-session",
  observeMs: 100,
  timeoutMs: 5000,
  maxBytes: 1024 * 1024,
  maxRequests: 20,
};
const pins = [];
const adapters = {
  proxy: {
    lookup: async () => [{ address: "93.184.216.34", family: 4 }],
    httpRequest: (url, options, callback) => {
      options.lookup(url.hostname, {}, (_error, address, family) =>
        pins.push({ address, family }),
      );
      return http.request(
        {
          ...options,
          host: "127.0.0.1",
          port: server.address().port,
          path: url.pathname,
          lookup: undefined,
        },
        callback,
      );
    },
  },
};
try {
  const clean = await collectCanonicalReadOnly(plan, host, adapters);
  assert.equal(clean.status, "captured");
  assert(
    !clean.gaps.some((gap) => gap.includes("cleanup")),
    "Successful capture must detach before closing its browser",
  );
  const parsed = JSON.parse(clean.source.artifactText);
  assert.equal(parsed.layers.sourceHead.complete, true);
  assert.equal(parsed.layers.renderedHead.complete, true);
  assert.deepEqual(parsed.layers.renderedHead.targets, [
    "http://public.example/preferred",
  ]);
  const repeated = await collectCanonicalReadOnly(
    { ...plan, url: "http://public.example/repeated" },
    host,
    adapters,
  );
  assert.equal(
    JSON.parse(repeated.source.artifactText).layers.httpLink.complete,
    true,
  );
  assert.deepEqual(
    JSON.parse(repeated.source.artifactText).layers.httpLink.targets,
    ["http://public.example/preferred"],
  );
  const blocked = await collectCanonicalReadOnly(
    { ...plan, url: "http://public.example/blocked" },
    host,
    adapters,
  );
  assert.equal(blocked.status, "captured");
  assert(blocked.gaps.includes("request-blocked"));
  assert.equal(
    JSON.parse(blocked.source.artifactText).layers.renderedHead.complete,
    false,
  );
  assert(received.every((r) => r.method === "GET" && r.url !== "/submit"));
  let lookups = 0;
  const denied = await collectCanonicalReadOnly(
    { ...plan, url: "http://public.example/denied", observeMs: 300 },
    host,
    {
      proxy: {
        ...adapters.proxy,
        lookup: async () => [
          {
            address: ++lookups === 1 ? "93.184.216.34" : "127.0.0.1",
            family: 4,
          },
        ],
      },
    },
  );
  assert.equal(denied.status, "captured");
  assert(denied.gaps.includes("transport-denied"));
  assert.equal(
    JSON.parse(denied.source.artifactText).layers.renderedHead.complete,
    false,
  );
  assert(!received.some((r) => r.url === "/api"));
  const midRevoked = await collectCanonicalReadOnly(plan, host, {
    proxy: {
      ...adapters.proxy,
      httpRequest: (url, options, callback) =>
        adapters.proxy.httpRequest(url, options, (response) => {
          grant.revokedAt = new Date().toISOString();
          callback(response);
        }),
    },
  });
  assert.equal(midRevoked.status, "unknown");
  assert.equal(midRevoked.source, undefined);
  assert.equal(midRevoked.privateEvidence, undefined);
  grant.revokedAt = null;
  const before = received.length;
  await assert.rejects(() =>
    collectCanonicalReadOnly(
      { ...plan, authorizationRef: "forged" },
      host,
      adapters,
    ),
  );
  await assert.rejects(() =>
    collectCanonicalReadOnly(
      { ...plan, scope: { customerId: "other" } },
      host,
      adapters,
    ),
  );
  const revoked = {
    ...host,
    context: {
      ...host.context,
      trustedAuthorizations: [
        { ...grant, revokedAt: new Date().toISOString() },
      ],
    },
  };
  await assert.rejects(() => collectCanonicalReadOnly(plan, revoked, adapters));
  assert.equal(received.length, before);
  const started = Date.now();
  const hung = await collectCanonicalReadOnly(
    { ...plan, url: "http://public.example/hang", timeoutMs: 1000 },
    host,
    adapters,
  );
  assert.equal(hung.status, "unknown");
  assert(hung.gaps.includes("collection-deadline"));
  assert(Date.now() - started < 6000);
  await fs.writeFile(
    path.join(output, "evidence.json"),
    JSON.stringify(
      { clean, blocked, denied, midRevoked, hung, received, pins },
      null,
      2,
    ),
  );
  process.stdout.write('{"passed":true,"cases":9}\n');
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
