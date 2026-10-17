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

const diagramGroups = {
  "product-business": [
    ["journey-flow", "flowchart"],
    ["entity-lifecycle", "stateDiagram-v2"],
  ],
  "technical-architecture": [
    ["system-context", "flowchart"],
    ["container-map", "flowchart"],
    ["component-map", "flowchart"],
    ["journey-sequence", "sequenceDiagram"],
  ],
};

function verifyDiagrams(documentName, markdown, html, mode) {
  const required = diagramGroups[documentName].filter(([id]) =>
    mode === "quick"
      ? ["journey-flow", "system-context", "container-map"].includes(id)
      : true,
  );
  const markdownDiagrams = new Map();
  const headings = [...markdown.matchAll(/^### Diagram: ([a-z-]+)\s*$/gm)];
  for (const [index, heading] of headings.entries()) {
    const id = heading[1];
    const section = markdown
      .slice(
        heading.index + heading[0].length,
        headings[index + 1]?.index ?? markdown.length,
      )
      .split(/^## /m, 1)[0];
    const title = section.trim().split("\n", 1)[0] ?? "";
    const source = /```mermaid\s*\n([\s\S]*?)\n```/.exec(section)?.[1] ?? "";
    if (markdownDiagrams.has(id))
      errors.push(`duplicate diagram: ${documentName}.md #${id}`);
    markdownDiagrams.set(id, { title, source, section });
  }
  const htmlDiagrams = new Map();
  const figurePattern =
    /<figure\b[^>]*\bdata-diagram-id=["']([a-z-]+)["'][^>]*>([\s\S]*?)<\/figure>/gi;
  for (const match of html.matchAll(figurePattern)) {
    const [, id, body] = match;
    if (htmlDiagrams.has(id))
      errors.push(`duplicate diagram: ${documentName}.html #${id}`);
    htmlDiagrams.set(id, body);
  }
  for (const [id, syntax] of required) {
    const diagram = markdownDiagrams.get(id);
    if (!diagram) {
      errors.push(`missing Mermaid diagram ${id}: ${documentName}.md`);
    } else {
      if (!new RegExp(`^${syntax}\\b`).test(diagram.source.trim())) {
        errors.push(`wrong Mermaid type for diagram ${id}: ${documentName}.md`);
      }
      if (
        !/\bTakeaway:\s*\S/.test(diagram.section) ||
        !/\bEvidence:\s*\S/.test(diagram.section)
      ) {
        errors.push(
          `diagram ${id} needs Takeaway and Evidence: ${documentName}.md`,
        );
      }
      if (
        diagram.title.trim().length < 5 ||
        diagram.source.trim().split("\n").length < 3
      ) {
        errors.push(`diagram ${id} is too sparse: ${documentName}.md`);
      }
    }
    const figure = htmlDiagrams.get(id);
    if (!figure) {
      errors.push(`missing rendered diagram ${id}: ${documentName}.html`);
    } else {
      const svg =
        /<svg\b[^>]*\bviewBox=["'][^"']+["'][^>]*>[\s\S]*?<\/svg>/i.exec(
          figure,
        )?.[0] ?? "";
      if (
        !svg ||
        !/<title\b[^>]*>[^<]+<\/title>/i.test(svg) ||
        !/<desc\b[^>]*>[^<]+<\/desc>/i.test(svg) ||
        !/<(?:text|foreignObject)\b/i.test(svg) ||
        !/<(?:path|line|polyline)\b/i.test(svg) ||
        !/<figcaption\b/i.test(figure)
      ) {
        errors.push(
          `diagram ${id} needs accessible inline SVG with labels and connections: ${documentName}.html`,
        );
      }
    }
  }
  for (const id of markdownDiagrams.keys()) {
    if (!htmlDiagrams.has(id))
      errors.push(
        `diagram ${id} has no HTML counterpart: ${documentName}.html`,
      );
  }
  for (const id of htmlDiagrams.keys()) {
    if (!markdownDiagrams.has(id))
      errors.push(`diagram ${id} has no Mermaid source: ${documentName}.md`);
  }
}

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

try {
  const state = await readFile(
    join(projectRoot, ".onboarding/state.yaml"),
    "utf8",
  );
  const mode = /^mode:\s*["']?(quick|standard|deep)["']?\s*(?:#.*)?$/m.exec(
    state,
  )?.[1];
  if (!mode)
    errors.push("invalid or missing onboarding mode in .onboarding/state.yaml");
  for (const documentName of Object.keys(diagramGroups)) {
    const markdown = await readFile(
      join(projectRoot, `docs/onboarding/${documentName}.md`),
      "utf8",
    );
    const html = await readFile(
      join(projectRoot, `docs/onboarding/${documentName}.html`),
      "utf8",
    );
    verifyDiagrams(documentName, markdown, html, mode ?? "standard");
  }
} catch (error) {
  errors.push(
    `diagram verification failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (errors.length > 0) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}

console.log("Onboarding workspace contract passed");
