import { resolve } from "node:path";
import type { SourceReference } from "./types.js";

export function resolveCacheDirectory(
  homeDirectory: string,
  configured?: string,
): string {
  return configured ?? resolve(homeDirectory, ".cache", "agent-skills");
}

export function parseSourceReference(value: string): SourceReference {
  const isGit =
    /^(?:git@|https?:\/\/|ssh:\/\/).+/.test(value) || value.endsWith(".git");
  return isGit ? { kind: "git", value } : { kind: "path", value };
}
