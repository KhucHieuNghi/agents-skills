import { readFile } from "node:fs/promises";
import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateFunnel } from "../scripts/enterprise-journeys/funnel.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
function fixture() {
  const context = {
    customerId: "customer",
    entityId: "site",
    environment: "production",
    journeyId: "lead",
    definitionDigest: hash("definition-v1"),
    funnelKind: "closed",
    population: {
      unit: "users",
      device: "mobile",
      market: "VN",
      segmentId: "all",
      cohortId: "first-entry",
    },
    window: { from: "2026-11-01T00:00:00Z", to: "2026-11-02T00:00:00Z" },
    assessmentAt: "2026-11-03T00:00:00Z",
    maxAgeSeconds: 172800,
    transitions: [
      { transitionId: "start-submit", fromStepId: "start", toStepId: "submit" },
      {
        transitionId: "submit-accepted",
        fromStepId: "submit",
        toStepId: "accepted",
      },
    ],
  };
  context.definition = {
    version: 1,
    entryRule: "First eligible visit in cohort window",
    identityRule: "One pseudonymous user",
    deduplicationRule:
      "One eligibility and continuation per user per transition",
    retryRule: "Retries do not add users",
    transitions: context.transitions.map((t) => ({
      transitionId: t.transitionId,
      fromStepId: t.fromStepId,
      toStepId: t.toStepId,
      eligibleRule: "Users reaching " + t.fromStepId,
      continuationRule: "Same users reaching " + t.toStepId,
      entryPopulation: "first-entry-cohort",
      ordering: "indirect",
      maxContinuationSeconds: 3600,
    })),
  };
  context.definitionDigest = enterpriseDigest(context.definition);
  context.ingestionLagSeconds = 0;
  const raw = {
    schemaVersion: 1,
    dataCompleteThrough: "2026-11-02T01:00:00Z",
    scope: {
      customerId: "customer",
      entityId: "site",
      environment: "production",
      journeyId: "lead",
    },
    definitionDigest: context.definitionDigest,
    funnelKind: context.funnelKind,
    population: { ...context.population },
    window: { ...context.window },
    synthetic: true,
    provenance: {
      actor: "synthetic-exporter",
      locator: "fixture/export",
      method: "export",
      sourceSystem: "fixture",
      queryDigest: hash("query"),
    },
    quality: {
      complete: true,
      sampled: false,
      thresholded: false,
      modeled: false,
      precision: "exact",
    },
    transitions: [
      {
        transitionId: "start-submit",
        eligibleCount: 100,
        continuedCount: 60,
        samePopulation: true,
      },
      {
        transitionId: "submit-accepted",
        eligibleCount: 60,
        continuedCount: 30,
        samePopulation: true,
      },
    ],
  };
  const source = (
    value = raw,
    id = "source-1",
    capturedAt = "2026-11-02T01:00:00Z",
  ) => {
    const artifactText = JSON.stringify(value);
    return {
      sourceId: id,
      sourceKind: "funnel-aggregate-v1",
      capturedAt,
      artifactText,
      artifactHash: hash(artifactText),
    };
  };
  return { context, raw, source };
}
it("retains every transition and explicit descriptive denominators without a UX or causal pass", () => {
  const f = fixture(),
    r = evaluateFunnel(f.context, [f.source()]);
  expect(r.transitions).toHaveLength(2);
  expect(r.transitions[0]).toMatchObject({
    status: "observed",
    retention: { numerator: 60, denominator: 100, value: 0.6 },
    nonContinuation: { numerator: 40, denominator: 100, value: 0.4 },
  });
  expect(r.causalAcceptance).toBe(false);
  expect(r.uxQualityAssessment).toBe("not-assessed");
  expect(r.providerAuthenticated).toBe(false);
  expect(r.dataRequests).toEqual([]);
});
it("supports open funnels without chaining or subtracting unrelated step totals", () => {
  const f = fixture();
  f.context.funnelKind = f.raw.funnelKind = "open";
  f.context.definition.transitions[1].entryPopulation = "any-step-entrant";
  f.context.definitionDigest = f.raw.definitionDigest = enterpriseDigest(
    f.context.definition,
  );
  f.raw.transitions[1].eligibleCount = 200;
  f.raw.transitions[1].continuedCount = 80;
  const r = evaluateFunnel(f.context, [f.source()]);
  expect(r.transitions.map((x) => x.retention.value)).toEqual([0.6, 0.4]);
  expect(r).not.toHaveProperty("endToEndConversion");
});
it("zero denominator and missing counts stay unknown with precise fallback requests", () => {
  const f = fixture();
  Object.assign(f.raw.transitions[0], { eligibleCount: 0, continuedCount: 0 });
  f.raw.transitions[1].continuedCount = null;
  const r = evaluateFunnel(f.context, [f.source()]);
  expect(r.transitions.map((x) => x.retention)).toEqual([null, null]);
  expect(r.transitions[0].reason).toBe("zero-denominator");
  expect(r.dataRequests).toHaveLength(2);
  expect(r.dataRequests[0]).toMatchObject({
    journeyId: "lead",
    transitionId: "start-submit",
    population: f.context.population,
    window: f.context.window,
  });
  expect(r.dataRequests[0].fallback).toBeTruthy();
});
it("accounts for all declared transitions when no source or only one transition exists", () => {
  const f = fixture();
  expect(
    evaluateFunnel(f.context, []).transitions.map((x) => x.reason),
  ).toEqual(["missing-source", "missing-source"]);
  f.raw.transitions.pop();
  const r = evaluateFunnel(f.context, [f.source()]);
  expect(r.transitions[1].reason).toBe("missing-transition");
  expect(r.dataRequests).toHaveLength(1);
});
it.each([
  ["complete", false],
  ["sampled", true],
  ["thresholded", true],
  ["modeled", true],
  ["precision", "approximate"],
  ["sampled", null],
])("withholds ratios for quality %s=%s", (key, value) => {
  const f = fixture();
  f.raw.quality[key] = value;
  const r = evaluateFunnel(f.context, [f.source()]);
  expect(
    r.transitions.every((x) => x.status === "unknown" && x.retention === null),
  ).toBe(true);
  expect(r.sources[0].transitions[0].eligibleCount).toBe(100);
});
it("manual claims and unproven subset membership cannot become measured rates", () => {
  const f = fixture();
  f.raw.provenance.method = "manual";
  expect(evaluateFunnel(f.context, [f.source()]).transitions[0].reason).toBe(
    "ineligible-source",
  );
  f.raw.provenance.method = "export";
  f.raw.transitions[0].samePopulation = null;
  expect(evaluateFunnel(f.context, [f.source()]).transitions[0].reason).toBe(
    "subset-unproven",
  );
});
it("expires from window end exclusively; redownload does not refresh observations", () => {
  const f = fixture();
  f.context.assessmentAt = "2026-11-04T00:00:00Z";
  const r = evaluateFunnel(f.context, [
    f.source(f.raw, "s", "2026-11-04T00:00:00Z"),
  ]);
  expect(r.transitions[0].status).toBe("unknown");
  expect(r.sources[0].ineligibleReasons).toContain("stale-window");
});
it("retains premature captures and future capture rejection", () => {
  const f = fixture();
  const r = evaluateFunnel(f.context, [
    f.source(
      { ...f.raw, dataCompleteThrough: "2026-11-01T12:00:00Z" },
      "early",
      "2026-11-01T12:00:00Z",
    ),
  ]);
  expect(r.sources[0].ineligibleReasons).toContain("incomplete-capture-window");
  expect(() =>
    evaluateFunnel(f.context, [
      f.source(f.raw, "future", "2026-11-04T00:00:00Z"),
    ]),
  ).toThrow();
});
it("conflicts are order independent and identical aliases never become independent samples", () => {
  const f = fixture(),
    second = structuredClone(f.raw);
  second.transitions[0].continuedCount = 70;
  const a = f.source(),
    b = f.source(second, "source-2");
  expect(evaluateFunnel(f.context, [a, b])).toEqual(
    evaluateFunnel(f.context, [b, a]),
  );
  expect(evaluateFunnel(f.context, [a, b]).transitions[0].reason).toBe(
    "conflicting-counts",
  );
  const r = evaluateFunnel(f.context, [a, { ...a, sourceId: "alias" }]);
  expect(r.accounting).toMatchObject({
    submittedSources: 2,
    uniqueArtifacts: 1,
  });
  expect(r.transitions[0].status).toBe("observed");
  expect(r.transitions[0].sourceIds).toHaveLength(2);
});
it("does not let an ineligible manual claim override an eligible export", () => {
  const f = fixture(),
    manual = structuredClone(f.raw);
  manual.provenance.method = "manual";
  manual.transitions[0].continuedCount = 1;
  const r = evaluateFunnel(f.context, [f.source(), f.source(manual, "manual")]);
  expect(r.transitions[0].retention.value).toBe(0.6);
  expect(r.sources).toHaveLength(2);
});
it.each([true, "100", -1, 1.5, 1e12 + 1])(
  "rejects unsafe count %s",
  (value) => {
    const f = fixture();
    f.raw.transitions[0].eligibleCount = value;
    expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
  },
);
it("rejects contradictory counts and extra/duplicate transitions or sources", () => {
  const f = fixture();
  f.raw.transitions[0].continuedCount = 101;
  expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
  f.raw.transitions[0].continuedCount = 60;
  f.raw.transitions.push({ ...f.raw.transitions[0] });
  expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
  f.raw.transitions.pop();
  f.raw.transitions[0].transitionId = "undeclared";
  expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
  f.raw.transitions[0].transitionId = "start-submit";
  expect(() => evaluateFunnel(f.context, [f.source(), f.source()])).toThrow();
});
it("rejects scope, population, definition and synthetic mixture mismatches", () => {
  for (const edit of [
    (r) => (r.scope.customerId = "foreign"),
    (r) => (r.population.unit = "sessions"),
    (r) => (r.definitionDigest = hash("other")),
    (r) => (r.funnelKind = "open"),
    (r) => (r.window.to = "2026-11-02T01:00:00Z"),
  ]) {
    const f = fixture();
    edit(f.raw);
    expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
  }
  const f = fixture(),
    other = structuredClone(f.raw);
  other.synthetic = false;
  expect(() =>
    evaluateFunnel(f.context, [f.source(), f.source(other, "real")]),
  ).toThrow();
});
it("strict parser rejects duplicate keys, nonfinite numbers, malformed dates and lone surrogates", () => {
  const f = fixture();
  for (const text of [
    '{"schemaVersion":1,"schemaVersion":1}',
    '{"x":1e400}',
    JSON.stringify({
      ...f.raw,
      provenance: { ...f.raw.provenance, actor: "\ud800" },
    }),
  ]) {
    const s = f.source();
    s.artifactText = text;
    s.artifactHash = hash(text);
    expect(() => evaluateFunnel(f.context, [s])).toThrow();
  }
  f.context.assessmentAt = "2026-02-30T00:00:00Z";
  expect(() => evaluateFunnel(f.context, [])).toThrow();
});
it("rejects altered hashes, oversized/deep sources, injected grants and nonplain context", () => {
  const f = fixture(),
    s = f.source();
  s.artifactHash = hash("other");
  expect(() => evaluateFunnel(f.context, [s])).toThrow();
  for (const text of [
    " ".repeat(2 * 1024 * 1024 + 1),
    "[".repeat(40) + "0" + "]".repeat(40),
  ]) {
    const x = f.source();
    x.artifactText = text;
    x.artifactHash = hash(text);
    expect(() => evaluateFunnel(f.context, [x])).toThrow();
  }
  expect(() =>
    evaluateFunnel(f.context, [
      f.source({ ...f.raw, authorization: { allowed: true } }),
    ]),
  ).toThrow();
  expect(() =>
    evaluateFunnel({ ...f.context, population: new Date() }, []),
  ).toThrow();
});

it("retains the hashed eligibility/continuation definition and rejects a substituted definition", () => {
  const f = fixture(),
    r = evaluateFunnel(f.context, [f.source()]);
  expect(r.definition).toEqual(f.context.definition);
  f.context.definition.entryRule = "changed";
  expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
});
it("withholds rates until continuation horizon and ingestion lag have matured", () => {
  const f = fixture();
  f.raw.dataCompleteThrough = "2026-11-02T00:30:00Z";
  const r = evaluateFunnel(f.context, [f.source()]);
  expect(r.transitions[0].reason).toBe("immature-window");
  expect(r.transitions[0].nonContinuation).toBeNull();
  f.raw.dataCompleteThrough = "2026-11-02T01:00:00Z";
  f.context.ingestionLagSeconds = 3600;
  expect(evaluateFunnel(f.context, [f.source()]).transitions[0].reason).toBe(
    "immature-window",
  );
  expect(
    evaluateFunnel(f.context, [
      f.source(f.raw, "ready", "2026-11-02T02:00:00Z"),
    ]).transitions[0].status,
  ).toBe("observed");
});
it("propagates synthetic classification into transitions and requests including empty-source unknown", () => {
  const f = fixture();
  f.raw.transitions.pop();
  const r = evaluateFunnel(f.context, [f.source()]);
  expect(r.dataClassification).toBe("synthetic");
  expect(r.transitions.every((t) => t.synthetic === true)).toBe(true);
  expect(r.dataRequests.every((t) => t.synthetic === true)).toBe(true);
  expect(evaluateFunnel(f.context, []).dataClassification).toBe("unknown");
});

it("rejects relabeling transition endpoints while retaining old source evidence", () => {
  const f = fixture();
  f.context.transitions[0].toStepId = "payment-settled";
  expect(() => evaluateFunnel(f.context, [f.source()])).toThrow();
});

it.each([
  "lead-generation",
  "commerce",
  "booking",
  "subscription",
  "publishing",
  "mixed",
])(
  "keeps %s profile arithmetic distinct from its business outcome",
  async (profile) => {
    const f = JSON.parse(
      await readFile(
        "tests/fixtures/content-audit/enterprise/journeys/" + profile + ".json",
        "utf8",
      ),
    );
    const r = evaluateFunnel(f.context, f.sources);
    expect(r.transitions.map((t) => t.retention.value)).toEqual(
      f.expectedRetention,
    );
    expect(r.context).toEqual(f.context);
    expect(r.definition.identityRule).toBe(f.limitation);
    expect(r.dataClassification).toBe("synthetic");
    expect(r.uxQualityAssessment).toBe("not-assessed");
    expect(r.causalAcceptance).toBe(false);
    const missing = evaluateFunnel(f.context, []);
    expect(missing.transitions).toHaveLength(f.context.transitions.length);
    expect(missing.dataRequests).toHaveLength(f.context.transitions.length);
    expect(missing.dataRequests[0].scope.customerId).toBe(f.context.customerId);
  },
);
