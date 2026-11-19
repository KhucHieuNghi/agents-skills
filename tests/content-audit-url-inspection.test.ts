import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { evaluateUrlInspection } from "../scripts/enterprise-technical-seo/url-inspection.mjs";
function fixture() {
  const context = {
    customerId: "customer",
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/a",
    property: "sc-domain:example.com",
    assessmentAt: "2026-11-19T12:00:00Z",
    maxAgeSeconds: 3600,
    expectedIndexed: true,
    expectedCanonical: "https://example.com/a",
  };
  const raw = {
    schemaVersion: 1,
    scope: {
      customerId: "customer",
      entityId: "site",
      environment: "production",
    },
    request: { inspectionUrl: context.targetUrl, siteUrl: context.property },
    retrievedAt: "2026-11-19T11:30:00Z",
    response: {
      inspectionResult: {
        indexStatusResult: {
          verdict: "PASS",
          indexingState: "INDEXING_ALLOWED",
          robotsTxtState: "ALLOWED",
          pageFetchState: "SUCCESSFUL",
          lastCrawlTime: "2026-11-18T12:00:00.123456789Z",
          googleCanonical: context.targetUrl,
          userCanonical: context.targetUrl,
          crawledAs: "MOBILE",
          coverageState: "PRIVATE_PROVIDER_TEXT",
        },
      },
    },
  };
  return { context, raw };
}
function evaluate(f) {
  const artifactText = JSON.stringify(f.raw);
  return evaluateUrlInspection(f.context, {
    sourceId: "inspection",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  });
}
it("preserves provider observations separately from owner checks and current live state", () => {
  const result = evaluate(fixture());
  expect(result.checks.map((c) => c.status)).toEqual(["pass", "pass"]);
  expect(result.observation).toMatchObject({
    verdict: "PASS",
    indexingState: "INDEXING_ALLOWED",
    lastCrawlTime: "2026-11-18T12:00:00.123456789Z",
    crawledAs: "MOBILE",
  });
  expect(result.liveIndexability).toBe("unknown");
  expect(result.executionAuthenticated).toBe(false);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_PROVIDER_TEXT");
});
it("separates missing owner intent from missing provider evidence by rule", () => {
  const f = fixture();
  f.context.expectedIndexed = null;
  delete f.raw.response.inspectionResult.indexStatusResult.googleCanonical;
  const requests = evaluate(f).dataRequests;
  expect(
    requests.find((r) => r.reason === "missing-owner-intent"),
  ).toMatchObject({
    ruleIds: ["gsc-indexing-owner-intent"],
    acceptedFormats: ["owner-indexing-policy-json"],
    ownerRole: "seo-owner",
  });
  expect(
    requests.find((r) => r.reason === "incomplete-provider-result"),
  ).toMatchObject({
    ruleIds: ["gsc-canonical-owner-intent"],
    acceptedFormats: ["gsc-url-inspection-v1"],
    ownerRole: "search-console-owner",
  });
});
it.each(["NEUTRAL", "FAIL"])(
  "reports %s without equating exclusion to a site defect",
  (verdict) => {
    const f = fixture();
    f.raw.response.inspectionResult.indexStatusResult.verdict = verdict;
    f.context.expectedIndexed = null;
    f.context.expectedCanonical = null;
    expect(evaluate(f).checks.map((c) => c.status)).toEqual([
      "unknown",
      "unknown",
    ]);
    f.context.expectedIndexed = true;
    expect(evaluate(f).checks[0].status).toBe("fail");
    f.context.expectedIndexed = false;
    expect(evaluate(f).checks[0].status).toBe("pass");
  },
);
it("does not infer indexed status from INDEXING_ALLOWED or canonical presence", () => {
  const f = fixture();
  delete f.raw.response.inspectionResult.indexStatusResult.verdict;
  expect(evaluate(f).checks[0].status).toBe("unknown");
});
it("keeps missing and future enums unknown", () => {
  const f = fixture();
  f.raw.response.inspectionResult.indexStatusResult.verdict = "FUTURE_VERDICT";
  expect(evaluate(f).checks[0].status).toBe("unknown");
  delete f.raw.response.inspectionResult.indexStatusResult;
  expect(evaluate(f).checks.every((c) => c.status === "unknown")).toBe(true);
});
it("preserves provider canonical differences without blaming local DOM", () => {
  const f = fixture();
  f.raw.response.inspectionResult.indexStatusResult.googleCanonical =
    "https://other.example/b";
  const r = evaluate(f);
  expect(r.checks[1].status).toBe("fail");
  expect(r.observation.userCanonical).toBe(f.context.targetUrl);
});
it("expires exactly and retains historical observations", () => {
  const f = fixture();
  f.context.assessmentAt = "2026-11-19T12:30:00Z";
  const r = evaluate(f);
  expect(r.checks.every((c) => c.status === "unknown")).toBe(true);
  expect(r.observation.verdict).toBe("PASS");
  expect(r.dataRequests.some((r) => r.reason === "expired-inspection")).toBe(
    true,
  );
});
it.each([
  "customer",
  "url",
  "property",
  "future",
  "crawl-future",
  "bad-date",
  "bad-hash",
  "wrong-type",
  "unknown-envelope",
])("rejects %s", (kind) => {
  const f = fixture();
  if (kind === "customer") f.raw.scope.customerId = "other";
  if (kind === "url") f.raw.request.inspectionUrl = "https://example.com/b";
  if (kind === "property") f.raw.request.siteUrl = "sc-domain:other.com";
  if (kind === "future") f.raw.retrievedAt = "2026-11-19T12:01:00Z";
  if (kind === "crawl-future")
    f.raw.response.inspectionResult.indexStatusResult.lastCrawlTime =
      "2026-11-19T11:30:00.000000001Z";
  if (kind === "bad-date")
    f.raw.response.inspectionResult.indexStatusResult.lastCrawlTime =
      "2026-02-30T11:30:00Z";
  if (kind === "wrong-type")
    f.raw.response.inspectionResult.indexStatusResult.verdict = {
      value: "PASS",
    };
  if (kind === "unknown-envelope") f.raw.trusted = true;
  if (kind === "bad-hash")
    expect(() =>
      evaluateUrlInspection(f.context, {
        sourceId: "x",
        artifactText: JSON.stringify(f.raw),
        artifactHash: "a".repeat(64),
      }),
    ).toThrow();
  else expect(() => evaluate(f)).toThrow();
});
it.each([
  "https://example.com/",
  "https://example.com/a/",
  "sc-domain:example.com",
])("supports bound property %s", (property) => {
  const f = fixture();
  f.context.property = property;
  f.raw.request.siteUrl = property;
  if (property.endsWith("a/")) {
    f.context.targetUrl = "https://example.com/a/b";
    f.raw.request.inspectionUrl = f.context.targetUrl;
  }
  expect(() => evaluate(f)).not.toThrow();
});
it.each([
  "https://example.com/ab",
  "https://example.com.evil/a",
  "https://otherexample.com/a",
  "http://example.com/a",
])("rejects URL outside prefix property: %s", (url) => {
  const f = fixture();
  f.context.property = "https://example.com/a/";
  f.raw.request.siteUrl = f.context.property;
  f.context.targetUrl = url;
  f.raw.request.inspectionUrl = url;
  expect(() => evaluate(f)).toThrow();
});
it("rejects duplicate JSON members with sanitized errors", () => {
  const f = fixture();
  const artifactText =
    '{"schemaVersion":1,"schemaVersion":1,"private":"SECRET"}';
  expect(() =>
    evaluateUrlInspection(f.context, {
      sourceId: "x",
      artifactText,
      artifactHash: createHash("sha256").update(artifactText).digest("hex"),
    }),
  ).toThrow(/ambiguous/);
});
it("rejects sub-millisecond host receipt precision instead of emitting an expired pass", () => {
  const f = fixture();
  f.raw.retrievedAt = "2026-11-19T11:30:00.000000001Z";
  f.context.assessmentAt = "2026-11-19T12:30:00Z";
  expect(() => evaluate(f)).toThrow(/precision/);
});
