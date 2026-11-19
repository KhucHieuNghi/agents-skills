import { performance } from "node:perf_hooks";
import { Buffer } from "node:buffer";
import { evaluateStructuredData } from "../../skills/content-search-audit/scripts/lib/technical-seo/structured-data.mjs";
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
import {
  expandJsonLdOffline,
  validateOfflineContexts,
} from "./jsonld-expansion.mjs";

/** Private, scoped graph evidence; never a schema-validity or provider-eligibility verdict. */
export async function expandStructuredDataCapture(context, source, options) {
  if (
    !options ||
    Object.keys(options).sort().join(",") !== "contexts,totalTimeoutMs" ||
    !Array.isArray(options.contexts) ||
    !Number.isSafeInteger(options.totalTimeoutMs) ||
    options.totalTimeoutMs < 1 ||
    options.totalTimeoutMs > 10000
  )
    throw new Error("Invalid scoped expansion options");
  // Snapshot before awaiting workers: callers cannot mutate later block bytes or contexts.
  validateOfflineContexts(options.contexts);
  const contexts = globalThis.structuredClone(options.contexts);
  const evaluated = evaluateStructuredData(context, source);
  const raw = parseCaptureJson(source.artifactText);
  const result = {
    scope: evaluated.scope,
    method: evaluated.method,
    sourceId: evaluated.sourceId,
    artifactHash: evaluated.artifactHash,
    capturedAt: evaluated.capturedAt,
    validUntil: evaluated.validUntil,
    baseUrl: evaluated.baseUrl,
    baseBasis:
      evaluated.method === "html-source"
        ? "static-source-first-html-base"
        : "rendered-document-base-uri",
    status: "unknown",
    reason: "insufficient-expansion-evidence",
    blocks: [],
    executionAuthenticated: false,
    semanticAcceptance: false,
    limitations: [
      "Private graphs may contain sensitive values; do not render them directly",
      "Source base is static inference, not CSP- or script-adjusted rendered page behavior",
      "Timeout bounds worker processing; validation and worker termination add wall-clock overhead",
      "Blocks are processed separately; no cross-script or cross-method merging",
      "Supplied context hashes bind bytes but do not authenticate acquisition",
      "Expansion is not schema validity, visible-content accuracy or rich-result eligibility",
    ],
  };
  if (
    new Date(context.assessmentAt).getTime() >=
    new Date(evaluated.validUntil).getTime()
  )
    return { ...result, reason: "expired-structured-data-capture" };
  if (evaluated.baseUrl === null)
    return { ...result, reason: "document-base-evidence-unavailable" };
  if (!raw.projection.blocks.length)
    return { ...result, reason: "no-jsonld-blocks-observed" };
  const deadline = performance.now() + options.totalTimeoutMs;
  let bytes = 0;
  for (const [index, block] of raw.projection.blocks.entries()) {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining < 1)
      return { ...result, reason: "capture-expansion-deadline" };
    const expansion = await expandJsonLdOffline({
      documentText: block.text,
      baseUrl: evaluated.baseUrl,
      contexts,
      timeoutMs: Math.min(remaining, 5000),
    });
    bytes += Buffer.byteLength(JSON.stringify(expansion));
    if (bytes > 4 * 1024 * 1024)
      return {
        ...result,
        reason: "capture-expansion-output-budget",
        blocks: [],
      };
    result.blocks.push({
      blockId: block.id,
      locator: `projection.blocks[${index}].text`,
      expansion,
    });
  }
  const complete =
    raw.projection.complete &&
    result.blocks.every((b) => b.expansion.status === "expanded");
  return {
    ...result,
    status: complete ? "expanded" : "unknown",
    reason: complete
      ? "scoped-offline-graphs-produced"
      : "partial-or-unsupported-expansion",
  };
}
