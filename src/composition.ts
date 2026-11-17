import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";

export type CompositionSummary = { sourceIds: string[]; noticeFile: string };
const SHA = /^[a-f0-9]{64}$/;
const REVISION = /^[a-f0-9]{40}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid composition record.");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Invalid composition string.");
  return value;
}
function pathField(value: unknown): string {
  const path = text(value);
  if (
    path.includes("\\") ||
    path.includes("\0") ||
    path.startsWith("/") ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    /^[a-z]+:/i.test(path)
  )
    throw new Error("Invalid composition path.");
  return path;
}
function sha(value: unknown): string {
  const result = text(value);
  if (!SHA.test(result)) throw new Error("Invalid composition digest.");
  return result;
}

/** Verifies packaged bytes and declared lineage, not upstream license sufficiency or audit efficacy. */
export async function verifyComposition(
  directory: string,
): Promise<CompositionSummary | undefined> {
  const lockPath = join(directory, "provenance.lock.json");
  try {
    await lstat(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const root = await lstat(directory);
  if (!root.isDirectory() || root.isSymbolicLink())
    throw new Error("Composition root must be a real directory.");
  const files = new Map<string, Buffer>();
  async function visit(relative: string): Promise<void> {
    for (const entry of await readdir(join(directory, relative), {
      withFileTypes: true,
    })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink())
        throw new Error("Symbolic link in composition.");
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        files.set(path, await readFile(join(directory, path)));
      else throw new Error("Unsupported composition file.");
    }
  }
  await visit("");
  const lock = record(
    JSON.parse(files.get("provenance.lock.json")!.toString("utf8")),
  );
  if (
    lock.schemaVersion !== 1 ||
    !Array.isArray(lock.sources) ||
    !lock.sources.length ||
    !Array.isArray(lock.files)
  )
    throw new Error("Invalid composition lock.");
  const sourceIds = new Set<string>();
  for (const value of lock.sources) {
    const source = record(value);
    const id = text(source.id);
    if (!ID.test(id) || sourceIds.has(id))
      throw new Error("Invalid or duplicate source id.");
    sourceIds.add(id);
    const repository = new URL(text(source.repository));
    if (
      repository.protocol !== "https:" ||
      repository.username ||
      repository.password ||
      repository.hash ||
      repository.search
    )
      throw new Error("Invalid source repository.");
    if (!REVISION.test(text(source.revision)))
      throw new Error("Invalid source revision.");
    pathField(source.skillPath);
    sha(source.digest);
    text(source.license);
    text(source.attribution);
    const license = files.get(pathField(source.licenseFile));
    if (!license?.length || digest(license) !== sha(source.licenseDigest))
      throw new Error("Source license digest mismatch.");
  }
  const expected = new Set<string>();
  for (const value of lock.files) {
    const file = record(value);
    const path = pathField(file.path);
    if (expected.has(path) || path === "provenance.lock.json")
      throw new Error("Duplicate or self-referencing composition path.");
    expected.add(path);
    if (path.endsWith("/SKILL.md"))
      throw new Error("Composition must expose exactly one SKILL.md.");
    const bytes = files.get(path);
    if (!bytes || digest(bytes) !== sha(file.digest))
      throw new Error(`Composition digest mismatch: ${path}`);
    if (
      !Array.isArray(file.sourceIds) ||
      file.sourceIds.some((id) => typeof id !== "string" || !sourceIds.has(id))
    )
      throw new Error("Unknown composition source.");
    if (file.origin === "original") {
      if (file.sourceIds.length)
        throw new Error("Original file cannot declare adapted sources.");
    } else if (file.origin === "adapted" || file.origin === "copied") {
      if (!file.sourceIds.length)
        throw new Error("Missing composition source mapping.");
      text(file.changes);
      text(file.reviewer);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text(file.reviewedAt)))
        throw new Error("Invalid review date.");
    } else throw new Error("Invalid composition origin.");
  }
  const actual = [...files.keys()].filter(
    (path) => path !== "provenance.lock.json",
  );
  if (
    actual.length !== expected.size ||
    actual.some((path) => !expected.has(path))
  )
    throw new Error("Composition file set mismatch.");
  if (!expected.has("SKILL.md") || !files.get("NOTICE.md")?.length)
    throw new Error("Composition requires SKILL.md and NOTICE.md.");
  // Package references use inline Markdown links. Anchor validity is a separate content review.
  for (const [path, bytes] of files) {
    if (!path.endsWith(".md")) continue;
    const markdown = bytes.toString("utf8").replace(/```[\s\S]*?```/g, "");
    for (const match of markdown.matchAll(
      /\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g,
    )) {
      const target = match[1].replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      const clean = decodeURIComponent(target.split("#")[0]);
      const resolved = posix.normalize(
        posix.join(dirname(path).replaceAll("\\", "/"), clean),
      );
      if (
        clean.startsWith("/") ||
        clean.includes("\\") ||
        resolved === ".." ||
        resolved.startsWith("../") ||
        !files.has(resolved)
      )
        throw new Error(
          `Missing or escaping local reference: ${path} -> ${target}`,
        );
    }
  }
  return { sourceIds: [...sourceIds].sort(), noticeFile: "NOTICE.md" };
}
