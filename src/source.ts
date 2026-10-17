import { access, chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { platform } from "node:os";
import { resolve } from "node:path";
import { execa } from "execa";
import type { CommandRunner, SourceReference } from "./types.js";

export type StagedSource = { directory: string; cached: boolean };

const defaultRunner: CommandRunner = {
  async run(command, arguments_, cwd) {
    await execa(command, arguments_, { cwd });
  },
};

export async function stageSource(
  source: SourceReference,
  cacheDirectory: string,
  runner: CommandRunner = defaultRunner,
): Promise<StagedSource> {
  if (source.kind === "path") {
    const directory = resolve(source.value);
    await verifyDirectory(directory);
    return { directory, cached: false };
  }

  if (source.revision !== undefined) {
    return stagePinnedSource(
      source.value,
      source.revision,
      cacheDirectory,
      runner,
    );
  }

  const directory = resolve(cacheDirectory, sourceCacheKey(source.value));

  try {
    await ensurePrivateDirectory(cacheDirectory);
    if (await directoryExists(directory)) {
      await runner.run("git", ["fetch", "--prune"], directory);
      await runner.run("git", ["pull", "--ff-only"], directory);
    } else {
      await runner.run("git", ["clone", "--", source.value, directory]);
    }
  } catch (error) {
    throw redactError(error);
  }

  return { directory, cached: true };
}

async function stagePinnedSource(
  source: string,
  revision: string,
  cacheDirectory: string,
  runner: CommandRunner,
): Promise<StagedSource> {
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error("Pinned Git revision must be a full 40-character commit.");
  }
  const directory = resolve(
    cacheDirectory,
    sourceCacheKey(`${source}\0${revision}`),
  );
  await ensurePrivateDirectory(cacheDirectory);
  if (await directoryExists(directory)) {
    await verifyPinnedCheckout(directory, revision);
    return { directory, cached: true };
  }

  const temporaryDirectory = `${directory}.tmp-${randomUUID()}`;
  try {
    await runner.run("git", [
      "clone",
      "--no-checkout",
      "--filter=blob:none",
      "--",
      source,
      temporaryDirectory,
    ]);
    await runner.run(
      "git",
      ["checkout", "--detach", revision],
      temporaryDirectory,
    );
    await verifyPinnedCheckout(temporaryDirectory, revision);
    await rename(temporaryDirectory, directory);
  } catch (error) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    throw redactError(error);
  }

  return { directory, cached: true };
}

async function verifyPinnedCheckout(
  directory: string,
  revision: string,
): Promise<void> {
  const [{ stdout: head }, { stdout: changes }] = await Promise.all([
    execa("git", ["rev-parse", "HEAD"], { cwd: directory }),
    execa("git", ["status", "--porcelain"], { cwd: directory }),
  ]);
  if (head !== revision || changes.length > 0) {
    throw new Error("Pinned Git cache differs from its recorded revision.");
  }
}

export function redactSourceError(message: string): string {
  return message
    .replace(
      /([a-z][a-z0-9+.-]*:\/\/)([^\s/@?#]+)@/gi,
      (_match, scheme: string, userInfo: string) =>
        `${scheme}${redactUrlUserInfo(userInfo)}@`,
    )
    .replace(
      /([?&](?:(?:access|auth|private|refresh|id)_)?token=)[^&#\s]*/gi,
      "$1<redacted>",
    );
}

function redactUrlUserInfo(userInfo: string): string {
  const passwordSeparator = userInfo.indexOf(":");
  return passwordSeparator === -1
    ? "<redacted>"
    : `${userInfo.slice(0, passwordSeparator)}:<redacted>`;
}

function sourceCacheKey(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

async function ensurePrivateDirectory(directory: string): Promise<void> {
  await mkdir(directory, { mode: 0o700, recursive: true });
  if (platform() !== "win32") {
    await chmod(directory, 0o700);
  }
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (isMissingPath(error)) {
      return false;
    }
    throw error;
  }
}

async function verifyDirectory(directory: string): Promise<void> {
  try {
    const metadata = await stat(directory);
    if (!metadata.isDirectory()) {
      throw new Error(`Local source is not a directory: ${directory}`);
    }
  } catch (error) {
    if (isMissingPath(error)) {
      throw new Error(`Local source does not exist: ${directory}`, {
        cause: error,
      });
    }
    throw error;
  }
  await access(directory);
}

function isMissingPath(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function redactError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(redactSourceError(String(error)));
  }

  error.message = redactSourceError(error.message);
  if (error.stack) {
    error.stack = redactSourceError(error.stack);
  }

  for (const [key, value] of Object.entries(error)) {
    if (typeof value === "string") {
      (error as Error & Record<string, unknown>)[key] =
        redactSourceError(value);
    }
  }

  return error;
}
