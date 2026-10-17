import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterEach, expect, it } from "vitest";
import { digestTree } from "../src/integrity.js";
import { checkUpstreams, loadUpstreams } from "../src/upstreams.js";

const directories: string[] = [];
async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-upstream-"));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

it("requires an immutable revision and distribution provenance", async () => {
  const directory = await temporaryDirectory();
  const file = join(directory, "catalog.yaml");
  const valid = `version: 1
upstreams:
  hallmark:
    repository: https://github.com/nutlope/hallmark.git
    revision: ${"a".repeat(40)}
    skillPath: skills/hallmark
    digest: ${"b".repeat(64)}
    license: MIT
    licenseFile: LICENSE
    attribution: Hallmark contributors
    localChanges: none
    topics: [design, documentation]
`;
  await writeFile(file, valid);
  expect((await loadUpstreams(file)).get("hallmark")).toMatchObject({
    revision: "a".repeat(40),
    skillPath: "skills/hallmark",
    license: "MIT",
  });

  await writeFile(file, valid.replace("a".repeat(40), "main"));
  await expect(loadUpstreams(file)).rejects.toThrow(/revision/i);
  await writeFile(file, valid.replace("    license: MIT\n", ""));
  await expect(loadUpstreams(file)).rejects.toThrow(/license/i);
  await writeFile(file, valid.replace("skills/hallmark", "../outside"));
  await expect(loadUpstreams(file)).rejects.toThrow(/path/i);
});

it("reports a newer remote HEAD without changing the pinned revision", async () => {
  const repository = await temporaryDirectory();
  await execa("git", ["init", "--initial-branch=main", repository]);
  await execa("git", ["config", "user.email", "test@example.com"], {
    cwd: repository,
  });
  await execa("git", ["config", "user.name", "Test"], { cwd: repository });
  const skillDirectory = join(repository, "skills", "sample");
  await mkdir(skillDirectory, { recursive: true });
  const skillFile = join(skillDirectory, "SKILL.md");
  await writeFile(skillFile, "first\n");
  await execa("git", ["add", "."], { cwd: repository });
  await execa("git", ["commit", "-m", "first"], { cwd: repository });
  const { stdout: revision } = await execa("git", ["rev-parse", "HEAD"], {
    cwd: repository,
  });
  const pinnedDigest = await digestTree(skillDirectory);
  await writeFile(skillFile, "second\n");
  await execa("git", ["commit", "-am", "second"], { cwd: repository });
  const { stdout: latest } = await execa("git", ["rev-parse", "HEAD"], {
    cwd: repository,
  });
  const latestDigest = await digestTree(skillDirectory);

  const results = await checkUpstreams([
    {
      id: "sample",
      repository,
      revision,
      skillPath: "skills/sample",
      digest: pinnedDigest,
      license: "MIT",
      licenseFile: "LICENSE",
      attribution: "Sample",
      localChanges: "none",
      topics: ["design"],
    },
  ]);

  expect(results).toEqual([
    {
      id: "sample",
      pinned: revision,
      latest,
      latestDigest,
      repositoryMoved: true,
      updateAvailable: true,
    },
  ]);

  await writeFile(join(repository, "README.md"), "unrelated change\n");
  await execa("git", ["add", "README.md"], { cwd: repository });
  await execa("git", ["commit", "-m", "docs"], { cwd: repository });
  const unchangedSkill = await checkUpstreams([
    {
      id: "sample",
      repository,
      revision: latest,
      skillPath: "skills/sample",
      digest: latestDigest,
      license: "MIT",
      licenseFile: "LICENSE",
      attribution: "Sample",
      localChanges: "none",
      topics: ["design"],
    },
  ]);
  expect(unchangedSkill[0]).toMatchObject({
    repositoryMoved: true,
    latestDigest,
    updateAvailable: false,
  });

  const { stdout: currentHead } = await execa("git", ["rev-parse", "HEAD"], {
    cwd: repository,
  });
  await expect(
    checkUpstreams([
      {
        id: "sample",
        repository,
        revision: currentHead,
        skillPath: "skills/sample",
        digest: pinnedDigest,
        license: "MIT",
        licenseFile: "LICENSE",
        attribution: "Sample",
        localChanges: "none",
        topics: ["design"],
      },
    ]),
  ).rejects.toThrow(/pinned upstream digest mismatch/i);
});
