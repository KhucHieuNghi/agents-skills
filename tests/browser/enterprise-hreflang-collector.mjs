import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { collectHreflangReadOnly } from "../../scripts/enterprise-technical-seo/collector.mjs";
import {
  evaluateHreflangCapture,
  assembleHreflangCaptures,
} from "../../scripts/enterprise-technical-seo/hreflang.mjs";
const output = path.resolve(process.argv[2]);
await fs.mkdir(output);
const received = [];
let robotsMode = "allow";
const server = http.createServer((req, res) => {
  received.push({ method: req.method, url: req.url, at: Date.now() });
  if (req.url === "/redirect") {
    res.writeHead(302, { location: "/" });
    return res.end();
  }
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
  if (["/graph-root", "/graph-de"].includes(req.url))
    return res.end(
      '<!doctype html><head><link rel="alternate" hreflang="en" href="http://public.example/graph-root"><link rel="alternate" hreflang="de" href="http://public.example/graph-de"></head><body></body>',
    );
  if (req.url === "/headers")
    res.setHeader("x-robots-tag", ["noindex", "otherbot: index"]);
  if (req.url === "/missing") res.statusCode = 404;
  res.end(
    '<!doctype html><head><link rel="alternate" hreflang="en" href="http://public.example/"><link rel="alternate" hreflang="de" href="https://outside.example/de"></head><body>' +
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
  const r = await collectHreflangReadOnly(
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
  assert.equal(clean.sources.length, 2);
  for (const source of clean.sources) {
    const raw = JSON.parse(source.artifactText);
    assert.equal(raw.pages[0].complete, true);
    assert.equal(raw.pages[0].alternates.length, 2);
    const result = evaluateHreflangCapture(
      {
        ...clean.scope,
        method: raw.method,
        assessmentAt: clean.finishedAt,
        maxAgeSeconds: 3600,
      },
      source,
    );
    assert.deepEqual(
      result.checks.map((c) => c.status),
      ["pass", "unknown", "pass", "pass", "unknown"],
    );
  }
  assert(!received.some((r) => r.url === "/de"));
  const blocked = await capture("http://public.example/blocked");
  assert.equal(blocked.status, "captured");
  assert.equal(
    JSON.parse(blocked.sources[1].artifactText).pages[0].complete,
    false,
  );
  assert(!received.some((r) => r.method === "POST"));
  const graphRoot = await capture("http://public.example/graph-root");
  const graphTarget = await capture("http://public.example/graph-de");
  assert.equal(graphRoot.status, "captured");
  assert.equal(graphTarget.status, "captured");
  for (let index = 0; index < 2; index++) {
    const method = JSON.parse(graphRoot.sources[index].artifactText).method;
    const context = {
      ...graphRoot.scope,
      method,
      assessmentAt: graphTarget.finishedAt,
      maxAgeSeconds: 3600,
    };
    const assembled = assembleHreflangCaptures(context, [
      graphTarget.sources[index],
      graphRoot.sources[index],
    ]);
    const evaluated = evaluateHreflangCapture(context, assembled);
    assert.deepEqual(
      evaluated.checks.map((check) => check.status),
      ["pass", "pass", "pass", "pass", "pass"],
    );
    assert.equal(evaluated.provenance.length, 2);
  }
  robotsMode = "deny";
  const denied = await capture();
  assert.equal(denied.status, "unknown");
  assert(!denied.sources);
  robotsMode = "error";
  const unavailable = await capture();
  assert.equal(unavailable.status, "unknown");
  robotsMode = "allow";
  const missing = await capture("http://public.example/missing");
  assert.equal(missing.status, "unknown");
  assert(!missing.sources);
  await assert.rejects(
    collectHreflangReadOnly(
      plan,
      { ...host, context: { ...host.context, trustedAuthorizations: [] } },
      adapters,
    ),
    /not authorized/,
  );
  const redirected = await capture("http://public.example/redirect");
  assert.equal(redirected.status, "unknown");
  assert(!redirected.sources);
  robotsMode = "delay-budget";
  const budget = await capture();
  assert.equal(budget.status, "unknown");
  robotsMode = "hang";
  const hung = await capture(plan.url, { timeoutMs: 300, observeMs: 20 });
  assert.equal(hung.status, "unknown");
  await fs.writeFile(
    path.join(output, "receipts.json"),
    JSON.stringify({ cases: 10, captures, received }, null, 2) + "\n",
  );
  process.stdout.write(JSON.stringify({ cases: 10, output }) + "\n");
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
