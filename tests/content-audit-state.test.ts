import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  saveCheckpoint,
  loadCheckpoint,
  reconcileSnapshots,
} from "../skills/content-search-audit/scripts/lib/state.mjs";
const directories: string[] = [];
async function directory() {
  const value = await mkdtemp(path.join(tmpdir(), "content-state-"));
  directories.push(value);
  return value;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const hash = "a".repeat(64);
function fixture() {
  return {
    schemaVersion: 1,
    runId: "trial-1",
    configHash: hash,
    status: "analyzing",
    version: "0.1.0",
    updatedAt: "2026-11-16T00:00:00.000Z",
    cursor: 500,
    inputHashes: { page1: hash, page2: hash },
    checks: [
      {
        itemId: "page1",
        ruleId: "title",
        dependencies: ["page1"],
        status: "pass",
      },
      {
        itemId: "page2",
        ruleId: "consistency",
        dependencies: ["page1", "page2"],
        status: "pass",
      },
    ],
  };
}
it("round trips a checkpoint and recovers the cursor without temporary artifacts", async () => {
  const dir = await directory();
  const state = fixture();
  await saveCheckpoint(dir, state);
  expect(await loadCheckpoint(dir, hash)).toEqual(state);
  expect(await readdir(dir)).toEqual(["run.json"]);
  state.cursor = 1000;
  await saveCheckpoint(dir, state);
  expect((await loadCheckpoint(dir, hash)).cursor).toBe(1000);
});
it("refuses a configuration change instead of silently reusing results", async () => {
  const dir = await directory();
  await saveCheckpoint(dir, fixture());
  await expect(loadCheckpoint(dir, "b".repeat(64))).rejects.toThrow(
    /configuration/i,
  );
});
it("rejects invalid state without replacing the previous checkpoint", async () => {
  const dir = await directory();
  await saveCheckpoint(dir, fixture());
  const before = await readFile(path.join(dir, "run.json"), "utf8");
  for (const change of [
    { cursor: -1 },
    { status: "finished" },
    { inputHashes: { page1: "not-a-hash" } },
    {
      checks: [
        { itemId: "page1", ruleId: "title", status: "pass", dependencies: [] },
      ],
    },
  ]) {
    await expect(
      saveCheckpoint(dir, { ...fixture(), ...change }),
    ).rejects.toThrow();
  }
  expect(await readFile(path.join(dir, "run.json"), "utf8")).toBe(before);
});
it("rejects malformed disk state on load", async () => {
  const dir = await directory();
  await writeFile(
    path.join(dir, "run.json"),
    JSON.stringify({ ...fixture(), cursor: "500" }),
  );
  await expect(loadCheckpoint(dir, hash)).rejects.toThrow(/cursor/i);
});
it("reuses unchanged snapshots but invalidates cross-item dependents when one changes", () => {
  const state = fixture();
  expect(reconcileSnapshots(state, state.inputHashes)).toEqual({
    state,
    invalidatedItemIds: [],
    addedItemIds: [],
    removedItemIds: [],
  });
  const result = reconcileSnapshots(state, {
    page1: "b".repeat(64),
    page2: hash,
    page3: hash,
  });
  expect(result.state.checks).toEqual([]);
  expect(result.invalidatedItemIds).toEqual(["page1", "page2"]);
  expect(result.addedItemIds).toEqual(["page3"]);
  expect(result.state.status).toBe("collecting");
  expect(result.state.cursor).toBe(0);
  expect(state.checks).toHaveLength(2);
});
it("removes stale checks when an input disappears and retains independent results", () => {
  const state = fixture();
  state.checks[1].dependencies = ["page2"];
  const result = reconcileSnapshots(state, { page2: hash });
  expect(result.state.checks).toEqual([state.checks[1]]);
  expect(result.removedItemIds).toEqual(["page1"]);
});
