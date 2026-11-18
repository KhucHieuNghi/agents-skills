import { expect, it } from "vitest";
import { prepareMeasurementReport } from "../skills/content-search-audit/scripts/lib/measurement-report.mjs";
import { studySource } from "./helpers/content-audit-study.js";

it("retains supplied historical measurements separately from absent response-level exports", () => {
  const source = studySource();
  const report = prepareMeasurementReport({ studySources: [source] });
  const bundle = JSON.parse(report.documents["study-evidence.json"]);
  expect(bundle.sources).toEqual([source]);
  expect(JSON.stringify(report.sections)).toContain("40 of 100 responses");
  expect(JSON.stringify(report.sections)).toContain("historical-study");
  expect(JSON.stringify(report.sections)).toContain(
    "No response-level AI observations attached",
  );
  expect(report.documents).not.toHaveProperty("ai-observations.jsonl");
});

it("rejects fabricated, misplaced and duplicated study evidence before rendering", () => {
  const original = studySource();
  for (const mutate of [
    (s) => {
      s.sourceHash = "0".repeat(64);
    },
    (s) => {
      s.passages[0].quote = "90 of 100 responses";
    },
    (s) => {
      s.passages[0].startLine = 1;
    },
    (s) => {
      s.passages[0].endLine = 99;
    },
    (s) => {
      s.kind = "current-brand-performance";
    },
    (s) => {
      s.synthetic = undefined;
    },
    (s) => {
      s.limitations = [];
    },
    (s) => {
      s.passages = [];
    },
  ]) {
    const source = structuredClone(original);
    mutate(source);
    expect(() => prepareMeasurementReport({ studySources: [source] })).toThrow(
      /study/i,
    );
  }
  expect(() =>
    prepareMeasurementReport({ studySources: [original, original] }),
  ).toThrow(/duplicate/i);
  expect(() => prepareMeasurementReport({ studySources: [] })).toThrow(
    /study/i,
  );
});
