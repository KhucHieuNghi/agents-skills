import { access, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import { execa } from "execa";
import { parseSourceReference, resolveCacheDirectory } from "../config.js";
import { stageSource } from "../source.js";

export type DoctorOptions = { source?: string };

export async function runDoctor(options: DoctorOptions): Promise<void> {
  const cacheDirectory = resolveCacheDirectory(homedir());
  const [gitAvailable, cacheAccessible, sourceReachable] = await Promise.all([
    isGitAvailable(),
    isCacheAccessible(cacheDirectory),
    isSourceReachable(options.source, cacheDirectory),
  ]);
  const nodeAvailable = majorVersion(process.versions.node) >= 20;
  const report = {
    cache: { accessible: cacheAccessible },
    git: { available: gitAvailable },
    node: { available: nodeAvailable, version: process.version },
    source:
      options.source === undefined ? undefined : { reachable: sourceReachable },
    targets: await detectProjectTargets(cwd()),
  };

  console.log(JSON.stringify(report));

  if (!nodeAvailable || !gitAvailable) {
    throw new Error("Doctor checks failed.");
  }
}

async function isGitAvailable(): Promise<boolean> {
  try {
    await execa("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function isCacheAccessible(directory: string): Promise<boolean> {
  try {
    await mkdir(directory, { mode: 0o700, recursive: true });
    await access(directory);
    return true;
  } catch {
    return false;
  }
}

async function isSourceReachable(
  source: string | undefined,
  cacheDirectory: string,
): Promise<boolean | undefined> {
  if (source === undefined) {
    return undefined;
  }

  try {
    await stageSource(parseSourceReference(source), cacheDirectory);
    return true;
  } catch {
    return false;
  }
}

export async function detectProjectTargets(
  projectDirectory: string,
): Promise<string[]> {
  const candidates: Array<[string, string]> = [
    ["opencode", ".opencode"],
    ["codex", ".codex"],
    ["claude-code", ".claude"],
    ["eve", join("agent", "skills")],
  ];

  const present = await Promise.all(
    candidates.map(async ([target, directory]) => {
      try {
        const details = await stat(join(projectDirectory, directory));
        return details.isDirectory() ? target : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return present.filter((target): target is string => target !== undefined);
}

function majorVersion(version: string): number {
  return Number(version.split(".", 1)[0]);
}
