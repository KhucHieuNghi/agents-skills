import { expect, it } from "vitest";
// @ts-expect-error development module
import { inspectJsonLdBlocks } from "../scripts/enterprise-technical-seo/jsonld.mjs";
function inspect(value: unknown, complete = true) {
  return inspectJsonLdBlocks({
    complete,
    blocks: [
      {
        id: "block-0",
        text: typeof value === "string" ? value : JSON.stringify(value),
      },
    ],
  });
}
it("extracts graph and nested types without claiming rich results", () => {
  const r = inspect({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization" },
      { "@type": ["Product", "Thing"], offers: { "@type": "Offer" } },
    ],
  });
  expect(r.observations[0].types.map((x: { type: string }) => x.type)).toEqual([
    "Organization",
    "Product",
    "Thing",
    "Offer",
  ]);
  expect(r.typeCoverageComplete).toBe(true);
  expect(r.richResultEligibility).toBe("unknown");
  expect(r.typeVocabularyValidity).toBe("unknown");
});
it("malformed JSON fails without echoing parser payload", () => {
  const r = inspect('{"secret":"private-value",');
  expect(r.jsonSyntax).toBe("fail");
  expect(JSON.stringify(r)).not.toContain("private-value");
});
it("duplicate members are ambiguous rather than silently overwritten", () => {
  const r = inspect('{"@type":"Product","@type":"Offer"}');
  expect(r.jsonSyntax).toBe("pass");
  expect(r.typeCoverageComplete).toBe(false);
  expect(r.observations[0].types).toEqual([]);
});
it.each([null, true, 42, '"string"', "[1]"])(
  "does not accept scalar JSON-LD document %s",
  (value) => {
    expect(inspect(value).observations[0].documentShape).toBe("fail");
  },
);
it("no blocks never means whole site lacks structured data", () => {
  const r = inspectJsonLdBlocks({ complete: true, blocks: [] });
  expect(r.jsonSyntax).toBe("unknown");
  expect(r.typeCoverageComplete).toBe(false);
});
it("remote/custom context remains unresolved without fetching", () => {
  const r = inspect({
    "@context": "https://private.example/context",
    "@type": "Product",
  });
  expect(r.typeCoverageComplete).toBe(false);
  expect(r.observations[0].types).toEqual([]);
  expect(JSON.stringify(r)).not.toContain("private.example");
});
it("supports explicit schema IRIs independently of context", () => {
  expect(
    inspect({ "@type": "https://schema.org/Product" }).observations[0].types[0]
      .type,
  ).toBe("Product");
});
it("null context does not inherit schema vocabulary", () => {
  const r = inspect({
    "@context": "https://schema.org",
    child: { "@context": null, "@type": "Product" },
  });
  expect(r.typeCoverageComplete).toBe(false);
  expect(r.observations[0].types).toEqual([]);
});
it("inline aliases require expansion rather than guessed types", () => {
  const r = inspect({
    "@context": { "@vocab": "https://schema.org/", kind: "@type" },
    kind: "Product",
  });
  expect(r.typeCoverageComplete).toBe(false);
});
it("simple vocab and top-level arrays preserve type observations", () => {
  expect(
    inspect([
      { "@context": { "@vocab": "https://schema.org/" }, "@type": "Person" },
    ]).observations[0].types[0].type,
  ).toBe("Person");
});
it("opaque JSON values cannot inject a node type", () => {
  const r = inspect({
    "@context": "https://schema.org",
    "@value": { "@type": "Product" },
    "@type": "@json",
  });
  expect(r.observations[0].types).toEqual([]);
  expect(r.typeCoverageComplete).toBe(false);
});
it("incomplete enumeration prevents a clean coverage claim", () => {
  expect(
    inspect({ "@context": "https://schema.org", "@type": "Product" }, false)
      .typeCoverageComplete,
  ).toBe(false);
});
it("rejects duplicate IDs and resource overflows", () => {
  expect(() =>
    inspectJsonLdBlocks({
      complete: true,
      blocks: [
        { id: "x", text: "{}" },
        { id: "x", text: "{}" },
      ],
    }),
  ).toThrow();
  expect(() => inspect(" ".repeat(256 * 1024 + 1))).toThrow("budget");
});
it("deep syntactically valid input stays unknown when parser budget is exceeded", () => {
  const r = inspect("[".repeat(40) + "{}" + "]".repeat(40));
  expect(r.jsonSyntax).toBe("pass");
  expect(r.typeCoverageComplete).toBe(false);
});

it("does not equate a bare schema context URL with inline vocab concatenation", () => {
  const r = inspect({
    "@context": { "@vocab": "https://schema.org" },
    "@type": "Product",
  });
  expect(r.observations[0].types).toEqual([]);
  expect(r.typeCoverageComplete).toBe(false);
});
it("does not extract value-object datatypes as entity types", () => {
  const r = inspect({
    "@context": "https://schema.org",
    "@value": "2026-11-19",
    "@type": "https://schema.org/Date",
  });
  expect(r.observations[0].types).toEqual([]);
});

it.each([
  { ignored: { "@type": "https://schema.org/Product" } },
  { "@context": "https://schema.org", "@garbage": { "@type": "Product" } },
])("does not extract types across unresolved property boundaries", (value) => {
  const r = inspect(value);
  expect(r.observations[0].types).toEqual([]);
  expect(r.typeCoverageComplete).toBe(false);
});
it("does not erase inherited custom term mappings with a local vocab", () => {
  const r = inspect({
    "@context": {
      Product: "https://example.org/Other",
      child: "https://example.org/child",
    },
    child: {
      "@context": { "@vocab": "https://schema.org/" },
      "@type": "Product",
    },
  });
  expect(r.observations[0].types).toEqual([]);
  expect(r.typeCoverageComplete).toBe(false);
});

it("extracts digit-leading schema class names without dropping 3DModel", () => {
  for (const type of [
    "3DModel",
    "https://schema.org/3DModel",
    "http://schema.org/3DModel",
  ]) {
    const r = inspect({ "@context": "https://schema.org", "@type": type });
    expect(
      r.observations[0].types.map((x: { type: string }) => x.type),
    ).toEqual(["3DModel"]);
    expect(r.typeCoverageComplete).toBe(true);
  }
});
