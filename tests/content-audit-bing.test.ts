import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { importBing } from "../skills/content-search-audit/scripts/lib/bing.mjs";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const metadata = {
  sourceId: "bing-fixture",
  siteUrl: "https://example.com",
  locator: "supplied-export",
  capturedAt: "2026-11-16T00:00:00Z",
  synthetic: true,
  scope: {
    locale: "unknown",
    market: "unknown",
    timezone: "unknown",
    period: "provider returned dates",
    surfaces: "Bing search",
  },
};
const row = {
  Query: "example query",
  Date: "/Date(1316156400000-0700)/",
  Clicks: 15,
  Impressions: 100,
  AvgClickPosition: 18,
  AvgImpressionPosition: 17,
};
function search(rows = [row]) {
  const responseText = JSON.stringify({ d: rows });
  return {
    ...metadata,
    kind: "search-query-stats",
    responseText,
    responseHash: hash(responseText),
  };
}
function ai(
  metrics: Record<string, unknown> = {
    citations: { kind: "exact", value: 15 },
    opportunityCitations: { kind: "range", lower: 100, upper: 200 },
  },
) {
  const sourceText =
    "Dashboard fixture: citations 15, opportunity citations 100–200";
  const responseText = JSON.stringify({
    rows: [{ dimensions: { topic: "Example" }, metrics }],
  });
  return {
    ...metadata,
    kind: "ai-performance-mapped",
    scope: {
      ...metadata.scope,
      period: "2026-10-01 to 2026-10-31",
      surfaces: "Bing supported AI surfaces, aggregate",
    },
    responseText,
    responseHash: hash(responseText),
    sourceText,
    sourceHash: hash(sourceText),
    mapping: {
      method: "manual fixture mapping",
      reviewer: "fixture reviewer",
      reviewedAt: metadata.capturedAt,
    },
  };
}
it("keeps native Bing query traffic and position denominators separate", () => {
  const result = importBing(search());
  expect(result.rows[0].dateRaw).toBe(row.Date);
  expect(result.rows[0].instant).toBe(new Date(1316156400000).toISOString());
  expect(result.rows[0].averageClickPosition).toBe(18);
  expect(result.rows[0].averageImpressionPosition).toBe(17);
  expect(result.populationComplete).toBe(false);
  expect(result.totals).toBeNull();
  expect(importBing(search([])).rows).toEqual([]);
});
it("rejects duplicate traffic, unsafe counts, malformed dates and altered bytes", () => {
  expect(() => importBing(search([row, row]))).toThrow(/duplicate/i);
  expect(() =>
    importBing(search([{ ...row, Clicks: Number.MAX_SAFE_INTEGER + 1 }])),
  ).toThrow(/row/i);
  expect(() =>
    importBing(search([{ ...row, Date: "/Date(1316156400000+9999)/" }])),
  ).toThrow(/offset/i);
  expect(() =>
    importBing({ ...search(), responseHash: "0".repeat(64) }),
  ).toThrow(/hash/i);
});
it("retains attributed source mapping and numeric ranges without inferred rates", () => {
  const input = ai();
  const result = importBing(input);
  expect(result.rows[0].metrics.opportunityCitations).toEqual({
    kind: "range",
    lower: 100,
    upper: 200,
  });
  expect(result.sourceHash).toBe(input.sourceHash);
  expect(result.mapping.reviewer).toBe("fixture reviewer");
  expect(result.totals).toBeNull();
  expect(result.populationComplete).toBe(false);
});
it("rejects false precision, range midpoints and missing source mapping", () => {
  expect(() =>
    importBing(ai({ topicSize: { kind: "exact", value: 100 } })),
  ).toThrow(/approximate/i);
  expect(() =>
    importBing(ai({ opportunityCitations: { kind: "exact", value: 150 } })),
  ).toThrow(/ranges/i);
  expect(() =>
    importBing(ai({ citations: { kind: "range", lower: 100, upper: 50 } })),
  ).toThrow(/range/i);
  expect(() => importBing({ ...ai(), mapping: null })).toThrow(/mapping/i);
  expect(() => importBing({ ...ai(), sourceText: "changed" })).toThrow(/hash/i);
});
it("keeps approximate and unavailable metrics distinct", () => {
  const result = importBing(
    ai({
      topicSize: { kind: "approximate", value: 1000 },
      citations: { kind: "unknown", reason: "not supplied" },
    }),
  );
  expect(result.rows[0].metrics.topicSize.kind).toBe("approximate");
  expect(result.rows[0].metrics.citations.value).toBeUndefined();
  expect(() =>
    importBing(
      ai({ citations: { kind: "unknown", reason: "missing", value: 0 } }),
    ),
  ).toThrow(/unknown/i);
});
