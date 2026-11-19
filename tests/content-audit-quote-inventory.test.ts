import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";
import {
  recordQuoteInventory,
  verifyQuotes,
} from "../skills/content-search-audit/scripts/lib/quotes.mjs";

const roots: string[] = [];
const hash = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "quote-inventory-"));
  roots.push(root);
  const report =
    "# Audit\nThe supplied capture shows conflicting canonical URLs.\n";
  await writeFile(path.join(root, "report.md"), report);
  return {
    root,
    report,
    bundle: {
      root,
      report: "report.md",
      reportHash: hash(report),
      inventory: {
        reviewerId: "audit-session-1",
        reviewedAt: "2026-11-19T01:00:00Z",
        sourceQuotationCount: 0,
        rationale:
          "Inspected the final Markdown: paraphrases and literal field values only; no source assertions quoted verbatim.",
      },
    },
  };
}
it("records a bound declaration without claiming verification or full coverage", async () => {
  const { bundle } = await fixture();
  const receipt = await recordQuoteInventory(bundle);
  expect(receipt.status).toBe("recorded");
  expect(receipt.scope).toBe("declared-zero-quotation-inventory");
  expect(receipt.reportHash).toBe(bundle.reportHash);
  expect(receipt.report).toBe("report.md");
  expect(receipt.inventory).toEqual(bundle.inventory);
  expect(receipt.bundleHash).toBe(hash(JSON.stringify(bundle)));
  expect(receipt.quotationAbsenceVerified).toBe(false);
  expect(receipt.reviewerAuthenticationVerified).toBe(false);
  expect(receipt.completeReportVerified).toBe(false);
  expect(receipt).not.toHaveProperty("valid");
  expect(receipt).not.toHaveProperty("quotesVerified");
});
it("rejects changed report bytes and preserves the empty quote-verifier rejection", async () => {
  const { root, bundle } = await fixture();
  await writeFile(path.join(root, "report.md"), "changed report");
  await expect(recordQuoteInventory(bundle)).rejects.toThrow(/hash/i);
  await expect(verifyQuotes({ ...bundle, quotes: [] })).rejects.toThrow();
});
it("rejects traversal and symlinks through the same safe-reader boundary", async () => {
  const { root, bundle } = await fixture();
  await expect(
    recordQuoteInventory({ ...bundle, report: "../outside.md" }),
  ).rejects.toThrow(/path/i);
  await symlink(path.join(root, "report.md"), path.join(root, "alias.md"));
  await expect(
    recordQuoteInventory({ ...bundle, report: "alias.md" }),
  ).rejects.toThrow(/symlink/i);
  await symlink(root, path.join(root, "root-alias"));
  await expect(
    recordQuoteInventory({ ...bundle, root: path.join(root, "root-alias") }),
  ).rejects.toThrow(/symlink/i);
});
it("rejects invalid UTF-8 and oversized reports even with matching hashes", async () => {
  const { root, bundle } = await fixture();
  for (const bytes of [
    Buffer.from([0xff]),
    Buffer.alloc(10 * 1024 * 1024 + 1, 65),
  ]) {
    await writeFile(path.join(root, "report.md"), bytes);
    await expect(
      recordQuoteInventory({ ...bundle, reportHash: hash(bytes) }),
    ).rejects.toThrow();
  }
});
it("requires exactly zero and explicit bounded attribution", async () => {
  const { bundle } = await fixture();
  for (const value of [false, -1, 1, "0", null]) {
    await expect(
      recordQuoteInventory({
        ...bundle,
        inventory: { ...bundle.inventory, sourceQuotationCount: value },
      }),
    ).rejects.toThrow();
  }
  for (const changes of [
    { reviewerId: "" },
    { reviewerId: "x".repeat(1025) },
    { rationale: " " },
    { reviewedAt: "2026-11-19" },
    { reviewedAt: "2026-02-30T00:00:00Z" },
    { reviewedAt: "2026-11-19T24:00:00Z" },
    { accepted: true },
  ]) {
    await expect(
      recordQuoteInventory({
        ...bundle,
        inventory: { ...bundle.inventory, ...changes },
      }),
    ).rejects.toThrow();
  }
  await expect(
    recordQuoteInventory({ ...bundle, quotes: [] }),
  ).rejects.toThrow();
});
it("does not claim that supplied rationale actually proves absence", async () => {
  const { root, bundle } = await fixture();
  const text = 'Source says: "A quoted assertion exists here."\n';
  await writeFile(path.join(root, "report.md"), text);
  const receipt = await recordQuoteInventory({
    ...bundle,
    reportHash: hash(text),
  });
  expect(receipt.quotationAbsenceVerified).toBe(false);
  expect(receipt.completeReportVerified).toBe(false);
});
it("exposes a distinct CLI receipt and does not silently accept an empty verify-quotes bundle", async () => {
  const { root, bundle } = await fixture();
  const input = path.join(root, "inventory.json");
  await writeFile(input, JSON.stringify(bundle));
  const helper = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const { stdout } = await promisify(execFile)(process.execPath, [
    helper,
    "record-quote-inventory",
    input,
  ]);
  expect(JSON.parse(stdout).status).toBe("recorded");
  await writeFile(input, JSON.stringify({ ...bundle, quotes: [] }));
  await expect(
    promisify(execFile)(process.execPath, [helper, "verify-quotes", input]),
  ).rejects.toThrow();
});
