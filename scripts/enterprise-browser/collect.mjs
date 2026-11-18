import { setTimeout as schedule, clearTimeout } from "node:timers";
import { createHash } from "node:crypto";
import { URL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createBrowserProxy } from "./proxy.mjs";
import { authorizeAction } from "../../skills/content-search-audit/scripts/lib/authorization.mjs";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { validateNetworkPolicy } from "../../skills/content-search-audit/scripts/lib/network.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};

/**
 * Read-only, fresh-context development collector. Host owns chromium, authority and origins.
 * Never build host state or adapters from page content, imports or the plan itself.
 */
export async function collectBrowserReadOnly(plan, host, adapters = {}) {
  assert(
    plan &&
      typeof plan === "object" &&
      !Array.isArray(plan) &&
      Object.keys(plan).every((k) =>
        [
          "url",
          "authorizationRef",
          "eventNames",
          "observeMs",
          "timeoutMs",
          "maxBytes",
          "maxRequests",
        ].includes(k),
      ),
    "Invalid browser plan",
  );
  assert(
    typeof plan.url === "string" && /^https?:\/\//.test(plan.url),
    "Invalid browser URL",
  );
  const url = new URL(plan.url);
  assert(
    !url.username && !url.password && !url.hash && !/[\s\\]/u.test(plan.url),
    "Ambiguous browser URL",
  );
  assert(
    Array.isArray(plan.eventNames) &&
      plan.eventNames.length <= 100 &&
      new Set(plan.eventNames).size === plan.eventNames.length &&
      plan.eventNames.every(
        (x) => typeof x === "string" && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(x),
      ),
    "Invalid observed event names",
  );
  assert(
    Number.isSafeInteger(plan.observeMs) &&
      plan.observeMs >= 0 &&
      plan.observeMs <= 10000 &&
      Number.isSafeInteger(plan.timeoutMs) &&
      plan.timeoutMs >= 100 &&
      plan.timeoutMs <= 60000 &&
      Number.isSafeInteger(plan.maxRequests) &&
      plan.maxRequests >= 1 &&
      plan.maxRequests <= 1000,
    "Invalid browser bounds",
  );
  assert(
    host && host.chromium && typeof host.synthetic === "boolean",
    "Trusted browser host required",
  );
  const policy = {
    allowedOrigins: host.allowedOrigins,
    maxBytes: plan.maxBytes,
    timeoutMs: plan.timeoutMs,
  };
  const settings = validateNetworkPolicy(policy);
  assert(
    settings.allowedOrigins.has(url.origin),
    "URL outside trusted asset origins",
  );
  const boundScope = {
    customerId: host.context?.customerId,
    assetId: host.context?.assetId,
    environment: host.context?.environment,
    identityId: host.context?.identityId,
  };
  const allowed = (target) => {
    if (Object.entries(boundScope).some(([k, v]) => host.context?.[k] !== v))
      return false;
    const parsed = new URL(target);
    if (
      !settings.allowedOrigins.has(parsed.origin) ||
      parsed.username ||
      parsed.password
    )
      return false;
    const grants = host.context?.trustedAuthorizations?.filter(
      (g) => g.authorizationRef === plan.authorizationRef,
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
  };
  assert(allowed(url.href), "Read action not authorized");
  const startedAt = new Date().toISOString(),
    observations = [],
    gaps = new Set(),
    pending = new Set();
  let browser,
    context,
    proxy,
    page,
    browserVersion = null,
    dom = null,
    stopped = false,
    requests = 0;
  const deadlineError = new Error("Collection deadline");
  let watchdog;
  const deadline = new Promise((_, reject) => {
    watchdog = schedule(() => {
      stopped = true;
      gaps.add("collection-timeout");
      void browser?.close().catch(() => {});
      reject(deadlineError);
    }, plan.timeoutMs + plan.observeMs);
  });
  const put = (value) => {
    if (stopped) return;
    if (observations.length >= 2000) {
      gaps.add("observation-limit");
      return;
    }
    observations.push({
      ...value,
      sequence: observations.length,
      observedAt: new Date().toISOString(),
    });
  };
  const work = async () => {
    proxy = await createBrowserProxy(policy, allowed, adapters.proxy);
    if (stopped) {
      await proxy.close();
      throw deadlineError;
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
    browserVersion = browser.version();
    if (stopped) {
      await browser.close();
      throw deadlineError;
    }
    context = await browser.newContext({
      serviceWorkers: "block",
      acceptDownloads: false,
    });
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
        put({
          kind: "blocked",
          urlDigest: hash(request.url()),
          method: request.method(),
        });
        await route.abort();
        return;
      }
      await route.continue();
    });
    await context.exposeBinding("__auditEvent", (_, event) => {
      if (typeof event === "string" && plan.eventNames.includes(event))
        put({ kind: "data-layer", eventName: event });
    });
    await context.addInitScript((names) => {
      const value = [];
      value.push = function (...items) {
        for (const item of items)
          if (names.includes(item?.event))
            void globalThis.window.__auditEvent(item.event);
        return Array.prototype.push.apply(this, items);
      };
      // The observer can be replaced by site code; completeness is never inferred.
      globalThis.window.dataLayer = value;
    }, plan.eventNames);
    context.on("response", (response) => {
      const task = (async () => {
        put({
          kind: "response",
          urlDigest: hash(response.url()),
          httpStatus: response.status(),
          method: response.request().method(),
        });
      })();
      pending.add(task);
      task.finally(() => pending.delete(task));
    });
    context.on("requestfailed", (request) => {
      gaps.add("request-failed");
      put({
        kind: "request-failed",
        urlDigest: hash(request.url()),
        method: request.method(),
      });
    });
    page = await context.newPage();
    context.on("page", (other) => {
      if (other !== page) {
        gaps.add("popup-blocked");
        void other.close();
      }
    });
    page.on("pageerror", () => gaps.add("page-script-error"));
    page.on("download", (download) => {
      gaps.add("download-blocked");
      void download.cancel();
    });
    try {
      await page.goto(url.href, {
        waitUntil: "domcontentloaded",
        timeout: plan.timeoutMs,
      });
    } catch {
      gaps.add("navigation-incomplete");
    }
    await delay(plan.observeMs);
    try {
      dom = await page.evaluate(() => ({
        lang: globalThis.window.document.documentElement.lang,
        titleLength: globalThis.window.document.title.length,
        clientWidth: globalThis.window.document.documentElement.clientWidth,
        scrollWidth: globalThis.window.document.documentElement.scrollWidth,
      }));
    } catch {
      gaps.add("dom-unavailable");
    }
    await Promise.all([...pending]);
  };
  try {
    await Promise.race([work(), deadline]);
  } catch (error) {
    if (error !== deadlineError) throw error;
  } finally {
    stopped = true;
    clearTimeout(watchdog);
    let cleanupTimer;
    // Closing the owned browser also closes its contexts; avoid racing two closes.
    const cleanup = Promise.allSettled([browser?.close(), proxy?.close()]);
    const finished = await Promise.race([
      cleanup.then((results) => {
        if (results.some((r) => r.status === "rejected"))
          gaps.add("cleanup-failed");
        return true;
      }),
      new Promise((resolve) => {
        cleanupTimer = schedule(() => resolve(false), 2000);
      }),
    ]);
    clearTimeout(cleanupTimer);
    if (!finished) gaps.add("cleanup-timeout");
  }
  if (proxy?.events.some((e) => e.kind === "blocked"))
    gaps.add("transport-denied");
  if (proxy?.telemetry.droppedEvents) gaps.add("transport-events-truncated");
  return {
    schemaVersion: 1,
    synthetic: host.synthetic,
    browserVersion,
    status: "partial",
    scope: {
      customerId: boundScope.customerId,
      assetId: boundScope.assetId,
      environment: boundScope.environment,
    },
    planDigest: enterpriseDigest(plan),
    startedAt,
    finishedAt: new Date().toISOString(),
    initialUrlDigest: hash(url.href),
    finalUrlDigest: page ? hash(page.url()) : null,
    dom,
    observations: observations.map((x) => ({ ...x })),
    transport: proxy?.events.map((e) => ({ ...e })) ?? [],
    transportTelemetry: proxy ? { ...proxy.telemetry } : null,
    gaps: [...gaps],
    coverage: {
      dataLayer: "partial",
      network: "partial",
      tag: "unobserved",
      consent: "unobserved",
      provider: "unobserved",
      business: "unobserved",
    },
    limitations: [
      "Fresh anonymous context and blocked non-read requests can change site behavior.",
      "Observed dataLayer names are page-controlled signals, not authenticated events; replacing the observer can lose events.",
      "Opaque HTTPS tunnels require the browser request gate; this is not a sandbox for arbitrary hostile browser protocols.",
      "No provider receipt, business success, consent compliance or Core Web Vitals assessment is inferred.",
    ],
  };
}
