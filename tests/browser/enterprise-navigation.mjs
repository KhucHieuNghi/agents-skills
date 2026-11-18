import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import process from "node:process";
import assert from "node:assert/strict";
import { URL } from "node:url";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { observeCanonicalNavigation } from "../../scripts/enterprise-technical-seo/navigation.mjs";
import { projectRenderedCanonical } from "../../scripts/enterprise-technical-seo/document-collector.mjs";
assert(process.argv[2], "NEW_OUTPUT required");
const out = resolve(process.argv[2]);
await mkdir(out);
let count = 0,
  hold = false,
  notifyHeld;
const heldResponses = [];
const requests = [];
const server = createServer((req, res) => {
  requests.push(req.url);
  if (req.url === "/abort") {
    req.socket.destroy();
    return;
  }
  if (req.url === "/redirect") {
    res.writeHead(302, { Location: "/same" });
    res.end();
    return;
  }
  if (req.url !== "/same") {
    res.writeHead(404);
    res.end();
    return;
  }
  if (hold) {
    heldResponses.push(res);
    notifyHeld?.();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(
    '<!doctype html><head><link rel="canonical" href="/version-' +
      ++count +
      '"></head><body>Version ' +
      count +
      "</body>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", (route) =>
    route.request().method() === "GET" &&
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  await context.routeWebSocket("**/*", (socket) => socket.close());
  const page = await context.newPage();
  const observer = await observeCanonicalNavigation(page, {
    maxBodyBytes: 1024 * 1024,
    maxDocumentRequests: 20,
    timeoutMs: 5000,
  });
  await page.goto(origin + "/same");
  const first = await observer.snapshot();
  assert.equal(first.status, "captured");
  assert(first.body.includes("version-1"));
  await page.reload();
  const second = await observer.snapshot();
  assert.equal(second.status, "captured");
  assert(second.body.includes("version-2"));
  assert.notEqual(first.binding.loaderId, second.binding.loaderId);
  assert.notEqual(first.binding.requestId, second.binding.requestId);
  assert.notEqual(first.bodyHash, second.bodyHash);
  const dom = await projectRenderedCanonical(page, origin + "/same");
  assert.equal(dom.navigationBinding.loaderId, second.binding.loaderId);
  assert.notEqual(dom.navigationBinding.loaderId, first.binding.loaderId);
  await page.goto(origin + "/redirect");
  const redirected = await observer.snapshot();
  assert.equal(redirected.status, "captured");
  assert.equal(redirected.redirects.length, 1);
  assert.equal(redirected.redirects[0].status, 302);
  assert.equal(redirected.responseUrl, origin + "/same");
  try {
    await page.goto(origin + "/abort", { timeout: 5000 });
  } catch {
    /* expected native navigation failure */
  }
  const aborted = await observer.snapshot();
  assert.equal(aborted.status, "unknown");
  await observer.close();
  assert.equal((await observer.snapshot()).reason, "observer-closed");
  const heldPage = await context.newPage();
  const heldObserver = await observeCanonicalNavigation(heldPage, {
    maxBodyBytes: 1024 * 1024,
    maxDocumentRequests: 10,
    timeoutMs: 100,
  });
  await heldPage.goto(origin + "/same");
  hold = true;
  const heldRequest = new Promise((resolve) => {
    notifyHeld = resolve;
  });
  const reload = heldPage.reload({ timeout: 1000 }).catch(() => null);
  await heldRequest;
  const deadlineStarted = Date.now();
  const timedOut = await heldObserver.snapshot();
  const deadlineElapsedMs = Date.now() - deadlineStarted;
  assert.equal(timedOut.status, "unknown");
  assert(deadlineElapsedMs < 2000);
  hold = false;
  for (const response of heldResponses) response.destroy();
  await reload;
  await heldObserver.close();
  const evidence = {
    timedOut,
    deadlineElapsedMs,
    synthetic: true,
    first,
    second,
    dom,
    redirected,
    aborted,
    requests,
    browserVersion: browser.version(),
  };
  const text = JSON.stringify(evidence, null, 2) + "\n";
  await writeFile(resolve(out, "evidence.json"), text);
  await writeFile(
    resolve(out, "receipt.json"),
    JSON.stringify(
      {
        passed: true,
        synthetic: true,
        cases: 5,
        evidenceHash: createHash("sha256").update(text).digest("hex"),
        executionAuthenticated: false,
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write('{"passed":true,"cases":5}\n');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
