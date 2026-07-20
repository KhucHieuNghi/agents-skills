import { execa } from "execa";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runApply } from "../src/commands/apply.js";
import { detectProjectTargets } from "../src/commands/doctor.js";

const fixtureSource = "tests/fixtures/catalog";

async function runCli(arguments_: string[]) {
  const result = await execa(
    process.execPath,
    ["--import", "tsx", "src/cli.ts", ...arguments_],
    { reject: false },
  );
  return {
    exitCode: result.exitCode,
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

describe("CLI commands", () => {
  it("prints a JSON-safe catalog without private source values", async () => {
    const result = await runCli(["catalog", "--source", fixtureSource]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("release-check");
    expect(result.stdout).not.toContain("git@");
  });

  it("requires a source for catalog and validate", async () => {
    const catalog = await runCli(["catalog"]);
    const validate = await runCli(["validate"]);

    expect(catalog.exitCode).toBe(1);
    expect(catalog.stderr).toContain("--source");
    expect(validate.exitCode).toBe(1);
    expect(validate.stderr).toContain("--source");
  });
});

describe("runApply", () => {
  const install = vi.fn();
  const dependencies = {
    apply: install,
    cacheDirectory: "/tmp/agent-skills-cli-test-cache",
    homeDirectory: "/tmp",
    projectDirectory: "/tmp",
  };

  it.each([
    ["unknown targets", { source: fixtureSource, target: "unknown" }],
    [
      "invalid scope",
      { source: fixtureSource, target: "codex", scope: "team" },
    ],
    ["missing skill", { source: fixtureSource, target: "codex" }],
    [
      "global Eve scope",
      { source: fixtureSource, target: "eve", scope: "global" },
    ],
  ])("rejects %s before invoking an installer", async (_name, options) => {
    install.mockClear();

    await expect(
      runApply("missing-skill", options, dependencies),
    ).rejects.toThrow();
    expect(install).not.toHaveBeenCalled();
  });

  it("rejects validation failures before invoking an installer", async () => {
    install.mockClear();

    await expect(
      runApply(
        "wrong-directory",
        { source: "tests/fixtures/invalid-catalog", target: "codex" },
        dependencies,
      ),
    ).rejects.toThrow(/validation/i);
    expect(install).not.toHaveBeenCalled();
  });
});

describe("doctor target detection", () => {
  it("reports only target directories that exist in the project", async () => {
    const projectDirectory = await mkdtemp(
      join(tmpdir(), "agent-skills-doctor-"),
    );
    try {
      await mkdir(join(projectDirectory, ".codex"));
      await mkdir(join(projectDirectory, "agent", "skills"), {
        recursive: true,
      });

      await expect(detectProjectTargets(projectDirectory)).resolves.toEqual([
        "codex",
        "eve",
      ]);
    } finally {
      await rm(projectDirectory, { force: true, recursive: true });
    }
  });

  it("does not report targets when their paths are regular files", async () => {
    const projectDirectory = await mkdtemp(
      join(tmpdir(), "agent-skills-doctor-"),
    );
    try {
      await writeFile(join(projectDirectory, ".codex"), "not a directory");
      await mkdir(join(projectDirectory, "agent"));
      await writeFile(
        join(projectDirectory, "agent", "skills"),
        "not a directory",
      );

      await expect(detectProjectTargets(projectDirectory)).resolves.toEqual([]);
    } finally {
      await rm(projectDirectory, { force: true, recursive: true });
    }
  });
});
