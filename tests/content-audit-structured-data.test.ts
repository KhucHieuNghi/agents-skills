import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { evaluateStructuredData } from "../scripts/enterprise-technical-seo/structured-data.mjs";
const scope = {
  customerId: "customer",
  entityId: "site",
  environment: "production",
  targetUrl: "https://example.com/product",
  profileId: "desktop",
  stateId: "anonymous",
};
const context = {
  ...scope,
  method: "html-source",
  assessmentAt: "2026-11-19T12:00:00Z",
  maxAgeSeconds: 3600,
  expectedTypes: null as string[] | null,
};
function fixture() {
  return {
    schemaVersion: 1,
    scope: { ...scope },
    method: "html-source",
    capturedAt: "2026-11-19T11:30:00Z",
    projection: {
      complete: true,
      blocks: [
        {
          id: "jsonld-0",
          text: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "PRIVATE_PRODUCT",
          }),
        },
      ],
    },
    otherFormatsObserved: [] as string[],
  };
}
function envelope(raw: unknown) {
  const artifactText = typeof raw === "string" ? raw : JSON.stringify(raw);
  return {
    sourceId: "capture",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
}
function run(raw = fixture(), ctx = context) {
  return evaluateStructuredData(ctx, envelope(raw));
}
function statuses(result: ReturnType<typeof run>) {
  return result.checks.map((c: { status: string }) => c.status);
}
it("keeps owner policy and visible content unknown without inventing a requirement", () => {
  const r = run();
  expect(statuses(r)).toEqual(["pass", "pass", "unknown", "unknown"]);
  expect(r.richResultEligibility).toBe("unknown");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_PRODUCT");
});
it("compares explicit JSON-LD type intent separately from validity", () => {
  const r = run(fixture(), { ...context, expectedTypes: ["Product"] });
  expect(statuses(r)).toEqual(["pass", "pass", "pass", "unknown"]);
  expect(r.typeVocabularyValidity).toBe("unknown");
});
it("known type absence can fail explicit serialization policy", () => {
  const f = fixture();
  f.projection.blocks = [];
  f.otherFormatsObserved = ["microdata-marker"];
  expect(
    run(f, { ...context, expectedTypes: ["Product"] }).checks[2].status,
  ).toBe("fail");
});
it("absent schema without policy remains unknown", () => {
  const f = fixture();
  f.projection.blocks = [];
  expect(statuses(run(f))).toEqual([
    "unknown",
    "unknown",
    "unknown",
    "unknown",
  ]);
});
it("unsupported context prevents false missing-type findings", () => {
  const f = fixture();
  f.projection.blocks[0].text = JSON.stringify({
    "@context": "https://private.example/context",
    kind: "Product",
  });
  expect(
    run(f, { ...context, expectedTypes: ["Product"] }).checks[2].status,
  ).toBe("unknown");
});
it("incomplete enumeration cannot prove absence but can retain observed presence", () => {
  const f = fixture();
  f.projection.complete = false;
  expect(
    run(f, { ...context, expectedTypes: ["Product"] }).checks[2].status,
  ).toBe("pass");
  expect(
    run(f, { ...context, expectedTypes: ["Event"] }).checks[2].status,
  ).toBe("unknown");
});
it("invalid JSON has a syntax failure without parser data leakage", () => {
  const f = fixture();
  f.projection.blocks[0].text = '{"secret":"PRIVATE_VALUE",';
  const r = run(f);
  expect(r.checks[0].status).toBe("fail");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_VALUE");
});
it("scalar JSON fails root shape, not JSON syntax", () => {
  const f = fixture();
  f.projection.blocks[0].text = "42";
  expect(statuses(run(f))).toEqual(["pass", "fail", "unknown", "unknown"]);
});
it("expiry is exclusive and prevents stale failures", () => {
  const f = fixture();
  f.capturedAt = "2026-11-19T11:00:00Z";
  f.projection.blocks[0].text = "{";
  expect(statuses(run(f))).toEqual([
    "unknown",
    "unknown",
    "unknown",
    "unknown",
  ]);
});
it.each([
  "customerId",
  "entityId",
  "environment",
  "profileId",
  "stateId",
  "targetUrl",
])("rejects mismatched %s", (key) => {
  const f = fixture();
  Object.assign(f.scope, {
    [key]: key === "targetUrl" ? scope.targetUrl + "/" : "other",
  });
  expect(() => run(f)).toThrow();
});
it("rejects method mixing and future capture", () => {
  const f = fixture();
  f.method = "html-rendered";
  expect(() => run(f)).toThrow("method");
  f.method = "html-source";
  f.capturedAt = "2026-11-19T12:00:01Z";
  expect(() => run(f)).toThrow("Future");
});
it("rejects outer ambiguous JSON and tampering", () => {
  const s = envelope(fixture());
  expect(() =>
    evaluateStructuredData(context, { ...s, artifactHash: "0".repeat(64) }),
  ).toThrow();
  expect(() =>
    evaluateStructuredData(
      context,
      envelope(
        s.artifactText.replace(
          '"schemaVersion":1',
          '"schemaVersion":1,"schemaVersion":1',
        ),
      ),
    ),
  ).toThrow();
});
it("rejects invalid owner policy and unsupported format markers", () => {
  for (const expectedTypes of [[], ["Product", "Product"], ["<script>"]])
    expect(() => run(fixture(), { ...context, expectedTypes })).toThrow();
  const f = fixture();
  f.otherFormatsObserved = ["claimed-valid-rdfa"];
  expect(() => run(f)).toThrow();
});

it("identifies failing blocks through private source locators without raw text", () => {
  const f = fixture();
  f.projection.blocks.push({ id: "jsonld-1", text: '{"PRIVATE_BAD":' });
  const r = run(f);
  expect(r.checks[0].reason).toContain("projection.blocks[1].text");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_BAD");
});
