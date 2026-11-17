import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateCampaign } from "./campaign.mjs";
import { normalizeItems } from "./inventory.mjs";
import { resolveRunOutput } from "./run.mjs";
import { loadAuditData } from "./validate.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** Export references for global review without flattening raw partition artifacts. */
export async function indexCampaign(sourceDirectory, outputDirectory) {
  const validation = await validateCampaign(sourceDirectory);
  if (!validation.valid)
    throw new Error(`Invalid source campaign: ${validation.errors.join("; ")}`);
  const sourceRoot = await realpath(sourceDirectory);
  const sourceBytes = await readFile(path.join(sourceRoot, "campaign.json"));
  const manifest = JSON.parse(sourceBytes);
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
    throw new Error("Index output must be outside source campaign");
  const inventory = normalizeItems(config.inputs, {
    trackingParameters: config.trackingParameters ?? [],
  });
  const owners = new Map(
    manifest.parts.flatMap((part) =>
      part.ownedItemIds.map((id) => [id, part.path]),
    ),
  );
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  const files = {};
  const partHashes = new Map();
  async function stream(name, produce) {
    const file = await open(path.join(output, name), "wx", 0o600);
    const digest = createHash("sha256");
    let records = 0,
      bytes = 0;
    try {
      await produce(async (value) => {
        const line = JSON.stringify(value) + "\n";
        await file.writeFile(line, "utf8");
        digest.update(line);
        bytes += Buffer.byteLength(line);
        records++;
      });
    } finally {
      await file.close();
    }
    files[name] = { sha256: digest.digest("hex"), records, bytes };
  }
  await stream("items.jsonl", async (emit) => {
    for (const item of inventory)
      await emit({
        ...item,
        ownerPart: owners.get(item.itemId) ?? null,
        state: "see-owner-part",
        collectionOwned: owners.has(item.itemId),
      });
  });
  await stream("evidence.jsonl", async (emit) => {
    for (const part of manifest.parts) {
      const audit = await loadAuditData(path.join(sourceRoot, part.path));
      partHashes.set(part.path, hash(JSON.stringify(audit)));
      // Include lineage records even if attached to a non-owned placeholder.
      // Scope accounting still comes exclusively from items.jsonl ownerPart.
      for (const record of audit.evidence) {
        const { value: _value, ...metadata } = record;
        void _value;
        await emit({
          ...metadata,
          reference: { part: part.path, evidenceId: record.evidenceId },
          artifactReference: `${part.path}/${record.artifact}`,
          sourceReferences: (record.sourceEvidenceIds ?? []).map(
            (evidenceId) => ({ part: part.path, evidenceId }),
          ),
        });
      }
    }
  });
  await stream("checks.jsonl", async (emit) => {
    for (const part of manifest.parts) {
      const audit = await loadAuditData(path.join(sourceRoot, part.path));
      if (partHashes.get(part.path) !== hash(JSON.stringify(audit)))
        throw new Error("Source partition changed during index export");
      for (const check of audit.checks)
        if (owners.get(check.itemId) === part.path)
          await emit({
            ...check,
            ownerPart: part.path,
            evidenceReferences: check.evidenceIds.map((evidenceId) => ({
              part: part.path,
              evidenceId,
            })),
          });
    }
  });
  const revalidated = await validateCampaign(sourceRoot);
  for (const part of manifest.parts)
    if (
      partHashes.get(part.path) !==
      hash(
        JSON.stringify(await loadAuditData(path.join(sourceRoot, part.path))),
      )
    )
      throw new Error("Source partition changed during index export");
  if (
    !revalidated.valid ||
    hash(await readFile(path.join(sourceRoot, "campaign.json"))) !==
      hash(sourceBytes)
  )
    throw new Error("Source campaign changed during index export");
  const index = {
    schemaVersion: 1,
    kind: "content-search-campaign-index",
    campaignId: manifest.campaignId,
    sourceManifestHash: hash(sourceBytes),
    configHash: manifest.configHash,
    registryVersion: manifest.registryVersion,
    sourceDirectory: sourceRoot,
    files,
    partSnapshotHashes: Object.fromEntries(partHashes),
    coverage: validation.coverage,
    globalReviewRequired: true,
    limitations: [
      "Reference index only; no semantic decisions or completion certification",
      "Evidence IDs are scoped by partition; resolve the pair, never the bare ID",
      "Stable source directory and terminal writer required; hashes do not authenticate remote captures",
      "Read referenced artifacts before judging content; this index deliberately omits evidence values",
    ],
  };
  await writeFile(
    path.join(output, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return { directory: output, ...index };
}
