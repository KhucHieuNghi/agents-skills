import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalog, resolveIntent, resolveProfile } from "../src/catalog.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function writeCatalog(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "agent-skills-catalog-"));
  temporaryDirectories.push(directory);
  const file = join(directory, "catalog.yaml");
  await writeFile(file, content);
  return file;
}

const catalogYaml = `
version: 1
sources:
  design:
    reference: /private/design-skills
skills:
  design-system:
    source: design
    tags: [style, brand]
  style-review:
    source: design
    tags: [style, audit]
profiles:
  product-ui:
    intents: [landing-page]
    skills: [design-system, style-review]
`;

describe("private skill catalogs", () => {
  it("rejects a catalog that is not a YAML object", async () => {
    await expect(loadCatalog(await writeCatalog("[]"))).rejects.toThrow(
      /catalog must be an object/i,
    );
  });

  it("loads a profile and resolves its exact intent", async () => {
    const catalog = await loadCatalog(await writeCatalog(catalogYaml));

    expect(resolveIntent(catalog, "landing-page")).toEqual({
      name: "product-ui",
      intents: ["landing-page"],
      skills: [
        {
          name: "design-system",
          source: { name: "design", reference: "/private/design-skills" },
          tags: ["style", "brand"],
          conflicts: [],
        },
        {
          name: "style-review",
          source: { name: "design", reference: "/private/design-skills" },
          tags: ["style", "audit"],
          conflicts: [],
        },
      ],
    });
  });

  it("rejects an intent that resolves to more than one profile", async () => {
    const catalog = await loadCatalog(
      await writeCatalog(
        `${catalogYaml}\n  docs-ui:\n    intents: [landing-page]\n    skills: [design-system]\n`,
      ),
    );

    expect(() => resolveIntent(catalog, "landing-page")).toThrow(
      /multiple profiles/i,
    );
  });

  it("rejects profiles containing declared conflicts", async () => {
    const catalog = await loadCatalog(
      await writeCatalog(
        catalogYaml.replace(
          "    tags: [style, audit]",
          "    tags: [style, audit]\n    conflicts: [design-system]",
        ),
      ),
    );

    expect(() => resolveProfile(catalog, "product-ui")).toThrow(/conflict/i);
  });

  it("rejects a profile that references an undefined skill", async () => {
    await expect(
      loadCatalog(
        await writeCatalog(
          catalogYaml.replace("[design-system, style-review]", "[unknown]"),
        ),
      ),
    ).rejects.toThrow(/unknown skill/i);
  });
});
