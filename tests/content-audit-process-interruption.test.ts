import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { resumeAudit } from "../skills/content-search-audit/scripts/lib/resume.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";

async function hashes(directory: string) {
  const result: Record<string, string> = {};
  async function visit(relative: string) {
    for (const entry of await readdir(path.join(directory, relative), {
      withFileTypes: true,
    })) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(name);
      else
        result[name] = createHash("sha256")
          .update(await readFile(path.join(directory, name)))
          .digest("hex");
    }
  }
  await visit("");
  return result;
}

it("recovers all records after SIGKILL at an observed committed collection checkpoint", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-process-kill-"));
  const content = path.join(root, "content");
  const stopped = path.join(root, "stopped");
  let child: ReturnType<typeof spawn> | undefined;
  try {
    await mkdir(content);
    const inputs = [];
    for (let i = 0; i < 1200; i++) {
      const file = path.join(content, `${i}.md`);
      await writeFile(file, `# Unique record ${i}\n`);
      inputs.push({ path: file, source: "process-interruption" });
    }
    const config = { inputs, localRoots: [content], inventoryComplete: true };
    const configPath = path.join(root, "config.json");
    await writeFile(configPath, JSON.stringify(config));
    const originalInputs = await hashes(content);
    child = spawn(
      process.execPath,
      [
        path.resolve("skills/content-search-audit/scripts/audit.mjs"),
        "start",
        configPath,
        stopped,
      ],
      { stdio: "ignore" },
    );
    const terminated = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve, reject) => {
      child!.once("error", reject);
      child!.once("close", (code, signal) => resolve({ code, signal }));
    });
    let observedCursor = 0;
    const deadline = Date.now() + 20000;
    while (
      child.exitCode === null &&
      child.signalCode === null &&
      Date.now() < deadline
    ) {
      try {
        const state = JSON.parse(
          await readFile(path.join(stopped, "run.json"), "utf8"),
        );
        if (
          state.status === "collecting" &&
          state.cursor >= 500 &&
          state.cursor < 1200
        ) {
          observedCursor = state.cursor;
          child.kill("SIGKILL");
          break;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      await delay(2);
    }
    if (!observedCursor) child.kill("SIGKILL");
    const exit = await terminated;
    expect(observedCursor).toBeGreaterThanOrEqual(500);
    expect(exit.signal).toBe("SIGKILL");
    // This probes a committed boundary; it does not simulate transactional writes.
    expect((await validateAudit(stopped)).valid).toBe(true);
    const stoppedHashes = await hashes(stopped);
    const result = await resumeAudit(
      stopped,
      config,
      path.join(root, "recovered"),
    );
    const data = await loadAuditData(result.directory);
    expect(data.run.cursor).toBe(1200);
    expect(data.inventory).toHaveLength(1200);
    expect(new Set(data.inventory.map((item) => item.itemId)).size).toBe(1200);
    expect(data.evidence).toHaveLength(1200);
    expect(data.checks).toHaveLength(31200);
    const validation = await validateAudit(result.directory);
    expect(validation.valid).toBe(true);
    expect(validation.completionAllowed).toBe(false);
    expect(validation.coverage.missingChecks).toEqual([]);
    expect(await hashes(stopped)).toEqual(stoppedHashes);
    expect(await hashes(content)).toEqual(originalInputs);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
    await rm(root, { recursive: true, force: true });
  }
}, 60000);
