import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverSkills } from "../src/discovery.js";
import { validateSkill } from "../src/validation.js";

describe("validateSkill", () => {
  it("accepts a canonical package with required frontmatter", async () => {
    const [skill] = await discoverSkills("tests/fixtures/catalog");

    expect(validateSkill(skill)).toEqual({ valid: true, errors: [] });
  });

  it("accepts CRLF YAML frontmatter with required fields", async () => {
    const [skill] = await discoverSkills("tests/fixtures/catalog");
    const crlfSkill = {
      ...skill,
      markdown:
        "---\r\nname: release-check\r\ndescription: Check a release candidate.\r\n---\r\n\r\n# Release Check\r\n",
    };

    expect(validateSkill(crlfSkill)).toEqual({ valid: true, errors: [] });
  });

  it("rejects mismatched package names", async () => {
    const [skill] = await discoverSkills("tests/fixtures/invalid-catalog");

    expect(validateSkill(skill)).toMatchObject({
      valid: false,
      errors: [expect.stringMatching(/match/)],
    });
  });

  it("rejects a generic API key assignment without exposing its value", async () => {
    const [skill] = await discoverSkills("tests/fixtures/secret-catalog");

    const result = validateSkill(skill);

    expect(result).toMatchObject({
      valid: false,
      errors: [expect.stringMatching(/secret/i)],
    });
    expect(result.errors.join("\n")).not.toContain("example-not-a-secret");
  });

  it("allows a token-named regex while rejecting a literal token", async () => {
    const directory = await mkdtemp(join(tmpdir(), "agent-skills-regex-"));
    const skill = {
      name: "regex-check",
      directory,
      skillFile: join(directory, "SKILL.md"),
      markdown:
        "---\nname: regex-check\ndescription: Check regex assignments.\n---\n",
    };
    try {
      await writeFile(
        join(directory, "check.mjs"),
        [
          "const NON_FINITE_",
          "TOKEN = /\\b(?:NaN|undefined|Infinity)\\b/;\n",
        ].join(""),
      );
      expect(validateSkill(skill)).toEqual({ valid: true, errors: [] });

      await writeFile(
        join(directory, "check.mjs"),
        ["const ACCESS_", 'TOKEN = "secret";\n'].join(""),
      );
      expect(validateSkill(skill).valid).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not execute package scripts while scanning package text", async () => {
    const marker = join("tests/fixtures/catalog/release-check", "executed");
    const [skill] = await discoverSkills("tests/fixtures/catalog");

    validateSkill(skill);

    expect(existsSync(marker)).toBe(false);
  });
});
