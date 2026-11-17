import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { normalizeItems } from "./inventory.mjs";
import { createPublicCollector } from "./public-collect.mjs";
import { validateNetworkPolicy } from "./network.mjs";
import { parseSitemap } from "./sitemap.mjs";
import { resolveRunOutput } from "./run.mjs";
import { safeArtifactPath } from "./validate.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (uri) =>
  normalizeItems([{ uri, source: "sitemap-seed" }])[0].uri;

/** Bounded automatic sitemap-index traversal using the same anonymous public collector. */
export async function discoverSitemaps(config, outputDirectory, adapters = {}) {
  if (
    !config ||
    typeof config.sourceId !== "string" ||
    !config.sourceId.trim() ||
    !Array.isArray(config.seeds) ||
    !config.seeds.length ||
    config.seeds.length > 10000 ||
    Buffer.byteLength(JSON.stringify(config)) > 32 * 1024 * 1024 ||
    !Array.isArray(config.localRoots)
  )
    throw new Error(
      "Sitemap source ID, explicit seeds and local output-boundary roots required",
    );
  const maxSitemaps = config.maxSitemaps ?? 100,
    maxDepth = config.maxDepth ?? 16;
  const maxStoredBytes = config.maxStoredBytes ?? 64 * 1024 * 1024;
  const maxInventoryBytes = config.maxInventoryBytes ?? 8 * 1024 * 1024;
  for (const [value, min, max] of [
    [maxSitemaps, 1, 1000],
    [maxDepth, 0, 64],
    [maxStoredBytes, 1024, 128 * 1024 * 1024],
    [maxInventoryBytes, 128, 8 * 1024 * 1024],
  ])
    if (!Number.isSafeInteger(value) || value < min || value > max)
      throw new Error("Invalid sitemap discovery budget");
  const policy = validateNetworkPolicy(config.network);
  const seeds = [...new Set(config.seeds.map(canonical))];
  if (seeds.some((uri) => !policy.allowedOrigins.has(new URL(uri).origin)))
    throw new Error("Sitemap seeds must be explicitly allowed origins");
  const collector =
    adapters.collector ??
    createPublicCollector(config.network, adapters.network ?? {});
  const { output } = await resolveRunOutput(config, outputDirectory);
  const frontier = seeds.map((uri) => ({ uri, depth: 0, ancestors: [] })),
    scheduled = new Set(seeds);
  const records = [],
    pendingQueue = [],
    captures = [],
    files = {},
    edges = new Map();
  let storedBytes = 0,
    inventoryBytes = 2;
  const state = {
    schemaVersion: 1,
    configHash: hash(JSON.stringify(config)),
    recovery: adapters.recovery ?? null,
    kind: "sitemap-discovery",
    discoveryId: randomUUID(),
    status: "collecting",
    sourceId: config.sourceId,
    frontier,
    captures,
    pendingQueue,
    files,
  };
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  async function checkpoint() {
    const temp = path.join(output, `.discovery-${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(state, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temp, path.join(output, "discovery.json"));
  }
  const pending = (kind, locator, reason) =>
    pendingQueue.push({ kind, locator, reason });
  await writeFile(
    path.join(output, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  await checkpoint();
  while (frontier.length && captures.length < maxSitemaps) {
    const current = frontier[0];
    const item = normalizeItems([
      { uri: current.uri, source: config.sourceId },
    ])[0];
    const result = await collector.collect(item);
    const prefix = `captures/${String(captures.length + 1).padStart(6, "0")}`;
    const raw = { ...result };
    delete raw.artifacts;
    const payloads = {
      ...result.artifacts,
      "capture.json": JSON.stringify(raw, null, 2) + "\n",
    };
    const bytes = Object.values(payloads).reduce(
      (sum, value) => sum + Buffer.byteLength(value),
      0,
    );
    if (storedBytes + bytes > maxStoredBytes) {
      pending(
        "capture-storage-budget",
        current.uri,
        "Fetched capture exceeds remaining persistence budget; current and remaining sitemaps stay unprocessed",
      );
      break;
    }
    for (const [name, value] of Object.entries(payloads)) {
      if (!safeArtifactPath(name))
        throw new Error("Unsafe discovery artifact path");
      const relative = `${prefix}/${name}`;
      await mkdir(path.dirname(path.join(output, relative)), {
        recursive: true,
        mode: 0o700,
      });
      await writeFile(path.join(output, relative), value, {
        flag: "wx",
        mode: 0o600,
      });
      files[relative] = {
        sha256: hash(value),
        bytes: Buffer.byteLength(value),
      };
    }
    storedBytes += bytes;
    frontier.shift();
    const capture = {
      uri: current.uri,
      path: prefix,
      status: result.status,
      parsed: false,
    };
    captures.push(capture);
    if (result.status !== "collected")
      pending(
        "sitemap-collection",
        current.uri,
        result.reason ?? "Sitemap unavailable",
      );
    else {
      try {
        const parsed = parseSitemap(result.content);
        capture.parsed = true;
        capture.kind = parsed.kind;
        if (parsed.kind === "sitemapindex")
          edges.set(current.uri, parsed.locations.map(canonical));
        const content = result.evidence.find(
          (record) => record.kind === "content",
        );
        for (const location of parsed.locations) {
          const uri = canonical(location);
          if (parsed.kind === "urlset") {
            const record = {
              uri,
              sitemap: current.uri,
              capturePath: prefix,
              snapshotHash: content.snapshotHash,
            };
            const extra = Buffer.byteLength(JSON.stringify(record)) + 1;
            if (inventoryBytes + extra > maxInventoryBytes) {
              pending(
                "sitemap-inventory-budget",
                current.uri,
                "Page-location inventory budget reached; this sitemap needs a separately scoped export",
              );
              break;
            }
            records.push(record);
            inventoryBytes += extra;
          } else if ([...current.ancestors, current.uri].includes(uri)) {
            pending(
              "sitemap-cycle",
              uri,
              "Sitemap index references an ancestor; exhaustive traversal is unresolved",
            );
          } else if (!policy.allowedOrigins.has(new URL(uri).origin)) {
            pending(
              "sitemap-origin",
              uri,
              "Child sitemap origin is outside the explicit network allowlist",
            );
          } else if (current.depth >= maxDepth) {
            pending(
              "sitemap-depth",
              uri,
              "Child sitemap exceeds discovery depth budget",
            );
          } else if (!scheduled.has(uri)) {
            if (scheduled.size >= 10000) {
              pending(
                "sitemap-frontier-budget",
                current.uri,
                "Index child frontier exceeds 10,000 unique sitemap locations; split source scope",
              );
              break;
            }
            scheduled.add(uri);
            frontier.push({
              uri,
              depth: current.depth + 1,
              ancestors: [...current.ancestors, current.uri],
            });
          }
        }
      } catch (error) {
        pending("sitemap-parse", current.uri, error.message);
      }
    }
    await checkpoint();
  }
  for (const entry of frontier)
    pending(
      "unvisited-sitemap",
      entry.uri,
      "Discovery ended before this sitemap was processed",
    );
  const visiting = new Set(),
    visited = new Set();
  function visit(uri, depth = 0) {
    if (visiting.has(uri) || depth > 128) {
      pending(
        "sitemap-graph-cycle-or-depth",
        uri,
        "Parsed index graph contains a cycle or exceeds validation depth",
      );
      return;
    }
    if (visited.has(uri) || !edges.has(uri)) return;
    visiting.add(uri);
    for (const child of edges.get(uri)) visit(child, depth + 1);
    visiting.delete(uri);
    visited.add(uri);
  }
  for (const uri of edges.keys()) visit(uri);
  const source = {
    id: config.sourceId,
    kind: "records",
    locator: `sitemap-discovery:${state.discoveryId}`,
    collectedAt: new Date().toISOString(),
    complete: pendingQueue.length === 0,
    records,
    pendingQueue,
    exclusions: [],
    scope: {
      seeds,
      allowedOrigins: [...policy.allowedOrigins].sort(),
      maxSitemaps,
      maxDepth,
      maxStoredBytes,
      maxInventoryBytes,
      visitedSitemaps: captures.length,
      captureDirectory: output,
      captures,
    },
    limitations: [
      "Sitemap traversal covers declared seeds only; it is not full internal-link or rendered-site discovery",
      "Listed pages were not fetched, indexed or semantically audited; page URLs do not expand network authorization",
      "Source records retain sitemap/capture provenance; immutable raw captures remain in the discovery directory",
      "Shared robots, DNS, redirect, retry and cooldown rules apply; no credentials or page scripts are used",
      "Budgets are finite; partial results are not representative samples; no strict wall-clock deadline is claimed",
    ],
  };
  const sourceBytes = JSON.stringify(source, null, 2) + "\n";
  await writeFile(path.join(output, "source.json"), sourceBytes, {
    flag: "wx",
    mode: 0o600,
  });
  files["source.json"] = {
    sha256: hash(sourceBytes),
    bytes: Buffer.byteLength(sourceBytes),
  };
  state.status = source.complete ? "complete-for-seeds" : "partial";
  await checkpoint();
  return {
    directory: output,
    discoveryId: state.discoveryId,
    status: state.status,
    source,
  };
}
