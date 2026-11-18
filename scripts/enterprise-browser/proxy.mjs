import {
  abortable,
  createDeadline,
} from "../../skills/content-search-audit/scripts/lib/cancellation.mjs";
import http from "node:http";
import net from "node:net";
import { Buffer } from "node:buffer";
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";
import {
  resolvePublicTarget,
  validateNetworkPolicy,
} from "../../skills/content-search-audit/scripts/lib/network.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const hopHeaders = new Set([
  "connection",
  "proxy-connection",
  "proxy-authorization",
  "proxy-authenticate",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);
function cleanHeaders(headers) {
  const excluded = new Set([
    ...hopHeaders,
    ...String(headers.connection ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase()),
  ]);
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !excluded.has(key.toLowerCase())),
  );
}

/**
 * Development browser egress transport. HTTP read methods only; CONNECT remains opaque TLS.
 * A browser request gate is REQUIRED for per-request authorization and HTTPS method controls.
 * Adapters are trusted test/runtime dependencies, never loaded from an audit document.
 */
export async function createBrowserProxy(policy, authorize, adapters = {}) {
  if (typeof authorize !== "function")
    throw Error("Trusted authorization callback required");
  const settings = validateNetworkPolicy(policy);
  const frozenPolicy = {
    allowedOrigins: [...settings.allowedOrigins],
    maxBytes: settings.maxBytes,
    timeoutMs: settings.timeoutMs,
    maxRedirects: 0,
  };
  const username = "audit",
    password = randomBytes(24).toString("hex");
  const expected = Buffer.from(
    "Basic " + Buffer.from(username + ":" + password).toString("base64"),
  );
  const sockets = new Set(),
    upstreams = new Set(),
    events = [];
  const abort = new globalThis.AbortController();
  let closed = false;
  const telemetry = { admissionAttempts: 0, droppedEvents: 0 };
  const record = (kind, url, reason) => {
    if (events.length >= 1000) {
      telemetry.droppedEvents++;
      return;
    }
    events.push({ kind, targetDigest: hash(url), reason });
  };
  const admit = () => ++telemetry.admissionAttempts <= 1000;
  const authenticated = (request) => {
    const supplied = Buffer.from(
      String(request.headers["proxy-authorization"] ?? ""),
    );
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  };
  const target = async (url, clientSignal, alive) => {
    if (closed || !alive()) throw Error("Proxy/client closed");
    const cancellation = createDeadline(
      settings.timeoutMs,
      globalThis.AbortSignal.any([abort.signal, clientSignal]),
      "Proxy target timeout",
    );
    try {
      const result = await resolvePublicTarget(url, frozenPolicy, {
        lookup: adapters.lookup,
        signal: cancellation.signal,
      });
      const authorized = await abortable(
        () => authorize(result.url.href),
        cancellation.signal,
      );
      if (closed || !alive() || !authorized)
        throw Error("Authorization denied or client closed");
      return result;
    } finally {
      cancellation.dispose();
    }
  };
  const track = (socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => sockets.delete(socket));
    socket.setTimeout(settings.timeoutMs, () => socket.destroy());
  };
  const server = http.createServer(async (request, response) => {
    const raw = request.url ?? "";
    if (!authenticated(request)) {
      response
        .writeHead(407, {
          "proxy-authenticate": 'Basic realm="audit"',
          connection: "close",
        })
        .end();
      return;
    }
    if (!admit()) {
      record("blocked", raw, "admission-limit");
      response.writeHead(429, { connection: "close" }).end();
      return;
    }
    if (
      !["GET", "HEAD"].includes(request.method) ||
      request.headers["transfer-encoding"] ||
      (request.headers["content-length"] !== undefined &&
        request.headers["content-length"] !== "0")
    ) {
      record("blocked", raw, "method-or-body");
      response.writeHead(403, { connection: "close" }).end();
      return;
    }
    let outbound;
    const clientAbort = new globalThis.AbortController();
    response.on("close", () => clientAbort.abort());
    try {
      const destination = await target(
        raw,
        clientAbort.signal,
        () =>
          !request.socket.destroyed &&
          !response.destroyed &&
          !response.writableEnded,
      );
      if (destination.url.protocol !== "http:")
        throw Error("HTTPS requires CONNECT");
      const headers = cleanHeaders(request.headers);
      headers.host = destination.url.host;
      outbound = (adapters.httpRequest ?? http.request)(
        destination.url,
        {
          method: request.method,
          headers,
          agent: false,
          lookup: (_hostname, options, callback) =>
            options?.all
              ? callback(null, [
                  { address: destination.address, family: destination.family },
                ])
              : callback(null, destination.address, destination.family),
        },
        (incoming) => {
          response.writeHead(
            incoming.statusCode,
            cleanHeaders(incoming.headers),
          );
          let bytes = 0;
          incoming.on("data", (chunk) => {
            bytes += chunk.length;
            if (bytes > settings.maxBytes) {
              record("blocked", raw, "response-byte-limit");
              incoming.destroy();
              outbound.destroy();
              response.destroy();
            }
          });
          incoming.on("error", () => response.destroy());
          incoming.on("aborted", () => response.destroy());
          incoming.pipe(response);
        },
      );
      upstreams.add(outbound);
      const timer = setTimeout(() => {
        record("blocked", raw, "request-timeout");
        outbound.destroy();
        response.destroy();
      }, settings.timeoutMs);
      outbound.on("close", () => {
        clearTimeout(timer);
        upstreams.delete(outbound);
      });
      outbound.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      response.on("close", () => outbound.destroy());
      record("allowed", raw, "http-pinned");
      outbound.end();
    } catch {
      record("blocked", raw, "destination-or-authorization");
      if (!response.headersSent)
        response.writeHead(403, { connection: "close" });
      response.end();
      outbound?.destroy();
    }
  });
  server.on("connection", track);
  server.on("upgrade", (_request, socket) => socket.destroy());
  server.on("connect", async (request, client, head) => {
    const authority = request.url ?? "";
    if (!authenticated(request)) {
      client.end(
        'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="audit"\r\nConnection: close\r\n\r\n',
      );
      return;
    }
    if (!admit()) {
      record("blocked", authority, "admission-limit");
      client.end("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      return;
    }
    let upstream;
    const clientAbort = new globalThis.AbortController();
    client.on("close", () => clientAbort.abort());
    try {
      // CONNECT accepts only authority-form with an explicit numeric port.
      if (!/^(?:\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+):[0-9]{1,5}$/.test(authority))
        throw Error("Invalid CONNECT authority");
      const destination = await target(
        "https://" + authority + "/",
        clientAbort.signal,
        () => !client.destroyed,
      );
      if (client.destroyed || closed) throw Error("Client closed");
      upstream = (adapters.connect ?? net.connect)({
        host: destination.address,
        port: Number(destination.url.port || 443),
        family: destination.family,
      });
      track(upstream);
      const timer = setTimeout(() => {
        record("blocked", authority, "tunnel-timeout");
        client.destroy();
        upstream.destroy();
      }, settings.timeoutMs);
      let bytes = head.length;
      const count = (chunk) => {
        bytes += chunk.length;
        if (bytes > settings.maxBytes) {
          record("blocked", authority, "tunnel-byte-limit");
          client.destroy();
          upstream.destroy();
        }
      };
      client.on("data", count);
      upstream.on("data", count);
      upstream.once("connect", () => {
        if (closed || client.destroyed) {
          upstream.destroy();
          return;
        }
        if (bytes > settings.maxBytes) {
          client.destroy();
          upstream.destroy();
          return;
        }
        record("allowed", authority, "connect-pinned");
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.on("error", () => client.destroy());
      client.on("error", () => upstream.destroy());
      client.on("close", () => {
        clearTimeout(timer);
        upstream.destroy();
      });
      upstream.on("close", () => {
        clearTimeout(timer);
        client.destroy();
      });
    } catch {
      record("blocked", authority, "destination-or-authorization");
      client.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      upstream?.destroy();
    }
  });
  server.maxConnections = 64;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    server: "http://127.0.0.1:" + server.address().port,
    username,
    password,
    events,
    telemetry,
    async close() {
      closed = true;
      abort.abort();
      for (const req of upstreams) req.destroy();
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
