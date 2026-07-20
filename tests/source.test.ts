import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redactSourceError, stageSource } from "../src/source.js";
import type { CommandRunner } from "../src/types.js";

function createRecordingRunner(): {
  calls: Array<{ command: string; arguments: string[]; cwd?: string }>;
  runner: CommandRunner;
} {
  const calls: Array<{ command: string; arguments: string[]; cwd?: string }> = [];

  return {
    calls,
    runner: {
      async run(command, arguments_, cwd) {
        calls.push({ command, arguments: arguments_, cwd });
      },
    },
  };
}

describe("stageSource", () => {
  it("uses a local source without copying it", async () => {
    await expect(
      stageSource({ kind: "path", value: "tests/fixtures/catalog" }, "/tmp/cache"),
    ).resolves.toMatchObject({
      directory: expect.stringMatching(/tests\/fixtures\/catalog$/),
      cached: false,
    });
  });

  it("clones a Git source into a deterministic cache path", async () => {
    const { calls, runner } = createRecordingRunner();
    const source = "https://example.test/private-skills.git";
    const cacheDirectory = await mkdtemp(join(tmpdir(), "agent-skills-source-"));

    try {
      const staged = await stageSource(
        { kind: "git", value: source },
        cacheDirectory,
        runner,
      );

      expect(staged).toMatchObject({ cached: true });
      expect(staged.directory).toMatch(new RegExp(`^${cacheDirectory}/[a-f0-9]{64}$`));
      expect(calls).toEqual([
        {
          command: "git",
          arguments: ["clone", "--", source, staged.directory],
          cwd: undefined,
        },
      ]);
    } finally {
      await rm(cacheDirectory, { force: true, recursive: true });
    }
  });

  it("updates an existing Git cache with fetch then fast-forward-only pull", async () => {
    const { calls, runner } = createRecordingRunner();
    const source = "https://example.test/private-skills.git";
    const cacheDirectory = await mkdtemp(join(tmpdir(), "agent-skills-source-"));

    try {
      const staged = await stageSource(
        { kind: "git", value: source },
        cacheDirectory,
        runner,
      );
      await mkdir(staged.directory);

      await stageSource(
        { kind: "git", value: source },
        cacheDirectory,
        runner,
      );

      expect(calls).toEqual([
        {
          command: "git",
          arguments: ["clone", "--", source, staged.directory],
          cwd: undefined,
        },
        { command: "git", arguments: ["fetch", "--prune"], cwd: staged.directory },
        { command: "git", arguments: ["pull", "--ff-only"], cwd: staged.directory },
      ]);
    } finally {
      await rm(cacheDirectory, { force: true, recursive: true });
    }
  });

  it("redacts credentials from Git command failures", async () => {
    const runner: CommandRunner = {
      async run() {
        throw new Error(
          "fatal: https://user:secret@example.test/private-skills.git failed",
        );
      },
    };
    const cacheDirectory = await mkdtemp(join(tmpdir(), "agent-skills-source-"));

    try {
      await expect(
        stageSource(
          { kind: "git", value: "https://example.test/private-skills.git" },
          cacheDirectory,
          runner,
        ),
      ).rejects.toThrow(
        "fatal: https://user:<redacted>@example.test/private-skills.git failed",
      );
    } finally {
      await rm(cacheDirectory, { force: true, recursive: true });
    }
  });
});

describe("redactSourceError", () => {
  it("redacts URL credentials in command failures", () => {
    expect(
      redactSourceError(
        "fatal: https://user:secret@example.test/skills.git failed",
      ),
    ).toBe("fatal: https://user:<redacted>@example.test/skills.git failed");
  });
});
