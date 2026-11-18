import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { createHash } from "node:crypto";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { collectBrowserReadOnly } from "../../scripts/enterprise-browser/collect.mjs";
const output = path.resolve(
  process.argv[2] ?? "build/enterprise-browser-collector",
);
await fs.mkdir(output);
const received = [];
const server = http.createServer((request, response) => {
  received.push({ url: request.url, method: request.method });
  response.setHeader("content-type", "text/html");
  if (request.url === "/hang") {
    response.end("<script>while(true){}</script>");
    return;
  }
  response.end(`<!doctype html><html lang="en"><title>Synthetic collector</title><body>
 <script>
 window.dataLayer.push({event:"page_view",email:"synthetic-private@example.invalid"});
 window.dataLayer.push({event:"unmapped-secret-name"});
 fetch("/must-not-submit",{method:"POST",body:"synthetic-private"}).catch(()=>{});
 fetch("http://127.0.0.1:9/private").catch(()=>{});
 </script></body></html>`);
});
let backendConnections = 0;
server.on("connection", () => {
  backendConnections++;
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const now = new Date().toISOString();
const grant = {
  authorizationRef: "host-session",
  customerId: "synthetic",
  environment: "sandbox",
  assetIds: ["site"],
  allowedActions: ["read"],
  identityId: "anonymous",
  grantedAt: now,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  revokedAt: null,
  sideEffectConstraints: { allowRealTransactions: false },
};
const host = {
  chromium,
  synthetic: true,
  allowedOrigins: ["http://public.example"],
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
  eventNames: ["page_view"],
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
  const result = await collectBrowserReadOnly(plan, host, adapters);
  assert.equal(result.status, "partial");
  assert.deepEqual(result.scope, {
    customerId: "synthetic",
    assetId: "site",
    environment: "sandbox",
  });
  assert(
    result.observations.some(
      (o) => o.kind === "data-layer" && o.eventName === "page_view",
    ),
  );
  assert.equal(result.coverage.provider, "unobserved");
  assert(result.gaps.includes("request-blocked"));
  assert(
    received.every((r) => r.method === "GET" && r.url !== "/must-not-submit"),
  );
  assert(pins.length > 0);
  assert(pins.every((p) => p.address === "93.184.216.34"));
  const bytes = JSON.stringify(result, null, 2) + "\n";
  assert(!bytes.includes("synthetic-private"));
  assert(!bytes.includes("unmapped-secret-name"));
  await fs.writeFile(path.join(output, "capture.json"), bytes);
  const before = received.length;
  await assert.rejects(
    () =>
      collectBrowserReadOnly(
        { ...plan, authorizationRef: "import-forged" },
        host,
        adapters,
      ),
    /not authorized/,
  );
  await assert.rejects(
    () =>
      collectBrowserReadOnly(
        { ...plan, url: "http://127.0.0.1/" },
        host,
        adapters,
      ),
    /outside trusted/,
  );
  await assert.rejects(
    () =>
      collectBrowserReadOnly(
        { ...plan, steps: [{ click: "#submit" }] },
        host,
        adapters,
      ),
    /Invalid browser plan/,
  );
  assert.equal(received.length, before);
  const beforePrivate = received.length;
  const connectionsBeforePrivate = backendConnections;
  const privateCases = [];
  for (const scheme of ["http", "https"]) {
    const origin = scheme + "://127.0.0.1:" + server.address().port;
    const captured = await collectBrowserReadOnly(
      { ...plan, url: origin + "/", observeMs: 0, timeoutMs: 2000 },
      { ...host, allowedOrigins: [origin] },
    );
    assert.equal(
      received.length,
      beforePrivate,
      "Browser bypassed proxy for loopback",
    );
    assert.equal(
      backendConnections,
      connectionsBeforePrivate,
      "Browser made a direct loopback TCP connection",
    );
    assert(captured.transport.some((e) => e.kind === "blocked"));
    assert(captured.gaps.includes("transport-denied"));
    assert(!captured.gaps.includes("cleanup-failed"));
    privateCases.push({
      scheme,
      requestsReachedBackend: 0,
      tcpConnectionsReachedBackend:
        backendConnections - connectionsBeforePrivate,
      gaps: captured.gaps,
    });
  }
  const began = Date.now();
  const hung = await collectBrowserReadOnly(
    {
      ...plan,
      url: "http://public.example/hang",
      observeMs: 0,
      timeoutMs: 1500,
    },
    host,
    adapters,
  );
  const timeoutElapsedMs = Date.now() - began;
  assert(hung.gaps.includes("collection-timeout"));
  assert(
    timeoutElapsedMs < 4000,
    "Renderer hang exceeded collector+cleanup deadline",
  );
  assert(!hung.gaps.includes("cleanup-timeout"));
  const hungBytes = JSON.stringify(hung, null, 2) + "\n";
  await fs.writeFile(path.join(output, "renderer-timeout.json"), hungBytes);
  const summary = {
    synthetic: true,
    passed: true,
    captureHash: createHash("sha256").update(bytes).digest("hex"),
    browserVersion: result.browserVersion,
    timeoutElapsedMs,
    privateCases,
    timeoutCaptureHash: createHash("sha256").update(hungBytes).digest("hex"),
    requests: received,
    pins,
    observedEvents: result.observations.filter((o) => o.kind === "data-layer")
      .length,
    providerReceipt: false,
    productionAcceptance: false,
  };
  await fs.writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary));
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
