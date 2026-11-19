import { parentPort, workerData } from "node:worker_threads";
import { Buffer } from "node:buffer";
import jsonld from "jsonld";
import jsonldPackage from "jsonld/package.json" with { type: "json" };
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
// Compare decimal values, not spelling (1.00 and 1e0 are equivalent).
// This protects round-trip decimal fidelity; it does not implement decimal arithmetic.
function decimal(token) {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!m) throw new Error("Unsupported numeric token");
  let digits = (m[2] + (m[3] ?? "")).replace(/^0+/, "");
  if (!digits) return "0";
  // Extreme exponents cannot represent a supported finite nonzero value here.
  if ((m[4] ?? "").length > 6) throw new Error("Numeric exponent budget");
  let exponent = Number(m[4] ?? 0) - (m[3] ?? "").length;
  const suffix = /0+$/.exec(digits)?.[0].length ?? 0;
  if (suffix) {
    digits = digits.slice(0, -suffix);
    exponent += suffix;
  }
  return `${m[1]}${digits}e${exponent}`;
}
function read(text) {
  parseCaptureJson(text); // Duplicate members, depth and node budgets still apply.
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value === "number") {
      if (
        !Number.isFinite(value) ||
        (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
        typeof context?.source !== "string" ||
        decimal(context.source) !== decimal(String(value))
      )
        throw new Error("Unsupported or lossy numeric token");
    }
    return value;
  });
}
let missing = false;
try {
  if (jsonldPackage.version !== "9.0.0")
    throw new Error("Unreviewed processor version");
  const doc = read(workerData.documentText);
  // Strings would be interpreted by the processor as URLs rather than supplied document bytes.
  if (!doc || typeof doc !== "object")
    throw new Error("Unsupported document root");
  const contexts = new Map(
    workerData.contexts.map((c) => [c.url, read(c.documentText)]),
  );
  const documentLoader = async (requestedUrl) => {
    if (!contexts.has(requestedUrl)) {
      missing = true;
      throw new Error("Offline context unavailable");
    }
    return {
      contextUrl: null,
      documentUrl: requestedUrl,
      document: globalThis.structuredClone(contexts.get(requestedUrl)),
    };
  };
  const graph = await jsonld.flatten(doc, null, {
    base: workerData.baseUrl,
    processingMode: "json-ld-1.1",
    safe: true,
    documentLoader,
  });
  if (Buffer.byteLength(JSON.stringify(graph)) > 2 * 1024 * 1024)
    parentPort.postMessage({
      status: "unknown",
      reason: "expansion-output-budget",
      graph: null,
    });
  else
    parentPort.postMessage({
      status: "expanded",
      reason: "offline-graph-produced",
      graph,
    });
} catch {
  parentPort.postMessage({
    status: "unknown",
    reason: missing
      ? "offline-context-unavailable"
      : "unsupported-or-lossy-jsonld",
    graph: null,
  });
}
