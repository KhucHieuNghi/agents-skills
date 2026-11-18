import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { normalizeBusinessObservations } from "../skills/content-search-audit/scripts/lib/business-observations.mjs";

function fixture() {
  const dictionary = {
    version: "1",
    sourceSystem: "orders",
    outcomes: [
      {
        outcomeId: "order-payment",
        businessModel: "commerce",
        allowedStatuses: ["attempt", "settled", "rejected", "refunded"],
        successStatuses: ["settled"],
      },
    ],
  };
  const context = {
    customerId: "customer",
    entityId: "checkout",
    assessmentAt: "2026-11-18T12:00:00Z",
    sourceSystem: "orders",
    window: { from: "2026-11-01T00:00:00Z", to: "2026-11-18T12:00:00Z" },
  };
  const input = {
    customerId: "customer",
    entityId: "checkout",
    sourceId: "supplied-order-export",
    sourceSystem: "orders",
    sourceKind: "export",
    capturedAt: "2026-11-18T11:00:00Z",
    dictionaryVersion: "1",
    synthetic: true,
    records: [
      {
        recordId: "payment-1",
        subjectId: "order-1",
        outcomeId: "order-payment",
        status: "rejected",
        occurredAt: "2026-11-17T10:00:00Z",
      },
    ],
  };
  return { dictionary, context, input };
}
it("retains rejected business outcomes instead of treating analytics events as success", () => {
  const { dictionary, context, input } = fixture();
  const result = normalizeBusinessObservations(input, dictionary, context);
  expect(result.records[0]).toMatchObject({
    status: "rejected",
    matchesDeclaredSuccess: false,
  });
  expect(result).toMatchObject({
    providerAuthenticated: false,
    causalAttribution: false,
    totals: null,
  });
});
it("preserves status transitions and currencies without computing cross-currency totals", () => {
  const { dictionary, context, input } = fixture();
  input.records = [
    {
      recordId: "event-1",
      subjectId: "order-1",
      outcomeId: "order-payment",
      status: "settled",
      occurredAt: "2026-11-17T09:00:00Z",
      amount: { value: "9007199254740993.25", currency: "VND" },
    },
    {
      recordId: "event-2",
      subjectId: "order-1",
      outcomeId: "order-payment",
      status: "refunded",
      occurredAt: "2026-11-17T10:00:00Z",
      amount: { value: "10.00", currency: "USD" },
    },
  ];
  const result = normalizeBusinessObservations(input, dictionary, context);
  expect(result.records.map((row) => row.matchesDeclaredSuccess)).toEqual([
    true,
    false,
  ]);
  expect(result.records[0].amount.value).toBe("9007199254740993.25");
  expect(result.gaps.map((gap) => gap.code)).toContain("mixed-currency");
  expect(result.totals).toBeNull();
});
it("rejects missing dictionary semantics, foreign ownership, duplicates and out-of-window records", () => {
  for (const mutate of [
    (input) => (input.customerId = "foreign"),
    (input) => (input.dictionaryVersion = "unknown"),
    (input) => (input.records[0].status = "purchase"),
    (input) => input.records.push({ ...input.records[0] }),
    (input) => (input.records[0].occurredAt = "2026-10-01T00:00:00Z"),
    (input) => (input.records[0].occurredAt = "2026-11-18T12:00:00Z"),
  ]) {
    const { dictionary, context, input } = fixture();
    mutate(input);
    expect(() =>
      normalizeBusinessObservations(input, dictionary, context),
    ).toThrow();
  }
});
it("marks manual assertions and missing identifiers as gaps without inventing a match", () => {
  const { dictionary, context, input } = fixture();
  input.sourceKind = "manual";
  input.records[0].subjectId = null;
  const result = normalizeBusinessObservations(input, dictionary, context);
  expect(result.gaps.map((gap) => gap.code)).toEqual(
    expect.arrayContaining(["manual-assertion", "unmatched-business-identity"]),
  );
  expect(result.records[0].subjectId).toBeNull();
});

it("rejects contradictory row ownership and preserves amount precision", () => {
  const { input, dictionary, context } = fixture();
  input.records[0].customerId = "foreign";
  expect(() =>
    normalizeBusinessObservations(input, dictionary, context),
  ).toThrow(/ownership/);
  delete input.records[0].customerId;
  input.records[0].amount = {
    value: "100",
    currency: "USD",
    precision: "approximate",
  };
  expect(
    normalizeBusinessObservations(input, dictionary, context).records[0].amount
      .precision,
  ).toBe("approximate");
});
it("rejects wholly pre-window sources and distinguishes partial capture from full window coverage", () => {
  const { input, dictionary, context } = fixture();
  input.records = [];
  expect(
    normalizeBusinessObservations(input, dictionary, context).gaps.map(
      (item) => item.code,
    ),
  ).toContain("partial-capture-window");
  input.capturedAt = "2026-10-01T00:00:00Z";
  expect(() =>
    normalizeBusinessObservations(input, dictionary, context),
  ).toThrow(/window/);
});
it("requires manual attribution instead of silently asserting its presence", () => {
  const { input, dictionary, context } = fixture();
  input.sourceKind = "manual";
  const missing = normalizeBusinessObservations(input, dictionary, context);
  expect(missing.gaps.map((item) => item.code)).toContain(
    "missing-source-provenance",
  );
  input.provenance = {
    actor: "owner",
    method: "Owner supplied statement",
    locator: "supplied-interview",
  };
  expect(
    normalizeBusinessObservations(input, dictionary, context).provenance,
  ).toEqual(input.provenance);
});

it("publishes a schema for normalized business observations", async () => {
  const ajv = new Ajv();
  addFormats(ajv);
  const schema = JSON.parse(
    await readFile(
      "skills/content-search-audit/schemas/business-observation.schema.json",
      "utf8",
    ),
  );
  const validate = ajv.compile(schema);
  const { input, dictionary, context } = fixture();
  const result = normalizeBusinessObservations(input, dictionary, context);
  expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
  expect(validate({ ...result, providerAuthenticated: true })).toBe(false);
});
