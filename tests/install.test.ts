import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverSkills } from "../src/discovery.js";
import { applyEveSkill, applySkill } from "../src/install.js";
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
  it("delegates OpenCode, Codex, and Claude Code to npx skills", async () => {
    const { calls, runner } = createRecordingRunner();
    const projectDirectory = await createTemporaryProject();

    await applySkill({
      skill: await fixtureSkill(),
      sourceDirectory: "/tmp/catalog",
      targets: ["opencode", "codex", "claude-code"],
      scope: "project",
      projectDirectory,
      replace: false,
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
          "opencode",
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

  it("appends the global flag for non-Eve global installs", async () => {
    const { calls, runner } = createRecordingRunner();
    const projectDirectory = await createTemporaryProject();

    await applySkill({
      skill: await fixtureSkill(),
      sourceDirectory: "/tmp/catalog",
      targets: ["codex"],
      scope: "global",
      projectDirectory,
      replace: false,
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
        replace: false,
        runner,
      }),
    ).rejects.toThrow(/Skill validation failed/);
    expect(calls).toEqual([]);
  });

  it("rejects global Eve before applying any target", async () => {
    const { calls, runner } = createRecordingRunner();
    const projectDirectory = await createTemporaryProject();

    await expect(
      applySkill({
        skill: await fixtureSkill(),
        sourceDirectory: "/tmp/catalog",
        targets: ["codex", "eve"],
        scope: "global",
        projectDirectory,
        replace: false,
        runner,
      }),
    ).rejects.toThrow("Eve supports project scope only");
    expect(calls).toEqual([]);
  });

  it("checks Eve conflicts before invoking another target backend", async () => {
    const { calls, runner } = createRecordingRunner();
    const projectDirectory = await createTemporaryProject();
    const skill = await fixtureSkill();

    await applyEveSkill(skill, projectDirectory, false);

    await expect(
      applySkill({
        skill,
        sourceDirectory: "/tmp/catalog",
        targets: ["codex", "eve"],
        scope: "project",
        projectDirectory,
        replace: false,
        runner,
      }),
    ).rejects.toThrow(/already exists/);
    expect(calls).toEqual([]);
  });
});

describe("applyEveSkill", () => {
  it("validates before creating an Eve installation directory", async () => {
    const projectDirectory = await createTemporaryProject();
    const [invalidSkill] = await discoverSkills(
      "tests/fixtures/invalid-catalog",
    );

    await expect(
      applyEveSkill(invalidSkill, projectDirectory, false),
    ).rejects.toThrow(/Skill validation failed/);
    await expect(
      readFile(
        join(projectDirectory, "agent/skills/release-check/SKILL.md"),
        "utf8",
      ),
    ).rejects.toThrow("ENOENT");
  });

  it("copies the canonical package into agent/skills", async () => {
    const projectDirectory = await createTemporaryProject();
    const skill = await fixtureSkill();

    await applyEveSkill(skill, projectDirectory, false);

    await expect(
      readFile(
        join(projectDirectory, "agent/skills/release-check/SKILL.md"),
        "utf8",
      ),
    ).resolves.toBe(await readFile(skill.skillFile, "utf8"));
  });

  it("refuses an Eve conflict without altering the existing copy", async () => {
    const projectDirectory = await createTemporaryProject();
    const skill = await fixtureSkill();

    await applyEveSkill(skill, projectDirectory, false);
    const installedFile = join(
      projectDirectory,
      "agent/skills/release-check/SKILL.md",
    );
    const firstCopy = await readFile(installedFile, "utf8");

    await expect(applyEveSkill(skill, projectDirectory, false)).rejects.toThrow(
      join(projectDirectory, "agent/skills/release-check"),
    );
    await expect(readFile(installedFile, "utf8")).resolves.toBe(firstCopy);
  });
});
