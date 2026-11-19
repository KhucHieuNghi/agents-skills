import { EventEmitter } from "node:events";
import { expect, it } from "vitest";
// @ts-expect-error development ESM observer
import { observeCanonicalNavigation } from "../skills/content-search-audit/scripts/lib/technical-seo/navigation.mjs";
const url = "https://example.com/page";
async function fixture(
  options = { maxBodyBytes: 1024, maxDocumentRequests: 10, timeoutMs: 100 },
) {
  const session = new EventEmitter() as EventEmitter & {
    send: (name: string, args?: unknown) => Promise<unknown>;
    detach: () => Promise<void>;
  };
  const state = {
    loader: "new",
    body: "<html>new</html>",
    bodyFailure: false,
    race: false,
    detached: false,
    hang: false,
    detachHang: false,
  };
  session.send = async (name) => {
    if (state.hang) return new Promise(() => {});
    if (name === "Page.getFrameTree")
      return {
        frameTree: { frame: { id: "main", loaderId: state.loader, url } },
      };
    if (name === "Network.getResponseBody") {
      if (state.bodyFailure) throw Error("private-marker");
      if (state.race) state.loader = "later";
      return { body: state.body, base64Encoded: false };
    }
    return {};
  };
  session.detach = async () => {
    if (state.detachHang) return new Promise(() => {});
    state.detached = true;
  };
  const observer = await observeCanonicalNavigation(
    { context: () => ({ newCDPSession: async () => session }) },
    options,
  );
  function request(id = "req", loader = "new", frame = "main") {
    session.emit("Network.requestWillBeSent", {
      requestId: id,
      loaderId: loader,
      frameId: frame,
      type: "Document",
      request: { url, method: "GET" },
      wallTime: 1795080000,
      timestamp: 1,
    });
  }
  function response(id = "req", loader = "new", frame = "main") {
    session.emit("Network.responseReceived", {
      requestId: id,
      loaderId: loader,
      frameId: frame,
      type: "Document",
      response: {
        url,
        status: 200,
        headers: { "content-type": "text/html" },
        mimeType: "text/html",
      },
      timestamp: 2,
    });
  }
  function finish(id = "req") {
    session.emit("Network.loadingFinished", {
      requestId: id,
      timestamp: 3,
      encodedDataLength: 20,
    });
  }
  return { session, state, observer, request, response, finish };
}
it("binds the body to current frame loader and request", async () => {
  const f = await fixture();
  f.request();
  f.response();
  f.finish();
  expect(await f.observer.snapshot()).toMatchObject({
    status: "captured",
    binding: { frameId: "main", loaderId: "new", requestId: "req" },
    body: "<html>new</html>",
    bodyRepresentation: "cdp-decoded-utf8",
  });
  await f.observer.close();
  expect(f.state.detached).toBe(true);
});
it("does not associate an old response with a reload at the same URL", async () => {
  const f = await fixture();
  f.request("old", "old");
  f.response("old", "old");
  f.finish("old");
  expect((await f.observer.snapshot()).status).toBe("unknown");
  await f.observer.close();
});
it("uses only the new response after a same-URL reload", async () => {
  const f = await fixture();
  for (const id of ["old", "new"]) {
    f.request(id, id);
    f.response(id, id);
    f.finish(id);
  }
  expect((await f.observer.snapshot()).binding.requestId).toBe("new");
  await f.observer.close();
});
it.each(["subframe", "unfinished", "failed", "unmatched", "ambiguous"])(
  "keeps %s responses unknown",
  async (kind) => {
    const f = await fixture();
    if (kind === "subframe") {
      f.request("req", "new", "child");
      f.response("req", "new", "child");
      f.finish();
    } else {
      if (kind !== "unmatched") f.request();
      f.response();
      if (kind !== "unfinished") f.finish();
      if (kind === "failed")
        f.session.emit("Network.loadingFailed", { requestId: "req" });
      if (kind === "ambiguous") {
        f.request("second");
        f.response("second");
        f.finish("second");
      }
    }
    expect((await f.observer.snapshot()).status).toBe("unknown");
    await f.observer.close();
  },
);
it.each(["race", "bodyFailure", "oversized"])(
  "rejects %s at snapshot time without raw exceptions",
  async (kind) => {
    const f = await fixture();
    f.request();
    f.response();
    f.finish();
    if (kind === "race") f.state.race = true;
    if (kind === "bodyFailure") f.state.bodyFailure = true;
    if (kind === "oversized") f.state.body = "x".repeat(1025);
    const result = await f.observer.snapshot();
    expect(result.status).toBe("unknown");
    expect(JSON.stringify(result)).not.toContain("private-marker");
    await f.observer.close();
  },
);
it("stops accepting snapshots after close", async () => {
  const f = await fixture();
  await f.observer.close();
  expect((await f.observer.snapshot()).status).toBe("unknown");
  expect(f.session.listenerCount("Network.requestWillBeSent")).toBe(0);
});
it("keeps overflow incomplete rather than silently dropping older documents", async () => {
  const f = await fixture({
    maxBodyBytes: 1024,
    maxDocumentRequests: 1,
    timeoutMs: 100,
  });
  f.request("a");
  f.request("b");
  f.response("b");
  f.finish("b");
  expect((await f.observer.snapshot()).status).toBe("unknown");
  await f.observer.close();
});

it("bounds stalled protocol calls and closes the observer", async () => {
  const f = await fixture();
  f.request();
  f.response();
  f.finish();
  f.state.hang = true;
  const result = await Promise.race([
    f.observer.snapshot(),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 250)),
  ]);
  expect(result).not.toBe("hung");
  expect(result).toMatchObject({ status: "unknown" });
  expect(f.state.detached).toBe(true);
});
it("bounds stalled detach and reports incomplete cleanup", async () => {
  const f = await fixture();
  f.state.detachHang = true;
  const result = await Promise.race([
    f.observer.close(),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 250)),
  ]);
  expect(result).toEqual({ closed: true, detached: false });
});

it("bounds session creation and cleans up a session delivered after timeout", async () => {
  let provide: (value: unknown) => void = () => {};
  let detached = false;
  const created = new Promise((resolve) => {
    provide = resolve;
  });
  await expect(
    observeCanonicalNavigation(
      { context: () => ({ newCDPSession: () => created }) },
      { maxBodyBytes: 1024, maxDocumentRequests: 10, timeoutMs: 100 },
    ),
  ).rejects.toThrow("Navigation observation unavailable");
  provide({
    detach: async () => {
      detached = true;
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(detached).toBe(true);
});
it("sanitizes errors while creating the host session", async () => {
  await expect(
    observeCanonicalNavigation(
      {
        context: () => ({
          newCDPSession: () => {
            throw Error("private-marker");
          },
        }),
      },
      { maxBodyBytes: 1024, maxDocumentRequests: 10, timeoutMs: 100 },
    ),
  ).rejects.toThrow("Navigation observation unavailable");
});
