import { digestTree } from "../src/integrity.js";
import { loadIndexedSolution } from "../src/solutions.js";
import { expect, it } from "vitest";
import { verifyComposition } from "../src/composition.js";
import { discoverSkills } from "../src/discovery.js";
import { validateSkill } from "../src/validation.js";
it("verifies the real audit candidate's five attributed sources and file closure", async () => {
  const result = await verifyComposition("skills/content-search-audit");
  expect(result?.sourceIds).toEqual([
    "corey-content-strategy",
    "corey-seo-audit",
    "profound-aeo-operator",
    "profound-answer-accuracy",
    "profound-prompt-portfolio",
  ]);
  expect(result?.noticeFile).toBe("NOTICE.md");
});
it("exposes a single valid audit entrypoint", async () => {
  const skills = (await discoverSkills(".")).filter(
    (skill) => skill.name === "content-search-audit",
  );
  expect(skills).toHaveLength(1);
  expect(validateSkill(skills[0])).toEqual({ valid: true, errors: [] });
});

it("locks the evaluation catalog to exactly one bundled component for the two supported hosts", async () => {
  const manifest = await loadIndexedSolution(
    "catalog.content-search-audit-candidate.yaml",
    "content-search-audit",
  );
  expect(manifest.version).toBe("0.3.13");
  expect(manifest.hosts).toEqual(["codex", "claude-code"]);
  expect(manifest.entrypoint).toBe("content-search-audit");
  expect(manifest.components).toEqual([
    {
      id: "content-search-audit",
      source: "bundled",
      digest: await digestTree("skills/content-search-audit"),
    },
  ]);
});
