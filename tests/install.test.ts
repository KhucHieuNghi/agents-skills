import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverSkills } from "../src/discovery.js";
import { applySkill } from "../src/install.js";
import type { CommandRunner } from "../src/types.js";

function createRecordingRunner(): {
  calls: Array<{ command: string; arguments: string[]; cwd?: string }>;
  runner: CommandRunner;
} {
  const calls: Array<{
    command: string;
    arguments: string[];
    cwd?: string;
  }> = [];

  return {
    calls,
    runner: {
      async run(command, arguments_, cwd) {
        calls.push({ command, arguments: arguments_, cwd });
      },
    },
  };
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryProject(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-install-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function fixtureSkill() {
  const [skill] = await discoverSkills("tests/fixtures/catalog");
  return skill;
}

describe("applySkill", () => {
  it("installs for Codex and Claude Code through npx skills", async () => {
    const { calls, runner } = createRecordingRunner();
    const projectDirectory = await createTemporaryProject();

    await applySkill({
      skill: await fixtureSkill(),
      sourceDirectory: "/tmp/catalog",
      targets: ["codex", "claude-code"],
      scope: "project",
      projectDirectory,
      runner,
    });

    expect(calls).toEqual([
      {
        command: "npx",
        arguments: [
          "--yes",
          "skills",
          "add",
          "/tmp/catalog",
          "--skill",
          "release-check",
          "--agent",
          "codex",
          "--agent",
          "claude-code",
          "--yes",
        ],
        cwd: projectDirectory,
      },
    ]);
  });

  it("appends the global flag for global installs", async () => {
    const { calls, runner } = createRecordingRunner();
    const projectDirectory = await createTemporaryProject();

    await applySkill({
      skill: await fixtureSkill(),
      sourceDirectory: "/tmp/catalog",
      targets: ["codex"],
      scope: "global",
      projectDirectory,
      runner,
    });

    expect(calls[0]?.arguments).toEqual([
      "--yes",
      "skills",
      "add",
      "/tmp/catalog",
      "--skill",
      "release-check",
      "--agent",
      "codex",
      "--yes",
      "--global",
    ]);
  });

  it("rejects invalid skills before invoking an install runner", async () => {
    const { calls, runner } = createRecordingRunner();
    const [invalidSkill] = await discoverSkills(
      "tests/fixtures/invalid-catalog",
    );
    const projectDirectory = await createTemporaryProject();

    await expect(
      applySkill({
        skill: invalidSkill,
        sourceDirectory: "/tmp/catalog",
        targets: ["codex"],
        scope: "project",
        projectDirectory,
        runner,
      }),
    ).rejects.toThrow(/Skill validation failed/);
    expect(calls).toEqual([]);
  });

  it("rejects an empty target list before invoking an installer", async () => {
    const { calls, runner } = createRecordingRunner();
    await expect(
      applySkill({
        skill: await fixtureSkill(),
        sourceDirectory: "/tmp/catalog",
        targets: [],
        scope: "project",
        projectDirectory: await createTemporaryProject(),
        runner,
      }),
    ).rejects.toThrow("At least one target is required.");
    expect(calls).toEqual([]);
  });
});
