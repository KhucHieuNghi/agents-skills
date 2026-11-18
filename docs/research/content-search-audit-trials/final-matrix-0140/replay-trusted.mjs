import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { verifyContentAudit } from "/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-final-matrix-0140-ko90efm7/trusted-1500b35/scripts/verify-content-audit.mjs";
import { verifyQuotes } from "/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-final-matrix-0140-ko90efm7/trusted-1500b35/skills/content-search-audit/scripts/lib/quotes.mjs";
const project = process.argv[2];
const output = process.argv[3];
const files = [];
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if ([".agents", ".claude", ".agent-skills", ".git"].includes(entry.name))
      continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (entry.isFile()) files.push(file);
  }
}
await visit(project);
const artifacts = files
  .filter((file) => path.basename(file) === "run.json")
  .map((file) => ({ kind: "run", directory: path.dirname(file) }));
const result = await verifyContentAudit({
  schemaVersion: 1,
  packageDirectory:
    "/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-final-matrix-0140-ko90efm7/release/package/skills/content-search-audit",
  expectedComponentDigest:
    "de029b4f618d1cd441d9f722e0dd60e6233f6d5fbc1dc258b6389d48341c2335",
  release: {
    directory:
      "/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-final-matrix-0140-ko90efm7/release/package",
    expectedDigest:
      "4410487c622352ebed49961331dd58341ba31960ed6e3836d652983f7e226b1e",
  },
  artifacts,
});
const quotes = [];
for (const file of files.filter((f) => f.endsWith(".json"))) {
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch {
    continue;
  }
  if (
    Array.isArray(data?.quotes) &&
    typeof data?.root === "string" &&
    typeof data?.report === "string"
  ) {
    try {
      quotes.push({ file, result: await verifyQuotes(data) });
    } catch (error) {
      quotes.push({ file, error: error.message });
    }
  }
}
let report;
try {
  report = await readFile(process.argv[4] || path.join(project, "report.md"));
} catch {
  report = Buffer.from("");
}
const receipt = {
  ...result,
  quotes,
  reportSha256: createHash("sha256").update(report).digest("hex"),
};
await writeFile(output, JSON.stringify(receipt, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    valid: result.valid,
    runs: artifacts.length,
    quoteLedgers: quotes.length,
    quoteErrors: quotes.filter((q) => q.error || !q.result.valid).length,
    coverage: result.artifacts.map((a) => ({
      directory: a.directory,
      declared: a.coverage?.total,
      audited: a.coverage?.audited,
      pending: a.coverage?.states?.pending,
      completionAllowed: a.completionAllowed,
    })),
  }),
);
if (!result.valid) process.exitCode = 1;
