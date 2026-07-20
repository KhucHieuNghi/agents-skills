import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const scannedExtensions = new Set([".css", ".html", ".js", ".md"]);
const excludedPrefixes = ["docs/superpowers/"];

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

function trackedDocumentationFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter((file) => scannedExtensions.has(extname(file)))
    .filter(
      (file) => !excludedPrefixes.some((prefix) => file.startsWith(prefix)),
    );
}

describe("public documentation contract", () => {
  it("keeps the entrypoint generic and exposes the apply command", async () => {
    const markdown = await readFile("README.md", "utf8");

    expect(markdown).toContain("agent-skills apply");
    for (const prohibitedTerm of prohibitedTerms) {
      expect(markdown).not.toContain(prohibitedTerm);
    }
  });

  it("keeps tracked public documentation and web assets free of private markers", async () => {
    const violations: string[] = [];

    for (const file of trackedDocumentationFiles()) {
      const content = await readFile(file, "utf8");
      for (const prohibitedTerm of prohibitedTerms) {
        if (content.toLowerCase().includes(prohibitedTerm.toLowerCase())) {
          violations.push(
            `${relative(repositoryRoot, file)}: ${prohibitedTerm}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
