import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
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

  it("keeps the portable HTML template free of remote runtime dependencies", async () => {
    const template = await readFile(
      "skills/html-docs-standard/assets/document-template.html",
      "utf8",
    );

    expect(template).not.toContain(term("h", "t", "t", "p", "s", "://"));
  });
});
