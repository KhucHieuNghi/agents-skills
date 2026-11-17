#!/usr/bin/env node
import { redactEvidence, redactReport } from "./lib/redaction.mjs";
import { verifyQuotes } from "./lib/quotes.mjs";
import process from "node:process";
import {
  resumeDiscovery,
  loadDiscoverySnapshot,
} from "./lib/discovery-resume.mjs";
import { importServerLogs } from "./lib/server-logs.mjs";
import { importBing } from "./lib/bing.mjs";
import { importAnalytics } from "./lib/analytics.mjs";
import { importSearchConsole } from "./lib/search-console.mjs";
import { indexCampaign } from "./lib/campaign-index.mjs";
import { reviewCampaignParts } from "./lib/campaign-part-review.mjs";
import {
  renderCampaignReport,
  renderRedactedCampaignReport,
} from "./lib/campaign-report.mjs";
import { discoverInventory } from "./lib/discovery.mjs";
import { enumerateRepository } from "./lib/repository-discovery.mjs";
import { discoverSitemaps } from "./lib/sitemap-discovery.mjs";
import { discoverLinks } from "./lib/link-discovery.mjs";
import {
  reviewCampaign,
  validateCampaignReview,
} from "./lib/campaign-review.mjs";
import { readFile } from "node:fs/promises";
import {
  startCampaign,
  resumeCampaign,
  validateCampaign,
} from "./lib/campaign.mjs";
import { resumeAudit } from "./lib/resume.mjs";
import { reviewAudit } from "./lib/review.mjs";
import { startAudit } from "./lib/run.mjs";
import { normalizeItems } from "./lib/inventory.mjs";
import { validateAudit } from "./lib/validate.mjs";
import { renderReport } from "./lib/report.mjs";
const usage = `Content Search Audit candidate helper (Node 22+)
  campaign CONFIG.json NEW_DIRECTORY  Collect all declared items across storage-bounded partitions
  campaign-resume SOURCE NEW_DIRECTORY Continue registered snapshots into a new campaign
  campaign-validate DIRECTORY         Recompute unique ownership and aggregate coverage
  campaign-index SOURCE NEW_DIRECTORY Export partition-scoped references for global review
  campaign-review SOURCE BUNDLE.json NEW_DIRECTORY Record attributed global portfolio review
  campaign-review-parts SOURCE BUNDLE.json NEW_DIRECTORY Revise local assessments immutably
  campaign-review-validate SOURCE REVIEW_DIRECTORY Recompute review bindings and completion
  campaign-redact-report SOURCE REVIEW_DIRECTORY POLICY.json NEW_DIRECTORY [OPTIONS.json] Render redacted unified reports
  campaign-report SOURCE REVIEW_DIRECTORY NEW_DIRECTORY [OPTIONS.json] Render unified customer reports
  start CONFIG.json NEW_RUN_DIRECTORY  Collect declared inputs; public reads require network.allowedOrigins
  resume SOURCE_RUN CONFIG.json NEW_RUN Refresh declared inputs and retain valid snapshot assessments
  review SOURCE_RUN BUNDLE.json NEW_RUN  Apply attributed snapshot reviews to a new revision
  import-server-logs EXPORT.json      Validate normalized request logs without network access
  import-bing EXPORT.json             Validate supplied Bing traffic or attributed AI dashboard mapping
  import-analytics EXPORT.json        Validate supplied GA4 runReport pages without fetching
  import-search-console EXPORT.json   Validate supplied Search Analytics pages without fetching
  inventory CONFIG.json               Normalize declared inputs without collecting
  discover CONFIG.json                Union supplied sitemap/list/record snapshots with explicit queues
  discover-repository CONFIG.json     Enumerate explicitly scoped local content into a source snapshot
  discover-sitemaps CONFIG.json NEW_DIRECTORY Traverse allowed public sitemap indexes with captures
  discovery-resume SOURCE NEW_DIRECTORY [BUDGETS.json] Continue bound stopped discovery snapshots
  discovery-validate DIRECTORY        Verify registered discovery captures and hashes
  discover-links CONFIG.json NEW_DIRECTORY Crawl allowed static hyperlinks with graph and captures
  redact-report SOURCE_RUN POLICY.json NEW_DIRECTORY [OPTIONS.json] Create redacted reports with derivative links
  redact-evidence SOURCE_RUN POLICY.json NEW_DIRECTORY Create separately hashed literal-redacted evidence
  verify-quotes BUNDLE.json           Check submitted quote text and cited line ranges against bound files
  validate RUN_DIRECTORY              Validate artifacts and completion eligibility
  coverage RUN_DIRECTORY              Validate and print recomputed coverage
  render-with-measurements RUN_DIRECTORY OPTIONS.json Render with supplied measurement exports
  render RUN_DIRECTORY [BRAND_NAME]    Create new report files; existing reports are preserved
This helper does not perform semantic review. Discovery requires explicit scope.
`;
async function reportOptions(file, campaign = false) {
  const options = JSON.parse(await readFile(file, "utf8"));
  const allowed = campaign
    ? [
        "measurements",
        "searchConsoleExports",
        "analyticsExports",
        "bingExports",
        "serverLogExports",
      ]
    : [
        "brandName",
        "measurements",
        "searchConsoleExports",
        "analyticsExports",
        "bingExports",
        "serverLogExports",
      ];
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => !allowed.includes(key))
  )
    throw new Error(
      "Invalid report options; registry overrides are not accepted by the CLI",
    );
  return options;
}
async function main() {
  if (Number(process.versions.node.split(".")[0]) < 22)
    throw new Error("Node.js 22 or newer required");
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "help") {
    process.stdout.write(usage);
    return;
  }
  let result;
  if (command === "verify-quotes" && args.length === 1) {
    result = await verifyQuotes(JSON.parse(await readFile(args[0], "utf8")));
    if (!result.valid) process.exitCode = 1;
  } else if (
    ["redact-evidence", "redact-report"].includes(command) &&
    (args.length === 3 || (command === "redact-report" && args.length === 4))
  ) {
    result = await (
      command === "redact-report" ? redactReport : redactEvidence
    )(
      args[0],
      JSON.parse(await readFile(args[1], "utf8")),
      args[2],
      args[3] ? await reportOptions(args[3]) : {},
    );
  } else if (command === "discovery-resume" && [2, 3].includes(args.length)) {
    result = await resumeDiscovery(
      args[0],
      args[1],
      args[2] ? JSON.parse(await readFile(args[2], "utf8")) : {},
    );
  } else if (command === "discovery-validate" && args.length === 1) {
    const snapshot = await loadDiscoverySnapshot(args[0]);
    result = {
      valid: true,
      discoveryId: snapshot.manifest.discoveryId,
      captures: snapshot.captures.size,
      sourceManifestHash: snapshot.manifestHash,
    };
  } else if (command === "import-server-logs" && args.length === 1) {
    result = importServerLogs(JSON.parse(await readFile(args[0], "utf8")));
  } else if (command === "import-bing" && args.length === 1) {
    result = importBing(JSON.parse(await readFile(args[0], "utf8")));
  } else if (command === "import-analytics" && args.length === 1) {
    result = importAnalytics(JSON.parse(await readFile(args[0], "utf8")));
  } else if (command === "import-search-console" && args.length === 1) {
    result = importSearchConsole(JSON.parse(await readFile(args[0], "utf8")));
  } else if (command === "campaign" && args.length === 2) {
    result = await startCampaign(
      JSON.parse(await readFile(args[0], "utf8")),
      args[1],
    );
  } else if (command === "campaign-resume" && args.length === 2) {
    result = await resumeCampaign(args[0], args[1]);
  } else if (
    command === "campaign-redact-report" &&
    [4, 5].includes(args.length)
  ) {
    result = await renderRedactedCampaignReport(
      args[0],
      args[1],
      args[3],
      JSON.parse(await readFile(args[2], "utf8")),
      args[4] ? await reportOptions(args[4], true) : {},
    );
  } else if (command === "campaign-report" && [3, 4].includes(args.length)) {
    result = await renderCampaignReport(
      args[0],
      args[1],
      args[2],
      args[3] ? await reportOptions(args[3], true) : {},
    );
  } else if (command === "campaign-review-parts" && args.length === 3) {
    result = await reviewCampaignParts(
      args[0],
      JSON.parse(await readFile(args[1], "utf8")),
      args[2],
    );
  } else if (command === "campaign-review" && args.length === 3) {
    result = await reviewCampaign(
      args[0],
      JSON.parse(await readFile(args[1], "utf8")),
      args[2],
    );
  } else if (command === "campaign-review-validate" && args.length === 2) {
    result = await validateCampaignReview(args[0], args[1]);
  } else if (command === "campaign-index" && args.length === 2) {
    result = await indexCampaign(args[0], args[1]);
  } else if (command === "campaign-validate" && args.length === 1) {
    result = await validateCampaign(args[0]);
    if (!result.valid) process.exitCode = 1;
  } else if (command === "start" && args.length === 2) {
    result = await startAudit(
      JSON.parse(await readFile(args[0], "utf8")),
      args[1],
    );
  } else if (command === "resume" && args.length === 3) {
    result = await resumeAudit(
      args[0],
      JSON.parse(await readFile(args[1], "utf8")),
      args[2],
    );
  } else if (command === "review" && args.length === 3) {
    result = await reviewAudit(
      args[0],
      JSON.parse(await readFile(args[1], "utf8")),
      args[2],
    );
  } else if (command === "discover-links" && args.length === 2) {
    result = await discoverLinks(
      JSON.parse(await readFile(args[0], "utf8")),
      args[1],
    );
  } else if (command === "discover-sitemaps" && args.length === 2) {
    result = await discoverSitemaps(
      JSON.parse(await readFile(args[0], "utf8")),
      args[1],
    );
  } else if (command === "discover-repository" && args.length === 1) {
    result = await enumerateRepository(
      JSON.parse(await readFile(args[0], "utf8")),
    );
  } else if (command === "discover" && args.length === 1) {
    result = discoverInventory(JSON.parse(await readFile(args[0], "utf8")));
  } else if (command === "inventory" && args.length === 1) {
    const config = JSON.parse(await readFile(args[0], "utf8"));
    result = normalizeItems(config.inputs, {
      trackingParameters: config.trackingParameters ?? [],
    });
  } else if (["validate", "coverage"].includes(command) && args.length === 1) {
    const validation = await validateAudit(args[0]);
    result =
      command === "validate"
        ? validation
        : {
            valid: validation.valid,
            completionAllowed: validation.completionAllowed,
            coverage: validation.coverage,
            errors: validation.errors,
          };
    if (!validation.valid) process.exitCode = 1;
  } else if (command === "render-with-measurements" && args.length === 2) {
    result = await renderReport(args[0], await reportOptions(args[1]));
  } else if (command === "render" && (args.length === 1 || args.length === 2)) {
    result = await renderReport(args[0], { brandName: args[1] });
  } else
    throw new Error("Unknown command or wrong arguments. Run with --help.");
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
try {
  await main();
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error.message }) + "\n");
  process.exitCode = 1;
}
