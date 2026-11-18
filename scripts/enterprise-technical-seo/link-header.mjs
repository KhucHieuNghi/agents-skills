import { Buffer } from "node:buffer";
import { URL } from "node:url";
const token = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+/;
function resolveReference(value, base) {
  if (value.length > 8192 || /%(?![0-9A-Fa-f]{2})/.test(value))
    throw new Error("unsupported-uri");
  const parts =
    /^(?:([A-Za-z][A-Za-z0-9+.-]*):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/.exec(
      value,
    );
  if (
    !parts ||
    (parts[1] && (!/^https?$/i.test(parts[1]) || parts[2] === undefined))
  )
    throw new Error("unsupported-uri");
  if (
    !parts[1] &&
    parts[2] === undefined &&
    parts[3].split("/")[0].includes(":")
  )
    throw new Error("unsupported-uri");
  if (
    parts[2] !== undefined &&
    (!parts[2] ||
      parts[2].includes("@") ||
      !/^[A-Za-z0-9.:[\]%-]+$/.test(parts[2]))
  )
    throw new Error("unsupported-uri");
  if (
    !/^[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(parts[3]) ||
    [parts[4], parts[5]].some(
      (part) =>
        part !== undefined && !/^[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*$/.test(part),
    )
  )
    throw new Error("unsupported-uri");
  let result;
  try {
    result = new URL(value, base);
  } catch {
    throw new Error("unsupported-uri");
  }
  if (
    !["http:", "https:"].includes(result.protocol) ||
    result.username ||
    result.password
  )
    throw new Error("unsupported-uri");
  return result.href;
}
function fieldLinks(text, budget) {
  let offset = 0;
  const links = [];
  const fail = () => {
    throw new Error("malformed-link-field");
  };
  const ws = () => {
    while (text[offset] === " " || text[offset] === "\t") offset++;
  };
  const readToken = () => {
    const match = token.exec(text.slice(offset));
    if (!match) fail();
    offset += match[0].length;
    return match[0];
  };
  function quoted() {
    offset++;
    let result = "";
    while (offset < text.length) {
      const char = text[offset++];
      if (char === '"') return result;
      if (char === "\\") {
        if (offset >= text.length) fail();
        result += text[offset++];
      } else result += char;
    }
    fail();
  }
  ws();
  while (offset < text.length) {
    if (text[offset] === ",") {
      offset++;
      ws();
      continue;
    }
    if (++budget.count > 100) throw new Error("link-budget-exceeded");
    if (text[offset++] !== "<") fail();
    const end = text.indexOf(">", offset);
    if (end < 0) fail();
    const target = text.slice(offset, end);
    offset = end + 1;
    const params = new Map();
    let duplicate = false;
    ws();
    while (text[offset] === ";") {
      offset++;
      ws();
      const name = readToken().toLowerCase();
      ws();
      let value = null;
      if (text[offset] === "=") {
        offset++;
        ws();
        value = text[offset] === '"' ? quoted() : readToken();
        ws();
      }
      if (params.has(name)) duplicate = true;
      else params.set(name, value);
    }
    if (offset < text.length && text[offset] !== ",") fail();
    links.push({ target, params, duplicate });
  }
  return links;
}
/** Conservative canonical projection, not a general-purpose Link application. */
export function parseCanonicalLinkHeaders(values, responseUrl) {
  if (
    !Array.isArray(values) ||
    values.length > 100 ||
    values.some((value) => typeof value !== "string") ||
    values.reduce((sum, value) => sum + Buffer.byteLength(value), 0) > 65536
  )
    throw new Error("Invalid Link header input");
  let base;
  try {
    if (
      typeof responseUrl !== "string" ||
      !/^https?:\/\//i.test(responseUrl) ||
      responseUrl.includes("#")
    )
      throw new Error();
    base = resolveReference(responseUrl);
  } catch {
    throw new Error("Invalid response URL");
  }
  const targets = [],
    pending = [],
    budget = { count: 0 };
  for (const [fieldIndex, text] of values.entries()) {
    if (
      [...text].some((char) => {
        const code = char.charCodeAt(0);
        return (code < 32 && code !== 9) || code === 127 || code > 255;
      })
    ) {
      pending.push({ fieldIndex, reason: "invalid-header-characters" });
      continue;
    }
    let links;
    try {
      links = fieldLinks(text, budget);
    } catch (error) {
      pending.push({ fieldIndex, reason: error.message });
      continue;
    }
    for (const link of links) {
      const issue = (reason) => pending.push({ fieldIndex, reason });
      if (link.duplicate) {
        issue("duplicate-parameter");
        continue;
      }
      const rel = link.params.get("rel");
      if (
        typeof rel !== "string" ||
        !rel ||
        !rel.split(/ +/).every((item) => /^[A-Za-z][A-Za-z0-9.-]*$/.test(item))
      ) {
        issue("unsupported-relation");
        continue;
      }
      if (!rel.split(/ +/).some((item) => item.toLowerCase() === "canonical"))
        continue;
      if (
        [...link.params.keys()].some((name) => !["rel", "title"].includes(name))
      ) {
        issue("unsupported-canonical-parameter");
        continue;
      }
      if (link.params.has("title") && link.params.get("title") === null) {
        issue("invalid-title-parameter");
        continue;
      }
      try {
        targets.push(resolveReference(link.target, base));
      } catch {
        issue("unsupported-canonical-target");
      }
    }
  }
  return {
    complete: pending.length === 0,
    targets: [...new Set(targets)],
    pending,
  };
}
