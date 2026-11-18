import { Worker } from "node:worker_threads";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";
const hash = (text) => createHash("sha256").update(text).digest("hex");
const exact = (x, keys) =>
  x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.keys(x).sort().join(",") === [...keys].sort().join(",");
function url(value) {
  if (
    typeof value !== "string" ||
    value.length > 8192 ||
    !/^https?:\/\//.test(value) ||
    /[\s\\]/.test(value)
  )
    throw new Error("Invalid expansion URL");
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new Error("Invalid expansion URL");
  }
  if (u.username || u.password || u.hash || u.href !== value)
    throw new Error("Invalid expansion URL");
  return value;
}
export function validateOfflineContexts(contexts) {
  if (!Array.isArray(contexts) || contexts.length > 16)
    throw new Error("Invalid offline context count");
  let bytes = 0;
  const seen = new Set();
  for (const c of contexts) {
    if (
      !exact(c, ["url", "documentText", "sha256"]) ||
      typeof c.documentText !== "string" ||
      Buffer.byteLength(c.documentText) > 128 * 1024 ||
      typeof c.sha256 !== "string" ||
      c.sha256 !== hash(c.documentText)
    )
      throw new Error("Invalid offline context bytes or hash");
    url(c.url);
    if (seen.has(c.url)) throw new Error("Duplicate offline context URL");
    seen.add(c.url);
    bytes += Buffer.byteLength(c.documentText);
  }
  if (bytes > 1024 * 1024) throw new Error("Offline context aggregate budget");
}
/** Offline private graph construction only; neither evidence authenticity nor schema validity. */
export async function expandJsonLdOffline(input) {
  if (
    !exact(input, ["documentText", "baseUrl", "contexts", "timeoutMs"]) ||
    typeof input.documentText !== "string" ||
    Buffer.byteLength(input.documentText) > 256 * 1024 ||
    !Array.isArray(input.contexts) ||
    input.contexts.length > 16 ||
    !Number.isSafeInteger(input.timeoutMs) ||
    input.timeoutMs < 1 ||
    input.timeoutMs > 5000
  )
    throw new Error("Invalid expansion input or budget");
  url(input.baseUrl);
  validateOfflineContexts(input.contexts);
  const provenance = {
    processor: "jsonld",
    processorVersion: "9.0.0",
    processingMode: "json-ld-1.1",
    safe: true,
    numericPolicy: "decimal-roundtrip-safe-integers-v1",
    documentHash: hash(input.documentText),
    baseUrlHash: hash(input.baseUrl),
    operation: "flatten",
    contextDigests: input.contexts.map((c) => ({
      urlHash: hash(c.url),
      sha256: c.sha256,
    })),
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
  const inputDigest = hash(JSON.stringify(provenance));
  return new Promise((resolve) => {
    let done = false,
      timer;
    const worker = new Worker(
      new URL("./jsonld-expansion-worker.mjs", import.meta.url),
      {
        workerData: {
          documentText: input.documentText,
          baseUrl: input.baseUrl,
          contexts: input.contexts,
        },
        execArgv: [],
        resourceLimits: {
          maxOldGenerationSizeMb: 64,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
      },
    );
    const finish = async (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      await worker.terminate().catch(() => {});
      resolve({
        ...provenance,
        inputDigest,
        ...result,
        graphHash:
          result.graph === null ? null : hash(JSON.stringify(result.graph)),
      });
    };
    timer = setTimeout(() => {
      void finish({
        status: "unknown",
        reason: "expansion-deadline",
        graph: null,
      });
    }, input.timeoutMs);
    worker.on("message", (message) => {
      void finish(message);
    });
    worker.on("error", () => {
      void finish({
        status: "unknown",
        reason: "expansion-worker-unavailable",
        graph: null,
      });
    });
    worker.on("exit", () => {
      void finish({
        status: "unknown",
        reason: "expansion-worker-exited",
        graph: null,
      });
    });
  });
}
