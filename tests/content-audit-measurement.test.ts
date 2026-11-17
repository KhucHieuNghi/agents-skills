import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { importMeasurements } from "../skills/content-search-audit/scripts/lib/measurements.mjs";
const response = "Example brand is useful. Source: https://example.com/page";
const hash = createHash("sha256").update(response).digest("hex");
const metadata = {
  brand: "Example",
  brandHosts: ["example.com"],
  artifacts: { answer: response },
  synthetic: false,
};
function observation(id = "one") {
  return {
    observationId: id,
    engine: "Example engine",
    surface: "consumer-ui",
    model: "unknown",
    searchMode: "enabled",
    locale: "vi-VN",
    market: "VN",
    cohortId: "core",
    cohortVersion: "1",
    promptId: "question-1",
    prompt: "Which product meets this need?",
    capturedAt: "2026-11-16T01:00:00Z",
    repetition: 1,
    status: "captured",
    responseArtifact: "answer",
    responseHash: hash,
    brandMentioned: true,
    citations: ["https://example.com/page"],
    annotationMethod: "human-review",
  };
}
it("computes response-level mention and citation rates from verified supplied artifacts", () => {
  const records = [
    observation(),
    {
      ...observation("two"),
      brandMentioned: false,
      citations: [],
      repetition: 2,
    },
  ];
  const result = importMeasurements(records, metadata);
  const group = result.groups[0];
  expect(group.mention).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
  expect(group.citation).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
  expect(group.capturedResponses).toBe(2);
  expect(result.synthetic).toBe(false);
});
it("keeps API, UI, locale and cohort versions in separate groups", () => {
  const result = importMeasurements(
    [
      observation(),
      { ...observation("api"), surface: "api" },
      { ...observation("en"), locale: "en-US" },
      { ...observation("v2"), cohortVersion: "2" },
    ],
    metadata,
  );
  expect(result.groups).toHaveLength(4);
});
it("retains unknowns and errors without counting them as negative observations", () => {
  const result = importMeasurements(
    [
      { ...observation(), brandMentioned: null, citations: null },
      {
        ...observation("error"),
        status: "error",
        errorReason: "Capture timeout",
        responseArtifact: undefined,
        responseHash: undefined,
        brandMentioned: null,
        citations: null,
      },
    ],
    metadata,
  );
  expect(result.groups[0].mention).toEqual({
    numerator: 0,
    denominator: 0,
    rate: null,
  });
  expect(result.groups[0].citation.rate).toBeNull();
  expect(result.groups[0].captureErrors).toBe(1);
  expect(importMeasurements([], metadata).groups).toEqual([]);
});
it("deduplicates identical imports and rejects conflicting reuse of an observation ID", () => {
  expect(
    importMeasurements([observation(), observation()], metadata).observations,
  ).toHaveLength(1);
  expect(() =>
    importMeasurements(
      [observation(), { ...observation(), brandMentioned: false }],
      metadata,
    ),
  ).toThrow(/conflicting/i);
});
it("rejects absent or modified artifacts and malformed metadata", () => {
  expect(() =>
    importMeasurements([observation()], { ...metadata, artifacts: {} }),
  ).toThrow(/artifact/i);
  expect(() =>
    importMeasurements([observation()], {
      ...metadata,
      artifacts: { answer: "changed" },
    }),
  ).toThrow(/hash/i);
  expect(() =>
    importMeasurements(
      [{ ...observation(), capturedAt: "yesterday" }],
      metadata,
    ),
  ).toThrow(/timestamp/i);
  expect(() =>
    importMeasurements(
      [{ ...observation(), citations: ["javascript:alert(1)"] }],
      metadata,
    ),
  ).toThrow(/citation/i);
  expect(() =>
    importMeasurements([observation()], { ...metadata, synthetic: undefined }),
  ).toThrow(/synthetic/i);
});
it("does not match lookalike domains and preserves synthetic labeling", () => {
  const result = importMeasurements(
    [
      {
        ...observation(),
        citations: ["https://example.com.attacker.test/path"],
      },
    ],
    { ...metadata, synthetic: true },
  );
  expect(result.groups[0].citation.rate).toBe(0);
  expect(result.synthetic).toBe(true);
});

it("rejects changed prompt text under the same cohort version and prompt ID", () => {
  expect(() =>
    importMeasurements(
      [
        observation(),
        { ...observation("changed"), prompt: "An entirely different question" },
      ],
      metadata,
    ),
  ).toThrow(/prompt.*version/i);
});
