/* global AbortSignal, Response */
import { Buffer } from "node:buffer";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { URL } from "node:url";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export class UnsafeBrandDestinationError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafeBrandDestinationError";
  }
}

function privateAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (version === 6) {
    let value = address.toLowerCase();
    if (value.includes(".")) {
      const tail = value
        .slice(value.lastIndexOf(":") + 1)
        .split(".")
        .map(Number);
      value = `${value.slice(0, value.lastIndexOf(":"))}:${((tail[0] << 8) | tail[1]).toString(16)}:${((tail[2] << 8) | tail[3]).toString(16)}`;
    }
    const [left, right] = value.split("::");
    const before = left
      ? left.split(":").map((part) => Number.parseInt(part, 16))
      : [];
    const after = right
      ? right.split(":").map((part) => Number.parseInt(part, 16))
      : [];
    const words =
      right === undefined
        ? before
        : [
            ...before,
            ...Array(8 - before.length - after.length).fill(0),
            ...after,
          ];
    if (words.length !== 8) return true;
    if (words.slice(0, 5).every((part) => part === 0) && words[5] === 0xffff) {
      const embedded = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
      return privateAddress(embedded);
    }
    return (
      words.slice(0, 6).every((part) => part === 0) ||
      (words[0] & 0xfe00) === 0xfc00 ||
      (words[0] & 0xffc0) === 0xfe80 ||
      (words[0] & 0xff00) === 0xff00 ||
      (words[0] & 0xffc0) === 0xfec0
    );
  }
  return true;
}

function safeUrl(value, base) {
  let url;
  try {
    url = new URL(value, base);
  } catch {
    throw new UnsafeBrandDestinationError("brand URL is invalid");
  }
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  ) {
    throw new UnsafeBrandDestinationError(
      "brand URL points to a prohibited destination",
    );
  }
  return url;
}

export function sanitizeWebsite(value) {
  const url = safeUrl(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function resolvePublic(url, lookupImpl) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) && privateAddress(hostname)) {
    throw new UnsafeBrandDestinationError(
      "brand URL resolves to a private address",
    );
  }
  const records = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookupImpl(hostname, { all: true });
  if (
    !records.length ||
    records.some(
      (record) =>
        !record ||
        isIP(record.address) !== record.family ||
        privateAddress(record.address),
    )
  ) {
    throw new UnsafeBrandDestinationError(
      "brand URL resolves to a private address",
    );
  }
  return records[0];
}

export function pinnedFetch(url, record, maximumBytes) {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: {
          accept:
            "text/html,text/css,image/png,image/jpeg,image/webp,image/svg+xml;q=0.9",
        },
        lookup: (_hostname, options, callback) =>
          options.all
            ? callback(null, [
                { address: record.address, family: record.family },
              ])
            : callback(null, record.address, record.family),
      },
      (response) => {
        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > maximumBytes) {
            request.destroy(new Error("brand response exceeds the byte limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
              headers: response.headers,
            }),
          );
        });
      },
    );
    request.setTimeout(TIMEOUT_MS, () =>
      request.destroy(new Error("brand request timed out")),
    );
    request.on("error", reject);
    request.end();
  });
}

async function boundedBytes(response, maximumBytes) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maximumBytes) {
    throw new Error("brand response exceeds the byte limit");
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error("brand response exceeds the byte limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function fetchPublic(
  initial,
  { maximumBytes, allowedOrigin, fetchImpl, lookupImpl = lookup } = {},
) {
  let url = safeUrl(initial);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (allowedOrigin && url.origin !== allowedOrigin) {
      throw new UnsafeBrandDestinationError(
        "brand asset leaves the first-party site",
      );
    }
    const record = await resolvePublic(url, lookupImpl);
    const response = fetchImpl
      ? await fetchImpl(url.href, {
          redirect: "manual",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      : await pinnedFetch(url, record, maximumBytes);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new Error("brand redirect is missing or exceeds the limit");
      }
      url = safeUrl(location, url);
      continue;
    }
    if (!response.ok)
      throw new Error(`brand response status ${response.status}`);
    return {
      bytes: await boundedBytes(response, maximumBytes),
      finalUrl: url,
      contentType: response.headers.get("content-type") ?? "",
    };
  }
  throw new Error("brand redirect exceeds the limit");
}
