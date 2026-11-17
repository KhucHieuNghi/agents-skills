import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { networkFixture } from "./helpers/content-audit-network.js";
import { discoverLinks } from "../skills/content-search-audit/scripts/lib/link-discovery.mjs";
import { discoverInventory } from "../skills/content-search-audit/scripts/lib/discovery.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const page = (body: string) => ({
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8" },
  body,
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "link-discovery-"));
  roots.push(root);
  const config = {
    sourceId: "internal-links",
    seeds: ["https://example.com/"],
    localRoots: [],
    network: { allowedOrigins: ["https://example.com"], retries: 0 },
  };
  return { root, config };
}
it("crawls a finite graph once per URL, preserves rel/query data and excludes external origins", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": page(
      '<a href="/a?version=1" rel="nofollow">A</a><a href="https://other.example/">external</a><a href="#top">self</a>',
    ),
    "https://example.com/a?version=1": page('<a href="/">home</a>'),
  });
  const result = await discoverLinks(config, path.join(root, "crawl"), {
    network: fixture.adapters,
  });
  expect(result.source.complete).toBe(true);
  expect(fixture.calls).toEqual([
    "https://example.com/robots.txt",
    "https://example.com/",
    "https://example.com/a?version=1",
  ]);
  expect(result.source.records.map((row) => row.uri)).toEqual([
    "https://example.com/",
    "https://example.com/a?version=1",
  ]);
  expect(result.source.exclusions).toContainEqual(
    expect.objectContaining({ locator: "https://other.example/" }),
  );
  const graph = (
    await readFile(path.join(result.directory, "graph.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(graph[0].rel).toEqual(["nofollow"]);
  expect(graph.every((edge) => edge.snapshotHash && edge.capturePath)).toBe(
    true,
  );
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
});
it("resolves links from the final redirect URL and preserves both aliases without duplicate final fetch", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/start": {
      status: 302,
      headers: { location: "/docs/" },
    },
    "https://example.com/docs/": page('<a href="child">next</a>'),
    "https://example.com/docs/child": page("done"),
  });
  const result = await discoverLinks(
    {
      ...config,
      seeds: ["https://example.com/start", "https://example.com/docs/"],
    },
    path.join(root, "crawl"),
    { network: fixture.adapters },
  );
  expect(result.source.complete).toBe(true);
  expect(
    fixture.calls.filter((uri) => uri === "https://example.com/docs/"),
  ).toHaveLength(1);
  expect(result.source.records.map((entry) => entry.uri)).toContain(
    "https://example.com/start",
  );
  expect(result.source.records.map((entry) => entry.uri)).toContain(
    "https://example.com/docs/child",
  );
});
it("retains discovered robots-blocked and unvisited pages as unresolved inventory", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": {
      body: "User-agent: *\nDisallow: /blocked",
    },
    "https://example.com/": page(
      "<a href=/blocked>blocked</a><a href=/later>later</a>",
    ),
  });
  const result = await discoverLinks(
    { ...config, maxPages: 2 },
    path.join(root, "crawl"),
    { network: fixture.adapters },
  );
  expect(result.source.complete).toBe(false);
  expect(result.source.records).toHaveLength(3);
  expect(fixture.calls).toEqual([
    "https://example.com/robots.txt",
    "https://example.com/",
  ]);
  expect(result.source.pendingQueue.map((entry) => entry.kind)).toEqual(
    expect.arrayContaining(["page-collection", "unvisited-page"]),
  );
});
it("does not execute scripts or forms and leaves rendering and parser gaps pending", async () => {
  const { root, config } = await setup();
  const fixture = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": page(
      '<script>throw new Error("never execute")</script><form action=/submit><input name=x></form><a href="/bad?x=&copy;">ambiguous</a>',
    ),
  });
  const result = await discoverLinks(config, path.join(root, "crawl"), {
    network: fixture.adapters,
  });
  expect(result.source.complete).toBe(false);
  expect(result.source.pendingQueue.map((entry) => entry.kind)).toEqual(
    expect.arrayContaining(["rendering-unreviewed", "html-extraction"]),
  );
  expect(fixture.calls).toHaveLength(2);
});
it("retains depth storage and graph budget limits and rejects unauthorized seeds before writing", async () => {
  const { root, config } = await setup();
  for (const [label, limits] of Object.entries({
    depth: { maxDepth: 0 },
    storage: { maxStoredBytes: 1024 },
    graph: { maxGraphBytes: 128 },
  })) {
    const fixture = networkFixture({
      "https://example.com/robots.txt": { status: 404 },
      "https://example.com/": page("<a href=/next>next</a>"),
    });
    const result = await discoverLinks(
      { ...config, ...limits },
      path.join(root, label),
      { network: fixture.adapters },
    );
    expect(result.source.complete).toBe(false);
    expect(result.source.pendingQueue.length).toBeGreaterThan(0);
  }
  const noNetwork = networkFixture({});
  await expect(
    discoverLinks(
      { ...config, seeds: ["https://other.example/"] },
      path.join(root, "bad"),
      { network: noNetwork.adapters },
    ),
  ).rejects.toThrow(/allowed/);
  await expect(access(path.join(root, "bad"))).rejects.toThrow();
  expect(noNetwork.calls).toEqual([]);
});
