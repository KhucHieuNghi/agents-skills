import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { enumerateRepository } from "../skills/content-search-audit/scripts/lib/repository-discovery.mjs";
import { discoverInventory } from "../skills/content-search-audit/scripts/lib/discovery.mjs";
import {
  startCampaign,
  validateCampaign,
} from "../skills/content-search-audit/scripts/lib/campaign.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "repository-enumeration-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  await mkdir(path.join(content, "nested"));
  await mkdir(path.join(content, "vendor"));
  await writeFile(path.join(content, "a.md"), "# Read me");
  await writeFile(
    path.join(content, "nested", "b.PDF"),
    "fixture binary format",
  );
  await writeFile(
    path.join(content, "ignored.js"),
    'throw new Error("never execute")',
  );
  await writeFile(path.join(content, "vendor", "excluded.md"), "excluded");
  const config = {
    sourceId: "repo",
    roots: [content],
    extensions: [".md", ".pdf"],
    excludeDirectoryNames: ["vendor"],
  };
  return { root, content, config };
}
it("enumerates declared content formats, preserves unsupported media and records scope exclusions", async () => {
  const { content, config } = await setup();
  const before = await readFile(path.join(content, "a.md"));
  const source = await enumerateRepository(config);
  expect(source.complete).toBe(true);
  expect(source.records.map((entry) => path.basename(entry.path))).toEqual([
    "a.md",
    "b.PDF",
  ]);
  expect(source.exclusions).toContainEqual({
    locator: await realpath(path.join(content, "vendor")),
    reason: "Explicit directory-name exclusion",
  });
  expect(source.scope.skippedExtensions).toEqual({ ".js": 1 });
  expect(await readFile(path.join(content, "a.md"))).toEqual(before);
  const discovery = discoverInventory({
    sources: [source],
    expectedSourceIds: ["repo"],
    scopeComplete: true,
  });
  expect(discovery.inventoryComplete).toBe(true);
  expect(discovery.sources[0].adapterMetadataHash).toMatch(/^[a-f0-9]{64}$/);
});
it("does not follow symlinks and carries detailed pending scope into campaign validation", async () => {
  const { root, content, config } = await setup();
  const outside = path.join(root, "outside");
  await mkdir(outside);
  await writeFile(path.join(outside, "secret.md"), "do not enumerate");
  await symlink(outside, path.join(content, "linked"));
  const source = await enumerateRepository(config);
  expect(source.complete).toBe(false);
  expect(source.records.every((entry) => !entry.path.includes("secret"))).toBe(
    true,
  );
  expect(
    source.pendingQueue.some((entry) => entry.kind === "unfollowed-symlink"),
  ).toBe(true);
  const request = {
    sources: [source],
    expectedSourceIds: ["repo"],
    scopeComplete: true,
  };
  const discovery = discoverInventory(request);
  const campaign = await startCampaign(
    {
      discovery: request,
      inputs: discovery.inputs,
      inventoryComplete: discovery.inventoryComplete,
      localRoots: [content],
    },
    path.join(root, "campaign"),
  );
  expect(campaign.coverage.pendingQueue).toContainEqual(
    expect.objectContaining({
      discoveryKind: "source-adapter-queue",
      adapterKind: "unfollowed-symlink",
    }),
  );
  expect((await validateCampaign(campaign.directory)).valid).toBe(true);
  expect(() =>
    discoverInventory({ ...request, sources: [{ ...source, complete: true }] }),
  ).toThrow(/completeness/);
});
it("makes entry, depth and record budgets explicit instead of claiming an exhaustive source", async () => {
  const { content, config } = await setup();
  // Exceed the byte budget even when the operating system uses a short temp path.
  await writeFile(
    path.join(content, `${"long-name-".repeat(16)}.md`),
    "# Budget fixture",
  );
  for (const limited of [
    { maxEntries: 1 },
    { maxDepth: 0 },
    { maxRecordsBytes: 128 },
  ]) {
    const source = await enumerateRepository({ ...config, ...limited });
    expect(source.complete).toBe(false);
    expect(source.pendingQueue.length).toBeGreaterThan(0);
  }
});
it("rejects symlink roots and missing scope policies; exposes enumeration in the CLI", async () => {
  const { root, content, config } = await setup();
  const linked = path.join(root, "linked-root");
  await symlink(content, linked);
  await expect(
    enumerateRepository({ ...config, roots: [linked] }),
  ).rejects.toThrow(/symlink/);
  await expect(
    enumerateRepository({ ...config, extensions: [] }),
  ).rejects.toThrow(/Explicit/);
  const file = path.join(root, "config.json");
  await writeFile(file, JSON.stringify(config));
  const { stdout } = await promisify(execFile)(process.execPath, [
    path.resolve("skills/content-search-audit/scripts/audit.mjs"),
    "discover-repository",
    file,
  ]);
  expect(JSON.parse(stdout).records).toHaveLength(2);
});
