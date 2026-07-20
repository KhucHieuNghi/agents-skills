import { describe, expect, it } from "vitest";
import { parseSourceReference, resolveCacheDirectory } from "../src/config.js";

describe("resolveCacheDirectory", () => {
  it("uses a user-local default cache", () => {
    expect(resolveCacheDirectory("/Users/example")).toBe(
      "/Users/example/.cache/agent-skills",
    );
  });

  it("uses an explicit cache directory", () => {
    expect(resolveCacheDirectory("/Users/example", "/tmp/skills-cache")).toBe(
      "/tmp/skills-cache",
    );
  });
});

describe("parseSourceReference", () => {
  it("recognizes local paths and Git URLs", () => {
    expect(parseSourceReference("./fixtures/skills")).toEqual({
      kind: "path",
      value: "./fixtures/skills",
    });
    expect(
      parseSourceReference("git@github.com:example/private-skills.git"),
    ).toEqual({
      kind: "git",
      value: "git@github.com:example/private-skills.git",
    });
  });
});
