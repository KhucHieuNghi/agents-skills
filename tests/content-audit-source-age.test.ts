import { expect, it } from "vitest";
import { sourceAge } from "../skills/content-search-audit/scripts/lib/source-age.mjs";
import { prepareMeasurementReport } from "../skills/content-search-audit/scripts/lib/measurement-report.mjs";
import {
  analyticsExport,
  bingExport,
  searchConsoleExport,
  serverLogExport,
} from "./helpers/content-audit-measurements.js";

const asOf = "2026-11-19T12:00:00Z";
it("distinguishes completed elapsed days from date-only UTC calendar days", () => {
  expect(sourceAge("2026-11-16T13:00:00Z", asOf)).toBe("2 full elapsed days");
  expect(sourceAge("2026-11-16T19:00:00+07:00", asOf)).toBe(
    "3 full elapsed days",
  );
  expect(sourceAge("2026-11-16", asOf)).toBe("3 UTC calendar days (date only)");
  expect(sourceAge(asOf, asOf)).toBe("0 full elapsed days");
  expect(sourceAge("2026-11-19", asOf)).toBe("0 UTC calendar days (date only)");
});
it("retains provider export dates separately from their measurement windows and bytes", () => {
  const options = {
    searchConsoleExports: [searchConsoleExport()],
    analyticsExports: [analyticsExport()],
    bingExports: [bingExport()],
    serverLogExports: [serverLogExport()],
  };
  const first = prepareMeasurementReport(options, asOf);
  const later = prepareMeasurementReport(options, "2026-11-20T12:00:00Z");
  const section = first.sections.find(
    (s) => s.title === "Measurement source ages",
  );
  expect(section.rows).toHaveLength(4);
  expect(section.rows.every((row) => row[2] === "Export captured")).toBe(true);
  expect(section.rows.every((row) => row[4] === sourceAge(row[3], asOf))).toBe(
    true,
  );
  expect(first.documents).toEqual(later.documents);
  expect(first.sections).not.toEqual(later.sections);
});
it("does not turn missing, ambiguous, invalid or future dates into zero age", () => {
  for (const value of [
    undefined,
    null,
    "",
    "yesterday",
    "2026-02-30",
    "2026-02-30T00:00:00Z",
    "2026-11-16T12:00:00",
    "2026-11-16T24:00:00Z",
  ])
    expect(sourceAge(value, asOf)).toMatch(/^Unavailable:/);
  expect(sourceAge("2026-11-20", asOf)).toContain("after report time");
  expect(sourceAge("2026-11-19T12:00:01Z", asOf)).toContain(
    "after report time",
  );
  expect(() => sourceAge("2026-11-16", "not a time")).toThrow(/report time/i);
});
