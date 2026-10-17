import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { execa } from "execa";
import { digestTree } from "./integrity.js";
import { stageSource } from "./source.js";
import type { SolutionManifest } from "./solutions.js";
import type { Target } from "./types.js";
import type { UpstreamRecord } from "./upstreams.js";
import { validateSkill } from "./validation.js";

export type ReleaseComponent = {
  id: string;
  source: "bundled" | "upstream";
  digest: string;
  repository?: string;
  revision?: string;
  skillPath?: string;
  license?: string;
  attribution?: string;
  localChanges?: string;
};

export type SolutionRelease = {
  schemaVersion: 1;
  id: string;
  version: string;
  outcome: string;
  entrypoint: string;
  hosts: Target[];
  qualityGates: string[];
  components: ReleaseComponent[];
  notices: Array<{ id: string; file: string; digest: string }>;
};

export type BuildSolutionOptions = {
  manifest: SolutionManifest;
  upstreams: Map<string, UpstreamRecord>;
  repositoryRoot: string;
  cacheDirectory: string;
  outputDirectory: string;
};

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^[a-f0-9]{64}$/;

export async function buildSolutionRelease(
  options: BuildSolutionOptions,
): Promise<SolutionRelease> {
  const { manifest, upstreams, repositoryRoot, cacheDirectory } = options;
  const outputDirectory = resolve(options.outputDirectory);
  if (await exists(outputDirectory)) {
    throw new Error(`Release directory already exists: ${outputDirectory}`);
  }

  const inputs: Array<{ component: ReleaseComponent; directory: string }> = [];
  const notices: SolutionRelease["notices"] = [];
  const licenseFiles: Array<{ destination: string; bytes: Buffer }> = [];
  const productLicense = join(repositoryRoot, "LICENSE");
  const productLicenseInfo = await lstat(productLicense);
  if (!productLicenseInfo.isFile() || productLicenseInfo.isSymbolicLink()) {
    throw new Error("Product LICENSE must be a regular file.");
  }
  const productLicenseBytes = await readFile(productLicense);
  if (productLicenseBytes.length === 0) {
    throw new Error("Product LICENSE is empty.");
  }
  for (const component of manifest.components) {
    let directory: string;
    let sourceRoot: string;
    let releaseComponent: ReleaseComponent = { ...component };
    if (component.source === "bundled") {
      directory = safeChild(join(repositoryRoot, "skills"), component.id);
      sourceRoot = repositoryRoot;
    } else {
      const upstream = upstreams.get(component.upstream ?? "");
      if (upstream === undefined || upstream.id !== component.id) {
        throw new Error(`Missing upstream record for ${component.id}.`);
      }
      if (component.digest !== upstream.digest) {
        throw new Error(
          `Upstream digest disagrees with solution lock: ${component.id}.`,
        );
      }
      const staged = await stageSource(
        {
          kind: "git",
          value: upstream.repository,
          revision: upstream.revision,
        },
        cacheDirectory,
      );
      directory = safeChild(staged.directory, upstream.skillPath);
      sourceRoot = staged.directory;
      const licenseFile = safeChild(staged.directory, upstream.licenseFile);
      await assertRealChild(staged.directory, licenseFile);
      const licenseInfo = await lstat(licenseFile);
      if (!licenseInfo.isFile() || licenseInfo.isSymbolicLink()) {
        throw new Error(`Invalid upstream license file: ${component.id}.`);
      }
      const licenseBytes = await readFile(licenseFile);
      if (licenseBytes.length === 0) {
        throw new Error(`Empty upstream license file: ${component.id}.`);
      }
      const destination = `licenses/${component.id}-LICENSE`;
      licenseFiles.push({ destination, bytes: licenseBytes });
      notices.push({
        id: component.id,
        file: destination,
        digest: sha256(licenseBytes),
      });
      releaseComponent = {
        ...releaseComponent,
        repository: upstream.repository,
        revision: upstream.revision,
        skillPath: upstream.skillPath,
        license: upstream.license,
        attribution: upstream.attribution,
        localChanges: upstream.localChanges,
      };
    }

    await assertRealChild(sourceRoot, directory);

    const markdown = await readFile(join(directory, "SKILL.md"), "utf8");
    const validation = validateSkill({
      name: component.id,
      directory,
      skillFile: join(directory, "SKILL.md"),
      markdown,
    });
    if (!validation.valid) {
      throw new Error(
        `Invalid skill ${component.id}: ${validation.errors.join("; ")}`,
      );
    }
    const actualDigest = await digestTree(directory);
    if (actualDigest !== component.digest) {
      throw new Error(`Skill digest mismatch: ${component.id}.`);
    }
    inputs.push({ component: releaseComponent, directory });
  }

  const release: SolutionRelease = {
    schemaVersion: 1,
    id: manifest.id,
    version: manifest.version,
    outcome: manifest.outcome,
    entrypoint: manifest.entrypoint,
    hosts: manifest.hosts,
    qualityGates: manifest.qualityGates,
    components: inputs.map(({ component }) => component),
    notices,
  };
  await mkdir(dirname(outputDirectory), { recursive: true });
  const temporaryDirectory = `${outputDirectory}.tmp-${randomUUID()}`;
  try {
    await mkdir(join(temporaryDirectory, "skills"), { recursive: true });
    await mkdir(join(temporaryDirectory, "licenses"), { recursive: true });
    for (const input of inputs) {
      await cp(
        input.directory,
        join(temporaryDirectory, "skills", input.component.id),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
        },
      );
    }
    for (const licenseFile of licenseFiles) {
      await writeFile(
        join(temporaryDirectory, licenseFile.destination),
        licenseFile.bytes,
      );
    }
    await writeFile(join(temporaryDirectory, "LICENSE"), productLicenseBytes);
    await writeFile(
      join(temporaryDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: `agent-skills-solution-${release.id}`,
          version: release.version,
          private: true,
          description: release.outcome,
          files: ["skills", "licenses", "NOTICE.md", "solution-release.json"],
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      join(temporaryDirectory, "NOTICE.md"),
      renderNotice(release),
    );
    await writeFile(
      join(temporaryDirectory, "solution-release.json"),
      `${JSON.stringify(release, null, 2)}\n`,
    );
    await verifySolutionRelease(temporaryDirectory);
    await rename(temporaryDirectory, outputDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  return release;
}

export async function verifySolutionRelease(
  directory: string,
): Promise<SolutionRelease> {
  const root = await lstat(directory);
  if (!root.isDirectory() || root.isSymbolicLink()) {
    throw new Error("Release root must be a real directory.");
  }
  const releaseFile = join(directory, "solution-release.json");
  const productLicense = await lstat(join(directory, "LICENSE"));
  if (!productLicense.isFile() || productLicense.isSymbolicLink()) {
    throw new Error("Release product license must be a regular file.");
  }
  const releaseFileInfo = await lstat(releaseFile);
  if (!releaseFileInfo.isFile() || releaseFileInfo.isSymbolicLink()) {
    throw new Error("Release manifest must be a regular file.");
  }
  const raw: unknown = JSON.parse(await readFile(releaseFile, "utf8"));
  if (!isRelease(raw)) {
    throw new Error("Invalid solution release manifest.");
  }
  const upstreamIds = raw.components
    .filter((component) => component.source === "upstream")
    .map((component) => component.id)
    .sort();
  const noticeIds = raw.notices.map((notice) => notice.id).sort();
  if (upstreamIds.join(",") !== noticeIds.join(",")) {
    throw new Error("Release notice set does not match upstream components.");
  }
  for (const component of raw.components) {
    const skillDirectory = join(directory, "skills", component.id);
    const actual = await digestTree(skillDirectory);
    if (actual !== component.digest) {
      throw new Error(`Release skill digest mismatch: ${component.id}.`);
    }
    const skillFile = join(skillDirectory, "SKILL.md");
    const validation = validateSkill({
      name: component.id,
      directory: skillDirectory,
      skillFile,
      markdown: await readFile(skillFile, "utf8"),
    });
    if (!validation.valid) {
      throw new Error(
        `Invalid skill in release ${component.id}: ${validation.errors.join("; ")}`,
      );
    }
  }
  for (const notice of raw.notices) {
    const path = join(directory, notice.file);
    const file = await lstat(path);
    if (!file.isFile() || file.isSymbolicLink()) {
      throw new Error(`Release notice is invalid: ${notice.id}.`);
    }
    if (sha256(await readFile(path)) !== notice.digest) {
      throw new Error(`Release notice digest mismatch: ${notice.id}.`);
    }
  }
  return raw;
}

export async function packSolutionRelease(
  releaseDirectory: string,
  destinationDirectory: string,
): Promise<{ path: string; digest: string }> {
  const release = await verifySolutionRelease(releaseDirectory);
  const source = resolve(releaseDirectory);
  const destination = resolve(destinationDirectory);
  if (destination === source || destination.startsWith(`${source}${sep}`)) {
    throw new Error(
      "Archive destination must be outside the release directory.",
    );
  }
  await mkdir(destination, { recursive: true });
  const expectedName = `agent-skills-solution-${release.id}-${release.version}.tgz`;
  const expectedPath = join(destination, expectedName);
  if (await exists(expectedPath)) {
    throw new Error(`Release archive already exists: ${expectedPath}`);
  }
  const { stdout } = await execa("npm", [
    "pack",
    source,
    "--pack-destination",
    destination,
    "--json",
  ]);
  const metadata: unknown = JSON.parse(stdout);
  if (
    !Array.isArray(metadata) ||
    metadata.length !== 1 ||
    typeof metadata[0] !== "object" ||
    metadata[0] === null ||
    metadata[0].filename !== expectedName
  ) {
    throw new Error("Unexpected npm pack output for solution release.");
  }
  return { path: expectedPath, digest: sha256(await readFile(expectedPath)) };
}

function renderNotice(release: SolutionRelease): string {
  const lines = [
    `# ${release.id} ${release.version} attribution`,
    "",
    "This release includes these pinned public components:",
    "",
  ];
  for (const component of release.components.filter(
    (item) => item.source === "upstream",
  )) {
    lines.push(
      `- **${component.id}**: ${component.repository} at ${component.revision}; ` +
        `path \`${component.skillPath}\`; license ${component.license}; ` +
        `attribution ${component.attribution}; local changes ${component.localChanges}.`,
    );
  }
  lines.push(
    "",
    "Original components are covered by `LICENSE`.",
    "Upstream license texts are in `licenses/`.",
    "",
  );
  return lines.join("\n");
}

function safeChild(root: string, relative: string): string {
  const base = resolve(root);
  const result = resolve(base, relative);
  if (result === base || !result.startsWith(`${base}${sep}`)) {
    throw new Error(`Path escapes source root: ${relative}`);
  }
  return result;
}

async function assertRealChild(root: string, child: string): Promise<void> {
  const base = await realpath(root);
  const actual = await realpath(child);
  if (!actual.startsWith(`${base}${sep}`)) {
    throw new Error(
      `Source path escapes root through a symbolic link: ${child}`,
    );
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isRelease(value: unknown): value is SolutionRelease {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const item = value as Record<string, unknown>;
  if (
    item.schemaVersion !== 1 ||
    typeof item.id !== "string" ||
    !IDENTIFIER.test(item.id) ||
    typeof item.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(item.version) ||
    typeof item.entrypoint !== "string" ||
    !IDENTIFIER.test(item.entrypoint) ||
    typeof item.outcome !== "string" ||
    !item.outcome.trim() ||
    !Array.isArray(item.hosts) ||
    item.hosts.length === 0 ||
    item.hosts.some((host) => host !== "codex" && host !== "claude-code") ||
    !Array.isArray(item.qualityGates) ||
    item.qualityGates.length === 0 ||
    item.qualityGates.some((gate) => typeof gate !== "string") ||
    !Array.isArray(item.components) ||
    item.components.length === 0 ||
    !Array.isArray(item.notices)
  )
    return false;
  const components = item.components as unknown[];
  if (
    components.some((component) => {
      if (
        typeof component !== "object" ||
        component === null ||
        Array.isArray(component)
      )
        return true;
      const record = component as Record<string, unknown>;
      return (
        typeof record.id !== "string" ||
        !IDENTIFIER.test(record.id) ||
        (record.source !== "bundled" && record.source !== "upstream") ||
        typeof record.digest !== "string" ||
        !DIGEST.test(record.digest) ||
        (record.source === "upstream" &&
          (typeof record.revision !== "string" ||
            !/^[a-f0-9]{40}$/.test(record.revision) ||
            typeof record.repository !== "string" ||
            !record.repository ||
            typeof record.skillPath !== "string" ||
            !record.skillPath ||
            typeof record.license !== "string" ||
            !record.license ||
            typeof record.attribution !== "string" ||
            !record.attribution ||
            typeof record.localChanges !== "string" ||
            !record.localChanges))
      );
    })
  )
    return false;
  if (
    new Set(components.map((component) => (component as { id: string }).id))
      .size !== components.length ||
    !components.some(
      (component) => (component as { id: string }).id === item.entrypoint,
    )
  )
    return false;
  return !(item.notices as unknown[]).some((notice) => {
    if (typeof notice !== "object" || notice === null || Array.isArray(notice))
      return true;
    const record = notice as Record<string, unknown>;
    return (
      typeof record.id !== "string" ||
      !IDENTIFIER.test(record.id) ||
      record.file !== `licenses/${record.id}-LICENSE` ||
      typeof record.digest !== "string" ||
      !DIGEST.test(record.digest)
    );
  });
}
