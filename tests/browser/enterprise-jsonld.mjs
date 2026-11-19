import console from "node:console";
import { createHash } from "node:crypto";
import { evaluateStructuredData } from "../../skills/content-search-audit/scripts/lib/technical-seo/structured-data.mjs";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { projectJsonLdDocument } from "../../skills/content-search-audit/scripts/lib/technical-seo/jsonld-document.mjs";
import { projectRenderedJsonLdDocument } from "../../skills/content-search-audit/scripts/lib/technical-seo/jsonld-document-collector.mjs";
assert(process.argv[2], "Pass a new output directory");
const output = resolve(process.argv[2]);
await mkdir(output);
const value =
  '{"@context":"https://schema.org","@type":"Product","name":"Fixture"}';
const block = '<script type="application/ld+json">' + value + "</script>";
const fixtures = {
  clean: { head: block, count: 1, complete: true },
  body: { body: block, count: 1, complete: true },
  empty: { count: 0, complete: true },
  template: {
    head: "<template>" + block + "</template>",
    count: 0,
    complete: true,
  },
  duplicate: { head: block + block, count: 2, complete: true },
  invalid: {
    head: '<script type="application/ld+json">{</script>',
    count: 1,
    complete: true,
  },
  external: {
    head: '<script type="application/ld+json" src="/external.json"></script>',
    count: 0,
    complete: false,
  },
  parameters: {
    head: block.replace(
      "application/ld+json",
      "application/ld+json; charset=utf-8",
    ),
    count: 0,
    complete: false,
  },
  spacedParameters: {
    head: block.replace(
      "application/ld+json",
      "application/ld+json ; charset=utf-8",
    ),
    count: 0,
    complete: false,
  },
  unicodeWhitespace: {
    head: block.replace("application/ld+json", "\u00a0application/ld+json"),
    count: 0,
    complete: true,
  },
  noscript: {
    head: "<noscript>" + block + "</noscript>",
    count: 0,
    complete: true,
    sourceComplete: false,
  },
  inserted: {
    body:
      '<script>const s=document.createElement("script");s.type="application/ld+json";s.textContent=' +
      JSON.stringify(value) +
      ";document.body.append(s);</script>",
    count: 1,
    complete: true,
    sourceCount: 0,
  },
  removed: {
    head: block,
    body: '<script>document.querySelector("script[type]").remove()</script>',
    count: 0,
    complete: true,
    sourceCount: 1,
  },
  tampered: {
    head: block,
    body: '<script>Document.prototype.querySelectorAll=()=>[];Element.prototype.getAttribute=()=>null;TextEncoder=class{encode(){return []}};Date=class{toISOString(){return "2000-01-01T00:00:00Z"}}</script>',
    count: 1,
    complete: true,
  },
  markers: {
    head: block,
    body: '<div itemscope vocab="https://schema.org/" typeof="Person"></div>',
    count: 1,
    complete: true,
  },
  limit: { head: block.repeat(51), count: 0, complete: false },
};
const server = createServer((req, res) => {
  const f = fixtures[req.url.slice(1)];
  if (!f) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    "<!doctype html><html><head>" +
      (f.head ?? "") +
      "</head><body>" +
      (f.body ?? "") +
      "</body></html>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true }),
  receipts = [];
try {
  for (const [id, f] of Object.entries(fixtures)) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}/${id}`;
    const response = await page.goto(url, { waitUntil: "load" });
    const isolated = await browser.newContext({ serviceWorkers: "block" });
    await isolated.route("**/*", (r) => r.abort());
    const parser = await isolated.newPage();
    const source = await parser.evaluate(projectJsonLdDocument, {
      sourceHtml: await response.text(),
      responseUrl: url,
    });
    await isolated.close();
    const rendered = await projectRenderedJsonLdDocument(page, url);
    assert.equal(rendered.complete, f.complete, id + " rendered coverage");
    assert.equal(rendered.blocks.length, f.count, id + " rendered count");
    assert.equal(
      source.complete,
      f.sourceComplete ?? f.complete,
      id + " source coverage",
    );
    assert.equal(
      source.blocks.length,
      f.sourceCount ?? f.count,
      id + " source count",
    );
    assert.equal(rendered.navigationBinding.realm, "chromium-isolated-world");
    for (const [method, projection] of [
      ["html-source", source],
      ["html-rendered", rendered],
    ]) {
      const scope = {
        customerId: "fixture",
        entityId: "site",
        environment: "test",
        targetUrl: url,
        profileId: "desktop",
        stateId: "anonymous",
      };
      const artifactText = JSON.stringify({
        schemaVersion: 1,
        scope,
        method,
        capturedAt: projection.observedAt,
        projection: {
          complete: projection.complete,
          blocks: projection.blocks,
        },
        otherFormatsObserved: projection.otherFormatsObserved,
      });
      const evaluation = evaluateStructuredData(
        {
          ...scope,
          method,
          assessmentAt: new Date().toISOString(),
          maxAgeSeconds: 3600,
          expectedTypes: null,
        },
        {
          sourceId: "native-jsonld",
          artifactText,
          artifactHash: createHash("sha256").update(artifactText).digest("hex"),
        },
      );
      assert.equal(
        evaluation.checks[0].status,
        id === "invalid"
          ? "fail"
          : projection.complete && projection.blocks.length
            ? "pass"
            : "unknown",
      );
      assert.equal(evaluation.checks[2].status, "unknown");
      assert.equal(evaluation.richResultEligibility, "unknown");
    }
    if (id === "markers")
      assert.deepEqual(rendered.otherFormatsObserved, [
        "microdata-marker",
        "rdfa-marker",
      ]);
    if (id === "duplicate")
      assert.notEqual(rendered.blocks[0].id, rendered.blocks[1].id);
    assert.notEqual(rendered.observedAt, "2000-01-01T00:00:00Z");
    if (id === "clean") {
      const wrong = await projectRenderedJsonLdDocument(page, url + "/wrong");
      assert.equal(wrong.complete, false);
      assert.deepEqual(wrong.blocks, []);
    }
    receipts.push({
      id,
      sourceComplete: source.complete,
      renderedComplete: rendered.complete,
      sourceCount: source.blocks.length,
      renderedCount: rendered.blocks.length,
      pending: rendered.pending,
    });
    await context.close();
  }
  await writeFile(
    resolve(output, "receipts.json"),
    JSON.stringify({ cases: receipts.length, receipts }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ cases: receipts.length, output }));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
