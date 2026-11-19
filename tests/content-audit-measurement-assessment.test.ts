import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateMeasurementConfiguration } from "../scripts/enterprise-measurement/config.mjs";

it("limits unspecified counting sentinel to GA4 counting fields", () => {
  const ga4 = fixture();
  ga4.input.payload.keyEvents[0].countingMethod = "COUNTING_METHOD_UNSPECIFIED";
  expect(evaluateMeasurementConfiguration(ga4).checks[2].status).toBe(
    "unknown",
  );
  for (const field of ["paused", "firingTriggerId"]) {
    const gtm = fixture("gtm-version");
    gtm.input.payload.version.tag[0][field] = "COUNTING_METHOD_UNSPECIFIED";
    expect(() => evaluateMeasurementConfiguration(gtm)).toThrow(
      /Malformed observed/,
    );
  }
});
it("rejects sparse arrays even when an extra property masks the missing index", () => {
  const input = fixture();
  const array = new Array(1);
  array.extra = "not-an-index";
  input.input.payload.notes = array;
  expect(() => evaluateMeasurementConfiguration(input)).toThrow(/bounded JSON/);
});

function fixture(kind = "ga4-config") {
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "run",
      assessmentAt: "2026-11-19T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "measurement", type: "property" },
      ],
    },
    [],
  );
  const resource =
    kind === "ga4-config" ? "properties/123" : "accounts/1/containers/2";
  const payload =
    kind === "ga4-config"
      ? {
          property: {
            name: resource,
            timeZone: "Asia/Ho_Chi_Minh",
            currencyCode: "VND",
          },
          dataStreams: [
            {
              name: `${resource}/dataStreams/7`,
              type: "WEB_DATA_STREAM",
              webStreamData: { measurementId: "G-EXAMPLE" },
            },
          ],
          keyEvents: [
            {
              name: `${resource}/keyEvents/8`,
              eventName: "purchase",
              countingMethod: "ONCE_PER_EVENT",
            },
          ],
          collections: {
            dataStreams: { complete: true },
            keyEvents: { complete: true },
          },
        }
      : {
          version: {
            accountId: "1",
            containerId: "2",
            containerVersionId: "3",
            path: `${resource}/versions/3`,
            tag: [
              {
                tagId: "4",
                paused: false,
                firingTriggerId: ["5"],
                blockingTriggerId: [],
              },
            ],
            trigger: [{ triggerId: "5" }],
            variable: [{ variableId: "6" }],
          },
          collections: {
            tag: { complete: true },
            trigger: { complete: true },
            variable: { complete: true },
          },
        };
  Object.assign(payload, {
    sourceId: "export",
    synthetic: true,
    capturedAt: "2026-11-19T11:00:00Z",
  });
  return {
    kind,
    input: { customerId: "customer", entityId: "measurement", payload },
    context: {
      run,
      entityId: "measurement",
      resource,
      versionId: kind === "gtm-version" ? "3" : null,
      windowId: "snapshot",
      maxAgeSeconds: 7200,
    },
    contract: {
      schemaVersion: 1,
      contractId: "measurement-v1",
      customerId: "customer",
      entityId: "measurement",
      resource,
      versionId: kind === "gtm-version" ? "3" : null,
      ownerRole: "measurement-owner",
      confirmedAt: "2026-11-19T10:00:00Z",
      validUntil: "2026-11-20T10:00:00Z",
      expectations:
        kind === "ga4-config"
          ? [
              {
                id: "timezone",
                rule: "ga4-timezone",
                subject: null,
                expected: "Asia/Ho_Chi_Minh",
              },
              {
                id: "stream",
                rule: "ga4-web-measurement-id",
                subject: `${resource}/dataStreams/7`,
                expected: "G-EXAMPLE",
              },
              {
                id: "purchase",
                rule: "ga4-key-event-counting",
                subject: "purchase",
                expected: "ONCE_PER_EVENT",
              },
            ]
          : [
              {
                id: "enabled",
                rule: "gtm-tag-paused",
                subject: "4",
                expected: false,
              },
              {
                id: "firing",
                rule: "gtm-tag-firing-triggers",
                subject: "4",
                expected: ["5"],
              },
              {
                id: "trigger",
                rule: "gtm-trigger-present",
                subject: "5",
                expected: true,
              },
              {
                id: "variable",
                rule: "gtm-variable-present",
                subject: "6",
                expected: true,
              },
            ],
    },
  };
}
it("assesses configured GA4 expectations without treating them as business outcomes", () => {
  const input = fixture(),
    before = enterpriseDigest(input);
  const result = evaluateMeasurementConfiguration(input);
  expect(result.checks.map((c) => c.status)).toEqual(["pass", "pass", "pass"]);
  expect(result).toMatchObject({
    runtimeVerified: false,
    providerAuthenticated: false,
    businessOutcomeVerified: false,
    assessmentAccepted: false,
  });
  expect(result.contractDigest).toBe(enterpriseDigest(input.contract));
  expect(enterpriseDigest(input)).toBe(before);
});
it("detects wrong counting method and a confirmed missing stream", () => {
  const input = fixture();
  input.input.payload.keyEvents[0].countingMethod = "ONCE_PER_SESSION";
  input.input.payload.dataStreams = [];
  expect(
    evaluateMeasurementConfiguration(input).checks.map((c) => c.status),
  ).toEqual(["pass", "fail", "fail"]);
});
it("does not call absent objects defects in incomplete exports", () => {
  const input = fixture();
  input.input.payload.dataStreams = [];
  input.input.payload.collections.dataStreams.complete = false;
  const result = evaluateMeasurementConfiguration(input);
  expect(result.checks[1]).toMatchObject({
    status: "unknown",
    reason: "incomplete-collection",
  });
  expect(result.dataRequests[0]).toMatchObject({
    expectationId: "stream",
    ownerRole: "measurement-owner",
    resource: "properties/123",
  });
});
it("does not infer absent or unspecified fields as configuration defaults", () => {
  const input = fixture();
  delete input.input.payload.keyEvents[0].countingMethod;
  expect(evaluateMeasurementConfiguration(input).checks[2].status).toBe(
    "unknown",
  );
});
it("keeps expired evidence or expired policy unknown", () => {
  for (const target of ["source", "contract"]) {
    const input = fixture();
    if (target === "source")
      input.input.payload.capturedAt = "2026-11-18T11:00:00Z";
    else input.contract.validUntil = "2026-11-19T12:00:00Z";
    expect(
      evaluateMeasurementConfiguration(input).checks.every(
        (c) => c.status === "unknown",
      ),
    ).toBe(true);
  }
});
it("requests an owner contract instead of inventing expectations", () => {
  const input = fixture();
  input.contract = null;
  const result = evaluateMeasurementConfiguration(input);
  expect(result.checks).toHaveLength(1);
  expect(result.checks[0]).toMatchObject({
    status: "unknown",
    reason: "missing-measurement-contract",
  });
  expect(result.dataRequests).toHaveLength(1);
});
it("rejects foreign contracts, versions, unsupported rules and duplicate expectations", () => {
  const mutations = [
    (x) => {
      x.contract.customerId = "other";
    },
    (x) => {
      x.contract.resource = "properties/456";
    },
    (x) => {
      x.contract.versionId = "4";
    },
    (x) => {
      x.contract.expectations[0].rule = "eval-js";
    },
    (x) => {
      x.contract.expectations.push(x.contract.expectations[0]);
    },
    (x) => {
      x.contract.confirmedAt = "2026-11-20T10:00:00Z";
    },
    (x) => {
      x.contract.extra = true;
    },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    expect(() => evaluateMeasurementConfiguration(input)).toThrow();
  }
});
it("keeps ambiguous duplicate GA4 event-name matches unknown", () => {
  const input = fixture();
  input.input.payload.keyEvents.push({
    ...input.input.payload.keyEvents[0],
    name: "properties/123/keyEvents/9",
  });
  expect(evaluateMeasurementConfiguration(input).checks[2]).toMatchObject({
    status: "unknown",
    reason: "ambiguous-subject",
  });
});
it("assesses explicit GTM configuration without claiming publication or firing", () => {
  const input = fixture("gtm-version");
  const result = evaluateMeasurementConfiguration(input);
  expect(result.checks.every((c) => c.status === "pass")).toBe(true);
  expect(result.publicationVerified).toBe(false);
  input.input.payload.version.tag[0].firingTriggerId = ["9"];
  input.input.payload.version.trigger = [];
  expect(
    evaluateMeasurementConfiguration(input).checks.map((c) => c.status),
  ).toEqual(["pass", "fail", "fail", "pass"]);
});
it("requires GTM collection completeness and does not normalize omitted collections to absent", () => {
  const input = fixture("gtm-version");
  delete input.input.payload.version.variable;
  expect(evaluateMeasurementConfiguration(input).checks[3].status).toBe(
    "unknown",
  );
  input.input.payload.version.variable = [];
  delete input.input.payload.collections.variable;
  expect(evaluateMeasurementConfiguration(input).checks[3].status).toBe(
    "unknown",
  );
});
it("treats deleted GTM snapshots as ineligible current configuration", () => {
  const input = fixture("gtm-version");
  input.input.payload.version.deleted = true;
  expect(
    evaluateMeasurementConfiguration(input).checks.every(
      (c) => c.status === "unknown",
    ),
  ).toBe(true);
});
it("rejects contradictory completeness, malformed values and oversized contracts", () => {
  for (const mutate of [
    (x) => {
      x.input.payload.collections.trigger.nextPageToken = "more";
    },
    (x) => {
      x.input.payload.version.tag[0].firingTriggerId = ["5", "5"];
    },
    (x) => {
      x.contract.expectations[0].expected = "false";
    },
    (x) => {
      x.contract.expectations = Array.from({ length: 101 }, (_, i) => ({
        ...x.contract.expectations[0],
        id: `e${i}`,
      }));
    },
  ]) {
    const input = fixture("gtm-version");
    mutate(input);
    expect(() => evaluateMeasurementConfiguration(input)).toThrow();
  }
});
it("rejects resource names from the wrong GA4 collection even under the same property", () => {
  for (const collection of ["dataStreams", "keyEvents"]) {
    const input = fixture();
    input.input.payload[collection][0].name =
      collection === "keyEvents"
        ? "properties/123/dataStreams/8"
        : "properties/123/keyEvents/7";
    expect(() => evaluateMeasurementConfiguration(input)).toThrow(
      /Foreign property stream\/key event/,
    );
  }
});
it("compares timezone aliases as equivalent configured reporting zones", () => {
  const input = fixture();
  input.input.payload.property.timeZone = "Asia/Saigon";
  expect(evaluateMeasurementConfiguration(input).checks[0].status).toBe("pass");
});
it("binds freshness policy and resource scope in the evaluation digest", () => {
  const first = fixture(),
    second = fixture();
  second.context.maxAgeSeconds = 10000;
  expect(evaluateMeasurementConfiguration(first).digest).not.toBe(
    evaluateMeasurementConfiguration(second).digest,
  );
});
it("requires complete key-event collection to establish unique event-name matching", () => {
  for (const method of ["ONCE_PER_EVENT", "ONCE_PER_SESSION"]) {
    const input = fixture();
    input.input.payload.collections.keyEvents.complete = false;
    input.input.payload.keyEvents[0].countingMethod = method;
    expect(evaluateMeasurementConfiguration(input).checks[2]).toMatchObject({
      status: "unknown",
      reason: "incomplete-collection",
    });
  }
});
it("rejects malformed GTM deletion flags rather than considering the version active", () => {
  const input = fixture("gtm-version");
  input.input.payload.version.deleted = "true";
  expect(() => evaluateMeasurementConfiguration(input)).toThrow(/deleted/);
});
it("rejects extra importer comparison filters so mismatches remain evaluator findings", () => {
  const input = fixture();
  input.context.expectedTimezone = "Asia/Ho_Chi_Minh";
  expect(() => evaluateMeasurementConfiguration(input)).toThrow(
    /assessment context/,
  );
});
it("bounds source data and rejects non-JSON evidence before normalization", () => {
  for (const mutate of [
    (x) => {
      x.input.payload.notes = "x".repeat(2 * 1024 * 1024);
    },
    (x) => {
      x.input.payload.nested = { nan: Number.NaN };
    },
    (x) => {
      x.input.payload.self = x.input.payload;
    },
    (x) => {
      x.input.payload.metadata = new Date();
    },
    (x) => {
      Object.defineProperty(x.input.payload, "hidden", {
        enumerable: true,
        get() {
          throw new Error("getter executed");
        },
      });
    },
  ]) {
    const input = fixture();
    mutate(input);
    expect(() => evaluateMeasurementConfiguration(input)).toThrow(
      /bounded JSON/,
    );
  }
});
