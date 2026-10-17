import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { digestTree } from "../src/integrity.js";
import {
  installSolutionRelease,
  upgradeSolutionRelease,
} from "../src/solution-install.js";

const directories: string[] = [];
async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-install-v1-"));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fixtureRelease(
  version = "1.0.0",
  heading = "# Test",
): Promise<{ directory: string; digest: string }> {
  const directory = await temporaryDirectory();
  const skillDirectory = join(directory, "skills", "coordinator");
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(join(directory, "LICENSE"), "MIT License\n");
  await writeFile(
    join(skillDirectory, "SKILL.md"),
    `---\nname: coordinator\ndescription: Coordinates a test workflow.\n---\n${heading}\n`,
  );
  const digest = await digestTree(skillDirectory);
  await writeFile(
    join(directory, "solution-release.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "sample-solution",
      version,
      outcome: "A test document.",
      entrypoint: "coordinator",
      hosts: ["codex", "claude-code"],
      qualityGates: ["Check evidence"],
      components: [{ id: "coordinator", source: "bundled", digest }],
      notices: [],
    }),
  );
  return { directory, digest: await digestTree(directory) };
}

it("installs a verified solution into both supported hosts and records its version", async () => {
  const release = await fixtureRelease();
  const project = await temporaryDirectory();
  await installSolutionRelease({
    releaseDirectory: release.directory,
    expectedDigest: release.digest,
    projectDirectory: project,
    targets: ["codex", "claude-code"],
  });

  expect(
    await readFile(
      join(project, ".agents", "skills", "coordinator", "SKILL.md"),
      "utf8",
    ),
  ).toContain("# Test");
  expect(
    (
      await lstat(join(project, ".claude", "skills", "coordinator"))
    ).isSymbolicLink(),
  ).toBe(true);
  expect(
    await readFile(
      join(project, ".claude", "skills", "coordinator", "SKILL.md"),
      "utf8",
    ),
  ).toContain("# Test");
  const lock = JSON.parse(
    await readFile(join(project, ".agent-skills", "installed.json"), "utf8"),
  );
  expect(lock.solutions["sample-solution"]).toMatchObject({
    version: "1.0.0",
    digest: release.digest,
  });
});

it("upgrades a clean installed solution to a higher version", async () => {
  const first = await fixtureRelease();
  const second = await fixtureRelease("1.1.0", "# Updated");
  const project = await temporaryDirectory();
  await installSolutionRelease({
    releaseDirectory: first.directory,
    expectedDigest: first.digest,
    projectDirectory: project,
    targets: ["codex", "claude-code"],
  });

  await upgradeSolutionRelease({
    releaseDirectory: second.directory,
    expectedDigest: second.digest,
    projectDirectory: project,
    targets: ["codex", "claude-code"],
  });

  expect(
    await readFile(
      join(project, ".agents", "skills", "coordinator", "SKILL.md"),
      "utf8",
    ),
  ).toContain("# Updated");
  expect(
    JSON.parse(
      await readFile(join(project, ".agent-skills", "installed.json"), "utf8"),
    ).solutions["sample-solution"],
  ).toMatchObject({ version: "1.1.0", digest: second.digest });
});

it("refuses to upgrade a locally edited installed skill", async () => {
  const first = await fixtureRelease();
  const second = await fixtureRelease("1.1.0", "# Updated");
  const project = await temporaryDirectory();
  await installSolutionRelease({
    releaseDirectory: first.directory,
    expectedDigest: first.digest,
    projectDirectory: project,
    targets: ["codex", "claude-code"],
  });
  const skillFile = join(
    project,
    ".agents",
    "skills",
    "coordinator",
    "SKILL.md",
  );
  await writeFile(skillFile, "local edit\n");

  await expect(
    upgradeSolutionRelease({
      releaseDirectory: second.directory,
      expectedDigest: second.digest,
      projectDirectory: project,
      targets: ["codex", "claude-code"],
    }),
  ).rejects.toThrow(/modified/i);
  expect(await readFile(skillFile, "utf8")).toBe("local edit\n");
});

it("rejects a tampered install lock before moving installed skills", async () => {
  const first = await fixtureRelease();
  const second = await fixtureRelease("1.1.0", "# Updated");
  const project = await temporaryDirectory();
  await installSolutionRelease({
    releaseDirectory: first.directory,
    expectedDigest: first.digest,
    projectDirectory: project,
    targets: ["codex", "claude-code"],
  });
  const lockPath = join(project, ".agent-skills", "installed.json");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  lock.solutions["sample-solution"].components[0].id = "../../outside";
  await writeFile(lockPath, JSON.stringify(lock));

  await expect(
    upgradeSolutionRelease({
      releaseDirectory: second.directory,
      expectedDigest: second.digest,
      projectDirectory: project,
      targets: ["codex", "claude-code"],
    }),
  ).rejects.toThrow(/invalid installation lock/i);
  expect(
    await readFile(
      join(project, ".agents", "skills", "coordinator", "SKILL.md"),
      "utf8",
    ),
  ).toContain("# Test");
});

it("rejects changed release bytes before writing to the project", async () => {
  const release = await fixtureRelease();
  const project = await temporaryDirectory();
  await writeFile(
    join(release.directory, "skills", "coordinator", "SKILL.md"),
    "tampered\n",
  );
  await expect(
    installSolutionRelease({
      releaseDirectory: release.directory,
      expectedDigest: release.digest,
      projectDirectory: project,
      targets: ["codex", "claude-code"],
    }),
  ).rejects.toThrow(/digest/i);
  await expect(lstat(join(project, ".agents"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});

it("rejects a release whose recorded skill bytes are invalid", async () => {
  const release = await fixtureRelease();
  const project = await temporaryDirectory();
  const skillDirectory = join(release.directory, "skills", "coordinator");
  await writeFile(
    join(skillDirectory, "SKILL.md"),
    "invalid skill without frontmatter\n",
  );
  const manifestPath = join(release.directory, "solution-release.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.components[0].digest = await digestTree(skillDirectory);
  await writeFile(manifestPath, JSON.stringify(manifest));

  await expect(
    installSolutionRelease({
      releaseDirectory: release.directory,
      expectedDigest: await digestTree(release.directory),
      projectDirectory: project,
      targets: ["codex"],
    }),
  ).rejects.toThrow(/invalid skill/i);
});

it("refuses a collision without changing an existing skill", async () => {
  const release = await fixtureRelease();
  const project = await temporaryDirectory();
  const existing = join(project, ".agents", "skills", "coordinator");
  await mkdir(existing, { recursive: true });
  await writeFile(join(existing, "SKILL.md"), "existing\n");
  await expect(
    installSolutionRelease({
      releaseDirectory: release.directory,
      expectedDigest: release.digest,
      projectDirectory: project,
      targets: ["codex", "claude-code"],
    }),
  ).rejects.toThrow(/exists|collision/i);
  expect(await readFile(join(existing, "SKILL.md"), "utf8")).toBe("existing\n");
});

it("rejects project skill directories that are symlinks", async () => {
  const release = await fixtureRelease();
  const project = await temporaryDirectory();
  const outside = await temporaryDirectory();
  await symlink(outside, join(project, ".agents"));
  await expect(
    installSolutionRelease({
      releaseDirectory: release.directory,
      expectedDigest: release.digest,
      projectDirectory: project,
      targets: ["codex"],
    }),
  ).rejects.toThrow(/symbolic link/i);
});
