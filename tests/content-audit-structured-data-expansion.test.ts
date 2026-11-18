import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { expandStructuredDataCapture } from "../scripts/enterprise-technical-seo/structured-data-expansion.mjs";
const scope = {
  customerId: "customer",
  entityId: "site",
  environment: "production",
  targetUrl: "https://example.com/page",
  profileId: "desktop",
  stateId: "anonymous",
};
const context = {
  ...scope,
  method: "html-source",
  assessmentAt: "2026-11-19T12:00:00Z",
  maxAgeSeconds: 3600,
  expectedTypes: null,
};
function fixture() {
  return {
    schemaVersion: 2,
    scope: { ...scope },
    method: "html-source",
    capturedAt: "2026-11-19T11:30:00Z",
    baseUrl: "https://example.com/base/",
    projection: {
      complete: true,
      blocks: [
        {
          id: "jsonld-0",
          text: JSON.stringify({
            "@context": { "@vocab": "https://schema.org/" },
            "@id": "item",
            "@type": "Product",
            name: "PRIVATE_VALUE",
          }),
        },
      ],
    },
    otherFormatsObserved: [],
  };
}
function source(raw: unknown) {
  const artifactText = JSON.stringify(raw);
  return {
    sourceId: "capture",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
}
const options = { contexts: [], totalTimeoutMs: 5000 };
it("binds private expansion to source scope, method, time, block and observed base", async () => {
  const s = source(fixture());
  const r = await expandStructuredDataCapture(context, s, options);
  expect(r.status).toBe("expanded");
  expect(r.artifactHash).toBe(s.artifactHash);
  expect(r.scope).toEqual(scope);
  expect(r.method).toBe("html-source");
  expect(r.blocks[0].expansion.graph[0]["@id"]).toBe(
    "https://example.com/base/item",
  );
  expect(r.blocks[0].locator).toBe("projection.blocks[0].text");
  expect(r.semanticAcceptance).toBe(false);
});
it("does not infer a base for legacy captures", async () => {
  const { baseUrl, ...raw } = fixture();
  void baseUrl;
  raw.schemaVersion = 1;
  const r = await expandStructuredDataCapture(context, source(raw), options);
  expect(r.reason).toBe("document-base-evidence-unavailable");
  expect(r.blocks).toEqual([]);
});
it("withholds expired evidence at the exclusive boundary", async () => {
  const r = await expandStructuredDataCapture(
    { ...context, assessmentAt: "2026-11-19T12:30:00Z" },
    source(fixture()),
    options,
  );
  expect(r.reason).toBe("expired-structured-data-capture");
  expect(r.blocks).toEqual([]);
});
it("rejects scope and artifact tampering before expanding", async () => {
  const s = source(fixture());
  await expect(
    expandStructuredDataCapture({ ...context, stateId: "other" }, s, options),
  ).rejects.toThrow();
  await expect(
    expandStructuredDataCapture(
      context,
      { ...s, artifactHash: "0".repeat(64) },
      options,
    ),
  ).rejects.toThrow();
});
it("never promotes an incomplete projection or missing context", async () => {
  const f = fixture();
  f.projection.complete = false;
  expect(
    (await expandStructuredDataCapture(context, source(f), options)).status,
  ).toBe("unknown");
  f.projection.complete = true;
  f.projection.blocks[0].text = JSON.stringify({
    "@context": "https://missing.example/",
    name: "PRIVATE_VALUE",
  });
  const r = await expandStructuredDataCapture(context, source(f), options);
  expect(r.status).toBe("unknown");
  expect(r.blocks[0].expansion.graph).toBeNull();
  expect(JSON.stringify(r)).not.toContain("PRIVATE_VALUE");
});
it("keeps same-id nodes from distinct scripts separate", async () => {
  const f = fixture();
  f.projection.blocks.push({ ...f.projection.blocks[0], id: "jsonld-1" });
  const r = await expandStructuredDataCapture(context, source(f), options);
  expect(r.blocks).toHaveLength(2);
  expect(r.blocks[0].expansion.graph).toHaveLength(1);
});
it("rejects unsafe base evidence and invalid aggregate budgets", async () => {
  const f = fixture();
  f.baseUrl = "file:///private";
  await expect(
    expandStructuredDataCapture(context, source(f), options),
  ).rejects.toThrow();
  await expect(
    expandStructuredDataCapture(context, source(fixture()), {
      ...options,
      totalTimeoutMs: 10001,
    }),
  ).rejects.toThrow();
});
it("keeps empty captures unknown", async () => {
  const f = fixture();
  f.projection.blocks = [];
  expect(
    (await expandStructuredDataCapture(context, source(f), options)).reason,
  ).toBe("no-jsonld-blocks-observed");
});

it("validates context budgets even when capture cannot expand", async () => {
  const f = fixture();
  f.projection.blocks = [];
  await expect(
    expandStructuredDataCapture(context, source(f), {
      ...options,
      contexts: Array.from({ length: 17 }, () => ({})),
    }),
  ).rejects.toThrow("context count");
  const text = " ".repeat(128 * 1024 + 1);
  await expect(
    expandStructuredDataCapture(context, source(f), {
      ...options,
      contexts: [
        {
          url: "https://example.com/context",
          documentText: text,
          sha256: createHash("sha256").update(text).digest("hex"),
        },
      ],
    }),
  ).rejects.toThrow("context bytes");
});
