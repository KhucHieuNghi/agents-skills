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
  expect(statuses(r)).toEqual(["pass", "pass", "unknown", "unknown", "pass"]);
  expect(r.richResultEligibility).toBe("unknown");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_PRODUCT");
});
it("compares explicit JSON-LD type intent separately from validity", () => {
  const r = run(fixture(), { ...context, expectedTypes: ["Product"] });
  expect(statuses(r)).toEqual(["pass", "pass", "pass", "unknown", "pass"]);
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
  expect(statuses(run(f))).toEqual([
    "pass",
    "fail",
    "unknown",
    "unknown",
    "unknown",
  ]);
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

it("accepts explicit 3DModel owner policy and observes its presence", () => {
  const raw = fixture();
  raw.projection.blocks[0].text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "3DModel",
  });
  expect(
    statuses(run(raw, { ...context, expectedTypes: ["3DModel"] }))[2],
  ).toBe("pass");
});

const membership = (r: ReturnType<typeof run>) =>
  r.checks.find(
    (c: { ruleId: string }) => c.ruleId === "jsonld-schema-class-membership",
  );
it("checks pinned class membership without claiming full vocabulary validity", () => {
  const r = run();
  expect(membership(r)?.status).toBe("pass");
  expect(membership(r)?.reason).toContain("30.1");
  expect(r.typeVocabularyValidity).toBe("unknown");
});
it.each(["name", "Monday"])(
  "reports observed non-class type %s with private locator",
  (type) => {
    const f = fixture();
    f.projection.blocks[0].text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": type,
    });
    f.projection.complete = false;
    const c = membership(run(f));
    expect(c?.status).toBe("fail");
    expect(c?.reason).toContain("projection.blocks[0].text");
  },
);
it("keeps unlisted names and incomplete type enumeration unknown", () => {
  const f = fixture();
  f.projection.blocks[0].text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PRIVATE_UNLISTED",
  });
  // Unsupported punctuation requires expansion, so use a supported unlisted name for the snapshot check.
  f.projection.blocks[0].text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PrivateUnlisted",
  });
  const r = run(f);
  expect(membership(r)?.status).toBe("unknown");
  expect(JSON.stringify(r.dataRequests)).not.toContain("PrivateUnlisted");
  expect(JSON.stringify(r.dataRequests)).toContain("vocabulary");
  f.projection.blocks[0].text = fixture().projection.blocks[0].text;
  f.projection.complete = false;
  expect(membership(run(f))?.status).toBe("unknown");
});
it("preserves pending and superseded class metadata without rejecting class membership", () => {
  const f = fixture();
  f.projection.blocks[0].text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": ["TouristTrip", "UserLikes"],
  });
  const r = run(f);
  expect(membership(r)?.status).toBe("pass");
  expect(
    r.vocabularyObservations.map((x: { section: string }) => x.section),
  ).toContain("pending");
  expect(membership(r)?.reason).toContain("superseded");
});
it("expires membership findings and does not pass an empty graph", () => {
  const f = fixture();
  f.projection.blocks[0].text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "name",
  });
  expect(
    membership(run(f, { ...context, assessmentAt: "2026-11-19T12:30:00Z" }))
      ?.status,
  ).toBe("unknown");
  f.projection.blocks = [];
  expect(membership(run(f))?.status).toBe("unknown");
});

it("describes evaluator membership limits without contradicting the new check", () => {
  const r = run();
  expect(r.limitations.join(" ")).not.toContain(
    "not validated vocabulary membership",
  );
  expect(r.limitations.join(" ")).toContain("Pinned class membership only");
});
