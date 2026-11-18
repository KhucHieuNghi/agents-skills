import process from "node:process";
import console from "node:console";
import { verifyQuotes } from "../native-expanded-0140/trusted-1500b35/skills/content-search-audit/scripts/lib/quotes.mjs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { verifyContentAudit } from "../native-expanded-0140/trusted-1500b35/scripts/verify-content-audit.mjs";
const root = process.argv[2],
  output = process.argv[3],
  files = [];
async function visit(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if ([".agents", ".claude", ".agent-skills", ".git"].includes(e.name))
      continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) await visit(f);
    else if (e.isFile()) files.push(f);
  }
}
await visit(root);
const campaigns = [];
for (const f of files.filter((f) => path.basename(f) === "campaign.json")) {
  const d = JSON.parse(await readFile(f, "utf8"));
  if (d.campaignId && Array.isArray(d.parts))
    campaigns.push({
      directory: path.dirname(f),
      data: d,
      sha: createHash("sha256")
        .update(await readFile(f))
        .digest("hex"),
    });
}
const artifacts = campaigns.map((c) => ({
  kind: "campaign",
  directory: c.directory,
}));
for (const f of files.filter((f) => path.basename(f) === "run.json"))
  artifacts.push({ kind: "run", directory: path.dirname(f) });
for (const f of files.filter((f) => path.basename(f) === "review.json")) {
  const d = JSON.parse(await readFile(f, "utf8"));
  const c = campaigns.find(
    (c) => c.sha === d.sourceManifestHash && c.data.campaignId === d.campaignId,
  );
  if (c && Array.isArray(d.reviews))
    artifacts.push({
      kind: "campaign-review",
      directory: path.dirname(f),
      sourceDirectory: c.directory,
    });
}
const result = await verifyContentAudit({
  schemaVersion: 1,
  packageDirectory: path.resolve(
    "build/content-search-audit-0.1.40-report-revision/skills/content-search-audit",
  ),
  expectedComponentDigest:
    "de029b4f618d1cd441d9f722e0dd60e6233f6d5fbc1dc258b6389d48341c2335",
  release: {
    directory: path.resolve(
      "build/content-search-audit-0.1.40-report-revision",
    ),
    expectedDigest:
      "4410487c622352ebed49961331dd58341ba31960ed6e3836d652983f7e226b1e",
  },
  artifacts,
});
const quotes = [];
for (const file of files.filter((f) => f.endsWith(".json"))) {
  let d;
  try {
    d = JSON.parse(await readFile(file, "utf8"));
  } catch {
    continue;
  }
  if (
    Array.isArray(d?.quotes) &&
    typeof d.root === "string" &&
    typeof d.report === "string"
  ) {
    try {
      quotes.push({ file, result: await verifyQuotes(d) });
    } catch (e) {
      quotes.push({ file, error: e.message });
    }
  }
}
result.quotes = quotes;
result.trustedSourceCommit = "1500b35";
await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    valid: result.valid,
    artifacts: result.artifacts.map((a) => ({
      kind: a.kind,
      valid: a.valid,
      completionAllowed: a.completionAllowed,
    })),
  }),
);
if (!result.valid) process.exitCode = 1;
