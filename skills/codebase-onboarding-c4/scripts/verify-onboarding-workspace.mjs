/* global console, process */

import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectArgument = process.argv[2];
if (!projectArgument) {
  console.error("Usage: node verify-onboarding-workspace.mjs PROJECT_ROOT");
  process.exit(1);
}

const projectRoot = resolve(projectArgument);
const requiredFiles = [
  "docs/onboarding/index.html",
  "docs/onboarding/product-business.md",
  "docs/onboarding/product-business.html",
  "docs/onboarding/technical-architecture.md",
  "docs/onboarding/technical-architecture.html",
  "docs/onboarding/assets/docs-theme.css",
  "docs/onboarding/assets/docs-brand.css",
  "docs/onboarding/assets/docs-theme.js",
  ".onboarding/brand/DESIGN.md",
  ".onboarding/brand/extraction-state.yaml",
  ".onboarding/state.yaml",
  ".onboarding/evidence.yaml",
];
const errors = [];
const existingFiles = new Set();

for (const file of requiredFiles) {
  try {
    await access(join(projectRoot, file));
    existingFiles.add(file);
  } catch {
    errors.push(`missing required file: ${file}`);
  }
}

let runFiles = [];
try {
  runFiles = (await readdir(join(projectRoot, ".onboarding/runs")))
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => `.onboarding/runs/${file}`);
} catch {
  errors.push("missing run summaries: .onboarding/runs/*.yaml");
}
if (runFiles.length === 0) {
  errors.push("missing run summaries: .onboarding/runs/*.yaml");
}

for (const generatedRoot of ["docs/onboarding", ".onboarding"]) {
  try {
    execFileSync("git", ["check-ignore", "-q", generatedRoot], {
      cwd: projectRoot,
      stdio: "ignore",
    });
  } catch {
    errors.push(`generated root is not ignored: ${generatedRoot}`);
  }
}

function collectVerifierErrors(label, commandArguments) {
  try {
    execFileSync("node", commandArguments, {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const detail = String(error?.stderr ?? error?.message ?? error)
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    errors.push(
      ...(detail.length > 0
        ? detail.map((line) => `${label}: ${line}`)
        : [`${label}: verification failed`]),
    );
  }
}

const htmlVerifier = resolve(
  import.meta.dirname,
  "../../html-docs-standard/scripts/verify-html-docs.mjs",
);
const brandVerifier = resolve(
  import.meta.dirname,
  "../../html-docs-standard/scripts/verify-brand-profile.mjs",
);

collectVerifierErrors("brand", [
  brandVerifier,
  projectRoot,
  "docs/onboarding/assets/docs-brand.css",
]);
for (const page of requiredFiles.filter(
  (file) => file.endsWith(".html") && existingFiles.has(file),
)) {
  collectVerifierErrors(page, [htmlVerifier, join(projectRoot, page)]);
}

const yamlContracts = new Map([
  [
    ".onboarding/state.yaml",
    [
      "schema_version",
      "run_id",
      "mode",
      "status",
      "repository",
      "topology",
      "journey",
      "tracks",
      "evidence_sources",
      "gates",
      "retries",
      "contradictions",
      "grey_zones",
      "artifacts",
      "resume_from",
      "updated_at",
    ],
  ],
  [".onboarding/evidence.yaml", ["schema_version", "items"]],
]);
for (const runFile of runFiles) {
  yamlContracts.set(runFile, [
    "schema_version",
    "run_id",
    "mode",
    "topology",
    "primary_journey_id",
    "tracks",
    "evidence_sources",
    "gate_results",
    "retries",
    "contradictions",
    "grey_zones",
    "journey_c4_coverage",
    "final_status",
    "next_investigations",
    "completed_at",
  ]);
}

const sensitivePatterns = [
  /\b[A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)\s*=/g,
  /https?:\/\/[^/\s:@]+:[^@\s/]+@/gi,
  /\/(?:Users|home)\/[^/\s]+\//g,
];
for (const file of [...requiredFiles, ...runFiles]) {
  let content;
  try {
    content = await readFile(join(projectRoot, file), "utf8");
  } catch {
    continue;
  }
  for (const pattern of sensitivePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) errors.push(`sensitive content: ${file}`);
  }
  for (const key of yamlContracts.get(file) ?? []) {
    if (!new RegExp(`^${key}:`, "m").test(content)) {
      errors.push(`missing YAML key ${key}: ${file}`);
    }
  }
}

if (errors.length > 0) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}

console.log("Onboarding workspace contract passed");
