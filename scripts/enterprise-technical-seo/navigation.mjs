import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";
async function within(timeoutMs, operation) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Protocol deadline")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
/** Host-only observer. Attach before authorized navigation; never reconstruct it from imported JSON. */
export async function observeCanonicalNavigation(page, options) {
  if (
    !options ||
    Object.keys(options).sort().join(",") !==
      "maxBodyBytes,maxDocumentRequests,timeoutMs" ||
    !Number.isSafeInteger(options.maxBodyBytes) ||
    options.maxBodyBytes < 1 ||
    options.maxBodyBytes > 8 * 1024 * 1024 ||
    !Number.isSafeInteger(options.maxDocumentRequests) ||
    options.maxDocumentRequests < 1 ||
    options.maxDocumentRequests > 100 ||
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 100 ||
    options.timeoutMs > 60000
  )
    throw new Error("Invalid navigation observer bounds");
  let session,
    abandoned = false;
  try {
    const creating = Promise.resolve().then(() =>
      page.context().newCDPSession(page),
    );
    creating
      .then((created) => {
        if (abandoned)
          return within(options.timeoutMs, () => created.detach()).catch(
            () => {},
          );
      })
      .catch(() => {});
    session = await within(options.timeoutMs, () => creating);
  } catch {
    abandoned = true;
    throw new Error("Navigation observation unavailable");
  }
  const records = new Map(),
    listeners = [];
  let closed = false,
    overflow = false,
    invalid = false,
    count = 0,
    revision = 0;
  const unknown = (reason) => ({ status: "unknown", reason, binding: null });
  let frameId;
  const on = (name, handler) => {
    const wrapped = (event) => {
      if (closed) return;
      try {
        handler(event);
      } catch {
        invalid = true;
      }
    };
    session.on(name, wrapped);
    listeners.push([name, wrapped]);
  };
  const send = (method, args) =>
    within(options.timeoutMs, () => {
      if (closed) throw new Error("Observer closed");
      return session.send(method, args);
    });
  let closing;
  function close() {
    if (closing) return closing;
    closed = true;
    for (const [name, handler] of listeners) session.off(name, handler);
    closing = within(options.timeoutMs, () => session.detach()).then(
      () => ({ closed: true, detached: true }),
      () => ({ closed: true, detached: false }),
    );
    return closing;
  }
  try {
    frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
    on("Network.requestWillBeSent", (event) => {
      if (event.type !== "Document" || event.frameId !== frameId) return;
      revision++;
      if (++count > options.maxDocumentRequests) {
        overflow = true;
        return;
      }
      if (
        typeof event.requestId !== "string" ||
        typeof event.loaderId !== "string" ||
        !event.loaderId ||
        typeof event.request?.url !== "string" ||
        event.request.url.length > 8192 ||
        event.request.method !== "GET"
      ) {
        invalid = true;
        return;
      }
      const previous = records.get(event.requestId),
        redirects = previous ? [...previous.redirects] : [];
      if (previous) {
        if (
          !event.redirectResponse ||
          event.redirectResponse.url !== previous.url ||
          previous.loaderId !== event.loaderId
        ) {
          invalid = true;
          return;
        }
        redirects.push({
          url: previous.url,
          status: event.redirectResponse.status,
        });
      } else if (event.redirectResponse) {
        invalid = true;
        return;
      }
      records.set(event.requestId, {
        requestId: event.requestId,
        loaderId: event.loaderId,
        frameId: event.frameId,
        url: event.request.url,
        redirects,
        requestObservedAt: new Date().toISOString(),
        response: null,
        finished: false,
        failed: false,
      });
    });
    on("Network.responseReceived", (event) => {
      if (event.type !== "Document" || event.frameId !== frameId) return;
      revision++;
      const record = records.get(event.requestId);
      if (
        !record ||
        record.loaderId !== event.loaderId ||
        event.response?.url !== record.url ||
        record.response
      ) {
        invalid = true;
        return;
      }
      if (
        !event.response.headers ||
        Buffer.byteLength(JSON.stringify(event.response.headers)) > 65536 ||
        !Number.isInteger(event.response.status) ||
        event.response.status < 100 ||
        event.response.status > 599
      ) {
        invalid = true;
        return;
      }
      record.response = {
        url: event.response.url,
        httpStatus: event.response.status,
        headers: globalThis.structuredClone(event.response.headers),
        mimeType: event.response.mimeType ?? null,
        fromServiceWorker: event.response.fromServiceWorker === true,
      };
      record.responseObservedAt = new Date().toISOString();
    });
    on("Network.loadingFinished", (event) => {
      const record = records.get(event.requestId);
      if (!record) return;
      revision++;
      record.finished = true;
      record.finishObservedAt = new Date().toISOString();
      if (
        !Number.isFinite(event.encodedDataLength) ||
        event.encodedDataLength < 0 ||
        event.encodedDataLength > options.maxBodyBytes
      )
        record.failed = true;
    });
    on("Network.loadingFailed", (event) => {
      const record = records.get(event.requestId);
      if (record) {
        revision++;
        record.failed = true;
      }
    });
    await send("Network.enable", {
      maxTotalBufferSize: options.maxBodyBytes * 2,
      maxResourceBufferSize: options.maxBodyBytes,
    });
  } catch {
    await close();
    throw new Error("Navigation observation unavailable");
  }
  return {
    close,
    async snapshot() {
      if (closed) return unknown("observer-closed");
      if (overflow) return unknown("document-budget-exceeded");
      if (invalid) return unknown("ambiguous-navigation-events");
      try {
        const before = (await send("Page.getFrameTree")).frameTree.frame;
        const matches = [...records.values()].filter(
          (record) =>
            record.frameId === before.id &&
            record.loaderId === before.loaderId &&
            record.url === before.url,
        );
        if (matches.length !== 1) return unknown("no-unique-current-response");
        const record = globalThis.structuredClone(matches[0]),
          startRevision = revision;
        if (
          !record.response ||
          !record.finished ||
          record.failed ||
          record.response.fromServiceWorker
        )
          return unknown("response-incomplete-or-unsupported");
        const result = await send("Network.getResponseBody", {
          requestId: record.requestId,
        });
        if (
          typeof result.body !== "string" ||
          typeof result.base64Encoded !== "boolean"
        )
          return unknown("invalid-body-representation");
        if (result.body.length > Math.ceil((options.maxBodyBytes * 4) / 3) + 4)
          return unknown("body-budget-exceeded");
        const bytes = Buffer.from(
          result.body,
          result.base64Encoded ? "base64" : "utf8",
        );
        if (bytes.length > options.maxBodyBytes)
          return unknown("body-budget-exceeded");
        if (result.base64Encoded && bytes.toString("base64") !== result.body)
          return unknown("invalid-body-representation");
        const after = (await send("Page.getFrameTree")).frameTree.frame;
        if (
          closed ||
          invalid ||
          overflow ||
          revision !== startRevision ||
          before.id !== after.id ||
          before.loaderId !== after.loaderId ||
          before.url !== after.url ||
          before.urlFragment !== after.urlFragment
        )
          return unknown("navigation-changed-during-capture");
        return {
          status: "captured",
          binding: {
            frameId: record.frameId,
            loaderId: record.loaderId,
            requestId: record.requestId,
          },
          responseUrl: record.url,
          httpStatus: record.response.httpStatus,
          headers: record.response.headers,
          mimeType: record.response.mimeType,
          redirects: record.redirects,
          requestObservedAt: record.requestObservedAt,
          responseObservedAt: record.responseObservedAt,
          finishObservedAt: record.finishObservedAt,
          capturedAt: new Date().toISOString(),
          body: result.body,
          bodyRepresentation: result.base64Encoded
            ? "cdp-base64"
            : "cdp-decoded-utf8",
          bodyBytes: bytes.length,
          bodyHash: createHash("sha256").update(bytes).digest("hex"),
          executionAuthenticated: false,
        };
      } catch {
        const cleanup = await close();
        return { ...unknown("response-capture-unavailable"), cleanup };
      }
    },
  };
}
