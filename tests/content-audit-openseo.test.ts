import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error packaged JavaScript
import {
  prepareOpenSeoReport,
  planOpenSeoReads,
} from "../skills/content-search-audit/scripts/lib/openseo-report.mjs";

const target = "https://example.com/learn";
const project = { id: "p1", domain: "example.com" };
const date = "2026-11-20T12:00:00.000Z";
const request = {
  projectId: "p1",
  startDate: "2026-10-20",
  endDate: "2026-11-16",
  dimensions: ["page"],
  type: "web",
  dataState: "final",
};
function snapshot(
  response: Record<string, unknown>,
  tool = "get_search_console_performance",
  toolRequest: object = request,
) {
  const responseText = JSON.stringify(response);
  return {
    tool,
    capturedAt: date,
    request: toolRequest,
    responseText,
    responseHash: createHash("sha256").update(responseText).digest("hex"),
  };
}
function evidence(...receipts: ReturnType<typeof snapshot>[]) {
  return {
    schemaVersion: 1,
    synthetic: true,
    host: "codex",
    target,
    project,
    searchConsoleProperty: "sc-domain:example.com",
    receipts,
  };
}
const context = { reportTime: date, targets: [target], locale: "vi" };
const response = {
  ok: true,
  siteUrl: "sc-domain:example.com",
  startDate: request.startDate,
  endDate: request.endDate,
  dimensions: ["page"],
  hasMore: true,
  rows: [
    { keys: [target], clicks: 0, impressions: 100, ctr: 0, position: 12.1 },
  ],
};

it("requires an explicit project choice for ambiguous domains and never picks a different workspace candidate automatically", () => {
  expect(planOpenSeoReads({ target, projects: [project] })).toMatchObject({
    status: "ready",
    projectId: "p1",
  });
  expect(
    planOpenSeoReads({ target, projects: [project, { ...project, id: "p2" }] }),
  ).toMatchObject({ status: "project-choice-required" });
  expect(
    planOpenSeoReads({
      target,
      projects: [{ ...project, domain: "example.com.evil.test" }],
    }),
  ).toMatchObject({ status: "project-not-found" });
  expect(
    planOpenSeoReads({
      target,
      projects: [project],
      projectId: "not-in-session",
    }),
  ).toMatchObject({ status: "project-mismatch" });
});

it("preserves a measured zero and pagination without treating supplied receipts as authenticated exports", () => {
  const result = prepareOpenSeoReport(evidence(snapshot(response)), context);
  const report = JSON.stringify(result.sections);
  expect(report).toContain("100");
  expect(report).toContain("0%");
  expect(report).toContain("Còn dữ liệu");
  expect(report).toContain("Dữ liệu mẫu tổng hợp");
  expect(report).toContain("Đối chiếu truy vấn trước khi sửa");
  expect(report).not.toContain("responseText");
  expect(JSON.parse(result.documents["openseo-evidence.json"])).toMatchObject({
    providerAuthenticated: false,
    project,
    target,
  });
});

it("stops cross-property, cross-project, cross-target and modified receipts", () => {
  expect(() =>
    prepareOpenSeoReport(
      evidence(snapshot({ ...response, siteUrl: "sc-domain:other.test" })),
      context,
    ),
  ).toThrow(/property/i);
  expect(() =>
    prepareOpenSeoReport(
      evidence(snapshot({ ...response, meta: { projectId: "p2" } })),
      context,
    ),
  ).toThrow(/project/i);
  expect(() =>
    prepareOpenSeoReport(evidence(snapshot(response)), {
      ...context,
      targets: ["https://other.test/"],
    }),
  ).toThrow(/target/i);
  const receipt = snapshot(response);
  expect(() =>
    prepareOpenSeoReport(
      evidence({ ...receipt, responseText: receipt.responseText + " " }),
      context,
    ),
  ).toThrow(/hash/i);
});

it("keeps disconnected and empty reads out of measured rows", () => {
  const disconnected = prepareOpenSeoReport(
    evidence(snapshot({ ok: false, connectionRequired: true })),
    context,
  );
  expect(JSON.stringify(disconnected.sections)).toContain("disconnected");
  const empty = prepareOpenSeoReport(
    evidence(snapshot({ ...response, rows: [], hasMore: false })),
    context,
  );
  expect(JSON.stringify(empty.sections)).toContain("no-rows");
});

it("accepts a scoped GA4 property aggregate and refuses a substituted property", () => {
  const summary = {
    status: "ok",
    source: { provider: "google_analytics", propertyId: "123" },
    request: {
      resolvedDateRange: request,
      channel: "organic_search",
      propertyTimeZone: "Asia/Ho_Chi_Minh",
    },
    current: { sessions: 8, keyEvents: 0, purchaseRevenue: 300 },
    reportMetadata: { hasLimitedData: true },
  };
  const bundle = {
    ...evidence(snapshot(summary, "get_google_analytics_organic_overview")),
    analyticsProperty: "properties/123",
  };
  const rows = prepareOpenSeoReport(bundle, context).sections.at(-1).rows;
  expect(rows).toEqual([
    ["sessions", 8],
    ["keyEvents", 0],
  ]);
  expect(() =>
    prepareOpenSeoReport(
      { ...bundle, analyticsProperty: "properties/124" },
      context,
    ),
  ).toThrow(/property mismatch/i);
});

it("keeps saved crawl rows in the audited inventory and tracks truncated results", () => {
  const response = {
    page: 1,
    total: 10,
    pages: [
      { url: target, statusCode: 200, fetchClass: "ok" },
      { url: "https://example.com/another" },
    ],
  };
  const bundle = evidence(
    snapshot(response, "get_audit_pages", {
      projectId: "p1",
      auditId: "audit-1",
      page: 1,
      limit: 2,
    }),
  );
  const section = prepareOpenSeoReport(bundle, context).sections.at(-1);
  expect(section.rows).toEqual([[target, 200, "ok"]]);
  expect(section.text).toContain("1 rows outside the audit inventory");
  expect(section.text).toContain("partial");
});

it("rejects filters and offsets that would remove context from a Search Console claim", () => {
  for (const extra of [
    { filters: [{ dimension: "country", expression: "usa" }] },
    { startRow: 10 },
    { minPosition: 4 },
  ]) {
    expect(() =>
      prepareOpenSeoReport(
        evidence(
          snapshot(response, "get_search_console_performance", {
            ...request,
            ...extra,
          }),
        ),
        context,
      ),
    ).toThrow(/unfiltered first page/i);
  }
});
