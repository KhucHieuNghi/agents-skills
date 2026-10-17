import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { loadSolutionManifest } from "../src/solutions.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function manifestFile(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-solution-"));
  directories.push(directory);
  const file = join(directory, "solution.yaml");
  await writeFile(file, content);
  return file;
}

const valid = `schemaVersion: 1
id: codebase-onboarding
version: 1.0.0
outcome: Evidence-backed repository onboarding handoff.
entrypoint: codebase-onboarding-c4
hosts: [codex, claude-code]
qualityGates: [Validate evidence, Verify generated output]
components:
  - id: codebase-onboarding-c4
    source: bundled
    digest: ${"a".repeat(64)}
  - id: hallmark
    source: upstream
    upstream: hallmark
    digest: ${"b".repeat(64)}
`;

it("loads a versioned solution with an explicit entrypoint and ordered components", async () => {
  const manifest = await loadSolutionManifest(await manifestFile(valid));
  expect(manifest).toMatchObject({
    id: "codebase-onboarding",
    version: "1.0.0",
    entrypoint: "codebase-onboarding-c4",
    hosts: ["codex", "claude-code"],
    components: [
      { id: "codebase-onboarding-c4", source: "bundled" },
      { id: "hallmark", source: "upstream", upstream: "hallmark" },
    ],
  });
});

it("rejects unsupported hosts, duplicate components and missing entrypoints", async () => {
  await expect(
    loadSolutionManifest(
      await manifestFile(valid.replace("claude-code", "opencode")),
    ),
  ).rejects.toThrow(/host/i);
  await expect(
    loadSolutionManifest(
      await manifestFile(
        valid.replace("  - id: hallmark", "  - id: codebase-onboarding-c4"),
      ),
    ),
  ).rejects.toThrow(/duplicate/i);
  await expect(
    loadSolutionManifest(
      await manifestFile(
        valid.replace(
          "entrypoint: codebase-onboarding-c4",
          "entrypoint: absent",
        ),
      ),
    ),
  ).rejects.toThrow(/entrypoint/i);
});
