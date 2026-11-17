import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { importSearchConsole } from "../skills/content-search-audit/scripts/lib/search-console.mjs";
const query = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  dimensions: ["page", "country"],
  rowLimit: 1,
};
const row = {
  keys: ["https://example.com/?locale=vi", "vnm"],
  clicks: 2,
  impressions: 10,
  ctr: 0.2,
  position: 3.5,
};
function page(rows: unknown[], startRow = 0, request = query) {
  const responseText = JSON.stringify({
    rows,
    responseAggregationType: "byPage",
    metadata: { first_incomplete_date: "2026-10-31" },
  });
  return {
    request: { ...request, startRow },
    responseText,
    responseHash: createHash("sha256").update(responseText).digest("hex"),
  };
}
function fixture() {
  return {
    sourceId: "gsc",
    property: "sc-domain:example.com",
    locator: "authorized-export",
    capturedAt: "2026-11-16T00:00:00Z",
    synthetic: true,
    pages: [page([row]), page([], 1)],
  };
}
it("preserves query grain, metrics, freshness and artifact bindings without claiming population completeness", () => {
  const result = importSearchConsole(fixture());
  expect(result.paginationExhausted).toBe(true);
  expect(result.populationComplete).toBe(false);
  expect(result.totals).toBeNull();
  expect(result.rows[0].dimensions).toEqual({
    page: row.keys[0],
    country: "vnm",
  });
  expect(result.rows[0].ctr).toBe(0.2);
  expect(result.rows[0].position).toBe(3.5);
  expect(result.pages[0].metadata.first_incomplete_date).toBe("2026-10-31");
  expect(result.synthetic).toBe(true);
});
it("retains pagination work and does not invent zero rows for an empty export", () => {
  expect(
    importSearchConsole({ ...fixture(), pages: [page([row])] }).pendingQueue[0]
      .startRow,
  ).toBe(1);
  const empty = importSearchConsole({ ...fixture(), pages: [page([])] });
  expect(empty.rows).toEqual([]);
  expect(empty.totals).toBeNull();
});
it("rejects altered artifacts, page gaps, duplicate rows and changed query scope", () => {
  expect(() =>
    importSearchConsole({
      ...fixture(),
      pages: [{ ...page([row]), responseText: "{}" }],
    }),
  ).toThrow(/hash/i);
  expect(() =>
    importSearchConsole({ ...fixture(), pages: [page([row]), page([], 2)] }),
  ).toThrow(/pagination/i);
  expect(() =>
    importSearchConsole({ ...fixture(), pages: [page([row]), page([row], 1)] }),
  ).toThrow(/duplicate/i);
  expect(() =>
    importSearchConsole({
      ...fixture(),
      pages: [page([row]), page([], 1, { ...query, endDate: "2026-11-01" })],
    }),
  ).toThrow(/changed.*query/i);
});
it("rejects malformed metrics, dimension mapping, dates and query credentials", () => {
  for (const invalid of [
    { ...row, ctr: 20 },
    { ...row, clicks: -1 },
    { ...row, keys: ["missing"] },
  ])
    expect(() =>
      importSearchConsole({ ...fixture(), pages: [page([invalid])] }),
    ).toThrow(/row/i);
  expect(() =>
    importSearchConsole({
      ...fixture(),
      pages: [page([], 0, { ...query, startDate: "2026-02-30" })],
    }),
  ).toThrow(/date/i);
  const input = fixture();
  Object.assign(input.pages[0].request, { apiKey: "must not be imported" });
  expect(() => importSearchConsole(input)).toThrow(/fields/i);
});
it("keeps filter expressions inert and rejects changed aggregation", () => {
  const input = fixture();
  for (const p of input.pages)
    Object.assign(p.request, {
      dimensionFilterGroups: [
        {
          groupType: "and",
          filters: [
            {
              dimension: "query",
              operator: "includingRegex",
              expression: "(a+)+$",
            },
          ],
        },
      ],
    });
  expect(importSearchConsole(input).rows).toHaveLength(1);
  const changed = page([], 1);
  changed.responseText = JSON.stringify({
    responseAggregationType: "byProperty",
  });
  changed.responseHash = createHash("sha256")
    .update(changed.responseText)
    .digest("hex");
  expect(() =>
    importSearchConsole({ ...fixture(), pages: [page([row]), changed] }),
  ).toThrow(/aggregation/i);
});
