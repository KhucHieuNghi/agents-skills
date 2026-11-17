import { expect, it } from "vitest";
import { computeCoverage } from "../skills/content-search-audit/scripts/lib/coverage.mjs";
const run = { inventoryComplete: true, mode: "full", pendingQueue: [] };
const inventory = [
  { itemId: "a", state: "audited", requiredRuleIds: ["title", "answer"] },
];
const checks = [
  {
    itemId: "a",
    ruleId: "title",
    dimension: "seo",
    status: "fail",
    evidenceIds: ["e1"],
    reason: "Missing title in supplied HTML",
  },
  {
    itemId: "a",
    ruleId: "answer",
    dimension: "aeo",
    status: "pass",
    evidenceIds: ["e2"],
    reason: "Answers the stated question",
  },
];
it("counts completed checks independently from their pass/fail outcome", () => {
  const result = computeCoverage(inventory, checks, run);
  expect(result.complete).toBe(true);
  expect(result.audited).toBe(1);
  expect(result.dimensions.seo).toEqual({
    total: 1,
    completed: 1,
    unknown: 0,
    notApplicable: 0,
  });
});
it("does not call terminal failures, unsupported or blocked items audited", () => {
  const result = computeCoverage(
    [
      ...inventory,
      ...["failed", "blocked", "unsupported"].map((state) => ({
        itemId: state,
        state,
        reason: "Unavailable",
        requiredRuleIds: ["title"],
      })),
    ],
    checks,
    run,
  );
  expect(result.complete).toBe(false);
  expect(result.accounted).toBe(4);
  expect(result.audited).toBe(1);
  expect(result.remainingItemIds).toEqual(["blocked", "failed", "unsupported"]);
});
it("rejects full coverage for unknown discovery, sampling, queued work, or empty inventory", () => {
  for (const change of [
    { inventoryComplete: false },
    { mode: "sample" },
    { pendingQueue: ["https://example.com/b"] },
  ])
    expect(
      computeCoverage(inventory, checks, { ...run, ...change }).complete,
    ).toBe(false);
  expect(computeCoverage([], [], run).complete).toBe(false);
});
it("does not accept missing, unknown or unsupported evidence as completed checks", () => {
  expect(computeCoverage(inventory, checks.slice(0, 1), run).complete).toBe(
    false,
  );
  expect(
    computeCoverage(
      inventory,
      [{ ...checks[0], status: "unknown", evidenceIds: [] }, checks[1]],
      run,
    ).complete,
  ).toBe(false);
  expect(() =>
    computeCoverage(
      inventory,
      [{ ...checks[0], evidenceIds: [] }, checks[1]],
      run,
    ),
  ).toThrow(/evidence/i);
  expect(() =>
    computeCoverage([{ ...inventory[0], requiredRuleIds: [] }], [], run),
  ).toThrow(/required/i);
});
it("allows explained exclusions without hiding them from the denominator", () => {
  const item = {
    itemId: "b",
    state: "excluded",
    reason: "Outside declared language scope",
    requiredRuleIds: [],
  };
  const result = computeCoverage([...inventory, item], checks, run);
  expect(result.complete).toBe(true);
  expect(result.total).toBe(2);
  expect(result.excluded).toBe(1);
  expect(result.inScope).toBe(1);
  expect(() =>
    computeCoverage([...inventory, { ...item, reason: "" }], checks, run),
  ).toThrow(/reason/i);
});
it("rejects duplicate records, dangling checks and invalid statuses", () => {
  expect(() =>
    computeCoverage([...inventory, ...inventory], checks, run),
  ).toThrow(/duplicate/i);
  expect(() => computeCoverage(inventory, [...checks, checks[0]], run)).toThrow(
    /duplicate/i,
  );
  expect(() =>
    computeCoverage(inventory, [{ ...checks[0], itemId: "missing" }], run),
  ).toThrow(/unknown item/i);
  expect(() =>
    computeCoverage([{ ...inventory[0], state: "done" }], checks, run),
  ).toThrow(/state/i);
});
it("requires a reason for not-applicable and separates it from pass/fail", () => {
  const result = computeCoverage(
    inventory,
    [
      checks[0],
      {
        ...checks[1],
        status: "not-applicable",
        evidenceIds: [],
        reason: "Navigation-only page",
      },
    ],
    run,
  );
  expect(result.complete).toBe(true);
  expect(result.dimensions.aeo.notApplicable).toBe(1);
  expect(() =>
    computeCoverage(
      inventory,
      [checks[0], { ...checks[1], status: "not-applicable", reason: "" }],
      run,
    ),
  ).toThrow(/reason/i);
});
