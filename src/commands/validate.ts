import { homedir } from "node:os";
import { parseSourceReference, resolveCacheDirectory } from "../config.js";
import { discoverSkills } from "../discovery.js";
import { stageSource } from "../source.js";
import { validateSkill } from "../validation.js";
import type { SourceOptions } from "./catalog.js";

export async function runValidate(
  requestedSkill: string | undefined,
  options: SourceOptions,
): Promise<void> {
  const staged = await stageSource(
    parseSourceReference(options.source),
    resolveCacheDirectory(homedir()),
  );
  const discovered = await discoverSkills(staged.directory);
  const skills = selectSkills(discovered, requestedSkill);
  const results = skills.map((skill) => ({
    name: skill.name,
    ...validateSkill(skill),
  }));

  console.log(JSON.stringify({ skills: results }));

  if (results.some((result) => !result.valid)) {
    throw new Error("One or more skills failed validation.");
  }
}

function selectSkills<T extends { name: string }>(
  skills: T[],
  requestedSkill?: string,
): T[] {
  if (requestedSkill === undefined) {
    return skills;
  }

  const skill = skills.find(({ name }) => name === requestedSkill);
  if (skill === undefined) {
    throw new Error(`Skill not found: ${requestedSkill}`);
  }

  return [skill];
}
