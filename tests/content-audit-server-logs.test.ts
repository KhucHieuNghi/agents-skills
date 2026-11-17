import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { importServerLogs } from "../skills/content-search-audit/scripts/lib/server-logs.mjs";
const row = {
  timestamp: "2026-11-16T00:00:00Z",
  method: "GET",
  url: "https://example.com/page?lang=vi",
  status: 200,
  userAgent: "Googlebot",
  bytesSent: 20,
  durationMs: 1.5,
};
function fixture(rows: unknown[] = [row]) {
  const sourceText = rows
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
    .join("\n");
  return {
    sourceId: "logs-fixture",
    locator: "normalized-export",
    capturedAt: "2026-11-16T01:00:00Z",
    synthetic: true,
    scope: {
      from: "2026-11-16T00:00:00Z",
      to: "2026-11-16T01:00:00Z",
      system: "fixture edge",
      filters: "none",
      exportComplete: true,
    },
    normalization: {
      method: "fixture JSONL",
      reviewer: "fixture reviewer",
      redaction: "no IP, headers or identifiers included",
      limitations: ["synthetic only"],
    },
    sourceText,
    sourceHash: createHash("sha256").update(sourceText).digest("hex"),
  };
}
it("counts observed lines without certifying bot identity or deduplicating legitimate identical requests", () => {
  const result = importServerLogs(
    fixture([row, row, { ...row, url: "https://example.com/page?lang=en" }]),
  );
  expect(result.acceptedLines).toBe(3);
  expect(result.groups).toHaveLength(2);
  expect(result.groups[0].observedRequestLines).toBe(2);
  expect(result.rows[0].crawlerIdentity).toBe("unverified");
  expect(result.populationComplete).toBe(false);
  expect(result.suppliedExportParsed).toBe(true);
});
it("retains bad lines and incomplete exports as explicit work without turning unknown status into failure", () => {
  const input = fixture([
    row,
    "not JSON",
    { ...row, status: null },
    { ...row, status: 999 },
  ]);
  input.scope.exportComplete = false;
  const result = importServerLogs(input);
  expect(result.acceptedLines).toBe(2);
  expect(result.rejectedLines).toBe(2);
  expect(result.unknownStatus).toBe(1);
  expect(result.pendingQueue).toHaveLength(3);
  expect(result.suppliedExportParsed).toBe(false);
  expect(result.pendingQueue[0].line).toBe(2);
});
it("flags repeated IDs instead of silently merging overlapping requests", () => {
  const result = importServerLogs(
    fixture([
      { ...row, requestId: "a" },
      { ...row, requestId: "a", status: 404 },
    ]),
  );
  expect(result.acceptedLines).toBe(1);
  expect(result.pendingQueue[0].reason).toMatch(/repeated/i);
});
it("rejects artifact tampering and queues unnormalized fields, dates, credentials and numeric values", () => {
  expect(() =>
    importServerLogs({ ...fixture(), sourceHash: "0".repeat(64) }),
  ).toThrow(/hash/i);
  const result = importServerLogs(
    fixture([
      { ...row, ip: "1.2.3.4" },
      { ...row, timestamp: "2026-11-15T00:00:00Z" },
      { ...row, url: "https://" + "user:pass@example.com" },
      { ...row, bytesSent: -1 },
    ]),
  );
  expect(result.acceptedLines).toBe(0);
  expect(result.rejectedLines).toBe(4);
});
it("does not invent observations for empty logs", () => {
  const result = importServerLogs(fixture([]));
  expect(result.rows).toEqual([]);
  expect(result.groups).toEqual([]);
  expect(result.populationComplete).toBe(false);
});
