import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
// Author tooling uses current source, never a potentially stale dist build.
const [
  { digestTree },
  { verifyComposition },
  { verifySolutionRelease },
  { validateSkill },
] = await Promise.all([
  tsImport("../src/integrity.ts", import.meta.url),
  tsImport("../src/composition.ts", import.meta.url),
  tsImport("../src/release.ts", import.meta.url),
  tsImport("../src/validation.ts", import.meta.url),
]);
import { validateAudit } from "../skills/content-search-audit/scripts/lib/validate.mjs";
import { validateCampaign } from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { validateCampaignReview } from "../skills/content-search-audit/scripts/lib/campaign-review.mjs";
const workspacePackage = fileURLToPath(
  new URL("../skills/content-search-audit", import.meta.url),
);
const isDigest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function check(condition, message) {
  if (!condition) throw new Error(message);
}
async function entrypoints(root) {
  const found = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      check(!entry.isSymbolicLink(), "Package symlinks are not allowed");
      if (entry.isDirectory()) await visit(target);
      else if (entry.name === "SKILL.md")
        found.push(path.relative(root, target));
    }
  }
  await visit(root);
  return found;
}
/** Verifies explicit local artifacts with this checkout's trusted validator code. */
export async function verifyContentAudit(
  config,
  baseDirectory = process.cwd(),
) {
  check(config?.schemaVersion === 1, "Unsupported verification config");
  check(
    typeof config.packageDirectory === "string" &&
      config.packageDirectory.trim(),
    "Package directory required",
  );
  check(
    isDigest(config.expectedComponentDigest),
    "Expected component digest required",
  );
  check(Array.isArray(config.artifacts), "Explicit artifacts array required");
  const resolve = (value) => {
    check(
      typeof value === "string" && value.trim(),
      "Artifact directory required",
    );
    return path.resolve(baseDirectory, value);
  };
  const packageDirectory = resolve(config.packageDirectory);
  const componentDigest = await digestTree(packageDirectory);
  check(
    componentDigest === config.expectedComponentDigest,
    "Package digest mismatch",
  );
  // Never import executable code from a supplied release to validate its own claims.
  check(
    componentDigest === (await digestTree(workspacePackage)),
    "Package does not match this checkout's trusted validator implementation; use its matching checkout",
  );
  const composition = await verifyComposition(packageDirectory);
  check(
    composition && composition.sourceIds.length > 0,
    "Composition provenance required",
  );
  const entries = await entrypoints(packageDirectory);
  check(
    entries.length === 1 && entries[0] === "SKILL.md",
    "Exactly one root customer entrypoint required",
  );
  const skill = validateSkill({
    name: "content-search-audit",
    directory: packageDirectory,
    skillFile: path.join(packageDirectory, "SKILL.md"),
    markdown: await readFile(path.join(packageDirectory, "SKILL.md"), "utf8"),
  });
  check(skill.valid, `Invalid skill: ${skill.errors.join("; ")}`);
  let release = null;
  if (config.release !== undefined) {
    check(
      isDigest(config.release.expectedDigest),
      "Expected release digest required",
    );
    const directory = resolve(config.release.directory);
    const digest = await digestTree(directory);
    check(digest === config.release.expectedDigest, "Release digest mismatch");
    const manifest = await verifySolutionRelease(directory);
    check(
      manifest.id === "content-search-audit" &&
        manifest.entrypoint === "content-search-audit",
      "Wrong solution entrypoint",
    );
    check(
      manifest.components.length === 1 &&
        manifest.components[0].id === "content-search-audit" &&
        manifest.components[0].digest === componentDigest,
      "Release must contain exactly the verified audit component",
    );
    check(
      [...manifest.hosts].sort().join(",") === "claude-code,codex",
      "Release must target exactly Codex and Claude Code",
    );
    release = {
      directory,
      digest,
      version: manifest.version,
      hosts: manifest.hosts,
    };
  }
  const artifacts = [];
  const seen = new Set();
  for (const artifact of config.artifacts) {
    check(
      ["run", "campaign", "campaign-review"].includes(artifact.kind),
      "Unknown artifact kind",
    );
    const directory = resolve(artifact.directory);
    const identity = `${artifact.kind}:${directory}`;
    check(!seen.has(identity), "Duplicate artifact declaration");
    seen.add(identity);
    let validation;
    try {
      if (artifact.kind === "run") validation = await validateAudit(directory);
      else if (artifact.kind === "campaign")
        validation = await validateCampaign(directory);
      else
        validation = await validateCampaignReview(
          resolve(artifact.sourceDirectory),
          directory,
        );
    } catch (error) {
      validation = {
        valid: false,
        completionAllowed: false,
        errors: [error.message],
      };
    }
    artifacts.push({ kind: artifact.kind, directory, ...validation });
  }
  return {
    schemaVersion: 1,
    package: {
      directory: packageDirectory,
      componentDigest,
      entrypoints: entries,
      ...composition,
    },
    release,
    artifacts,
    valid: artifacts.every((artifact) => artifact.valid === true),
    allAuditsComplete:
      artifacts.length > 0 &&
      artifacts.every(
        (artifact) =>
          artifact.valid === true && artifact.completionAllowed === true,
      ),
    releaseAccepted: false,
    limitation:
      "Structural/provenance verification only. No automatic semantic, source-freshness, human-acceptance, installation, archive-extraction or deployment claim.",
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    check(
      process.argv.length === 4,
      "Usage: node scripts/verify-content-audit.mjs CONFIG.json NEW-RESULT.json",
    );
    const input = path.resolve(process.argv[2]);
    const bytes = await readFile(input, "utf8");
    const result = {
      ...(await verifyContentAudit(JSON.parse(bytes), path.dirname(input))),
      configSha256: createHash("sha256").update(bytes).digest("hex"),
    };
    await writeFile(process.argv[3], JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    process.stdout.write(
      JSON.stringify({
        valid: result.valid,
        allAuditsComplete: result.allAuditsComplete,
        releaseAccepted: false,
      }) + "\n",
    );
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
