import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  access,
  mkdir,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { networkFixture } from "./helpers/content-audit-network.js";
import { discoverLinks } from "../skills/content-search-audit/scripts/lib/link-discovery.mjs";
import { discoverSitemaps } from "../skills/content-search-audit/scripts/lib/sitemap-discovery.mjs";
import {
  loadDiscoverySnapshot,
  resumeDiscovery,
} from "../skills/content-search-audit/scripts/lib/discovery-resume.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "discovery-resume-"));
  roots.push(root);
  return {
    root,
    config: {
      sourceId: "fixture",
      seeds: ["https://example.com/"],
      localRoots: [],
      network: { allowedOrigins: ["https://example.com"], retries: 0 },
    },
  };
}
const html = (body: string) => ({
  headers: { "content-type": "text/html" },
  body,
});
it("replays successful pages into a new traversal and only fetches the remaining frontier", async () => {
  const { root, config } = await setup();
  const first = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": html('<a href="/next">next</a>'),
  });
  const source = await discoverLinks(
    { ...config, maxPages: 1 },
    path.join(root, "source"),
    { network: first.adapters },
  );
  const original = await readFile(
    path.join(source.directory, "discovery.json"),
    "utf8",
  );
  const next = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/next": html("done"),
  });
  const result = await resumeDiscovery(
    source.directory,
    path.join(root, "resumed"),
    { maxPages: 2 },
    { network: next.adapters },
  );
  expect(result.source.complete).toBe(true);
  expect(next.calls).toEqual([
    "https://example.com/robots.txt",
    "https://example.com/next",
  ]);
  expect(result.source.records).toHaveLength(2);
  expect(
    await readFile(path.join(source.directory, "discovery.json"), "utf8"),
  ).toBe(original);
  const validated = await loadDiscoverySnapshot(result.directory);
  expect(validated.manifest.recovery.reusedUrls).toEqual([
    "https://example.com/",
  ]);
  expect(validated.captures.get("https://example.com/").evidence).toEqual(
    (await loadDiscoverySnapshot(source.directory)).captures.get(
      "https://example.com/",
    ).evidence,
  );
});
it("reconstructs an interrupted checkpoint and ignores unregistered orphan captures", async () => {
  const { root, config } = await setup();
  const f = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": html("done"),
  });
  const source = await discoverLinks(config, path.join(root, "source"), {
    network: f.adapters,
  });
  const manifest = JSON.parse(
    await readFile(path.join(source.directory, "discovery.json"), "utf8"),
  );
  manifest.status = "collecting";
  delete manifest.files["source.json"];
  delete manifest.files["graph.jsonl"];
  await writeFile(
    path.join(source.directory, "discovery.json"),
    JSON.stringify(manifest),
  );
  await mkdir(path.join(source.directory, "captures", "999999"));
  await writeFile(
    path.join(source.directory, "captures", "999999", "capture.json"),
    "unregistered data",
  );
  const noNetwork = networkFixture({});
  const resumed = await resumeDiscovery(
    source.directory,
    path.join(root, "resumed"),
    {},
    { network: noNetwork.adapters },
  );
  expect(resumed.source.complete).toBe(true);
  expect(noNetwork.calls).toEqual([]);
  const cli = await promisify(execFile)(process.execPath, [
    "skills/content-search-audit/scripts/audit.mjs",
    "discovery-resume",
    source.directory,
    path.join(root, "cli-resumed"),
  ]);
  expect(JSON.parse(cli.stdout).source.complete).toBe(true);
  const verified = await promisify(execFile)(process.execPath, [
    "skills/content-search-audit/scripts/audit.mjs",
    "discovery-validate",
    path.join(root, "cli-resumed"),
  ]);
  expect(JSON.parse(verified.stdout).captures).toBe(1);
  expect(
    await readFile(
      path.join(source.directory, "captures", "999999", "capture.json"),
      "utf8",
    ),
  ).toBe("unregistered data");
});
it("replays sitemap indexes and continues only uncaptured child sitemaps", async () => {
  const { root, config } = await setup();
  const first = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": {
      body: "<sitemapindex xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'><sitemap><loc>https://example.com/child.xml</loc></sitemap></sitemapindex>",
    },
  });
  const source = await discoverSitemaps(
    { ...config, maxSitemaps: 1 },
    path.join(root, "source"),
    { network: first.adapters },
  );
  const next = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/child.xml": {
      body: "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'><url><loc>https://example.com/page</loc></url></urlset>",
    },
  });
  const resumed = await resumeDiscovery(
    source.directory,
    path.join(root, "resumed"),
    { maxSitemaps: 2 },
    { network: next.adapters },
  );
  expect(resumed.source.complete).toBe(true);
  expect(next.calls).not.toContain("https://example.com/");
  expect(resumed.source.records[0].uri).toBe("https://example.com/page");
  await expect(loadDiscoverySnapshot(resumed.directory)).resolves.toBeDefined();
});
it("restores deferred server cooldown before retrying unsuccessful captures", async () => {
  const { root, config } = await setup();
  const first = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": { status: 429, headers: { "retry-after": "3600" } },
  });
  const source = await discoverLinks(config, path.join(root, "source"), {
    network: first.adapters,
  });
  const next = networkFixture({});
  const resumed = await resumeDiscovery(
    source.directory,
    path.join(root, "resumed"),
    {},
    { network: next.adapters },
  );
  expect(resumed.source.complete).toBe(false);
  expect(next.calls).toEqual([]);
});
it("rejects tampered artifacts, symlinks, scope changes and nested output before fetching", async () => {
  const { root, config } = await setup();
  const f = networkFixture({
    "https://example.com/robots.txt": { status: 404 },
    "https://example.com/": html("done"),
  });
  const source = await discoverLinks(config, path.join(root, "source"), {
    network: f.adapters,
  });
  const next = networkFixture({});
  await expect(
    resumeDiscovery(
      source.directory,
      path.join(root, "bad"),
      { seeds: ["https://other.example/"] },
      { network: next.adapters },
    ),
  ).rejects.toThrow(/budget/i);
  await expect(
    resumeDiscovery(
      source.directory,
      path.join(source.directory, "nested"),
      {},
      { network: next.adapters },
    ),
  ).rejects.toThrow(/outside/i);
  const capture = path.join(source.directory, "captures/000001/capture.json");
  const bytes = await readFile(capture);
  await writeFile(capture, "{}");
  await expect(
    resumeDiscovery(
      source.directory,
      path.join(root, "bad"),
      {},
      { network: next.adapters },
    ),
  ).rejects.toThrow(/hash/i);
  await rm(capture);
  const external = path.join(root, "external.json");
  await writeFile(external, bytes);
  await symlink(external, capture);
  await expect(loadDiscoverySnapshot(source.directory)).rejects.toThrow(
    /symlink/i,
  );
  await expect(access(path.join(root, "bad"))).rejects.toThrow();
  expect(next.calls).toEqual([]);
});
