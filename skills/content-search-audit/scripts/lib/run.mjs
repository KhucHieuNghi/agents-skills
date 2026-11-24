import { resolveReportLocale } from "./report-view.mjs";
import { runContract } from "./run-contract.mjs";
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { normalizeItems } from "./inventory.mjs";
import { createPublicCollector } from "./public-collect.mjs";
import { collectItem } from "./collect.mjs";
import { createCheckPlan, evaluateChecks } from "./checks.mjs";
import { saveCheckpoint } from "./state.mjs";
import { validateAudit } from "./validate.mjs";
import { renderReport } from "./report.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
function within(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
async function prospectivePath(target) {
  try {
    return await realpath(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return path.join(
      await prospectivePath(path.dirname(target)),
      path.basename(target),
    );
  }
}
export async function resolveRunOutput(config, runDirectory) {
  const output = await prospectivePath(path.resolve(runDirectory));
  const roots = await Promise.all(
    config.localRoots.map((root) => prospectivePath(root)),
  );
  if (roots.some((root) => within(root, output)))
    throw new Error("Audit output must be outside every content root");
  const packageRoot = await realpath(
    fileURLToPath(new URL("../../", import.meta.url)),
  );
  if (within(packageRoot, output))
    throw new Error("Audit output must be outside the installed skill package");
  return { output, roots };
}
export function prepareAuditConfig(config, adapters = {}) {
  if (!config || typeof config.inventoryComplete !== "boolean")
    throw new Error("Inventory completeness must be explicitly declared");
  if (
    !Array.isArray(config.localRoots) ||
    config.localRoots.some(
      (root) => typeof root !== "string" || !path.isAbsolute(root),
    )
  )
    throw new Error("Explicit absolute content roots required");
  if (config.mode !== undefined && !["full", "sample"].includes(config.mode))
    throw new Error("Invalid audit mode");
  if (
    config.brandName !== undefined &&
    (typeof config.brandName !== "string" || !config.brandName.trim())
  )
    throw new Error("Invalid customer brand name");
  resolveReportLocale(config.reportLocale);
  const publicCollector =
    config.network === undefined
      ? null
      : (adapters.publicCollector ??
        createPublicCollector(config.network, adapters.network));
  const maxRunBytes = config.maxRunBytes ?? 96 * 1024 * 1024;
  if (
    !Number.isSafeInteger(maxRunBytes) ||
    maxRunBytes < 1024 * 1024 ||
    maxRunBytes > 96 * 1024 * 1024
  )
    throw new Error("Run storage budget must be between 1 and 96 MiB");
  return { publicCollector, maxRunBytes };
}
/** Collects explicit inventory; public reads require an allowlist. */
export async function startAudit(config, runDirectory, adapters = {}) {
  if (config?.discovery !== undefined)
    throw new Error(
      "Use campaign for persisted discovery; standalone runs cannot discard its queue",
    );
  const { publicCollector, maxRunBytes } = prepareAuditConfig(config, adapters);
  let accountedBytes = 0;
  const items = normalizeItems(config.inputs, {
    trackingParameters: config.trackingParameters ?? [],
  });
  const { output, roots } = await resolveRunOutput(config, runDirectory);
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  for (const item of items)
    Object.assign(item, createCheckPlan(item, registry));
  const inventoryBytes = Buffer.byteLength(JSON.stringify(items));
  if (inventoryBytes > 32 * 1024 * 1024)
    throw new Error(
      "Inventory manifest requires partitioning before collection",
    );
  accountedBytes = inventoryBytes + items.length * 512 + 65536;
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 }); // EEXIST preserves any previous run.
  await mkdir(path.join(output, "evidence"), { mode: 0o700 });
  const evidence = [];
  const checks = [];
  const findings = [];
  const state = {
    schemaVersion: 1,
    version: "0.2.0",
    ...runContract(config),
    registryVersion: registry.version,
    runId: randomUUID(),
    configHash: hash(JSON.stringify(config)),
    inputHashes: {},
    status: "collecting",
    updatedAt: new Date().toISOString(),
    cursor: 0,
    checks,
    inventoryComplete: config.inventoryComplete,
    mode: config.mode ?? "full",
    pendingQueue: [],
    sourceMode: publicCollector
      ? "authorized-public-and-local-inventory"
      : "offline-explicit-inventory",
  };
  async function replace(name, content) {
    const temporary = path.join(output, `.${name}-${randomUUID()}.tmp`);
    await writeFile(temporary, content, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, path.join(output, name));
  }
  const jsonl = (values) =>
    values.map((value) => JSON.stringify(value)).join("\n") +
    (values.length ? "\n" : "");
  async function checkpoint() {
    await replace("inventory.jsonl", jsonl(items));
    await replace("evidence.jsonl", jsonl(evidence));
    await replace("checks.jsonl", jsonl(checks));
    await replace("findings.json", JSON.stringify(findings, null, 2) + "\n");
    state.updatedAt = new Date().toISOString();
    await saveCheckpoint(output, state);
  }
  await writeFile(
    path.join(output, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  await checkpoint();
  function reserveStorage(item, records, artifacts) {
    const planned = evaluateChecks(item, records, registry);
    const sizes = artifacts.map((value) => Buffer.byteLength(value));
    // Conservative accounting includes values duplicated in manifests and formatted run checks.
    const extra =
      sizes.reduce((total, size) => total + size, 0) +
      records.reduce(
        (total, record) =>
          total + Buffer.byteLength(JSON.stringify(record)) + 1,
        0,
      ) +
      planned.reduce(
        (total, check) =>
          total +
          3 * Buffer.byteLength(JSON.stringify(check)) +
          (check.status === "fail" ? 4096 : 0),
        0,
      );
    if (
      accountedBytes + extra > maxRunBytes ||
      sizes.some((size) => size > 16 * 1024 * 1024)
    )
      return false;
    accountedBytes += extra;
    return true;
  }
  function deferRemaining() {
    for (const pending of items.slice(state.cursor)) {
      pending.reason =
        "Run storage budget reached; separate collection partition and aggregation required";
      state.pendingQueue.push({
        kind: "storage-continuation",
        itemId: pending.itemId,
        reason: pending.reason,
      });
    }
  }
  for (const item of items) {
    const networkItem = !!(item.uri && publicCollector);
    const result = networkItem
      ? await publicCollector.collect(item)
      : await collectItem(item, {
          localRoots: roots,
          maxBytes: config.maxBytes,
        });
    let itemEvidence = [];
    if (networkItem) {
      if (
        !reserveStorage(item, result.evidence, Object.values(result.artifacts))
      ) {
        deferRemaining();
        break;
      }
      for (const [artifact, content] of Object.entries(result.artifacts))
        await writeFile(path.join(output, artifact), content, {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
      itemEvidence = result.evidence;
      state.inputHashes[item.itemId] = hash(
        JSON.stringify({
          status: result.status,
          reason: result.reason ?? null,
          evidence: itemEvidence.map((record) => [
            record.kind,
            record.snapshotHash,
          ]),
        }),
      );
    } else if (result.status === "collected") {
      const artifact = `evidence/${item.itemId}.txt`;
      const proposedEvidence = [
        {
          ...result.evidence,
          kind: "content",
          value: result.content,
          artifact,
          encoding: "utf8",
          sourceEvidenceIds: [],
        },
      ];
      if (!reserveStorage(item, proposedEvidence, [result.content])) {
        deferRemaining();
        break;
      }
      await writeFile(path.join(output, artifact), result.content, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      itemEvidence = proposedEvidence;
      state.inputHashes[item.itemId] = result.evidence.snapshotHash;
    } else {
      if (!reserveStorage(item, [], [])) {
        deferRemaining();
        break;
      }
      state.inputHashes[item.itemId] = hash(
        JSON.stringify({ status: result.status, reason: result.reason }),
      );
    }
    evidence.push(...itemEvidence);
    if (result.status === "collected") {
      item.contentHash = hash(result.content);
      item.reason =
        "Collected; semantic review and applicable evidence remain pending";
    } else {
      item.state = result.status;
      item.reason = result.reason;
    }
    if (result.reason?.startsWith("Collection deferred"))
      state.pendingQueue.push({
        kind: "deferred-collection",
        itemId: item.itemId,
        reason: result.reason,
      });
    const itemChecks = evaluateChecks(item, itemEvidence, registry);
    checks.push(...itemChecks);
    for (const check of itemChecks.filter((check) => check.status === "fail")) {
      findings.push({
        findingId: hash(
          JSON.stringify([item.itemId, check.ruleId, check.evidenceIds]),
        ),
        title: check.reason,
        affectedItemIds: [item.itemId],
        ruleIds: [check.ruleId],
        dimensions: [check.dimension],
        evidenceIds: check.evidenceIds,
        severity: "low",
        confidence: "high",
        classification: "observed",
        remediation:
          "Confirm intended access and page lifecycle before proposing changes; an anonymous HTTP error alone does not establish a search-ranking defect",
        verification:
          "Repeat an authorized read and compare expected behavior with captured status and content",
        ownerRole: "Content owner and website operator",
        effort: "Triage required",
      });
    }
    state.cursor++;
    if (networkItem || state.cursor % 500 === 0) await checkpoint();
  }
  state.status = "partial";
  await checkpoint();
  const validation = await validateAudit(output);
  if (!validation.valid)
    throw new Error(
      `Collected run failed validation: ${validation.errors.join("; ")}`,
    );
  const report = await renderReport(output, { brandName: config.brandName });
  return {
    directory: output,
    runId: state.runId,
    coverage: report.coverage,
    files: report.files,
    status: "partial",
    next: publicCollector
      ? "Review semantic checks and unresolved collection; explicit URLs were fetched without discovery"
      : "Review semantic checks and supply missing evidence; public URLs were not fetched",
  };
}
