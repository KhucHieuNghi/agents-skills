import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { checkDeck } from "../skills/problem-presentation/scripts/check-deck.mjs";
import { exportPdf } from "../skills/problem-presentation/scripts/export-pdf.mjs";

const directories: string[] = [];
async function fixture(html: string) {
  const directory = await mkdtemp(join(tmpdir(), "problem-presentation-"));
  directories.push(directory);
  const path = join(directory, "deck.html");
  await writeFile(path, html);
  return { directory, path };
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const printStyle = `@media print {
  .deck { height: auto; overflow: visible; }
  .slide { break-after: page; overflow: visible; }
  .deck-dots, .deck-progress, .deck-hints { display: none; }
}`;
const offlineCsp =
  "default-src 'none'; base-uri 'none'; connect-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src 'self' data:; frame-src 'none'; object-src 'none'; media-src 'none'; form-action 'none'";
function validDeck(content = "") {
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${offlineCsp}"><title>One problem</title><style>${printStyle}</style></head>
  <body><div class="deck">
  <section class="slide"><h1>One problem</h1></section>
  <section class="slide" data-claim="evidence"><h2>Evidence</h2><p>Observed fact.</p><a class="source" href="https://example.com/report">Example report</a>${content}</section>
  <section class="slide"><h2>Decision requested</h2><p>Approve the next step.</p></section>
  </div><script>function SlideEngine() { return true; }</script></body></html>`;
}

function minimalPdf(pageCount: number) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${index + 3} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...Array.from(
      { length: pageCount },
      () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    ),
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  body += `% ${"padding ".repeat(100)}\n`;
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

it("accepts a local slide deck with visible evidence sources and print layout", async () => {
  const { path } = await fixture(validDeck());
  const result = await checkDeck(path);
  expect(result).toMatchObject({ valid: true, slides: 3, errors: [] });
});

it("requires an early restrictive CSP for the delivered offline HTML", async () => {
  const { path } = await fixture(
    validDeck().replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ""),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/content security policy/i);
});

it("rejects a CSP meta hidden inside an HTML comment", async () => {
  const { path } = await fixture(
    validDeck()
      .replace(
        '<meta http-equiv="Content-Security-Policy"',
        '<!-- <meta http-equiv="Content-Security-Policy"',
      )
      .replace("<title>One problem</title>", "--><title>One problem</title>"),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/content security policy/i);
});

it("rejects a fake head and CSP inside a comment", async () => {
  const { path } = await fixture(
    validDeck()
      .replace("<head>", "<!-- <head>")
      .replace("</head>", "</head> --><head><title>Unprotected</title></head>"),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/content security policy/i);
});

it("rejects active schemes in citation and navigation links", async () => {
  for (const href of [
    "javascript:location.href='https://cdn.example/'",
    "java&#115;cript:location.href='https://cdn.example/'",
    "data:text/html,unsafe",
    "file:///private/notes",
    "\\\\cdn.example/track",
  ]) {
    const { path } = await fixture(
      validDeck().replace(
        'href="https://example.com/report"',
        `href="${href}"`,
      ),
    );
    const result = await checkDeck(path);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/link/i);
  }
});

it("rejects remote assets while allowing external citation links", async () => {
  const { path } = await fixture(
    validDeck('<img src="https://cdn.example/logo.png" alt="Logo">'),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/remote asset/i);
});

it("rejects a remote CSS import even without a link tag", async () => {
  const { path } = await fixture(
    validDeck().replace(
      "</style>",
      '@import "https://fonts.example/style.css";</style>',
    ),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/remote asset/i);
});

it("rejects remote srcset, unquoted script URLs, and SVG image links", async () => {
  for (const content of [
    '<img srcset="https://example.com/logo.png 1x" alt="Logo">',
    "<script src=https://example.com/app.js></script>",
    '<svg><image href="https://example.com/logo.png" /></svg>',
  ]) {
    const { path } = await fixture(validDeck(content));
    const result = await checkDeck(path);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/remote asset/i);
  }
});

it("rejects unchecked local stylesheets and scripts", async () => {
  const { directory, path } = await fixture(
    validDeck(
      '<link rel="stylesheet" href="local.css"><script src="local.js"></script>',
    ),
  );
  await writeFile(
    join(directory, "local.css"),
    '@import "https://fonts.example/font.css";',
  );
  await writeFile(join(directory, "local.js"), 'fetch("https://example.com")');
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(
    /external stylesheet|external script/i,
  );
});

it("rejects a local SVG image that loads a remote resource", async () => {
  const { directory, path } = await fixture(
    validDeck('<img src="logo.svg" alt="Logo">'),
  );
  await writeFile(
    join(directory, "logo.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/tracker.png" /></svg>',
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/unsafe local SVG/i);
});

it("rejects a base URL that turns local asset paths into remote requests", async () => {
  const { directory, path } = await fixture(
    validDeck('<img src="logo.png" alt="Logo">').replace(
      "</head>",
      '<base href="https://cdn.example/"></head>',
    ),
  );
  await writeFile(join(directory, "logo.png"), "local image");
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/base/i);
});

it("rejects hidden documents and redirects that can load network resources", async () => {
  for (const content of [
    '<meta http-equiv="refresh" content="0;url=https://cdn.example/">',
    '<iframe srcdoc="<img src=https://cdn.example/a.png>"></iframe>',
    '<object data="local.svg"></object>',
    '<embed src="local.svg">',
  ]) {
    const { path } = await fixture(validDeck(content));
    const result = await checkDeck(path);
    expect(result.valid).toBe(false);
  }
});

it("rejects active network code and remote CSS inside a local SVG", async () => {
  const { path } = await fixture(
    validDeck('<script>navigator.sendBeacon("https://cdn.example/a")</script>'),
  );
  const scriptResult = await checkDeck(path);
  expect(scriptResult.valid).toBe(false);
  expect(scriptResult.errors.join(" ")).toMatch(/network/i);

  const local = await fixture(validDeck('<img src="logo.svg" alt="Logo">'));
  await writeFile(
    join(local.directory, "logo.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://cdn.example/a.css)</style></svg>',
  );
  const svgResult = await checkDeck(local.path);
  expect(svgResult.valid).toBe(false);
  expect(svgResult.errors.join(" ")).toMatch(/unsafe local SVG/i);
});

it("rejects malformed PDF bytes even when a matching sidecar is supplied", async () => {
  const { directory, path } = await fixture(validDeck());
  const pdf = join(directory, "deck.pdf");
  const bytes = Buffer.from(
    "%PDF-1.7\n" + "/Type /Page\n".repeat(3) + "x".repeat(2000),
  );
  await writeFile(pdf, bytes);
  const { createHash } = await import("node:crypto");
  await writeFile(
    `${pdf}.provenance.json`,
    JSON.stringify({
      schemaVersion: 1,
      renderer: "chromium-print",
      htmlSha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
      pdfSha256: createHash("sha256").update(bytes).digest("hex"),
      slides: 3,
    }),
  );
  const result = await checkDeck(path, { pdfPath: pdf });
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/pdf/i);
});

it("rejects factual slides without a visible source label", async () => {
  const { path } = await fixture(
    validDeck().replace('class="source"', 'class="ordinary"'),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/evidence.*source/i);
});

it("rejects missing slides and missing print rules", async () => {
  const { path } = await fixture(
    "<!doctype html><html><body><div class=deck></div></body></html>",
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/slide/i);
  expect(result.errors.join(" ")).toMatch(/print/i);
});

it("rejects a local asset path that escapes the deck directory", async () => {
  const { path } = await fixture(
    validDeck('<img src="../secret.png" alt="Secret">'),
  );
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/local asset/i);
});

it("rejects an asset reached through a symlink outside the deck directory", async () => {
  const { directory, path } = await fixture(
    validDeck('<img src="assets/logo.png" alt="Logo">'),
  );
  const outside = await fixture("outside");
  await writeFile(join(outside.directory, "logo.png"), "private data");
  await symlink(outside.directory, join(directory, "assets"));
  const result = await checkDeck(path);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/local asset/i);
});

it("exports a nonempty PDF through an executable without invoking a shell", async () => {
  const { directory, path } = await fixture(validDeck());
  const fakeChrome = join(directory, "fake-chrome");
  const pdfFixture = join(directory, "valid.pdf");
  await writeFile(pdfFixture, minimalPdf(3));
  await writeFile(
    fakeChrome,
    `#!/usr/bin/env node
import { copyFileSync } from "node:fs";
const arg = process.argv.find((value) => value.startsWith("--print-to-pdf="));
const proxy = process.argv.find(value => value.startsWith("--proxy-server="));
if (!proxy) process.exit(2);
const blocked = await fetch(proxy.slice(15), { headers: { host: "remote.example" } });
if (blocked.status !== 502) process.exit(3);
copyFileSync(${JSON.stringify(pdfFixture)}, arg.slice(15));
`,
  );
  await chmod(fakeChrome, 0o755);
  const pdf = join(directory, "deck.pdf");
  await exportPdf(path, pdf, { chromePath: fakeChrome });
  expect((await readFile(pdf)).subarray(0, 5).toString()).toBe("%PDF-");
  expect((await checkDeck(path, { pdfPath: pdf })).valid).toBe(true);
});

it("rejects a PDF whose page count differs from the slide count", async () => {
  const { directory, path } = await fixture(validDeck());
  const pdf = join(directory, "deck.pdf");
  await writeFile(
    pdf,
    "%PDF-1.7\n" + "/Type /Page\n".repeat(4) + "x".repeat(2000),
  );
  const result = await checkDeck(path, { pdfPath: pdf });
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/pdf.*pages/i);
});

it("rejects a separately rendered PDF without the HTML print provenance", async () => {
  const { directory, path } = await fixture(validDeck());
  const pdf = join(directory, "deck.pdf");
  await writeFile(
    pdf,
    "%PDF-1.7\n" + "/Type /Page\n".repeat(3) + "x".repeat(2000),
  );
  const result = await checkDeck(path, { pdfPath: pdf });
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/pdf provenance/i);
});

it("rejects a PDF after its source HTML changes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "presentation-stale-pdf-"));
  const path = join(directory, "deck.html");
  const pdf = join(directory, "deck.pdf");
  const fakeChrome = join(directory, "fake-chrome");
  const pdfFixture = join(directory, "valid.pdf");
  await writeFile(path, validDeck());
  await writeFile(pdfFixture, minimalPdf(3));
  await writeFile(
    fakeChrome,
    `#!/usr/bin/env node
const fs = require("node:fs");
const arg = process.argv.find(value => value.startsWith("--print-to-pdf="));
fs.copyFileSync(${JSON.stringify(pdfFixture)}, arg.slice(15));
`,
  );
  await chmod(fakeChrome, 0o755);
  await exportPdf(path, pdf, { chromePath: fakeChrome });
  await writeFile(path, validDeck().replace("Decision", "Decision updated"));
  const result = await checkDeck(path, { pdfPath: pdf });
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/pdf provenance/i);
});

it("rejects a source HTML change during PDF printing", async () => {
  const { directory, path } = await fixture(validDeck());
  const fakeChrome = join(directory, "fake-chrome");
  const pdfFixture = join(directory, "valid.pdf");
  const pdf = join(directory, "deck.pdf");
  await writeFile(pdfFixture, minimalPdf(3));
  await writeFile(
    fakeChrome,
    `#!/usr/bin/env node
const fs = require("node:fs");
const arg = process.argv.find(value => value.startsWith("--print-to-pdf="));
fs.copyFileSync(${JSON.stringify(pdfFixture)}, arg.slice(15));
fs.appendFileSync(${JSON.stringify(path)}, "<!-- changed during print -->");
`,
  );
  await chmod(fakeChrome, 0o755);
  await expect(
    exportPdf(path, pdf, { chromePath: fakeChrome }),
  ).rejects.toThrow(/changed during PDF export/i);
});
