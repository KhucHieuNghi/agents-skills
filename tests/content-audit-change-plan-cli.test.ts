import { expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { input } from "./helpers/remediation-fixture.js";
async function run(fn: (dir: string, args: string[]) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "plan-cli-"));
  const x = input(),
    { trustedAssetBindings, ...proposal } = x;
  await writeFile(path.join(dir, "input.json"), JSON.stringify(proposal));
  await writeFile(
    path.join(dir, "host.json"),
    JSON.stringify({ trustedAssetBindings, trustedAcceptancePolicies: [] }),
  );
  try {
    await fn(dir, [
      "--input",
      path.join(dir, "input.json"),
      "--host-context",
      path.join(dir, "host.json"),
      "--out",
      path.join(dir, "dossier"),
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const invoke = (args: string[]) =>
  spawnSync(
    process.execPath,
    ["scripts/enterprise-remediation/cli.mjs", ...args],
    { encoding: "utf8", timeout: 5000 },
  );
it("creates and independently verifies a private dossier without overwriting it", async () =>
  run(async (dir, args) => {
    expect(invoke(["render", ...args]).status).toBe(0);
    const original = await readFile(
      path.join(dir, "dossier/plan.json"),
      "utf8",
    );
    expect(invoke(["verify", ...args]).status).toBe(0);
    expect(invoke(["render", ...args]).status).toBe(1);
    expect(await readFile(path.join(dir, "dossier/plan.json"), "utf8")).toBe(
      original,
    );
  }));
it("rejects modified projection bytes and incomplete dossiers", async () =>
  run(async (dir, args) => {
    expect(invoke(["render", ...args]).status).toBe(0);
    await writeFile(path.join(dir, "dossier/plan.html"), "forged");
    expect(invoke(["verify", ...args]).status).toBe(1);
    await rm(path.join(dir, "dossier/manifest.json"));
    expect(invoke(["verify", ...args]).status).toBe(1);
  }));
it("rejects duplicate JSON, imported host fields and unknown CLI options", async () =>
  run(async (dir, args) => {
    expect(invoke(["render", ...args, "--execute"]).status).toBe(1);
    await writeFile(
      path.join(dir, "input.json"),
      '{"planId":"a","planId":"b"}',
    );
    expect(invoke(["render", ...args]).status).toBe(1);
    await writeFile(path.join(dir, "input.json"), JSON.stringify(input()));
    expect(invoke(["render", ...args]).status).toBe(1);
  }));
it("rejects symlinked inputs and does not echo input contents on failure", async () =>
  run(async (dir, args) => {
    await rm(path.join(dir, "input.json"));
    await writeFile(path.join(dir, "secret.json"), "PRIVATE-CUSTOMER-DATA");
    await symlink(path.join(dir, "secret.json"), path.join(dir, "input.json"));
    const result = invoke(["render", ...args]);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(
      "PRIVATE-CUSTOMER-DATA",
    );
  }));

it("keeps a missing host mapping actionable instead of blocking draft reporting", async () =>
  run(async (dir, args) => {
    await writeFile(
      path.join(dir, "host.json"),
      JSON.stringify({
        trustedAssetBindings: [],
        trustedAcceptancePolicies: [],
      }),
    );
    expect(invoke(["render", ...args]).status).toBe(0);
    const plan = JSON.parse(
      await readFile(path.join(dir, "dossier/plan.json"), "utf8"),
    );
    expect(plan.entries[0].executionAllowed).toBe(false);
    expect(plan.entries[0].gaps).toContain("asset-mapping-required");
    expect(
      plan.entries[0].dataRequests.some(
        (r: { reason: string }) => r.reason === "asset-mapping-required",
      ),
    ).toBe(true);
    expect(invoke(["verify", ...args]).status).toBe(0);
  }));
it("requires the current source and host binding again when verifying", async () =>
  run(async (dir, args) => {
    expect(invoke(["render", ...args]).status).toBe(0);
    await writeFile(
      path.join(dir, "host.json"),
      JSON.stringify({
        trustedAssetBindings: [],
        trustedAcceptancePolicies: [],
      }),
    );
    expect(invoke(["verify", ...args]).status).toBe(1);
  }));

it("rejects manifest byte changes even when the parsed hashes are identical", async () =>
  run(async (dir, args) => {
    expect(invoke(["render", ...args]).status).toBe(0);
    const name = path.join(dir, "dossier/manifest.json");
    const manifest = JSON.parse(await readFile(name, "utf8"));
    await writeFile(name, JSON.stringify(manifest));
    expect(invoke(["verify", ...args]).status).toBe(1);
  }));

it("rejects an amplification budget before planning or creating output", async () =>
  run(async (dir, args) => {
    const filename = path.join(dir, "input.json");
    const proposal = JSON.parse(await readFile(filename, "utf8"));
    proposal.proposals = Array.from({ length: 20 }, (_, i) => ({
      ...proposal.proposals[0],
      changeId: "change-" + i,
    }));
    await writeFile(filename, JSON.stringify(proposal) + " ".repeat(120000));
    const result = invoke(["render", ...args]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expansion-budget");
    await expect(
      readFile(path.join(dir, "dossier/plan.json")),
    ).rejects.toThrow();
  }));
