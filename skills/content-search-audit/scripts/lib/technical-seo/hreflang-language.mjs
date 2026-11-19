import registry from "./language-registry.json" with { type: "json" };
const sets = Object.fromEntries(
  Object.entries(registry.sets).map(([key, values]) => [key, new Set(values)]),
);
const deprecated = Object.fromEntries(
  Object.entries(registry.deprecated).map(([key, values]) => [
    key,
    new Set(values),
  ]),
);
// Registered BCP47 regions are not necessarily officially assigned ISO3166-1 regions.
// Keep exceptional, private/unknown or non-country codes uncertain, never auto-correct.
const exceptionalRegions = new Set([
  "aa",
  "ac",
  "cp",
  "cq",
  "dg",
  "ea",
  "eu",
  "ez",
  "ic",
  "ta",
  "un",
  "zz",
]);
export function classifyHreflangLanguage(value) {
  const result = (status, reason, normalized = null) => ({
    status,
    reason,
    normalized,
    registryDate: registry.fileDate,
    registrySha256: registry.sourceSha256,
    contentLanguage: "unknown",
  });
  if (typeof value !== "string" || value.length > 64)
    return result("fail", "invalid-language-representation");
  if (value.toLowerCase() === "x-default")
    return result("pass", "fallback-label", "x-default");
  const match = /^([a-z]{2})(?:-([a-z]{4}))?(?:-([a-z]{2}))?$/i.exec(value);
  if (!match) return result("fail", "unsupported-language-form");
  const language = match[1].toLowerCase(),
    script = match[2]?.toLowerCase(),
    region = match[3]?.toLowerCase();
  if (!sets.language.has(language))
    return result("fail", "unregistered-language");
  if (script && !sets.script.has(script))
    return result("fail", "unregistered-script");
  if (region && ["uk", "eu", "un"].includes(region))
    return result("fail", "region-ignored-by-google");
  if (region && !sets.region.has(region))
    return result("fail", "unregistered-region");
  if (
    deprecated.language.has(language) ||
    (script && deprecated.script.has(script)) ||
    (region && deprecated.region.has(region))
  )
    return result("unknown", "deprecated-subtag-needs-review");
  if (region && exceptionalRegions.has(region))
    return result("unknown", "region-assignment-needs-review");
  const normalized = [
    language,
    script && script[0].toUpperCase() + script.slice(1),
    region?.toUpperCase(),
  ]
    .filter(Boolean)
    .join("-");
  return result("pass", "supported-form-registered-subtags", normalized);
}
