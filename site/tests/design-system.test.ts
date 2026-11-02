import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

const designFile = readFileSync(
  new URL("../../DESIGN.md", import.meta.url),
  "utf8",
);
const frontmatter = designFile.match(/^---\n([\s\S]*?)\n---\n/);
if (!frontmatter) throw new Error("Root DESIGN.md has no YAML frontmatter");

const design = YAML.parse(frontmatter[1]) as {
  colors: Record<string, string>;
  typography: Record<string, { fontFamily: string }>;
  rounded: Record<string, string>;
};
const css = readFileSync(
  new URL("../src/styles/tokens.css", import.meta.url),
  "utf8",
);
const cssTokens = new Map(
  [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
    match[1],
    match[2].trim(),
  ]),
);

describe("NKSkills DESIGN.md contract", () => {
  it("keeps shared color roles synchronized with the site tokens", () => {
    const roles: Record<string, string> = {
      primary: "ink",
      secondary: "ink-soft",
      tertiary: "action",
      neutral: "canvas",
      surface: "paper",
      "surface-muted": "blush",
      border: "line",
      rose: "rose",
      sky: "sky",
      apricot: "apricot",
      "action-hover": "action-hover",
      "blush-field": "blush-field",
      "sky-field": "sky-field",
      "apricot-field": "apricot-field",
      "candidate-ink": "candidate-ink",
    };

    for (const [role, token] of Object.entries(roles)) {
      expect(cssTokens.get(token)?.toLowerCase(), role).toBe(
        design.colors[role].toLowerCase(),
      );
    }
  });

  it("keeps font families and the common card radius synchronized", () => {
    const family = (value: string | undefined) =>
      value?.replaceAll('"', "").replaceAll(/\s+/g, " ").trim();

    expect(family(cssTokens.get("font-display"))).toBe(
      design.typography["headline-lg"].fontFamily,
    );
    expect(family(cssTokens.get("font-ui"))).toBe(
      design.typography["body-md"].fontFamily,
    );
    expect(family(cssTokens.get("font-code"))).toBe(
      design.typography["code-sm"].fontFamily,
    );
    expect(cssTokens.get("radius")).toBe(design.rounded.md);
  });
});
