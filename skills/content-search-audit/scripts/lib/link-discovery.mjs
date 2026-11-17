import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { normalizeItems } from "./inventory.mjs";
import { createPublicCollector } from "./public-collect.mjs";
import { validateNetworkPolicy } from "./network.mjs";
import { extractHtmlLinks } from "./html-links.mjs";
import { resolveRunOutput } from "./run.mjs";
import { safeArtifactPath } from "./validate.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (uri) =>
  normalizeItems([{ uri, source: "link-discovery" }])[0].uri;

/** Anonymous breadth-first traversal of allowed static source hyperlinks with explicit gaps. */
export async function discoverLinks(config, outputDirectory, adapters = {}) {
  if (
    !config ||
    typeof config.sourceId !== "string" ||
    !config.sourceId.trim() ||
    !Array.isArray(config.seeds) ||
    !config.seeds.length ||
    config.seeds.length > 10000 ||
    !Array.isArray(config.localRoots) ||
    Buffer.byteLength(JSON.stringify(config)) > 32 * 1024 * 1024
  )
    throw new Error(
      "Link discovery requires explicit source ID, seeds and output-boundary roots",
    );
  const maxPages = config.maxPages ?? 100,
    maxDepth = config.maxDepth ?? 8;
  const maxStoredBytes = config.maxStoredBytes ?? 64 * 1024 * 1024,
    maxGraphBytes = config.maxGraphBytes ?? 8 * 1024 * 1024;
  for (const [value, min, max] of [
    [maxPages, 1, 1000],
    [maxDepth, 0, 64],
    [maxStoredBytes, 1024, 128 * 1024 * 1024],
    [maxGraphBytes, 128, 8 * 1024 * 1024],
  ])
    if (!Number.isSafeInteger(value) || value < min || value > max)
      throw new Error("Invalid link discovery budget");
  const policy = validateNetworkPolicy(config.network);
  const seeds = [...new Set(config.seeds.map(canonical))];
  if (seeds.some((uri) => !policy.allowedOrigins.has(new URL(uri).origin)))
    throw new Error("Page seeds must belong to allowed origins");
  const collector =
    adapters.collector ??
    createPublicCollector(config.network, adapters.network ?? {});
  const { output } = await resolveRunOutput(config, outputDirectory);
  const frontier = seeds.map((uri) => ({ uri, depth: 0 })),
    scheduled = new Set(seeds),
    processed = new Set();
  const records = seeds.map((uri) => ({ uri })),
    known = new Set(seeds),
    edges = [],
    exclusions = [],
    captures = [],
    files = {};
  const pendingQueue = [],
    pendingKeys = new Set();
  let storedBytes = 0,
    graphBytes = Buffer.byteLength(JSON.stringify(records));
  const state = {
    schemaVersion: 1,
    configHash: hash(JSON.stringify(config)),
    recovery: adapters.recovery ?? null,
    kind: "link-discovery",
    discoveryId: randomUUID(),
    sourceId: config.sourceId,
    status: "collecting",
    frontier,
    captures,
    pendingQueue,
    files,
  };
  const pending = (kind, locator, reason) => {
    const key = JSON.stringify([kind, locator, reason]);
    if (!pendingKeys.has(key)) {
      pendingKeys.add(key);
      pendingQueue.push({ kind, locator, reason });
    }
  };
  if (graphBytes > maxGraphBytes)
    throw new Error("Seed metadata exceeds graph budget");
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
  async function save(name, value) {
    if (!safeArtifactPath(name))
      throw new Error("Unsafe link-discovery artifact path");
    await mkdir(path.dirname(path.join(output, name)), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(path.join(output, name), value, {
      flag: "wx",
      mode: 0o600,
    });
    files[name] = { sha256: hash(value), bytes: Buffer.byteLength(value) };
  }
  await save("config.json", JSON.stringify(config, null, 2) + "\n");
  await checkpoint();
  while (frontier.length && captures.length < maxPages) {
    const current = frontier[0];
    if (processed.has(current.uri)) {
      frontier.shift();
      continue;
    }
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
        "Fetched capture does not fit; current and remaining pages are unprocessed",
      );
      break;
    }
    for (const [name, value] of Object.entries(payloads))
      await save(`${prefix}/${name}`, value);
    storedBytes += bytes;
    frontier.shift();
    processed.add(current.uri);
    const capture = {
      uri: current.uri,
      path: prefix,
      status: result.status,
      extracted: false,
    };
    captures.push(capture);
    if (result.status !== "collected")
      pending(
        "page-collection",
        current.uri,
        result.reason ?? "Page unavailable",
      );
    else if (result.contentType !== "text/html")
      pending(
        "page-extraction",
        current.uri,
        "Only text/html source navigation is supported; this representation needs its own adapter",
      );
    else {
      const content = result.evidence.find(
        (record) => record.kind === "content",
      );
      const finalUrl = canonical(content.locator);
      capture.finalUrl = finalUrl;
      // Preserve redirect aliases in inventory, but do not repeatedly crawl a final representation.
      if (!known.has(finalUrl)) {
        const extra = Buffer.byteLength(JSON.stringify({ uri: finalUrl })) + 1;
        if (graphBytes + extra <= maxGraphBytes) {
          known.add(finalUrl);
          records.push({ uri: finalUrl });
          graphBytes += extra;
        } else
          pending(
            "graph-budget",
            finalUrl,
            "Redirect alias cannot fit the graph budget",
          );
      }
      processed.add(finalUrl);
      try {
        const extracted = extractHtmlLinks(result.content, finalUrl);
        capture.extracted = true;
        capture.requiresRendering = extracted.requiresRendering;
        for (const gap of extracted.pending)
          pending(
            "html-extraction",
            finalUrl,
            `${gap.kind} at offset ${gap.offset}: ${gap.reason}`,
          );
        if (extracted.requiresRendering)
          pending(
            "rendering-unreviewed",
            finalUrl,
            "Dynamic/inert navigation surfaces require separate rendered inspection",
          );
        for (const link of extracted.links) {
          const uri = canonical(link.uri),
            allowed = policy.allowedOrigins.has(new URL(uri).origin);
          const edge = {
            from: finalUrl,
            to: uri,
            rel: link.rel,
            offset: link.offset,
            capturePath: prefix,
            snapshotHash: content.snapshotHash,
            inScope: allowed,
          };
          const extra =
            Buffer.byteLength(JSON.stringify(edge)) +
            1 +
            (allowed && !known.has(uri)
              ? Buffer.byteLength(JSON.stringify({ uri })) + 1
              : 0);
          if (graphBytes + extra > maxGraphBytes) {
            pending(
              "graph-budget",
              finalUrl,
              "Graph metadata budget reached; remaining source links need another scoped pass",
            );
            break;
          }
          graphBytes += extra;
          edges.push(edge);
          if (!allowed) {
            exclusions.push({
              locator: uri,
              reason: "Outside explicitly allowed discovery origins",
            });
            continue;
          }
          if (!known.has(uri)) {
            known.add(uri);
            records.push({ uri });
          }
          if (scheduled.has(uri) || processed.has(uri)) continue;
          if (current.depth >= maxDepth) {
            pending("page-depth", uri, "Page depth budget reached");
            continue;
          }
          if (scheduled.size >= 10000) {
            pending(
              "page-frontier-budget",
              uri,
              "Unique page frontier exceeds 10,000 URLs",
            );
            continue;
          }
          scheduled.add(uri);
          frontier.push({ uri, depth: current.depth + 1 });
        }
      } catch (error) {
        pending("html-extraction", finalUrl, error.message);
      }
    }
    await checkpoint();
  }
  for (let i = frontier.length - 1; i >= 0; i--)
    if (processed.has(frontier[i].uri)) frontier.splice(i, 1);
  for (const entry of frontier)
    pending(
      "unvisited-page",
      entry.uri,
      "Page request budget or storage budget ended before collection",
    );
  // A later shorter path or redirect may have resolved an earlier depth-only gap.
  for (let i = pendingQueue.length - 1; i >= 0; i--)
    if (
      pendingQueue[i].kind === "page-depth" &&
      processed.has(pendingQueue[i].locator)
    )
      pendingQueue.splice(i, 1);
  const source = {
    id: config.sourceId,
    kind: "records",
    locator: `link-discovery:${state.discoveryId}`,
    collectedAt: new Date().toISOString(),
    complete: pendingQueue.length === 0,
    records,
    pendingQueue,
    exclusions,
    scope: {
      seeds,
      allowedOrigins: [...policy.allowedOrigins].sort(),
      maxPages,
      maxDepth,
      maxStoredBytes,
      maxGraphBytes,
      visitedPages: captures.length,
      graphPath: "graph.jsonl",
      captureDirectory: output,
      captures,
    },
    limitations: [
      "Declared allowed static-link graph only; orphan pages, CMS records and rendered navigation require other sources",
      "Robots, DNS, redirects, retries and cooldown rules remain enforced; scripts/forms/ping never execute",
      "Rel annotations are preserved; nofollow is not treated as a robots prohibition or ranking verdict",
      "Query variants remain distinct; finite budgets may leave explicit unvisited inventory",
      "Discovery captures do not establish semantic audit completion or current index/AI visibility",
    ],
  };
  await save(
    "graph.jsonl",
    edges.map((edge) => JSON.stringify(edge)).join("\n") +
      (edges.length ? "\n" : ""),
  );
  await save("source.json", JSON.stringify(source, null, 2) + "\n");
  state.status = source.complete ? "complete-for-static-scope" : "partial";
  await checkpoint();
  return {
    directory: output,
    discoveryId: state.discoveryId,
    status: state.status,
    source,
  };
}
