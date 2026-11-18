import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { collectIndexControlsReadOnly } from "../../scripts/enterprise-technical-seo/collector.mjs";
import { evaluateIndexControls } from "../../scripts/enterprise-technical-seo/index-controls.mjs";
const output = path.resolve(process.argv[2]);
await fs.mkdir(output);
const received = [];
let robotsMode = "allow";
const server = http.createServer((req, res) => {
  received.push({ method: req.method, url: req.url, at: Date.now() });
  if (req.url === "/robots.txt") {
    if (robotsMode === "hang") return;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    if (robotsMode === "asset-deny")
      return res.end("User-agent: *\nAllow: /\nDisallow: /asset$");
    if (robotsMode === "slow-delay")
      return res.end("User-agent: *\nAllow: /\nCrawl-delay: 0.2");
    if (robotsMode === "delay")
      return res.end("User-agent: *\nAllow: /\nCrawl-delay: 0.1");
    if (robotsMode === "delay-budget")
      return res.end("User-agent: *\nAllow: /\nCrawl-delay: 100000");

    if (robotsMode === "redirect") {
      res.writeHead(302, { location: "/policy" });
      return res.end();
    }
    if (robotsMode === "error") {
      res.writeHead(503);
      return res.end("unavailable");
    }
    return res.end(
      robotsMode === "deny"
        ? "User-agent: *\nDisallow: /"
        : "User-agent: *\nAllow: /",
    );
  }
  if (req.url === "/policy") {
    res.setHeader("content-type", "text/plain");
    return res.end("User-agent: *\nAllow: /");
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  if (req.url === "/headers")
    res.setHeader("x-robots-tag", ["noindex", "otherbot: index"]);
  if (req.url === "/missing") res.statusCode = 404;
  res.end(
    '<!doctype html><head></head><body><meta name="robots" content="noindex">' +
      (req.url === "/concurrent"
        ? '<script>fetch("/asset-a").catch(()=>{});fetch("/asset-b").catch(()=>{});</script>'
        : req.url === "/asset-page"
          ? '<script>fetch("/asset").catch(()=>{})</script>'
          : req.url === "/blocked"
            ? '<script>fetch("/submit",{method:"POST"}).catch(()=>{})</script>'
            : "") +
      "</body>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
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
  timeoutMs: 6000,
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

adapters.robots = {
  lookup: adapters.proxy.lookup,
  request: adapters.proxy.httpRequest,
};
const captures = [];
const capture = async (url = plan.url, extra = {}) => {
  const r = await collectIndexControlsReadOnly(
    { ...plan, url, ...extra },
    host,
    adapters,
  );
  captures.push(r);
  return r;
};
try {
  const clean = await capture();
  assert.equal(clean.status, "captured");
  const data = JSON.parse(clean.source.artifactText);
  assert.equal(data.sourceDocument.complete, true);
  assert.equal(data.renderedDocument.complete, true);
  assert.deepEqual(data.sourceDocument.meta, [
    { name: "robots", content: "noindex" },
  ]);
  assert(data.robots.complete);
  assert(!clean.gaps.some((g) => g.includes("cleanup")));
  const result = evaluateIndexControls(
    {
      ...clean.scope,
      crawler: "googlebot",
      assessmentAt: clean.finishedAt,
      maxAgeSeconds: 3600,
      expectedHttpStatus: 200,
      expectedCrawlAllowed: true,
      expectedIndexable: true,
    },
    clean.source,
  );
  assert.equal(result.checks[2].status, "fail");
  const headers = await capture("http://public.example/headers");
  assert(
    JSON.parse(headers.source.artifactText)
      .httpHeaders.values.join(",")
      .includes("noindex"),
  );
  const missing = await capture("http://public.example/missing");
  assert.equal(JSON.parse(missing.source.artifactText).response.status, 404);
  const blocked = await capture("http://public.example/blocked");
  assert.equal(
    JSON.parse(blocked.source.artifactText).renderedDocument.complete,
    false,
  );
  assert(!received.some((r) => r.url === "/submit"));
  robotsMode = "asset-deny";
  const resourceDenied = await capture("http://public.example/asset-page");
  assert.equal(resourceDenied.status, "captured");
  assert(resourceDenied.gaps.includes("robots-resource-blocked"));
  assert(!received.some((r) => r.url === "/asset"));
  robotsMode = "delay";
  const spacingStart = received.length;
  const delayed = await capture("http://public.example/asset-page", {
    observeMs: 300,
  });
  assert.equal(delayed.status, "captured");
  const spaced = received
    .slice(spacingStart)
    .filter((r) => ["/asset-page", "/asset"].includes(r.url));
  assert.equal(spaced.length, 2);
  assert(spaced[1].at - spaced[0].at >= 80);
  robotsMode = "slow-delay";
  let resolutionCount = 0;
  const concurrentStart = received.length;
  const paced = await collectIndexControlsReadOnly(
    { ...plan, url: "http://public.example/concurrent", observeMs: 1600 },
    host,
    {
      ...adapters,
      proxy: {
        ...adapters.proxy,
        lookup: async () => {
          if (++resolutionCount === 2) await delay(300);
          return [{ address: "93.184.216.34", family: 4 }];
        },
      },
    },
  );
  assert.equal(paced.status, "captured");
  captures.push(paced);
  const dispatched = received
    .slice(concurrentStart)
    .filter((r) => ["/asset-a", "/asset-b"].includes(r.url));
  assert.equal(dispatched.length, 2);
  assert(
    dispatched[1].at - dispatched[0].at >= 180,
    "DNS latency must not collapse crawl-delay spacing",
  );
  robotsMode = "delay-budget";
  const delayBudget = await capture();
  assert.equal(delayBudget.status, "unknown");
  assert(delayBudget.gaps.includes("robots-delay-exceeds-budget"));
  robotsMode = "deny";
  let before = received.length;
  const denied = await capture();
  assert.equal(denied.status, "unknown");
  assert(denied.gaps.includes("robots-collection-blocked"));
  assert.deepEqual(
    received.slice(before).map((r) => r.url),
    ["/robots.txt"],
  );
  robotsMode = "error";
  const error = await capture();
  assert.equal(error.status, "unknown");
  assert.equal(error.source, undefined);
  robotsMode = "redirect";
  const redirected = await capture();
  assert.equal(redirected.status, "captured");
  assert.equal(
    JSON.parse(redirected.source.artifactText).robots.complete,
    false,
  );
  robotsMode = "allow";
  const midRevoked = await collectIndexControlsReadOnly(plan, host, {
    ...adapters,
    robots: {
      ...adapters.robots,
      request: (url, options, callback) =>
        adapters.robots.request(url, options, (response) => {
          grant.revokedAt = new Date().toISOString();
          callback(response);
        }),
    },
  });
  assert.equal(midRevoked.status, "unknown");
  assert.equal(midRevoked.source, undefined);
  grant.revokedAt = null;
  before = received.length;
  await assert.rejects(() =>
    collectIndexControlsReadOnly(
      { ...plan, authorizationRef: "forged" },
      host,
      adapters,
    ),
  );
  assert.equal(received.length, before);
  robotsMode = "hang";
  const started = Date.now();
  const hung = await capture(plan.url, { timeoutMs: 1000 });
  assert.equal(hung.status, "unknown");
  assert(
    hung.gaps.includes("collection-deadline") ||
      hung.gaps.includes("robots-unavailable"),
  );
  assert(Date.now() - started < 6000);
  assert(received.every((r) => r.method === "GET"));
  await fs.writeFile(
    path.join(output, "evidence.json"),
    JSON.stringify({ captures, midRevoked, received, pins }, null, 2),
  );
  process.stdout.write('{"passed":true,"cases":14}\n');
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
