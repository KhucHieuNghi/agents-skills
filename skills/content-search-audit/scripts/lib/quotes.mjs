import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { safeArtifactPath } from "./validate.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const normalize = (value, mode) =>
  mode === "whitespace" ? value.replace(/\s+/gu, " ").trim() : value;
function range(lines, start, end, maximum = Infinity) {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 1 ||
    end < start ||
    end > lines.length ||
    end - start + 1 > maximum
  )
    throw new Error("Invalid quote line range");
  return lines.slice(start - 1, end).join("\n");
}
/** Submitted-span verification only; never certifies completeness or semantic support. */
export async function verifyQuotes(bundle) {
  if (
    !bundle ||
    !path.isAbsolute(bundle.root ?? "") ||
    !digest(bundle.reportHash) ||
    !Array.isArray(bundle.quotes) ||
    !bundle.quotes.length ||
    bundle.quotes.length > 500
  )
    throw new Error("Invalid quote verification bundle");
  const stat = await lstat(bundle.root);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Quote root must be a real directory, not a symlink");
  const root = await realpath(bundle.root);
  const cache = new Map();
  let totalBytes = 0;
  async function read(name, expectedHash) {
    if (!safeArtifactPath(name))
      throw new Error("Unsafe quote source/report path");
    if (!digest(expectedHash)) throw new Error("Invalid quote snapshot hash");
    let cached = cache.get(name);
    if (!cached) {
      let target = root;
      for (const segment of name.split("/")) {
        target = path.join(target, segment);
        if ((await lstat(target)).isSymbolicLink())
          throw new Error("Quote source/report symlink rejected");
      }
      const file = await open(
        target,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      try {
        const before = await file.stat();
        if (!before.isFile() || before.size > 10 * 1024 * 1024)
          throw new Error("Quote source/report is not a bounded regular file");
        const chunks = [];
        let size = 0;
        while (true) {
          const buffer = Buffer.alloc(65536);
          const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
          if (!bytesRead) break;
          size += bytesRead;
          totalBytes += bytesRead;
          if (size > 10 * 1024 * 1024 || totalBytes > 64 * 1024 * 1024)
            throw new Error("Quote read budget exceeded");
          chunks.push(buffer.subarray(0, bytesRead));
        }
        const after = await file.stat();
        if (
          before.size !== after.size ||
          before.mtimeMs !== after.mtimeMs ||
          before.ctimeMs !== after.ctimeMs
        )
          throw new Error("Quote source/report changed during read");
        const bytes = Buffer.concat(chunks);
        const value = new TextDecoder("utf-8", {
          fatal: true,
          ignoreBOM: true,
        }).decode(bytes);
        if (value.includes("\0"))
          throw new Error("Quote source/report is not text");
        cached = { hash: hash(bytes), lines: value.split(/\r?\n/) };
        cache.set(name, cached);
      } finally {
        await file.close();
      }
    }
    if (cached.hash !== expectedHash)
      throw new Error("Quote source/report hash mismatch");
    return cached;
  }
  const report = await read(bundle.report, bundle.reportHash);
  const ids = new Set(),
    labels = new Map(),
    results = [];
  for (const quote of bundle.quotes) {
    if (!quote || !text(quote.quoteId) || ids.has(quote.quoteId))
      throw new Error("Invalid or duplicate quote identity");
    ids.add(quote.quoteId);
    if (
      !text(quote.quote) ||
      quote.quote.length > 65536 ||
      !["exact", "whitespace"].includes(quote.normalization ?? "exact")
    )
      throw new Error("Invalid quote text or normalization");
    const source = await read(quote.source, quote.sourceHash);
    const label = quote.sourceLabel ?? quote.source;
    if (
      ![quote.source, path.posix.basename(quote.source)].includes(label) ||
      (labels.has(label) && labels.get(label) !== quote.source)
    )
      throw new Error("Ambiguous or invalid quote source label");
    labels.set(label, quote.source);
    const citation = `${label}:${quote.startLine}${quote.endLine === quote.startLine ? "" : `-${quote.endLine}`}`;
    const sourceSpan = range(source.lines, quote.startLine, quote.endLine);
    const reportSpan = range(
      report.lines,
      quote.reportStartLine,
      quote.reportEndLine,
      20,
    );
    const mode = quote.normalization ?? "exact";
    const needle = normalize(quote.quote, mode);
    const sourceMatches = normalize(sourceSpan, mode).includes(needle);
    const reportMatches = normalize(reportSpan, mode).includes(needle);
    const escapedCitation = citation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const citationMatches = new RegExp(
      `(?:^|[^\\p{L}\\p{N}_./-])${escapedCitation}(?![0-9-])`,
      "u",
    ).test(reportSpan);
    results.push({
      quoteId: quote.quoteId,
      sourceHash: source.hash,
      quoteHash: hash(quote.quote),
      normalization: mode,
      sourceMatches,
      reportMatches,
      citationMatches,
      valid: sourceMatches && reportMatches && citationMatches,
    });
  }
  return {
    schemaVersion: 1,
    valid: results.every((value) => value.valid),
    scope: "submitted-quotes-only",
    completeReportVerified: false,
    reportHash: report.hash,
    bundleHash: hash(JSON.stringify(bundle)),
    quotes: results,
    limitations: [
      "Does not enumerate unsubmitted quotations or prove semantic support.",
      "Source label, quote and locator co-occurrence is checked within the declared report block, not grammatical attribution.",
      "Roots must be stable trusted directories; hashes are not identity attestations.",
    ],
  };
}
