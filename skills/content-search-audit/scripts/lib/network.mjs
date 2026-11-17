import { Buffer } from "node:buffer";
import { lookup as systemLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { setTimeout, clearTimeout } from "node:timers";
import { URL } from "node:url";
import {
  abortable,
  abortReason,
  checkAbort,
  createDeadline,
} from "./cancellation.mjs";
const policyError = (message) =>
  Object.assign(new Error(message), { code: "NETWORK_POLICY" });
const ipv4Denied = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
];
const ipv6Denied = [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["2620:4f:8000::", 48],
  ["3fff::", 20],
];
function ipv4Number(ip) {
  return ip
    .split(".")
    .reduce((number, part) => (number << 8n) + BigInt(part), 0n);
}
function ipv6Number(ip) {
  if (ip.includes(".")) {
    const index = ip.lastIndexOf(":");
    const v4 = ipv4Number(ip.slice(index + 1));
    ip =
      ip.slice(0, index + 1) +
      (v4 >> 16n).toString(16) +
      ":" +
      (v4 & 65535n).toString(16);
  }
  const [left, right] = ip.split("::");
  const a = left ? left.split(":") : [],
    b = right ? right.split(":") : [];
  const parts =
    right === undefined
      ? a
      : [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  return parts.reduce(
    (number, part) => (number << 16n) + BigInt(`0x${part}`),
    0n,
  );
}
const inPrefix = (number, base, bits, total) =>
  number >> BigInt(total - bits) === base >> BigInt(total - bits);
/** Conservative public-web policy, not a general IP routability classifier. */
export function isPublicAddress(address) {
  if (typeof address !== "string" || address.includes("%")) return false;
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4Number(address);
    return !ipv4Denied.some(([base, bits]) =>
      inPrefix(value, ipv4Number(base), bits, 32),
    );
  }
  if (family === 6) {
    const value = ipv6Number(address);
    return (
      inPrefix(value, ipv6Number("2000::"), 3, 128) &&
      !ipv6Denied.some(([base, bits]) =>
        inPrefix(value, ipv6Number(base), bits, 128),
      )
    );
  }
  return false;
}
function ambiguous(value) {
  return (
    value.includes("\\") ||
    /\s/u.test(value) ||
    [...value].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  );
}
function parseURL(value) {
  if (
    typeof value !== "string" ||
    !/^https?:\/\//i.test(value) ||
    ambiguous(value)
  )
    throw policyError("Invalid public URL");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hostname.endsWith(".")
  )
    throw policyError("Unsupported or credential-bearing public URL");
  url.hash = "";
  return url;
}
export function validateNetworkPolicy(policy) {
  if (
    !policy ||
    !Array.isArray(policy.allowedOrigins) ||
    !policy.allowedOrigins.length
  )
    throw new Error("Explicit allowed origins required");
  const allowedOrigins = new Set(
    policy.allowedOrigins.map((value) => {
      const url = parseURL(value);
      if (url.pathname !== "/" || url.search || value.includes("#"))
        throw new Error("Allowlist must contain origins only");
      return url.origin;
    }),
  );
  const maxBytes = policy.maxBytes ?? 10 * 1024 * 1024,
    timeoutMs = policy.timeoutMs ?? 20000,
    maxRedirects = policy.maxRedirects ?? 5;
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 100 * 1024 * 1024 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 120000 ||
    !Number.isSafeInteger(maxRedirects) ||
    maxRedirects < 0 ||
    maxRedirects > 10
  )
    throw new Error("Invalid network limits");
  return { allowedOrigins, maxBytes, timeoutMs, maxRedirects };
}
async function timed(operation, ms, signal) {
  let timer;
  try {
    return await abortable(
      () =>
        Promise.race([
          operation,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("DNS timeout")), ms);
          }),
        ]),
      signal,
    );
  } finally {
    clearTimeout(timer);
  }
}
/** Re-run for every redirect. The returned address must be pinned by the transport. */
export async function resolvePublicTarget(value, policy, adapters = {}) {
  checkAbort(adapters.signal);
  const settings = validateNetworkPolicy(policy),
    url = parseURL(value);
  if (!settings.allowedOrigins.has(url.origin))
    throw policyError("Destination origin is not authorized");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(hostname);
  const records = literal
    ? [{ address: hostname, family: literal }]
    : await timed(
        (adapters.lookup ?? systemLookup)(hostname, {
          all: true,
          verbatim: true,
        }),
        settings.timeoutMs,
        adapters.signal,
      );
  if (!Array.isArray(records) || !records.length || records.length > 64)
    throw new Error("Invalid DNS answer");
  if (
    records.some(
      (record) =>
        !record ||
        ![4, 6].includes(record.family) ||
        isIP(record.address) !== record.family ||
        !isPublicAddress(record.address),
    )
  )
    throw policyError(
      "DNS or literal destination contains a nonpublic address",
    );
  return {
    url,
    hostname,
    address: records[0].address,
    family: records[0].family,
  };
}
const headerNames = [
  "content-type",
  "content-length",
  "content-encoding",
  "x-robots-tag",
  "link",
  "last-modified",
  "etag",
  "cache-control",
  "retry-after",
];
function requestOne(target, settings, request, signal) {
  return new Promise((resolve, reject) => {
    let done = false,
      timer,
      response,
      req,
      abort = () => {};
    function finish(error, result) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(result);
    }
    const options = {
      method: "GET",
      agent: false,
      rejectUnauthorized: true,
      maxHeaderSize: 32768,
      headers: {
        "user-agent": "NKSkillsContentAudit/0.1",
        accept:
          "text/html,application/xhtml+xml,application/xml,text/plain,*/*;q=0.1",
        "accept-encoding": "identity",
      },
      lookup: (_hostname, options, callback) =>
        options?.all
          ? callback(null, [{ address: target.address, family: target.family }])
          : callback(null, target.address, target.family),
    };
    checkAbort(signal);
    req = request(target.url, options, (incoming) => {
      if (done) {
        incoming.destroy();
        return;
      }
      response = incoming;
      const status = incoming.statusCode;
      if (!Number.isInteger(status) || status < 100 || status > 599) {
        finish(new Error("Invalid HTTP status"));
        incoming.destroy();
        return;
      }
      const headers = Object.fromEntries(
        headerNames
          .filter((name) => typeof incoming.headers[name] === "string")
          .map((name) => [name, incoming.headers[name]]),
      );
      if (
        [301, 302, 303, 307, 308].includes(status) &&
        typeof incoming.headers.location === "string"
      ) {
        finish(null, {
          status,
          headers,
          location: incoming.headers.location,
          body: Buffer.alloc(0),
        });
        incoming.destroy();
        return;
      }
      let length = 0;
      const chunks = [];
      incoming.on("data", (chunk) => {
        length += chunk.length;
        if (length > settings.maxBytes) {
          finish(new Error("Response size limit exceeded"));
          incoming.destroy();
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      incoming.on("end", () =>
        finish(null, { status, headers, body: Buffer.concat(chunks) }),
      );
      incoming.on("error", () => finish(new Error("Response stream failed")));
      incoming.on("aborted", () =>
        finish(new Error("Response stream aborted")),
      );
    });
    req.on("error", (error) => finish(error));
    abort = () => {
      finish(abortReason(signal));
      response?.destroy();
      req.destroy();
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    timer = setTimeout(() => {
      finish(new Error("Request timeout"));
      response?.destroy();
      req.destroy();
    }, settings.timeoutMs);
    req.end();
  });
}
/** Internal transport only: caller must enforce robots, scheduling, retries and content policy. */
export async function requestPublic(value, policy, adapters = {}) {
  const settings = validateNetworkPolicy(policy),
    deadline = Date.now() + settings.timeoutMs,
    redirects = [];
  const cancellation = createDeadline(
    settings.timeoutMs,
    adapters.signal,
    "Request timeout",
  );
  const signal = cancellation.signal;
  let current = value;
  try {
    for (let hop = 0; ; hop++) {
      let remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("Request timeout");
      const target = await resolvePublicTarget(
        current,
        { ...policy, timeoutMs: remaining },
        { ...adapters, signal },
      );
      await abortable(
        () => adapters.beforeRequest?.(target.url, signal),
        signal,
      );
      const perform = async () => {
        checkAbort(signal);
        remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("Request timeout");
        return requestOne(
          target,
          { ...settings, timeoutMs: remaining },
          adapters.request ??
            (target.url.protocol === "https:" ? httpsRequest : httpRequest),
          signal,
        );
      };
      const response = adapters.aroundRequest
        ? await abortable(
            () => adapters.aroundRequest(target.url, perform, signal),
            signal,
          )
        : await perform();
      if (!response.location)
        return { ...response, url: target.url.href, redirects };
      if (hop >= settings.maxRedirects)
        throw new Error("Redirect limit exceeded");
      // Reject parser ambiguity before resolving a relative redirect against the current URL.
      if (ambiguous(response.location))
        throw new Error("Invalid redirect location");
      const next = new URL(response.location, target.url).href;
      redirects.push({ url: target.url.href, status: response.status });
      current = next;
    }
  } catch (error) {
    error.redirects = redirects;
    throw error;
  } finally {
    cancellation.dispose();
  }
}
