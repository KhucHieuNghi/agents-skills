import {
  searchConsoleExport,
  analyticsExport,
  bingExport,
  serverLogExport,
} from "./helpers/content-audit-measurements.js";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import {
  redactEvidence,
  redactReport,
} from "../skills/content-search-audit/scripts/lib/redaction.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("exports hashed text derivatives without changing raw snapshots or disclosing policy values", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-redaction-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const page = path.join(content, "a.md");
  await writeFile(
    page,
    "# Contact\nPrivate alice@example.test and token ABC/123.",
  );
  const run = await startAudit(
    {
      inputs: [{ path: page, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
    },
    path.join(root, "run"),
  );
  const originalPage = await readFile(page);
  const original = await readFile(path.join(run.directory, "evidence.jsonl"));
  const policy = { values: ["alice@example.test", "ABC/123"] };
  const output = path.join(root, "redacted");
  const result = await redactEvidence(run.directory, policy, output);
  expect(result.records.length).toBeGreaterThan(0);
  for (const record of result.records) {
    const bytes = await readFile(path.join(output, record.artifact));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.snapshotHash,
    );
    expect(bytes.toString()).not.toContain("alice@example.test");
    expect(bytes.toString()).not.toContain("ABC/123");
    expect(record.artifact).toMatch(/^evidence-[a-f0-9]{64}\.txt$/);
    expect(record.sourceSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
  }
  expect(JSON.stringify(result)).not.toContain("alice@example.test");
  expect(JSON.stringify(result)).not.toContain(page);
  expect(await readFile(path.join(run.directory, "evidence.jsonl"))).toEqual(
    original,
  );
  expect(await readFile(page)).toEqual(originalPage);
  const rawRecords = original
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  for (const raw of rawRecords) {
    const bytes = await readFile(path.join(run.directory, raw.artifact));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      raw.snapshotHash,
    );
  }
  expect(await readdir(output)).not.toContain("config.json");
  await expect(redactEvidence(run.directory, policy, output)).rejects.toThrow(
    /exist/i,
  );
  await expect(
    redactEvidence(run.directory, policy, path.join(content, "export")),
  ).rejects.toThrow(/content root/i);
  await expect(
    redactEvidence(run.directory, { values: [] }, path.join(root, "empty")),
  ).rejects.toThrow(/policy/i);
});

it("exports escaped reports with local derivative links and unchanged coverage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-share-"));
  roots.push(root);
  const content = path.join(root, "private-client");
  await mkdir(content);
  const page = path.join(content, "a.md");
  await writeFile(page, "# Private alice@example.test");
  const run = await startAudit(
    {
      inputs: [{ path: page, source: "private-client" }],
      localRoots: [content],
      inventoryComplete: true,
      brandName: "Private <Alice & Team>",
    },
    path.join(root, "run"),
  );
  const before = await readFile(path.join(run.directory, "run.json"));
  const exported = await redactReport(
    run.directory,
    { values: ["alice@example.test", "<Alice & Team>", content] },
    path.join(root, "share"),
  );
  const html = await readFile(path.join(root, "share/report.html"), "utf8");
  expect(html).toContain("Redacted presentation");
  expect(html).not.toContain("Alice");
  expect(html).not.toContain(content);
  expect(html).not.toContain("alice@example.test");
  for (const record of exported.records)
    expect(html).toContain(`href="${record.artifact}"`);
  for (const record of exported.documents) {
    const bytes = await readFile(path.join(root, "share", record.artifact));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.snapshotHash,
    );
  }
  const coverage = JSON.parse(
    await readFile(path.join(root, "share/coverage.json"), "utf8"),
  );
  expect(coverage.total).toBe(run.coverage.total);
  expect(coverage.complete).toBe(false);
  expect(await readFile(path.join(run.directory, "run.json"))).toEqual(before);
  expect(await readdir(path.join(root, "share"))).not.toContain("config.json");
});

it("shares validated measurement derivatives without copying original export strings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-share-measurements-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const page = path.join(content, "a.md");
  await writeFile(page, "# Example");
  const run = await startAudit(
    {
      inputs: [{ path: page, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
    },
    path.join(root, "run"),
  );
  const options = {
    measurements: JSON.parse(
      await readFile(
        "docs/research/content-search-audit-accuracy-fixture.json",
        "utf8",
      ),
    ),
    searchConsoleExports: [searchConsoleExport()],
    analyticsExports: [analyticsExport()],
    bingExports: [bingExport()],
    serverLogExports: [serverLogExport()],
  };
  const before = JSON.stringify(options);
  const output = path.join(root, "share");
  const result = await redactReport(
    run.directory,
    { values: ["example.com", "supplied locator"] },
    output,
    options,
  );
  const gsc = JSON.parse(
    await readFile(path.join(output, "search-console-evidence.json"), "utf8"),
  );
  expect(gsc.kind).toBe("redacted-measurement-presentation");
  expect(JSON.stringify(gsc.data)).not.toContain("example.com");
  expect(JSON.stringify(gsc.data)).toContain('"clicks":2');
  expect(JSON.stringify(gsc.data)).toContain('"impressions":10');
  const ga4 = await readFile(
    path.join(output, "analytics-evidence.json"),
    "utf8",
  );
  expect(ga4).toContain("9007199254740993");
  expect(
    await readFile(path.join(output, "report.html"), "utf8"),
  ).not.toContain("example.com");
  expect(
    result.documents.some(
      (record) => record.artifact === "server-log-evidence.json",
    ),
  ).toBe(true);
  const observations = (
    await readFile(path.join(output, "ai-observations.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(observations).toHaveLength(1);
  expect(
    observations.every(
      (row) => row.kind === "redacted-measurement-presentation",
    ),
  ).toBe(true);
  expect(JSON.stringify(options)).toBe(before);
});
