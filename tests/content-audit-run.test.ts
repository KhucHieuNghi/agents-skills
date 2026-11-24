import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
const dirs: string[] = [];
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "audit-run-"));
  dirs.push(root);
  const contentRoot = path.join(root, "content");
  await mkdir(contentRoot);
  const page = path.join(contentRoot, "page.md");
  const pdf = path.join(contentRoot, "guide.pdf");
  await writeFile(page, "\uFEFF# Product\nRead-only source\n");
  await writeFile(pdf, "%PDF-example");
  return {
    root,
    contentRoot,
    page,
    config: {
      inputs: [
        { path: page, source: "export" },
        { path: pdf, source: "export" },
      ],
      localRoots: [contentRoot],
      inventoryComplete: true,
      brandName: "Fixture customer",
    },
  };
}
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
it("runs declared offline inventory through collection, validation and report generation", async () => {
  const { root, page, config } = await setup();
  const before = await readFile(page);
  const result = await startAudit(config, path.join(root, "run"));
  expect(result.coverage.total).toBe(2);
  expect(result.coverage.states.unsupported).toBe(1);
  expect(result.coverage.complete).toBe(false);
  const validation = await validateAudit(result.directory);
  expect(validation.errors).toEqual([]);
  const checks = (
    await readFile(path.join(result.directory, "checks.jsonl"), "utf8")
  )
    .trim()
    .split("\n");
  expect(checks).toHaveLength(52);
  expect(
    await readFile(path.join(result.directory, "report.html"), "utf8"),
  ).toContain("Partial");
  expect(await readFile(page)).toEqual(before);
  const persisted = JSON.parse(
    await readFile(path.join(result.directory, "run.json"), "utf8"),
  );
  expect(persisted.cursor).toBe(2);
  expect(persisted.status).toBe("partial");
});
it("refuses output inside content roots, existing runs and undisclosed inventory completeness", async () => {
  const { root, contentRoot, config } = await setup();
  await expect(
    startAudit(config, path.join(contentRoot, "audit")),
  ).rejects.toThrow(/content root/i);
  const run = path.join(root, "run");
  await mkdir(run);
  await expect(startAudit(config, run)).rejects.toThrow(/exist/i);
  await expect(
    startAudit(
      { ...config, inventoryComplete: undefined },
      path.join(root, "other"),
    ),
  ).rejects.toThrow(/completeness/i);
});
it("records public URLs as blocked in offline mode without pretending they were fetched", async () => {
  const { root, config } = await setup();
  const result = await startAudit(
    {
      ...config,
      inputs: [{ uri: "https://example.com/", source: "supplied" }],
    },
    path.join(root, "run"),
  );
  expect(result.coverage.states.blocked).toBe(1);
  expect(result.coverage.audited).toBe(0);
  expect((await validateAudit(result.directory)).valid).toBe(true);
});

it("runs the installed-style dispatcher in a separate Node process", async () => {
  const { root, config } = await setup();
  const configFile = path.join(root, "config.json");
  await writeFile(
    configFile,
    JSON.stringify({ ...config, reportLocale: "vi" }),
  );
  const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
  const execute = promisify(execFile);
  const started = await execute(process.execPath, [
    cli,
    "start",
    configFile,
    path.join(root, "cli-run"),
  ]);
  const result = JSON.parse(started.stdout);
  expect(result.status).toBe("partial");
  const html = await readFile(
    path.join(result.directory, "report.html"),
    "utf8",
  );
  expect(html).toContain('<html lang="vi">');
  expect(html).toContain("Kiểm tra một phần");
  expect(html).toContain("Việc cần ưu tiên");
  const validated = await execute(process.execPath, [
    cli,
    "validate",
    result.directory,
  ]);
  expect(JSON.parse(validated.stdout).valid).toBe(true);
  await expect(
    execute(process.execPath, [cli, "render", result.directory]),
  ).rejects.toThrow(/exists/i);
});

it("persists configuration-bound scope, permissions and effective budgets", async () => {
  const { root, config } = await setup();
  const result = await startAudit(config, path.join(root, "metadata"));
  const file = path.join(result.directory, "run.json");
  const original = JSON.parse(await readFile(file, "utf8"));
  expect(original.contractVersion).toBe(1);
  expect(original.scope.inputs).toEqual(config.inputs);
  expect(original.scope.mode).toBe("full");
  expect(original.sourcePermissions).toEqual({
    localRoots: config.localRoots,
    network: null,
  });
  expect(original.budgets).toEqual({
    maxRunBytes: 100663296,
    maxLocalBytes: 10485760,
    network: null,
  });
  for (const edit of [
    (run: typeof original) => {
      run.scope.inputs = [];
    },
    (run: typeof original) => {
      run.sourcePermissions.network = {
        allowedOrigins: ["https://other.example"],
      };
    },
    (run: typeof original) => {
      run.budgets.maxRunBytes = 1048576;
    },
    (run: typeof original) => {
      delete run.scope;
    },
    (run: typeof original) => {
      run.mode = "sample";
    },
  ]) {
    const changed = structuredClone(original);
    edit(changed);
    await writeFile(file, JSON.stringify(changed));
    expect((await validateAudit(result.directory)).valid).toBe(false);
  }
  await writeFile(file, JSON.stringify(original));
  await writeFile(
    path.join(result.directory, "config.json"),
    JSON.stringify({ ...config, brandName: "changed" }),
  );
  expect((await validateAudit(result.directory)).valid).toBe(false);
});

it("keeps supplied transcripts, missing transcripts and unextracted audio independently accounted", async () => {
  const { root, contentRoot, config } = await setup();
  const transcript = path.join(contentRoot, "onboarding-vi.txt");
  const missing = path.join(contentRoot, "unavailable-transcript.txt");
  const audio = path.join(contentRoot, "silent-control.wav");
  const text = "Bản ghi được cung cấp: chọn vùng Miền Tây.\n";
  await writeFile(transcript, text);
  // A real 10 ms silent PCM WAV, unrelated to the supplied transcript.
  // This exercises availability accounting, not speech recognition.
  const wave = Buffer.alloc(124, 128);
  wave.write("RIFF", 0);
  wave.writeUInt32LE(116, 4);
  wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(8000, 24);
  wave.writeUInt32LE(8000, 28);
  wave.writeUInt16LE(1, 32);
  wave.writeUInt16LE(8, 34);
  wave.write("data", 36);
  wave.writeUInt32LE(80, 40);
  await writeFile(audio, wave);
  const result = await startAudit(
    {
      ...config,
      inputs: [
        { path: transcript, source: "cms", type: "transcript", locale: "vi" },
        {
          path: transcript,
          source: "repository",
          type: "transcript",
          locale: "vi",
        },
        { path: missing, source: "cms", type: "transcript" },
        { path: audio, source: "repository", type: "audio" },
      ],
    },
    path.join(root, "transcript-run"),
  );
  const audit = await loadAuditData(result.directory);
  const supplied = audit.inventory.find((item) => item.path === transcript);
  expect(supplied.sources).toEqual(["cms", "repository"]);
  expect(supplied.locale).toBe("vi");
  expect(supplied.type).toBe("transcript");
  expect(supplied.state).toBe("pending");
  expect(audit.inventory.find((item) => item.path === missing).state).toBe(
    "failed",
  );
  expect(audit.inventory.find((item) => item.path === audio).state).toBe(
    "unsupported",
  );
  expect(audit.evidence).toHaveLength(1);
  expect(audit.evidence[0].itemId).toBe(supplied.itemId);
  expect(audit.evidence[0].value).toBe(text);
  expect(
    await readFile(
      path.join(result.directory, audit.evidence[0].artifact),
      "utf8",
    ),
  ).toBe(text);
  expect(audit.findings).toEqual([]);
  expect(result.coverage.total).toBe(3);
  expect(result.coverage.states).toMatchObject({
    pending: 1,
    failed: 1,
    unsupported: 1,
    audited: 0,
  });
  expect((await validateAudit(result.directory)).completionAllowed).toBe(false);
  expect(await readFile(audio)).toEqual(wave);
  expect(await readFile(transcript, "utf8")).toBe(text);
});
