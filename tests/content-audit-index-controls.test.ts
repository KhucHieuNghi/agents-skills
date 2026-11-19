import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { evaluateIndexControls } from "../skills/content-search-audit/scripts/lib/technical-seo/index-controls.mjs";
function fixture() {
  const context = {
    customerId: "customer",
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/private",
    profileId: "mobile",
    stateId: "anonymous",
    crawler: "googlebot",
    assessmentAt: "2026-11-19T12:00:00Z",
    maxAgeSeconds: 3600,
    expectedCrawlAllowed: true,
    expectedIndexable: true,
    expectedHttpStatus: 200,
  };
  const scope = {
    customerId: context.customerId,
    entityId: context.entityId,
    environment: context.environment,
    targetUrl: context.targetUrl,
    profileId: context.profileId,
    stateId: context.stateId,
  };
  const raw = {
    schemaVersion: 1,
    scope,
    capturedAt: "2026-11-19T11:30:00Z",
    response: { url: context.targetUrl, status: 200 },
    robots: {
      url: "https://example.com/robots.txt",
      capturedAt: "2026-11-19T11:30:00Z",
      status: 200,
      body: "User-agent: *\nAllow: /",
      complete: true,
    },
    sourceDocument: { complete: true, meta: [] },
    renderedDocument: { complete: true, meta: [] },
    httpHeaders: { complete: true, values: [] },
  };
  return { context, raw };
}
function evaluate(f) {
  const artifactText = JSON.stringify(f.raw);
  return evaluateIndexControls(f.context, {
    sourceId: "controls",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  });
}
it("passes only bounded observations without asserting indexing", () => {
  const r = evaluate(fixture());
  expect(r.checks.map((c) => c.status)).toEqual(["pass", "pass", "pass"]);
  expect(r.indexingStatus).toBe("unknown");
  expect(r.executionAuthenticated).toBe(false);
});
it("retains source noindex even after rendered removal", () => {
  const f = fixture();
  f.raw.sourceDocument.meta = [{ name: "robots", content: "noindex" }];
  const r = evaluate(f);
  expect(r.checks[2].status).toBe("fail");
  expect(r.observation.noindexLayers).toEqual(["sourceDocument"]);
});
it("detects JavaScript-only noindex and restrictive none", () => {
  const f = fixture();
  f.raw.renderedDocument.meta = [{ name: "googlebot", content: "INDEX, NONE" }];
  expect(evaluate(f).checks[2].status).toBe("fail");
});
it("keeps blocked robots distinct from noindex and discoverability", () => {
  const f = fixture();
  f.raw.robots.body = "User-agent: *\nDisallow: /";
  f.raw.sourceDocument.meta = [{ name: "robots", content: "noindex" }];
  f.context.expectedIndexable = false;
  const r = evaluate(f);
  expect(r.checks[1].status).toBe("fail");
  expect(r.checks[2].status).toBe("pass");
  expect(r.observation.directiveDiscoverability).toBe("unknown");
  expect(r.indexingStatus).toBe("unknown");
});
it.each([401, 403, 404, 410])(
  "uses Google's absent robots behavior for %s, not collection permission",
  (status) => {
    const f = fixture();
    f.raw.robots.status = status;
    f.raw.robots.body = "PRIVATE_ERROR";
    expect(evaluate(f).checks[1].status).toBe("pass");
    expect(JSON.stringify(evaluate(f))).not.toContain("PRIVATE_ERROR");
  },
);
it.each([301, 429, 500, 503])(
  "keeps robots %s unknown without cache history",
  (status) => {
    const f = fixture();
    f.raw.robots.status = status;
    expect(evaluate(f).checks[1].status).toBe("unknown");
  },
);
it("does not treat malformed robots as a website exclusion", () => {
  const f = fixture();
  f.raw.robots.body = "User-agent: *\nDisallow: bad path";
  expect(evaluate(f).checks[1].status).toBe("unknown");
});
it("selects Googlebot group and allow tie over wildcard denial", () => {
  const f = fixture();
  f.raw.robots.body =
    "User-agent: *\nDisallow: /\nUser-agent: Googlebot\nDisallow: /private\nAllow: /private";
  expect(evaluate(f).checks[1].status).toBe("pass");
});
it("requires all directive layers for clean absence but allows positive noindex evidence", () => {
  const f = fixture();
  f.raw.renderedDocument.complete = false;
  expect(evaluate(f).checks[2].status).toBe("unknown");
  f.raw.sourceDocument.meta = [{ name: "robots", content: "noindex" }];
  expect(evaluate(f).checks[2].status).toBe("fail");
});
it.each([
  "noindex",
  "Googlebot: noindex, nofollow",
  "none",
  "max-snippet:50, noindex",
])("handles applicable X-Robots-Tag %s", (value) => {
  const f = fixture();
  f.raw.httpHeaders.values = [value];
  expect(evaluate(f).checks[2].status).toBe("fail");
});
it("ignores other agents and non-page noimageindex", () => {
  const f = fixture();
  f.raw.httpHeaders.values = ["otherbot: noindex", "noimageindex, nofollow"];
  f.raw.sourceDocument.meta = [{ name: "googlebot-news", content: "noindex" }];
  expect(evaluate(f).checks[2].status).toBe("pass");
});
it.each([
  "unavailable_after: 2026-01-01",
  "googlebot: index, otherbot: noindex",
  "mystery",
  "noindex: garbage",
])("keeps unsupported directive grammar unknown: %s", (value) => {
  const f = fixture();
  f.raw.httpHeaders.values = [value];
  expect(evaluate(f).checks[2].status).toBe("unknown");
});
it("keeps missing intent unknown instead of penalizing intentional blocks", () => {
  const f = fixture();
  f.context.expectedHttpStatus = null;
  f.context.expectedCrawlAllowed = null;
  f.context.expectedIndexable = null;
  expect(evaluate(f).checks.every((c) => c.status === "unknown")).toBe(true);
});
it("expires page and robots observations independently", () => {
  const f = fixture();
  f.raw.robots.capturedAt = "2026-11-19T11:00:00Z";
  expect(evaluate(f).checks.map((c) => c.status)).toEqual([
    "pass",
    "unknown",
    "pass",
  ]);
  f.context.assessmentAt = "2026-11-19T12:30:00Z";
  expect(evaluate(f).checks.every((c) => c.status === "unknown")).toBe(true);
});
it("does not apply destination noindex or status to redirected original URL", () => {
  const f = fixture();
  f.raw.response.url = "https://example.com/login";
  f.raw.sourceDocument.meta = [{ name: "robots", content: "noindex" }];
  expect(evaluate(f).checks[0].status).toBe("unknown");
  expect(evaluate(f).checks[2].status).toBe("unknown");
});
it.each([
  "foreign-origin",
  "foreign-scope",
  "future",
  "bad-hash",
  "extra",
  "crawler",
])("rejects %s", (kind) => {
  const f = fixture();
  if (kind === "foreign-origin")
    f.raw.robots.url = "https://other.com/robots.txt";
  if (kind === "foreign-scope") f.raw.scope.customerId = "other";
  if (kind === "future") f.raw.robots.capturedAt = "2026-11-19T12:01:00Z";
  if (kind === "extra") f.raw.authorization = true;
  if (kind === "crawler") f.context.crawler = "bingbot";
  if (kind === "bad-hash")
    expect(() =>
      evaluateIndexControls(f.context, {
        sourceId: "x",
        artifactText: JSON.stringify(f.raw),
        artifactHash: "a".repeat(64),
      }),
    ).toThrow();
  else expect(() => evaluate(f)).toThrow();
});
it.each([
  "max-snippet:50, otherbot: noindex",
  "otherbot: max-snippet:50, googlebot: noindex",
])("does not mix scoped header declarations: %s", (value) => {
  const f = fixture();
  f.raw.httpHeaders.values = [value];
  const r = evaluate(f);
  expect(r.checks[2].status).toBe("unknown");
  expect(r.observation.noindexLayers).toEqual([]);
});
it("rejects head-only coverage as proof of absent document-wide noindex", () => {
  const f = fixture();
  f.raw.sourceHead = f.raw.sourceDocument;
  delete f.raw.sourceDocument;
  f.raw.renderedHead = f.raw.renderedDocument;
  delete f.raw.renderedDocument;
  expect(() => evaluate(f)).toThrow(/fields/);
});

it.each(["max-snippet: noindex", "unavailable_after: noindex"])(
  "does not read parameter value as a standalone noindex: %s",
  (content) => {
    for (const layer of ["sourceDocument", "httpHeaders"]) {
      const f = fixture();
      if (layer === "httpHeaders") f.raw.httpHeaders.values = [content];
      else f.raw.sourceDocument.meta = [{ name: "robots", content }];
      const r = evaluate(f);
      expect(r.checks[2].status).toBe("unknown");
      expect(r.observation.noindexLayers).toEqual([]);
    }
  },
);
