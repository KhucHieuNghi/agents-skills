import type { DiscoveredSkill } from "./discovery.js";
import type { CommandRunner, InstallScope, Target } from "./types.js";
import { validateSkill } from "./validation.js";

export type ApplyRequest = {
  skill: DiscoveredSkill;
  sourceDirectory: string;
  targets: Target[];
  scope: InstallScope;
  projectDirectory: string;
  runner: CommandRunner;
};

export type ApplyResult = { appliedTargets: Target[] };

export async function applySkill(request: ApplyRequest): Promise<ApplyResult> {
  assertValidSkill(request.skill);
  if (request.targets.length === 0) {
    throw new Error("At least one target is required.");
  }

  await request.runner.run(
    "npx",
    npxArguments(
      request.sourceDirectory,
      request.skill.name,
      request.targets,
      request.scope,
    ),
    request.projectDirectory,
  );

  return { appliedTargets: request.targets };
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
  targets: Target[],
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
