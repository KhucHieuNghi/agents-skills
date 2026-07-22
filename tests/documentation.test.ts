import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  normalizeBrandCandidate,
  renderBrandCss,
} from "../skills/html-docs-standard/scripts/lib/brand-profile.mjs";

const repositoryRoot = process.cwd();

function verifyHtml(document: string) {
  return execFileSync(
    "node",
    ["skills/html-docs-standard/scripts/verify-html-docs.mjs", document],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

const syntheticBrandCss = `:root {
  --brand-primary: #174f7b;
  --brand-secondary: #536271;
  --brand-accent: #9a563a;
  --on-brand-primary: #ffffff;
  --surface: #ffffff;
  --surface-muted: #f5f8fb;
  --border: #d8e1ea;
  --text: #17212b;
  --text-muted: #536271;
  --font-heading: ui-sans-serif, system-ui, sans-serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
}`;

async function writeBrandedDocument(options: {
  brandFirst?: boolean;
  mermaidConfig?: string;
}) {
  const directory = await mkdtemp(join(tmpdir(), "branded-html-"));
  await writeFile(join(directory, "docs-theme.css"), ":root {}\n");
  await writeFile(join(directory, "docs-brand.css"), syntheticBrandCss);
  const links = options.brandFirst
    ? '<link rel="stylesheet" href="docs-brand.css"><link rel="stylesheet" href="docs-theme.css">'
    : '<link rel="stylesheet" href="docs-theme.css"><link rel="stylesheet" href="docs-brand.css">';
  const mermaid = options.mermaidConfig
    ? `<pre class="mermaid">flowchart LR; A-->B</pre><script>window.mermaid?.initialize({${options.mermaidConfig},themeVariables:{primaryColor:"var(--brand-primary)",primaryTextColor:"var(--on-brand-primary)",primaryBorderColor:"var(--brand-secondary)",secondaryColor:"var(--brand-secondary)",tertiaryColor:"var(--brand-accent)",lineColor:"var(--text-muted)",background:"var(--surface)"}});</script>`
    : "";
  const document = join(directory, "index.html");
  await writeFile(
    document,
    `<!doctype html><meta name="viewport" content="width=device-width">${links}<div class="docs-shell"><aside class="docs-sidebar"></aside><main class="docs-content">${mermaid}</main></div>`,
  );
  return document;
}
function term(...characters: string[]) {
  return characters.join("");
}

const prohibitedTerms = [
  term("o", "n", "p", "o", "i", "n", "t"),
  term("s", "o", "c", "o", "m"),
  term("c", "e", "r", "b", "e", "r", "u", "s"),
  term("h", "e", "p", "h", "a", "e", "s", "t", "u", "s"),
  term("o", "n", "p", "o", "i", "n", "t", "v", "n"),
  term("@", "o", "n", "p", "o", "i", "n", "t"),
  term(
    "-",
    "-",
    "c",
    "h",
    "e",
    "c",
    "k",
    "p",
    "o",
    "i",
    "n",
    "t",
    "i",
    "n",
    "g",
  ),
  term("-", "-", "a", "l", "l", "-", "f", "i", "l", "e", "s"),
  term(
    "Q",
    "w",
    "e",
    "n",
    " ",
    "C",
    "o",
    "d",
    "i",
    "n",
    "g",
    " ",
    "S",
    "p",
    "e",
    "c",
    "i",
    "a",
    "l",
    "i",
    "s",
    "t",
  ),
  term("G", "e", "m", "i", "n", "i", " ", "A", "g", "e", "n", "t"),
  term(
    "g",
    "i",
    "t",
    "@",
    "g",
    "i",
    "t",
    "h",
    "u",
    "b",
    ".",
    "c",
    "o",
    "m",
    ":",
  ),
  term(
    "O",
    "P",
    "E",
    "N",
    "A",
    "I",
    "_",
    "A",
    "P",
    "I",
    "_",
    "K",
    "E",
    "Y",
    "=",
  ),
];
const privateSourcePatterns = [
  new RegExp(term("g", "i", "t", "@", "[\\w.-]+", ":"), "i"),
  new RegExp(term("h", "t", "t", "p", "s?", "://[^/\\s:@]+:[^@\\s/]+@"), "i"),
];
const sensitiveAssignment = new RegExp(
  term("\\b[A-Z][A-Z0-9_]*", "(?:API_KEY|TOKEN|SECRET)", "\\s*="),
  "g",
);
const obsoleteRuntimeClaims = [
  term(
    "-",
    "-",
    "c",
    "h",
    "e",
    "c",
    "k",
    "p",
    "o",
    "i",
    "n",
    "t",
    "i",
    "n",
    "g",
  ),
  term("-", "-", "a", "l", "l", "-", "f", "i", "l", "e", "s"),
];

function trackedDocumentationFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter(existsSync);
}

function isPermittedFixtureAssignment(file: string, match: string) {
  return (
    file.startsWith("tests/fixtures/") &&
    match ===
      term("D", "E", "M", "O", "_", "A", "P", "I", "_", "K", "E", "Y", "=")
  );
}

function publicBoundaryViolations(file: string, content: string) {
  const violations: string[] = [];

  for (const prohibitedTerm of prohibitedTerms) {
    if (content.toLowerCase().includes(prohibitedTerm.toLowerCase())) {
      violations.push(`${file}: source-brand token`);
      break;
    }
  }
  for (const privateSourcePattern of privateSourcePatterns) {
    if (privateSourcePattern.test(content)) {
      violations.push(`${file}: private source URL`);
    }
  }
  for (const assignment of content.matchAll(sensitiveAssignment)) {
    if (!isPermittedFixtureAssignment(file, assignment[0])) {
      violations.push(`${file}: sensitive assignment`);
    }
  }
  for (const obsoleteRuntimeClaim of obsoleteRuntimeClaims) {
    if (content.toLowerCase().includes(obsoleteRuntimeClaim.toLowerCase())) {
      violations.push(`${file}: obsolete runtime claim`);
    }
  }

  return violations;
}

describe("public documentation contract", () => {
  it("keeps the entrypoint generic and exposes the apply command", async () => {
    const markdown = await readFile("README.md", "utf8");

    expect(markdown).toContain("agent-skills apply");
    expect(markdown).toContain("codebase-onboarding");
    expect(markdown).toContain("skills/codebase-onboarding-c4/SKILL.md");
    for (const prohibitedTerm of prohibitedTerms) {
      expect(markdown).not.toContain(prohibitedTerm);
    }
  });

  it("keeps every tracked source and document free of public-boundary violations", async () => {
    const violations: string[] = [];
    const files = trackedDocumentationFiles();

    expect(files).toEqual(
      expect.arrayContaining([
        "README.md",
        "catalog.yaml",
        "src/config.ts",
        "package.json",
        ".github/workflows/ci.yml",
      ]),
    );

    for (const file of files) {
      const content = await readFile(file, "utf8");
      violations.push(
        ...publicBoundaryViolations(relative(repositoryRoot, file), content),
      );
    }

    expect(violations).toEqual([]);
  });

  it("does not track internal planning or execution artifacts", () => {
    const internalPlanningPrefixes = [".superpowers/", "docs/superpowers/"];
    const internalPlanningFiles = trackedDocumentationFiles().filter((file) =>
      internalPlanningPrefixes.some((prefix) => file.startsWith(prefix)),
    );

    expect(internalPlanningFiles).toEqual([]);
  });

  it("detects every prohibited public-boundary category outside approved fixtures", () => {
    const sourceBrand = term("s", "o", "c", "o", "m");
    const privateSource = term(
      "g",
      "i",
      "t",
      "@",
      "source.example",
      ":skill.git",
    );
    const sensitiveAssignment = term(
      "P",
      "U",
      "B",
      "L",
      "I",
      "C",
      "_",
      "T",
      "O",
      "K",
      "E",
      "N",
      "=",
    );
    const obsoleteClaim = term(
      "-",
      "-",
      "a",
      "l",
      "l",
      "-",
      "f",
      "i",
      "l",
      "e",
      "s",
    );

    expect(
      publicBoundaryViolations(
        "src/example.ts",
        [sourceBrand, privateSource, sensitiveAssignment, obsoleteClaim].join(
          "\n",
        ),
      ),
    ).toEqual([
      "src/example.ts: source-brand token",
      "src/example.ts: private source URL",
      "src/example.ts: sensitive assignment",
      "src/example.ts: obsolete runtime claim",
    ]);
  });

  it("requires a viewport meta tag with width=device-width", async () => {
    const directory = await mkdtemp(join(tmpdir(), "html-docs-"));
    const document = join(directory, "missing-viewport-content.html");
    await writeFile(
      document,
      '<meta name="viewport" content="initial-scale=1"><div class="docs-shell docs-sidebar docs-content"></div>',
    );

    expect(() =>
      execFileSync(
        "node",
        ["skills/html-docs-standard/scripts/verify-html-docs.mjs", document],
        {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: "pipe",
        },
      ),
    ).toThrow(/viewport/i);
  });

  it("requires local brand CSS after structural CSS", async () => {
    const document = await writeBrandedDocument({ brandFirst: true });
    expect(() => verifyHtml(document)).toThrow(/docs-brand\.css.*after/i);
  });

  it("requires branded Mermaid base theme variables", async () => {
    const document = await writeBrandedDocument({
      mermaidConfig: 'theme: "default"',
    });
    expect(() => verifyHtml(document)).toThrow(/Mermaid.*base/i);
  });

  it("keeps the generic adapter equal to the normalized fallback profile", async () => {
    const css = await readFile(
      "skills/html-docs-standard/assets/docs-brand.css",
      "utf8",
    );
    expect(css).toBe(
      renderBrandCss(
        normalizeBrandCandidate({
          brandName: "Generic Documentation",
          colors: {},
          typography: {},
        }),
      ),
    );
  });

  it("keeps the portable HTML template free of remote runtime dependencies", async () => {
    const template = await readFile(
      "skills/html-docs-standard/assets/document-template.html",
      "utf8",
    );

    expect(template).not.toContain(term("h", "t", "t", "p", "s", "://"));
  });

  it("publishes an accurate codebase onboarding integration guide", async () => {
    const guidePath = "docs/codebase-onboarding-integration.html";
    const [readme, guide, skill, styleContract, writingContract] =
      await Promise.all([
        readFile("README.md", "utf8"),
        readFile(guidePath, "utf8"),
        readFile("skills/html-docs-standard/SKILL.md", "utf8"),
        readFile(
          "skills/html-docs-standard/references/style-contract.md",
          "utf8",
        ),
        readFile(
          "skills/html-docs-standard/references/writing-contract.md",
          "utf8",
        ),
      ]);

    expect(readme).toContain(guidePath);
    expect(readme).toContain("#### Use it in another project");
    expect(readme).toContain("business operation journey");
    expect(readme).toContain("verify-onboarding-workspace.mjs");
    expect(guide).toContain("Adaptive workflow");
    expect(guide).toMatch(/Profile cài cả hai\s+skills/);
    expect(guide).toContain("Product Journey");
    expect(guide).toContain("Technical C4");
    expect(guide).toContain("Quality gates");
    expect(guide).toContain("Resume safely");
    expect(guide).toContain("Onboarding workspace contract passed");
    expect(guide).toContain(".onboarding/");
    expect(guide).toContain("apply-profile codebase-onboarding");
    expect(guide.match(/<h3>Operability<\/h3>/g)).toHaveLength(1);
    expect(guide).not.toContain("superpowers/");

    for (const requiredBrandInstruction of [
      "Brand name",
      "Brand website",
      ".onboarding/brand/DESIGN.md",
      "ensure-brand-profile.mjs",
      "verify-brand-profile.mjs",
      "refresh brand",
      "docs-brand.css",
      "no network",
    ]) {
      expect(readme).toContain(requiredBrandInstruction);
      expect(guide).toContain(requiredBrandInstruction);
    }
    expect(skill).toContain("extract-brand-profile.mjs");
    expect(skill).toContain("write-brand-profile.mjs");
    expect(styleContract).toContain("Mermaid");
    expect(styleContract).toContain("DESIGN.md");
    expect(writingContract).toContain("untrusted");

    expect(() =>
      execFileSync(
        "node",
        ["skills/html-docs-standard/scripts/verify-html-docs.mjs", guidePath],
        {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });

  it("publishes a step-by-step real-project onboarding runbook", async () => {
    const runbookPath =
      "skills/codebase-onboarding-c4/references/real-project-usage.md";
    const [readme, skill, runbook, guide] = await Promise.all([
      readFile("README.md", "utf8"),
      readFile("skills/codebase-onboarding-c4/SKILL.md", "utf8"),
      readFile(runbookPath, "utf8"),
      readFile("docs/codebase-onboarding-integration.html", "utf8"),
    ]);

    expect(readme).toContain(runbookPath);
    expect(skill).toContain("references/real-project-usage.md");

    for (const requiredInstruction of [
      "## Step 1",
      "## Step 12",
      "npx --yes skills add",
      "--skill codebase-onboarding-c4",
      "--skill html-docs-standard",
      ".agents/skills/codebase-onboarding-c4/SKILL.md",
      "codegraph status",
      "codegraph init",
      "Use $codebase-onboarding-c4",
      "Quick",
      "Standard",
      "Deep",
      "Inline",
      "Subagent",
      "grey zone",
      "Do not paste credentials",
      "docs/onboarding",
      "Ready to implement",
      "business operation journey",
      "Journey ID",
      "PASS_WITH_GREY_ZONES",
      "git check-ignore",
      ".git/info/exclude",
      "state.yaml",
      "evidence.yaml",
      "verify-onboarding-workspace.mjs",
      "resume_from",
      "quality-unverified",
      "Single-repository example",
      "Multi-repository example",
      "Troubleshooting",
    ]) {
      expect(runbook).toContain(requiredInstruction);
    }

    expect(guide).toContain("Cài skill vào project thật");
    expect(guide).toContain("npx --yes skills add");
    expect(guide).toContain("Use $codebase-onboarding-c4");
    expect(guide).toContain("Ready to implement");

    for (const reference of [
      "product-business-journey.md",
      "technical-c4-navigation.md",
      "evidence-and-output-contract.md",
      "adaptive-coordinator.md",
      "workspace-and-state.md",
      "evaluation-contract.md",
    ]) {
      expect(readme).toContain(reference);
    }
  });
});
