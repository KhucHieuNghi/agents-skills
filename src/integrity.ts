import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** A stable digest of names and bytes of every regular file in a skill. */
export async function digestTree(directory: string): Promise<string> {
  const root = await lstat(directory);
  if (!root.isDirectory() || root.isSymbolicLink()) {
    throw new Error("Skill package root must be a real directory.");
  }

  const files: Array<{ path: string; bytes: Buffer }> = [];
  async function visit(path: string, parts: string[]): Promise<void> {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      const child = join(path, entry.name);
      const childParts = [...parts, entry.name];
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Symbolic link in skill package: ${childParts.join("/")}`,
        );
      }
      if (entry.isDirectory()) {
        await visit(child, childParts);
      } else if (entry.isFile()) {
        files.push({
          path: childParts.join("/"),
          bytes: await readFile(child),
        });
      } else {
        throw new Error(
          `Unsupported file in skill package: ${childParts.join("/")}`,
        );
      }
    }
  }

  await visit(directory, []);
  const hash = createHash("sha256");
  for (const file of files.sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.path, "utf8"),
      Buffer.from(right.path, "utf8"),
    ),
  )) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(createHash("sha256").update(file.bytes).digest("hex"));
    hash.update("\n");
  }
  return hash.digest("hex");
}
