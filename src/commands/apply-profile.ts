import { homedir } from "node:os";
import { cwd } from "node:process";
import { execa } from "execa";
import { loadCatalog, resolveProfile } from "../catalog.js";
import { parseSourceReference, resolveCacheDirectory } from "../config.js";
import { discoverSkills, type DiscoveredSkill } from "../discovery.js";
import { applySkill } from "../install.js";
import { stageSource, type StagedSource } from "../source.js";
import type { CommandRunner } from "../types.js";
import { validateSkill } from "../validation.js";
import { parseScope, parseTargets } from "./apply.js";

export type ApplyProfileOptions = {
  catalog?: string;
  target: string;
  scope?: string;
};

type ApplyProfileDependencies = {
  apply?: typeof applySkill;
  cacheDirectory?: string;
  homeDirectory?: string;
  projectDirectory?: string;
  stage?: typeof stageSource;
};

const commandRunner: CommandRunner = {
  async run(command, arguments_, workingDirectory) {
    await execa(command, arguments_, { cwd: workingDirectory });
  },
};

export async function runApplyProfile(
  requestedProfile: string,
  options: ApplyProfileOptions,
  dependencies: ApplyProfileDependencies = {},
): Promise<void> {
  const targets = parseTargets(options.target);
  const scope = parseScope(options.scope);
  if (targets.includes("eve") && scope === "global") {
    throw new Error("Eve supports project scope only");
  }

  const profile = resolveProfile(
    await loadCatalog(options.catalog ?? "catalog.yaml"),
    requestedProfile,
  );
  const cacheDirectory = resolveCacheDirectory(
    dependencies.homeDirectory ?? homedir(),
    dependencies.cacheDirectory,
  );
  const stagedSources = new Map<string, Promise<StagedSource>>();
  const stage = dependencies.stage ?? stageSource;
  const stagedSkills = await Promise.all(
    profile.skills.map(async (configuredSkill) => {
      const source = configuredSkill.source.reference;
      let stagedSource = stagedSources.get(source);
      if (stagedSource === undefined) {
        stagedSource = stage(parseSourceReference(source), cacheDirectory);
        stagedSources.set(source, stagedSource);
      }
      const staged = await stagedSource;
      const skill = (await discoverSkills(staged.directory)).find(
        ({ name }) => name === configuredSkill.name,
      );
      if (skill === undefined) {
        throw new Error(`Skill not found: ${configuredSkill.name}`);
      }
      assertValidSkill(skill);
      return { skill, sourceDirectory: staged.directory };
    }),
  );

  for (const stagedSkill of stagedSkills) {
    await (dependencies.apply ?? applySkill)({
      projectDirectory: dependencies.projectDirectory ?? cwd(),
      replace: false,
      runner: commandRunner,
      scope,
      skill: stagedSkill.skill,
      sourceDirectory: stagedSkill.sourceDirectory,
      targets,
    });
  }

  console.log(
    JSON.stringify({
      applied: profile.name,
      skills: stagedSkills.map(({ skill }) => skill.name),
      targets,
    }),
  );
}

function assertValidSkill(skill: DiscoveredSkill): void {
  const validation = validateSkill(skill);
  if (!validation.valid) {
    throw new Error(`Skill validation failed: ${validation.errors.join("; ")}`);
  }
}
