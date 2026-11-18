import registry from "./schema-vocabulary.json" with { type: "json" };
export const schemaVocabularyProvenance = Object.freeze({
  ...registry.provenance,
});
/** Membership in a pinned vocabulary snapshot only; caller must resolve the JSON-LD term first. */
export function classifySchemaType(value) {
  if (typeof value !== "string" || value.length > 256)
    throw new Error("Invalid resolved schema type");
  const match = /^(?:https?:\/\/schema\.org\/)?([A-Za-z0-9][A-Za-z0-9]*)$/.exec(
    value,
  );
  if (!match) throw new Error("Invalid resolved schema type");
  const term = match[1];
  const entry = Object.hasOwn(registry.terms, term)
    ? registry.terms[term]
    : null;
  return {
    term,
    membership: entry?.membership ?? "unlisted",
    section: entry?.section ?? null,
    supersededBy: [...(entry?.supersededBy ?? [])],
    vocabularyVersion: registry.provenance.version,
  };
}
