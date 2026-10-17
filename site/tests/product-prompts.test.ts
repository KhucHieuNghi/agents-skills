import { describe, expect, it } from "vitest";
import { promptFor } from "../src/content/prompts.js";
import { claimMismatches, productFacts } from "../src/content/product.js";

describe("campaign starter prompt", () => {
  it.each([
    ["en", "codex", "$codebase-onboarding-c4"],
    ["en", "claude-code", "/codebase-onboarding-c4"],
    ["vi", "codex", "$codebase-onboarding-c4"],
    ["vi", "claude-code", "/codebase-onboarding-c4"],
  ] as const)(
    "uses the %s wording and %s invocation",
    (locale, host, token) => {
      const prompt = promptFor(locale, host);

      expect(prompt).toContain(token);
      expect(prompt).toContain("codegraph status");
      expect(prompt).toContain("codebase-onboarding@1.1.0");
      expect(prompt).not.toContain(
        host === "codex"
          ? "/codebase-onboarding-c4"
          : "$codebase-onboarding-c4",
      );
      expect(prompt).not.toMatch(
        /\bnpm install\b|\bwrangler\b|\bother agent\b/i,
      );
    },
  );

  it("stops for setup before installing, indexing, or editing when prerequisites are absent", () => {
    expect(promptFor("en", "codex")).toMatch(
      /stop before installing tools, creating an index, or editing files/i,
    );
    expect(promptFor("vi", "claude-code")).toMatch(
      /dừng trước khi cài công cụ, tạo index hoặc sửa file/i,
    );
  });
});

describe("published product claims", () => {
  const manifest = {
    id: "codebase-onboarding",
    version: "1.1.0",
    entrypoint: "codebase-onboarding-c4",
    hosts: ["codex", "claude-code"],
    components: [
      { id: "codebase-onboarding-c4" },
      { id: "html-docs-standard" },
      { id: "hallmark" },
    ],
  };

  it("accepts the released solution manifest", () => {
    expect(claimMismatches(productFacts, manifest)).toEqual([]);
  });

  it("rejects a version or host claim that drifts from the manifest", () => {
    expect(
      claimMismatches(productFacts, {
        ...manifest,
        version: "1.0.1",
        hosts: ["codex"],
      }),
    ).toEqual(expect.arrayContaining(["version", "hosts"]));
  });
});
