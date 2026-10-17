#!/usr/bin/env node
/* global console, process */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { checkDeck } from "./check-deck.mjs";

const run = promisify(execFile);

async function browserPath(explicit) {
  if (explicit) return explicit;
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await run(candidate, ["--version"], { timeout: 3000 });
      return candidate;
    } catch {
      /* Try the next installed browser. */
    }
  }
  throw new Error(
    "Chrome or Chromium is required for PDF export; set CHROME_BIN",
  );
}

export async function exportPdf(htmlPath, pdfPath, { chromePath } = {}) {
  const checked = await checkDeck(htmlPath);
  if (!checked.valid)
    throw new Error(`deck is not ready: ${checked.errors.join("; ")}`);
  const browser = await browserPath(chromePath);
  const profile = await mkdtemp(join(tmpdir(), "presentation-pdf-"));
  try {
    await run(
      browser,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-pdf-header-footer",
        `--user-data-dir=${profile}`,
        `--print-to-pdf=${resolve(pdfPath)}`,
        pathToFileURL(resolve(htmlPath)).href,
      ],
      { timeout: 45_000, maxBuffer: 1_000_000 },
    );
    const htmlSha256 = createHash("sha256")
      .update(await readFile(htmlPath))
      .digest("hex");
    const pdfSha256 = createHash("sha256")
      .update(await readFile(pdfPath))
      .digest("hex");
    await writeFile(
      `${pdfPath}.provenance.json`,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          renderer: "chromium-print",
          htmlSha256,
          pdfSha256,
          slides: checked.slides,
        },
        null,
        2,
      )}\n`,
    );
    const result = await checkDeck(htmlPath, { pdfPath });
    if (!result.valid)
      throw new Error(`PDF export failed: ${result.errors.join("; ")}`);
    return resolve(pdfPath);
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [htmlPath, pdfPath] = process.argv.slice(2);
  if (!htmlPath || !pdfPath) {
    console.error("Usage: node export-pdf.mjs DECK_HTML OUTPUT_PDF");
    process.exitCode = 1;
  } else {
    try {
      console.log(await exportPdf(htmlPath, pdfPath));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
