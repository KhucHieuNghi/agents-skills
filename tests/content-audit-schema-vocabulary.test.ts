import { expect, it } from "vitest";
// @ts-expect-error development module
import {
  classifySchemaType,
  schemaVocabularyProvenance,
} from "../skills/content-search-audit/scripts/lib/technical-seo/schema-vocabulary.mjs";
// @ts-expect-error development module
import {
  extractSchemaTerms,
  buildSchemaRegistry,
} from "../scripts/enterprise-technical-seo/schema-registry-build.mjs";
it("distinguishes class membership from properties and enumeration individuals", () => {
  expect(classifySchemaType("Organization").membership).toBe("class");
  expect(classifySchemaType("name").membership).toBe("property");
  expect(classifySchemaType("Monday").membership).toBe("individual");
});
it("keeps unlisted case-sensitive terms distinct from global invalidity", () => {
  expect(classifySchemaType("organization").membership).toBe("unlisted");
  expect(classifySchemaType("InventedSchemaType").membership).toBe("unlisted");
  expect(classifySchemaType("constructor").membership).toBe("unlisted");
});
it("retains pending, extensions and supersession without declaring invalidity", () => {
  expect(classifySchemaType("LearningResource").section).toBe("pending");
  expect(classifySchemaType("MedicalClinic").section).toBe("health-lifesci");
  expect(classifySchemaType("UserLikes").supersededBy).toEqual([
    "InteractionCounter",
  ]);
});
it("accepts namespace IRIs but never resolves aliases or arbitrary URLs", () => {
  expect(classifySchemaType("http://schema.org/Organization")).toEqual(
    classifySchemaType("Organization"),
  );
  expect(classifySchemaType("https://schema.org/Organization")).toEqual(
    classifySchemaType("Organization"),
  );
  for (const term of [
    "schema:Organization",
    " https://schema.org/Organization",
    "https://schema.org/Organization#x",
    "https://example.org/Organization",
    "__proto__",
    "x".repeat(257),
  ])
    expect(() => classifySchemaType(term)).toThrow();
});
it("returns immutable provenance and detached result arrays", () => {
  expect(schemaVocabularyProvenance.version).toBe("30.1");
  expect(schemaVocabularyProvenance.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  const a = classifySchemaType("UserLikes");
  a.supersededBy.length = 0;
  expect(classifySchemaType("UserLikes").supersededBy).toEqual([
    "InteractionCounter",
  ]);
  expect(Object.isFrozen(schemaVocabularyProvenance)).toBe(true);
});
const context = {
  schema: "https://schema.org/",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
};
it("extracts schema namespace only, handles multi-types, retains sections", () => {
  const terms = extractSchemaTerms({
    "@context": context,
    "@graph": [
      { "@id": "foreign:Organization", "@type": "rdfs:Class" },
      { "@id": "schema:Text", "@type": ["rdfs:Class", "schema:DataType"] },
      {
        "@id": "schema:Old",
        "@type": "rdfs:Class",
        "schema:isPartOf": { "@id": "https://attic.schema.org" },
      },
    ],
  });
  expect(Object.keys(terms)).toEqual(["Old", "Text"]);
  expect(terms.Text.membership).toBe("class");
  expect(terms.Old.section).toBe("attic");
});
it("rejects ambiguous registry context, duplicates, unknown section and malformed types", () => {
  const term = { "@id": "schema:Thing", "@type": "rdfs:Class" };
  for (const doc of [
    {
      "@context": { ...context, schema: "https://example.org/" },
      "@graph": [term],
    },
    { "@context": context, "@graph": [term, term] },
    {
      "@context": context,
      "@graph": [
        { ...term, "schema:isPartOf": { "@id": "https://unknown.schema.org" } },
      ],
    },
    { "@context": context, "@graph": [{ ...term, "@type": null }] },
  ])
    expect(() => extractSchemaTerms(doc)).toThrow();
});

it("recognizes digit-leading classes in the pinned vocabulary", () => {
  expect(classifySchemaType("3DModel").membership).toBe("class");
});

it("rejects source bytes that do not match the reviewed pin", () => {
  expect(() => buildSchemaRegistry(Buffer.from("{}"))).toThrow(/hash mismatch/);
  expect(() => buildSchemaRegistry("not-bytes")).toThrow(/hash mismatch/);
});
