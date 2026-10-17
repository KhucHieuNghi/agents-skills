import { randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { digestTree } from "./integrity.js";
import { verifySolutionRelease } from "./release.js";
import type { Target } from "./types.js";

export type InstallSolutionOptions = {
  releaseDirectory: string;
  expectedDigest: string;
  projectDirectory: string;
  targets: Target[];
};

type InstalledLock = {
  schemaVersion: 1;
  solutions: Record<
    string,
    {
      version: string;
      digest: string;
      targets: Target[];
      components: Array<{ id: string; digest: string }>;
    }
  >;
};

export async function installSolutionRelease(
  options: InstallSolutionOptions,
): Promise<void> {
  const releaseDirectory = resolve(options.releaseDirectory);
  const project = resolve(options.projectDirectory);
  const release = await verifySolutionRelease(releaseDirectory);
  if (!/^[a-f0-9]{64}$/.test(options.expectedDigest)) {
    throw new Error("Expected release digest must be SHA-256.");
  }
  if ((await digestTree(releaseDirectory)) !== options.expectedDigest) {
    throw new Error("Release digest differs from the expected fingerprint.");
  }
  const targets = [...new Set(options.targets)];
  if (
    targets.length === 0 ||
    targets.some(
      (target) =>
        (target !== "codex" && target !== "claude-code") ||
        !release.hosts.includes(target),
    )
  ) {
    throw new Error("Release does not support the requested targets.");
  }
  const projectInfo = await lstat(project);
  if (!projectInfo.isDirectory() || projectInfo.isSymbolicLink()) {
    throw new Error("Project root must be a real directory.");
  }

  const canonicalRoot = join(
    project,
    targets.includes("codex") ? ".agents" : ".claude",
    "skills",
  );
  const claudeRoot = join(project, ".claude", "skills");
  const stateRoot = join(project, ".agent-skills");
  const parents = [stateRoot, canonicalRoot];
  if (targets.includes("codex") && targets.includes("claude-code")) {
    parents.push(claudeRoot);
  }
  for (const parent of parents) {
    await assertSafeParent(project, parent);
  }
  for (const component of release.components) {
    if (await exists(join(canonicalRoot, component.id))) {
      throw new Error(`Skill already exists in project: ${component.id}.`);
    }
    if (
      canonicalRoot !== claudeRoot &&
      targets.includes("claude-code") &&
      (await exists(join(claudeRoot, component.id)))
    ) {
      throw new Error(
        `Claude skill already exists in project: ${component.id}.`,
      );
    }
  }

  await mkdir(stateRoot, { recursive: true });
  const lockPath = join(stateRoot, "install.lock");
  const lockHandle = await open(lockPath, "wx", 0o600);
  const created: string[] = [];
  const staging = join(stateRoot, `stage-${randomUUID()}`);
  let completed = false;
  try {
    const installedPath = join(stateRoot, "installed.json");
    const installed = await readInstalledLock(installedPath);
    if (installed.solutions[release.id] !== undefined) {
      throw new Error(`Solution already installed: ${release.id}.`);
    }
    await mkdir(staging);
    for (const component of release.components) {
      await cp(
        join(releaseDirectory, "skills", component.id),
        join(staging, component.id),
        { recursive: true, force: false, errorOnExist: true },
      );
    }
    await mkdir(canonicalRoot, { recursive: true });
    if (targets.includes("codex") && targets.includes("claude-code")) {
      await mkdir(claudeRoot, { recursive: true });
    }
    for (const component of release.components) {
      const destination = join(canonicalRoot, component.id);
      if (await exists(destination)) {
        throw new Error(`Skill collision during install: ${component.id}.`);
      }
      await rename(join(staging, component.id), destination);
      created.push(destination);
      if (targets.includes("codex") && targets.includes("claude-code")) {
        const link = join(claudeRoot, component.id);
        await symlink(`../../.agents/skills/${component.id}`, link);
        created.push(link);
      }
    }
    installed.solutions[release.id] = {
      version: release.version,
      digest: options.expectedDigest,
      targets,
      components: release.components.map(({ id, digest }) => ({ id, digest })),
    };
    const temporaryLock = join(stateRoot, `installed.json.tmp-${randomUUID()}`);
    await writeFile(temporaryLock, `${JSON.stringify(installed, null, 2)}\n`, {
      mode: 0o600,
    });
    try {
      await rename(temporaryLock, installedPath);
    } catch (error) {
      await rm(temporaryLock, { force: true });
      throw error;
    }
    completed = true;
  } finally {
    if (!completed) {
      for (const path of created.reverse()) {
        await rm(path, { recursive: true, force: true });
      }
    }
    await rm(staging, { recursive: true, force: true });
    await lockHandle.close();
    await rm(lockPath, { force: true });
  }
}

export async function upgradeSolutionRelease(
  options: InstallSolutionOptions,
): Promise<void> {
  const releaseDirectory = resolve(options.releaseDirectory);
  const project = resolve(options.projectDirectory);
  const release = await verifySolutionRelease(releaseDirectory);
  if (
    !/^[a-f0-9]{64}$/.test(options.expectedDigest) ||
    (await digestTree(releaseDirectory)) !== options.expectedDigest
  ) {
    throw new Error("Release digest differs from the expected fingerprint.");
  }
  const targets = [...new Set(options.targets)];
  if (
    targets.length === 0 ||
    targets.some(
      (target) =>
        (target !== "codex" && target !== "claude-code") ||
        !release.hosts.includes(target),
    )
  ) {
    throw new Error("Release does not support the requested targets.");
  }
  const projectInfo = await lstat(project);
  if (!projectInfo.isDirectory() || projectInfo.isSymbolicLink()) {
    throw new Error("Project root must be a real directory.");
  }
  const canonicalRoot = join(
    project,
    targets.includes("codex") ? ".agents" : ".claude",
    "skills",
  );
  const claudeRoot = join(project, ".claude", "skills");
  const stateRoot = join(project, ".agent-skills");
  for (const parent of [
    stateRoot,
    canonicalRoot,
    ...(targets.includes("codex") && targets.includes("claude-code")
      ? [claudeRoot]
      : []),
  ]) {
    await assertSafeParent(project, parent);
  }
  await mkdir(stateRoot, { recursive: true });
  const lockPath = join(stateRoot, "install.lock");
  const lockHandle = await open(lockPath, "wx", 0o600);
  const staging = join(stateRoot, `stage-${randomUUID()}`);
  const backup = join(stateRoot, `backup-${randomUUID()}`);
  const created: string[] = [];
  const moved: Array<{ original: string; saved: string }> = [];
  let completed = false;
  try {
    const installedPath = join(stateRoot, "installed.json");
    const installed = await readInstalledLock(installedPath);
    const previous = installed.solutions[release.id];
    if (previous === undefined) {
      throw new Error(`Solution is not installed: ${release.id}.`);
    }
    if (compareVersion(release.version, previous.version) <= 0) {
      throw new Error(
        `Upgrade requires a higher solution version than ${previous.version}.`,
      );
    }
    if (
      [...previous.targets].sort().join(",") !== [...targets].sort().join(",")
    ) {
      throw new Error("Upgrade targets must match the existing installation.");
    }
    const previousIds = new Set(previous.components.map(({ id }) => id));
    for (const component of previous.components) {
      const current = join(canonicalRoot, component.id);
      if (
        !(await exists(current)) ||
        (await digestTree(current)) !== component.digest
      ) {
        throw new Error(`Installed skill was modified: ${component.id}.`);
      }
      if (targets.includes("codex") && targets.includes("claude-code")) {
        const link = join(claudeRoot, component.id);
        if (
          !(await exists(link)) ||
          !(await lstat(link)).isSymbolicLink() ||
          (await readlink(link)) !== `../../.agents/skills/${component.id}`
        ) {
          throw new Error(
            `Installed Claude skill was modified: ${component.id}.`,
          );
        }
      }
    }
    for (const component of release.components) {
      if (
        !previousIds.has(component.id) &&
        (await exists(join(canonicalRoot, component.id)))
      ) {
        throw new Error(
          `New skill collides with an existing skill: ${component.id}.`,
        );
      }
      if (
        !previousIds.has(component.id) &&
        targets.includes("codex") &&
        targets.includes("claude-code") &&
        (await exists(join(claudeRoot, component.id)))
      ) {
        throw new Error(`New Claude skill collides: ${component.id}.`);
      }
    }

    await mkdir(staging);
    await mkdir(backup);
    for (const component of release.components) {
      await cp(
        join(releaseDirectory, "skills", component.id),
        join(staging, component.id),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
        },
      );
    }
    for (const component of previous.components) {
      const original = join(canonicalRoot, component.id);
      const saved = join(backup, `skill-${component.id}`);
      await rename(original, saved);
      moved.push({ original, saved });
      if (targets.includes("codex") && targets.includes("claude-code")) {
        const link = join(claudeRoot, component.id);
        const savedLink = join(backup, `claude-${component.id}`);
        await rename(link, savedLink);
        moved.push({ original: link, saved: savedLink });
      }
    }
    for (const component of release.components) {
      const destination = join(canonicalRoot, component.id);
      if (await exists(destination)) {
        throw new Error(`Skill collision during upgrade: ${component.id}.`);
      }
      await rename(join(staging, component.id), destination);
      created.push(destination);
      if (targets.includes("codex") && targets.includes("claude-code")) {
        const link = join(claudeRoot, component.id);
        await symlink(`../../.agents/skills/${component.id}`, link);
        created.push(link);
      }
    }
    installed.solutions[release.id] = {
      version: release.version,
      digest: options.expectedDigest,
      targets,
      components: release.components.map(({ id, digest }) => ({ id, digest })),
    };
    const temporaryLock = join(stateRoot, `installed.json.tmp-${randomUUID()}`);
    await writeFile(temporaryLock, `${JSON.stringify(installed, null, 2)}\n`, {
      mode: 0o600,
    });
    try {
      await rename(temporaryLock, installedPath);
    } catch (error) {
      await rm(temporaryLock, { force: true });
      throw error;
    }
    completed = true;
  } finally {
    if (!completed) {
      for (const path of created.reverse()) {
        await rm(path, { recursive: true, force: true });
      }
      for (const { original, saved } of moved.reverse()) {
        await rename(saved, original);
      }
    }
    await rm(staging, { recursive: true, force: true });
    await rm(backup, { recursive: true, force: true });
    await lockHandle.close();
    await rm(lockPath, { force: true });
  }
}

function compareVersion(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) {
      return (a[index] ?? 0) - (b[index] ?? 0);
    }
  }
  return 0;
}

async function readInstalledLock(path: string): Promise<InstalledLock> {
  if (!(await exists(path))) {
    return { schemaVersion: 1, solutions: {} };
  }
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error("Installation lock must be a regular file.");
  }
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).schemaVersion !== 1 ||
    typeof (value as Record<string, unknown>).solutions !== "object" ||
    (value as Record<string, unknown>).solutions === null ||
    Array.isArray((value as Record<string, unknown>).solutions)
  ) {
    throw new Error("Invalid installation lock.");
  }
  const solutions = (value as InstalledLock).solutions;
  for (const [id, entry] of Object.entries(solutions)) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
      typeof entry !== "object" ||
      entry === null ||
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      !/^[a-f0-9]{64}$/.test(entry.digest) ||
      !Array.isArray(entry.targets) ||
      entry.targets.length === 0 ||
      new Set(entry.targets).size !== entry.targets.length ||
      entry.targets.some(
        (target) => target !== "codex" && target !== "claude-code",
      ) ||
      !Array.isArray(entry.components) ||
      entry.components.length === 0 ||
      entry.components.some(
        (component) =>
          typeof component !== "object" ||
          component === null ||
          typeof component.id !== "string" ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(component.id) ||
          typeof component.digest !== "string" ||
          !/^[a-f0-9]{64}$/.test(component.digest),
      ) ||
      new Set(entry.components.map(({ id: componentId }) => componentId))
        .size !== entry.components.length
    ) {
      throw new Error("Invalid installation lock.");
    }
  }
  return value as InstalledLock;
}

async function assertSafeParent(project: string, path: string): Promise<void> {
  const segments = relative(project, path).split(sep);
  let current = project;
  for (const segment of segments) {
    current = join(current, segment);
    if (!(await exists(current))) continue;
    const info = await lstat(current);
    if (info.isSymbolicLink()) {
      throw new Error(
        `Project skill path contains a symbolic link: ${current}`,
      );
    }
    if (!info.isDirectory()) {
      throw new Error(`Project skill path is not a directory: ${current}`);
    }
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}
