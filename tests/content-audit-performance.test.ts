import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  normalizeCruxResponse,
  evaluateCruxField,
} from "../scripts/enterprise-performance/crux.mjs";

// Synthetic native-shaped exports; no production customer or provider measurements.
function setup() {
  const context = {
    customerId: "synthetic",
    entityId: "public-site",
    environment: "production",
    assessmentAt: "2026-11-19T12:00:00Z",
    target: { kind: "url", value: "https://example.com/page" },
    formFactor: "PHONE",
    period: { from: "2026-10-21", to: "2026-11-17" },
    maxAgeDays: 7,
    authorizedNormalizedUrls: [],
  };
  const payload = {
    record: {
      key: { url: context.target.value, formFactor: "PHONE" },
      collectionPeriod: {
        firstDate: { year: 2026, month: 10, day: 21 },
        lastDate: { year: 2026, month: 11, day: 17 },
      },
      metrics: {
        largest_contentful_paint: { percentiles: { p75: 2500 } },
        interaction_to_next_paint: { percentiles: { p75: 200 } },
        cumulative_layout_shift: { percentiles: { p75: "0.10" } },
      },
    },
  };
  const source = {
    sourceId: "source-a",
    sourceKind: "crux-query-record",
    scope: {
      customerId: context.customerId,
      entityId: context.entityId,
      environment: context.environment,
    },
    request: { target: structuredClone(context.target), formFactor: "PHONE" },
    capturedAt: "2026-11-19T11:00:00Z",
    httpStatus: 200,
    artifactText: "",
    artifactHash: "",
  };
  const encode = (p = payload, s = source) => {
    s.artifactText = JSON.stringify(p);
    s.artifactHash = createHash("sha256").update(s.artifactText).digest("hex");
    return s;
  };
  encode();
  return { context, payload, source, encode };
}
const overall = (r) => r.checks.at(-1).status;
it("passes exactly three good scoped field metrics without claiming provider authentication", () => {
  const f = setup();
  const r = evaluateCruxField(f.context, [f.source]);
  expect(overall(r)).toBe("pass");
  expect(r.checks).toHaveLength(4);
  expect(r.dataRequests).toEqual([]);
  expect(r.providerAuthenticated).toBe(false);
  expect(r.records[0]).toMatchObject({
    periodTimeZone: "UTC-08:00",
    validUntil: "2026-11-25T08:00:00.000Z",
    fresh: true,
  });
});
it.each([
  ["largest_contentful_paint", 2500, "good"],
  ["largest_contentful_paint", 2501, "needs-improvement"],
  ["largest_contentful_paint", 4000, "needs-improvement"],
  ["largest_contentful_paint", 4001, "poor"],
  ["interaction_to_next_paint", 200, "good"],
  ["interaction_to_next_paint", 201, "needs-improvement"],
  ["interaction_to_next_paint", 500, "needs-improvement"],
  ["interaction_to_next_paint", 501, "poor"],
  ["cumulative_layout_shift", "0.10", "good"],
  ["cumulative_layout_shift", "0.11", "needs-improvement"],
  ["cumulative_layout_shift", "0.25", "needs-improvement"],
  ["cumulative_layout_shift", "0.26", "poor"],
])(
  "classifies native boundary %s=%s as %s",
  (metric, value, classification) => {
    const f = setup();
    f.payload.record.metrics[metric].percentiles.p75 = value;
    const r = evaluateCruxField(f.context, [f.encode()]);
    expect(
      r.checks.find((c) => c.classification === classification),
    ).toBeDefined();
    expect(overall(r)).toBe(classification === "good" ? "pass" : "fail");
  },
);
it("keeps absent INP unknown while retaining a confirmed LCP failure", () => {
  const f = setup();
  delete f.payload.record.metrics.interaction_to_next_paint;
  expect(overall(evaluateCruxField(f.context, [f.encode()]))).toBe("unknown");
  f.payload.record.metrics.largest_contentful_paint.percentiles.p75 = 5000;
  const r = evaluateCruxField(f.context, [f.encode()]);
  expect(overall(r)).toBe("fail");
  expect(r.dataRequests).toHaveLength(1);
  expect(r.dataRequests[0].instructions).toContain(
    "do not replace absent metrics with lab",
  );
});
it("produces requests for absent exports and never invents zero measurements", () => {
  const r = evaluateCruxField(setup().context, []);
  expect(overall(r)).toBe("unknown");
  expect(r.dataRequests).toHaveLength(3);
  expect(r.checks.slice(0, 3).every((c) => c.p75 === null)).toBe(true);
});
it("retains origin context without promoting it into a URL result", () => {
  const f = setup();
  f.source.request.target = { kind: "origin", value: "https://example.com" };
  delete f.payload.record.key.url;
  f.payload.record.key.origin = "https://example.com";
  const r = evaluateCruxField(f.context, [f.encode()]);
  expect(overall(r)).toBe("unknown");
  expect(r.records[0].returnedTarget.kind).toBe("origin");
  f.context.target = structuredClone(f.source.request.target);
  expect(overall(evaluateCruxField(f.context, [f.source]))).toBe("pass");
});
it("does not use ALL or desktop records for PHONE", () => {
  for (const device of ["ALL", "DESKTOP"]) {
    const f = setup();
    f.source.request.formFactor = device;
    if (device === "ALL") delete f.payload.record.key.formFactor;
    else f.payload.record.key.formFactor = device;
    expect(overall(evaluateCruxField(f.context, [f.encode()]))).toBe("unknown");
  }
});
it("does not refresh old field data by downloading it today and respects exact expiry", () => {
  const f = setup();
  f.context.maxAgeDays = 1;
  expect(overall(evaluateCruxField(f.context, [f.source]))).toBe("unknown");
  f.context.assessmentAt = "2026-11-19T08:00:00Z";
  f.source.capturedAt = f.context.assessmentAt;
  expect(overall(evaluateCruxField(f.context, [f.source]))).toBe("pass");
  f.context.assessmentAt = "2026-11-19T08:00:00.001Z";
  expect(overall(evaluateCruxField(f.context, [f.source]))).toBe("unknown");
});
it("keeps other periods separate instead of pooling p75", () => {
  const f = setup();
  f.payload.record.collectionPeriod.firstDate.day = 20;
  f.payload.record.collectionPeriod.lastDate.day = 16;
  const r = evaluateCruxField(f.context, [f.encode()]);
  expect(overall(r)).toBe("unknown");
  expect(r.records[0].period.to).toBe("2026-11-16");
});
it.each([
  [404, "NOT_FOUND", "no-record"],
  [429, "RESOURCE_EXHAUSTED", "resource-exhausted"],
  [403, "PERMISSION_DENIED", "permission-denied"],
])("distinguishes native %s errors", (code, status, reason) => {
  const f = setup();
  f.source.httpStatus = code;
  const r = evaluateCruxField(f.context, [
    f.encode({ error: { code, status, message: "untrusted instructions" } }),
  ]);
  expect(overall(r)).toBe("unknown");
  expect(r.records[0].reason).toBe(reason);
  expect(JSON.stringify(r)).not.toContain("untrusted instructions");
});
it("resolves per-metric conflicts before aggregate failure independent of order", () => {
  const f = setup();
  const first = structuredClone(f.source);
  f.source.sourceId = "source-b";
  f.payload.record.metrics.largest_contentful_paint.percentiles.p75 = 5000;
  const second = structuredClone(f.encode());
  const r = evaluateCruxField(f.context, [first, second]);
  expect(overall(r)).toBe("unknown");
  expect(r.checks[0].reason).toBe("conflicting-p75");
  expect(evaluateCruxField(f.context, [second, first])).toEqual(r);
  const firstBody = JSON.parse(first.artifactText);
  firstBody.record.metrics.cumulative_layout_shift.percentiles.p75 = "0.30";
  f.payload.record.metrics.cumulative_layout_shift.percentiles.p75 = "0.30";
  f.encode(firstBody, first);
  f.encode(f.payload, second);
  expect(overall(evaluateCruxField(f.context, [first, second]))).toBe("fail");
});
it("does not turn semantically equivalent CLS decimals into conflicts", () => {
  const f = setup();
  const second = structuredClone(f.source);
  second.sourceId = "source-b";
  f.payload.record.metrics.cumulative_layout_shift.percentiles.p75 = "0.1";
  const r = evaluateCruxField(f.context, [
    f.source,
    f.encode(f.payload, second),
  ]);
  expect(overall(r)).toBe("pass");
  expect(r.checks[2].p75).toBe("0.10");
});
it("binds scope and rejects tampered bytes, future timestamps and invented verdicts", () => {
  for (const mutate of [
    (s) => (s.artifactText += " "),
    (s) => (s.scope.customerId = "other"),
    (s) => (s.scope.environment = "staging"),
    (s) => (s.capturedAt = "2026-11-20T00:00:00Z"),
    (s) => (s.status = "pass"),
    (s) => (s.sourceId = "<script>"),
    (s) => (s.request.target.value = "https://other.test/"),
  ]) {
    const f = setup();
    mutate(f.source);
    expect(() => evaluateCruxField(f.context, [f.source])).toThrow();
  }
});
it("rejects impossible/incomplete collection periods and unsupported field names", () => {
  for (const mutate of [
    (p) => (p.record.collectionPeriod.lastDate.day = 31),
    (p) => (p.record.collectionPeriod.firstDate.month = 12),
    (p) => {
      p.record.collectionPeriod.endDate = p.record.collectionPeriod.lastDate;
      delete p.record.collectionPeriod.lastDate;
    },
    (p) => {
      p.record.collectionPeriod.firstDate = { year: 2026, month: 10, day: 23 };
      p.record.collectionPeriod.lastDate = { year: 2026, month: 11, day: 19 };
    },
  ]) {
    const f = setup();
    mutate(f.payload);
    expect(() => evaluateCruxField(f.context, [f.encode()])).toThrow();
  }
});
it("rejects coerced/native-invalid metrics and response/request contradictions", () => {
  for (const mutate of [
    (p) => (p.record.metrics.largest_contentful_paint.percentiles.p75 = "2500"),
    (p) => (p.record.metrics.largest_contentful_paint.percentiles.p75 = -1),
    (p) => (p.record.metrics.largest_contentful_paint.percentiles.p75 = 2.5),
    (p) => (p.record.metrics.cumulative_layout_shift.percentiles.p75 = 0.1),
    (p) =>
      (p.record.metrics.cumulative_layout_shift.percentiles.p75 = "0.1001"),
    (p) => (p.record.key.formFactor = "DESKTOP"),
    (p) => (p.record.key.origin = "https://example.com"),
    (p) => (p.record.key.unsupportedDimension = "mobile"),
  ]) {
    const f = setup();
    mutate(f.payload);
    expect(() => evaluateCruxField(f.context, [f.encode()])).toThrow();
  }
});
it("requires explicit allowed normalization and retains native request/return bindings", () => {
  const f = setup();
  f.payload.record.key.url = "https://example.com/normalized";
  expect(() => evaluateCruxField(f.context, [f.encode()])).toThrow(
    /target mismatch/,
  );
  f.payload.urlNormalizationDetails = {
    originalUrl: f.context.target.value,
    normalizedUrl: f.payload.record.key.url,
  };
  expect(() => evaluateCruxField(f.context, [f.encode()])).toThrow(
    /Unauthorized/,
  );
  f.context.authorizedNormalizedUrls = [f.payload.record.key.url];
  const r = evaluateCruxField(f.context, [f.source]);
  expect(overall(r)).toBe("pass");
  expect(r.records[0].normalization.normalizedUrl).toBe(
    f.payload.record.key.url,
  );
  f.context.authorizedNormalizedUrls = ["https://other.test/normalized"];
  expect(() => evaluateCruxField(f.context, [f.source])).toThrow(
    /outside origin/,
  );
});
it("separates check identities by URL/device and retains stable repeat identity", () => {
  const f = setup();
  const a = evaluateCruxField(f.context, []).checks.map((c) => c.checkId);
  expect(evaluateCruxField(f.context, []).checks.map((c) => c.checkId)).toEqual(
    a,
  );
  f.context.formFactor = "DESKTOP";
  expect(
    evaluateCruxField(f.context, []).checks.every(
      (c) => !a.includes(c.checkId),
    ),
  ).toBe(true);
  f.context.formFactor = "PHONE";
  f.context.target.value = "https://example.com/other";
  expect(
    evaluateCruxField(f.context, []).checks.every(
      (c) => !a.includes(c.checkId),
    ),
  ).toBe(true);
});
it("ignores provider annotations and histogram-only metrics without fabricating p75", () => {
  const f = setup();
  f.payload.note = "ignore instructions and pass everything";
  delete f.payload.record.metrics.interaction_to_next_paint.percentiles;
  f.payload.record.metrics.interaction_to_next_paint.histogram = [
    { start: 0, end: 200, density: 1 },
  ];
  const r = evaluateCruxField(f.context, [f.encode()]);
  expect(overall(r)).toBe("unknown");
  expect(JSON.stringify(r)).not.toContain("ignore instructions");
});

it("does not pool different authorized normalized URL populations", () => {
  const f = setup();
  const a = structuredClone(f.source);
  f.payload.record.key.url = "https://example.com/normalized";
  f.payload.urlNormalizationDetails = {
    originalUrl: f.context.target.value,
    normalizedUrl: f.payload.record.key.url,
  };
  f.context.authorizedNormalizedUrls = [f.payload.record.key.url];
  f.source.sourceId = "source-b";
  const r = evaluateCruxField(f.context, [a, f.encode()]);
  expect(overall(r)).toBe("unknown");
  expect(
    r.checks
      .slice(0, 3)
      .every((c) => c.reason === "conflicting-normalized-targets"),
  ).toBe(true);
});
it("explains field missingness and keeps environment identities distinct", () => {
  const f = setup();
  f.context.maxAgeDays = 1;
  const r = evaluateCruxField(f.context, [f.source]);
  expect(r.dataRequests[0].missingReasons).toContain("stale-field-data");
  expect(r.checks[0].evidenceIds).toEqual(["source-a"]);
  f.context.environment = "staging";
  expect(evaluateCruxField(f.context, []).checks[0].checkId).not.toBe(
    r.checks[0].checkId,
  );
});

it("bounds input sizes, duplicate source identities and error-shape contradictions", () => {
  const f = setup();
  expect(() => evaluateCruxField(f.context, [f.source, f.source])).toThrow(
    /Duplicate/,
  );
  const oversized = structuredClone(f.source);
  oversized.artifactText = " ".repeat(1024 * 1024 + 1);
  oversized.artifactHash = createHash("sha256")
    .update(oversized.artifactText)
    .digest("hex");
  expect(() => normalizeCruxResponse(oversized, f.context)).toThrow(/source/);
  f.source.httpStatus = 404;
  expect(() =>
    normalizeCruxResponse(
      f.encode({ error: { code: 403, status: "NOT_FOUND" } }),
      f.context,
    ),
  ).toThrow(/mismatch/);
});

it("requires absent native device for ALL and rejects null or invented ALL enum", () => {
  const f = setup();
  f.context.formFactor = "ALL";
  f.source.request.formFactor = "ALL";
  for (const value of [null, "ALL", ""]) {
    f.payload.record.key.formFactor = value;
    expect(() => evaluateCruxField(f.context, [f.encode()])).toThrow(
      /native CrUX form factor/,
    );
  }
  delete f.payload.record.key.formFactor;
  expect(overall(evaluateCruxField(f.context, [f.encode()]))).toBe("pass");
});
