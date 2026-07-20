import { homedir } from "node:os";
import { cwd } from "node:process";
import { execa } from "execa";
import { parseSourceReference, resolveCacheDirectory } from "../config.js";
import { discoverSkills } from "../discovery.js";
import { applySkill } from "../install.js";
import { stageSource } from "../source.js";
import type { CommandRunner, InstallScope, Target } from "../types.js";
import { validateSkill } from "../validation.js";
import type { SourceOptions } from "./catalog.js";

export type ApplyOptions = SourceOptions & { scope?: string; target: string };

type ApplyDependencies = {
  apply?: typeof applySkill;
  cacheDirectory?: string;
  homeDirectory?: string;
  projectDirectory?: string;
};

const TARGETS: readonly Target[] = ["opencode", "codex", "claude-code", "eve"];

const commandRunner: CommandRunner = {
  async run(command, arguments_, workingDirectory) {
    await execa(command, arguments_, { cwd: workingDirectory });
  },
};

export async function runApply(
  requestedSkill: string,
  options: ApplyOptions,
  dependencies: ApplyDependencies = {},
): Promise<void> {
  const targets = parseTargets(options.target);
  const scope = parseScope(options.scope);

  if (targets.includes("eve") && scope === "global") {
    throw new Error("Eve supports project scope only");
  }

  const staged = await stageSource(
    parseSourceReference(options.source),
    resolveCacheDirectory(
      dependencies.homeDirectory ?? homedir(),
      dependencies.cacheDirectory,
    ),
  );
  const skill = (await discoverSkills(staged.directory)).find(
    ({ name }) => name === requestedSkill,
  );

  if (skill === undefined) {
    throw new Error(`Skill not found: ${requestedSkill}`);
  }

  const validation = validateSkill(skill);
  if (!validation.valid) {
    throw new Error(`Skill validation failed: ${validation.errors.join("; ")}`);
  }

  await (dependencies.apply ?? applySkill)({
    projectDirectory: dependencies.projectDirectory ?? cwd(),
    replace: false,
    runner: commandRunner,
    scope,
    skill,
    sourceDirectory: staged.directory,
    targets,
  });

  console.log(JSON.stringify({ applied: requestedSkill, targets }));
}

export function parseTargets(value: string): Target[] {
  const targets = value
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);
  if (
    targets.length === 0 ||
    targets.some((target) => !TARGETS.includes(target as Target))
  ) {
    throw new Error(`Unknown target. Expected one of: ${TARGETS.join(", ")}.`);
  }

  return [...new Set(targets)] as Target[];
}

export function parseScope(value: string | undefined): InstallScope {
  const scope = value ?? "project";
  if (scope !== "project" && scope !== "global") {
    throw new Error("Scope must be project or global.");
  }

  return scope;
}
