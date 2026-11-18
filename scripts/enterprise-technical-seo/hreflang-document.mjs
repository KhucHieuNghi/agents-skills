/** Head-only hreflang projection. Source parsing must run in a network-denied host-owned blank context. */
export function projectHreflangDocument({ sourceHtml, responseUrl }) {
  const empty = (reason) => ({
    complete: false,
    alternates: [],
    pending: [reason],
    documentUrl: null,
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
  if (!doc.head) return { ...empty("missing-head"), documentUrl };
  const nodes = doc.querySelectorAll("link"),
    alternates = [],
    pending = [];
  if (nodes.length > 1000) return { ...empty("link-count-limit"), documentUrl };
  for (const node of nodes) {
    if (node.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
    const rel = (node.getAttribute("rel") ?? "")
      .toLowerCase()
      .split(/[ \t\r\n\f]+/)
      .filter(Boolean);
    if (!rel.includes("alternate") || !node.hasAttribute("hreflang")) continue;
    if (!doc.head.contains(node)) {
      pending.push("hreflang-outside-head");
      continue;
    }
    if (
      rel.some((token) => token !== "alternate") ||
      ["media", "type"].some((name) => node.hasAttribute(name))
    ) {
      pending.push("unsupported-hreflang-modifier");
      continue;
    }
    const language = node.getAttribute("hreflang"),
      href = node.getAttribute("href");
    if (language.length > 64) {
      pending.push("language-label-limit");
      continue;
    }
    // Hreflang requires fully qualified URLs: do not repair relative URLs using baseURI.
    if (
      typeof href !== "string" ||
      href.length > 8192 ||
      !/^https?:\/\//i.test(href) ||
      [...href].some(
        (c) =>
          c.charCodeAt(0) <= 32 ||
          c.charCodeAt(0) === 127 ||
          c === "\\" ||
          c === "#",
      )
    ) {
      pending.push("unsupported-hreflang-target");
      continue;
    }
    let target;
    try {
      target = new globalThis.URL(href);
    } catch {
      pending.push("unsupported-hreflang-target");
      continue;
    }
    if (target.username || target.password) {
      pending.push("unsupported-hreflang-target");
      continue;
    }
    alternates.push({ language, targetUrl: target.href });
    if (alternates.length > 100)
      return { ...empty("alternate-count-limit"), documentUrl };
  }
  return {
    complete: pending.length === 0,
    alternates,
    pending: [...new Set(pending)],
    documentUrl,
    html,
    observedAt: new Date().toISOString(),
  };
}
