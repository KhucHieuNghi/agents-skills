/** Full-document inline JSON-LD projection. Source parsing must run in a network-denied host-owned blank context. */
export function projectJsonLdDocument({ sourceHtml, responseUrl }) {
  const empty = (reason) => ({
    complete: false,
    blocks: [],
    otherFormatsObserved: [],
    pending: [reason],
    documentUrl: null,
    baseUrl: null,
    html: null,
    observedAt: new Date().toISOString(),
  });
  if (
    (sourceHtml !== null && typeof sourceHtml !== "string") ||
    typeof responseUrl !== "string" ||
    responseUrl.length > 8192
  )
    return empty("invalid-document-input");
  if (sourceHtml !== null && sourceHtml.length > 4 * 1024 * 1024)
    return empty("document-size-limit");
  let doc, reference;
  try {
    const target = new globalThis.URL(responseUrl);
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password ||
      target.hash
    )
      return empty("invalid-response-url");
    reference = target.href;
    doc =
      sourceHtml === null
        ? globalThis.document
        : new globalThis.DOMParser().parseFromString(sourceHtml, "text/html");
  } catch {
    return empty("document-parse-unavailable");
  }
  const documentUrl = sourceHtml === null ? doc.URL : reference;
  if (sourceHtml === null && documentUrl !== reference)
    return { ...empty("rendered-url-mismatch"), documentUrl };
  const html = doc.documentElement?.outerHTML;
  if (typeof html !== "string" || html.length > 4 * 1024 * 1024)
    return { ...empty("document-size-limit"), documentUrl };
  if (sourceHtml !== null && doc.querySelector("noscript"))
    return { ...empty("source-scripting-mode-ambiguous"), documentUrl, html };
  // Source DOMParser uses the host blank document URL: resolve its first HTML base ourselves.
  let baseUrl = null;
  try {
    const base = [...doc.querySelectorAll("base[href]")].find(
      (node) => node.namespaceURI === "http://www.w3.org/1999/xhtml",
    );
    const value =
      sourceHtml === null
        ? doc.baseURI
        : base
          ? base.getAttribute("href")
          : reference;
    if (
      typeof value !== "string" ||
      value.length > 8192 ||
      [...value].some(
        (char) =>
          char.charCodeAt(0) <= 32 ||
          char.charCodeAt(0) === 127 ||
          char === "\\",
      )
    )
      throw new Error();
    const parsed = new globalThis.URL(value, reference);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    )
      throw new Error();
    baseUrl = parsed.href;
  } catch {
    /* Unsupported base does not invalidate observed JSON syntax. */
  }
  const nodes = doc.querySelectorAll("script"),
    blocks = [],
    pending = [];
  if (nodes.length > 1000)
    return { ...empty("script-count-limit"), documentUrl };
  let bytes = 0;
  for (const node of nodes) {
    if (node.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
    const type = (node.getAttribute("type") ?? "")
      .replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "")
      .toLowerCase();
    const essence = type.split(";", 1)[0].replace(/[ \t\r\n]+$/g, "");
    if (type !== "application/ld+json") {
      if (essence === "application/ld+json")
        pending.push("unsupported-jsonld-media-parameters");
      continue;
    }
    if (node.hasAttribute("src")) {
      pending.push("external-jsonld-script-not-inspected");
      continue;
    }
    const text = node.textContent ?? "";
    const size = new globalThis.TextEncoder().encode(text).length;
    bytes += size;
    if (size > 256 * 1024 || bytes > 1024 * 1024)
      return { ...empty("jsonld-byte-limit"), documentUrl };
    blocks.push({ id: `jsonld-${blocks.length}`, text });
    if (blocks.length > 50)
      return { ...empty("jsonld-block-limit"), documentUrl };
  }
  const otherFormatsObserved = [];
  if (doc.querySelector("[itemscope]"))
    otherFormatsObserved.push("microdata-marker");
  if (doc.querySelector("[typeof], [vocab]"))
    otherFormatsObserved.push("rdfa-marker");
  return {
    complete: pending.length === 0,
    blocks,
    pending: [...new Set(pending)],
    otherFormatsObserved,
    documentUrl,
    baseUrl,
    html,
    observedAt: new Date().toISOString(),
  };
}
