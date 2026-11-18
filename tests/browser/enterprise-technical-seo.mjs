import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { URL } from "node:url";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { projectCanonicalDocument } from "../../scripts/enterprise-technical-seo/document.mjs";
import { observeCanonicalNavigation } from "../../scripts/enterprise-technical-seo/navigation.mjs";
import { projectRenderedCanonical } from "../../scripts/enterprise-technical-seo/document-collector.mjs";
import { parseCanonicalLinkHeaders } from "../../scripts/enterprise-technical-seo/link-header.mjs";
import { evaluateCanonicalCapture } from "../../scripts/enterprise-technical-seo/canonical.mjs";
assert(
  process.argv[2],
  "Usage: node tests/browser/enterprise-technical-seo.mjs NEW_OUTPUT",
);
const output = resolve(process.argv[2]);
await mkdir(output);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const link = (href) => `<link rel="canonical" href="${href}">`;
const fixtures = {
  "tampered-dom-clock": {
    head: link("/preferred"),
    body: '<script>document.querySelector("link").href="/wrong";Element.prototype.querySelectorAll=()=>[];globalThis.Date=class {toISOString(){return "2000-01-01T00:00:00.000Z";}};</script>',
    expected: "/preferred",
    statuses: ["pass", "fail", "fail"],
  },
  "foreign-base": {
    head: link("preferred"),
    body: '<svg><base href="/bad/"></base></svg>',
    expected: "/preferred",
    statuses: ["pass", "pass", "pass"],
  },
  "tampered-globals": {
    head: link("/preferred"),
    body: '<script>document.querySelector("link").href="/wrong";const NativeURL=URL;globalThis.URL=class extends NativeURL {constructor(value,base){super(value==="/wrong"?"/preferred":value,base);}};</script>',
    expected: "/preferred",
    statuses: ["pass", "fail", "fail"],
  },
  clean: {
    head: link("/preferred"),
    expected: "/preferred",
    statuses: ["pass", "pass", "pass"],
  },
  base: {
    head: '<base href="/catalog/">' + link("preferred"),
    expected: "/catalog/preferred",
    statuses: ["pass", "pass", "pass"],
  },
  changed: {
    head: link("/a"),
    body: '<script>document.querySelector("link").href="/b";</script>',
    expected: "/a",
    statuses: ["pass", "fail", "fail"],
  },
  "js-only": {
    head: "",
    body: '<script>const link=document.createElement("link");link.rel="canonical";link.href="/preferred";document.head.append(link);</script>',
    expected: "/preferred",
    statuses: ["pass", "pass", "pass"],
  },
  header: {
    head: link("/a"),
    header: '</b>; rel="canonical"',
    expected: "/a",
    statuses: ["pass", "fail", "fail"],
  },
  malformed: {
    head: link("/a"),
    header: '</b>; rel="',
    expected: "/a",
    statuses: ["unknown", "unknown", "unknown"],
  },
  inert: {
    head: "<template>" + link("/template") + "</template>",
    body: link("/body"),
    expected: "/preferred",
    statuses: ["unknown", "unknown", "unknown"],
  },
  noscript: {
    head: "<noscript>" + link("/noscript") + "</noscript>" + link("/preferred"),
    expected: "/preferred",
    statuses: ["unknown", "unknown", "unknown"],
  },
  modifier: {
    head: '<link rel="canonical" href="/preferred" media="print">',
    expected: "/preferred",
    statuses: ["unknown", "unknown", "unknown"],
  },
  navigation: {
    head: link("/preferred"),
    body: '<script>history.replaceState(null,"","/another-route");</script>',
    expected: "/preferred",
    statuses: ["unknown", "unknown", "unknown"],
  },
  redirect: {
    redirect: "/clean",
    expected: "/preferred",
    statuses: ["unknown", "unknown", "unknown"],
  },
  error: {
    head: link("/preferred"),
    status: 404,
    expected: "/preferred",
    statuses: ["unknown", "unknown", "unknown"],
  },
  mobile: {
    head: link("/desktop"),
    body: '<script>if(innerWidth<500)document.querySelector("link").href="/mobile";</script>',
    width: 390,
    expected: "/mobile",
    statuses: ["pass", "fail", "fail"],
  },
};
const requests = [];
const server = createServer((req, res) => {
  requests.push({ method: req.method, path: req.url });
  const fixture = fixtures[req.url.slice(1)];
  if (!fixture) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (fixture.redirect) {
    res.writeHead(302, { Location: fixture.redirect });
    res.end();
    return;
  }
  res.writeHead(fixture.status ?? 200, {
    "Content-Type": "text/html; charset=utf-8",
    ...(fixture.header ? { Link: fixture.header } : {}),
  });
  res.end(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Canonical fixture</title>' +
      fixture.head +
      "</head><body><h1>Fixture</h1>" +
      (fixture.body ?? "") +
      "</body></html>",
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const receipts = [];
try {
  browser = await chromium.launch({ headless: true });
  const parserContext = await browser.newContext({ serviceWorkers: "block" });
  let parserBlocked = 0;
  await parserContext.route("**/*", (route) => {
    parserBlocked++;
    return route.abort();
  });
  await parserContext.routeWebSocket("**/*", (socket) => socket.close());
  const parserPage = await parserContext.newPage();
  for (const [id, fixture] of Object.entries(fixtures)) {
    const context = await browser.newContext({
      viewport: { width: fixture.width ?? 1280, height: 800 },
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    await context.route("**/*", (route) =>
      route.request().method() === "GET" &&
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    );
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    const url = origin + "/" + id;
    const observer = await observeCanonicalNavigation(page, {
      maxBodyBytes: 4 * 1024 * 1024,
      maxDocumentRequests: 10,
      timeoutMs: 5000,
    });
    const startedAt = new Date().toISOString();
    const response = await page.goto(url, {
      waitUntil: "load",
      timeout: 10000,
    });
    assert(response);
    const boundResponse = await observer.snapshot();
    const body = await response.body(),
      headers = await response.headersArray();
    const raw = await parserPage.evaluate(projectCanonicalDocument, {
      sourceHtml: body.toString("utf8"),
      responseUrl: response.url(),
    });
    const rendered = await projectRenderedCanonical(page, response.url());
    const header = parseCanonicalLinkHeaders(
      boundResponse.status === "captured"
        ? Object.entries(boundResponse.headers)
            .filter(([name]) => name.toLowerCase() === "link")
            .map(([, value]) => value)
        : [],
      response.url(),
    );
    const pending = [];
    const layer = (result) => ({
      complete: result.complete,
      targets: result.targets,
    });
    const layers = {
      sourceHead: layer(raw),
      renderedHead: layer(rendered),
      httpLink: layer(header),
    };
    if (boundResponse.status === "captured") {
      assert.equal(boundResponse.bodyHash, hash(body));
      assert.equal(boundResponse.responseUrl, response.url());
    }
    const bindingMatches =
      boundResponse.status === "captured" &&
      rendered.navigationBinding?.frameId === boundResponse.binding.frameId &&
      rendered.navigationBinding?.loaderId === boundResponse.binding.loaderId;
    if (
      !bindingMatches ||
      response.url() !== url ||
      response.status() !== 200
    ) {
      pending.push(
        !bindingMatches
          ? "navigation-binding-unavailable"
          : response.url() !== url
            ? "response-url-mismatch"
            : "response-status-not-200",
      );
      for (const key of Object.keys(layers))
        layers[key] = { complete: false, targets: [] };
    }
    const scope = {
      customerId: "synthetic",
      entityId: "fixture",
      environment: "sandbox",
      targetUrl: url,
      profileId: fixture.width ? "mobile" : "desktop",
      stateId: "anonymous",
    };
    const capturedAt = new Date().toISOString();
    assert(Date.parse(rendered.observedAt) >= Date.parse(startedAt));
    assert(Date.parse(rendered.observedAt) <= Date.parse(capturedAt));
    const artifact = { schemaVersion: 1, scope, capturedAt, layers };
    const artifactText = JSON.stringify(artifact);
    const source = {
      sourceId: id,
      artifactText,
      artifactHash: hash(artifactText),
    };
    const evaluation = evaluateCanonicalCapture(
      {
        ...scope,
        assessmentAt: capturedAt,
        maxAgeSeconds: 3600,
        expectedCanonical: origin + fixture.expected,
      },
      source,
    );
    assert.deepEqual(
      evaluation.checks.map((c) => c.status),
      fixture.statuses,
      id,
    );
    const redirects = [];
    let request = response.request();
    while (request) {
      redirects.unshift({ url: request.url(), method: request.method() });
      request = request.redirectedFrom();
    }
    const artifacts = {
      boundResponse,
      body: body.toString("base64"),
      headers,
      raw,
      rendered,
      header,
      redirects,
      source,
      evaluation,
      pending,
    };
    const file = id + ".json";
    const text = JSON.stringify(artifacts, null, 2) + "\n";
    await writeFile(resolve(output, file), text);
    receipts.push({
      id,
      synthetic: true,
      startedAt,
      capturedAt,
      file,
      artifactHash: hash(text),
      bodyHash: hash(body),
      sourceDomHash: raw.html === null ? null : hash(raw.html),
      renderedDomHash: rendered.html === null ? null : hash(rendered.html),
      statuses: fixture.statuses,
    });
    await observer.close();
    await context.close();
  }
  const before = requests.length;
  const inert = await parserPage.evaluate(projectCanonicalDocument, {
    sourceHtml:
      "<!doctype html><head>" +
      link("/preferred") +
      '</head><body><script>fetch("' +
      origin +
      '/leak")</script><img src="' +
      origin +
      '/leak"><iframe src="' +
      origin +
      '/leak"></iframe></body>',
    responseUrl: origin + "/source",
  });
  assert.equal(inert.complete, true);
  await parserContext.close();
  assert.equal(
    requests.length,
    before,
    "Inert parsing must not reach fixture server",
  );
  const summary = {
    passed: true,
    synthetic: true,
    browserVersion: browser.version(),
    cases: receipts.length,
    receipts,
    parserBlocked,
    requests,
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
  await writeFile(
    resolve(output, "receipts.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  process.stdout.write(
    JSON.stringify({ passed: true, cases: receipts.length }) + "\n",
  );
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
