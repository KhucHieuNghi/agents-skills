// Author-side worked example. These synthetic judgments are not a customer auditor.
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const [packageArgument, outputArgument] = process.argv.slice(2);
if (!packageArgument || !outputArgument) {
  throw new Error(
    "Usage: node scripts/example-content-audit-review.mjs INSTALLED_PACKAGE NEW_OUTPUT_DIRECTORY",
  );
}
const pkg = path.resolve(packageArgument);
const root = path.resolve(outputArgument);
const { startAudit } = await import(
  pathToFileURL(path.join(pkg, "scripts/lib/run.mjs"))
);
const { loadAuditData, validateAudit } = await import(
  pathToFileURL(path.join(pkg, "scripts/lib/validate.mjs"))
);
const { reviewAudit } = await import(
  pathToFileURL(path.join(pkg, "scripts/lib/review.mjs"))
);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
await mkdir(root); // Refuse an existing output; never overwrite a prior example.
const content = path.join(root, "content");
await mkdir(content);
const page = path.join(content, "refund.md");
const text =
  "# Synthetic refund policy\nApproved record: refunds are available within 30 days of purchase.\nDraft: refunds are available within 60 days of purchase.\n";
await writeFile(page, text);
const initial = await startAudit(
  {
    inputs: [{ path: page, source: "fixture" }],
    localRoots: [content],
    inventoryComplete: true,
  },
  path.join(root, "initial"),
);
const audit = await loadAuditData(initial.directory);
const originalChecks = await readFile(
  path.join(initial.directory, "checks.jsonl"),
);
const itemId = audit.inventory[0].itemId;
const snapshot = audit.evidence.find(
  (record) => record.itemId === itemId && record.kind === "content",
);
assert(snapshot, "Require the actual collected content snapshot");
const now = new Date().toISOString();
const value =
  "Synthetic owner-approved record in refund.md:2: refunds are available within 30 days of purchase. This is fixture context, not verified live policy.";
const evidence = {
  ...snapshot,
  evidenceId: "refund-policy-context",
  kind: "claim-sources",
  artifact: "evidence/refund-policy-context.txt",
  value,
  snapshotHash: hash(value),
  collectedAt: now,
  locator: "refund.md:2",
  sourceEvidenceIds: [snapshot.evidenceId],
};
const evidenceIds = [snapshot.evidenceId, evidence.evidenceId];
const bundle = {
  artifacts: { [evidence.artifact]: value },
  evidence: [evidence],
  reviews: [
    {
      itemId,
      ruleId: "quality-claims",
      status: "fail",
      reason:
        "The draft says 60 days while the supplied approved record allows 30 days. Both concern the same purchase-based refund window.",
      evidenceIds,
      reviewer: "synthetic-example-author",
      reviewedAt: now,
    },
  ],
  findings: [
    {
      findingId: "refund-window",
      title: "Draft overstates the approved refund window",
      affectedItemIds: [itemId],
      ruleIds: ["quality-claims"],
      dimensions: ["quality"],
      evidenceIds,
      severity: "medium",
      confidence: "high",
      classification: "observed",
      remediation:
        "Change the draft refund window to 30 days from purchase, preserving the purchase-based scope.",
      verification:
        "Compare the revised complete assertion with the supplied approved policy. This example does not authorize changing customer content.",
      ownerRole: "Content owner",
      effort: "small",
    },
  ],
};
await writeFile(path.join(root, "review.json"), json(bundle));
await assert.rejects(
  reviewAudit(
    initial.directory,
    { ...bundle, findings: [] },
    path.join(root, "rejected"),
  ),
  /lacks finding/i,
);
await assert.rejects(access(path.join(root, "rejected")));
const revised = await reviewAudit(
  initial.directory,
  bundle,
  path.join(root, "reviewed"),
);
const validation = await validateAudit(revised.directory);
assert.equal(validation.valid, true);
assert.equal(validation.completionAllowed, false);
assert.deepEqual(
  await readFile(path.join(initial.directory, "checks.jsonl")),
  originalChecks,
);
assert.equal(await readFile(page, "utf8"), text);
const result = await loadAuditData(revised.directory);
assert.equal(result.findings.length, 1);
assert.equal(
  result.checks.find((check) => check.ruleId === "quality-claims").status,
  "fail",
);
assert.equal(
  result.checks.find((check) => check.ruleId === "seo-canonical").status,
  "unknown",
);
await writeFile(path.join(root, "validation.json"), json(validation));
const report =
  "# Synthetic review example\nrefund.md:2 — Approved record: refunds are available within 30 days of purchase.\nrefund.md:3 — Draft: refunds are available within 60 days of purchase.\nThe draft conflicts with the supplied policy. One finding is persisted; the audit remains partial. See reviewed/report.md and validation.json for complete coverage.\n";
await writeFile(path.join(root, "example-report.md"), report);
const quotes = {
  root,
  report: "example-report.md",
  reportHash: hash(report),
  quotes: [2, 3].map((line) => ({
    quoteId: `refund-line-${line}`,
    source: "content/refund.md",
    sourceLabel: "refund.md",
    sourceHash: hash(text),
    startLine: line,
    endLine: line,
    reportStartLine: line,
    reportEndLine: line,
    normalization: "exact",
    quote: text.split("\n")[line - 1],
  })),
};
const quoteFile = path.join(root, "quotes.json");
await writeFile(quoteFile, json(quotes));
const receipt = JSON.parse(
  execFileSync(
    process.execPath,
    [path.join(pkg, "scripts/audit.mjs"), "verify-quotes", quoteFile],
    { encoding: "utf8" },
  ),
);
assert.equal(receipt.valid, true);
await writeFile(path.join(root, "quote-receipt.json"), json(receipt));
console.log(
  json({
    root,
    valid: validation.valid,
    completionAllowed: validation.completionAllowed,
    persistedFindings: result.findings.length,
    verifiedQuotes: receipt.quotes.length,
    sourceUnchanged: true,
    initialChecksUnchanged: true,
    missingFindingRejected: true,
  }),
);
