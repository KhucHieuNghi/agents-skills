import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import process from "node:process";

export const languageRegistryProvenance = Object.freeze({
  source:
    "https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry",
  fileDate: "2026-11-18",
  sourceSha256:
    "8ac4e58567593c96e9e6d66e2017dbb8d3953dbcb42fe32ecd3b3fccdfdaba7b",
});

/** Extract only the reviewed hreflang subset, not a complete BCP 47 registry. */
export function buildLanguageRegistry(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length > 2 * 1024 * 1024 ||
    createHash("sha256").update(bytes).digest("hex") !==
      languageRegistryProvenance.sourceSha256
  )
    throw new Error("Language registry source hash mismatch");
  const blocks = bytes.toString("utf8").split("%%");
  if (
    blocks.shift().trim() !==
    `File-Date: ${languageRegistryProvenance.fileDate}`
  )
    throw new Error("Language registry date mismatch");
  const sets = { language: [], script: [], region: [] };
  const deprecated = { language: [], script: [], region: [] };
  for (const block of blocks) {
    const field = (name) => {
      const matches = [...block.matchAll(new RegExp(`^${name}: (.+)$`, "gm"))];
      if (matches.length > 1)
        throw new Error(`Duplicate registry field: ${name}`);
      return matches[0]?.[1];
    };
    const kind = field("Type");
    if (!Object.hasOwn(sets, kind)) continue;
    const subtag = field("Subtag")?.toLowerCase();
    const pattern = kind === "script" ? /^[a-z]{4}$/ : /^[a-z]{2}$/;
    if (!subtag || !pattern.test(subtag)) continue;
    if (sets[kind].includes(subtag))
      throw new Error("Duplicate registry subtag");
    sets[kind].push(subtag);
    if (field("Deprecated")) deprecated[kind].push(subtag);
  }
  for (const group of [sets, deprecated])
    for (const values of Object.values(group)) values.sort();
  return { ...languageRegistryProvenance, sets, deprecated };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.length !== 4)
    throw new Error(
      "Usage: language-registry-build.mjs SOURCE_TEXT NEW_OUTPUT_JSON",
    );
  const registry = buildLanguageRegistry(await readFile(process.argv[2]));
  await writeFile(process.argv[3], JSON.stringify(registry, null, 2) + "\n", {
    flag: "wx",
  });
  process.stdout.write(JSON.stringify(languageRegistryProvenance) + "\n");
}
