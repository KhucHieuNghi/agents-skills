import { parentPort, workerData } from "node:worker_threads";
import { Buffer } from "node:buffer";
import jsonld from "jsonld";
import jsonldPackage from "jsonld/package.json" with { type: "json" };
import { parseCaptureJson } from "./strict-json.mjs";
function read(text) {
  const value = parseCaptureJson(text);
  function visit(v) {
    if (typeof v === "number" && !Number.isFinite(v))
      throw new Error("Non-finite number");
    if (v && typeof v === "object") for (const x of Object.values(v)) visit(x);
  }
  visit(value);
  return value;
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
