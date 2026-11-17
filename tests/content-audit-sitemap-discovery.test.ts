import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { networkFixture } from "./helpers/content-audit-network.js";
import { discoverSitemaps } from "../skills/content-search-audit/scripts/lib/sitemap-discovery.mjs";
import { discoverInventory } from "../skills/content-search-audit/scripts/lib/discovery.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
const index = (locations: string[]) =>
  `<sitemapindex xmlns="${ns}">${locations.map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`).join("")}</sitemapindex>`;
const urls = (locations: string[]) =>
  `<urlset xmlns="${ns}">${locations.map((loc) => `<url><loc>${loc}</loc></url>`).join("")}</urlset>`;
const xml = (body: string) => ({
  status: 200,
  headers: { "content-type": "application/xml" },
  body,
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "sitemap-discovery-"));
  roots.push(root);
  const config = {
    sourceId: "public-sitemaps",
    seeds: ["https://example.com/root.xml"],
    localRoots: [],
    network: { allowedOrigins: ["https://example.com"], retries: 0 },
  };
  return { root, config };
}
it("traverses sitemap indexes with shared policy, preserves captures and supplies the discovery union", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/root.xml": xml(
      index(["https://example.com/child.xml"]),
    ),
    "https://example.com/child.xml": xml(
      urls(["https://example.com/page", "https://other.example/page"]),
    ),
  });
  const result = await discoverSitemaps(config, path.join(root, "discovery"), {
    network: fixture.adapters,
  });
  expect(result.source.complete).toBe(true);
  expect(result.source.records).toHaveLength(2);
  expect(fixture.calls).toEqual([
    "https://example.com/robots.txt",
    "https://example.com/root.xml",
    "https://example.com/child.xml",
  ]);
  const manifest = JSON.parse(
    await readFile(path.join(result.directory, "discovery.json"), "utf8"),
  );
  for (const [name, entry] of Object.entries(manifest.files))
    expect(
      createHash("sha256")
        .update(await readFile(path.join(result.directory, name)))
        .digest("hex"),
    ).toBe((entry as { sha256: string }).sha256);
  expect(
    discoverInventory({
      expectedSourceIds: [config.sourceId],
      scopeComplete: true,
      sources: [result.source],
    }).inventory,
  ).toHaveLength(2);
  await expect(
    discoverSitemaps(config, result.directory, { network: fixture.adapters }),
  ).rejects.toThrow();
});
it("leaves off-origin children and robots-denied sitemaps queued without fetching them", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": {
      body: "User-agent: *\nDisallow: /blocked.xml",
    },
    "https://example.com/root.xml": xml(
      index([
        "https://example.com/blocked.xml",
        "https://other.example/site.xml",
      ]),
    ),
  });
  const result = await discoverSitemaps(config, path.join(root, "discovery"), {
    network: fixture.adapters,
  });
  expect(result.source.complete).toBe(false);
  expect(fixture.calls).toEqual([
    "https://example.com/robots.txt",
    "https://example.com/root.xml",
  ]);
  expect(result.source.pendingQueue.map((entry) => entry.kind)).toEqual(
    expect.arrayContaining(["sitemap-origin", "sitemap-collection"]),
  );
});
it("detects index cycles even when both cycle endpoints are initial seeds", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/a.xml": xml(index(["https://example.com/b.xml"])),
    "https://example.com/b.xml": xml(index(["https://example.com/a.xml"])),
  });
  const result = await discoverSitemaps(
    {
      ...config,
      seeds: ["https://example.com/a.xml", "https://example.com/b.xml"],
    },
    path.join(root, "discovery"),
    { network: fixture.adapters },
  );
  expect(result.source.complete).toBe(false);
  expect(
    result.source.pendingQueue.some(
      (entry) => entry.kind === "sitemap-graph-cycle-or-depth",
    ),
  ).toBe(true);
  expect(fixture.calls).toHaveLength(3);
});
it("exposes capture, depth, inventory and request budgets as incomplete source queues", async () => {
  const { root, config } = await setup();
  for (const [label, limits] of Object.entries({
    count: { maxSitemaps: 1 },
    depth: { maxDepth: 0 },
    storage: { maxStoredBytes: 1024 },
    inventory: { maxInventoryBytes: 128 },
  })) {
    const fixture = networkFixture({
      "https://example.com/robots.txt": { status: 404 },
      "https://example.com/root.xml": xml(
        index(["https://example.com/child.xml"]),
      ),
      "https://example.com/child.xml": xml(urls(["https://example.com/page"])),
    });
    const result = await discoverSitemaps(
      { ...config, ...limits },
      path.join(root, label),
      { network: fixture.adapters },
    );
    expect(result.source.complete).toBe(false);
    expect(result.source.pendingQueue.length).toBeGreaterThan(0);
  }
});
it("rejects unauthorized seeds before output or network and preserves parse failures", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({});
  await expect(
    discoverSitemaps(
      { ...config, seeds: ["https://other.example/site.xml"] },
      path.join(root, "bad"),
      { network: fixture.adapters },
    ),
  ).rejects.toThrow(/allowed/);
  await expect(access(path.join(root, "bad"))).rejects.toThrow();
  expect(fixture.calls).toEqual([]);
  const malformed = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/root.xml": xml("<broken>"),
  });
  const result = await discoverSitemaps(config, path.join(root, "malformed"), {
    network: malformed.adapters,
  });
  expect(result.source.pendingQueue[0].kind).toBe("sitemap-parse");
  expect(result.source.scope.captures[0].path).toBe("captures/000001");
});
