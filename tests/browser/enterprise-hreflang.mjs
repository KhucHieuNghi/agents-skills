import console from "node:console";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { projectHreflangDocument } from "../../skills/content-search-audit/scripts/lib/technical-seo/hreflang-document.mjs";
import { projectRenderedHreflangDocument } from "../../skills/content-search-audit/scripts/lib/technical-seo/hreflang-document-collector.mjs";
assert(process.argv[2], "Pass a new output directory");
const output = resolve(process.argv[2]);
await mkdir(output);
const link =
  '<link rel="alternate" hreflang="en" href="https://example.com/en">';
const fixtures = {
  clean: { head: link, count: 1, complete: true },
  empty: { count: 0, complete: true },
  duplicate: { head: link + link, count: 2, complete: true },
  body: { body: link, count: 0, complete: false },
  template: {
    head: "<template>" + link + "</template>",
    count: 0,
    complete: true,
  },
  relative: {
    head:
      '<base href="https://example.com/">' +
      link.replace("https://example.com/en", "/en"),
    count: 0,
    complete: false,
  },
  protocolRelative: {
    head: link.replace("https://example.com/en", "//example.com/en"),
    count: 0,
    complete: false,
  },
  modifier: {
    head: link.replace('rel="alternate"', 'rel="alternate" media="screen"'),
    count: 0,
    complete: false,
  },
  invalidLanguage: {
    head: link.replace('hreflang="en"', 'hreflang="en_US"'),
    count: 1,
    complete: true,
  },
  noscript: {
    head: "<noscript>" + link + "</noscript>",
    count: 0,
    complete: true,
    sourceComplete: false,
  },
  inserted: {
    body:
      '<script>document.head.insertAdjacentHTML("beforeend",' +
      JSON.stringify(link) +
      ")</script>",
    count: 1,
    complete: true,
    sourceCount: 0,
  },
  removed: {
    head: link,
    body: '<script>document.querySelector("link").remove()</script>',
    count: 0,
    complete: true,
    sourceCount: 1,
  },
  tampered: {
    head: link,
    body: '<script>Document.prototype.querySelectorAll=()=>[];Element.prototype.getAttribute=()=>null;Date=class{toISOString(){return "2000-01-01T00:00:00Z"}}</script>',
    count: 1,
    complete: true,
  },
  foreign: {
    body: '<script>const n=document.createElementNS("http://www.w3.org/2000/svg","link");n.setAttribute("rel","alternate");n.setAttribute("hreflang","en");n.setAttribute("href","https://example.com/en");document.head.append(n);</script>',
    count: 0,
    complete: true,
  },
  limit: { head: link.repeat(101), count: 0, complete: false },
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
    const source = await parser.evaluate(projectHreflangDocument, {
      sourceHtml: await response.text(),
      responseUrl: url,
    });
    await isolated.close();
    const rendered = await projectRenderedHreflangDocument(page, url);
    assert.equal(rendered.complete, f.complete, id + " rendered coverage");
    assert.equal(rendered.alternates.length, f.count, id + " rendered count");
    assert.equal(
      source.complete,
      f.sourceComplete ?? f.complete,
      id + " source coverage",
    );
    assert.equal(
      source.alternates.length,
      f.sourceCount ?? f.count,
      id + " source count",
    );
    assert.equal(rendered.navigationBinding.realm, "chromium-isolated-world");
    assert.notEqual(rendered.observedAt, "2000-01-01T00:00:00Z");
    if (id === "clean") {
      const wrong = await projectRenderedHreflangDocument(page, url + "/wrong");
      assert.equal(wrong.complete, false);
      assert.deepEqual(wrong.alternates, []);
    }
    receipts.push({
      id,
      sourceComplete: source.complete,
      renderedComplete: rendered.complete,
      sourceCount: source.alternates.length,
      renderedCount: rendered.alternates.length,
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
