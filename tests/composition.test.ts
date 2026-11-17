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
import { afterEach, expect, it } from "vitest";
import { verifyComposition } from "../src/composition.js";

const directories: string[] = [];
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "composition-"));
  directories.push(root);
  await mkdir(join(root, "references"));
  await mkdir(join(root, "licenses"));
  const files = {
    "SKILL.md": "# Skill\n[Method](references/method.md)\n",
    "references/method.md": "Adapted method\n",
    "NOTICE.md": "Includes source-a under MIT.\n",
    "licenses/source-a.txt": "MIT License\nCopyright Example\n",
  };
  for (const [path, content] of Object.entries(files))
    await writeFile(join(root, path), content);
  const lock = {
    schemaVersion: 1,
    sources: [
      {
        id: "source-a",
        repository: "https://github.com/example/source.git",
        revision: "a".repeat(40),
        skillPath: "skills/example",
        digest: "b".repeat(64),
        license: "MIT",
        attribution: "Example",
        licenseFile: "licenses/source-a.txt",
        licenseDigest: hash(files["licenses/source-a.txt"]),
      },
    ],
    files: Object.entries(files).map(([path, content]) => ({
      path,
      digest: hash(content),
      origin: path === "references/method.md" ? "adapted" : "original",
      sourceIds: path === "references/method.md" ? ["source-a"] : [],
      changes: "Reviewed adaptation",
      reviewedAt: "2026-11-16",
      reviewer: "test reviewer",
    })),
  };
  await writeFile(join(root, "provenance.lock.json"), JSON.stringify(lock));
  return { root, lock };
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("accepts complete provenance and reports internal attribution", async () => {
  const { root } = await fixture();
  expect(await verifyComposition(root)).toEqual({
    sourceIds: ["source-a"],
    noticeFile: "NOTICE.md",
  });
});
it("leaves ordinary bundled skills without a composition lock unchanged", async () => {
  const { root } = await fixture();
  await rm(join(root, "provenance.lock.json"));
  expect(await verifyComposition(root)).toBeUndefined();
});
it("rejects modified adapted material", async () => {
  const { root } = await fixture();
  await writeFile(join(root, "references/method.md"), "tampered");
  await expect(verifyComposition(root)).rejects.toThrow(/digest/i);
});
it("rejects unrecorded files", async () => {
  const { root } = await fixture();
  await writeFile(join(root, "extra.txt"), "unreviewed");
  await expect(verifyComposition(root)).rejects.toThrow(/file set/i);
});
it("rejects a missing license", async () => {
  const { root } = await fixture();
  await rm(join(root, "licenses/source-a.txt"));
  await expect(verifyComposition(root)).rejects.toThrow();
});
it("rejects a second discoverable skill even when hashed", async () => {
  const { root, lock } = await fixture();
  await writeFile(join(root, "references/SKILL.md"), "nested");
  lock.files.push({
    ...lock.files[0],
    path: "references/SKILL.md",
    digest: hash("nested"),
  });
  await writeFile(join(root, "provenance.lock.json"), JSON.stringify(lock));
  await expect(verifyComposition(root)).rejects.toThrow(/one SKILL/i);
});
it("rejects escaping paths and unknown source IDs", async () => {
  const { root, lock } = await fixture();
  lock.files[1].sourceIds = ["missing"];
  await writeFile(join(root, "provenance.lock.json"), JSON.stringify(lock));
  await expect(verifyComposition(root)).rejects.toThrow(/source/i);
  lock.files[1].path = "../outside.md";
  await writeFile(join(root, "provenance.lock.json"), JSON.stringify(lock));
  await expect(verifyComposition(root)).rejects.toThrow(/path/i);
});
it("rejects adapted material with no declared source mapping", async () => {
  const { root, lock } = await fixture();
  lock.files[1].sourceIds = [];
  await writeFile(join(root, "provenance.lock.json"), JSON.stringify(lock));
  await expect(verifyComposition(root)).rejects.toThrow(/source mapping/i);
});
it("rejects symlinked source content", async () => {
  const { root } = await fixture();
  await rm(join(root, "references/method.md"));
  await symlink("../NOTICE.md", join(root, "references/method.md"));
  await expect(verifyComposition(root)).rejects.toThrow(/symbolic/i);
});
it("rejects a broken local reference despite matching file hashes", async () => {
  const { root, lock } = await fixture();
  const content = (await readFile(join(root, "SKILL.md"), "utf8")).replace(
    "references/method.md",
    "references/missing.md",
  );
  await writeFile(join(root, "SKILL.md"), content);
  lock.files[0].digest = hash(content);
  await writeFile(join(root, "provenance.lock.json"), JSON.stringify(lock));
  await expect(verifyComposition(root)).rejects.toThrow(/reference/i);
});
