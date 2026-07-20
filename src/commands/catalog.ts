import { homedir } from "node:os";
import { resolveCacheDirectory, parseSourceReference } from "../config.js";
import { discoverSkills } from "../discovery.js";
import { stageSource } from "../source.js";
import { validateSkill } from "../validation.js";

export type SourceOptions = { source: string };

export async function runCatalog(options: SourceOptions): Promise<void> {
  const staged = await stageSource(
    parseSourceReference(options.source),
    resolveCacheDirectory(homedir()),
  );
  const skills = await discoverSkills(staged.directory);

  console.log(
    JSON.stringify({
      skills: skills.map((skill) => ({
        name: skill.name,
        ...validateSkill(skill),
      })),
    }),
  );
}
