import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { normalizeTechnicalSeoAttempt } from "../skills/content-search-audit/scripts/lib/technical-seo/acquisition.mjs";
const scope = {
  customerId: "customer",
  entityId: "site",
  environment: "production",
  targetUrl: "https://example.com/",
  profileId: "mobile",
  stateId: "anonymous",
};
function source(raw) {
  const artifactText = JSON.stringify(raw);
  return {
    sourceId: "capture",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
}
function fixture(kind = "canonical", captured = false) {
  const capturedAt = "2026-11-19T11:30:00Z";
  const target = {
    targetId: "page",
    kind,
    scope: { ...scope },
    method: ["canonical", "index-controls"].includes(kind)
      ? null
      : "html-source",
    window: { from: "2026-11-19T11:00:00Z", to: "2026-11-19T12:00:00Z" },
    maxAgeSeconds: 3600,
  };
  const raw =
    kind === "canonical"
      ? {
          schemaVersion: 1,
          scope,
          capturedAt,
          layers: {
            sourceHead: { complete: true, targets: [scope.targetUrl] },
            renderedHead: { complete: true, targets: [scope.targetUrl] },
            httpLink: { complete: true, targets: [] },
          },
        }
      : kind === "index-controls"
        ? {
            schemaVersion: 1,
            scope,
            capturedAt,
            response: { url: scope.targetUrl, status: 200 },
            robots: {
              url: "https://example.com/robots.txt",
              capturedAt,
              status: 200,
              body: "User-agent: *\nAllow: /",
              complete: true,
            },
            sourceDocument: { complete: true, meta: [] },
            renderedDocument: { complete: true, meta: [] },
            httpHeaders: { complete: true, values: [] },
          }
        : kind === "hreflang"
          ? {
              schemaVersion: 1,
              scope,
              method: target.method,
              pages: [
                {
                  url: scope.targetUrl,
                  capturedAt,
                  complete: true,
                  alternates: [{ language: "en", targetUrl: scope.targetUrl }],
                },
              ],
            }
          : {
              schemaVersion: 2,
              scope,
              method: target.method,
              baseUrl: scope.targetUrl,
              capturedAt,
              projection: {
                complete: true,
                blocks: [
                  {
                    id: "jsonld-0",
                    text: '{"@context":"https://schema.org","@type":"Product"}',
                  },
                ],
              },
              otherFormatsObserved: [],
            };
  const result = {
    status: captured ? "captured" : "unknown",
    synthetic: false,
    scope: { ...scope },
    startedAt: "2026-11-19T11:29:00Z",
    finishedAt: "2026-11-19T11:31:00Z",
    gaps: captured ? [] : ["collection-deadline"],
    executionAuthenticated: false,
    semanticAcceptance: false,
    ...(captured
      ? target.method === null
        ? { source: source(raw) }
        : { sources: [source(raw)] }
      : {}),
  };
  return {
    target,
    attempt: {
      attemptId: "attempt-one",
      collectorVersion: "fixture-v1",
      result,
    },
    assessmentAt: "2026-11-19T12:00:00Z",
  };
}
it.each(["canonical", "index-controls", "hreflang", "structured-data"])(
  "retains %s failure without fabricating observation time or capture",
  (kind) => {
    const input = fixture(kind);
    const before = JSON.stringify(input);
    const normalized = normalizeTechnicalSeoAttempt(input);
    expect(normalized.availability.status).toBe("unknown");
    expect(normalized.capture).toBeNull();
    expect(normalized.captureObservedAt).toBeNull();
    expect(normalized.startedAt).toBe(input.attempt.result.startedAt);
    expect(normalized.target).toEqual(input.target);
    expect(JSON.stringify(input)).toBe(before);
  },
);
it.each(["canonical", "index-controls", "hreflang", "structured-data"])(
  "validates matching %s capture only as availability",
  (kind) => {
    const normalized = normalizeTechnicalSeoAttempt(fixture(kind, true));
    expect(normalized.availability.status).toBe("pass");
    expect(normalized.captureObservedAt).toBe("2026-11-19T11:30:00Z");
    expect(normalized.executionAuthenticated).toBe(false);
    expect(normalized.semanticAcceptance).toBe(false);
    expect(normalized).not.toHaveProperty("checks");
  },
);
it("keeps synthetic captures and expired captures unknown", () => {
  const input = fixture("canonical", true);
  input.attempt.result.synthetic = true;
  expect(normalizeTechnicalSeoAttempt(input).availability.reason).toBe(
    "synthetic-capture",
  );
  input.attempt.result.synthetic = false;
  input.assessmentAt = "2026-11-19T12:30:00Z";
  expect(normalizeTechnicalSeoAttempt(input).availability.reason).toBe(
    "expired-capture",
  );
});
it("does not resolve a historical window with a later retry", () => {
  const input = fixture("canonical", true);
  input.target.window.to = "2026-11-19T11:30:00Z";
  expect(() => normalizeTechnicalSeoAttempt(input)).toThrow(/window/i);
});
it("resolves source and rendered methods independently", () => {
  const input = fixture("structured-data", true);
  input.target.method = "html-rendered";
  expect(normalizeTechnicalSeoAttempt(input).availability.reason).toBe(
    "requested-method-unavailable",
  );
});
it("rejects capture bytes bound to another profile and timestamps outside the attempt", () => {
  const input = fixture("canonical", true);
  const raw = JSON.parse(input.attempt.result.source.artifactText);
  raw.scope.profileId = "other-profile";
  input.attempt.result.source = source(raw);
  expect(() => normalizeTechnicalSeoAttempt(input)).toThrow();
  raw.scope.profileId = scope.profileId;
  raw.capturedAt = "2026-11-19T11:28:00Z";
  input.attempt.result.source = source(raw);
  expect(() => normalizeTechnicalSeoAttempt(input)).toThrow(
    /outside acquisition attempt/,
  );
});
it("rejects duplicate method envelopes and asserted execution authority", () => {
  const input = fixture("structured-data", true);
  input.attempt.result.sources.push(
    structuredClone(input.attempt.result.sources[0]),
  );
  expect(() => normalizeTechnicalSeoAttempt(input)).toThrow(
    /duplicate capture method/,
  );
  input.attempt.result.sources.pop();
  input.attempt.result.executionAuthenticated = true;
  expect(() => normalizeTechnicalSeoAttempt(input)).toThrow(/authority/);
});
it("omits private browser diagnostics from normalized attempts", () => {
  const input = fixture();
  Object.assign(input.attempt.result, {
    privateEvidence: { raw: "PRIVATE_DIAGNOSTIC" },
    browserVersion: "diagnostic-only",
    transportSummary: { blocked: 1 },
  });
  const normalized = normalizeTechnicalSeoAttempt(input);
  expect(JSON.stringify(normalized)).not.toContain("PRIVATE_DIAGNOSTIC");
  expect(normalized).not.toHaveProperty("privateEvidence");
  expect(normalized).not.toHaveProperty("browserVersion");
});
it("retains bounded source records for missing-method replay and later expiry", () => {
  const input = fixture("structured-data", true);
  input.target.method = "html-rendered";
  const normalized = normalizeTechnicalSeoAttempt(input);
  expect(normalized.sourceRecord.attempt.result.sources).toEqual(
    input.attempt.result.sources,
  );
  const replay = normalizeTechnicalSeoAttempt({
    ...normalized.sourceRecord,
    assessmentAt: input.assessmentAt,
  });
  expect(replay).toEqual(normalized);
  const later = normalizeTechnicalSeoAttempt({
    ...normalized.sourceRecord,
    assessmentAt: "2026-11-19T13:00:00Z",
  });
  expect(later.sourceDigest).toBe(normalized.sourceDigest);
  const failure = fixture();
  const failed = normalizeTechnicalSeoAttempt(failure);
  expect(failed.sourceRecord.attempt.result).not.toHaveProperty("source");
  expect(failed.sourceRecord.attempt.result).not.toHaveProperty("sources");
  expect(
    normalizeTechnicalSeoAttempt({
      ...failed.sourceRecord,
      assessmentAt: failure.assessmentAt,
    }),
  ).toEqual(failed);
});
it.each([
  "foreign-scope",
  "forged-hash",
  "future-attempt",
  "authority",
  "failed-with-source",
  "bad-target",
])("rejects %s", (condition) => {
  const input = fixture("canonical", true);
  if (condition === "foreign-scope")
    input.attempt.result.scope.profileId = "foreign";
  if (condition === "forged-hash")
    input.attempt.result.source.artifactHash = "0".repeat(64);
  if (condition === "future-attempt")
    input.attempt.result.finishedAt = "2026-11-20T12:00:00Z";
  if (condition === "authority")
    Object.assign(input.attempt.result, { authorized: true });
  if (condition === "failed-with-source")
    input.attempt.result.status = "unknown";
  if (condition === "bad-target") input.target.kind = "invented";
  expect(() => normalizeTechnicalSeoAttempt(input)).toThrow();
});
it("does not treat redirected index-control response as direct capture availability", () => {
  const input = fixture("index-controls", true);
  const raw = JSON.parse(input.attempt.result.source.artifactText);
  raw.response.url = "https://example.com/redirected";
  input.attempt.result.source = source(raw);
  expect(normalizeTechnicalSeoAttempt(input).availability.reason).toBe(
    "response-not-direct-success",
  );
});
it.each([
  "redirected-scope",
  "response-status-not-200",
  "navigation-binding-unavailable",
])(
  "keeps canonical %s collector results unknown despite an envelope",
  (gap) => {
    const input = fixture("canonical", true);
    const raw = JSON.parse(input.attempt.result.source.artifactText);
    for (const layer of Object.values(raw.layers))
      Object.assign(layer, { complete: false, targets: [] });
    input.attempt.result.source = source(raw);
    input.attempt.result.gaps = [gap];
    const normalized = normalizeTechnicalSeoAttempt(input);
    expect(normalized.availability).toEqual({
      status: "unknown",
      reason: "collection-scope-or-response-unavailable",
    });
    expect(normalized.capture).not.toBeNull();
  },
);
it("keeps source availability separate from a failed rendered environment", () => {
  const input = fixture("structured-data", true);
  const rendered = JSON.parse(input.attempt.result.sources[0].artifactText);
  rendered.method = "html-rendered";
  rendered.projection = { complete: false, blocks: [] };
  input.attempt.result.sources.push(source(rendered));
  input.attempt.result.gaps = ["rendered-environment-incomplete"];
  expect(normalizeTechnicalSeoAttempt(input).availability.status).toBe("pass");
  input.target.method = "html-rendered";
  expect(normalizeTechnicalSeoAttempt(input).availability).toEqual({
    status: "unknown",
    reason: "rendered-capture-unavailable",
  });
});
it.each([
  "foreign-customer",
  "foreign-url",
  "unsupported-schema",
  "outside-attempt",
  "outside-window",
])(
  "rejects retained sibling with %s even when selected source is usable",
  (condition) => {
    const input = fixture("structured-data", true);
    const sibling = JSON.parse(input.attempt.result.sources[0].artifactText);
    sibling.method = "html-rendered";
    if (condition === "foreign-customer") sibling.scope.customerId = "other";
    if (condition === "foreign-url")
      sibling.scope.targetUrl = "https://other.example/";
    if (condition === "unsupported-schema") sibling.schemaVersion = 999;
    if (condition === "outside-attempt")
      sibling.capturedAt = "2026-11-19T11:28:00Z";
    if (condition === "outside-window") {
      input.target.window.to = "2026-11-19T11:30:30Z";
      sibling.capturedAt = "2026-11-19T11:30:40Z";
    }
    input.attempt.result.sources.push(source(sibling));
    expect(() => normalizeTechnicalSeoAttempt(input)).toThrow();
  },
);
