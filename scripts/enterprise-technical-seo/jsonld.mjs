import { Buffer } from "node:buffer";
import { parseCaptureJson } from "./strict-json.mjs";
const schemaContexts = new Set([
  "https://schema.org",
  "https://schema.org/",
  "http://schema.org",
  "http://schema.org/",
]);
/** Bounded JSON syntax and conservative type extraction. No remote context loading. */
export function inspectJsonLdBlocks(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join(",") !== "blocks,complete" ||
    typeof input.complete !== "boolean" ||
    !Array.isArray(input.blocks) ||
    input.blocks.length > 50
  )
    throw new Error("Invalid JSON-LD projection");
  let bytes = 0;
  const ids = new Set();
  const blocks = input.blocks.map((block) => {
    if (
      !block ||
      typeof block !== "object" ||
      Array.isArray(block) ||
      Object.keys(block).sort().join(",") !== "id,text" ||
      typeof block.id !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(block.id) ||
      ids.has(block.id) ||
      typeof block.text !== "string"
    )
      throw new Error("Invalid JSON-LD block");
    ids.add(block.id);
    bytes += Buffer.byteLength(block.text);
    if (bytes > 1024 * 1024 || Buffer.byteLength(block.text) > 256 * 1024)
      throw new Error("JSON-LD byte budget exceeded");
    return block;
  });
  const observations = [];
  for (const block of blocks) {
    const result = {
      blockId: block.id,
      jsonSyntax: "pass",
      documentShape: "unknown",
      typeExtractionComplete: false,
      types: [],
      pending: [],
    };
    let data;
    try {
      data = JSON.parse(block.text);
    } catch {
      result.jsonSyntax = "fail";
      result.pending.push("invalid-json-syntax");
      observations.push(result);
      continue;
    }
    try {
      parseCaptureJson(block.text);
    } catch {
      result.pending.push("ambiguous-members-or-parser-budget");
      observations.push(result);
      continue;
    }
    if (
      data === null ||
      typeof data !== "object" ||
      (Array.isArray(data) &&
        data.some(
          (item) =>
            item === null || typeof item !== "object" || Array.isArray(item),
        ))
    ) {
      result.documentShape = "fail";
      result.pending.push("unsupported-jsonld-root-shape");
      observations.push(result);
      continue;
    }
    result.documentShape = "pass";
    let nodes = 0;
    function contextMode(value, inherited) {
      if (value === undefined) return inherited;
      if (value === null) return "none";
      if (typeof value === "string" && schemaContexts.has(value))
        return "schema";
      if (
        value &&
        !Array.isArray(value) &&
        typeof value === "object" &&
        Object.keys(value).length === 1 &&
        ["https://schema.org/", "http://schema.org/"].includes(value["@vocab"])
      )
        return "schema";
      result.pending.push("context-expansion-required");
      return "unresolved";
    }
    function visit(value, inherited, depth) {
      if (depth > 32 || ++nodes > 2000) {
        result.pending.push("type-traversal-budget");
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) visit(item, inherited, depth + 1);
        return;
      }
      if (value === null || typeof value !== "object") return;
      const mode = contextMode(value["@context"], inherited);
      // Unknown context definitions can remap terms and scope descendants; no partial guesses.
      if (mode === "unresolved") return;
      if (Object.hasOwn(value, "@value")) {
        result.pending.push("literal-value-object-not-expanded");
        return;
      }
      if (Object.hasOwn(value, "@type")) {
        const types = Array.isArray(value["@type"])
          ? value["@type"]
          : [value["@type"]];
        for (const type of types) {
          if (typeof type !== "string" || type.length > 256) {
            result.pending.push("unsupported-type-value");
            continue;
          }
          const full =
            /^https?:\/\/schema\.org\/([A-Za-z0-9][A-Za-z0-9]*)$/.exec(type);
          const term =
            /^[A-Za-z0-9][A-Za-z0-9]*$/.test(type) && mode === "schema"
              ? type
              : null;
          if (full || term)
            result.types.push({
              nodeIndex: nodes,
              type: full ? full[1] : term,
            });
          else result.pending.push("type-expansion-required");
        }
      }
      // Context definitions are not data nodes. @json values are opaque and must not create types.
      if (value["@type"] === "@json") {
        result.pending.push("json-literal-not-expanded");
        return;
      }
      for (const [key, item] of Object.entries(value)) {
        if (
          [
            "@context",
            "@type",
            "@value",
            "@id",
            "@language",
            "@direction",
            "@index",
          ].includes(key)
        )
          continue;
        if (["@graph", "@included", "@list", "@set"].includes(key)) {
          visit(item, mode, depth + 1);
          continue;
        }
        if (
          key.startsWith("@") ||
          (mode === "schema" && ["id", "type"].includes(key))
        ) {
          result.pending.push("keyword-or-alias-expansion-required");
          continue;
        }
        if (mode === "schema" || /^https?:\/\//.test(key))
          visit(item, mode, depth + 1);
        else result.pending.push("property-expansion-required");
      }
    }
    visit(data, "none", 0);
    result.pending = [...new Set(result.pending)];
    result.typeExtractionComplete = result.pending.length === 0;
    observations.push(result);
  }
  return {
    observations,
    jsonSyntax: observations.some((x) => x.jsonSyntax === "fail")
      ? "fail"
      : input.complete && observations.length
        ? "pass"
        : "unknown",
    typeCoverageComplete:
      input.complete &&
      observations.length > 0 &&
      observations.every((x) => x.typeExtractionComplete),
    richResultEligibility: "unknown",
    visibleContentAgreement: "unknown",
    typeVocabularyValidity: "unknown",
    limitations: [
      "Type terms are observed schema.org identifiers, not validated vocabulary membership",
      "Unsupported contexts require a separately scoped JSON-LD processor; no network context loading occurs",
      "No Microdata/RDFa, required-property, visible-content or rich-result acceptance claim",
    ],
  };
}
