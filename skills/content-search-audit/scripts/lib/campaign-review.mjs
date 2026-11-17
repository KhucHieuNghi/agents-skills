import { resolveActionProposal } from "./action-proposal.mjs";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { validateCampaign } from "./campaign.mjs";
import { loadAuditData } from "./validate.mjs";
import { resolveRunOutput } from "./run.mjs";

import { validateNewReviewTimes } from "./review-time.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const text = (value) => typeof value === "string" && value.trim().length > 0;
const key = (ref) => JSON.stringify([ref?.part, ref?.evidenceId]);
const equalSet = (a, b) =>
  Array.isArray(a) &&
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
const validDate = (value) => text(value) && Number.isFinite(Date.parse(value));
const contextKinds = new Set([
  "inventory-map",
  "question-set",
  "entity-record",
  "link-graph",
  "audience-context",
]);

async function boundedJSON(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 32 * 1024 * 1024)
    throw new Error("Unsafe or oversized review file");
  return JSON.parse(await readFile(file, "utf8"));
}

/** Validate attributed portfolio judgments against exact current partition snapshots. */
export async function evaluateCampaignReview(sourceDirectory, bundle) {
  if (!bundle || Buffer.byteLength(JSON.stringify(bundle)) > 32 * 1024 * 1024)
    throw new Error("Invalid or oversized global review bundle");
  const source = await validateCampaign(sourceDirectory);
  if (!source.valid)
    throw new Error(`Invalid source campaign: ${source.errors.join("; ")}`);
  const manifestBytes = await readFile(
    path.join(sourceDirectory, "campaign.json"),
  );
  const manifest = JSON.parse(manifestBytes);
  if (
    bundle.schemaVersion !== 1 ||
    bundle.campaignId !== manifest.campaignId ||
    bundle.sourceManifestHash !== hash(manifestBytes) ||
    !bundle.partSnapshotHashes ||
    !equalSet(
      Object.keys(bundle.partSnapshotHashes),
      manifest.parts.map((part) => part.path),
    )
  )
    throw new Error("Global review snapshot binding differs from source");
  if (
    !Array.isArray(bundle.reviews) ||
    !Array.isArray(bundle.contextEvidence) ||
    !Array.isArray(bundle.findings)
  )
    throw new Error("Reviews, contextEvidence and findings arrays required");
  const refs = new Map();
  const owned = new Map(
    manifest.parts.flatMap((part) =>
      part.ownedItemIds.map((id) => [id, part.path]),
    ),
  );
  for (const part of manifest.parts) {
    const audit = await loadAuditData(path.join(sourceDirectory, part.path));
    if (bundle.partSnapshotHashes[part.path] !== hash(JSON.stringify(audit)))
      throw new Error("Stale global review partition snapshot");
    for (const record of audit.evidence)
      refs.set(key({ part: part.path, evidenceId: record.evidenceId }), {
        kind: record.kind,
        itemId: record.itemId,
        part: part.path,
      });
  }
  const contexts = new Map();
  for (const record of bundle.contextEvidence) {
    if (
      !record ||
      !text(record.evidenceId) ||
      contexts.has(record.evidenceId) ||
      !contextKinds.has(record.kind) ||
      !text(record.value) ||
      !text(record.locator) ||
      !validDate(record.collectedAt) ||
      record.snapshotHash !== hash(record.value) ||
      !Array.isArray(record.sourceReferences) ||
      record.sourceReferences.some((ref) => !refs.has(key(ref)))
    )
      throw new Error("Invalid global context evidence or lineage");
    contexts.set(record.evidenceId, record);
  }
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const rules = registry.rules.filter((rule) => rule.dimension === "portfolio");
  const byRule = new Map();
  for (const review of bundle.reviews) {
    const rule = rules.find((entry) => entry.ruleId === review?.ruleId);
    if (
      !rule ||
      byRule.has(rule.ruleId) ||
      !["pass", "fail", "unknown", "not-applicable"].includes(review.status) ||
      !text(review.reason) ||
      !text(review.reviewer) ||
      !validDate(review.reviewedAt) ||
      !Array.isArray(review.itemIds) ||
      new Set(review.itemIds).size !== review.itemIds.length ||
      review.itemIds.some((id) => !manifest.itemIds.includes(id)) ||
      !Array.isArray(review.evidenceReferences) ||
      !Array.isArray(review.contextEvidenceIds)
    )
      throw new Error("Invalid or duplicate global review");
    const evidence = review.evidenceReferences.map((ref) => {
      const record = refs.get(key(ref));
      if (!record)
        throw new Error("Unknown partition-scoped evidence reference");
      return record;
    });
    const context = review.contextEvidenceIds.map((id) => {
      const record = contexts.get(id);
      if (!record) throw new Error("Unknown global context evidence");
      return record;
    });
    if (review.status !== "unknown") {
      if (
        !equalSet(review.itemIds, manifest.itemIds) ||
        !manifest.itemIds.length ||
        manifest.itemIds.some((id) => !owned.has(id))
      )
        throw new Error(
          "Resolved global review must cover the entire owned inventory",
        );
      if (
        manifest.itemIds.some(
          (id) =>
            !evidence.some(
              (record) =>
                record.kind === "content" &&
                record.itemId === id &&
                record.part === owned.get(id),
            ),
        )
      )
        throw new Error(
          "Resolved global review lacks content evidence for an item",
        );
      const kinds = new Set(
        [...evidence, ...context].map((record) => record.kind),
      );
      if (
        review.status !== "not-applicable" &&
        rule.requiredEvidence.some((kind) => !kinds.has(kind))
      )
        throw new Error("Global review lacks required evidence kinds");
      if (
        review.status === "not-applicable" &&
        !text(review.applicabilityReason)
      )
        throw new Error(
          "Global not-applicable judgment requires applicabilityReason",
        );
    }
    byRule.set(rule.ruleId, review);
  }
  const findingIds = new Set();
  for (const finding of bundle.findings) {
    const review = byRule.get(finding?.ruleId);
    if (finding) resolveActionProposal(finding, { global: true });
    if (
      !finding ||
      !text(finding.findingId) ||
      findingIds.has(finding.findingId) ||
      review?.status !== "fail" ||
      !["critical", "high", "medium", "low"].includes(finding.severity) ||
      !["high", "medium", "low"].includes(finding.confidence) ||
      !text(finding.observation) ||
      !text(finding.recommendation) ||
      !text(finding.verification) ||
      (finding.ownerRole !== undefined && !text(finding.ownerRole)) ||
      (finding.effort !== undefined && !text(finding.effort)) ||
      !Array.isArray(finding.affectedItemIds) ||
      !finding.affectedItemIds.length ||
      new Set(finding.affectedItemIds).size !==
        finding.affectedItemIds.length ||
      finding.affectedItemIds.some((id) => !review.itemIds.includes(id)) ||
      !Array.isArray(finding.evidenceReferences) ||
      !finding.evidenceReferences.length ||
      finding.evidenceReferences.some(
        (ref) =>
          !review.evidenceReferences.some(
            (candidate) => key(ref) === key(candidate),
          ),
      )
    )
      throw new Error("Invalid global finding or unsupported evidence");
    findingIds.add(finding.findingId);
  }
  for (const review of byRule.values())
    if (
      review.status === "fail" &&
      !bundle.findings.some((finding) => finding.ruleId === review.ruleId)
    )
      throw new Error("Failed global review lacks finding");
  const unresolvedRuleIds = rules
    .filter(
      (rule) =>
        !byRule.has(rule.ruleId) ||
        byRule.get(rule.ruleId).status === "unknown",
    )
    .map((rule) => rule.ruleId);
  const itemCoverage = source.coverage;
  const completionAllowed =
    unresolvedRuleIds.length === 0 &&
    itemCoverage.inventoryComplete &&
    itemCoverage.mode === "full" &&
    itemCoverage.total > 0 &&
    itemCoverage.collectionAccounted &&
    itemCoverage.unresolvedItems === 0 &&
    itemCoverage.missingChecks === 0 &&
    itemCoverage.pendingQueue.length === 0;
  return {
    valid: true,
    campaignId: manifest.campaignId,
    globalReviewComplete: unresolvedRuleIds.length === 0,
    unresolvedRuleIds,
    completionAllowed,
    status: completionAllowed ? "complete" : "partial",
    itemCoverage,
    findings: bundle.findings.length,
    limitations: [
      "Validates evidence bindings and review coverage, not semantic truth or reviewer identity",
      "A completed audit may contain failed content checks and remediation findings",
      "Missing measurements and unresolved local checks still prevent full completion",
    ],
  };
}

/** Persist a new-only global assessment receipt; source campaign is never modified. */
export async function reviewCampaign(sourceDirectory, bundle, outputDirectory) {
  const result = await evaluateCampaignReview(sourceDirectory, bundle);
  const reviewAcceptedAt = validateNewReviewTimes(
    bundle.reviews,
    bundle.contextEvidence,
  );
  result.reviewAcceptedAt = reviewAcceptedAt;
  const sourceRoot = await realpath(sourceDirectory);
  const config = await boundedJSON(path.join(sourceRoot, "config.json"));
  const { output } = await resolveRunOutput(config, outputDirectory);
  const relative = path.relative(sourceRoot, output);
  if (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    throw new Error("Global review output must be outside source campaign");
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  await writeFile(
    path.join(output, "review.json"),
    JSON.stringify(bundle, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(
    path.join(output, "review-result.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return { directory: output, ...result };
}

export async function validateCampaignReview(sourceDirectory, reviewDirectory) {
  return evaluateCampaignReview(
    sourceDirectory,
    await boundedJSON(path.join(reviewDirectory, "review.json")),
  );
}
