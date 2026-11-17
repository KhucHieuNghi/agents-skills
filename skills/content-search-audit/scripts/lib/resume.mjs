import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { startAudit, resolveRunOutput } from "./run.mjs";
import { loadAuditData, validateAuditData } from "./validate.mjs";
import { reconcileSnapshots } from "./state.mjs";
import { writeRevision } from "./revision.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const key = (check) => JSON.stringify([check.itemId, check.ruleId]);
/** Refreshes the whole explicit offline inventory, reusing only still-supported snapshot assessments. */
export async function resumeAudit(
  sourceDirectory,
  config,
  runDirectory,
  adapters = {},
) {
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const previous = await loadAuditData(sourceDirectory);
  const validation = validateAuditData(previous, registry);
  if (!validation.valid)
    throw new Error(
      `Invalid source checkpoint: ${validation.errors.join("; ")}`,
    );
  const oldConfig = JSON.parse(
    await readFile(path.join(sourceDirectory, "config.json"), "utf8"),
  );
  if (hash(JSON.stringify(oldConfig)) !== previous.run.configHash)
    throw new Error("Source configuration hash mismatch");
  // Enforce both old and current source boundaries before creating temporary output.
  const { output } = await resolveRunOutput(config, runDirectory);
  await resolveRunOutput(oldConfig, output);
  const relative = path.relative(await realpath(sourceDirectory), output);
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    throw new Error("Resume output must be outside source run");
  try {
    await lstat(output);
    throw new Error("Resume output already exists");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(output), { recursive: true });
  const staging = await mkdtemp(
    path.join(path.dirname(output), ".audit-refresh-"),
  );
  try {
    const collected = await startAudit(
      config,
      path.join(staging, "collected"),
      adapters,
    );
    const fresh = await loadAuditData(collected.directory);
    const reconciled = reconcileSnapshots(
      { ...previous.run, checks: previous.checks },
      fresh.run.inputHashes,
    );
    const sameConfig = previous.run.configHash === fresh.run.configHash;
    // Any configuration change invalidates reuse, including audience, locale and discovery metadata.
    const unchanged = new Set(
      Object.keys(fresh.run.inputHashes).filter(
        (id) =>
          sameConfig &&
          previous.run.inputHashes[id] === fresh.run.inputHashes[id],
      ),
    );
    const oldEvidence = new Map(
      previous.evidence.map((record) => [record.evidenceId, record]),
    );
    const reusable = new Map();
    function canReuse(id) {
      if (reusable.has(id)) return reusable.get(id);
      const record = oldEvidence.get(id);
      const valid =
        !!record &&
        unchanged.has(record.itemId) &&
        record.sourceEvidenceIds.every(canReuse);
      reusable.set(id, valid);
      return valid;
    }
    const freshEvidence = new Map(
      fresh.evidence.map((record) => [record.evidenceId, record]),
    );
    for (const record of previous.evidence)
      if (
        canReuse(record.evidenceId) &&
        !freshEvidence.has(record.evidenceId)
      ) {
        const value = previous.artifacts[record.artifact];
        if (
          Object.hasOwn(fresh.artifacts, record.artifact) &&
          fresh.artifacts[record.artifact] !== value
        )
          throw new Error(
            "Reused artifact path collides with refreshed evidence",
          );
        fresh.evidence.push(record);
        freshEvidence.set(record.evidenceId, record);
        fresh.artifacts[record.artifact] = value;
      }
    const retained = new Map(
      reconciled.state.checks
        .filter(
          (check) =>
            sameConfig &&
            check.dependencies.every((id) => unchanged.has(id)) &&
            check.evidenceIds.every(canReuse),
        )
        .map((check) => [key(check), check]),
    );
    fresh.checks = fresh.checks.map(
      (check) => retained.get(key(check)) ?? check,
    );
    const retainedFindings = previous.findings.filter(
      (finding) =>
        finding.evidenceIds.every(canReuse) &&
        finding.affectedItemIds.every((itemId) =>
          finding.ruleIds.every((ruleId) =>
            retained.has(key({ itemId, ruleId })),
          ),
        ),
    );
    fresh.findings = [
      ...new Map(
        [...fresh.findings, ...retainedFindings].map((finding) => [
          finding.findingId,
          finding,
        ]),
      ).values(),
    ];
    // If a finding spans an invalidated item, its remaining failed checks need reassessment too.
    fresh.checks = fresh.checks.map((check) =>
      check.status === "fail" &&
      !fresh.findings.some(
        (finding) =>
          finding.affectedItemIds.includes(check.itemId) &&
          finding.ruleIds.includes(check.ruleId),
      )
        ? {
            ...check,
            status: "unknown",
            reason:
              "Supporting finding invalidated during snapshot refresh; reassessment required",
          }
        : check,
    );
    const byItem = new Map();
    for (const check of fresh.checks) {
      if (!byItem.has(check.itemId)) byItem.set(check.itemId, []);
      byItem.get(check.itemId).push(check);
    }
    for (const item of fresh.inventory)
      if (
        item.state === "pending" &&
        byItem.get(item.itemId)?.every((check) => check.status !== "unknown")
      ) {
        item.state = "audited";
        item.reason =
          "All required assessments retained for identical snapshots and configuration";
      }
    fresh.run = {
      ...fresh.run,
      parentRunId: previous.run.runId,
      checks: fresh.checks,
      sourceMode: config.network
        ? "authorized-public-and-local-refresh"
        : "offline-refreshed-inventory",
      pendingQueue: sameConfig
        ? [
            ...previous.run.pendingQueue.filter(
              (entry) =>
                !(
                  ["deferred-collection", "storage-continuation"].includes(
                    entry?.kind,
                  ) && Object.hasOwn(fresh.run.inputHashes, entry.itemId)
                ),
            ),
            ...fresh.run.pendingQueue,
          ]
        : fresh.run.pendingQueue,
      reconciliation: {
        invalidatedItemIds: sameConfig
          ? reconciled.invalidatedItemIds
          : [
              ...new Set([
                ...previous.inventory.map((item) => item.itemId),
                ...fresh.inventory.map((item) => item.itemId),
              ]),
            ].sort(),
        addedItemIds: reconciled.addedItemIds,
        removedItemIds: reconciled.removedItemIds,
        reusedCheckCount: retained.size,
        configurationChanged: !sameConfig,
      },
    };
    fresh.run.pendingQueue = [
      ...new Map(
        fresh.run.pendingQueue.map((entry) => [
          entry && typeof entry === "object" && entry.kind && entry.itemId
            ? JSON.stringify([entry.kind, entry.itemId])
            : JSON.stringify(entry),
          entry,
        ]),
      ).values(),
    ];
    const verified = validateAuditData(fresh, registry);
    if (!verified.valid)
      throw new Error(`Invalid refreshed audit: ${verified.errors.join("; ")}`);
    if (verified.completionAllowed) fresh.run.status = "complete";
    return {
      ...(await writeRevision(fresh, config, registry, output)),
      reconciliation: fresh.run.reconciliation,
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
