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
    summary: Preserves the internal component and token system.
    suitableFor: [product-ui]
    notSuitableFor: [brand-exploration]
  style-review:
    source: design
    tags: [style, audit]
    summary: Reviews a visual experience before implementation.
    suitableFor: [landing-page]
    notSuitableFor: [data-dashboard]
profiles:
  product-ui:
    intents: [landing-page]
    skills: [design-system, style-review]
    summary: Builds a branded public product page.
    suitableFor: [landing-page]
    notSuitableFor: [data-dashboard]
`;

describe("private skill catalogs", () => {
  it("rejects a catalog that is not a YAML object", async () => {
    await expect(loadCatalog(await writeCatalog("[]"))).rejects.toThrow(
      /catalog must be an object/i,
    );
  });

  it("rejects a skill without suitability guidance", async () => {
    await expect(
      loadCatalog(
        await writeCatalog(
          catalogYaml.replace(
            "    summary: Preserves the internal component and token system.\n",
            "",
          ),
        ),
      ),
    ).rejects.toThrow(/summary/i);
  });

  it("loads a profile and resolves its exact intent", async () => {
    const catalog = await loadCatalog(await writeCatalog(catalogYaml));

    expect(resolveIntent(catalog, "landing-page")).toEqual({
      name: "product-ui",
      intents: ["landing-page"],
      summary: "Builds a branded public product page.",
      suitableFor: ["landing-page"],
      notSuitableFor: ["data-dashboard"],
      skills: [
        {
          name: "design-system",
          source: { name: "design", reference: "/private/design-skills" },
          tags: ["style", "brand"],
          conflicts: [],
          summary: "Preserves the internal component and token system.",
          suitableFor: ["product-ui"],
          notSuitableFor: ["brand-exploration"],
        },
        {
          name: "style-review",
          source: { name: "design", reference: "/private/design-skills" },
          tags: ["style", "audit"],
          conflicts: [],
          summary: "Reviews a visual experience before implementation.",
          suitableFor: ["landing-page"],
          notSuitableFor: ["data-dashboard"],
        },
      ],
    });
  });

  it("rejects an intent that resolves to more than one profile", async () => {
    const catalog = await loadCatalog(
      await writeCatalog(
        `${catalogYaml}\n  docs-ui:\n    intents: [landing-page]\n    skills: [design-system]\n    summary: Writes public documentation.\n    suitableFor: [documentation]\n    notSuitableFor: [landing-page]\n`,
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
