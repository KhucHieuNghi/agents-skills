import { describe, expect, it } from "vitest";
import { discoverSkills } from "../src/discovery.js";

describe("discoverSkills", () => {
  it("discovers a package directly below the source directory", async () => {
    const skills = await discoverSkills("tests/fixtures/catalog");

    expect(skills.map((skill) => skill.name)).toEqual(["release-check"]);
  });

  it("discovers packages directly below the source skills directory", async () => {
    const skills = await discoverSkills("tests/fixtures/skills-catalog");

    expect(skills.map((skill) => skill.name)).toEqual(["nested-skill"]);
  });
});
