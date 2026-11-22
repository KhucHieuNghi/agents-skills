import { createHash } from "node:crypto";
import { isAbsolute, normalize } from "node:path";
import { URL } from "node:url";
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
function normalizeUrl(value, trackingParameters) {
  if (!nonempty(value)) throw new Error("URL is required.");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Only credential-free HTTP(S) URLs are supported.");
  url.hash = "";
  for (const name of trackingParameters) url.searchParams.delete(name);
  return url.href;
}
// Preserve item IDs for query variants without displaying query values.
export function publicUrlLabel(uri) {
  const url = new URL(uri);
  return url.origin + url.pathname + (url.search ? " (query omitted)" : "");
}

/** Enumerates explicit inputs only. It does not fetch, infer scope completeness or authorize local file access. */
export function normalizeItems(inputs, { trackingParameters = [] } = {}) {
  if (
    !Array.isArray(inputs) ||
    !Array.isArray(trackingParameters) ||
    trackingParameters.some((name) => !nonempty(name))
  )
    throw new Error("Invalid inventory inputs.");
  const items = new Map();
  for (const input of inputs) {
    if (!input || typeof input !== "object" || !nonempty(input.source))
      throw new Error("Inventory source is required.");
    if ((input.uri !== undefined) === (input.path !== undefined))
      throw new Error("Provide exactly one URI or absolute path.");
    let uri = null;
    let path = null;
    if (input.uri !== undefined)
      uri = normalizeUrl(input.uri, trackingParameters);
    else {
      if (
        !nonempty(input.path) ||
        !isAbsolute(input.path) ||
        input.path.includes("\0")
      )
        throw new Error("Local paths must be absolute.");
      path = normalize(input.path);
    }
    for (const field of ["locale", "type", "canonical"])
      if (input[field] !== undefined && !nonempty(input[field]))
        throw new Error(`Invalid ${field}.`);
    const key = uri ? `url:${uri}` : `path:${path}`;
    if (!items.has(key))
      items.set(key, {
        itemId: createHash("sha256").update(key).digest("hex"),
        uri,
        path,
        sources: new Set(),
        aliases: new Set(),
        localeCandidates: new Set(),
        typeCandidates: new Set(),
        canonicalCandidates: new Set(),
        state: "pending",
      });
    const item = items.get(key);
    item.sources.add(input.source);
    item.aliases.add(input.uri ?? input.path);
    if (input.locale) item.localeCandidates.add(input.locale);
    if (input.type) item.typeCandidates.add(input.type);
    if (input.canonical)
      item.canonicalCandidates.add(
        normalizeUrl(input.canonical, trackingParameters),
      );
  }
  return [...items.values()]
    .map((item) => {
      for (const field of [
        "sources",
        "aliases",
        "localeCandidates",
        "typeCandidates",
        "canonicalCandidates",
      ])
        item[field] = [...item[field]].sort();
      item.locale =
        item.localeCandidates.length === 1
          ? item.localeCandidates[0]
          : "unknown";
      item.type =
        item.typeCandidates.length === 1 ? item.typeCandidates[0] : "unknown";
      return item;
    })
    .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));
}
