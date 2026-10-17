import { readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, posix, relative, sep } from "node:path";
import { execa } from "execa";
import { parse } from "yaml";
import { resolveCacheDirectory } from "./config.js";
import { digestTree } from "./integrity.js";
import { stageSource } from "./source.js";

export type UpstreamRecord = {
  id: string;
  repository: string;
  revision: string;
  skillPath: string;
  digest: string;
  license: string;
  licenseFile: string;
  attribution: string;
  localChanges: string;
  topics: string[];
};

export type UpstreamStatus = {
  id: string;
  pinned: string;
  latest: string;
  latestDigest: string;
  repositoryMoved: boolean;
  updateAvailable: boolean;
};

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMIT = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;

export async function loadUpstreams(
  file: string,
): Promise<Map<string, UpstreamRecord>> {
  const document: unknown = parse(await readFile(file, "utf8"));
  if (!isRecord(document) || !isRecord(document.upstreams)) {
    throw new Error("Catalog must define upstreams.");
  }
  const records = new Map<string, UpstreamRecord>();
  for (const [id, raw] of Object.entries(document.upstreams)) {
    if (!IDENTIFIER.test(id) || !isRecord(raw)) {
      throw new Error(`Invalid upstream record: ${id}`);
    }
    const repository = requiredString(raw, "repository", id);
    const url = new URL(repository);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(`Upstream ${id} requires a public HTTPS repository URL.`);
    }
    const revision = requiredString(raw, "revision", id);
    if (!COMMIT.test(revision)) {
      throw new Error(`Upstream ${id} revision must be a full commit SHA.`);
    }
    const digest = requiredString(raw, "digest", id);
    if (!DIGEST.test(digest)) {
      throw new Error(`Upstream ${id} digest must be SHA-256.`);
    }
    const skillPath = safeRelativePath(
      requiredString(raw, "skillPath", id),
      id,
    );
    const licenseFile = safeRelativePath(
      requiredString(raw, "licenseFile", id),
      id,
    );
    const topics = raw.topics;
    if (
      !Array.isArray(topics) ||
      topics.length === 0 ||
      topics.some(
        (topic) => typeof topic !== "string" || !IDENTIFIER.test(topic),
      )
    ) {
      throw new Error(`Upstream ${id} requires topic identifiers.`);
    }
    records.set(id, {
      id,
      repository,
      revision,
      skillPath,
      digest,
      license: requiredString(raw, "license", id),
      licenseFile,
      attribution: requiredString(raw, "attribution", id),
      localChanges: requiredString(raw, "localChanges", id),
      topics,
    });
  }
  return records;
}

export async function checkUpstreams(
  upstreams: Iterable<UpstreamRecord>,
  cacheDirectory = resolveCacheDirectory(homedir()),
): Promise<UpstreamStatus[]> {
  const statuses: UpstreamStatus[] = [];
  for (const upstream of upstreams) {
    const pinnedDigest = await digestAtRevision(
      upstream,
      upstream.revision,
      cacheDirectory,
    );
    if (pinnedDigest !== upstream.digest) {
      throw new Error(`Pinned upstream digest mismatch: ${upstream.id}.`);
    }
    const { stdout } = await execa("git", [
      "ls-remote",
      upstream.repository,
      "HEAD",
    ]);
    const latest = stdout.split(/\s+/)[0];
    if (!COMMIT.test(latest)) {
      throw new Error(`Could not resolve remote HEAD for ${upstream.id}.`);
    }
    const latestDigest =
      latest === upstream.revision
        ? pinnedDigest
        : await digestAtRevision(upstream, latest, cacheDirectory);
    statuses.push({
      id: upstream.id,
      pinned: upstream.revision,
      latest,
      latestDigest,
      repositoryMoved: latest !== upstream.revision,
      updateAvailable: latestDigest !== upstream.digest,
    });
  }
  return statuses;
}

async function digestAtRevision(
  upstream: UpstreamRecord,
  revision: string,
  cacheDirectory: string,
): Promise<string> {
  const staged = await stageSource(
    { kind: "git", value: upstream.repository, revision },
    cacheDirectory,
  );
  const root = await realpath(staged.directory);
  const skillDirectory = await realpath(join(root, upstream.skillPath));
  const withinRoot = relative(root, skillDirectory);
  if (
    withinRoot === "" ||
    withinRoot === ".." ||
    withinRoot.startsWith(`..${sep}`) ||
    withinRoot.startsWith(sep)
  ) {
    throw new Error(`Upstream ${upstream.id} skill path escapes checkout.`);
  }
  return digestTree(skillDirectory);
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  id: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Upstream ${id} requires ${key}.`);
  }
  return value;
}

function safeRelativePath(path: string, id: string): string {
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path
      .split("/")
      .some((part) => part === "." || part === ".." || part === "") ||
    posix.normalize(path) !== path
  ) {
    throw new Error(`Upstream ${id} has unsafe path: ${path}`);
  }
  return path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
