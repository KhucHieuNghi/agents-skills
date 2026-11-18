import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { renderReportRevision } from "../skills/content-search-audit/scripts/lib/report-revision.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";

const roots: string[] = [];
const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
const execute = promisify(execFile);
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function snapshot(directory: string) {
  const files = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return Object.fromEntries(
    await Promise.all(
      files
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filename = path.join(entry.parentPath, entry.name);
          return [path.relative(directory, filename), await readFile(filename)];
        }),
    ),
  );
}
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "audit-report-revision-"));
  roots.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const page = path.join(content, "page.md");
  await writeFile(page, "# Supplied export\nA documented product.\n");
  const source = await startAudit(
    {
      inputs: [{ path: page, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
      brandName: "Customer",
    },
    path.join(root, "source"),
  );
  const sourceText = "Historical synthetic panel: 40 of 100 responses.\n";
  const options = {
    studySources: [
      {
        sourceId: "historical-panel",
        kind: "historical-study",
        locator: "supplied-study.md",
        sourceText,
        sourceHash: createHash("sha256").update(sourceText).digest("hex"),
        scope: "Synthetic API panel collected in February 2024, English.",
        synthetic: true,
        limitations: ["Historical aggregate; no current brand inference."],
        passages: [{ startLine: 1, endLine: 1, quote: sourceText.trim() }],
      },
    ],
  };
  const optionsFile = path.join(root, "options.json");
  await writeFile(optionsFile, JSON.stringify(options));
  return { root, content, source, options, optionsFile };
}
async function render(source: string, options: string, output: string) {
  return execute(process.execPath, [
    cli,
    "render-revision",
    source,
    options,
    output,
  ]);
}

it("renders a complete new folder from an already rendered run with local evidence and historical study links", async () => {
  const { root, source, optionsFile } = await setup();
  const before = await snapshot(source.directory);
  expect(before["report.html"]).toBeDefined();
  const output = path.join(root, "with-study");
  const result = JSON.parse(
    (await render(source.directory, optionsFile, output)).stdout,
  );
  const original = await loadAuditData(source.directory);
  const revised = await loadAuditData(output);
  expect(result.parentRunId).toBe(original.run.runId);
  expect(result.runId).not.toBe(original.run.runId);
  expect(revised.run.configHash).toBe(original.run.configHash);
  expect(revised.evidence).toEqual(original.evidence);
  expect(revised.artifacts).toEqual(original.artifacts);
  expect(revised.checks).toEqual(original.checks);
  expect(revised.findings).toEqual(original.findings);
  expect((await validateAudit(output)).valid).toBe(true);
  const html = await readFile(path.join(output, "report.html"), "utf8");
  expect(html).toContain("Customer");
  expect(html).toContain("Historical synthetic panel: 40 of 100 responses.");
  const links = [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((link) => !/^(?:https?:|#)/.test(link));
  expect(links.some((link) => link.startsWith("evidence/"))).toBe(true);
  expect(links).toContain("study-evidence.json");
  for (const link of links) {
    const filename = path.resolve(output, decodeURIComponent(link));
    expect(path.relative(output, filename).startsWith("..")).toBe(false);
    await access(filename);
  }
  expect(await snapshot(source.directory)).toEqual(before);
  expect(await readFile(path.join(output, "config.json"))).toEqual(
    before["config.json"],
  );
  const delivered = await snapshot(output);
  await expect(render(source.directory, optionsFile, output)).rejects.toThrow();
  expect(await snapshot(output)).toEqual(delivered);
});

it("rejects invalid study options before creating the destination or its parent", async () => {
  const { root, source, options, optionsFile } = await setup();
  const before = await snapshot(source.directory);
  await writeFile(
    optionsFile,
    JSON.stringify({
      studySources: [
        { ...options.studySources[0], scope: { invalid: "object" } },
      ],
    }),
  );
  const parent = path.join(root, "not-created");
  await expect(
    render(source.directory, optionsFile, path.join(parent, "run")),
  ).rejects.toThrow(/Invalid study source/);
  await expect(access(parent)).rejects.toThrow();
  expect(await snapshot(source.directory)).toEqual(before);
});

it("rejects CLI registry overrides before creating output", async () => {
  const { root, source, optionsFile } = await setup();
  await writeFile(optionsFile, JSON.stringify({ registry: { rules: [] } }));
  const output = path.join(root, "override");
  await expect(render(source.directory, optionsFile, output)).rejects.toThrow(
    /registry overrides/,
  );
  await expect(access(output)).rejects.toThrow();
});

it("keeps report revisions outside content roots and the source run", async () => {
  const { content, source, optionsFile } = await setup();
  for (const output of [
    path.join(content, "report"),
    path.join(source.directory, "nested"),
  ]) {
    await expect(render(source.directory, optionsFile, output)).rejects.toThrow(
      /content root|source run/,
    );
    await expect(access(output)).rejects.toThrow();
  }
});

it("requires resupplying an existing historical attachment instead of silently dropping it", async () => {
  const { root, source, optionsFile } = await setup();
  const measured = path.join(root, "measured");
  await render(source.directory, optionsFile, measured);
  const before = await snapshot(measured);
  const emptyOptions = path.join(root, "empty.json");
  await writeFile(emptyOptions, "{}");
  const rejected = path.join(root, "missing-attachment");
  await expect(render(measured, emptyOptions, rejected)).rejects.toThrow(
    /resupply.*studySources/i,
  );
  await expect(access(rejected)).rejects.toThrow();
  const next = path.join(root, "resupplied");
  await render(measured, optionsFile, next);
  expect(await readFile(path.join(next, "study-evidence.json"))).toEqual(
    before["study-evidence.json"],
  );
  expect(await snapshot(measured)).toEqual(before);
});

it("also refuses programmatic registry overrides before output", async () => {
  const { root, source } = await setup();
  const output = path.join(root, "programmatic-override");
  await expect(
    renderReportRevision(source.directory, { registry: { rules: [] } }, output),
  ).rejects.toThrow(/registry overrides/);
  await expect(access(output)).rejects.toThrow();
});
