import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export type DiscoveredSkill = {
  name: string;
  directory: string;
  skillFile: string;
  markdown: string;
};

export async function discoverSkills(
  sourceDirectory: string,
): Promise<DiscoveredSkill[]> {
  const catalogDirectories = [sourceDirectory, join(sourceDirectory, "skills")];
  const discovered: DiscoveredSkill[] = [];

  for (const catalogDirectory of catalogDirectories) {
    const entries = await readDirectoryIfPresent(catalogDirectory);

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const directory = join(catalogDirectory, entry.name);
      const skillFile = join(directory, "SKILL.md");
      const markdown = await readFileIfPresent(skillFile);

      if (markdown !== undefined) {
        discovered.push({
          name: basename(directory),
          directory,
          skillFile,
          markdown,
        });
      }
    }
  }

  return discovered.sort((left, right) => left.name.localeCompare(right.name));
}

async function readDirectoryIfPresent(directory: string) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if (isMissingPath(error)) {
      return [];
    }

    throw error;
  }
}

async function readFileIfPresent(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (error: unknown) {
    if (isMissingPath(error)) {
      return undefined;
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
