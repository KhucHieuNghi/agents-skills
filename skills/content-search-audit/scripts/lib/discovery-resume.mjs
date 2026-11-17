import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { normalizeItems } from "./inventory.mjs";
import { safeArtifactPath } from "./validate.mjs";
import { validateNetworkPolicy } from "./network.mjs";
import { createPublicCollector } from "./public-collect.mjs";
import { resolveRunOutput } from "./run.mjs";
import { discoverLinks } from "./link-discovery.mjs";
import { discoverSitemaps } from "./sitemap-discovery.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
/** Load a stable, stopped discovery snapshot. Registered files only; no orphan-directory scanning. */
export async function loadDiscoverySnapshot(directory) {
  const root = await realpath(directory);
  let total = 0;
  async function read(name, limit = 64 * 1024 * 1024) {
    if (!safeArtifactPath(name))
      throw new Error("Unsafe discovery artifact path");
    let cursor = root;
    for (const segment of name.split("/")) {
      cursor = path.join(cursor, segment);
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink())
        throw new Error("Discovery symlink is not supported");
    }
    const stat = await lstat(cursor);
    if (
      !stat.isFile() ||
      stat.size > limit ||
      total + stat.size > 192 * 1024 * 1024
    )
      throw new Error("Invalid or oversized discovery artifact");
    const bytes = await readFile(cursor);
    if (bytes.length !== stat.size)
      throw new Error("Discovery artifact changed while reading");
    total += bytes.length;
    return bytes;
  }
  const manifestBytes = await read("discovery.json", 16 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    manifest.schemaVersion !== 1 ||
    !["link-discovery", "sitemap-discovery"].includes(manifest.kind) ||
    !object(manifest.files) ||
    !Array.isArray(manifest.captures) ||
    manifest.captures.length > 1000 ||
    typeof manifest.discoveryId !== "string"
  )
    throw new Error("Invalid discovery checkpoint");
  const configBytes = await read("config.json", 32 * 1024 * 1024),
    config = JSON.parse(configBytes.toString("utf8"));
  if (
    manifest.configHash !== hash(JSON.stringify(config)) ||
    manifest.sourceId !== config.sourceId
  )
    throw new Error(
      "Discovery config binding mismatch; checkpoint requires a bound configuration",
    );
  const files = new Map(),
    registered = Object.entries(manifest.files);
  if (registered.length > 50000) throw new Error("Too many discovery files");
  for (const [name, entry] of registered) {
    if (
      !object(entry) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "") ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0
    )
      throw new Error("Invalid discovery file receipt");
    const bytes = name === "config.json" ? configBytes : await read(name);
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256)
      throw new Error(`Discovery artifact hash mismatch: ${name}`);
    files.set(name, bytes.toString("utf8"));
  }
  const policy = validateNetworkPolicy(config.network),
    captures = new Map();
  for (const [index, capture] of manifest.captures.entries()) {
    const prefix = `captures/${String(index + 1).padStart(6, "0")}`;
    if (
      !object(capture) ||
      capture.path !== prefix ||
      typeof capture.uri !== "string" ||
      captures.has(capture.uri) ||
      !policy.allowedOrigins.has(new URL(capture.uri).origin)
    )
      throw new Error("Invalid discovery capture identity/path");
    const item = normalizeItems([
      { uri: capture.uri, source: config.sourceId },
    ])[0];
    const raw = files.get(`${prefix}/capture.json`);
    if (raw === undefined)
      throw new Error("Missing registered discovery capture");
    const result = JSON.parse(raw);
    if (
      result.itemId !== item.itemId ||
      result.status !== capture.status ||
      !Array.isArray(result.evidence)
    )
      throw new Error("Discovery capture binding mismatch");
    const artifacts = {},
      ids = new Set();
    for (const evidence of result.evidence) {
      if (
        !object(evidence) ||
        evidence.itemId !== item.itemId ||
        ids.has(evidence.evidenceId) ||
        !safeArtifactPath(evidence.artifact) ||
        !["json", "utf8"].includes(evidence.encoding)
      )
        throw new Error("Invalid discovery evidence");
      const value = files.get(`${prefix}/${evidence.artifact}`),
        expected =
          evidence.encoding === "json"
            ? JSON.stringify(evidence.value)
            : evidence.value;
      if (
        value === undefined ||
        value !== expected ||
        hash(value) !== evidence.snapshotHash
      )
        throw new Error("Discovery evidence value/hash mismatch");
      if (
        evidence.evidenceId !==
        hash(
          JSON.stringify([
            item.itemId,
            evidence.kind,
            evidence.locator,
            evidence.snapshotHash,
          ]),
        )
      )
        throw new Error("Discovery evidence ID mismatch");
      ids.add(evidence.evidenceId);
      artifacts[evidence.artifact] = value;
    }
    for (const evidence of result.evidence)
      if (
        !Array.isArray(evidence.sourceEvidenceIds) ||
        evidence.sourceEvidenceIds.some((id) => !ids.has(id))
      )
        throw new Error("Discovery evidence lineage mismatch");
    if (result.status === "collected") {
      const content = result.evidence.filter(
        (record) => record.kind === "content",
      );
      if (
        content.length !== 1 ||
        result.content !== content[0].value ||
        !policy.allowedOrigins.has(new URL(content[0].locator).origin) ||
        typeof result.contentType !== "string"
      )
        throw new Error("Discovery content binding mismatch");
    }
    captures.set(capture.uri, { ...result, artifacts });
  }
  // Detect a concurrent checkpoint publication while loading; caller must still ensure the source process stopped.
  if (
    hash(await readFile(path.join(root, "discovery.json"))) !==
    hash(manifestBytes)
  )
    throw new Error("Discovery checkpoint changed while loading");
  return {
    root,
    manifest,
    manifestHash: hash(manifestBytes),
    config,
    captures,
  };
}

/** Rebuild traversal from immutable successful captures and collect unresolved/new URLs in a new directory. */
export async function resumeDiscovery(
  sourceDirectory,
  outputDirectory,
  budgets = {},
  adapters = {},
) {
  const snapshot = await loadDiscoverySnapshot(sourceDirectory);
  const allowed =
    snapshot.manifest.kind === "link-discovery"
      ? ["maxPages", "maxDepth", "maxStoredBytes", "maxGraphBytes"]
      : ["maxSitemaps", "maxDepth", "maxStoredBytes", "maxInventoryBytes"];
  if (
    !object(budgets) ||
    Object.keys(budgets).some((key) => !allowed.includes(key))
  )
    throw new Error("Discovery resume accepts only budget overrides");
  const config = { ...snapshot.config, ...budgets };
  const { output } = await resolveRunOutput(config, outputDirectory);
  const relative = path.relative(snapshot.root, output);
  if (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    throw new Error("Resume output must be outside source discovery");
  const network = createPublicCollector(config.network, adapters.network ?? {});
  for (const result of snapshot.captures.values())
    network.restoreCooldowns(result.evidence);
  const reused = [];
  const collector = {
    async collect(item) {
      const saved = snapshot.captures.get(item.uri);
      if (saved?.status === "collected") {
        reused.push(item.uri);
        return globalThis.structuredClone(saved);
      }
      return network.collect(item);
    },
  };
  const recovery = {
    mode: "snapshot-replay",
    parentDiscoveryId: snapshot.manifest.discoveryId,
    sourceManifestHash: snapshot.manifestHash,
    reusedUrls: reused,
  };
  const discover =
    snapshot.manifest.kind === "link-discovery"
      ? discoverLinks
      : discoverSitemaps;
  return discover(config, output, { ...adapters, collector, recovery });
}
