import { prepareReviewedAudit } from "./review.mjs";
import { writeRevision } from "./revision.mjs";
import { lstat } from "node:fs/promises";
import path from "node:path";

const attachmentOptions = {
  "study-evidence.json": "studySources",
  "ai-observation-evidence.json": "measurements",
  "ai-observations.jsonl": "measurements",
  "search-console-evidence.json": "searchConsoleExports",
  "analytics-evidence.json": "analyticsExports",
  "bing-evidence.json": "bingExports",
  "server-log-evidence.json": "serverLogExports",
};
const allowedOptions = new Set([
  "brandName",
  ...Object.values(attachmentOptions),
]);

/** Creates a new complete report folder from retained snapshots, without fetching
 * or changing source content. Existing attachment kinds require explicitly
 * resupplied inputs; a new edition must not silently drop them. */
export async function renderReportRevision(
  sourceDirectory,
  options = {},
  runDirectory,
) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    "registry" in options ||
    Object.keys(options).some((key) => !allowedOptions.has(key))
  )
    throw new Error(
      "Invalid report options; registry overrides are not accepted",
    );
  const { audit, config, registry, output } = await prepareReviewedAudit(
    sourceDirectory,
    { reviews: [] },
    runDirectory,
  );
  for (const [name, key] of Object.entries(attachmentOptions)) {
    try {
      await lstat(path.join(sourceDirectory, name));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (options[key] === undefined)
      throw new Error(
        `Existing report attachment ${name}: resupply ${key} for the new revision`,
      );
  }
  return writeRevision(audit, config, registry, output, options);
}
