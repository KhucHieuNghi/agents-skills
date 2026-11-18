import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  normalizeAxe,
  evaluateAxe,
} from "../scripts/enterprise-accessibility/axe.mjs";
const context = {
  customerId: "customer",
  entityId: "site",
  environment: "test",
  targetUrl: "https://example.com/",
  stateId: "initial",
  viewport: { width: 390, height: 844 },
  assessmentAt: "2026-11-19T12:00:00Z",
  maxAgeSeconds: 3600,
  expectedRuleIds: ["button-name"],
};
function fixture() {
  const node = {
    html: "<button></button>",
    target: ["#empty"],
    any: [],
    all: [],
    none: [],
  };
  const rule = { id: "button-name", tags: ["wcag412"], nodes: [node] };
  const raw = {
    testEngine: { name: "axe-core", version: "4.14.1" },
    testEnvironment: {
      userAgent: "fixture",
      windowWidth: 390,
      windowHeight: 844,
    },
    testRunner: { name: "axe" },
    url: context.targetUrl,
    timestamp: "2026-11-19T11:30:00Z",
    toolOptions: { reporter: "v1" },
    violations: [rule],
    passes: [],
    incomplete: [],
    inapplicable: [],
  };
  const source = {
    sourceId: "one",
    sourceKind: "axe-results",
    scope: {
      customerId: context.customerId,
      entityId: context.entityId,
      environment: context.environment,
      stateId: context.stateId,
      viewport: context.viewport,
    },
    capturedAt: "2026-11-19T11:31:00Z",
    artifactText: "",
    artifactHash: "",
  };
  const encode = () => {
    source.artifactText = JSON.stringify(raw);
    source.artifactHash = createHash("sha256")
      .update(source.artifactText)
      .digest("hex");
    return source;
  };
  return { raw, source, rule, node, encode };
}
it("keeps same-rule passed nodes separate from violations and excludes raw text", () => {
  const f = fixture();
  f.raw.passes = [{ ...f.rule, nodes: [{ ...f.node, target: ["#good"] }] }];
  const result = evaluateAxe(context, [f.encode()]);
  expect(result.checks[0].status).toBe("fail");
  expect(result.conformanceAssessed).toBe(false);
  expect(result.coverage).toBe("unknown");
  expect(JSON.stringify(result)).not.toContain("<button>");
  expect(JSON.stringify(result)).not.toContain("#empty");
  expect(result.records[0].categories.violations[0].reportedNodeCount).toBe(1);
});
it("limits a clean result to reported elements and requests missing full scope", () => {
  const f = fixture();
  f.raw.passes = f.raw.violations;
  f.raw.violations = [];
  const r = evaluateAxe(context, [f.encode()]);
  expect(r.checks[0].status).toBe("pass");
  expect(r.checks[0].coverage).toBe("reported-tested-elements");
  expect(r.dataRequests.some((x) => x.reason === "scan-context-unproven")).toBe(
    true,
  );
});
it.each(["absent", "inapplicable", "incomplete", "empty"])(
  "keeps %s unknown",
  (kind) => {
    const f = fixture();
    f.raw.violations = [];
    if (kind === "inapplicable")
      f.raw.inapplicable = [{ ...f.rule, nodes: [] }];
    if (kind === "incomplete") {
      f.raw.incomplete = [f.rule];
      f.raw.passes = [f.rule];
    }
    const r = evaluateAxe(context, kind === "absent" ? [] : [f.encode()]);
    expect(r.checks[0].status).toBe("unknown");
  },
);
it("does not refresh or count semantic byte aliases as new measurements", () => {
  const f = fixture();
  const a = { ...f.encode() };
  const b = {
    ...a,
    sourceId: "two",
    artifactText: JSON.stringify(f.raw, null, 2),
  };
  b.artifactHash = createHash("sha256").update(b.artifactText).digest("hex");
  const r = evaluateAxe(context, [a, b]);
  expect(r.uniqueMeasurementCount).toBe(1);
  expect(
    evaluateAxe({ ...context, assessmentAt: "2026-11-19T12:30:00Z" }, [a])
      .checks[0].status,
  ).toBe("unknown");
});
it("retains conflicts regardless of source order", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "two";
  g.raw.passes = g.raw.violations;
  g.raw.violations = [];
  const a = f.encode(),
    b = g.encode();
  expect(evaluateAxe(context, [a, b])).toEqual(evaluateAxe(context, [b, a]));
  expect(evaluateAxe(context, [a, b]).checks[0].status).toBe("unknown");
});
it("does not pool distinct browser/configuration populations", () => {
  const f = fixture(),
    g = fixture();
  g.source.sourceId = "two";
  g.raw.toolOptions = { reporter: "v2" };
  expect(evaluateAxe(context, [f.encode(), g.encode()]).checks[0].status).toBe(
    "unknown",
  );
});
it("unsupported engines remain observations without assessed outcomes", () => {
  const f = fixture();
  f.raw.testEngine.version = "4.15.0";
  const r = evaluateAxe(context, [f.encode()]);
  expect(r.checks[0].status).toBe("unknown");
  expect(r.records[0].supported).toBe(false);
});
it.each([
  "hash",
  "tenant",
  "url",
  "state",
  "viewport",
  "future",
  "missing-category",
  "bad-selector",
  "extra-key",
])("rejects %s", (kind) => {
  const f = fixture();
  if (kind === "tenant") f.source.scope.customerId = "other";
  if (kind === "url") f.raw.url = "https://other.com/";
  if (kind === "state") f.source.scope.stateId = "other";
  if (kind === "viewport") f.raw.testEnvironment.windowWidth = 1280;
  if (kind === "future") f.raw.timestamp = "2026-11-19T13:00:00Z";
  if (kind === "missing-category") delete f.raw.passes;
  if (kind === "bad-selector") f.node.target = [{}];
  const source = f.encode();
  if (kind === "hash") source.artifactHash = "0".repeat(64);
  if (kind === "extra-key") source.host = { trusted: true };
  expect(() => normalizeAxe(source, context)).toThrow();
});

it.each(["passes", "violations"])("rejects empty asserted %s", (category) => {
  const f = fixture();
  f.raw.violations = [];
  f.raw[category] = [{ ...f.rule, nodes: [] }];
  expect(() => normalizeAxe(f.encode(), context)).toThrow(/Empty asserted/);
});
it("retains a native empty error incomplete as unknown", () => {
  const f = fixture();
  f.raw.violations = [];
  f.raw.incomplete = [
    {
      ...f.rule,
      nodes: [],
      error: { name: "Error", message: "SENSITIVE_ERROR_4827" },
    },
  ];
  const r = evaluateAxe(context, [f.encode()]);
  expect(r.checks[0].status).toBe("unknown");
  expect(JSON.stringify(r)).not.toContain("SENSITIVE_ERROR_4827");
});
it("bounds dates, depth, source size and duplicate identities", () => {
  const f = fixture();
  const s = f.encode();
  expect(() => evaluateAxe(context, [s, s])).toThrow(/Duplicate/);
  expect(() =>
    normalizeAxe(
      { ...s, artifactText: " ".repeat(8 * 1024 * 1024 + 1) },
      context,
    ),
  ).toThrow(/byte/);
  expect(() =>
    normalizeAxe(s, { ...context, assessmentAt: "2026-02-30T12:00:00Z" }),
  ).toThrow(/calendar/);
  expect(() =>
    normalizeAxe(s, {
      ...context,
      expectedRuleIds: ["button-name", "button-name"],
    }),
  ).toThrow(/expected/);
  let nested = {};
  for (let i = 0; i < 42; i++) nested = { nested };
  f.raw.extra = nested;
  expect(() => normalizeAxe(f.encode(), context)).toThrow(/complexity/);
});

it.each(["error-pass", "disabled-pass", "null-check"])(
  "rejects contradictory or malformed %s",
  (kind) => {
    const f = fixture();
    f.raw.passes = f.raw.violations;
    f.raw.violations = [];
    if (kind === "error-pass") f.raw.passes[0].error = { message: "failure" };
    if (kind === "disabled-pass")
      f.raw.toolOptions.rules = { "button-name": { enabled: false } };
    if (kind === "null-check") f.node.any = [null];
    expect(() => normalizeAxe(f.encode(), context)).toThrow();
  },
);
it("retains native omitted HTML/selector details without inventing node identity", () => {
  const f = fixture();
  f.node.html = null;
  delete f.node.target;
  const r = evaluateAxe(context, [f.encode()]);
  expect(r.checks[0].status).toBe("fail");
  expect(r.records[0].categories.violations[0].nodes[0]).toEqual({
    targetDigest: null,
    htmlDigest: null,
  });
  expect(r.dataRequests.some((x) => x.reason === "node-details-missing")).toBe(
    true,
  );
});
