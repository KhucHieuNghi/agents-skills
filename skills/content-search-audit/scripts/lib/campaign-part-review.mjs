import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { validateCampaign } from "./campaign.mjs";
import { loadAuditData } from "./validate.mjs";
import { prepareReviewedAudit } from "./review.mjs";
import { writeRevision } from "./revision.mjs";
import { resolveRunOutput } from "./run.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
/** Apply selected part assessments into a new campaign; never fetch or change source snapshots. */
export async function reviewCampaignParts(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const verified = await validateCampaign(sourceDirectory);
  if (!verified.valid)
    throw new Error(`Invalid source campaign: ${verified.errors.join("; ")}`);
  const sourceRoot = await realpath(sourceDirectory);
  const sourceBytes = await readFile(path.join(sourceRoot, "campaign.json"));
  const source = JSON.parse(sourceBytes);
  const config = JSON.parse(
    await readFile(path.join(sourceRoot, "config.json"), "utf8"),
  );
  const { output } = await resolveRunOutput(config, outputDirectory);
  const relative = path.relative(sourceRoot, output);
  if (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    throw new Error("Part review output must be outside source campaign");
  if (
    !bundle ||
    Buffer.byteLength(JSON.stringify(bundle)) > 32 * 1024 * 1024 ||
    bundle.schemaVersion !== 1 ||
    bundle.campaignId !== source.campaignId ||
    bundle.sourceManifestHash !== hash(sourceBytes) ||
    !Array.isArray(bundle.parts) ||
    !bundle.parts.length
  )
    throw new Error("Invalid or stale campaign part review bundle");
  const selected = new Map();
  for (const entry of bundle.parts) {
    const part = source.parts.find(
      (candidate) => candidate.path === entry?.path,
    );
    if (
      !part ||
      selected.has(entry.path) ||
      !entry.bundle ||
      !Array.isArray(entry.bundle.reviews) ||
      entry.bundle.reviews.some(
        (review) => !part.ownedItemIds.includes(review?.itemId),
      ) ||
      (Array.isArray(entry.bundle.evidence) &&
        entry.bundle.evidence.some(
          (record) => !part.ownedItemIds.includes(record?.itemId),
        )) ||
      (entry.bundle.collectionRecoveries !== undefined &&
        (!Array.isArray(entry.bundle.collectionRecoveries) ||
          entry.bundle.collectionRecoveries.some(
            (record) => !part.ownedItemIds.includes(record?.itemId),
          )))
    )
      throw new Error("Unknown, duplicate or non-owned part review");
    selected.set(entry.path, entry);
  }
  const snapshots = new Map();
  // Validate every review before creating output. Only one raw partition is held at a time.
  for (const part of source.parts) {
    const sourcePart = path.join(sourceRoot, part.path);
    const audit = await loadAuditData(sourcePart);
    const snapshotHash = hash(JSON.stringify(audit));
    snapshots.set(part.path, snapshotHash);
    const entry = selected.get(part.path);
    if (entry) {
      if (entry.sourceSnapshotHash !== snapshotHash)
        throw new Error("Stale part review snapshot");
      await prepareReviewedAudit(
        sourcePart,
        entry.bundle,
        path.join(output, part.path),
      );
    }
  }
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const exceptional = new Set(source.pendingQueue.map((entry) => entry.itemId));
  const manifest = {
    ...source,
    campaignId: randomUUID(),
    parentCampaignId: source.campaignId,
    status: "collecting",
    parts: [],
    remainingItemIds: source.itemIds.filter((id) => !exceptional.has(id)),
    recovery: {
      mode: "snapshot-review",
      sourceCampaignId: source.campaignId,
      sourceConfigHash: source.configHash,
      sourceManifestHash: hash(sourceBytes),
      skippedUnregisteredParts: [],
    },
  };
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  await mkdir(path.join(output, "parts"), { mode: 0o700 });
  await writeFile(
    path.join(output, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  async function checkpoint() {
    manifest.updatedAt = new Date().toISOString();
    const temp = path.join(output, `.campaign-${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(manifest, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temp, path.join(output, "campaign.json"));
  }
  await checkpoint();
  for (const part of source.parts) {
    const sourcePart = path.join(sourceRoot, part.path);
    const audit = await loadAuditData(sourcePart);
    if (snapshots.get(part.path) !== hash(JSON.stringify(audit)))
      throw new Error("Source partition changed during review");
    const partConfig = JSON.parse(
      await readFile(path.join(sourcePart, "config.json"), "utf8"),
    );
    const entry = selected.get(part.path);
    const prepared = entry
      ? await prepareReviewedAudit(
          sourcePart,
          entry.bundle,
          path.join(output, part.path),
        )
      : {
          audit,
          config: partConfig,
          registry,
          output: path.join(output, part.path),
        };
    const result = await writeRevision(
      prepared.audit,
      prepared.config,
      prepared.registry,
      prepared.output,
    );
    manifest.parts.push({
      ...part,
      runId: result.runId,
      sourceRunId: part.runId,
    });
    const owned = new Set(part.ownedItemIds);
    manifest.remainingItemIds = manifest.remainingItemIds.filter(
      (id) => !owned.has(id),
    );
    await checkpoint();
  }
  if (
    hash(await readFile(path.join(sourceRoot, "campaign.json"))) !==
    hash(sourceBytes)
  )
    throw new Error("Source campaign changed during review");
  manifest.status = "partial";
  await checkpoint();
  const validation = await validateCampaign(output);
  if (!validation.valid)
    throw new Error(
      `Invalid reviewed campaign: ${validation.errors.join("; ")}`,
    );
  await writeFile(
    path.join(output, "campaign-coverage.json"),
    JSON.stringify(validation.coverage, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  const lines = [
    "# Reviewed content audit campaign",
    "",
    "Status: partial. Global portfolio review remains required.",
    "",
    `Declared items: ${validation.coverage.total}; audited items: ${validation.coverage.audited}.`,
    "",
    "Content snapshots retain their original capture dates. Requested PDF recovery verifies local source bytes; no live collection was performed.",
    "",
    ...validation.parts.map(
      (part) =>
        `- [${part.path}](${part.path}/report.md): ${part.owned} owned items, ${part.audited} audited.`,
    ),
    "",
    "Build a new campaign index before submitting global judgments. Prior global review bindings do not apply to this revision.",
    "",
  ];
  await writeFile(path.join(output, "campaign-report.md"), lines.join("\n"), {
    flag: "wx",
    mode: 0o600,
  });
  return {
    directory: output,
    campaignId: manifest.campaignId,
    parentCampaignId: source.campaignId,
    status: "partial",
    coverage: validation.coverage,
  };
}
