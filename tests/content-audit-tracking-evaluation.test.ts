import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { evaluateTrackingJourney } from "../skills/content-search-audit/scripts/lib/tracking-evaluation.mjs";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function fixture() {
  const scope = {
    customerId: "customer",
    entityId: "web",
    environment: "staging",
    journeyId: "purchase",
    scenarioId: "success",
    windowId: "w",
  };
  const context = {
    ...scope,
    window: { from: "2026-11-18T10:00:00Z", to: "2026-11-18T10:10:00Z" },
    assessmentAt: "2026-11-18T11:00:00Z",
    maxAgeSeconds: 7200,
  };
  const correlation = hash("tenant-event");
  const stages = [
    "action",
    "data-layer",
    "tag",
    "network",
    "provider",
    "business",
  ];
  const statuses = [
    "completed",
    "emitted",
    "fired",
    "responded",
    "observed",
    "settled",
  ];
  const contract = {
    contractId: "purchase-v1",
    owner: "measurement-owner",
    scope,
    correlations: [correlation],
    minimumSampleSize: 1,
    providerLagSeconds: 1800,
    expectations: stages.map((stage, i) => ({
      stage,
      eventName: "purchase",
      acceptedStatuses: [statuses[i]],
      forbiddenStatuses: [],
      minCount: 1,
      maxCount: 1,
      ...(stage === "network" ? { acceptedHttpStatuses: [200, 204] } : {}),
    })),
  };
  const artifacts = stages.map((stage, i) => ({
    scope,
    clockId: `clock-${i}`,
    coverage: [{ stage, ...context.window, complete: true }],
    records: [
      {
        observationId: `r-${i}`,
        stage,
        eventKey: `event-${i}`,
        correlationDigest: correlation,
        eventName: "purchase",
        status: statuses[i],
        observedAt: "2026-11-18T10:05:00Z",
        ...(stage === "network" ? { httpStatus: 204 } : {}),
      },
    ],
  }));
  function inputs() {
    return artifacts.map((a, i) => ({
      sourceId: `source-${i}`,
      sourceKind:
        i < 4
          ? "browser-trace"
          : i === 4
            ? "provider-export"
            : "business-export",
      locator: "private fixture",
      synthetic: true,
      capturedAt: i === 4 ? "2026-11-18T10:40:00Z" : context.window.to,
      artifactText: JSON.stringify(a),
      artifactHash: hash(JSON.stringify(a)),
    }));
  }
  return { context, contract, artifacts, inputs };
}
it("evaluates six declared stage rules without claiming enterprise acceptance or causality", () => {
  const f = fixture(),
    r = evaluateTrackingJourney(f.contract, f.inputs(), f.context);
  expect(r.status).toBe("pass");
  expect(r.checks).toHaveLength(6);
  expect(r.assessmentAccepted).toBe(false);
  expect(r.causalAttribution).toBe(false);
  expect(r.unassessed).toContain("payload-validation");
  expect(r.sourceDigests).toHaveLength(6);
});
it("does not infer provider or business receipt from network 204", () => {
  const f = fixture(),
    r = evaluateTrackingJourney(f.contract, f.inputs().slice(0, 4), f.context);
  expect(r.status).toBe("unknown");
  expect(
    r.checks.filter((x) => x.status === "unknown").map((x) => x.stage),
  ).toEqual(["provider", "business"]);
});
it("distinguishes explicit rejected settlement from missing observations", () => {
  const f = fixture();
  f.contract.expectations[5].forbiddenStatuses = ["rejected"];
  f.artifacts[5].records[0].status = "rejected";
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5],
  ).toMatchObject({ status: "fail", reason: "forbidden-status" });
  f.artifacts[5].records = [];
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5],
  ).toMatchObject({ status: "fail", reason: "count-out-of-range" });
  f.artifacts[5].coverage[0].complete = false;
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5].status,
  ).toBe("unknown");
});
it("keeps later refunds separate from settlement count unless contract forbids them", () => {
  const f = fixture();
  f.artifacts[5].records.push({
    ...f.artifacts[5].records[0],
    observationId: "refund",
    eventKey: "refund-1",
    status: "refunded",
  });
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5].status,
  ).toBe("pass");
  f.contract.expectations[5].forbiddenStatuses = ["refunded"];
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5].status,
  ).toBe("fail");
});
it("keeps duplicate log records ambiguous but detects distinct excess event identities", () => {
  const f = fixture();
  f.artifacts[1].records.push({
    ...f.artifacts[1].records[0],
    observationId: "retry",
  });
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[1],
  ).toMatchObject({ status: "unknown", reason: "ambiguous-event-identity" });
  f.artifacts[1].records[1].eventKey = "second-event";
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[1],
  ).toMatchObject({ status: "fail", reason: "count-out-of-range" });
});
it("does not correlate by event name, timestamps or an unmatched business key", () => {
  const f = fixture();
  f.artifacts[5].records[0].correlationDigest = null;
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5].status,
  ).toBe("unknown");
  f.artifacts[5].records[0].correlationDigest = hash("other");
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[5],
  ).toMatchObject({ status: "unknown", reason: "unmapped-correlation" });
});
it("preserves provider lag, manual evidence, stale and undersampled uncertainty", () => {
  const f = fixture();
  f.contract.providerLagSeconds = 7200;
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[4].reason,
  ).toBe("provider-lag");
  f.contract.providerLagSeconds = 0;
  const inputs = f.inputs();
  inputs[4].sourceKind = "manual";
  expect(
    evaluateTrackingJourney(f.contract, inputs, f.context).checks[4].reason,
  ).toBe("manual-source");
  f.context.assessmentAt = "2026-11-19T11:00:00Z";
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks.every(
      (x) => x.status === "unknown",
    ),
  ).toBe(true);
  f.context.assessmentAt = "2026-11-18T11:00:00Z";
  f.contract.minimumSampleSize = 2;
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).status,
  ).toBe("unknown");
});
it("rejects altered sources, contract injection, foreign scope and duplicate source IDs", () => {
  const f = fixture(),
    sources = f.inputs();
  sources[0].artifactText += " ";
  expect(() => evaluateTrackingJourney(f.contract, sources, f.context)).toThrow(
    /hash/,
  );
  expect(() =>
    evaluateTrackingJourney(
      { ...f.contract, authorization: true },
      f.inputs(),
      f.context,
    ),
  ).toThrow(/contract/);
  expect(() =>
    evaluateTrackingJourney(
      { ...f.contract, scope: { ...f.contract.scope, customerId: "other" } },
      f.inputs(),
      f.context,
    ),
  ).toThrow(/scope/);
  expect(() =>
    evaluateTrackingJourney(
      f.contract,
      [...f.inputs(), f.inputs()[0]],
      f.context,
    ),
  ).toThrow(/Duplicate/);
});
it("does not let overlapping source captures inflate counts or hide disagreement", () => {
  const f = fixture(),
    inputs = f.inputs();
  inputs.push({ ...inputs[4], sourceId: "second-provider" });
  expect(
    evaluateTrackingJourney(f.contract, inputs, f.context).checks[4],
  ).toMatchObject({ status: "unknown", reason: "overlapping-sources" });
});

it("requires provider capture after latency, not merely later assessment", () => {
  const f = fixture();
  const sources = f.inputs();
  sources[4].capturedAt = f.context.window.to;
  expect(
    evaluateTrackingJourney(f.contract, sources, f.context).checks[4],
  ).toMatchObject({ status: "unknown", reason: "provider-capture-too-early" });
});

it("distinguishes HTTP failure and missing response status from accepted delivery", () => {
  const f = fixture();
  f.artifacts[3].records[0].httpStatus = 500;
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[3],
  ).toMatchObject({ status: "fail", reason: "unexpected-http-status" });
  delete f.artifacts[3].records[0].httpStatus;
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[3],
  ).toMatchObject({ status: "unknown", reason: "missing-http-status" });
  delete f.contract.expectations[3].acceptedHttpStatuses;
  expect(() =>
    evaluateTrackingJourney(f.contract, f.inputs(), f.context),
  ).toThrow(/HTTP/);
});

it("binds source envelope metadata that can change a verdict", () => {
  const f = fixture(),
    a = f.inputs(),
    b = f.inputs();
  f.context.maxAgeSeconds = 1800;
  b[1].capturedAt = "2026-11-18T10:50:00Z";
  const before = evaluateTrackingJourney(f.contract, a, f.context),
    after = evaluateTrackingJourney(f.contract, b, f.context);
  expect(before.checks[1].status).toBe("unknown");
  expect(after.checks[1].status).toBe("pass");
  expect(before.sourceDigests[1].digest).toBe(after.sourceDigests[1].digest);
  expect(before.sourceDigests[1].envelopeDigest).not.toBe(
    after.sourceDigests[1].envelopeDigest,
  );
  expect(before.checks[1].evidence[0].envelopeDigest).toBe(
    before.sourceDigests[1].envelopeDigest,
  );
});

it("does not count one event identity as multiple correlated samples", () => {
  const f = fixture(),
    second = hash("second-correlation");
  f.contract.correlations.push(second);
  f.contract.minimumSampleSize = 2;
  for (const a of f.artifacts)
    a.records.push({
      ...a.records[0],
      observationId: a.records[0].observationId + "-copy",
      correlationDigest: second,
    });
  const r = evaluateTrackingJourney(f.contract, f.inputs(), f.context);
  expect(r.status).toBe("unknown");
  expect(r.checks.every((c) => c.reason === "ambiguous-event-identity")).toBe(
    true,
  );
});

it("keeps a stage identity with conflicting event names ambiguous", () => {
  const f = fixture();
  f.artifacts[1].records.push({
    ...f.artifacts[1].records[0],
    observationId: "conflict",
    eventName: "other-name",
  });
  expect(
    evaluateTrackingJourney(f.contract, f.inputs(), f.context).checks[1],
  ).toMatchObject({ status: "unknown", reason: "ambiguous-event-identity" });
});
