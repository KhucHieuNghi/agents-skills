import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
const digest = /^[a-f0-9]{64}$/;
const lifecycle = new Set([
  "planned",
  "collecting",
  "analyzing",
  "validating",
  "complete",
  "partial",
]);
const outcomes = new Set(["pass", "fail", "unknown", "not-applicable"]);
function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function validateHashes(hashes) {
  if (!hashes || typeof hashes !== "object" || Array.isArray(hashes))
    throw new Error("Invalid inputHashes");
  for (const [id, hash] of Object.entries(hashes))
    if (!nonempty(id) || typeof hash !== "string" || !digest.test(hash))
      throw new Error("Invalid input hash");
}
export function validateState(state) {
  if (
    !state ||
    state.schemaVersion !== 1 ||
    !nonempty(state.runId) ||
    !nonempty(state.version)
  )
    throw new Error("Invalid run identity");
  if (typeof state.configHash !== "string" || !digest.test(state.configHash))
    throw new Error("Invalid configuration hash");
  if (!lifecycle.has(state.status)) throw new Error("Invalid run status");
  if (!Number.isSafeInteger(state.cursor) || state.cursor < 0)
    throw new Error("Invalid cursor");
  if (
    !nonempty(state.updatedAt) ||
    !Number.isFinite(Date.parse(state.updatedAt))
  )
    throw new Error("Invalid checkpoint timestamp");
  validateHashes(state.inputHashes);
  if (!Array.isArray(state.checks)) throw new Error("Invalid checks");
  const keys = new Set();
  for (const check of state.checks) {
    if (
      !check ||
      !nonempty(check.itemId) ||
      !Object.hasOwn(state.inputHashes, check.itemId) ||
      !nonempty(check.ruleId) ||
      !outcomes.has(check.status)
    )
      throw new Error("Invalid checkpoint check");
    const key = JSON.stringify([check.itemId, check.ruleId]);
    if (keys.has(key)) throw new Error("Duplicate checkpoint check");
    keys.add(key);
    if (
      !Array.isArray(check.dependencies) ||
      !check.dependencies.includes(check.itemId) ||
      check.dependencies.some(
        (id) => !nonempty(id) || !Object.hasOwn(state.inputHashes, id),
      )
    )
      throw new Error("Invalid check dependencies");
  }
  return state;
}
/** Single-writer checkpoint: atomic replacement, not a multi-process lock.
 * This validates recovery state, not final report completeness. */
export async function saveCheckpoint(runDirectory, state) {
  validateState(state);
  const serialized = JSON.stringify(state, null, 2) + "\n";
  await mkdir(runDirectory, { recursive: true });
  const temporary = path.join(runDirectory, `.run-${randomUUID()}.tmp`);
  let file;
  try {
    file = await open(temporary, "wx", 0o600);
    await file.writeFile(serialized, "utf8");
    await file.sync();
    await file.close();
    file = undefined;
    await rename(temporary, path.join(runDirectory, "run.json"));
  } finally {
    await file?.close();
    await rm(temporary, { force: true });
  }
}
export async function loadCheckpoint(runDirectory, configHash) {
  const state = validateState(
    JSON.parse(await readFile(path.join(runDirectory, "run.json"), "utf8")),
  );
  if (state.configHash !== configHash)
    throw new Error("Checkpoint configuration differs; create a new run");
  return state;
}
/** Dependencies include all source snapshots used by a cross-item check.
 * Snapshot changes reset the cursor; matching per-item results remain reusable. */
export function reconcileSnapshots(previous, inputHashes) {
  validateState(previous);
  validateHashes(inputHashes);
  const state = globalThis.structuredClone(previous);
  const changed = new Set(
    Object.keys(previous.inputHashes).filter(
      (id) => previous.inputHashes[id] !== inputHashes[id],
    ),
  );
  const addedItemIds = Object.keys(inputHashes)
    .filter((id) => !Object.hasOwn(previous.inputHashes, id))
    .sort();
  const removedItemIds = Object.keys(previous.inputHashes)
    .filter((id) => !Object.hasOwn(inputHashes, id))
    .sort();
  const invalidated = new Set(changed);
  state.checks = state.checks.filter((check) => {
    if (check.dependencies.some((id) => changed.has(id))) {
      invalidated.add(check.itemId);
      return false;
    }
    return true;
  });
  state.inputHashes = { ...inputHashes };
  if (changed.size || addedItemIds.length) {
    state.cursor = 0;
    state.status = "collecting";
  }
  return {
    state,
    invalidatedItemIds: [...invalidated].sort(),
    addedItemIds,
    removedItemIds,
  };
}
