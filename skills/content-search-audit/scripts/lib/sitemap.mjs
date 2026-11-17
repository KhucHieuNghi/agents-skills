import { Buffer } from "node:buffer";
import { URL } from "node:url";
const namespace = "http://www.sitemaps.org/schemas/sitemap/0.9";
const name = "[A-Za-z_][A-Za-z0-9_.:-]*";
function invalidCharacters(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (
      (code < 32 && ![9, 10, 13].includes(code)) ||
      (code >= 0xd800 && code <= 0xdfff) ||
      code === 0xfffe ||
      code === 0xffff
    )
      return true;
  }
  return false;
}
function entities(text) {
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(text))
    throw new Error("Unsupported XML entity");
  return text.replace(
    /&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g,
    (_all, value) => {
      const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
      if (named[value]) return named[value];
      const code = value.startsWith("#x")
        ? parseInt(value.slice(2), 16)
        : Number(value.slice(1));
      if (!(
        code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 32 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff)
      ))
        throw new Error("Invalid XML character reference");
      return String.fromCodePoint(code);
    },
  );
}
function url(value) {
  if (!value || value.length >= 2048 || /\s/.test(value))
    throw new Error("Invalid sitemap location");
  const parsed = new URL(value);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new Error("Sitemap location must be credential-free HTTP(S)");
  return parsed.href;
}
/** Bounded, inert sitemap XML reader. No DTD, external entities, fetching or script execution. */
export function parseSitemap(xml) {
  if (
    typeof xml !== "string" ||
    Buffer.byteLength(xml) > 10 * 1024 * 1024 ||
    invalidCharacters(xml)
  )
    throw new Error(
      "Invalid sitemap text or operational 10 MiB limit exceeded",
    );
  xml = xml.replace(/^\uFEFF/, "");
  const declaration = xml.match(
    /^<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?(?:\s+standalone=["'](?:yes|no)["'])?\s*\?>/i,
  );
  if (declaration) xml = xml.slice(declaration[0].length);
  const token =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(?:"[^"]*"|'[^']*'|[^<>"'])*>|[^<]+/gy;
  const stack = [],
    locations = [];
  let root = null,
    finished = false,
    position = 0,
    tokens = 0;
  function text(value, cdata = false) {
    const current = stack.at(-1);
    const decoded = cdata ? value : entities(value);
    if (current?.isLoc) current.value += decoded;
    else if (!current && decoded.trim())
      throw new Error("Text outside sitemap root");
    else if (
      current?.uri === namespace &&
      ["urlset", "sitemapindex", "url", "sitemap"].includes(current.local) &&
      decoded.trim()
    )
      throw new Error("Unexpected sitemap text");
  }
  function close(tag) {
    const current = stack.pop();
    if (!current || current.tag !== tag)
      throw new Error("Mismatched XML closing tag");
    if (current.isLoc) {
      const parent = stack.at(-1);
      parent.locations.push(url(current.value.trim()));
    }
    if (current.isEntry) {
      if (current.locations.length !== 1)
        throw new Error("Sitemap entry requires exactly one loc");
      locations.push(current.locations[0]);
      if (locations.length > 50000)
        throw new Error("Sitemap entry limit exceeded");
    }
    if (!stack.length) finished = true;
  }
  while (position < xml.length) {
    token.lastIndex = position;
    const match = token.exec(xml);
    if (!match || ++tokens > 1000000)
      throw new Error("Malformed or oversized XML token stream");
    position = token.lastIndex;
    const value = match[0];
    if (value.startsWith("<!--")) {
      if (value.slice(4, -3).includes("--"))
        throw new Error("Malformed XML comment");
      continue;
    }
    if (value.startsWith("<![CDATA[")) {
      if (!stack.length) throw new Error("CDATA outside root");
      text(value.slice(9, -3), true);
      continue;
    }
    if (!value.startsWith("<")) {
      if (value.includes("]]>")) throw new Error("Malformed XML text");
      text(value);
      continue;
    }
    if (value.startsWith("<!") || value.startsWith("<?"))
      throw new Error("DTD and processing instructions are unsupported");
    const ending = value.match(new RegExp(`^</(${name})\\s*>$`));
    if (ending) {
      close(ending[1]);
      continue;
    }
    const start = value.match(new RegExp(`^<(${name})([\\s\\S]*?)(/?)>$`));
    if (!start || finished || stack.at(-1)?.isLoc)
      throw new Error("Malformed or nested sitemap element");
    const namespaces = {
      ...(stack.at(-1)?.namespaces ?? {}),
      xml: "http://www.w3.org/XML/1998/namespace",
    };
    const attributes = new Map();
    const attr = new RegExp(`\\s+(${name})\\s*=\\s*("[^"<]*"|'[^'<]*')`, "gy");
    let offset = 0;
    while (offset < start[2].length) {
      if (!start[2].slice(offset).trim()) break;
      attr.lastIndex = offset;
      const entry = attr.exec(start[2]);
      if (!entry || attributes.has(entry[1]))
        throw new Error("Malformed or duplicate XML attribute");
      offset = attr.lastIndex;
      attributes.set(entry[1], entities(entry[2].slice(1, -1)));
    }
    for (const [key, val] of attributes) {
      if (key === "xmlns") namespaces[""] = val;
      else if (key.startsWith("xmlns:")) namespaces[key.slice(6)] = val;
    }
    const split = start[1].split(":");
    if (split.length > 2 || (split.length === 2 && !namespaces[split[0]]))
      throw new Error("Unknown XML namespace");
    const local = split.at(-1),
      uri = namespaces[split.length === 2 ? split[0] : ""] ?? "";
    const parent = stack.at(-1);
    if (!parent) {
      if (
        root ||
        uri !== namespace ||
        !["urlset", "sitemapindex"].includes(local)
      )
        throw new Error("Unsupported sitemap root or namespace");
      root = local;
    }
    const isEntry =
      stack.length === 1 &&
      uri === namespace &&
      local === (root === "urlset" ? "url" : "sitemap");
    if (stack.length === 1 && !isEntry)
      throw new Error("Unexpected sitemap root child");
    const isLoc = Boolean(
      parent?.isEntry && uri === namespace && local === "loc",
    );
    stack.push({
      tag: start[1],
      namespaces,
      uri,
      local,
      isEntry,
      isLoc,
      locations: [],
      value: "",
    });
    if (stack.length > 64) throw new Error("XML depth limit exceeded");
    if (start[3]) close(start[1]);
  }
  if (!root || !finished || stack.length)
    throw new Error("Incomplete sitemap XML");
  return {
    kind: root === "urlset" ? "urlset" : "sitemapindex",
    locations,
    limitations: [
      "Extracts declared locations only; does not prove full site inventory, indexing or freshness",
      "Extension metadata is not interpreted; no network access is authorized by parsing",
      "Operational limit 10 MiB; larger valid sitemaps need partitioned input or another reviewed adapter",
    ],
  };
}
