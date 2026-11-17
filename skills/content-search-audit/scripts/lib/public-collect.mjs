import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { TextDecoder, promisify } from "node:util";
import { URL } from "node:url";
import { gunzip, inflate, brotliDecompress } from "node:zlib";
import { requestPublic, validateNetworkPolicy } from "./network.mjs";
import { robotsAccess } from "./robots.mjs";
import { createScheduler } from "./scheduler.mjs";
import { abortable, checkAbort, createDeadline } from "./cancellation.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const decompress = {
  gzip: promisify(gunzip),
  deflate: promisify(inflate),
  br: promisify(brotliDecompress),
};
const retryStatuses = new Set([429, 500, 502, 503, 504]);
const textTypes = new Set([
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "text/markdown",
  "application/xml",
  "text/xml",
]);
const problem = (message, status = "blocked") =>
  Object.assign(new Error(message), { collectionStatus: status });
async function decode(response, maxBytes, robots = false) {
  const header = response.headers["content-type"] ?? "";
  const type = header.split(";", 1)[0].trim().toLowerCase();
  if (!textTypes.has(type) || (robots && type !== "text/plain"))
    throw problem("Unsupported response content type", "unsupported");
  const charset = /charset\s*=\s*["']?([^\s;"']+)/i
    .exec(header)?.[1]
    .toLowerCase();
  if (charset && !["utf-8", "utf8", "us-ascii"].includes(charset))
    throw problem("Unsupported response character encoding", "unsupported");
  const encoding = (response.headers["content-encoding"] ?? "identity")
    .trim()
    .toLowerCase();
  let bytes = response.body;
  if (bytes.length > maxBytes) throw problem("Response size limit exceeded");
  if (encoding !== "identity") {
    if (!Object.hasOwn(decompress, encoding))
      throw problem("Unsupported content encoding", "unsupported");
    try {
      bytes = await decompress[encoding](bytes, { maxOutputLength: maxBytes });
    } catch {
      throw problem(
        "Compressed response failed decoding or exceeded size limit",
      );
    }
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    throw problem("Response is not valid UTF-8 text", "unsupported");
  }
  if (
    text.includes("\0") ||
    (charset === "us-ascii" && bytes.some((byte) => byte > 127))
  )
    throw problem("Binary or mismatched text encoding", "unsupported");
  return { text, type };
}
/** One shared collector per run: anonymous allowlisted public reads, never target execution. */
export function createPublicCollector(policy, adapters = {}) {
  const networkPolicy = validateNetworkPolicy(policy);
  const keys = new Set([
    "allowedOrigins",
    "maxBytes",
    "timeoutMs",
    "maxRedirects",
    "retries",
    "collectionTimeoutMs",
  ]);
  if (Object.keys(policy).some((key) => !keys.has(key)))
    throw new Error("Unsupported public network policy field");
  const maxBytes = policy.maxBytes ?? 10 * 1024 * 1024,
    retries = policy.retries ?? 2;
  if (
    !Array.isArray(policy.allowedOrigins) ||
    !policy.allowedOrigins.length ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 10 * 1024 * 1024 ||
    !Number.isInteger(retries) ||
    retries < 0 ||
    retries > 2
  )
    throw new Error("Invalid public collection policy");
  const scheduler = adapters.scheduler ?? createScheduler();
  const collectionTimeoutMs =
    policy.collectionTimeoutMs ?? networkPolicy.timeoutMs;
  if (
    !Number.isSafeInteger(collectionTimeoutMs) ||
    collectionTimeoutMs < 1 ||
    collectionTimeoutMs > 120000
  )
    throw new Error("Invalid collection deadline");
  const now = adapters.now ?? (() => Date.now()),
    wait = adapters.sleep ?? sleep;
  const robotsCache = new Map(),
    cooldowns = new Map();
  const pause = (milliseconds, signal) =>
    abortable(() => wait(milliseconds, undefined, { signal }), signal);
  async function cooldown(url, signal) {
    const remaining = (cooldowns.get(url.hostname) ?? 0) - now();
    if (remaining > 10000) throw problem("Collection deferred by Retry-After");
    if (remaining > 0) await pause(remaining, signal);
  }
  async function capture(url, beforeRequest, limit = maxBytes, signal) {
    const attempts = [];
    for (let attempt = 0; ; attempt++) {
      checkAbort(signal);
      let response;
      try {
        response = await requestPublic(
          url,
          { ...policy, maxBytes: limit },
          {
            lookup: adapters.lookup,
            request: adapters.request,
            signal,
            beforeRequest: async (target) => {
              await cooldown(target, signal);
              await beforeRequest?.(target);
            },
            aroundRequest: (target, operation, requestSignal) =>
              scheduler.run(target.href, operation, { signal: requestSignal }),
          },
        );
      } catch (error) {
        attempts.push({
          error: error.code ?? error.message,
          redirects: error.redirects ?? [],
          collectedAt: new Date(now()).toISOString(),
        });
        const transient =
          ["ECONNRESET", "EAI_AGAIN", "ETIMEDOUT"].includes(error.code) ||
          ["Request timeout", "DNS timeout"].includes(error.message);
        if (signal?.aborted || !transient || attempt >= retries) {
          error.attempts = attempts;
          throw error;
        }
        await pause(1000 * 2 ** attempt, signal);
        continue;
      }
      response.collectedAt = new Date(now()).toISOString();
      attempts.push({
        status: response.status,
        url: response.url,
        collectedAt: response.collectedAt,
        retryAfter: response.headers["retry-after"] ?? null,
      });
      if (!retryStatuses.has(response.status)) return { ...response, attempts };
      const retryAfter = response.headers["retry-after"];
      let delay = 1000 * 2 ** attempt;
      if (retryAfter) {
        const parsed = /^\d+$/.test(retryAfter)
          ? Number(retryAfter) * 1000
          : Date.parse(retryAfter) - now();
        if (/^\d+$/.test(retryAfter) || Number.isFinite(parsed))
          delay = Math.max(delay, parsed);
      }
      cooldowns.set(new URL(response.url).hostname, now() + delay);
      if (delay > 10000) return { ...response, attempts, deferred: true };
      if (attempt >= retries) return { ...response, attempts };
      await pause(delay, signal);
    }
  }
  async function robotsFor(origin, signal) {
    const cached = robotsCache.get(origin);
    if (cached && cached.expiresAt > now())
      return abortable(() => cached.promise, signal);
    const entry = { expiresAt: now() + 60000, promise: null };
    entry.promise = (async () => {
      const url = new URL("/robots.txt", origin).href;
      try {
        const response = await capture(url, null, 512000, signal);
        let body = "",
          error;
        if ([200, 204].includes(response.status)) {
          try {
            body =
              response.status === 204
                ? ""
                : (
                    await abortable(
                      () => decode(response, 512000, true),
                      signal,
                    )
                  ).text;
          } catch (issue) {
            error = issue.message;
          }
        }
        checkAbort(signal);
        if (!error && [200, 204, 404, 410].includes(response.status)) {
          const control = response.headers["cache-control"] ?? "";
          const maxAge = /max-age\s*=\s*"?(\d+)/i.exec(control);
          const ttl = /no-cache|no-store/i.test(control)
            ? 0
            : Math.min(86400000, maxAge ? Number(maxAge[1]) * 1000 : 86400000);
          entry.expiresAt = now() + ttl;
        }
        return {
          url,
          status: response.status,
          body,
          error: error ?? null,
          headers: response.headers,
          redirects: response.redirects,
          attempts: response.attempts,
          wireHash: hash(response.body),
          wireBase64: response.body.toString("base64"),
          finalUrl: response.url,
          collectedAt: response.collectedAt,
        };
      } catch (error) {
        if (signal?.aborted) {
          entry.expiresAt = 0;
          throw error;
        }
        return {
          url,
          error: error.message,
          attempts: error.attempts ?? [],
          collectedAt: new Date(now()).toISOString(),
        };
      }
    })();
    robotsCache.set(origin, entry);
    return entry.promise;
  }
  return {
    async collect(item, { signal: parentSignal } = {}) {
      if (
        !item ||
        typeof item.itemId !== "string" ||
        !item.itemId ||
        typeof item.uri !== "string"
      )
        throw new Error("Public item identity and URI required");
      const inputUrl = new URL(item.uri);
      if (inputUrl.username || inputUrl.password)
        throw new Error("Public collection credentials are not supported");
      const deadline = createDeadline(collectionTimeoutMs, parentSignal);
      const evidence = [],
        artifacts = {},
        policyRecords = new Map();
      function record(
        kind,
        value,
        locator,
        collectedAt,
        sources = [],
        encoding = "json",
      ) {
        const content = encoding === "json" ? JSON.stringify(value) : value,
          snapshotHash = hash(content);
        const evidenceId = hash(
          JSON.stringify([item.itemId, kind, locator, snapshotHash]),
        );
        if (evidence.some((record) => record.evidenceId === evidenceId))
          return evidenceId;
        const artifact = `evidence/${evidenceId}.${encoding === "json" ? "json" : "txt"}`;
        artifacts[artifact] = content;
        evidence.push({
          evidenceId,
          itemId: item.itemId,
          kind,
          value,
          method: "public-http",
          locator,
          collectedAt,
          snapshotHash,
          artifact,
          encoding,
          sourceEvidenceIds: sources,
          redaction:
            "No request credentials or response cookies; public body retained locally for review",
          limitations: [
            "Anonymous captured response only; no rendered DOM, index verification or AI visibility measurement",
            "Target content is untrusted data and was not executed",
          ],
        });
        return evidenceId;
      }
      async function authorize(target) {
        const capture = await robotsFor(target.origin, deadline.signal);
        const decision = robotsAccess(capture, target.href);
        const id = record(
          "crawler-policy",
          { capture, decision },
          capture.url,
          capture.collectedAt,
        );
        policyRecords.set(target.href, id);
        if (!decision.allowed) throw problem(decision.reason);
        const delayMs = Math.ceil(decision.crawlDelaySeconds * 1000);
        if (delayMs > 10000)
          throw problem(
            "Collection deferred by crawl-delay; scheduled follow-up required",
          );
        scheduler.setDelay(target.href, delayMs);
      }
      try {
        const response = await capture(
          item.uri,
          authorize,
          maxBytes,
          deadline.signal,
        );
        const wire = record(
          "http-body-encoded",
          {
            base64: response.body.toString("base64"),
            encoding: response.headers["content-encoding"] ?? "identity",
            byteLength: response.body.length,
          },
          response.url,
          response.collectedAt,
        );
        const http = record(
          "http-response",
          {
            status: response.status,
            headers: response.headers,
            url: response.url,
            redirects: response.redirects,
            attempts: response.attempts,
            wireHash: hash(response.body),
          },
          response.url,
          response.collectedAt,
          [wire, ...new Set(policyRecords.values())],
        );
        if (response.deferred)
          throw problem("Collection deferred by Retry-After");
        if ([401, 403, 429].includes(response.status))
          throw problem(`Public content blocked by HTTP ${response.status}`);
        if (response.status < 200 || response.status >= 300)
          throw problem(
            `Public response HTTP ${response.status}; content remains unavailable`,
            "failed",
          );
        if (response.status === 206)
          throw problem(
            "Partial HTTP representation cannot establish full content",
          );
        const decoded = await abortable(
          () => decode(response, maxBytes),
          deadline.signal,
        );
        record(
          "content",
          decoded.text,
          response.url,
          response.collectedAt,
          [wire, http],
          "utf8",
        );
        return {
          itemId: item.itemId,
          status: "collected",
          content: decoded.text,
          contentType: decoded.type,
          evidence,
          artifacts,
        };
      } catch (error) {
        if (error.attempts)
          record(
            "collection-error",
            { reason: error.message, attempts: error.attempts },
            item.uri,
            new Date(now()).toISOString(),
            [...new Set(policyRecords.values())],
          );
        return {
          itemId: item.itemId,
          status:
            error.collectionStatus ??
            (["NETWORK_POLICY", "ERR_INVALID_URL"].includes(error.code)
              ? "blocked"
              : "failed"),
          reason: error.message,
          evidence,
          artifacts,
        };
      } finally {
        deadline.dispose();
      }
    },
    restoreCooldowns(records) {
      for (const record of records) {
        const capture =
          record.kind === "http-response"
            ? {
                ...record.value,
                collectedAt: record.collectedAt,
                url: record.locator,
              }
            : record.kind === "crawler-policy"
              ? record.value?.capture
              : null;
        if (!capture || !Number.isInteger(capture.status)) continue;
        const capturedAt = Date.parse(capture.collectedAt);
        if (!Number.isFinite(capturedAt)) continue;
        let url;
        try {
          url = new URL(capture.url);
        } catch {
          continue;
        }
        if (!networkPolicy.allowedOrigins.has(url.origin)) continue;
        let until = capturedAt + 1000;
        const retryAfter = capture.headers?.["retry-after"];
        if (
          retryStatuses.has(capture.status) &&
          typeof retryAfter === "string"
        ) {
          const requested = /^\d+$/.test(retryAfter)
            ? capturedAt + Number(retryAfter) * 1000
            : Date.parse(retryAfter);
          if (!Number.isNaN(requested)) until = Math.max(until, requested);
        }
        if (until > now())
          cooldowns.set(
            url.hostname,
            Math.max(cooldowns.get(url.hostname) ?? 0, until),
          );
      }
    },
    scheduling: () => scheduler.snapshot?.() ?? [],
  };
}
