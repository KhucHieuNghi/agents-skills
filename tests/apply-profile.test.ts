import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { runApplyProfile } from "../src/commands/apply-profile.js";

const catalog = `
version: 1
sources:
  valid:
    reference: ${resolve("tests/fixtures/catalog")}
  invalid:
    reference: ${resolve("tests/fixtures/invalid-catalog")}
skills:
  release-check:
    source: valid
    tags: [quality]
    summary: Checks a release-ready skill.
    suitableFor: [release-check]
    notSuitableFor: [style]
  wrong-directory:
    source: invalid
    tags: [quality]
    summary: Exercises invalid package handling.
    suitableFor: [test]
    notSuitableFor: [release-check]
profiles:
  release:
    intents: [release-check]
    skills: [release-check, wrong-directory]
    summary: Tests profile validation.
    suitableFor: [release-check]
    notSuitableFor: [production]
`;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function writeCatalog(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-catalog-"));
  temporaryDirectories.push(directory);
  const file = join(directory, "catalog.yaml");
  await writeFile(file, catalog);
  return file;
}

async function writeSkillSource(name: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-source-"));
  temporaryDirectories.push(directory);
  const skillDirectory = join(directory, name);
  await mkdir(skillDirectory);
  await writeFile(
    join(skillDirectory, "SKILL.md"),
    `---\nname: ${name}\ndescription: Test skill\n---\n# Test\n`,
  );
  return directory;
}

async function writeSkillSourceSet(names: string[]): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-source-"));
  temporaryDirectories.push(directory);
  await Promise.all(
    names.map(async (name) => {
      const skillDirectory = join(directory, name);
      await mkdir(skillDirectory);
      await writeFile(
        join(skillDirectory, "SKILL.md"),
        `---\nname: ${name}\ndescription: Test skill\n---\n# Test\n`,
      );
    }),
  );
  return directory;
}

it("validates every profile skill before invoking the first installer", async () => {
  const apply = vi.fn();

  await expect(
    runApplyProfile(
      "release",
      {
        catalog: await writeCatalog(),
        target: "codex",
        scope: "project",
      },
      { apply, projectDirectory: "/tmp" },
    ),
  ).rejects.toThrow(/validation/i);

  expect(apply).not.toHaveBeenCalled();
});

it("applies every validated profile skill in profile order", async () => {
  const firstSource = await writeSkillSource("first-skill");
  const secondSource = await writeSkillSource("second-skill");
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-catalog-"));
  temporaryDirectories.push(directory);
  const catalogFile = join(directory, "catalog.yaml");
  const catalogContent = [
    "version: 1",
    "sources:",
    "  first:",
    `    reference: ${firstSource}`,
    "  second:",
    `    reference: ${secondSource}`,
    "skills:",
    "  first-skill:",
    "    source: first",
    "    tags: [style]",
    "    summary: Applies the first test skill.",
    "    suitableFor: [landing-page]",
    "    notSuitableFor: [data-dashboard]",
    "  second-skill:",
    "    source: second",
    "    tags: [style]",
    "    summary: Applies the second test skill.",
    "    suitableFor: [landing-page]",
    "    notSuitableFor: [data-dashboard]",
    "profiles:",
    "  product-ui:",
    "    intents: [landing-page]",
    "    skills: [first-skill, second-skill]",
    "    summary: Applies test style skills.",
    "    suitableFor: [landing-page]",
    "    notSuitableFor: [data-dashboard]",
    "",
  ].join("\n");
  await writeFile(catalogFile, catalogContent);
  const apply = vi.fn();

  await runApplyProfile(
    "product-ui",
    { catalog: catalogFile, target: "codex" },
    { apply, projectDirectory: "/tmp" },
  );

  expect(apply.mock.calls.map(([request]) => request.skill.name)).toEqual([
    "first-skill",
    "second-skill",
  ]);
});

it("stages a shared source once before applying its selected skills", async () => {
  const source = await writeSkillSourceSet(["first-skill", "second-skill"]);
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-catalog-"));
  temporaryDirectories.push(directory);
  const catalogFile = join(directory, "catalog.yaml");
  await writeFile(
    catalogFile,
    [
      "version: 1",
      "sources:",
      "  shared:",
      `    reference: ${source}`,
      "skills:",
      "  first-skill:",
      "    source: shared",
      "    tags: [style]",
      "    summary: Applies the first shared test skill.",
      "    suitableFor: [landing-page]",
      "    notSuitableFor: [data-dashboard]",
      "  second-skill:",
      "    source: shared",
      "    tags: [style]",
      "    summary: Applies the second shared test skill.",
      "    suitableFor: [landing-page]",
      "    notSuitableFor: [data-dashboard]",
      "profiles:",
      "  product-ui:",
      "    intents: [landing-page]",
      "    skills: [first-skill, second-skill]",
      "    summary: Applies test style skills.",
      "    suitableFor: [landing-page]",
      "    notSuitableFor: [data-dashboard]",
      "",
    ].join("\n"),
  );
  const stage = vi.fn(async () => ({ cached: false, directory: source }));

  await runApplyProfile(
    "product-ui",
    { catalog: catalogFile, target: "codex" },
    { apply: vi.fn(), projectDirectory: "/tmp", stage },
  );

  expect(stage).toHaveBeenCalledTimes(1);
});

it("passes the catalog's pinned Git revision into source staging", async () => {
  const source = await writeSkillSource("first-skill");
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-catalog-"));
  temporaryDirectories.push(directory);
  const file = join(directory, "catalog.yaml");
  const revision = "a".repeat(40);
  await writeFile(
    file,
    `version: 1
sources:
  pinned:
    reference: https://example.com/skills.git
    revision: ${revision}
skills:
  first-skill:
    source: pinned
    summary: First skill.
profiles:
  sample:
    intents: [sample]
    skills: [first-skill]
    summary: Sample solution.
`,
  );
  const stage = vi.fn(async (reference: { revision?: string }) => {
    if (reference.revision !== revision) {
      throw new Error("Missing pinned revision");
    }
    return { cached: false, directory: source };
  });

  await expect(
    runApplyProfile(
      "sample",
      { catalog: file, target: "codex" },
      { stage, apply: vi.fn() },
    ),
  ).resolves.toBeUndefined();
});
