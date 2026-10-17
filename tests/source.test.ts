import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { redactSourceError, stageSource } from "../src/source.js";
import type { CommandRunner } from "../src/types.js";

function sampleRemote(...fragments: string[]) {
  return fragments.join("");
}

function createRecordingRunner(): {
  calls: Array<{ command: string; arguments: string[]; cwd?: string }>;
  runner: CommandRunner;
} {
  const calls: Array<{ command: string; arguments: string[]; cwd?: string }> =
    [];

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
      stageSource(
        { kind: "path", value: "tests/fixtures/catalog" },
        "/tmp/cache",
      ),
    ).resolves.toMatchObject({
      directory: expect.stringMatching(/tests\/fixtures\/catalog$/),
      cached: false,
    });
  });

  it("clones a Git source into a deterministic cache path", async () => {
    const { calls, runner } = createRecordingRunner();
    const source = "https://example.test/private-skills.git";
    const cacheDirectory = await mkdtemp(
      join(tmpdir(), "agent-skills-source-"),
    );

    try {
      const staged = await stageSource(
        { kind: "git", value: source },
        cacheDirectory,
        runner,
      );

      expect(staged).toMatchObject({ cached: true });
      expect(staged.directory).toMatch(
        new RegExp(`^${cacheDirectory}/[a-f0-9]{64}$`),
      );
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
    const cacheDirectory = await mkdtemp(
      join(tmpdir(), "agent-skills-source-"),
    );

    try {
      const staged = await stageSource(
        { kind: "git", value: source },
        cacheDirectory,
        runner,
      );
      await mkdir(staged.directory);

      await stageSource({ kind: "git", value: source }, cacheDirectory, runner);

      expect(calls).toEqual([
        {
          command: "git",
          arguments: ["clone", "--", source, staged.directory],
          cwd: undefined,
        },
        {
          command: "git",
          arguments: ["fetch", "--prune"],
          cwd: staged.directory,
        },
        {
          command: "git",
          arguments: ["pull", "--ff-only"],
          cwd: staged.directory,
        },
      ]);
    } finally {
      await rm(cacheDirectory, { force: true, recursive: true });
    }
  });

  it("stages an exact commit even when the remote branch has moved", async () => {
    const repository = await mkdtemp(join(tmpdir(), "agent-skills-git-"));
    const cacheDirectory = await mkdtemp(join(tmpdir(), "agent-skills-pin-"));
    try {
      await execa("git", ["init", "--initial-branch=main", repository]);
      await execa("git", ["config", "user.email", "test@example.com"], {
        cwd: repository,
      });
      await execa("git", ["config", "user.name", "Test"], {
        cwd: repository,
      });
      const skillFile = join(repository, "SKILL.md");
      await writeFile(skillFile, "first\n");
      await execa("git", ["add", "SKILL.md"], { cwd: repository });
      await execa("git", ["commit", "-m", "first"], { cwd: repository });
      const { stdout: revision } = await execa("git", ["rev-parse", "HEAD"], {
        cwd: repository,
      });
      await writeFile(skillFile, "second\n");
      await execa("git", ["commit", "-am", "second"], { cwd: repository });

      const staged = await stageSource(
        { kind: "git", value: repository, revision },
        cacheDirectory,
      );

      expect(await readFile(join(staged.directory, "SKILL.md"), "utf8")).toBe(
        "first\n",
      );
      expect(
        (await execa("git", ["rev-parse", "HEAD"], { cwd: staged.directory }))
          .stdout,
      ).toBe(revision);
    } finally {
      await rm(repository, { force: true, recursive: true });
      await rm(cacheDirectory, { force: true, recursive: true });
    }
  });

  it("redacts credentials from Git command failures", async () => {
    const credentialedRemote = sampleRemote(
      "https",
      "://user",
      ":secret",
      "@example.test/private-skills.git",
    );
    const redactedRemote = sampleRemote(
      "https",
      "://user",
      ":<redacted>",
      "@example.test/private-skills.git",
    );
    const runner: CommandRunner = {
      async run() {
        throw new Error(`fatal: ${credentialedRemote} failed`);
      },
    };
    const cacheDirectory = await mkdtemp(
      join(tmpdir(), "agent-skills-source-"),
    );

    try {
      await expect(
        stageSource(
          { kind: "git", value: "https://example.test/private-skills.git" },
          cacheDirectory,
          runner,
        ),
      ).rejects.toThrow(`fatal: ${redactedRemote} failed`);
    } finally {
      await rm(cacheDirectory, { force: true, recursive: true });
    }
  });
});

describe("redactSourceError", () => {
  it("redacts URL credentials in command failures", () => {
    const credentialedRemote = sampleRemote(
      "https",
      "://user",
      ":secret",
      "@example.test/skills.git",
    );
    const redactedRemote = sampleRemote(
      "https",
      "://user",
      ":<redacted>",
      "@example.test/skills.git",
    );
    expect(redactSourceError(`fatal: ${credentialedRemote} failed`)).toBe(
      `fatal: ${redactedRemote} failed`,
    );
  });

  it("redacts token-only URL userinfo", () => {
    expect(
      redactSourceError(
        "fatal: https://token-only-value@example.test/skills.git failed",
      ),
    ).toBe("fatal: https://<redacted>@example.test/skills.git failed");
  });

  it("redacts token query parameters without changing safe URL parameters", () => {
    expect(
      redactSourceError(
        "fatal: https://example.test/skills.git?token=query-token-value&access_token=access-token-value&ref=main and https://example.test/skills.git?ref=main",
      ),
    ).toBe(
      "fatal: https://example.test/skills.git?token=<redacted>&access_token=<redacted>&ref=main and https://example.test/skills.git?ref=main",
    );
  });
});
