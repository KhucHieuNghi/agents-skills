/* global process */

import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function writeSyntheticDocuments(projectRoot) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="assets/docs-theme.css">
<link rel="stylesheet" href="assets/docs-brand.css"></head>
<body><div class="docs-shell"><aside class="docs-sidebar"></aside>
<main class="docs-content"><pre class="mermaid">flowchart LR; A-->B</pre></main></div>
<script>window.mermaid?.initialize({theme:"base",themeVariables:{primaryColor:"var(--brand-primary)",primaryTextColor:"var(--on-brand-primary)",primaryBorderColor:"var(--brand-secondary)",secondaryColor:"var(--brand-secondary)",tertiaryColor:"var(--brand-accent)",lineColor:"var(--text-muted)",background:"var(--surface)"}});</script>
<script src="assets/docs-theme.js"></script></body></html>
`;
  for (const file of [
    "index.html",
    "product-business.html",
    "technical-architecture.html",
  ]) {
    await writeFile(join(projectRoot, "docs/onboarding", file), html);
  }
  for (const file of ["product-business.md", "technical-architecture.md"]) {
    await writeFile(
      join(projectRoot, "docs/onboarding", file),
      "# Synthetic onboarding\n",
    );
  }
}

export async function createBrandedOnboardingWorkspace({
  projectRoot,
  htmlSkillRoot,
  onboardingSkillRoot,
}) {
  await mkdir(projectRoot, { recursive: true });
  execFileSync("git", ["init", "-q"], { cwd: projectRoot });
  await mkdir(join(projectRoot, "docs/onboarding/assets"), { recursive: true });
  await mkdir(join(projectRoot, ".onboarding/runs"), { recursive: true });
  await writeFile(
    join(projectRoot, ".git/info/exclude"),
    "/docs/onboarding/\n/.onboarding/\n",
  );

  const candidatePath = join(projectRoot, ".brand-candidate.json");
  await writeFile(
    candidatePath,
    `${JSON.stringify(
      {
        brandName: "Example Brand",
        sourceOrigin: "https://brand.example",
        method: "static",
        status: "extracted",
        candidate: {
          colors: {
            primary: "#174f7b",
            surface: "#ffffff",
            text: "#17212b",
          },
          typography: {
            bodyFamily: "Example Sans",
            headingFamily: "Example Sans",
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  execFileSync("node", [
    join(htmlSkillRoot, "scripts/write-brand-profile.mjs"),
    "--project-root",
    projectRoot,
    "--candidate",
    candidatePath,
  ]);

  for (const asset of ["docs-theme.css", "docs-theme.js"]) {
    await copyFile(
      join(htmlSkillRoot, "assets", asset),
      join(projectRoot, "docs/onboarding/assets", asset),
    );
  }
  execFileSync("node", [
    join(htmlSkillRoot, "scripts/generate-brand-css.mjs"),
    "--design",
    join(projectRoot, ".onboarding/brand/DESIGN.md"),
    "--output",
    join(projectRoot, "docs/onboarding/assets/docs-brand.css"),
  ]);

  await writeSyntheticDocuments(projectRoot);
  for (const [source, destination] of [
    ["state-template.yaml", ".onboarding/state.yaml"],
    ["evidence-template.yaml", ".onboarding/evidence.yaml"],
    ["run-summary-template.yaml", ".onboarding/runs/sample-run.yaml"],
  ]) {
    await copyFile(
      join(onboardingSkillRoot, "assets", source),
      join(projectRoot, destination),
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 5) {
    throw new Error(
      "Usage: node create-branded-onboarding-workspace.mjs PROJECT_ROOT HTML_SKILL_ROOT ONBOARDING_SKILL_ROOT",
    );
  }
  await createBrandedOnboardingWorkspace({
    projectRoot: resolve(process.argv[2]),
    htmlSkillRoot: resolve(process.argv[3]),
    onboardingSkillRoot: resolve(process.argv[4]),
  });
}
