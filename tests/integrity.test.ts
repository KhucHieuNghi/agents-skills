import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { digestTree } from "../src/integrity.js";

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-digest-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

it("gives equal digests for equal trees regardless of file creation order", async () => {
  const first = await temporaryDirectory();
  const second = await temporaryDirectory();
  await mkdir(join(first, "references"));
  await writeFile(join(first, "SKILL.md"), "skill\n");
  await writeFile(join(first, "references", "guide.md"), "guide\n");
  await mkdir(join(second, "references"));
  await writeFile(join(second, "references", "guide.md"), "guide\n");
  await writeFile(join(second, "SKILL.md"), "skill\n");

  expect(await digestTree(first)).toBe(await digestTree(second));
  await writeFile(join(second, "references", "guide.md"), "changed\n");
  expect(await digestTree(first)).not.toBe(await digestTree(second));
});

it("rejects symlinks inside a packaged skill", async () => {
  const directory = await temporaryDirectory();
  await writeFile(join(directory, "SKILL.md"), "skill\n");
  await symlink("SKILL.md", join(directory, "alias"));

  await expect(digestTree(directory)).rejects.toThrow(/symbolic link/i);
});

it("orders paths by UTF-8 bytes rather than machine locale", async () => {
  const directory = await temporaryDirectory();
  await writeFile(join(directory, "z.txt"), "ascii");
  await writeFile(join(directory, "ä.txt"), "unicode");
  const expected = createHash("sha256");
  for (const [name, content] of [
    ["z.txt", "ascii"],
    ["ä.txt", "unicode"],
  ]) {
    expected.update(name);
    expected.update("\0");
    expected.update(createHash("sha256").update(content).digest("hex"));
    expected.update("\n");
  }
  expect(await digestTree(directory)).toBe(expected.digest("hex"));
});
