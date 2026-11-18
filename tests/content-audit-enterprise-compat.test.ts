import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  loadCheckpoint,
  reconcileSnapshots,
  validateState,
} from "../skills/content-search-audit/scripts/lib/state.mjs";

const directory = "tests/fixtures/content-audit/enterprise/legacy";
const raw = await readFile(`${directory}/run.json`, "utf8");
const checkpoint = JSON.parse(raw);
const baseline = JSON.parse(
  await readFile(`${directory}/baseline.json`, "utf8"),
);

it("preserves a frozen historical checkpoint including unknown outcomes and scope", async () => {
  expect(createHash("sha256").update(raw).digest("hex")).toBe(
    baseline.sourceSha256,
  );
  expect(await readFile(baseline.source, "utf8")).toBe(raw);
  const loaded = await loadCheckpoint(directory, checkpoint.configHash);
  expect(loaded).toEqual(checkpoint);
  expect(
    loaded.checks.some(
      (check: { status: string }) => check.status === "unknown",
    ),
  ).toBe(true);
  expect(loaded.status).toBe("partial");
  expect(loaded.mode).toBe("full");
  expect(reconcileSnapshots(loaded, loaded.inputHashes).state).toEqual(
    checkpoint,
  );
});

it("rejects unknown checkpoint schemas rather than treating them as legacy", () => {
  for (const schemaVersion of [0, 2, "1", null]) {
    expect(() => validateState({ ...checkpoint, schemaVersion })).toThrow(
      /identity/,
    );
  }
});

it("rejects scenario collisions in the legacy loader so enterprise needs a separate state contract", () => {
  const first = checkpoint.checks[0];
  expect(() =>
    validateState({
      ...checkpoint,
      checks: [
        { ...first, scenarioId: "consent-accepted" },
        { ...first, scenarioId: "consent-denied" },
      ],
    }),
  ).toThrow(/Duplicate/);
});
