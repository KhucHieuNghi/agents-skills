import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { collectStructuredDataReadOnly } from "../../scripts/enterprise-technical-seo/collector.mjs";
import { evaluateStructuredData } from "../../scripts/enterprise-technical-seo/structured-data.mjs";
const output = path.resolve(process.argv[2]);
await fs.mkdir(output);
const received = [];
let robotsMode = "allow";
const server = http.createServer((req, res) => {
  received.push({ method: req.method, url: req.url });
  if (req.url === "/robots.txt") {
    res.setHeader("content-type", "text/plain");
    return res.end(
      robotsMode === "deny"
        ? "User-agent: *\nDisallow: /"
        : "User-agent: *\nAllow: /",
    );
  }
  if (req.url === "/redirect") {
    res.writeHead(302, { location: "/" });
    return res.end();
  }
  res.setHeader("content-type", "text/html");
  if (req.url === "/missing") res.statusCode = 404;
  if (req.url === "/escaped-budget")
    return res.end(
      "<html><body>" +
        (
          '<script type="application/ld+json">' +
          "\t".repeat(256 * 1024) +
          "</script>"
        ).repeat(4) +
        "</body></html>",
    );
  const data =
    req.url === "/malformed"
      ? "{bad"
      : '{"@context":"https://schema.org","@type":"Organization"}';
  res.end(
    '<!doctype html><head></head><body><script id="ld" type="application/ld+json">' +
      data +
      "</script>" +
      (req.url === "/remove"
        ? '<script>document.getElementById("ld").remove()</script>'
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
  const r = await collectStructuredDataReadOnly(
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
    assert.equal(raw.projection.complete, true);
    assert.equal(raw.projection.blocks.length, 1);
    const result = evaluateStructuredData(
      {
        ...clean.scope,
        method: raw.method,
        assessmentAt: clean.finishedAt,
        maxAgeSeconds: 3600,
        expectedTypes: ["Organization"],
      },
      source,
    );
    assert.deepEqual(
      result.checks.map((c) => c.status),
      ["pass", "pass", "pass", "unknown"],
    );
  }
  const removed = await capture("http://public.example/remove");
  assert.equal(
    JSON.parse(removed.sources[0].artifactText).projection.blocks.length,
    1,
  );
  assert.equal(
    JSON.parse(removed.sources[1].artifactText).projection.blocks.length,
    0,
  );
  const bad = await capture("http://public.example/malformed");
  for (const source of bad.sources) {
    const raw = JSON.parse(source.artifactText);
    const result = evaluateStructuredData(
      {
        ...bad.scope,
        method: raw.method,
        assessmentAt: bad.finishedAt,
        maxAgeSeconds: 3600,
        expectedTypes: null,
      },
      source,
    );
    assert.equal(result.checks[0].status, "fail");
  }
  const blocked = await capture("http://public.example/blocked");
  const rendered = JSON.parse(blocked.sources[1].artifactText);
  assert.equal(rendered.projection.complete, false);
  assert.deepEqual(rendered.projection.blocks, []);
  assert.deepEqual(rendered.otherFormatsObserved, []);
  assert(!received.some((r) => r.method === "POST"));
  for (const suffix of ["redirect", "missing"]) {
    const result = await capture("http://public.example/" + suffix);
    assert.equal(result.status, "unknown");
    assert(!result.sources);
  }
  await assert.rejects(
    collectStructuredDataReadOnly(
      plan,
      { ...host, context: { ...host.context, trustedAuthorizations: [] } },
      adapters,
    ),
    /not authorized/,
  );
  const oversized = await capture("http://public.example/escaped-budget", {
    maxBytes: 2 * 1024 * 1024,
  });
  assert.equal(oversized.status, "unknown");
  assert(!oversized.sources);
  assert(oversized.gaps.includes("structured-data-envelope-size-limit"));
  robotsMode = "deny";
  const denied = await capture();
  assert.equal(denied.status, "unknown");
  assert(!denied.sources);
  await fs.writeFile(
    path.join(output, "receipts.json"),
    JSON.stringify({ cases: 9, captures, received }, null, 2) + "\n",
  );
  process.stdout.write(JSON.stringify({ cases: 9, output }) + "\n");
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
