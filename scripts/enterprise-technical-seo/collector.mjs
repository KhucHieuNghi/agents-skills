import { URL } from "node:url";
import { createHash } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { authorizeAction } from "../../skills/content-search-audit/scripts/lib/authorization.mjs";
import { validateNetworkPolicy } from "../../skills/content-search-audit/scripts/lib/network.mjs";
import { createBrowserProxy } from "../../skills/content-search-audit/scripts/lib/browser-proxy.mjs";
import { observeCanonicalNavigation } from "./navigation.mjs";
import { projectCanonicalDocument } from "./document.mjs";
import { projectRenderedCanonical } from "./document-collector.mjs";
import { parseCanonicalLinkHeaders } from "./link-header.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(",") === [...keys].sort().join(",");
const id = (value) =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
/** Trusted host state and adapters are never supplied through audit JSON. */
export async function collectCanonicalReadOnly(input, host, adapters = {}) {
  assert(
    exact(input, [
      "url",
      "authorizationRef",
      "observeMs",
      "timeoutMs",
      "maxBytes",
      "maxRequests",
    ]),
    "Invalid canonical collection plan",
  );
  const plan = { ...input };
  assert(
    Number.isSafeInteger(plan.maxBytes) &&
      plan.maxBytes >= 1 &&
      plan.maxBytes <= 8 * 1024 * 1024 &&
      id(plan.authorizationRef) &&
      Number.isSafeInteger(plan.observeMs) &&
      plan.observeMs >= 0 &&
      plan.observeMs <= 10000 &&
      Number.isSafeInteger(plan.timeoutMs) &&
      plan.timeoutMs >= 100 &&
      plan.timeoutMs <= 60000 &&
      plan.observeMs < plan.timeoutMs &&
      Number.isSafeInteger(plan.maxRequests) &&
      plan.maxRequests >= 1 &&
      plan.maxRequests <= 1000,
    "Invalid collection bounds",
  );
  let target;
  try {
    target = new URL(plan.url);
  } catch {
    throw new Error("Invalid collection URL");
  }
  assert(
    typeof plan.url === "string" &&
      /^https?:\/\//.test(plan.url) &&
      !/[\s\\]/u.test(plan.url) &&
      !target.username &&
      !target.password &&
      !plan.url.includes("#"),
    "Invalid collection URL",
  );
  assert(
    host?.chromium &&
      typeof host.synthetic === "boolean" &&
      exact(host.profile, ["id", "width", "height"]),
    "Trusted browser profile required",
  );
  const profile = { ...host.profile };
  assert(
    id(profile.id) &&
      [profile.width, profile.height].every(
        (value) => Number.isSafeInteger(value) && value >= 240 && value <= 3840,
      ),
    "Invalid browser profile",
  );
  const binding = Object.fromEntries(
    ["customerId", "assetId", "environment", "identityId"].map((key) => [
      key,
      host.context?.[key],
    ]),
  );
  assert(Object.values(binding).every(id), "Invalid collection scope");
  const settings = validateNetworkPolicy({
    allowedOrigins: host.allowedOrigins,
    maxBytes: plan.maxBytes,
    timeoutMs: plan.timeoutMs,
  });
  const origins = new Set(settings.allowedOrigins);
  const policy = {
    allowedOrigins: [...origins],
    maxBytes: plan.maxBytes,
    timeoutMs: plan.timeoutMs,
  };
  let stopped = false;
  function allowed(value) {
    if (
      stopped ||
      Object.entries(binding).some(
        ([key, value]) => host.context?.[key] !== value,
      )
    )
      return false;
    try {
      const url = new URL(value);
      if (!origins.has(url.origin) || url.username || url.password)
        return false;
      const grants = host.context?.trustedAuthorizations?.filter(
        (grant) => grant.authorizationRef === plan.authorizationRef,
      );
      return (
        grants?.length === 1 &&
        authorizeAction(
          grants[0],
          { kind: "read", realTransaction: false },
          host.context,
          new Date().toISOString(),
        ).allowed
      );
    } catch {
      return false;
    }
  }
  assert(allowed(target.href), "Read collection not authorized");
  const scope = {
    customerId: binding.customerId,
    entityId: binding.assetId,
    environment: binding.environment,
    targetUrl: target.href,
    profileId: profile.id,
    stateId: binding.identityId,
  };
  const startedAt = new Date().toISOString(),
    gaps = new Set();
  let browser,
    proxy,
    observer,
    requests = 0,
    timer,
    cleanupTimer,
    result;
  const ensure = () =>
    assert(!stopped && allowed(target.href), "Collection no longer authorized");
  const work = async () => {
    proxy = await createBrowserProxy(policy, allowed, adapters.proxy);
    if (stopped) {
      await proxy.close();
      throw new Error("Stopped");
    }
    browser = await host.chromium.launch({
      headless: true,
      proxy: {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      },
      args: [
        "--proxy-bypass-list=<-loopback>",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--disable-quic",
      ],
    });
    if (stopped) {
      await browser.close();
      throw new Error("Stopped");
    }
    ensure();
    const context = await browser.newContext({
      serviceWorkers: "block",
      acceptDownloads: false,
      viewport: { width: profile.width, height: profile.height },
    });
    ensure();
    await context.routeWebSocket("**/*", (socket) => {
      gaps.add("websocket-blocked");
      socket.close();
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      requests++;
      if (
        requests > plan.maxRequests ||
        !["GET", "HEAD"].includes(request.method()) ||
        !allowed(request.url())
      ) {
        gaps.add("request-blocked");
        await route.abort();
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    context.on("page", (other) => {
      if (other !== page) {
        gaps.add("popup-blocked");
        void other.close().catch(() => {});
      }
    });
    page.on("pageerror", () => gaps.add("page-script-error"));
    page.on("download", (download) => {
      gaps.add("download-blocked");
      void download.cancel().catch(() => {});
    });
    context.on("requestfailed", () => gaps.add("request-failed"));
    observer = await observeCanonicalNavigation(page, {
      maxBodyBytes: Math.min(plan.maxBytes, 8 * 1024 * 1024),
      maxDocumentRequests: Math.min(plan.maxRequests, 100),
      timeoutMs: Math.min(plan.timeoutMs, 5000),
    });
    ensure();
    await page.goto(target.href, {
      waitUntil: "domcontentloaded",
      timeout: plan.timeoutMs,
    });
    await delay(plan.observeMs);
    ensure();
    const response = await observer.snapshot();
    ensure();
    if (response.status !== "captured") {
      gaps.add("response-unavailable");
      return null;
    }
    const rendered = await projectRenderedCanonical(page, response.responseUrl);
    ensure();
    const parserContext = await browser.newContext({
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    ensure();
    await parserContext.route("**/*", (route) => route.abort());
    await parserContext.routeWebSocket("**/*", (socket) => socket.close());
    const parserPage = await parserContext.newPage();
    ensure();
    let raw = {
      complete: false,
      targets: [],
      pending: ["unsupported-body-representation"],
      html: null,
    };
    if (
      response.bodyRepresentation === "cdp-decoded-utf8" &&
      response.mimeType === "text/html"
    )
      raw = await parserPage.evaluate(projectCanonicalDocument, {
        sourceHtml: response.body,
        responseUrl: response.responseUrl,
      });
    ensure();
    const headers = parseCanonicalLinkHeaders(
      Object.entries(response.headers)
        .filter(([name]) => name.toLowerCase() === "link")
        .map(([, value]) => value),
      response.responseUrl,
    );
    const project = (value) => ({
      complete: value.complete,
      targets: value.targets,
    });
    const layers = {
      sourceHead: project(raw),
      renderedHead: project(rendered),
      httpLink: project(headers),
    };
    if (proxy.events.some((event) => event.kind === "blocked"))
      gaps.add("transport-denied");
    if (proxy.telemetry.droppedEvents) gaps.add("transport-events-truncated");
    if (gaps.size) {
      layers.renderedHead = { complete: false, targets: [] };
      gaps.add("rendered-environment-incomplete");
    }
    const matched =
      rendered.navigationBinding?.frameId === response.binding.frameId &&
      rendered.navigationBinding?.loaderId === response.binding.loaderId;
    if (
      !matched ||
      response.responseUrl !== target.href ||
      response.httpStatus !== 200
    ) {
      gaps.add(
        !matched
          ? "navigation-binding-unavailable"
          : response.responseUrl !== target.href
            ? "redirected-scope"
            : "response-status-not-200",
      );
      for (const key of Object.keys(layers))
        layers[key] = { complete: false, targets: [] };
    }
    const artifactText = JSON.stringify({
      schemaVersion: 1,
      scope,
      capturedAt: response.responseObservedAt,
      layers,
    });
    return {
      source: {
        sourceId: "browser-canonical",
        artifactText,
        artifactHash: hash(artifactText),
      },
      privateEvidence: { response, raw, rendered, headers },
      browserVersion: browser.version(),
      transportSummary: {
        blocked: proxy.events.filter((event) => event.kind === "blocked")
          .length,
        droppedEvents: proxy.telemetry.droppedEvents,
      },
    };
  };
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      stopped = true;
      gaps.add("collection-deadline");
      reject(new Error("Collection deadline"));
    }, plan.timeoutMs);
  });
  try {
    result = await Promise.race([work(), deadline]);
    if (!allowed(target.href)) {
      gaps.add("authorization-ended");
      result = null;
    }
  } catch {
    gaps.add("collection-incomplete");
    result = null;
  } finally {
    stopped = true;
    clearTimeout(timer);
    const cleanup = (async () => {
      let detachTimer;
      try {
        const detached = await Promise.race([
          observer ? observer.close() : Promise.resolve({ detached: true }),
          new Promise((resolve) => {
            detachTimer = setTimeout(() => resolve(null), 100);
          }),
        ]);
        if (!detached?.detached) gaps.add("observer-cleanup-unverified");
      } finally {
        clearTimeout(detachTimer);
      }
      return await Promise.allSettled([browser?.close(), proxy?.close()]);
    })();
    const done = await Promise.race([
      cleanup.then((values) => {
        if (
          values.some(
            (value) =>
              value.status === "rejected" || value.value?.detached === false,
          )
        )
          gaps.add("cleanup-incomplete");
        return true;
      }),
      new Promise((resolve) => {
        cleanupTimer = setTimeout(() => resolve(false), 2000);
      }),
    ]);
    clearTimeout(cleanupTimer);
    if (!done) gaps.add("cleanup-deadline");
  }
  return {
    status: result ? "captured" : "unknown",
    synthetic: host.synthetic,
    scope,
    startedAt,
    finishedAt: new Date().toISOString(),
    gaps: [...gaps],
    ...result,
    executionAuthenticated: false,
    semanticAcceptance: false,
  };
}
