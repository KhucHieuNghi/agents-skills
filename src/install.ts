import { access, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { DiscoveredSkill } from "./discovery.js";
import type { CommandRunner, InstallScope, Target } from "./types.js";
import { validateSkill } from "./validation.js";

export type ApplyRequest = {
  skill: DiscoveredSkill;
  sourceDirectory: string;
  targets: Target[];
  scope: InstallScope;
  projectDirectory: string;
  replace: false;
  runner: CommandRunner;
};

export type ApplyResult = { appliedTargets: Target[] };

export async function applySkill(request: ApplyRequest): Promise<ApplyResult> {
  assertValidSkill(request.skill);

  if (request.targets.includes("eve") && request.scope === "global") {
    throw new Error("Eve supports project scope only");
  }

  if (request.targets.includes("eve")) {
    await assertEveSkillAbsent(request.skill, request.projectDirectory);
  }

  const npxTargets = request.targets.filter(
    (target): target is Exclude<Target, "eve"> => target !== "eve",
  );
  if (npxTargets.length > 0) {
    await request.runner.run(
      "npx",
      npxArguments(
        request.sourceDirectory,
        request.skill.name,
        npxTargets,
        request.scope,
      ),
      request.projectDirectory,
    );
  }

  if (request.targets.includes("eve")) {
    await applyEveSkill(
      request.skill,
      request.projectDirectory,
      request.replace,
    );
  }

  return { appliedTargets: request.targets };
}

export async function applyEveSkill(
  skill: DiscoveredSkill,
  projectDirectory: string,
  replace: false,
): Promise<void> {
  assertValidSkill(skill);

  if (replace) {
    throw new Error("Replacement is not supported in v0.1");
  }

  const destination = join(projectDirectory, "agent", "skills", skill.name);
  await assertEveSkillAbsent(skill, projectDirectory);

  await mkdir(join(projectDirectory, "agent", "skills"), { recursive: true });
  await cp(skill.directory, destination, {
    errorOnExist: true,
    recursive: true,
  });
}

async function assertEveSkillAbsent(
  skill: DiscoveredSkill,
  projectDirectory: string,
): Promise<void> {
  const destination = join(projectDirectory, "agent", "skills", skill.name);
  if (await pathExists(destination)) {
    throw new Error(`Eve skill already exists at ${destination}`);
  }
}

function assertValidSkill(skill: DiscoveredSkill): void {
  const validation = validateSkill(skill);
  if (!validation.valid) {
    throw new Error(`Skill validation failed: ${validation.errors.join("; ")}`);
  }
}

function npxArguments(
  sourceDirectory: string,
  skillName: string,
  targets: Exclude<Target, "eve">[],
  scope: InstallScope,
): string[] {
  const arguments_ = [
    "--yes",
    "skills",
    "add",
    sourceDirectory,
    "--skill",
    skillName,
  ];
  for (const target of targets) {
    arguments_.push("--agent", target);
  }
  arguments_.push("--yes");
  if (scope === "global") {
    arguments_.push("--global");
  }
  return arguments_;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error: unknown) {
    if (isMissingPath(error)) {
      return false;
    }
    throw error;
  }
}

function isMissingPath(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
