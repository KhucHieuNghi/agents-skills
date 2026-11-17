import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  writeFile,
  realpath,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { normalizeItems } from "./inventory.mjs";
import { startAudit, resolveRunOutput, prepareAuditConfig } from "./run.mjs";
import { validateState } from "./state.mjs";
import { loadAuditData, validateAuditData } from "./validate.mjs";
import { writeRevision } from "./revision.mjs";
import { computeCoverage } from "./coverage.mjs";
import { campaignDiscovery, withoutDiscovery } from "./discovery.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sameSet = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
    return false;
  const left = new Set(a),
    right = new Set(b);
  return (
    left.size === a.length &&
    right.size === b.length &&
    a.every((value) => right.has(value))
  );
};
function stable(value) {
  return Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
      : value;
}
const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
async function readJSON(root, name) {
  const file = path.join(root, name),
    stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 32 * 1024 * 1024)
    throw new Error("Unsafe or oversized campaign manifest");
  return JSON.parse(await readFile(file, "utf8"));
}
async function directory(directory) {
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Unsafe campaign directory");
}
/** Validates one partition at a time; raw evidence is never merged into a giant run. */
export async function validateCampaign(root) {
  const errors = [];
  try {
    await directory(root);
    await directory(path.join(root, "parts"));
    const config = await readJSON(root, "config.json"),
      manifest = await readJSON(root, "campaign.json");
    prepareAuditConfig(config);
    const discovery = campaignDiscovery(config);
    if (!equal(manifest.discovery ?? null, discovery))
      throw new Error(
        "Campaign discovery receipt differs from source snapshots",
      );
    if (
      config.partitionSize !== undefined &&
      (!Number.isInteger(config.partitionSize) ||
        config.partitionSize < 1 ||
        config.partitionSize > 500)
    )
      throw new Error("Invalid campaign partition size");
    const registry = JSON.parse(
      await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
    );
    const inventory = normalizeItems(config.inputs, {
      trackingParameters: config.trackingParameters ?? [],
    });
    const expectedIds = inventory.map((item) => item.itemId),
      expected = new Map(inventory.map((item) => [item.itemId, item]));
    if (
      manifest.schemaVersion !== 1 ||
      manifest.kind !== "content-search-campaign" ||
      typeof manifest.campaignId !== "string" ||
      !manifest.campaignId ||
      manifest.configHash !== hash(JSON.stringify(config)) ||
      manifest.registryVersion !== registry.version ||
      !["collecting", "partial"].includes(manifest.status) ||
      !sameSet(manifest.itemIds, expectedIds) ||
      !Array.isArray(manifest.parts) ||
      !Array.isArray(manifest.pendingQueue) ||
      !Array.isArray(manifest.remainingItemIds)
    )
      throw new Error("Invalid campaign identity, configuration or inventory");
    if (manifest.parentCampaignId !== undefined) {
      const recovery = manifest.recovery;
      if (
        typeof manifest.parentCampaignId !== "string" ||
        !manifest.parentCampaignId ||
        !recovery ||
        !["snapshot-continuation", "snapshot-review"].includes(recovery.mode) ||
        (recovery.mode === "snapshot-review" &&
          !/^[a-f0-9]{64}$/.test(recovery.sourceManifestHash ?? "")) ||
        recovery.sourceCampaignId !== manifest.parentCampaignId ||
        recovery.sourceConfigHash !== manifest.configHash ||
        !Array.isArray(recovery.skippedUnregisteredParts) ||
        new Set(recovery.skippedUnregisteredParts).size !==
          recovery.skippedUnregisteredParts.length ||
        recovery.skippedUnregisteredParts.some(
          (value) => typeof value !== "string" || !/^parts\/\d{6}$/.test(value),
        )
      )
        throw new Error("Invalid campaign recovery metadata");
    }
    const owners = new Set(),
      partPaths = new Set(),
      pendingQueue = [
        ...manifest.pendingQueue,
        ...(discovery?.pendingQueue ?? []),
      ];
    const states = {
        pending: 0,
        audited: 0,
        failed: 0,
        blocked: 0,
        unsupported: 0,
        excluded: 0,
      },
      dimensions = {};
    let audited = 0,
      collected = 0,
      missingChecks = 0,
      unresolved = 0,
      findings = 0;
    const partSummaries = [];
    for (const part of manifest.parts) {
      if (
        !part ||
        !/^parts\/\d{6}$/.test(part.path) ||
        partPaths.has(part.path) ||
        !Array.isArray(part.ownedItemIds)
      )
        throw new Error("Invalid campaign part path or ownership");
      partPaths.add(part.path);
      const partRoot = path.join(root, part.path);
      await directory(partRoot);
      const audit = await loadAuditData(partRoot),
        partConfig = await readJSON(partRoot, "config.json");
      const verified = validateAuditData(audit, registry);
      if (!verified.valid)
        throw new Error(
          `Invalid partition ${part.path}: ${verified.errors.join("; ")}`,
        );
      if (
        part.runId !== audit.run.runId ||
        part.configHash !== audit.run.configHash ||
        hash(JSON.stringify(partConfig)) !== part.configHash ||
        !equal(
          { ...partConfig, inputs: [] },
          { ...withoutDiscovery(config), inputs: [], inventoryComplete: false },
        )
      )
        throw new Error("Partition configuration or identity differs");
      const normalized = normalizeItems(partConfig.inputs, {
        trackingParameters: config.trackingParameters ?? [],
      });
      if (
        !sameSet(
          audit.inventory.map((item) => item.itemId),
          normalized.map((item) => item.itemId),
        )
      )
        throw new Error(
          "Partition inventory differs from its source configuration",
        );
      for (const item of normalized)
        if (
          !expected.has(item.itemId) ||
          !equal(item, expected.get(item.itemId))
        )
          throw new Error("Partition changed declared item metadata");
      for (const item of audit.inventory) {
        const declared = expected.get(item.itemId);
        for (const key of Object.keys(declared).filter(
          (key) => key !== "state",
        ))
          if (!equal(item[key], declared[key]))
            throw new Error(
              "Partition inventory metadata differs from declared source",
            );
      }
      validateState(audit.run);
      if (!equal(audit.run.checks, audit.checks))
        throw new Error("Partition checkpoint checks differ");
      const processed = Object.keys(audit.run.inputHashes);
      if (
        !sameSet(
          processed,
          audit.inventory.slice(0, audit.run.cursor).map((item) => item.itemId),
        )
      )
        throw new Error(
          "Partition ownership differs from processed inventory prefix",
        );
      for (const item of audit.inventory.filter((item) =>
        processed.includes(item.itemId),
      )) {
        if (
          ["pending", "audited"].includes(item.state) &&
          !audit.evidence.some(
            (record) =>
              record.itemId === item.itemId &&
              record.kind === "content" &&
              record.snapshotHash === item.contentHash,
          )
        )
          throw new Error("Owned collected item lacks its content snapshot");
      }
      if (
        !sameSet(part.ownedItemIds, processed) ||
        processed.some((id) => owners.has(id) || !expected.has(id)) ||
        audit.run.cursor !== processed.length
      )
        throw new Error("Invalid or duplicate partition ownership");
      for (const id of processed) owners.add(id);
      const owned = new Set(processed),
        items = audit.inventory.filter((item) => owned.has(item.itemId)),
        checks = audit.checks.filter((check) => owned.has(check.itemId));
      const queue = audit.run.pendingQueue.filter(
        (entry) =>
          entry &&
          owned.has(entry.itemId) &&
          entry.kind !== "storage-continuation",
      );
      pendingQueue.push(...queue);
      const coverage = computeCoverage(items, checks, {
        ...audit.run,
        inventoryComplete: config.inventoryComplete,
        mode: config.mode ?? "full",
        pendingQueue: queue,
      });
      audited += coverage.audited;
      unresolved += coverage.remainingItemIds.length;
      missingChecks += coverage.missingChecks.length;
      collected += items.filter((item) => item.contentHash).length;
      findings += audit.findings.filter((finding) =>
        finding.affectedItemIds.some((id) => owned.has(id)),
      ).length;
      for (const [state, count] of Object.entries(coverage.states))
        states[state] += count;
      for (const [dimension, values] of Object.entries(coverage.dimensions)) {
        dimensions[dimension] ??= {
          total: 0,
          completed: 0,
          unknown: 0,
          notApplicable: 0,
        };
        for (const [key, value] of Object.entries(values))
          dimensions[dimension][key] += value;
      }
      partSummaries.push({
        path: part.path,
        runId: part.runId,
        owned: processed.length,
        audited: coverage.audited,
        findings: audit.findings.length,
      });
    }
    const unowned = expectedIds.filter((id) => !owners.has(id));
    if (
      !sameSet(manifest.remainingItemIds, [
        ...new Set(manifest.remainingItemIds),
      ]) ||
      manifest.remainingItemIds.some((id) => !unowned.includes(id))
    )
      throw new Error("Invalid remaining campaign inventory");
    const unresolvedIds = new Set(manifest.remainingItemIds);
    for (const entry of manifest.pendingQueue) {
      if (
        !entry ||
        entry.kind !== "unpartitionable-item" ||
        !unowned.includes(entry.itemId) ||
        unresolvedIds.has(entry.itemId) ||
        typeof entry.reason !== "string" ||
        !entry.reason
      )
        throw new Error("Invalid unowned item queue");
      unresolvedIds.add(entry.itemId);
    }
    if (!sameSet([...unresolvedIds], unowned))
      throw new Error("Campaign omitted unowned inventory");
    pendingQueue.push(
      ...manifest.remainingItemIds.map((itemId) => ({
        kind: "uncollected",
        itemId,
      })),
    );
    states.pending += unowned.length;
    unresolved += unowned.length;
    missingChecks += unowned.length * registry.rules.length;
    const coverage = {
      total: inventory.length,
      owned: owners.size,
      collected,
      audited,
      states,
      dimensions,
      missingChecks,
      unresolvedItems: unresolved,
      pendingQueue,
      inventoryComplete: config.inventoryComplete,
      mode: config.mode ?? "full",
      collectionAccounted: inventory.length > 0 && unowned.length === 0,
      globalReviewRequired: true,
      complete: false,
    };
    return {
      valid: true,
      errors: [],
      campaignId: manifest.campaignId,
      coverage,
      parts: partSummaries,
      findings,
    };
  } catch (error) {
    errors.push(error.message);
    return { valid: false, errors, coverage: null, parts: [] };
  }
}
/** Automatically continues a complete declared inventory across storage-bounded parts. */
async function executeCampaign(
  config,
  runDirectory,
  adapters = {},
  recovery = null,
) {
  const discovery = campaignDiscovery(config);
  if (
    !config ||
    typeof config.inventoryComplete !== "boolean" ||
    !Array.isArray(config.localRoots)
  )
    throw new Error("Explicit campaign scope and roots required");
  const batchSize = config.partitionSize ?? 500;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500)
    throw new Error(
      "Partition size must be between 1 and 500; it is not an inventory cap",
    );
  const inventory = normalizeItems(config.inputs, {
    trackingParameters: config.trackingParameters ?? [],
  });
  const groups = new Map(inventory.map((item) => [item.itemId, []]));
  for (const input of config.inputs)
    groups
      .get(
        normalizeItems([input], {
          trackingParameters: config.trackingParameters ?? [],
        })[0].itemId,
      )
      .push(input);
  const { output } = await resolveRunOutput(config, runDirectory);
  const { publicCollector: collector } = prepareAuditConfig(config, adapters);
  if (Buffer.byteLength(JSON.stringify(config, null, 2)) > 32 * 1024 * 1024)
    throw new Error(
      "Campaign configuration requires a streaming inventory adapter",
    );
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const manifest = {
    schemaVersion: 1,
    kind: "content-search-campaign",
    campaignId: randomUUID(),
    configHash: hash(JSON.stringify(config)),
    registryVersion: registry.version,
    status: "collecting",
    itemIds: inventory.map((item) => item.itemId),
    remainingItemIds: inventory.map((item) => item.itemId),
    parts: [],
    pendingQueue: [],
    ...(discovery ? { discovery } : {}),
  };
  if (recovery) {
    manifest.parentCampaignId = recovery.manifest.campaignId;
    manifest.recovery = {
      mode: "snapshot-continuation",
      sourceCampaignId: recovery.manifest.campaignId,
      sourceConfigHash: recovery.manifest.configHash,
      skippedUnregisteredParts: recovery.skippedUnregisteredParts,
    };
    manifest.pendingQueue = globalThis.structuredClone(
      recovery.manifest.pendingQueue,
    );
    const exceptional = new Set(
      manifest.pendingQueue.map((entry) => entry.itemId),
    );
    manifest.remainingItemIds = manifest.remainingItemIds.filter(
      (id) => !exceptional.has(id),
    );
  }
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
  if (recovery) {
    for (const sourcePart of recovery.manifest.parts) {
      const sourceRoot = path.join(recovery.sourceDirectory, sourcePart.path);
      const audit = await loadAuditData(sourceRoot),
        partConfig = await readJSON(sourceRoot, "config.json");
      collector?.restoreCooldowns(audit.evidence);
      const relative = `parts/${String(manifest.parts.length + 1).padStart(6, "0")}`;
      await writeRevision(
        audit,
        partConfig,
        registry,
        path.join(output, relative),
      );
      manifest.parts.push({
        ...sourcePart,
        path: relative,
        sourcePartPath: sourcePart.path,
      });
      const owned = new Set(sourcePart.ownedItemIds);
      manifest.remainingItemIds = manifest.remainingItemIds.filter(
        (id) => !owned.has(id),
      );
      await checkpoint();
    }
  }
  let window = batchSize;
  while (manifest.remainingItemIds.length) {
    const selected = manifest.remainingItemIds.slice(0, window);
    const relative = `parts/${String(manifest.parts.length + 1).padStart(6, "0")}`;
    const partConfig = {
      ...withoutDiscovery(config),
      inputs: selected.flatMap((id) => groups.get(id)),
      inventoryComplete: false,
    };
    let result;
    try {
      result = await startAudit(partConfig, path.join(output, relative), {
        ...adapters,
        publicCollector: collector,
      });
    } catch (error) {
      if (
        error.message !==
        "Inventory manifest requires partitioning before collection"
      )
        throw error;
      if (selected.length > 1)
        window = Math.max(1, Math.floor(selected.length / 2));
      else {
        manifest.pendingQueue.push({
          kind: "unpartitionable-item",
          itemId: selected[0],
          reason: "Item metadata exceeds the single-run manifest limit",
        });
        manifest.remainingItemIds.shift();
      }
      await checkpoint();
      continue;
    }
    const state = await readJSON(path.join(output, relative), "run.json");
    const owned = Object.keys(state.inputHashes);
    manifest.parts.push({
      path: relative,
      runId: result.runId,
      configHash: state.configHash,
      ownedItemIds: owned,
    });
    if (owned.length) {
      const set = new Set(owned);
      manifest.remainingItemIds = manifest.remainingItemIds.filter(
        (id) => !set.has(id),
      );
    } else if (selected.length > 1)
      window = Math.max(1, Math.floor(selected.length / 2));
    else {
      manifest.pendingQueue.push({
        kind: "unpartitionable-item",
        itemId: selected[0],
        reason:
          "Item cannot fit in a single run under current artifact/storage limits; extraction or a larger authorized budget is required",
      });
      manifest.remainingItemIds.shift();
    }
    await checkpoint();
  }
  manifest.status = "partial";
  await checkpoint();
  const validation = await validateCampaign(output);
  if (!validation.valid)
    throw new Error(
      `Campaign validation failed: ${validation.errors.join("; ")}`,
    );
  const lines = [
    "# Content Search Audit campaign",
    "",
    "Status: partial. Collection accounting is distinct from completed content review.",
    "",
    `Declared items: ${validation.coverage.total}; owned once: ${validation.coverage.owned}; collected snapshots: ${validation.coverage.collected}; audited items: ${validation.coverage.audited}.`,
    "",
    "Global portfolio review remains required. No combined SEO/GEO score is calculated.",
    "",
    "## Partition reports",
    "",
  ];
  if (recovery)
    lines.push(
      "Recovery retains registered snapshots with their original capture times; remaining items are newly collected. This is not a fresh recrawl of retained items.",
      "",
      `Unregistered source partition entries left untouched: ${recovery.skippedUnregisteredParts.length}.`,
      "",
    );
  for (const part of validation.parts)
    lines.push(
      `- [${part.path}](${part.path}/report.md): ${part.owned} owned items, ${part.findings} findings.`,
    );
  lines.push(
    "",
    "Only owned items count in this aggregate. Pending placeholder rows in earlier partition reports are not counted twice.",
    "",
    "See campaign-coverage.json for pending items, dimensions and scope limitations.",
    "",
  );
  await writeFile(path.join(output, "campaign-report.md"), lines.join("\n"), {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(
    path.join(output, "campaign-coverage.json"),
    JSON.stringify(validation.coverage, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return {
    directory: output,
    campaignId: manifest.campaignId,
    status: "partial",
    coverage: validation.coverage,
    parts: validation.parts,
  };
}

/** New collection campaign; output must not already exist. */
export async function startCampaign(config, runDirectory, adapters = {}) {
  return executeCampaign(config, runDirectory, adapters);
}
/** Continues a validated snapshot in a new campaign without changing the source. */
export async function resumeCampaign(
  sourceDirectory,
  runDirectory,
  adapters = {},
) {
  const verified = await validateCampaign(sourceDirectory);
  if (!verified.valid)
    throw new Error(`Invalid source campaign: ${verified.errors.join("; ")}`);
  const sourceRoot = await realpath(sourceDirectory);
  const config = await readJSON(sourceRoot, "config.json"),
    manifest = await readJSON(sourceRoot, "campaign.json");
  const { output } = await resolveRunOutput(config, runDirectory);
  const relative = path.relative(sourceRoot, output);
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    throw new Error("Recovery output must be outside source campaign");
  const registered = new Set(manifest.parts.map((part) => part.path));
  const entries = await readdir(path.join(sourceRoot, "parts"));
  const skippedUnregisteredParts = entries
    .filter((name) => /^\d{6}$/.test(name) && !registered.has(`parts/${name}`))
    .map((name) => `parts/${name}`)
    .sort();
  return executeCampaign(config, output, adapters, {
    sourceDirectory: sourceRoot,
    manifest,
    skippedUnregisteredParts,
  });
}
