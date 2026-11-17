import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  createCheckPlan,
  evaluateChecks,
  mergeReviewedChecks,
} from "../skills/content-search-audit/scripts/lib/checks.mjs";
const registry = JSON.parse(
  await readFile("skills/content-search-audit/rules/core.json", "utf8"),
);
const item = { itemId: "page", state: "pending" };
it("plans every registered dimension without using missing data to drop rules", () => {
  const plan = createCheckPlan(item, registry);
  expect(plan.requiredRuleIds).toHaveLength(26);
  expect(new Set(registry.rules.map((rule) => rule.dimension))).toEqual(
    new Set(["quality", "seo", "aio", "aeo", "geo", "portfolio"]),
  );
});
it("returns unknown for all missing evidence, never a fabricated pass", () => {
  const results = evaluateChecks(item, [], registry);
  expect(results).toHaveLength(26);
  expect(results.every((result) => result.status === "unknown")).toBe(true);
});
it("checks transport and extracted text without claiming indexing or content quality", () => {
  const evidence = [
    {
      evidenceId: "http",
      itemId: "page",
      kind: "http-response",
      value: { status: 200 },
    },
    {
      evidenceId: "text",
      itemId: "page",
      kind: "extracted-text",
      value: "Readable",
    },
  ];
  const results = evaluateChecks(item, evidence, registry);
  expect(
    results.find((result) => result.ruleId === "seo-response")?.status,
  ).toBe("pass");
  expect(
    results.find((result) => result.ruleId === "quality-readable-text")?.status,
  ).toBe("pass");
  expect(
    results.find((result) => result.ruleId === "seo-index-controls")?.status,
  ).toBe("unknown");
  const failing = evaluateChecks(
    item,
    [
      { ...evidence[0], value: { status: 404 } },
      { ...evidence[1], value: "  " },
    ],
    registry,
  );
  expect(failing.filter((result) => result.status === "fail")).toHaveLength(2);
});
it("requires host review for semantic rules even when all evidence kinds exist", () => {
  const rule = registry.rules.find(
    (rule) => rule.ruleId === "quality-task-fit",
  );
  const evidence = rule.requiredEvidence.map((kind: string) => ({
    evidenceId: kind,
    itemId: "page",
    kind,
    value: "supplied data",
  }));
  expect(
    evaluateChecks(item, evidence, { ...registry, rules: [rule] })[0].status,
  ).toBe("unknown");
});
it.each([
  { kind: "raw-html", value: "<html><body>Product</body></html>" },
  { kind: "extracted-text", value: "Product description without markup" },
  { kind: "schema-extraction", value: { jsonLd: [], source: "raw-html" } },
  {
    kind: "schema-extraction",
    value: {
      jsonLd: [{ "@type": "Product", name: "Product" }],
      source: "raw-html",
    },
  },
])(
  "does not turn $kind presence or absence into a schema verdict",
  (capture) => {
    const evidence = [
      {
        evidenceId: "content",
        itemId: "page",
        kind: "content",
        value: "Product",
      },
      { evidenceId: "capture", itemId: "page", ...capture },
    ];
    const check = evaluateChecks(item, evidence, registry).find(
      (result) => result.ruleId === "seo-structured-data",
    );
    expect(check?.status).toBe("unknown");
    expect(check?.evidenceIds).toContain("content");
    if (capture.kind !== "schema-extraction") {
      expect(check?.reason).toContain(
        "Missing required evidence: schema-extraction",
      );
      expect(() =>
        mergeReviewedChecks(item, evidence, registry, [
          {
            ruleId: "seo-structured-data",
            status: "fail",
            reason: "Schema was not seen in the supplied text",
            evidenceIds: ["content", "capture"],
            reviewer: "host",
            reviewedAt: "2026-11-16T00:00:00Z",
          },
        ]),
      ).toThrow(/required evidence/i);
    } else {
      expect(check?.reason).toContain("Semantic review");
    }
  },
);
it("keeps measured GEO unknown after a supported crawler-policy review", () => {
  const evidence = [
    {
      evidenceId: "policy",
      itemId: "page",
      kind: "crawler-policy",
      value: "Declared search crawler is allowed",
    },
    {
      evidenceId: "intent",
      itemId: "page",
      kind: "publisher-intent",
      value: "Allow search discovery",
    },
  ];
  const review = {
    ruleId: "aio-crawler-policy",
    status: "pass",
    reason: "The supplied policy matches declared search-discovery intent",
    evidenceIds: ["policy", "intent"],
    reviewer: "host",
    reviewedAt: "2026-11-16T00:00:00Z",
  };
  const checks = mergeReviewedChecks(item, evidence, registry, [review]);
  expect(checks.find((check) => check.ruleId === review.ruleId)?.status).toBe(
    "pass",
  );
  const geo = checks.filter((check) => check.dimension === "geo");
  expect(geo).toHaveLength(3);
  expect(
    geo.every(
      (check) =>
        check.status === "unknown" && check.reason.includes("ai-observations"),
    ),
  ).toBe(true);
  expect(() =>
    mergeReviewedChecks(item, evidence, registry, [
      {
        ...review,
        ruleId: "geo-observed-presence",
        reason:
          "The crawler can access the page, therefore the engine cites it",
      },
    ]),
  ).toThrow(/required evidence/i);
});
it("rejects duplicate evidence, unknown modes and incomplete registry definitions", () => {
  const record = {
    evidenceId: "x",
    itemId: "page",
    kind: "content",
    value: "text",
  };
  expect(() => evaluateChecks(item, [record, record], registry)).toThrow(
    /duplicate/i,
  );
  expect(() =>
    createCheckPlan(item, {
      ...registry,
      rules: [{ ...registry.rules[0], mode: "invent-score" }],
    }),
  ).toThrow(/mode/i);
  expect(() =>
    createCheckPlan(item, {
      ...registry,
      rules: [{ ...registry.rules[0], requiredEvidence: [] }],
    }),
  ).toThrow(/evidence/i);
});
it("does not reuse evidence from another page or resolve conflicting measurements", () => {
  const record = {
    evidenceId: "x",
    itemId: "other",
    kind: "http-response",
    value: { status: 200 },
  };
  expect(
    evaluateChecks(item, [record], registry).find(
      (result) => result.ruleId === "seo-response",
    )?.status,
  ).toBe("unknown");
  const results = evaluateChecks(
    item,
    [
      { ...record, itemId: "page" },
      { ...record, evidenceId: "y", itemId: "page", value: { status: 500 } },
    ],
    registry,
  );
  expect(
    results.find((result) => result.ruleId === "seo-response")?.status,
  ).toBe("unknown");
});

it("accepts evidence-backed semantic reviews while retaining unresolved rules", () => {
  const evidence = [
    {
      evidenceId: "content",
      itemId: "page",
      kind: "content",
      value: "Page text",
    },
    {
      evidenceId: "audience",
      itemId: "page",
      kind: "audience-context",
      value: "Audience task",
    },
  ];
  const review = {
    ruleId: "quality-task-fit",
    status: "pass",
    reason: "Page text answers the documented task",
    evidenceIds: ["content", "audience"],
    reviewer: "host",
    reviewedAt: "2026-11-16T00:00:00Z",
  };
  const results = mergeReviewedChecks(item, evidence, registry, [review]);
  expect(
    results.find((result) => result.ruleId === review.ruleId)?.status,
  ).toBe("pass");
  expect(
    results.find((result) => result.ruleId === "geo-observed-presence")?.status,
  ).toBe("unknown");
  expect(() =>
    mergeReviewedChecks(item, evidence, registry, [
      { ...review, evidenceIds: ["content"] },
    ]),
  ).toThrow(/required evidence/i);
  expect(() =>
    mergeReviewedChecks(item, evidence, registry, [
      { ...review, evidenceIds: ["missing"] },
    ]),
  ).toThrow(/evidence reference/i);
  expect(() =>
    mergeReviewedChecks(item, evidence, registry, [review, review]),
  ).toThrow(/duplicate/i);
});
it("requires documented applicability for not-applicable and rejects unknown rule reviews", () => {
  const evidence = [
    {
      evidenceId: "scope",
      itemId: "page",
      kind: "scope",
      value: "No video content",
    },
  ];
  const review = {
    ruleId: "quality-accessible-media",
    status: "not-applicable",
    reason: "No informative media in the supplied complete item",
    evidenceIds: ["scope"],
    reviewer: "host",
    reviewedAt: "2026-11-16T00:00:00Z",
  };
  expect(
    mergeReviewedChecks(item, evidence, registry, [review]).find(
      (result) => result.ruleId === review.ruleId,
    )?.status,
  ).toBe("not-applicable");
  expect(() =>
    mergeReviewedChecks(item, evidence, registry, [
      { ...review, evidenceIds: [] },
    ]),
  ).toThrow(/evidence/i);
  expect(() =>
    mergeReviewedChecks(item, evidence, registry, [
      { ...review, ruleId: "unregistered" },
    ]),
  ).toThrow(/rule/i);
});
