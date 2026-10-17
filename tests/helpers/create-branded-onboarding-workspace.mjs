/* global process */

import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function writeSyntheticDocuments(projectRoot) {
  const diagrams = {
    "product-business": [
      [
        "journey-flow",
        "flowchart LR",
        "Customer --> Order",
        "Order --> Fulfilment",
      ],
      [
        "entity-lifecycle",
        "stateDiagram-v2",
        "Draft --> Approved",
        "Approved --> Published",
      ],
    ],
    "technical-architecture": [
      [
        "system-context",
        "flowchart LR",
        "Customer --> System",
        "System --> Provider",
      ],
      ["container-map", "flowchart LR", "Browser --> API", "API --> Database"],
      [
        "component-map",
        "flowchart LR",
        "Route --> Handler",
        "Handler --> Store",
      ],
      [
        "journey-sequence",
        "sequenceDiagram",
        "Customer->>API: Request",
        "API-->>Customer: Result",
      ],
    ],
  };
  const htmlStart = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="assets/docs-theme.css">
<link rel="stylesheet" href="assets/docs-brand.css"></head>
<body><div class="docs-shell"><aside class="docs-sidebar"></aside>
<main class="docs-content">`;
  const htmlEnd = `</main></div>
<script src="assets/docs-theme.js"></script></body></html>
`;
  await writeFile(
    join(projectRoot, "docs/onboarding/index.html"),
    htmlStart + "<h1>Onboarding</h1>" + htmlEnd,
  );
  for (const [documentName, entries] of Object.entries(diagrams)) {
    const markdown = [`# Synthetic ${documentName} onboarding`];
    const figures = [];
    for (const [id, type, first, second] of entries) {
      markdown.push(
        `### Diagram: ${id}\n${id} overview\nTakeaway: The path crosses two responsibilities.\nEvidence: src/example.ts:1-8\n\n\`\`\`mermaid\n${type}\n  ${first}\n  ${second}\n\`\`\``,
      );
      figures.push(
        `<figure data-diagram-id="${id}"><svg viewBox="0 0 400 120" role="img"><title>${id} overview</title><desc>Two connected responsibilities</desc><text x="10" y="40">Customer</text><path d="M100 35 L240 35" stroke="black"/><text x="250" y="40">System</text></svg><figcaption>${id} overview</figcaption></figure>`,
      );
    }
    await writeFile(
      join(projectRoot, "docs/onboarding", `${documentName}.md`),
      markdown.join("\n\n") + "\n",
    );
    await writeFile(
      join(projectRoot, "docs/onboarding", `${documentName}.html`),
      htmlStart + figures.join("\n") + htmlEnd,
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
  for (const asset of ["docs-theme.css", "docs-theme.js"]) {
    await copyFile(
      join(htmlSkillRoot, "assets", asset),
      join(projectRoot, "docs/onboarding/assets", asset),
    );
  }
  execFileSync("node", [
    join(htmlSkillRoot, "scripts/apply-brand-profile.mjs"),
    "--project-root",
    projectRoot,
    "--candidate",
    candidatePath,
    "--css-output",
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
