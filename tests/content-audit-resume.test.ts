import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { reviewAudit } from "../skills/content-search-audit/scripts/lib/review.mjs";
import { resumeAudit } from "../skills/content-search-audit/scripts/lib/resume.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function setup(count = 2) {
  const root = await mkdtemp(path.join(tmpdir(), "audit-resume-"));
  dirs.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const inputs = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const file = path.join(content, `${i}.md`);
      await writeFile(file, `# Page ${i}`);
      return { path: file, source: "fixture" };
    }),
  );
  const config = { inputs, localRoots: [content], inventoryComplete: true };
  const started = await startAudit(config, path.join(root, "initial"));
  return { root, content, config, started };
}
it("retains unchanged reviews and invalidates changed snapshots without altering the old run", async () => {
  const { root, config, started } = await setup();
  const data = await loadAuditData(started.directory);
  const reviews = data.inventory.map((item) => ({
    itemId: item.itemId,
    ruleId: "seo-response",
    status: "not-applicable",
    reason: "Offline source applicability only",
    reviewer: "fixture",
    reviewedAt: new Date().toISOString(),
    evidenceIds: [
      data.evidence.find((e) => e.itemId === item.itemId).evidenceId,
    ],
  }));
  const reviewed = await reviewAudit(
    started.directory,
    { reviews },
    path.join(root, "reviewed"),
  );
  const before = await readFile(path.join(reviewed.directory, "run.json"));
  await writeFile(config.inputs[0].path, "# Changed source");
  const resumed = await resumeAudit(
    reviewed.directory,
    config,
    path.join(root, "resumed"),
  );
  const current = await loadAuditData(resumed.directory);
  expect(
    current.checks.filter(
      (c) => c.ruleId === "seo-response" && c.status === "not-applicable",
    ),
  ).toHaveLength(1);
  expect(resumed.reconciliation.invalidatedItemIds).toHaveLength(1);
  expect(await readFile(path.join(reviewed.directory, "run.json"))).toEqual(
    before,
  );
  expect((await validateAudit(resumed.directory)).valid).toBe(true);
});
it("recollects all 1200 declared inputs without a sample or fixed page cap", async () => {
  const { root, config, started } = await setup(1200);
  const resumed = await resumeAudit(
    started.directory,
    config,
    path.join(root, "resumed"),
  );
  expect(resumed.coverage.total).toBe(1200);
  const data = await loadAuditData(resumed.directory);
  expect(data.checks).toHaveLength(1200 * 26);
  expect(data.run.cursor).toBe(1200);
  expect(resumed.reconciliation.addedItemIds).toEqual([]);
  expect(resumed.coverage.complete).toBe(false);
}, 60000);

it("invalidates cross-item evidence when a dependency changes", async () => {
  const { root, config, started } = await setup();
  const data = await loadAuditData(started.directory);
  const [a, b] = data.inventory;
  const ea = data.evidence.find((e) => e.itemId === a.itemId),
    eb = data.evidence.find((e) => e.itemId === b.itemId);
  const derived = {
    ...ea,
    evidenceId: "cross-item-applicability",
    sourceEvidenceIds: [ea.evidenceId, eb.evidenceId],
  };
  const reviewed = await reviewAudit(
    started.directory,
    {
      evidence: [derived],
      reviews: [
        {
          itemId: a.itemId,
          ruleId: "seo-response",
          status: "not-applicable",
          reason: "Synthetic cross-item applicability assessment",
          reviewer: "fixture",
          reviewedAt: new Date().toISOString(),
          evidenceIds: [derived.evidenceId],
        },
      ],
    },
    path.join(root, "reviewed"),
  );
  const bSource = data.evidence.find((e) => e.itemId === b.itemId).locator;
  await writeFile(bSource, "# Changed dependency");
  const resumed = await resumeAudit(
    reviewed.directory,
    config,
    path.join(root, "resumed"),
  );
  const current = await loadAuditData(resumed.directory);
  expect(
    current.checks.find(
      (c) => c.itemId === a.itemId && c.ruleId === "seo-response",
    ).status,
  ).toBe("unknown");
  expect(
    current.evidence.some((e) => e.evidenceId === derived.evidenceId),
  ).toBe(false);
  expect(resumed.reconciliation.invalidatedItemIds).toContain(a.itemId);
});
it("reports added and removed inventory and refuses reuse after a scope change", async () => {
  const { root, config, started } = await setup();
  const extra = path.join(config.localRoots[0], "new.md");
  await writeFile(extra, "# Added");
  const changed = {
    ...config,
    inputs: [config.inputs[1], { path: extra, source: "fixture" }],
  };
  const resumed = await resumeAudit(
    started.directory,
    changed,
    path.join(root, "resumed"),
  );
  expect(resumed.reconciliation.configurationChanged).toBe(true);
  expect(resumed.reconciliation.reusedCheckCount).toBe(0);
  expect(resumed.reconciliation.addedItemIds).toHaveLength(1);
  expect(resumed.reconciliation.removedItemIds).toHaveLength(1);
  expect(resumed.coverage.total).toBe(2);
});

it("resumes a valid interrupted checkpoint through the standalone command without skipping pending items", async () => {
  const { root, config, started } = await setup(3);
  const data = await loadAuditData(started.directory);
  const first = data.inventory[0].itemId;
  const checks = data.checks.filter((c) => c.itemId === first);
  const evidence = data.evidence.filter((e) => e.itemId === first);
  const jsonl = (values: unknown[]) =>
    values.map((value) => JSON.stringify(value)).join("\n") + "\n";
  // Simulate a persisted collection boundary, not a crash between manifest writes.
  await writeFile(path.join(started.directory, "checks.jsonl"), jsonl(checks));
  await writeFile(
    path.join(started.directory, "evidence.jsonl"),
    jsonl(evidence),
  );
  await writeFile(
    path.join(started.directory, "run.json"),
    JSON.stringify({
      ...data.run,
      status: "collecting",
      cursor: 1,
      pendingQueue: ["unresolved-discovery-item"],
      checks,
      inputHashes: { [first]: data.run.inputHashes[first] },
    }),
  );
  expect((await validateAudit(started.directory)).valid).toBe(true);
  const configFile = path.join(root, "config.json");
  await writeFile(configFile, JSON.stringify(config));
  const result = await promisify(execFile)(process.execPath, [
    path.resolve("skills/content-search-audit/scripts/audit.mjs"),
    "resume",
    started.directory,
    configFile,
    path.join(root, "resumed"),
  ]);
  const resumed = JSON.parse(result.stdout);
  const current = await loadAuditData(resumed.directory);
  expect(current.run.cursor).toBe(3);
  expect(resumed.coverage.pendingQueueCount).toBe(1);
  expect(current.evidence).toHaveLength(3);
  expect(current.checks).toHaveLength(78);
  expect(resumed.coverage.total).toBe(3);
});
