import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { evaluateLighthouseLab } from "../../scripts/enterprise-performance/lighthouse.mjs";

// Explicit local dependency root; no global installation or production navigation.
assert(
  process.argv[2] && process.argv[3],
  "Usage: node tests/browser/enterprise-lighthouse.mjs DEPENDENCY_ROOT NEW_OUTPUT",
);
const require = createRequire(import.meta.url),
  dependencyRoot = resolve(process.argv[2]),
  output = resolve(process.argv[3]);
const { default: lighthouse } = await import(
  pathToFileURL(require.resolve("lighthouse", { paths: [dependencyRoot] })).href
);
const { launch } = await import(
  pathToFileURL(require.resolve("chrome-launcher", { paths: [dependencyRoot] }))
    .href
);
await mkdir(output); // Existing evidence is immutable; do not overwrite a trial.
const sha = (x) => createHash("sha256").update(x).digest("hex");
const server = createServer((req, res) => {
  if (req.url !== "/") {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic lab fixture</title><style>body{font:20px system-ui;margin:32px;max-width:720px}section{background:#e2e8f0;padding:40px}a{color:#153a73}</style></head><body><main><h1>Synthetic performance fixture</h1><section><h2>Local measurement</h2><p>This fixture has no remote resources, forms or transactions.</p><a href="#details">Read details</a></section><p id="details">Deterministic content for a local lab observation.</p></main></body></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const targetUrl = `http://127.0.0.1:${server.address().port}/`;
const scope = {
  customerId: "synthetic-lab",
  entityId: "local-fixture",
  environment: "test",
};
const protocol = {
  version: 1,
  lighthouseVersion: "13.6.0",
  procedure: "three sequential fresh-browser navigation runs",
  formFactor: "mobile",
  throttlingMethod: "simulate",
  fixture: "local-inline-content-v1",
  browserExecutable: chromium.executablePath(),
};
const protocolDigest = sha(JSON.stringify(protocol)),
  sources = [],
  verifiedRuns = [],
  from = new Date().toISOString();
try {
  for (let i = 1; i <= 3; i++) {
    const startedAt = new Date().toISOString();
    const chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: [
        "--headless=new",
        "--disable-background-networking",
        "--disable-component-update",
        "--no-first-run",
      ],
    });
    try {
      const result = await lighthouse(targetUrl, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance"],
        formFactor: "mobile",
        throttlingMethod: "simulate",
      });
      const finishedAt = new Date().toISOString();
      assert(result?.lhr, "No Lighthouse result");
      const artifactText = JSON.stringify(result.lhr),
        artifactHash = sha(artifactText);
      const source = {
        sourceId: `run-${i}`,
        sourceKind: "lighthouse-json",
        scope,
        capturedAt: finishedAt,
        artifactText,
        artifactHash,
      };
      sources.push(source);
      verifiedRuns.push({
        runId: `run-${i}`,
        artifactHash,
        startedAt,
        finishedAt,
        protocolDigest,
        machineId: "local-test-runner",
        scope,
        targetUrl,
        formFactor: "mobile",
      });
      await writeFile(resolve(output, `run-${i}.json`), artifactText);
      process.stdout.write(`Captured synthetic Lighthouse run ${i}\n`);
    } finally {
      await chrome.kill();
    }
  }
  const to = new Date().toISOString();
  const context = {
    ...scope,
    targetUrl,
    formFactor: "mobile",
    assessmentAt: to,
    window: { from, to },
    maxAgeSeconds: 86400,
    protocolDigest,
  };
  const result = evaluateLighthouseLab(context, sources, { verifiedRuns });
  await writeFile(
    resolve(output, "protocol.json"),
    JSON.stringify(protocol, null, 2),
  );
  await writeFile(
    resolve(output, "evaluation-input.json"),
    JSON.stringify({ context, sources }, null, 2),
  );
  await writeFile(
    resolve(output, "trusted-receipts.json"),
    JSON.stringify({ verifiedRuns }, null, 2),
  );
  await writeFile(
    resolve(output, "result.json"),
    JSON.stringify(result, null, 2),
  );
  assert.equal(result.fieldAssessment, "not-assessed");
  assert.equal(result.measurementCount, 3);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].summaryStatus, "repeated-lab-summary");
  assert.equal(result.groups[0].statistics.lcp.count, 3);
  process.stdout.write(
    "Three real local lab runs passed normalization and sequential summary checks.\n",
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
