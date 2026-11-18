import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
const exec = promisify(execFile);
const cli = "skills/content-search-audit/scripts/audit.mjs";
it("runs enterprise intake end-to-end without assessing evidence or overwriting an existing run", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "enterprise-cli-"));
  try {
    const config = path.join(root, "input.json"),
      output = path.join(root, "run");
    await writeFile(
      config,
      JSON.stringify({
        customerId: "a",
        runId: "test-run",
        profileIds: ["commerce", "booking"],
        assessmentAt: "2026-11-18T12:00:00Z",
        entities: [{ entityId: "site", type: "site" }],
      }),
    );
    await exec(process.execPath, [cli, "enterprise-intake", config, output]);
    const run = JSON.parse(
      await readFile(path.join(output, "enterprise-run.json"), "utf8"),
    );
    expect(run.dataRequests.length).toBeGreaterThan(10);
    const result = await exec(process.execPath, [
      cli,
      "enterprise-coverage",
      output,
    ]);
    expect(JSON.parse(result.stdout).modules.tracking.unknown).toBe(1);
    await expect(
      exec(process.execPath, [cli, "enterprise-intake", config, output]),
    ).rejects.toThrow();
    await expect(access(path.join(output, "run.json"))).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
