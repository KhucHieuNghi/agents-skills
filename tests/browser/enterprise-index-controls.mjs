import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { projectIndexDocument } from "../../skills/content-search-audit/scripts/lib/technical-seo/index-document.mjs";
import { projectRenderedIndexDocument } from "../../skills/content-search-audit/scripts/lib/technical-seo/index-document-collector.mjs";
import { evaluateIndexControls } from "../../skills/content-search-audit/scripts/lib/technical-seo/index-controls.mjs";
assert(process.argv[2], "Pass a new output directory");
const output = resolve(process.argv[2]);
await mkdir(output);
const meta = '<meta name="robots" content="noindex">';
const fixtures = {
  clean: { status: "pass" },
  body: { body: meta, status: "fail" },
  removed: {
    head: meta,
    body: '<script>document.querySelector("meta").remove()</script>',
    status: "fail",
  },
  inserted: {
    body: '<script>document.body.insertAdjacentHTML("beforeend",\'<meta name="robots" content="noindex">\')</script>',
    status: "fail",
  },
  template: { body: "<template>" + meta + "</template>", status: "pass" },
  "parser-repaired-meta": {
    body: '<svg><metadata><meta name="robots" content="noindex"/></metadata></svg>',
    status: "fail",
  },
  foreign: {
    body: '<script>const m=document.createElementNS("http://www.w3.org/2000/svg","meta");m.setAttribute("name","robots");m.setAttribute("content","noindex");document.body.append(m);</script>',
    status: "pass",
  },
  tampered: {
    body:
      meta +
      '<script>Document.prototype.querySelectorAll=()=>[];Element.prototype.getAttribute=()=>null;Date=class{toISOString(){return "2000-01-01T00:00:00Z"}}</script>',
    status: "fail",
  },
  noscript: { head: "<noscript>" + meta + "</noscript>", status: "unknown" },
  headers: { headers: ["noindex", "otherbot: index"], status: "fail" },
};
const server = createServer((req, res) => {
  const f = fixtures[req.url.slice(1)];
  if (!f) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (f.headers) res.setHeader("X-Robots-Tag", f.headers);
  res.end(
    "<!doctype html><html><head>" +
      (f.head ?? "") +
      "</head><body>" +
      (f.body ?? "") +
      "</body></html>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true }),
  receipts = [];
try {
  for (const [id, fixture] of Object.entries(fixtures)) {
    const context = await browser.newContext({ serviceWorkers: "block" }),
      page = await context.newPage(),
      url = origin + "/" + id;
    const response = await page.goto(url, { waitUntil: "load" });
    const sourceHtml = await response.text(),
      capturedAt = new Date().toISOString();
    const isolated = await browser.newContext({ serviceWorkers: "block" });
    await isolated.route("**/*", (r) => r.abort());
    const parser = await isolated.newPage();
    const raw = await parser.evaluate(projectIndexDocument, {
      sourceHtml,
      responseUrl: url,
    });
    await isolated.close();
    const rendered = await projectRenderedIndexDocument(page, url);
    assert.equal(rendered.navigationBinding.realm, "chromium-isolated-world");
    const headers = (await response.headersArray())
      .filter((h) => h.name.toLowerCase() === "x-robots-tag")
      .map((h) => h.value);
    const scope = {
      customerId: "fixture",
      entityId: "site",
      environment: "test",
      targetUrl: url,
      profileId: "desktop",
      stateId: "anonymous",
    };
    const artifact = {
      schemaVersion: 1,
      scope,
      capturedAt,
      response: { url, status: response.status() },
      robots: {
        url: origin + "/robots.txt",
        capturedAt,
        status: 404,
        body: "",
        complete: true,
      },
      sourceDocument: { complete: raw.complete, meta: raw.meta },
      renderedDocument: { complete: rendered.complete, meta: rendered.meta },
      httpHeaders: { complete: true, values: headers },
    };
    const artifactText = JSON.stringify(artifact),
      artifactHash = createHash("sha256").update(artifactText).digest("hex");
    const result = evaluateIndexControls(
      {
        ...scope,
        crawler: "googlebot",
        assessmentAt: new Date().toISOString(),
        maxAgeSeconds: 3600,
        expectedHttpStatus: 200,
        expectedCrawlAllowed: true,
        expectedIndexable: true,
      },
      { sourceId: id, artifactText, artifactHash },
    );
    assert.equal(result.checks[2].status, fixture.status, id);
    const evidence =
      JSON.stringify(
        { sourceHtml, raw, rendered, headers, artifact, result },
        null,
        2,
      ) + "\n";
    await writeFile(output + "/" + id + ".json", evidence);
    receipts.push({
      id,
      status: result.checks[2].status,
      hash: createHash("sha256").update(evidence).digest("hex"),
    });
    await context.close();
  }
  await writeFile(
    output + "/receipts.json",
    JSON.stringify(
      { passed: true, synthetic: true, cases: receipts.length, receipts },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    `${receipts.length} native index-control fixtures passed\n`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
