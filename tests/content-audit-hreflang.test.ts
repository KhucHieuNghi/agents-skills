import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development ESM evaluator
import { evaluateHreflangCapture } from "../scripts/enterprise-technical-seo/hreflang.mjs";
const url = "https://example.com/en";
const scope = {
  customerId: "customer",
  entityId: "site",
  environment: "production",
  targetUrl: url,
  profileId: "desktop",
  stateId: "anonymous",
};
const context = {
  ...scope,
  method: "html-source",
  assessmentAt: "2026-11-19T12:00:00Z",
  maxAgeSeconds: 3600,
};
function capture() {
  return {
    schemaVersion: 1,
    scope: { ...scope },
    method: "html-source",
    pages: [
      {
        url,
        capturedAt: "2026-11-19T11:30:00Z",
        complete: true,
        alternates: [
          { language: "en", targetUrl: url },
          { language: "de", targetUrl: "https://example.de/de" },
        ],
      },
    ],
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
it("binds checks and requests without authenticating execution", () => {
  const r = evaluateHreflangCapture(context, envelope(capture()));
  expect(r.checks.map((x: { status: string }) => x.status)).toEqual([
    "pass",
    "unknown",
    "pass",
    "pass",
  ]);
  expect(r.validUntil).toBe("2026-11-19T12:30:00.000Z");
  expect(r.dataRequests[0]).toMatchObject({
    scope,
    method: "html-source",
    ownerRole: "website-engineering",
  });
  expect(r.executionAuthenticated).toBe(false);
  expect(r.semanticAcceptance).toBe(false);
});
it.each([
  "customerId",
  "entityId",
  "environment",
  "profileId",
  "stateId",
  "targetUrl",
])("rejects mismatched %s", (key) => {
  const raw = capture();
  Object.assign(raw.scope, {
    [key]: key === "targetUrl" ? url + "/" : "other",
  });
  expect(() => evaluateHreflangCapture(context, envelope(raw))).toThrow();
});
it("does not combine acquisition methods", () => {
  const raw = capture();
  raw.method = "html-rendered";
  expect(() => evaluateHreflangCapture(context, envelope(raw))).toThrow(
    "Mismatched method",
  );
});
it("rejects tampering, duplicate JSON keys and unexpected input fields", () => {
  expect(() =>
    evaluateHreflangCapture(context, {
      ...envelope(capture()),
      artifactHash: "0".repeat(64),
    }),
  ).toThrow();
  expect(() =>
    evaluateHreflangCapture(
      context,
      envelope(
        JSON.stringify(capture()).replace(
          '"schemaVersion":1',
          '"schemaVersion":1,"schemaVersion":1',
        ),
      ),
    ),
  ).toThrow();
  expect(() =>
    evaluateHreflangCapture(
      { ...context, secret: "never-echo" },
      envelope(capture()),
    ),
  ).toThrow("Invalid context fields");
});
it("missing and expired roots remain unknown", () => {
  const raw = capture();
  raw.pages = [];
  expect(
    evaluateHreflangCapture(context, envelope(raw)).checks.every(
      (x: { status: string }) => x.status === "unknown",
    ),
  ).toBe(true);
  raw.pages = capture().pages;
  raw.pages[0].capturedAt = "2026-11-19T11:00:00Z";
  expect(
    evaluateHreflangCapture(context, envelope(raw)).checks.every(
      (x: { status: string }) => x.status === "unknown",
    ),
  ).toBe(true);
});
it("bounds validity by fresh target dependencies, ignoring unrelated stale pages", () => {
  const raw = capture();
  raw.pages.push({
    ...raw.pages[0],
    url: "https://example.de/de",
    capturedAt: "2026-11-19T11:01:00Z",
  });
  raw.pages.push({
    ...raw.pages[0],
    url: "https://example.org/unrelated",
    capturedAt: "2026-11-19T10:00:00Z",
  });
  expect(evaluateHreflangCapture(context, envelope(raw)).validUntil).toBe(
    "2026-11-19T12:01:00.000Z",
  );
});
it("rejects over-budget source before parsing", () => {
  expect(() =>
    evaluateHreflangCapture(context, envelope(" ".repeat(1024 * 1024 + 1))),
  ).toThrow("Invalid artifact bytes or hash");
});

it("uses original artifact indices despite duplicate/self declarations", () => {
  const raw = capture();
  raw.pages[0].alternates.splice(1, 0, { language: "en-US", targetUrl: url });
  raw.pages.unshift({
    ...raw.pages[0],
    url: "https://unrelated.example/",
    alternates: [],
  });
  const result = evaluateHreflangCapture(context, envelope(raw));
  expect(result.dataRequests[0].requestedArtifact).toContain(
    "pages[1].alternates[2].targetUrl",
  );
  expect(result.dataRequests[0].requestedArtifact).toContain(
    "missing-target-capture",
  );
});
