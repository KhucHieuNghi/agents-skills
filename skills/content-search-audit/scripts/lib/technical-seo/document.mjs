/** Run only in a host-owned browser evaluation; source parsing needs a network-denied blank context. */
export function projectCanonicalDocument({ sourceHtml, responseUrl }) {
  const pending = [];
  const empty = (reason) => ({
    complete: false,
    targets: [],
    pending: [reason],
    documentUrl: null,
    baseUrl: null,
    html: null,
    observedAt: new Date().toISOString(),
  });
  if (
    (sourceHtml !== null && typeof sourceHtml !== "string") ||
    typeof responseUrl !== "string"
  )
    return empty("invalid-document-input");
  if (sourceHtml !== null && sourceHtml.length > 4 * 1024 * 1024)
    return empty("document-size-limit");
  function url(value, base, fragment = true) {
    if (
      typeof value !== "string" ||
      value.length > 8192 ||
      [...value].some(
        (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === "\\",
      )
    )
      throw new Error();
    const parsed = new globalThis.URL(value, base);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      (!fragment && parsed.hash)
    )
      throw new Error();
    return parsed.href;
  }
  let reference, doc;
  try {
    reference = url(responseUrl, undefined, false);
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
  let baseUrl = reference;
  try {
    if (sourceHtml === null) baseUrl = url(doc.baseURI, undefined);
    else {
      const base = [...doc.querySelectorAll("base[href]")].find(
        (node) => node.namespaceURI === "http://www.w3.org/1999/xhtml",
      );
      if (base) baseUrl = url(base.getAttribute("href"), reference);
    }
  } catch {
    return { ...empty("unsupported-document-base"), documentUrl };
  }
  if (!doc.head) return { ...empty("missing-head"), documentUrl, baseUrl };
  const html = doc.documentElement.outerHTML;
  if (html.length > 4 * 1024 * 1024)
    return { ...empty("document-size-limit"), documentUrl, baseUrl };
  if (sourceHtml !== null && doc.querySelector("noscript"))
    return {
      complete: false,
      targets: [],
      pending: ["source-scripting-mode-ambiguous"],
      documentUrl,
      baseUrl,
      html,
      observedAt: new Date().toISOString(),
    };
  const candidates = doc.head.querySelectorAll("link");
  if (candidates.length > 1000)
    return { ...empty("head-link-limit"), documentUrl, baseUrl };
  const targets = [];
  for (const node of candidates) {
    if (node.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
    const rel = (node.getAttribute("rel") ?? "")
      .split(/[ \t\r\n\f]+/)
      .map((x) => x.toLowerCase());
    if (!rel.includes("canonical")) continue;
    if (
      ["hreflang", "lang", "media", "type"].some((name) =>
        node.hasAttribute(name),
      )
    ) {
      pending.push("unsupported-canonical-modifier");
      continue;
    }
    if (!node.hasAttribute("href")) {
      pending.push("missing-canonical-href");
      continue;
    }
    try {
      targets.push(
        url(
          node.getAttribute("href").replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, ""),
          baseUrl,
        ),
      );
    } catch {
      pending.push("unsupported-canonical-target");
    }
    if (targets.length > 100)
      return { ...empty("canonical-target-limit"), documentUrl, baseUrl };
  }
  return {
    complete: pending.length === 0,
    targets: [...new Set(targets)],
    pending: [...new Set(pending)],
    documentUrl,
    baseUrl,
    html,
    observedAt: new Date().toISOString(),
  };
}
