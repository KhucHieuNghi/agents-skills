import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { authorizeAction } from "../../skills/content-search-audit/scripts/lib/authorization.mjs";
import {
  requestPublic,
  validateNetworkPolicy,
} from "../../skills/content-search-audit/scripts/lib/network.mjs";
import { createBrowserProxy } from "../../skills/content-search-audit/scripts/lib/browser-proxy.mjs";
import { observeCanonicalNavigation } from "./navigation.mjs";
import { projectCanonicalDocument } from "./document.mjs";
import { projectRenderedCanonical } from "./document-collector.mjs";
import { parseCanonicalCdpHeaders } from "./cdp-headers.mjs";
import { robotsAccess } from "../../skills/content-search-audit/scripts/lib/robots.mjs";
import { projectIndexDocument } from "./index-document.mjs";
import { projectRenderedIndexDocument } from "./index-document-collector.mjs";
import { projectHreflangDocument } from "./hreflang-document.mjs";
import { projectRenderedHreflangDocument } from "./hreflang-document-collector.mjs";
import { projectJsonLdDocument } from "./jsonld-document.mjs";
import { projectRenderedJsonLdDocument } from "./jsonld-document-collector.mjs";
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
  return collectDocumentReadOnly(input, host, adapters, "canonical");
}
export async function collectIndexControlsReadOnly(input, host, adapters = {}) {
  return collectDocumentReadOnly(input, host, adapters, "index-controls");
}
export async function collectHreflangReadOnly(input, host, adapters = {}) {
  return collectDocumentReadOnly(input, host, adapters, "hreflang");
}
export async function collectStructuredDataReadOnly(
  input,
  host,
  adapters = {},
) {
  return collectDocumentReadOnly(input, host, adapters, "structured-data");
}
async function collectDocumentReadOnly(input, host, adapters, mode) {
  const indexControls = mode === "index-controls",
    hreflang = mode === "hreflang",
    structuredData = mode === "structured-data";
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
  const cancellation = new globalThis.AbortController();
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
    result,
    robots,
    robotsResponse,
    crawlDelayMs = 0,
    nextRequestAt = 0,
    dispatchTail = Promise.resolve(),
    pendingDispatches = 0,
    pacingFailed = false;
  const ensure = () =>
    assert(!stopped && allowed(target.href), "Collection no longer authorized");
  const work = async () => {
    if (indexControls || hreflang || structuredData) {
      const robotsUrl = new URL("/robots.txt", target).href;
      try {
        robotsResponse = await requestPublic(
          robotsUrl,
          {
            ...policy,
            maxBytes: Math.min(plan.maxBytes, 512000),
            maxRedirects: 5,
          },
          {
            ...adapters.robots,
            signal: cancellation.signal,
            beforeRequest: (url) => {
              ensure();
              requests++;
              assert(
                requests <= plan.maxRequests && allowed(url.href),
                "Robots request not authorized",
              );
            },
          },
        );
        ensure();
        assert(
          !robotsResponse.headers["content-encoding"] ||
            robotsResponse.headers["content-encoding"].trim().toLowerCase() ===
              "identity",
          "Unsupported robots encoding",
        );
        const body = new globalThis.TextDecoder("utf-8", {
          fatal: true,
        }).decode(robotsResponse.body);
        robots = {
          url: robotsUrl,
          capturedAt: new Date().toISOString(),
          status: robotsResponse.status,
          body,
          complete:
            robotsResponse.redirects.length === 0 &&
            robotsResponse.url === robotsUrl,
        };
        robotsResponse = { ...robotsResponse, body };
        const access = robotsAccess(
          { status: robots.status, body },
          target.href,
        );
        if (!access.allowed) {
          gaps.add("robots-collection-blocked");
          return null;
        }
        crawlDelayMs = access.crawlDelaySeconds * 1000;
        if (crawlDelayMs >= plan.timeoutMs) {
          gaps.add("robots-delay-exceeds-budget");
          return null;
        }
        nextRequestAt = Date.now() + crawlDelayMs;
      } catch {
        gaps.add("robots-unavailable");
        return null;
      }
    }
    ensure();
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
      if (indexControls || hreflang || structuredData) {
        const requestUrl = new URL(request.url());
        if (
          requestUrl.origin !== target.origin ||
          !robotsAccess(
            { status: robots.status, body: robots.body },
            request.url(),
          ).allowed
        ) {
          gaps.add("robots-resource-blocked");
          await route.abort();
          return;
        }
        if (crawlDelayMs > 0) {
          pendingDispatches++;
          const preceding = dispatchTail;
          let release;
          dispatchTail = new Promise((resolve) => {
            release = resolve;
          });
          try {
            await preceding;
            assert(!pacingFailed, "Earlier paced request did not complete");
            const waitMs = Math.max(0, nextRequestAt - Date.now());
            if (waitMs > 0)
              await delay(waitMs, undefined, { signal: cancellation.signal });
            ensure();
            assert(allowed(request.url()), "Resource authorization ended");
            await route.continue();
            const delivered = await request.response();
            assert(delivered, "Paced response unavailable");
            assert(
              (await delivered.finished()) === null,
              "Paced response incomplete",
            );
            // Holding the permit through response completion includes downstream DNS/connection latency.
            nextRequestAt = Date.now() + crawlDelayMs;
          } catch {
            pacingFailed = true;
            gaps.add("paced-request-incomplete");
            await route.abort().catch(() => {});
          } finally {
            pendingDispatches--;
            release();
          }
          return;
        }
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
    await delay(plan.observeMs, undefined, { signal: cancellation.signal });
    ensure();
    const response = await observer.snapshot();
    ensure();
    if (response.status !== "captured") {
      gaps.add("response-unavailable");
      return null;
    }
    const rendered = await (
      structuredData
        ? projectRenderedJsonLdDocument
        : hreflang
          ? projectRenderedHreflangDocument
          : indexControls
            ? projectRenderedIndexDocument
            : projectRenderedCanonical
    )(page, response.responseUrl);
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
      ...(structuredData
        ? { blocks: [], otherFormatsObserved: [] }
        : hreflang
          ? { alternates: [] }
          : indexControls
            ? { meta: [] }
            : { targets: [] }),
      pending: ["unsupported-body-representation"],
      html: null,
    };
    if (
      response.bodyRepresentation === "cdp-decoded-utf8" &&
      response.mimeType === "text/html"
    )
      raw = await parserPage.evaluate(
        structuredData
          ? projectJsonLdDocument
          : hreflang
            ? projectHreflangDocument
            : indexControls
              ? projectIndexDocument
              : projectCanonicalDocument,
        {
          sourceHtml: response.body,
          responseUrl: response.responseUrl,
        },
      );
    ensure();
    let headers;
    if (indexControls) {
      assert(
        response.headers &&
          typeof response.headers === "object" &&
          !Array.isArray(response.headers) &&
          Object.values(response.headers).every(
            (value) => typeof value === "string",
          ),
        "Invalid native headers",
      );
      const values = Object.entries(response.headers)
        .filter(([name]) => name.toLowerCase() === "x-robots-tag")
        .flatMap(([, value]) => value.split("\n"));
      assert(
        values.length <= 100 && values.every((value) => value.length <= 8192),
        "Robots header budget",
      );
      headers = { complete: true, values };
    } else if (!hreflang && !structuredData)
      headers = parseCanonicalCdpHeaders(
        response.headers,
        response.responseUrl,
      );
    const project = (value) =>
      structuredData
        ? { complete: value.complete, blocks: value.blocks }
        : hreflang
          ? { complete: value.complete, alternates: value.alternates }
          : indexControls
            ? { complete: value.complete, meta: value.meta }
            : { complete: value.complete, targets: value.targets };
    const layers =
      hreflang || structuredData
        ? { sourceDocument: project(raw), renderedDocument: project(rendered) }
        : indexControls
          ? {
              sourceDocument: project(raw),
              renderedDocument: project(rendered),
              httpHeaders: headers,
            }
          : {
              sourceHead: project(raw),
              renderedHead: project(rendered),
              httpLink: project(headers),
            };
    if (pendingDispatches > 0) gaps.add("scheduled-requests-incomplete");
    if (proxy.events.some((event) => event.kind === "blocked"))
      gaps.add("transport-denied");
    if (proxy.telemetry.droppedEvents) gaps.add("transport-events-truncated");
    if (gaps.size) {
      if (structuredData)
        layers.renderedDocument = { complete: false, blocks: [] };
      else if (hreflang)
        layers.renderedDocument = { complete: false, alternates: [] };
      else if (indexControls)
        layers.renderedDocument = { complete: false, meta: [] };
      else layers.renderedHead = { complete: false, targets: [] };
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
      if (hreflang || structuredData) return null;
      if (indexControls) {
        if (!matched) return null;
      } else
        for (const key of Object.keys(layers))
          layers[key] = { complete: false, targets: [] };
    }
    const artifactText = JSON.stringify({
      schemaVersion: 1,
      scope,
      capturedAt: response.responseObservedAt,
      ...(indexControls
        ? {
            response: {
              url: response.responseUrl,
              status: response.httpStatus,
            },
            robots,
            ...layers,
          }
        : { layers }),
    });
    return {
      ...(hreflang || structuredData
        ? {
            sources: ["html-source", "html-rendered"].map((method) => {
              const projection =
                method === "html-source"
                  ? layers.sourceDocument
                  : layers.renderedDocument;
              const artifactText = JSON.stringify({
                schemaVersion: 1,
                scope,
                method,
                ...(structuredData
                  ? {
                      capturedAt:
                        method === "html-source"
                          ? response.responseObservedAt
                          : rendered.observedAt,
                      projection,
                      otherFormatsObserved:
                        method === "html-source"
                          ? raw.otherFormatsObserved
                          : gaps.size
                            ? []
                            : rendered.otherFormatsObserved,
                    }
                  : {
                      pages: [
                        {
                          url: target.href,
                          capturedAt:
                            method === "html-source"
                              ? response.responseObservedAt
                              : rendered.observedAt,
                          ...projection,
                        },
                      ],
                    }),
              });
              if (
                structuredData &&
                Buffer.byteLength(artifactText) > 2 * 1024 * 1024
              ) {
                gaps.add("structured-data-envelope-size-limit");
                throw new Error(
                  "Structured data envelope exceeds evaluator budget",
                );
              }
              return {
                sourceId: structuredData
                  ? method === "html-source"
                    ? "browser-jsonld-source"
                    : "browser-jsonld-rendered"
                  : method === "html-source"
                    ? "browser-hreflang-source"
                    : "browser-hreflang-rendered",
                artifactText,
                artifactHash: hash(artifactText),
              };
            }),
          }
        : {
            source: {
              sourceId: indexControls
                ? "browser-index-controls"
                : "browser-canonical",
              artifactText,
              artifactHash: hash(artifactText),
            },
          }),
      privateEvidence: {
        response,
        raw,
        rendered,
        headers,
        ...(indexControls || hreflang || structuredData
          ? { robotsResponse }
          : {}),
      },
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
      cancellation.abort();
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
    cancellation.abort();
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
