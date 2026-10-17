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
function validDeck(content = "") {
  return `<!doctype html><html><head><title>One problem</title><style>${printStyle}</style></head>
  <body><div class="deck">
  <section class="slide"><h1>One problem</h1></section>
  <section class="slide" data-claim="evidence"><h2>Evidence</h2><p>Observed fact.</p><a class="source" href="https://example.com/report">Example report</a>${content}</section>
  <section class="slide"><h2>Decision requested</h2><p>Approve the next step.</p></section>
  </div><script>function SlideEngine() { return true; }</script></body></html>`;
}

it("accepts a local slide deck with visible evidence sources and print layout", async () => {
  const { path } = await fixture(validDeck());
  const result = await checkDeck(path);
  expect(result).toMatchObject({ valid: true, slides: 3, errors: [] });
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
  await writeFile(
    fakeChrome,
    `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const arg = process.argv.find((value) => value.startsWith("--print-to-pdf="));
writeFileSync(arg.slice(15), "%PDF-1.7\\n" + "/Type /Page\\n".repeat(3) + "x".repeat(2000));
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
  await writeFile(path, validDeck());
  await writeFile(
    fakeChrome,
    `#!/usr/bin/env node
const fs = require("node:fs");
const arg = process.argv.find(value => value.startsWith("--print-to-pdf="));
fs.writeFileSync(arg.slice(15), "%PDF-1.7\\n" + "/Type /Page\\n".repeat(3) + "x".repeat(2000));
`,
  );
  await chmod(fakeChrome, 0o755);
  await exportPdf(path, pdf, { chromePath: fakeChrome });
  await writeFile(path, validDeck().replace("Decision", "Decision updated"));
  const result = await checkDeck(path, { pdfPath: pdf });
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/pdf provenance/i);
});
