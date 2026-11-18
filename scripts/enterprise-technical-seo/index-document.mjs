/** Full-document robots meta projection. Source parsing must run in a network-denied host-owned blank context. */
export function projectIndexDocument({ sourceHtml, responseUrl }) {
  const empty = (reason) => ({
    complete: false,
    meta: [],
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
  const nodes = doc.querySelectorAll("meta"),
    meta = [],
    pending = [];
  if (nodes.length > 1000) return { ...empty("meta-count-limit"), documentUrl };
  for (const node of nodes) {
    if (node.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
    const name = (node.getAttribute("name") ?? "").toLowerCase();
    if (!["robots", "googlebot"].includes(name)) continue;
    const content = node.getAttribute("content");
    if (content === null) {
      pending.push("missing-robots-content");
      continue;
    }
    if (content.length > 8192)
      return { ...empty("directive-size-limit"), documentUrl };
    meta.push({ name, content });
    if (meta.length > 100)
      return { ...empty("robots-meta-limit"), documentUrl };
  }
  return {
    complete: pending.length === 0,
    meta,
    pending: [...new Set(pending)],
    documentUrl,
    html,
    observedAt: new Date().toISOString(),
  };
}
