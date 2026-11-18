import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { normalizeTrackingObservations } from "../skills/content-search-audit/scripts/lib/tracking-observations.mjs";
const hash = (x: string) => createHash("sha256").update(x).digest("hex");
function sample() {
  const context = {
    customerId: "c",
    entityId: "site",
    environment: "staging",
    journeyId: "checkout",
    scenarioId: "accepted",
    windowId: "session-1",
    window: { from: "2026-11-18T10:00:00Z", to: "2026-11-18T10:10:00Z" },
    assessmentAt: "2026-11-18T11:00:00Z",
    maxAgeSeconds: 7200,
  };
  const artifact = {
    scope: {
      customerId: "c",
      entityId: "site",
      environment: "staging",
      journeyId: "checkout",
      scenarioId: "accepted",
      windowId: "session-1",
    },
    clockId: "browser-clock",
    coverage: [
      {
        stage: "network",
        from: context.window.from,
        to: context.window.to,
        complete: true,
      },
    ],
    records: [
      {
        observationId: "r1",
        stage: "network",
        eventKey: "request-1",
        correlationDigest: hash("tenant-specific-pseudonym"),
        eventName: "purchase",
        status: "responded",
        observedAt: "2026-11-18T10:05:00Z",
        httpStatus: 204,
      },
    ],
  };
  const input = {
    sourceId: "trace",
    sourceKind: "browser-trace",
    locator: "test fixture",
    capturedAt: "2026-11-18T10:10:00Z",
    synthetic: true,
    artifactText: JSON.stringify(artifact),
    artifactHash: hash(JSON.stringify(artifact)),
  };
  return { context, artifact, input };
}
const update = (input, artifact) => ({
  ...input,
  artifactText: JSON.stringify(artifact),
  artifactHash: hash(JSON.stringify(artifact)),
});
it("preserves network success without inventing provider or business receipts", () => {
  const { context, input } = sample(),
    r = normalizeTrackingObservations(input, context);
  expect(r.records[0].httpStatus).toBe(204);
  expect(r.stageCoverage.provider).toBe("missing");
  expect(r.stageCoverage.business).toBe("missing");
  expect(r.providerAuthenticated).toBe(false);
  expect(r.assessmentAccepted).toBe(false);
  expect(r.sourceDigest).toBe(input.artifactHash);
});
it("rejects altered bytes, foreign scopes and browser claims of provider observations", () => {
  const { context, input, artifact } = sample();
  expect(() =>
    normalizeTrackingObservations(
      { ...input, artifactText: input.artifactText + " " },
      context,
    ),
  ).toThrow(/hash/);
  for (const field of [
    "customerId",
    "environment",
    "scenarioId",
    "journeyId",
    "entityId",
    "windowId",
  ]) {
    const a = structuredClone(artifact);
    a.scope[field] = "foreign";
    expect(() =>
      normalizeTrackingObservations(update(input, a), context),
    ).toThrow(/scope/);
  }
  const a = structuredClone(artifact);
  a.records[0].stage = "provider";
  a.records[0].status = "observed";
  delete a.records[0].httpStatus;
  expect(() =>
    normalizeTrackingObservations(update(input, a), context),
  ).toThrow(/source/);
});
it("rejects future captures, impossible windows and out-of-window records", () => {
  const { context, input, artifact } = sample();
  expect(() =>
    normalizeTrackingObservations(
      { ...input, capturedAt: "2026-11-18T12:00:00Z" },
      context,
    ),
  ).toThrow();
  expect(() =>
    normalizeTrackingObservations(input, {
      ...context,
      window: { from: context.window.to, to: context.window.from },
    }),
  ).toThrow();
  for (const at of ["2026-11-18T09:59:59Z", context.window.to]) {
    const a = structuredClone(artifact);
    a.records[0].observedAt = at;
    expect(() =>
      normalizeTrackingObservations(update(input, a), context),
    ).toThrow();
  }
});
it("keeps partial, stale and manual evidence limitations explicit", () => {
  const { context, input, artifact } = sample();
  artifact.coverage[0].complete = false;
  const r = normalizeTrackingObservations(
    update({ ...input, sourceKind: "manual" }, artifact),
    { ...context, maxAgeSeconds: 1 },
  );
  expect(r.stageCoverage.network).toBe("partial");
  expect(r.gaps.map((x) => x.code)).toEqual(
    expect.arrayContaining(["stale-capture", "manual-observation"]),
  );
  expect(r.usableForCurrentAssessment).toBe(false);
});
it("rejects raw identifiers, unknown payload fields, duplicate observation IDs and invalid stage statuses", () => {
  const { context, input, artifact } = sample();
  for (const change of [
    (a) => (a.records[0].correlationDigest = "person@example.com"),
    (a) => (a.records[0].payload = { email: "private@example.com" }),
    (a) => a.records.push({ ...a.records[0] }),
    (a) => (a.records[0].status = "settled"),
  ]) {
    const a = structuredClone(artifact);
    change(a);
    expect(() =>
      normalizeTrackingObservations(update(input, a), context),
    ).toThrow();
  }
});
it("retains repeated event keys as ambiguity instead of inferring duplicate conversions", () => {
  const { context, input, artifact } = sample();
  artifact.records.push({ ...artifact.records[0], observationId: "r2" });
  const r = normalizeTrackingObservations(update(input, artifact), context);
  expect(r.records).toHaveLength(2);
  expect(r.gaps.map((x) => x.code)).toContain("repeated-event-key");
  expect(r.assessmentAccepted).toBe(false);
});

it("retains observations without correlation as an explicit matching gap", () => {
  const { context, input, artifact } = sample();
  artifact.records[0].correlationDigest = null;
  const r = normalizeTrackingObservations(update(input, artifact), context);
  expect(r.records[0].correlationDigest).toBeNull();
  expect(r.gaps.map((x) => x.code)).toContain("missing-correlation");
  expect(r.assessmentAccepted).toBe(false);
});

it("validates normalized output with the shipped schema and rejects success inflation", async () => {
  const { context, input, artifact } = sample();
  artifact.records[0].payload = {
    complete: true,
    fields: [{ name: "value", type: "decimal", value: "9007199254740993.01" }],
  };
  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(
    JSON.parse(
      await readFile(
        "skills/content-search-audit/schemas/tracking-observation.schema.json",
        "utf8",
      ),
    ),
  );
  const r = normalizeTrackingObservations(update(input, artifact), context);
  expect(validate(r), JSON.stringify(validate.errors)).toBe(true);
  expect(validate({ ...r, providerAuthenticated: true })).toBe(false);
  const changed = structuredClone(r);
  changed.records[0].status = "settled";
  expect(validate(changed)).toBe(false);
});

it("rejects source-kind coercion and unmodeled context fields instead of emitting invalid schema", () => {
  const { context, input } = sample();
  expect(() =>
    normalizeTrackingObservations(
      { ...input, sourceKind: ["browser-trace"] },
      context,
    ),
  ).toThrow();
  expect(() =>
    normalizeTrackingObservations(input, {
      ...context,
      window: { ...context.window, privateToken: "do-not-project" },
    }),
  ).toThrow();
});
it("rejects capture bounds that contradict the requested window or supplied record", () => {
  const { context, input, artifact } = sample();
  artifact.coverage[0].from = "2026-11-18T09:00:00Z";
  artifact.coverage[0].to = context.window.from;
  expect(() =>
    normalizeTrackingObservations(update(input, artifact), context),
  ).toThrow(/coverage/);
  artifact.coverage[0].from = context.window.from;
  artifact.coverage[0].to = "2026-11-18T10:04:00Z";
  expect(() =>
    normalizeTrackingObservations(update(input, artifact), context),
  ).toThrow(/coverage/);
});
it("preserves supplied manual attribution and asks when it is missing", () => {
  const { context, input } = sample();
  const manual = { ...input, sourceKind: "manual" };
  const missing = normalizeTrackingObservations(manual, context);
  expect(missing.provenance).toBeNull();
  expect(missing.gaps.map((x) => x.code)).toContain(
    "missing-manual-attribution",
  );
  const provenance = { actor: "reviewer-1", method: "recorded walkthrough" };
  const supplied = normalizeTrackingObservations(
    { ...manual, provenance },
    context,
  );
  expect(supplied.provenance).toEqual(provenance);
  expect(supplied.gaps.map((x) => x.code)).not.toContain(
    "missing-manual-attribution",
  );
  expect(supplied.providerAuthenticated).toBe(false);
});

it("keeps provider and business exports separate and allows honest partial capture", () => {
  const { context, input, artifact } = sample();
  for (const [sourceKind, stage, status] of [
    ["provider-export", "provider", "observed"],
    ["business-export", "business", "refunded"],
  ]) {
    const a = structuredClone(artifact);
    a.coverage[0].stage = stage;
    a.records[0].stage = stage;
    a.records[0].status = status;
    delete a.records[0].httpStatus;
    const r = normalizeTrackingObservations(
      update({ ...input, sourceKind }, a),
      context,
    );
    expect(r.records[0].status).toBe(status);
    expect(r.stageCoverage[stage]).toBe("complete");
    expect(r.providerAuthenticated).toBe(false);
    expect(r.assessmentAccepted).toBe(false);
  }
  const a = structuredClone(artifact);
  a.coverage[0].to = "2026-11-18T10:06:00Z";
  const r = normalizeTrackingObservations(
    update({ ...input, capturedAt: a.coverage[0].to }, a),
    context,
  );
  expect(r.stageCoverage.network).toBe("partial");
  expect(r.gaps.map((x) => x.code)).toContain("partial-capture-window");
});
