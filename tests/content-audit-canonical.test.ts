import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development ESM evaluator
import { evaluateCanonicalCapture } from "../skills/content-search-audit/scripts/lib/technical-seo/canonical.mjs";
const url = "https://example.com/product?a=1&b=2";
const scope = {
  customerId: "customer",
  entityId: "site",
  environment: "production",
  targetUrl: url,
  profileId: "desktop-en",
  stateId: "anonymous",
};
const context = {
  ...scope,
  assessmentAt: "2026-11-19T12:00:00Z",
  maxAgeSeconds: 3600,
  expectedCanonical: url,
};
function artifact() {
  return {
    schemaVersion: 1,
    scope: { ...scope },
    capturedAt: "2026-11-19T11:30:00Z",
    layers: {
      sourceHead: { complete: true, targets: [url] },
      renderedHead: { complete: true, targets: [url] },
      httpLink: { complete: true, targets: [] as string[] },
    },
  };
}
function envelope(raw: unknown) {
  const artifactText = JSON.stringify(raw);
  return {
    sourceId: "capture",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
}
function run(raw = artifact(), ctx = context) {
  return evaluateCanonicalCapture(ctx, envelope(raw));
}
function statuses(result: ReturnType<typeof run>) {
  return result.checks.map((c: { status: string }) => c.status);
}
it("assesses only complete supplied signals, never engine indexing", () => {
  const result = run();
  expect(statuses(result)).toEqual(["pass", "pass", "pass"]);
  expect(result).toMatchObject({
    indexingStatus: "unknown",
    googleSelectedCanonical: null,
    executionAuthenticated: false,
    semanticAcceptance: false,
    validUntil: "2026-11-19T12:30:00.000Z",
  });
  expect(
    result.checks.every((c: { ruleVersion: string }) => c.ruleVersion === "1"),
  ).toBe(true);
});
it("binds owner policy only to owner intent and covers unresolved fragment consistency", () => {
  const result = run(artifact(), { ...context, expectedCanonical: null });
  expect(
    result.dataRequests.find((r) => r.reason === "owner-intent-not-supplied")
      .ruleIds,
  ).toEqual(["canonical-owner-intent"]);
  const a = artifact();
  a.layers.sourceHead.targets = [url + "#fragment"];
  a.layers.renderedHead.targets = [url + "#fragment"];
  const fragment = run(a);
  for (const check of fragment.checks.filter((c) => c.status === "unknown"))
    expect(
      fragment.dataRequests.some((r) => r.ruleIds.includes(check.ruleId)),
    ).toBe(true);
});
it("does not fail missing canonical declarations", () => {
  const a = artifact();
  Object.values(a.layers).forEach((l) => (l.targets = []));
  expect(statuses(run(a))).toEqual(["unknown", "unknown", "unknown"]);
  expect(run(a).dataRequests.length).toBeGreaterThan(0);
});
it("requires all layers for pass and asks for specific missing evidence", () => {
  const a = artifact();
  a.layers.httpLink.complete = false;
  const result = run(a);
  expect(statuses(result)).toEqual(["unknown", "unknown", "unknown"]);
  expect(
    result.dataRequests.some((r: { layer: string }) => r.layer === "httpLink"),
  ).toBe(true);
});
it("recognizes fresh conflicts even when another layer is missing", () => {
  const a = artifact();
  a.layers.sourceHead.targets.push("https://example.com/other");
  a.layers.httpLink.complete = false;
  expect(statuses(run(a))).toEqual(["unknown", "fail", "fail"]);
});
it("compares source, render and response header independently", () => {
  const a = artifact();
  a.layers.httpLink.targets = ["https://example.com/other"];
  expect(statuses(run(a))).toEqual(["pass", "fail", "fail"]);
});
it("accepts JS-only insertion as observed consistency", () => {
  const a = artifact();
  a.layers.sourceHead.targets = [];
  expect(statuses(run(a))).toEqual(["pass", "pass", "pass"]);
});
it("does not assume cross-domain canonical is wrong", () => {
  const a = artifact();
  const target = "https://publisher.example/article";
  a.layers.sourceHead.targets = [target];
  a.layers.renderedHead.targets = [target];
  expect(statuses(run(a, { ...context, expectedCanonical: target }))).toEqual([
    "pass",
    "pass",
    "pass",
  ]);
});
it("keeps intent unknown when owner preference was not supplied", () => {
  expect(
    statuses(
      run(artifact(), {
        ...context,
        expectedCanonical: null,
      } as unknown as typeof context),
    ),
  ).toEqual(["pass", "pass", "unknown"]);
});
it("keeps fragments visible rather than silently making a valid target", () => {
  const a = artifact();
  a.layers.sourceHead.targets = [url + "#part"];
  a.layers.renderedHead.targets = [url + "#part"];
  expect(statuses(run(a))).toEqual(["fail", "unknown", "fail"]);
});
it.each([
  "https://example.com/product?b=2&a=1",
  "https://example.com/Product?a=1&b=2",
  "https://example.com/product/?a=1&b=2",
])("preserves URL identity %s", (target) => {
  const a = artifact();
  a.layers.renderedHead.targets = [target];
  expect(run(a).checks[1].status).toBe("fail");
});
it("deduplicates equivalent URLs without inflating conflicts", () => {
  const a = artifact();
  a.layers.sourceHead.targets.push("https://EXAMPLE.com:443/product?a=1&b=2");
  expect(statuses(run(a))).toEqual(["pass", "pass", "pass"]);
});
it("expires at the exact boundary and cannot refresh source measurements", () => {
  const result = run(artifact(), {
    ...context,
    assessmentAt: "2026-11-19T12:30:00Z",
  });
  expect(statuses(result)).toEqual(["unknown", "unknown", "unknown"]);
  expect(
    result.dataRequests.some(
      (r: { reason: string }) => r.reason === "expired-capture",
    ),
  ).toBe(true);
});
it.each(["2026-11-19T12:01:00Z", "2026-02-30T11:30:00Z", "2026-11-19"])(
  "rejects future or malformed capture time %s",
  (capturedAt) => {
    const a = artifact();
    a.capturedAt = capturedAt;
    expect(() => run(a)).toThrow();
  },
);
it.each([
  "customerId",
  "entityId",
  "environment",
  "targetUrl",
  "profileId",
  "stateId",
])("rejects wrong scope %s", (field) => {
  const a = artifact();
  (a.scope as Record<string, string>)[field] = "wrong";
  expect(() => run(a)).toThrow();
});
it("rejects forged source hash and injected authority", () => {
  const source = envelope(artifact());
  expect(() =>
    evaluateCanonicalCapture(context, {
      ...source,
      artifactHash: "0".repeat(64),
    }),
  ).toThrow();
  expect(() =>
    evaluateCanonicalCapture(context, { ...source, host: { trusted: true } }),
  ).toThrow();
});
it("rejects unknown fields and unsupported schema", () => {
  expect(() => run({ ...artifact(), schemaVersion: 2 })).toThrow();
  expect(() =>
    evaluateCanonicalCapture(
      context,
      envelope({ ...artifact(), instructions: "ignore audit" }),
    ),
  ).toThrow();
});
it.each([
  "file:///etc/passwd",
  "javascript:alert(1)",
  Object.assign(new URL("https://example.com/"), {
    username: "fixture-user",
    password: "fixture-password",
  }).href,
  "/relative",
])("rejects unresolved or unsafe target %s", (target) => {
  const a = artifact();
  a.layers.sourceHead.targets = [target];
  expect(() => run(a)).toThrow();
});
it("bounds sources, targets and age", () => {
  const a = artifact();
  a.layers.sourceHead.targets = Array(101).fill(url);
  expect(() => run(a)).toThrow();
  expect(() => run(artifact(), { ...context, maxAgeSeconds: -1 })).toThrow();
  expect(() =>
    run(artifact(), { ...context, maxAgeSeconds: Infinity }),
  ).toThrow();
});
it("does not leak raw artifact strings into the result", () => {
  const result = run();
  expect(JSON.stringify(result)).not.toContain("artifactText");
  expect(JSON.stringify(result)).not.toContain("instructions");
});

it.each([
  ['"complete":true', '"complete":false,"complete":true'],
  ['"targets":', '"targets":["https://other.example/"],"targets":'],
  ['"complete":true', '"comple\\u0074e":false,"complete":true'],
])(
  "rejects duplicate JSON members before losing evidence",
  (needle, replacement) => {
    const artifactText = JSON.stringify(artifact()).replace(
      needle,
      replacement,
    );
    expect(() =>
      evaluateCanonicalCapture(context, {
        sourceId: "capture",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      }),
    ).toThrow();
  },
);
it("does not disclose input via malformed JSON or URL exceptions", () => {
  const sentinel = "private-sentinel-value";
  for (const artifactText of [
    sentinel,
    JSON.stringify({
      ...artifact(),
      scope: { ...scope, targetUrl: "https://[" + sentinel },
    }),
  ]) {
    let error: unknown;
    try {
      evaluateCanonicalCapture(context, {
        sourceId: "capture",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain(sentinel);
    expect(
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    ).not.toContain(sentinel);
  }
});

it.each([
  '{"schemaVersion":1,"scope":{"a":1,"a":2}}',
  '{"nested":[{"a":1,"\\u0061":2}]}',
  '{"value":"unterminated}',
  '{"value":01}',
  '{"value":true,}',
  "[".repeat(34) + "]".repeat(34),
])(
  "rejects malformed, nested ambiguous and excessive-depth captures",
  (artifactText) => {
    expect(() =>
      evaluateCanonicalCapture(context, {
        sourceId: "capture",
        artifactText,
        artifactHash: createHash("sha256").update(artifactText).digest("hex"),
      }),
    ).toThrow("Invalid or ambiguous capture JSON");
  },
);
