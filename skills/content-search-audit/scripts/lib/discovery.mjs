import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { normalizeItems } from "./inventory.mjs";
import { parseSitemap } from "./sitemap.mjs";
import { extractHtmlLinks } from "./html-links.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const text = (value) => typeof value === "string" && value.trim().length > 0;
/** Union explicitly supplied source snapshots. Never fetches, guesses completeness or drops failed rows silently. */
export function discoverInventory(config) {
  if (
    !config ||
    Buffer.byteLength(JSON.stringify(config)) > 32 * 1024 * 1024 ||
    !Array.isArray(config.sources) ||
    !Array.isArray(config.expectedSourceIds) ||
    config.expectedSourceIds.some((id) => !text(id)) ||
    new Set(config.expectedSourceIds).size !==
      config.expectedSourceIds.length ||
    typeof config.scopeComplete !== "boolean"
  )
    throw new Error(
      "Explicit discovery sources, expected IDs and scopeComplete required within 32 MiB",
    );
  const trackingParameters = config.trackingParameters ?? [];
  normalizeItems([], { trackingParameters });
  const inputs = [],
    sources = [],
    pendingQueue = [],
    seen = new Set(),
    byLocator = new Map();
  for (const source of config.sources) {
    if (
      !source ||
      !text(source.id) ||
      seen.has(source.id) ||
      !config.expectedSourceIds.includes(source.id) ||
      !text(source.locator) ||
      !text(source.collectedAt) ||
      !Number.isFinite(Date.parse(source.collectedAt)) ||
      typeof source.complete !== "boolean" ||
      !["sitemap-xml", "url-list", "records", "html-links"].includes(
        source.kind,
      )
    )
      throw new Error("Invalid, duplicate or undeclared discovery source");
    seen.add(source.id);
    const adapterQueue = source.pendingQueue ?? [],
      exclusions = source.exclusions ?? [];
    if (
      !Array.isArray(adapterQueue) ||
      adapterQueue.some(
        (entry) =>
          !entry ||
          !text(entry.kind) ||
          !text(entry.locator) ||
          !text(entry.reason),
      ) ||
      !Array.isArray(exclusions) ||
      exclusions.some(
        (entry) => !entry || !text(entry.locator) || !text(entry.reason),
      ) ||
      (source.complete && adapterQueue.length)
    )
      throw new Error(
        "Invalid source adapter queue, exclusions or completeness",
      );
    const snapshot =
      source.kind === "records"
        ? JSON.stringify(source.records)
        : source.content;
    if (typeof snapshot !== "string")
      throw new Error("Source snapshot content required");
    const summary = {
      id: source.id,
      kind: source.kind,
      locator: source.locator,
      collectedAt: source.collectedAt,
      snapshotHash: hash(snapshot),
      complete: source.complete,
      acceptedRows: 0,
      rejectedRows: 0,
      status: "processed",
      childSitemaps: [],
      ...(source.scope !== undefined ||
      source.pendingQueue !== undefined ||
      source.exclusions !== undefined
        ? {
            adapterMetadataHash: hash(
              JSON.stringify({
                scope: source.scope ?? null,
                pendingQueue: adapterQueue,
                exclusions,
              }),
            ),
            scope: source.scope ?? null,
            exclusions,
          }
        : {}),
    };
    sources.push(summary);
    for (const entry of adapterQueue)
      pendingQueue.push({
        kind: "source-adapter-queue",
        sourceId: source.id,
        adapterKind: entry.kind,
        locator: entry.locator,
        reason: entry.reason,
      });
    if (!source.complete)
      pendingQueue.push({
        kind: "source-incomplete",
        sourceId: source.id,
        reason: "Supplied source is partial or pagination remains",
      });
    let rows;
    try {
      if (Buffer.byteLength(snapshot) > 10 * 1024 * 1024)
        throw new Error("Source exceeds operational 10 MiB limit");
      if (source.kind === "records") {
        if (!Array.isArray(source.records))
          throw new Error("Records array required");
        rows = source.records;
      } else if (source.kind === "url-list")
        rows = source.content
          .replace(/^\uFEFF/, "")
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((uri) => ({ uri }));
      else if (source.kind === "html-links") {
        const extracted = extractHtmlLinks(source.content, source.locator);
        summary.linkExtraction = {
          baseUrl: extracted.baseUrl,
          requiresRendering: extracted.requiresRendering,
          links: extracted.links,
          nonHttpCount: extracted.nonHttp.length,
        };
        rows = [
          { uri: source.locator },
          ...extracted.links.map((link) => ({ uri: link.uri })),
        ];
        for (const entry of extracted.pending)
          pendingQueue.push({
            kind: "source-link-extraction",
            sourceId: source.id,
            extractionKind: entry.kind,
            offset: entry.offset,
            reason: entry.reason,
          });
        if (extracted.requiresRendering)
          pendingQueue.push({
            kind: "rendering-unreviewed",
            sourceId: source.id,
            reason:
              "Source has scripting/inert navigation surfaces; rendered link coverage has not been inspected",
          });
      } else {
        const parsed = parseSitemap(source.content);
        if (parsed.kind === "sitemapindex") {
          summary.childSitemaps = parsed.locations;
          rows = [];
        } else rows = parsed.locations.map((uri) => ({ uri }));
      }
      for (const [position, row] of rows.entries()) {
        try {
          if (!row || typeof row !== "object" || Array.isArray(row))
            throw new Error("Expected URL/path record");
          const input = { source: source.id };
          for (const field of ["uri", "path", "locale", "type", "canonical"])
            if (row[field] !== undefined) input[field] = row[field];
          normalizeItems([input], { trackingParameters });
          inputs.push(input);
          summary.acceptedRows++;
        } catch (error) {
          summary.rejectedRows++;
          pendingQueue.push({
            kind: "invalid-source-row",
            sourceId: source.id,
            row: position + 1,
            reason: error.message,
          });
        }
      }
    } catch (error) {
      summary.status = "failed";
      pendingQueue.push({
        kind: "source-parse-failure",
        sourceId: source.id,
        reason: error.message,
      });
    }
    if (source.kind === "sitemap-xml") {
      if (byLocator.has(source.locator))
        throw new Error("Ambiguous sitemap locator snapshots");
      byLocator.set(source.locator, summary);
    }
  }
  for (const id of config.expectedSourceIds)
    if (!seen.has(id))
      pendingQueue.push({
        kind: "missing-source",
        sourceId: id,
        reason: "Expected source snapshot not supplied",
      });
  const visited = new Set(),
    visiting = new Set();
  function visit(source, depth = 0) {
    if (visiting.has(source.id) || depth > 128) {
      pendingQueue.push({
        kind: "sitemap-cycle-or-depth",
        sourceId: source.id,
        reason: "Index graph cannot establish exhaustive traversal",
      });
      return;
    }
    if (visited.has(source.id)) return;
    visiting.add(source.id);
    for (const locator of source.childSitemaps) {
      const child = byLocator.get(locator);
      if (!child || child.status !== "processed")
        pendingQueue.push({
          kind: "pending-sitemap",
          sourceId: source.id,
          locator,
          reason:
            "Referenced sitemap snapshot missing or failed; discovery is not fetch authorization",
        });
      else visit(child, depth + 1);
    }
    visiting.delete(source.id);
    visited.add(source.id);
  }
  for (const source of sources) visit(source);
  if (!config.scopeComplete)
    pendingQueue.push({
      kind: "scope-unconfirmed",
      reason:
        "The expected source set is not declared exhaustive for the audit scope",
    });
  const inventory = normalizeItems(inputs, { trackingParameters });
  return {
    schemaVersion: 1,
    inputs,
    inventory,
    sources,
    pendingQueue,
    inventoryComplete:
      config.scopeComplete &&
      config.expectedSourceIds.length > 0 &&
      inventory.length > 0 &&
      pendingQueue.length === 0,
    limitations: [
      "Completeness is relative to the declared expected source set and its supplied completeness assertions",
      "No automatic crawling, pagination, repository walking, CMS connection or analytics metric import is performed",
      "URLs and paths are discovery data, not network/local-read authorization; preserve collection allowlists",
      "Canonical relationships and locale variants are retained; only explicit tracking parameters are removed",
    ],
  };
}

/** Bind supplied discovery snapshots to a campaign's exact normalized inventory. */
export function campaignDiscovery(config) {
  if (config?.discovery === undefined) return null;
  if (
    !config.discovery ||
    typeof config.discovery !== "object" ||
    Array.isArray(config.discovery)
  )
    throw new Error("Discovery configuration object required");
  const trackingParameters = config.trackingParameters ?? [];
  if (
    config.discovery.trackingParameters !== undefined &&
    JSON.stringify([...config.discovery.trackingParameters].sort()) !==
      JSON.stringify([...trackingParameters].sort())
  )
    throw new Error(
      "Discovery and collection tracking parameter policies differ",
    );
  const result = discoverInventory({ ...config.discovery, trackingParameters });
  if (
    JSON.stringify(normalizeItems(config.inputs, { trackingParameters })) !==
    JSON.stringify(result.inventory)
  )
    throw new Error("Campaign inventory differs from supplied discovery union");
  if (config.inventoryComplete && !result.inventoryComplete)
    throw new Error("Campaign cannot override incomplete discovery");
  return {
    schemaVersion: 1,
    requestHash: hash(JSON.stringify(config.discovery)),
    inventoryComplete: result.inventoryComplete,
    sources: result.sources,
    pendingQueue: result.pendingQueue.map(({ kind, ...entry }) => ({
      kind: "discovery",
      discoveryKind: kind,
      ...entry,
    })),
  };
}

/** Partition collection keeps global discovery only at campaign scope. */
export function withoutDiscovery(config) {
  const { discovery: _discovery, ...rest } = config;
  void _discovery;
  return rest;
}
