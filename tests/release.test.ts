import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterEach, expect, it } from "vitest";
import { digestTree } from "../src/integrity.js";
import {
  buildSolutionRelease,
  packSolutionRelease,
  verifySolutionRelease,
} from "../src/release.js";
import type { SolutionManifest } from "../src/solutions.js";
import type { UpstreamRecord } from "../src/upstreams.js";

const directories: string[] = [];
async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-release-"));
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

async function fixture() {
  const repositoryRoot = await temporaryDirectory();
  const upstreamRepository = await temporaryDirectory();
  const cacheDirectory = await temporaryDirectory();
  const bundledDirectory = join(repositoryRoot, "skills", "coordinator");
  const publicDirectory = join(upstreamRepository, "skills", "public-style");
  await mkdir(bundledDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });
  await writeFile(
    join(bundledDirectory, "SKILL.md"),
    "---\nname: coordinator\ndescription: Coordinates a test workflow.\n---\n# Coordinator\n",
  );
  await writeFile(
    join(publicDirectory, "SKILL.md"),
    "---\nname: public-style\ndescription: Polishes a test document.\n---\n# Style\n",
  );
  await writeFile(
    join(upstreamRepository, "LICENSE"),
    "MIT License\nCopyright Test\n",
  );
  await writeFile(
    join(repositoryRoot, "LICENSE"),
    "MIT License\nCopyright Product\n",
  );
  await execa("git", ["init", "--initial-branch=main", upstreamRepository]);
  await execa("git", ["config", "user.email", "test@example.com"], {
    cwd: upstreamRepository,
  });
  await execa("git", ["config", "user.name", "Test"], {
    cwd: upstreamRepository,
  });
  await execa("git", ["add", "."], { cwd: upstreamRepository });
  await execa("git", ["commit", "-m", "pinned skill"], {
    cwd: upstreamRepository,
  });
  const { stdout: revision } = await execa("git", ["rev-parse", "HEAD"], {
    cwd: upstreamRepository,
  });
  const bundledDigest = await digestTree(bundledDirectory);
  const publicDigest = await digestTree(publicDirectory);
  const manifest: SolutionManifest = {
    schemaVersion: 1,
    id: "sample-solution",
    version: "1.0.0",
    outcome: "A test document.",
    entrypoint: "coordinator",
    hosts: ["codex", "claude-code"],
    qualityGates: ["Check source evidence"],
    components: [
      { id: "coordinator", source: "bundled", digest: bundledDigest },
      {
        id: "public-style",
        source: "upstream",
        upstream: "public-style",
        digest: publicDigest,
      },
    ],
  };
  const upstream: UpstreamRecord = {
    id: "public-style",
    repository: upstreamRepository,
    revision,
    skillPath: "skills/public-style",
    digest: publicDigest,
    license: "MIT",
    licenseFile: "LICENSE",
    attribution: "Test author",
    localChanges: "none",
    topics: ["design"],
  };
  return {
    repositoryRoot,
    cacheDirectory,
    manifest,
    upstreams: new Map([["public-style", upstream]]),
  };
}

it("builds a self-contained immutable release with upstream notice and lock", async () => {
  const input = await fixture();
  const outputDirectory = join(await temporaryDirectory(), "bundle");
  await buildSolutionRelease({ ...input, outputDirectory });

  const release = await verifySolutionRelease(outputDirectory);
  expect(release).toMatchObject({
    id: "sample-solution",
    version: "1.0.0",
    entrypoint: "coordinator",
    components: [
      { id: "coordinator", source: "bundled" },
      {
        id: "public-style",
        source: "upstream",
        revision: input.upstreams.get("public-style")?.revision,
      },
    ],
  });
  expect(
    await readFile(
      join(outputDirectory, "skills", "public-style", "SKILL.md"),
      "utf8",
    ),
  ).toContain("# Style");
  expect(
    await readFile(
      join(outputDirectory, "licenses", "public-style-LICENSE"),
      "utf8",
    ),
  ).toContain("MIT License");
  expect(await readFile(join(outputDirectory, "LICENSE"), "utf8")).toContain(
    "Copyright Product",
  );
  expect(
    JSON.parse(await readFile(join(outputDirectory, "package.json"), "utf8")),
  ).toMatchObject({
    name: "agent-skills-solution-sample-solution",
    version: "1.0.0",
    private: true,
  });
  const archive = await packSolutionRelease(
    outputDirectory,
    join(outputDirectory, ".."),
  );
  const { stdout: archiveListing } = await execa("tar", ["-tzf", archive.path]);
  expect(archive.digest).toMatch(/^[a-f0-9]{64}$/);
  expect(archiveListing).toContain("package/solution-release.json");
  expect(archiveListing).toContain("package/skills/public-style/SKILL.md");
  expect(archiveListing).toContain("package/licenses/public-style-LICENSE");

  await writeFile(
    join(outputDirectory, "skills", "public-style", "SKILL.md"),
    "tampered\n",
  );
  await expect(verifySolutionRelease(outputDirectory)).rejects.toThrow(
    /digest/i,
  );
});

it("refuses a dual-host release that would replace a native host variant", async () => {
  const input = await fixture();
  const upstream = input.upstreams.get("public-style") as UpstreamRecord;
  upstream.hostVariants = {
    "claude-code": {
      skillPath: ".claude/skills/public-style",
      digest: "0".repeat(64),
    },
  };
  await expect(
    buildSolutionRelease({
      ...input,
      outputDirectory: join(await temporaryDirectory(), "bundle"),
    }),
  ).rejects.toThrow(/host-aware Solution Skill release/i);
});

it("refuses to build when a bundled component changes without a new release lock", async () => {
  const input = await fixture();
  await writeFile(
    join(input.repositoryRoot, "skills", "coordinator", "SKILL.md"),
    "---\nname: coordinator\ndescription: Coordinates a test workflow.\n---\n# Changed coordinator\n",
  );
  await expect(
    buildSolutionRelease({
      ...input,
      outputDirectory: join(await temporaryDirectory(), "bundle"),
    }),
  ).rejects.toThrow(/digest/i);
});

it("rejects a release that omits the license notice for an upstream skill", async () => {
  const input = await fixture();
  const outputDirectory = join(await temporaryDirectory(), "bundle");
  await buildSolutionRelease({ ...input, outputDirectory });
  const file = join(outputDirectory, "solution-release.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.notices = [];
  await writeFile(file, JSON.stringify(manifest));

  await expect(verifySolutionRelease(outputDirectory)).rejects.toThrow(
    /notice/i,
  );
});

it("refuses a bundled skill reached through a symlink outside the repository", async () => {
  const repositoryRoot = await temporaryDirectory();
  const outside = await temporaryDirectory();
  await mkdir(join(outside, "coordinator"));
  await writeFile(
    join(outside, "coordinator", "SKILL.md"),
    "---\nname: coordinator\ndescription: Coordinates a test workflow.\n---\n# Test\n",
  );
  await symlink(outside, join(repositoryRoot, "skills"));
  await writeFile(join(repositoryRoot, "LICENSE"), "MIT License\n");
  const manifest: SolutionManifest = {
    schemaVersion: 1,
    id: "sample-solution",
    version: "1.0.0",
    outcome: "A test document.",
    entrypoint: "coordinator",
    hosts: ["codex"],
    qualityGates: ["Check evidence"],
    components: [
      {
        id: "coordinator",
        source: "bundled",
        digest: await digestTree(join(outside, "coordinator")),
      },
    ],
  };
  await expect(
    buildSolutionRelease({
      manifest,
      upstreams: new Map(),
      repositoryRoot,
      cacheDirectory: await temporaryDirectory(),
      outputDirectory: join(await temporaryDirectory(), "release"),
    }),
  ).rejects.toThrow(/symbolic link|escapes/i);
});

async function composedFixture() {
  const input = await fixture();
  const directory = join(input.repositoryRoot, "skills", "coordinator");
  const sha = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  await mkdir(join(directory, "licenses"));
  const license = "MIT License\nCopyright Source\n";
  await writeFile(join(directory, "licenses/source.txt"), license);
  await writeFile(join(directory, "NOTICE.md"), "Adapted from source.\n");
  const paths = ["SKILL.md", "NOTICE.md", "licenses/source.txt"];
  const lock = {
    schemaVersion: 1,
    sources: [
      {
        id: "source",
        repository: "https://github.com/example/source.git",
        revision: "a".repeat(40),
        skillPath: "skills/source",
        digest: "b".repeat(64),
        license: "MIT",
        attribution: "Source",
        licenseFile: "licenses/source.txt",
        licenseDigest: sha(license),
      },
    ],
    files: await Promise.all(
      paths.map(async (path) => ({
        path,
        digest: sha(await readFile(join(directory, path), "utf8")),
        origin: "original",
        sourceIds: [],
      })),
    ),
  };
  await writeFile(
    join(directory, "provenance.lock.json"),
    JSON.stringify(lock),
  );
  input.manifest.components = [
    {
      id: "coordinator",
      source: "bundled",
      digest: await digestTree(directory),
    },
  ];
  return { input, directory };
}
it("includes an internal attribution pointer for a single composed component", async () => {
  const { input } = await composedFixture();
  const outputDirectory = join(await temporaryDirectory(), "release");
  await buildSolutionRelease({ ...input, outputDirectory });
  expect(await readFile(join(outputDirectory, "NOTICE.md"), "utf8")).toContain(
    "skills/coordinator/NOTICE.md",
  );
  expect(
    (await verifySolutionRelease(outputDirectory)).components,
  ).toHaveLength(1);
});
it("rejects invalid internal provenance even with an updated enclosing digest", async () => {
  const { input, directory } = await composedFixture();
  await writeFile(join(directory, "NOTICE.md"), "tampered");
  input.manifest.components[0].digest = await digestTree(directory);
  await expect(
    buildSolutionRelease({
      ...input,
      outputDirectory: join(await temporaryDirectory(), "release"),
    }),
  ).rejects.toThrow(/composition digest/i);
});
it("verifies internal provenance when reopening a release", async () => {
  const { input } = await composedFixture();
  const outputDirectory = join(await temporaryDirectory(), "release");
  await buildSolutionRelease({ ...input, outputDirectory });
  const skill = join(outputDirectory, "skills/coordinator");
  await writeFile(join(skill, "NOTICE.md"), "tampered");
  const manifestPath = join(outputDirectory, "solution-release.json");
  const release = JSON.parse(await readFile(manifestPath, "utf8"));
  release.components[0].digest = await digestTree(skill);
  await writeFile(manifestPath, JSON.stringify(release));
  await expect(verifySolutionRelease(outputDirectory)).rejects.toThrow(
    /composition digest/i,
  );
});
