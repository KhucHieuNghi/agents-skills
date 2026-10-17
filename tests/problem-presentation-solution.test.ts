import { join } from "node:path";
import { expect, it } from "vitest";
import { digestTree } from "../src/integrity.js";
import { loadIndexedSolution } from "../src/solutions.js";
import { loadUpstreams } from "../src/upstreams.js";

it("locks the presentation combo to its bundled files and pinned upstreams", async () => {
  const manifest = await loadIndexedSolution(
    "catalog.yaml",
    "problem-presentation",
  );
  const upstreams = await loadUpstreams("catalog.yaml");
  expect(manifest).toMatchObject({
    id: "problem-presentation",
    version: "0.1.0",
    entrypoint: "problem-presentation",
    hosts: ["codex", "claude-code"],
  });
  expect(manifest.components.map(({ id }) => id)).toEqual([
    "problem-presentation",
    "presentation-brand",
    "visual-explainer",
    "diagram-design",
  ]);
  for (const component of manifest.components) {
    if (component.source === "bundled") {
      expect(component.digest).toBe(
        await digestTree(join("skills", component.id)),
      );
    } else {
      expect(component.digest).toBe(upstreams.get(component.id)?.digest);
      expect(component.upstream).toBe(component.id);
    }
  }
});
