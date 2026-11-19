import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateBusinessMapping } from "../scripts/enterprise-measurement/business-mapping.mjs";

function fixture() {
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "run",
      assessmentAt: "2026-11-19T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "analytics", type: "property" },
      ],
    },
    [],
  );
  const contract = {
    schemaVersion: 1,
    contractId: "business-v1",
    customerId: "customer",
    entityId: "analytics",
    resource: "properties/123",
    ownerRole: "business-measurement-owner",
    confirmedAt: "2026-11-19T10:00:00Z",
    validUntil: "2026-11-20T10:00:00Z",
    businessWindow: {
      from: "2026-11-01T00:00:00Z",
      to: "2026-11-18T00:00:00Z",
    },
    dictionary: {
      version: "1",
      sourceSystem: "orders",
      outcomes: [
        {
          outcomeId: "purchase",
          businessModel: "commerce",
          allowedStatuses: ["attempt", "settled", "refunded"],
          successStatuses: ["settled"],
        },
      ],
    },
    requirements: [
      {
        requirementId: "settlement",
        outcomeId: "purchase",
        meaning: "success",
        expectedKeyEvent: true,
        countingMethod: "ONCE_PER_EVENT",
      },
    ],
  };
  return {
    input: {
      customerId: "customer",
      entityId: "analytics",
      payload: {
        sourceId: "ga4",
        synthetic: true,
        capturedAt: "2026-11-19T11:00:00Z",
        property: {
          name: "properties/123",
          timeZone: "UTC",
          currencyCode: "USD",
        },
        dataStreams: [],
        keyEvents: [
          {
            name: "properties/123/keyEvents/1",
            eventName: "purchase",
            countingMethod: "ONCE_PER_EVENT",
          },
        ],
        collections: {
          dataStreams: { complete: true },
          keyEvents: { complete: true },
        },
      },
    },
    context: {
      run,
      entityId: "analytics",
      resource: "properties/123",
      versionId: null,
      windowId: "current",
      maxAgeSeconds: 7200,
    },
    contract,
    mappingSource: {
      sourceId: "application-event-map",
      customerId: "customer",
      entityId: "analytics",
      resource: "properties/123",
      contractDigest: enterpriseDigest(contract),
      capturedAt: "2026-11-19T11:00:00Z",
      synthetic: true,
      complete: true,
      mappings: [
        {
          mappingId: "paid-event",
          requirementId: "settlement",
          outcomeId: "purchase",
          eventName: "purchase",
          representedStatuses: ["settled"],
          meaning: "success",
        },
      ],
    },
  };
}
const rebind = (f) => {
  f.mappingSource.contractDigest = enterpriseDigest(f.contract);
  return f;
};
it("compares declared business semantics and actual key-event config without claiming outcomes occurred", () => {
  const f = fixture(),
    before = enterpriseDigest(f),
    r = evaluateBusinessMapping(f);
  expect(r.checks.map((c) => c.status)).toEqual(["pass", "pass"]);
  expect(r).toMatchObject({
    businessOutcomeVerified: false,
    mappingAuthenticated: false,
    providerAuthenticated: false,
    runtimeVerified: false,
    synthetic: true,
  });
  expect(enterpriseDigest(f)).toBe(before);
});
it("does not accept submit or created-order states as settlement because the event is named purchase", () => {
  const f = fixture();
  f.mappingSource.mappings[0].representedStatuses = ["attempt"];
  expect(evaluateBusinessMapping(f).checks[0]).toMatchObject({
    status: "fail",
    reason: "non-success-status-mapped-as-success",
  });
});
it("permits an explicitly requested milestone without misclassifying it as terminal success", () => {
  const f = fixture();
  f.contract.requirements[0].meaning = "milestone";
  f.mappingSource.mappings[0].meaning = "milestone";
  f.mappingSource.mappings[0].representedStatuses = ["attempt"];
  expect(evaluateBusinessMapping(rebind(f)).checks[0].status).toBe("pass");
});
it("detects missing, unwanted and incorrectly counted key-event definitions", () => {
  const f = fixture();
  f.input.payload.keyEvents = [];
  expect(evaluateBusinessMapping(f).checks[1].reason).toBe(
    "required-key-event-absent",
  );
  f.input.payload.keyEvents = [
    {
      name: "properties/123/keyEvents/1",
      eventName: "purchase",
      countingMethod: "ONCE_PER_SESSION",
    },
  ];
  expect(evaluateBusinessMapping(f).checks[1].reason).toBe(
    "key-event-counting-mismatch",
  );
  f.contract.requirements[0].expectedKeyEvent = false;
  f.contract.requirements[0].countingMethod = null;
  expect(evaluateBusinessMapping(rebind(f)).checks[1].reason).toBe(
    "unexpected-key-event-definition",
  );
});
it("keeps partial source mappings and partial key-event lists unknown", () => {
  const f = fixture();
  f.mappingSource.complete = false;
  f.input.payload.collections.keyEvents.complete = false;
  const r = evaluateBusinessMapping(f);
  expect(r.checks.every((c) => c.status === "unknown")).toBe(true);
  expect(r.dataRequests.flatMap((q) => q.checkIds)).toEqual(
    r.checks.map((c) => c.checkId),
  );
});
it("distinguishes complete missing mapping from partial or absent source", () => {
  const f = fixture();
  f.mappingSource.mappings = [];
  expect(evaluateBusinessMapping(f).checks[0].status).toBe("fail");
  f.mappingSource.complete = false;
  expect(evaluateBusinessMapping(f).checks[0].status).toBe("unknown");
  f.mappingSource = null;
  expect(
    evaluateBusinessMapping(f).checks.every((c) => c.status === "unknown"),
  ).toBe(true);
});
it("does not choose an arbitrary mapping or key event when duplicate identities conflict", () => {
  const f = fixture();
  f.mappingSource.mappings.push({
    ...f.mappingSource.mappings[0],
    mappingId: "other",
  });
  expect(evaluateBusinessMapping(f).checks[0].reason).toBe("ambiguous-mapping");
  f.mappingSource.mappings.pop();
  f.input.payload.keyEvents.push({
    ...f.input.payload.keyEvents[0],
    name: "properties/123/keyEvents/2",
  });
  expect(evaluateBusinessMapping(f).checks[1].reason).toBe(
    "ambiguous-key-event",
  );
});
it("keeps reused event names unknown until conditional mapping can be verified", () => {
  const f = fixture();
  f.contract.requirements.push({
    ...f.contract.requirements[0],
    requirementId: "other",
  });
  f.mappingSource.mappings.push({
    ...f.mappingSource.mappings[0],
    mappingId: "other",
    requirementId: "other",
  });
  expect(
    evaluateBusinessMapping(rebind(f)).checks.every(
      (c) => c.status === "unknown",
    ),
  ).toBe(true);
});
it("isolates stale GA4 configuration from current business mapping and expires contracts", () => {
  const f = fixture();
  f.input.payload.capturedAt = "2026-11-18T11:00:00Z";
  expect(evaluateBusinessMapping(f).checks.map((c) => c.status)).toEqual([
    "pass",
    "unknown",
  ]);
  f.contract.validUntil = "2026-11-19T12:00:00Z";
  expect(
    evaluateBusinessMapping(rebind(f)).checks.every(
      (c) => c.status === "unknown",
    ),
  ).toBe(true);
});
it("rejects foreign/stale bindings and unknown outcomes instead of treating imports as authority", () => {
  for (const mutate of [
    (f) => {
      f.contract.customerId = "other";
    },
    (f) => {
      f.mappingSource.entityId = "other";
    },
    (f) => {
      f.mappingSource.contractDigest = "0".repeat(64);
    },
    (f) => {
      f.contract.requirements[0].outcomeId = "missing";
    },
    (f) => {
      f.mappingSource.capturedAt = "2026-11-20T11:00:00Z";
    },
    (f) => {
      f.contract.extra = true;
    },
  ]) {
    const f = fixture();
    mutate(f);
    expect(() => evaluateBusinessMapping(f)).toThrow();
  }
});
it("requires a supplied business contract and never invents success from an event name", () => {
  const f = fixture();
  f.contract = null;
  f.mappingSource = null;
  expect(evaluateBusinessMapping(f).checks[0]).toMatchObject({
    status: "unknown",
    reason: "missing-business-contract",
  });
});
it("allows shared dictionaries with unused profiles while rejecting out-of-scope required outcomes", () => {
  const f = fixture();
  f.contract.dictionary.outcomes.push({
    outcomeId: "booking",
    businessModel: "booking",
    allowedStatuses: ["attempt", "completed"],
    successStatuses: ["completed"],
  });
  expect(evaluateBusinessMapping(rebind(f)).checks[0].status).toBe("pass");
  f.contract.requirements[0].outcomeId = "booking";
  expect(() => evaluateBusinessMapping(rebind(f))).toThrow(/profile outside/);
});
it("uses owner definitions across all five profiles instead of event-name heuristics", () => {
  for (const [profile, status] of [
    ["commerce", "settled"],
    ["booking", "completed"],
    ["lead-generation", "accepted"],
    ["subscription", "active"],
    ["publishing", "completed"],
  ]) {
    const f = fixture();
    f.context.run = resolveAuditContext(
      {
        customerId: "customer",
        runId: "run",
        assessmentAt: "2026-11-19T12:00:00Z",
        profileIds: [profile],
        entities: [
          { entityId: "site", type: "site" },
          { entityId: "analytics", type: "property" },
        ],
      },
      [],
    );
    Object.assign(f.contract.dictionary.outcomes[0], {
      businessModel: profile,
      allowedStatuses: ["attempt", status],
      successStatuses: [status],
    });
    Object.assign(f.mappingSource.mappings[0], {
      eventName: "custom_success",
      representedStatuses: [status],
    });
    f.input.payload.keyEvents[0].eventName = "custom_success";
    expect(
      evaluateBusinessMapping(rebind(f)).checks.map((c) => c.status),
    ).toEqual(["pass", "pass"]);
    f.mappingSource.mappings[0].representedStatuses = ["attempt"];
    expect(evaluateBusinessMapping(f).checks[0].status).toBe("fail");
  }
});
it("treats stale mapping and absent counting metadata as unknown rather than configuration defaults", () => {
  const f = fixture();
  f.mappingSource.capturedAt = "2026-11-18T11:00:00Z";
  expect(
    evaluateBusinessMapping(f).checks.every((c) => c.status === "unknown"),
  ).toBe(true);
  f.mappingSource.capturedAt = "2026-11-19T11:00:00Z";
  delete f.input.payload.keyEvents[0].countingMethod;
  expect(evaluateBusinessMapping(f).checks[1].reason).toBe(
    "missing-counting-method",
  );
});
it("detects mismatched outcome, meaning and undeclared business statuses separately", () => {
  for (const [field, value, reason] of [
    ["outcomeId", "other", "mapped-outcome-mismatch"],
    ["meaning", "milestone", "mapped-meaning-mismatch"],
    ["representedStatuses", ["accepted"], "status-outside-business-dictionary"],
  ]) {
    const f = fixture();
    f.mappingSource.mappings[0][field] = value;
    expect(evaluateBusinessMapping(f).checks[0].reason).toBe(reason);
  }
});
it("rejects non-JSON and unbound dictionary/source shapes", () => {
  for (const mutate of [
    (f) => {
      f.mappingSource.complete = "true";
    },
    (f) => {
      f.contract.dictionary.outcomes[0].successStatuses.push("settled");
    },
    (f) => {
      f.mappingSource.mappings[0].requirementId = "unrequested";
    },
    (f) => {
      f.mappingSource.self = f.mappingSource;
    },
    (f) => {
      f.input.payload.keyEvents[0].countingMethod = "unknown-enum";
    },
  ]) {
    const f = fixture();
    mutate(f);
    expect(() => evaluateBusinessMapping(f)).toThrow();
  }
});
it("expires mapping exactly at its freshness boundary and preserves just-current evidence", () => {
  const f = fixture();
  f.mappingSource.capturedAt = "2026-11-19T10:00:00Z";
  expect(
    evaluateBusinessMapping(f).checks.every(
      (c) => c.reason === "stale-mapping-source",
    ),
  ).toBe(true);
  f.mappingSource.capturedAt = "2026-11-19T10:00:01Z";
  expect(
    evaluateBusinessMapping(f).checks.every((c) => c.status === "pass"),
  ).toBe(true);
});
it("accepts confirmed absence when a key event is explicitly not required, but not partial absence", () => {
  const f = fixture();
  Object.assign(f.contract.requirements[0], {
    expectedKeyEvent: false,
    countingMethod: null,
  });
  rebind(f);
  f.input.payload.keyEvents = [];
  expect(evaluateBusinessMapping(f).checks[1]).toMatchObject({
    status: "pass",
    reason: "key-event-absent-as-required",
  });
  f.input.payload.collections.keyEvents.complete = false;
  expect(evaluateBusinessMapping(f).checks[1].status).toBe("unknown");
});
it("retains unspecified counting as unknown without silently selecting a default", () => {
  const f = fixture();
  f.input.payload.keyEvents[0].countingMethod = "COUNTING_METHOD_UNSPECIFIED";
  expect(evaluateBusinessMapping(f).checks[1]).toMatchObject({
    status: "unknown",
    reason: "missing-counting-method",
  });
});
it("supports mixed commerce and booking requirements without merging their meanings", () => {
  const f = fixture();
  f.context.run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "run",
      assessmentAt: "2026-11-19T12:00:00Z",
      profileIds: ["commerce", "booking"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "analytics", type: "property" },
      ],
    },
    [],
  );
  f.contract.dictionary.outcomes.push({
    outcomeId: "booking",
    businessModel: "booking",
    allowedStatuses: ["attempt", "completed"],
    successStatuses: ["completed"],
  });
  f.contract.requirements.push({
    ...f.contract.requirements[0],
    requirementId: "booking-confirmation",
    outcomeId: "booking",
  });
  f.mappingSource.mappings.push({
    mappingId: "booking-event",
    requirementId: "booking-confirmation",
    outcomeId: "booking",
    eventName: "booking_success",
    representedStatuses: ["completed"],
    meaning: "success",
  });
  f.input.payload.keyEvents.push({
    ...f.input.payload.keyEvents[0],
    name: "properties/123/keyEvents/2",
    eventName: "booking_success",
  });
  expect(
    evaluateBusinessMapping(rebind(f)).checks.map((c) => c.status),
  ).toEqual(["pass", "pass", "pass", "pass"]);
});
