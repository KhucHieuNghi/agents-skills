import { Buffer } from "node:buffer";
import { URL } from "node:url";
const named = {
  amp: "&",
  AMP: "&",
  lt: "<",
  LT: "<",
  gt: ">",
  GT: ">",
  quot: '"',
  QUOT: '"',
  apos: "'",
};
function decode(value) {
  if (/&[A-Za-z][A-Za-z0-9]*(?=$|[^A-Za-z0-9=;])/.test(value))
    throw new Error(
      "Semicolonless named reference requires DOM interpretation",
    );
  return value.replace(
    /&(#x[\da-f]+;?|#\d+;?|[a-z][a-z\d]*;)/gi,
    (whole, entity) => {
      const token = entity.replace(/;$/, "");
      if (Object.hasOwn(named, token)) return named[token];
      if (!token.startsWith("#"))
        throw new Error(`Unsupported named character reference ${whole}`);
      const code = /^#x/i.test(token)
        ? parseInt(token.slice(2), 16)
        : Number(token.slice(1));
      if (
        !Number.isSafeInteger(code) ||
        code < 32 ||
        (code >= 127 && code <= 159) ||
        code > 0x10ffff ||
        (code >= 0xd800 && code <= 0xdfff)
      )
        throw new Error("Unsupported HTML character reference");
      return String.fromCodePoint(code);
    },
  );
}
function attributes(value) {
  if (/[^\S\t\n\f\r ]/u.test(value))
    throw new Error(
      "Non-HTML whitespace in attributes requires DOM interpretation",
    );
  const result = new Map();
  const pattern =
    /\s+([^\s=/>"'<`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy;
  let position = 0;
  while (position < value.length) {
    if (/^\s*\/?\s*$/.test(value.slice(position))) break;
    pattern.lastIndex = position;
    const match = pattern.exec(value);
    if (!match)
      throw new Error("Unsupported or malformed HTML attribute syntax");
    position = pattern.lastIndex;
    const key = match[1].toLowerCase();
    if (result.has(key))
      throw new Error("Duplicate HTML attribute requires DOM interpretation");
    result.set(key, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}
/** Conservative inert source-link extraction, deliberately not an HTML5 DOM implementation. */
export function extractHtmlLinks(source, documentUrl) {
  const document = new URL(documentUrl);
  if (
    !["http:", "https:"].includes(document.protocol) ||
    document.username ||
    document.password ||
    typeof source !== "string" ||
    source.includes("\0") ||
    Buffer.byteLength(source) > 10 * 1024 * 1024
  )
    throw new Error("Invalid source HTML or document URL");
  const pending = [],
    candidates = [],
    nonHttp = [],
    links = [];
  let baseUrl = document.href,
    baseSeen = false,
    baseAmbiguous = false,
    requiresRendering = false;
  let position = 0,
    tags = 0,
    templateDepth = 0,
    foreignDepth = 0;
  const opening =
    /<(\/?)([a-z][a-z0-9:-]*)(?=\s|\/?>)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/giy;
  const issue = (kind, reason, offset) =>
    pending.push({ kind, reason, offset });
  while (position < source.length) {
    const start = source.indexOf("<", position);
    if (start < 0) break;
    if (++tags > 200000) {
      issue("html-token-budget", "HTML token budget exceeded", start);
      break;
    }
    if (source.startsWith("<!--", start)) {
      const end = source.indexOf("-->", start + 4);
      if (end < 0) {
        issue("html-comment", "Unclosed HTML comment", start);
        break;
      }
      position = end + 3;
      continue;
    }
    opening.lastIndex = start;
    const match = opening.exec(source);
    if (!match) {
      const doctype = source.slice(start).match(/^<!doctype\s+html\s*>/i);
      if (doctype) {
        position = start + doctype[0].length;
        continue;
      }
      issue("html-token", "Unsupported markup may need a DOM parser", start);
      position = start + 1;
      continue;
    }
    position = start + match[0].length;
    const closing = Boolean(match[1]),
      tag = match[2].toLowerCase();
    if (tag === "template") {
      templateDepth += closing ? -1 : 1;
      requiresRendering = true;
      if (templateDepth < 0) {
        issue("html-template", "Unmatched template close", start);
        templateDepth = 0;
      }
      continue;
    }
    if (["svg", "math"].includes(tag)) {
      foreignDepth += closing ? -1 : 1;
      if (!closing)
        issue(
          "foreign-content",
          "SVG/MathML navigation requires a DOM-aware adapter",
          start,
        );
      if (foreignDepth < 0) foreignDepth = 0;
      continue;
    }
    if (closing) continue;
    if (tag === "noscript") {
      requiresRendering = true;
      issue(
        "html-noscript",
        "Noscript link interpretation depends on browser scripting mode",
        start,
      );
    }
    if (
      [
        "script",
        "style",
        "textarea",
        "title",
        "xmp",
        "iframe",
        "noembed",
        "noframes",
      ].includes(tag)
    ) {
      if (["script", "iframe", "noembed", "noframes"].includes(tag))
        requiresRendering = true;
      const end = new RegExp(`</${tag}\\s*>`, "ig");
      end.lastIndex = position;
      const found = end.exec(source);
      if (!found) {
        issue("html-raw-text", `Unclosed ${tag} element`, start);
        break;
      }
      position = end.lastIndex;
      continue;
    }
    if (tag === "plaintext") {
      issue("html-plaintext", "Plaintext parsing mode is unsupported", start);
      break;
    }
    if (
      templateDepth ||
      foreignDepth ||
      !["a", "area", "base", "meta"].includes(tag)
    )
      continue;
    let attrs;
    try {
      attrs = attributes(match[3]);
    } catch (error) {
      issue("html-attributes", error.message, start);
      if (tag === "base") baseAmbiguous = true;
      continue;
    }
    if (tag === "meta") {
      if ((attrs.get("http-equiv") ?? "").toLowerCase() === "refresh")
        issue(
          "html-refresh",
          "Meta refresh target is not automatically followed",
          start,
        );
      continue;
    }
    if (!attrs.has("href")) continue;
    if (tag === "base") {
      if (!baseSeen) {
        baseSeen = true;
        try {
          const base = new URL(decode(attrs.get("href")), document.href);
          if (
            !["http:", "https:"].includes(base.protocol) ||
            base.username ||
            base.password
          )
            throw new Error("Unsupported base URL");
          baseUrl = base.href;
        } catch (error) {
          baseAmbiguous = true;
          issue("html-base", error.message, start);
        }
      }
    } else
      candidates.push({
        tag,
        href: attrs.get("href"),
        rel: attrs.get("rel") ?? "",
        offset: start,
      });
  }
  if (templateDepth || foreignDepth)
    issue(
      "html-unclosed-container",
      "Unclosed inert or foreign content container",
      position,
    );
  for (const candidate of candidates) {
    try {
      const href = decode(candidate.href).replace(
        /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,
        "",
      );
      if (baseAmbiguous)
        throw new Error("Document base is ambiguous; links require DOM review");
      const target = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(target.protocol)) {
        nonHttp.push({ ...candidate, protocol: target.protocol });
        continue;
      }
      if (target.username || target.password)
        throw new Error("Credential-bearing hyperlink is not collected");
      target.hash = "";
      links.push({
        ...candidate,
        uri: target.href,
        rel: decode(candidate.rel).split(/\s+/).filter(Boolean),
      });
    } catch (error) {
      issue("html-link", error.message, candidate.offset);
    }
  }
  return {
    documentUrl: document.href,
    baseUrl,
    links,
    nonHttp,
    pending,
    requiresRendering,
    completeForSupportedSource: pending.length === 0,
    limitations: [
      "Only source a/area hyperlinks are extracted; this is not an HTML5 DOM or browser rendering",
      "Scripts, event handlers, forms, resource hints and hyperlink ping are never executed or submitted",
      "Templates/raw text are inert; dynamic navigation needs separate rendered evidence",
      "Unsupported entities or ambiguous markup remain pending rather than guessed URLs",
    ],
  };
}
