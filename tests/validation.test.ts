import { existsSync } from "node:fs";
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

  it("does not execute package scripts while scanning package text", async () => {
    const marker = join("tests/fixtures/catalog/release-check", "executed");
    const [skill] = await discoverSkills("tests/fixtures/catalog");

    validateSkill(skill);

    expect(existsSync(marker)).toBe(false);
  });
});
