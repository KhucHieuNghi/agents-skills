import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import process from "node:process";
export const schemaVocabularyProvenance = Object.freeze({
  version: "30.1",
  sourceUrl: "https://schema.org/version/30.1/schemaorg-all-https.jsonld",
  sourceSha256:
    "07e7c663dbc12a0937581745e59a98ed12b8698f38e8e3b03650287d9df88ae5",
  attribution:
    "Schema.org vocabulary contributors; derived term classifications by NKSkills",
  license: "CC-BY-SA-3.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  termsUrl: "https://schema.org/docs/terms.html",
});
const assert = (ok) => {
  if (!ok) throw new Error("Unsupported schema vocabulary source shape");
};
const termName = /^[A-Za-z0-9][A-Za-z0-9]*$/;
/** Fixed source serialization profile; not a general JSON-LD processor. */
export function extractSchemaTerms(doc) {
  assert(
    doc &&
      doc["@context"]?.schema === "https://schema.org/" &&
      doc["@context"]?.rdfs === "http://www.w3.org/2000/01/rdf-schema#" &&
      doc["@context"]?.rdf === "http://www.w3.org/1999/02/22-rdf-syntax-ns#" &&
      Array.isArray(doc["@graph"]) &&
      doc["@graph"].length <= 10000,
  );
  const terms = Object.create(null);
  for (const row of doc["@graph"]) {
    assert(row && typeof row["@id"] === "string");
    if (!row["@id"].startsWith("schema:")) continue;
    const name = row["@id"].slice(7);
    assert(
      termName.test(name) && name.length <= 256 && !Object.hasOwn(terms, name),
    );
    const types = Array.isArray(row["@type"]) ? row["@type"] : [row["@type"]];
    assert(
      types.length > 0 &&
        types.every(
          (t) =>
            typeof t === "string" &&
            /^[A-Za-z][A-Za-z0-9-]*:[A-Za-z0-9][A-Za-z0-9]*$/.test(t),
        ),
    );
    assert(!(types.includes("rdfs:Class") && types.includes("rdf:Property")));
    let section = "core";
    if (Object.hasOwn(row, "schema:isPartOf")) {
      const part = row["schema:isPartOf"];
      assert(
        part &&
          Object.keys(part).length === 1 &&
          typeof part["@id"] === "string",
      );
      const match =
        /^https:\/\/(pending|attic|health-lifesci|auto|bib|meta)\.schema\.org$/.exec(
          part["@id"],
        );
      assert(match);
      section = match[1];
    }
    const supersededBy = [];
    if (Object.hasOwn(row, "schema:supersededBy")) {
      const list = Array.isArray(row["schema:supersededBy"])
        ? row["schema:supersededBy"]
        : [row["schema:supersededBy"]];
      for (const value of list) {
        assert(
          value &&
            Object.keys(value).length === 1 &&
            typeof value["@id"] === "string" &&
            /^schema:[A-Za-z0-9][A-Za-z0-9]*$/.test(value["@id"]),
        );
        supersededBy.push(value["@id"].slice(7));
      }
    }
    terms[name] = {
      membership: types.includes("rdfs:Class")
        ? "class"
        : types.includes("rdf:Property")
          ? "property"
          : "individual",
      section,
      supersededBy: [...new Set(supersededBy)].sort(),
    };
  }
  return Object.fromEntries(
    Object.keys(terms)
      .sort()
      .map((name) => [name, terms[name]]),
  );
}
export function buildSchemaRegistry(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length > 8 * 1024 * 1024 ||
    createHash("sha256").update(bytes).digest("hex") !==
      schemaVocabularyProvenance.sourceSha256
  )
    throw new Error("Schema vocabulary source hash mismatch");
  return {
    schemaVersion: 1,
    provenance: schemaVocabularyProvenance,
    terms: extractSchemaTerms(JSON.parse(bytes.toString("utf8"))),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.length !== 4)
    throw new Error(
      "Usage: schema-registry-build.mjs SOURCE_JSONLD NEW_OUTPUT_JSON",
    );
  const registry = buildSchemaRegistry(await readFile(process.argv[2]));
  await writeFile(process.argv[3], JSON.stringify(registry, null, 2) + "\n", {
    flag: "wx",
  });
  process.stdout.write(
    JSON.stringify({
      terms: Object.keys(registry.terms).length,
      sourceSha256: registry.provenance.sourceSha256,
    }) + "\n",
  );
}
