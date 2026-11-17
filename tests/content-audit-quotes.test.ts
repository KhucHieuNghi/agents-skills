import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { verifyQuotes } from "../skills/content-search-audit/scripts/lib/quotes.mjs";
const roots: string[] = [];
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "audit-quotes-"));
  roots.push(root);
  await mkdir(path.join(root, "targets"));
  const source =
    "Heading\nThere is no other descriptive\ntranscript or equivalent instruction for this visual selection.\n";
  const quote =
    "There is no other descriptive transcript or equivalent instruction for this visual selection.";
  const report = `Source targets/source.md:3: "${quote}"\n`;
  await writeFile(path.join(root, "targets/source.md"), source);
  await writeFile(path.join(root, "report.md"), report);
  return {
    root,
    source,
    quote,
    report,
    bundle: {
      root,
      report: "report.md",
      reportHash: hash(report),
      quotes: [
        {
          quoteId: "q1",
          source: "targets/source.md",
          sourceHash: hash(source),
          startLine: 3,
          endLine: 3,
          reportStartLine: 1,
          reportEndLine: 1,
          normalization: "whitespace",
          quote,
        },
      ],
    },
  };
}
it("rejects a quote found elsewhere in the source but outside its cited lines", async () => {
  const { bundle, root, quote } = await fixture();
  const wrong = await verifyQuotes(bundle);
  expect(wrong.valid).toBe(false);
  expect(wrong.quotes[0].sourceMatches).toBe(false);
  const report = `Source targets/source.md:2-3: "${quote}"\n`;
  await writeFile(path.join(root, "report.md"), report);
  const corrected = {
    ...bundle,
    reportHash: hash(report),
    quotes: [{ ...bundle.quotes[0], startLine: 2 }],
  };
  const good = await verifyQuotes(corrected);
  expect(good.valid).toBe(true);
  expect(good.completeReportVerified).toBe(false);
  const prefixReport = `Source targets/source.md:2-30: "${quote}"\n`;
  await writeFile(path.join(root, "report.md"), prefixReport);
  expect(
    (await verifyQuotes({ ...corrected, reportHash: hash(prefixReport) }))
      .quotes[0].citationMatches,
  ).toBe(false);
  await writeFile(path.join(root, "report.md"), report);
  const altered = {
    ...corrected,
    quotes: [
      {
        ...corrected.quotes[0],
        quote:
          "There is no other descriptive transcript or equivalent instruction.",
      },
    ],
  };
  expect((await verifyQuotes(altered)).valid).toBe(false);
});
it("binds the locator in the report as well as source/report hashes and safe paths", async () => {
  const { bundle, root } = await fixture();
  expect(
    (
      await verifyQuotes({
        ...bundle,
        quotes: [{ ...bundle.quotes[0], startLine: 2 }],
      })
    ).quotes[0].citationMatches,
  ).toBe(false);
  await expect(
    verifyQuotes({ ...bundle, reportHash: "0".repeat(64) }),
  ).rejects.toThrow(/hash/i);
  await expect(
    verifyQuotes({
      ...bundle,
      quotes: [{ ...bundle.quotes[0], sourceHash: "0".repeat(64) }],
    }),
  ).rejects.toThrow(/hash/i);
  await expect(verifyQuotes({ ...bundle, quotes: [] })).rejects.toThrow();
  await expect(
    verifyQuotes({ ...bundle, quotes: [bundle.quotes[0], bundle.quotes[0]] }),
  ).rejects.toThrow(/duplicate/i);
  await expect(
    verifyQuotes({ ...bundle, report: "../outside.md" }),
  ).rejects.toThrow(/path/i);
  await symlink(path.join(root, "report.md"), path.join(root, "alias.md"));
  await expect(verifyQuotes({ ...bundle, report: "alias.md" })).rejects.toThrow(
    /symlink/i,
  );
});
