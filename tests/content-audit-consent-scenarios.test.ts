import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { evaluateConsentScenarios } from "../skills/content-search-audit/scripts/lib/consent-scenarios.mjs";
const hash = (x: string) => createHash("sha256").update(x).digest("hex");
function fixture(mode = "advanced") {
  const scope = { customerId: "c", entityId: "site", environment: "staging" };
  const context = {
    ...scope,
    assessmentAt: "2026-11-18T11:00:00Z",
    maxAgeSeconds: 7200,
  };
  const state = { analytics_storage: "denied" };
  const scenario = {
    scenarioId: "fresh-au",
    kind: "fresh",
    region: "AU",
    surface: "client",
    mode,
    window: { from: "2026-11-18T10:00:00Z", to: "2026-11-18T10:10:00Z" },
    transitions: [{ transition: "default", state }],
  };
  const policy = {
    policyId: "policy-v1",
    owner: "owner",
    scope,
    categories: ["analytics_storage"],
    deniedRules: {
      analytics_storage: {
        requests: mode === "advanced" ? "cookieless" : "blocked",
        storageRead: false,
        storageWrite: false,
        cookies: false,
        identifiers: false,
      },
    },
    scenarios: [scenario],
  };
  const artifact = {
    scope,
    scenarioId: scenario.scenarioId,
    region: scenario.region,
    surface: scenario.surface,
    mode,
    clockId: "browser",
    window: scenario.window,
    complete: true,
    records: [
      {
        id: "default",
        sequence: 0,
        at: "2026-11-18T10:00:00Z",
        kind: "state",
        transition: "default",
        state,
      },
      {
        id: "ping",
        sequence: 1,
        at: "2026-11-18T10:01:00Z",
        kind: "request",
        category: "analytics_storage",
        cookieless: true,
        cookiesAttached: false,
        identifiersPresent: false,
      },
    ],
  };
  const input = () => ({
    sourceId: "trace",
    locator: "private browser trace",
    sourceKind: "browser-trace",
    capturedAt: "2026-11-18T10:10:00Z",
    synthetic: true,
    artifactText: JSON.stringify(artifact),
    artifactHash: hash(JSON.stringify(artifact)),
  });
  return { context, policy, artifact, input };
}
it("allows explicitly permitted advanced cookieless pings without claiming legal compliance", () => {
  const f = fixture(),
    r = evaluateConsentScenarios(f.policy, [f.input()], f.context);
  expect(r.checks[0].status).toBe("pass");
  expect(r.legalCompliance).toBe("not-assessed");
  expect(r.assessmentAccepted).toBe(false);
  expect(r.status).toBe("unknown");
  expect(r.dataRequests.some((x) => x.reason === "missing-scenario-kind")).toBe(
    true,
  );
});
it("rejects requests under denied basic mode and identified advanced pings", () => {
  const f = fixture("basic");
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0]
      .violations,
  ).toContain("denied-request");
  const a = fixture();
  a.artifact.records[1].identifiersPresent = true;
  expect(
    evaluateConsentScenarios(a.policy, [a.input()], a.context).checks[0]
      .violations,
  ).toContain("identified-denied-request");
});
it("does not conclude from network presence when request inspection is missing", () => {
  const f = fixture();
  f.artifact.records[1].cookieless = null;
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0],
  ).toMatchObject({ status: "unknown" });
});
it("detects defaults after activity and storage access while denied", () => {
  const f = fixture();
  f.artifact.records.reverse();
  f.artifact.records.forEach((r, i) => {
    r.sequence = i;
    r.at = `2026-11-18T10:0${i}:00Z`;
  });
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0]
      .violations,
  ).toContain("activity-before-default");
  const a = fixture();
  a.artifact.records[1] = {
    id: "cookie",
    sequence: 1,
    at: "2026-11-18T10:01:00Z",
    kind: "storage",
    category: "analytics_storage",
    operation: "write",
  };
  expect(
    evaluateConsentScenarios(a.policy, [a.input()], a.context).checks[0]
      .violations,
  ).toContain("denied-storage");
});
it("replays accept then revoke and checks traffic against current state", () => {
  const f = fixture();
  f.policy.scenarios[0].kind = "revoke";
  const granted = { analytics_storage: "granted" },
    denied = { analytics_storage: "denied" };
  f.policy.scenarios[0].transitions.push(
    { transition: "accept", state: granted },
    { transition: "revoke", state: denied },
  );
  f.artifact.records = [
    f.artifact.records[0],
    {
      id: "accept",
      sequence: 1,
      at: "2026-11-18T10:01:00Z",
      kind: "state",
      transition: "accept",
      state: granted,
    },
    {
      id: "revoke",
      sequence: 2,
      at: "2026-11-18T10:02:00Z",
      kind: "state",
      transition: "revoke",
      state: denied,
    },
    {
      ...f.artifact.records[1],
      sequence: 3,
      at: "2026-11-18T10:03:00Z",
      cookiesAttached: true,
    },
  ];
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0]
      .violations,
  ).toContain("identified-denied-request");
});
it("retains incomplete, stale, manual and missing scenarios as unknown", () => {
  const f = fixture();
  f.artifact.complete = false;
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0].status,
  ).toBe("unknown");
  f.artifact.complete = true;
  const manual = { ...f.input(), sourceKind: "manual" };
  expect(
    evaluateConsentScenarios(f.policy, [manual], f.context).checks[0].status,
  ).toBe("unknown");
  f.context.assessmentAt = "2026-11-19T11:00:00Z";
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0].status,
  ).toBe("unknown");
  expect(
    evaluateConsentScenarios(f.policy, [], f.context).checks[0].status,
  ).toBe("unknown");
});
it("rejects tampering, foreign scope, unknown categories and policy injection", () => {
  const f = fixture();
  expect(() =>
    evaluateConsentScenarios(
      f.policy,
      [{ ...f.input(), artifactHash: "0".repeat(64) }],
      f.context,
    ),
  ).toThrow(/hash/);
  f.artifact.scope = { ...f.artifact.scope, customerId: "other" };
  expect(() =>
    evaluateConsentScenarios(f.policy, [f.input()], f.context),
  ).toThrow(/scope/);
  const a = fixture();
  a.artifact.records[1].category = "undeclared";
  expect(() =>
    evaluateConsentScenarios(a.policy, [a.input()], a.context),
  ).toThrow(/category/);
  expect(() =>
    evaluateConsentScenarios(
      { ...a.policy, authorization: true },
      [],
      a.context,
    ),
  ).toThrow(/policy/);
});
it("rejects duplicate sequence, reversed timestamps, future capture and extra raw payload", () => {
  const f = fixture();
  f.artifact.records[1].sequence = 0;
  expect(() =>
    evaluateConsentScenarios(f.policy, [f.input()], f.context),
  ).toThrow(/order/);
  const a = fixture();
  a.artifact.records[0].at = "2026-11-18T10:02:00Z";
  expect(() =>
    evaluateConsentScenarios(a.policy, [a.input()], a.context),
  ).toThrow(/order/);
  const b = fixture();
  expect(() =>
    evaluateConsentScenarios(
      b.policy,
      [{ ...b.input(), capturedAt: "2026-11-19T11:00:00Z" }],
      b.context,
    ),
  ).toThrow(/capture/);
  b.artifact.records[1].rawCookie = "private";
  expect(() =>
    evaluateConsentScenarios(b.policy, [b.input()], b.context),
  ).toThrow(/record/);
});
it("binds metadata and does not select a convenient overlapping trace", () => {
  const f = fixture(),
    r = evaluateConsentScenarios(f.policy, [f.input()], f.context);
  expect(r.sourceBindings[0].envelopeDigest).toMatch(/^[a-f0-9]{64}$/);
  const overlap = evaluateConsentScenarios(
    f.policy,
    [f.input(), { ...f.input(), sourceId: "second" }],
    f.context,
  );
  expect(overlap.checks[0].status).toBe("unknown");
  expect(overlap.checks[0].gaps).toContain("overlapping-sources");
});

it("does not treat scenario labels as coverage of unexercised transitions", () => {
  const f = fixture();
  f.policy.scenarios[0].kind = "reject";
  expect(() =>
    evaluateConsentScenarios(f.policy, [f.input()], f.context),
  ).toThrow(/scenario transition/);
  const a = fixture();
  a.policy.scenarios[0].kind = "revoke";
  a.policy.scenarios[0].transitions.push({
    transition: "revoke",
    state: { analytics_storage: "denied" },
  });
  expect(() => evaluateConsentScenarios(a.policy, [], a.context)).toThrow(
    /revoke/,
  );
});

it("blocks basic-mode traffic before a choice even with configured granted defaults", () => {
  const f = fixture("basic");
  f.policy.scenarios[0].transitions[0].state.analytics_storage = "granted";
  f.artifact.records[0].state.analytics_storage = "granted";
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0]
      .violations,
  ).toContain("basic-before-choice");
});

it("does not treat a blocked tag before defaults as fired activity", () => {
  const f = fixture("basic");
  f.artifact.records = [
    {
      id: "blocked",
      sequence: 0,
      at: "2026-11-18T10:00:00Z",
      kind: "tag",
      category: "analytics_storage",
      operation: "blocked",
    },
    { ...f.artifact.records[0], sequence: 1 },
  ];
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0].status,
  ).toBe("pass");
});
it("requires meaningful accept and reject states", () => {
  for (const kind of ["accept", "reject"]) {
    const f = fixture();
    f.policy.scenarios[0].kind = kind;
    f.policy.scenarios[0].transitions.push({
      transition: kind,
      state: { analytics_storage: kind === "accept" ? "denied" : "granted" },
    });
    expect(() => evaluateConsentScenarios(f.policy, [], f.context)).toThrow(
      /scenario state/,
    );
  }
});

it("uses explicit category policy instead of applying storage rules to personalization", () => {
  const f = fixture();
  f.policy.deniedRules.analytics_storage = {
    requests: "allowed",
    storageRead: true,
    storageWrite: true,
    cookies: true,
    identifiers: true,
  };
  f.artifact.records[1] = {
    id: "write",
    sequence: 1,
    at: "2026-11-18T10:01:00Z",
    kind: "storage",
    category: "analytics_storage",
    operation: "write",
  };
  expect(
    evaluateConsentScenarios(f.policy, [f.input()], f.context).checks[0].status,
  ).toBe("pass");
});

it("permits owner-authorized storage and identifiers under denied personalization", () => {
  const f = fixture();
  f.policy.deniedRules.analytics_storage = {
    requests: "allowed",
    storageRead: true,
    storageWrite: true,
    cookies: true,
    identifiers: true,
  };
  f.artifact.records[1].cookieless = false;
  f.artifact.records[1].cookiesAttached = true;
  f.artifact.records[1].identifiersPresent = true;
  const policy = JSON.parse(
    JSON.stringify(f.policy).replaceAll(
      "analytics_storage",
      "ad_personalization",
    ),
  );
  const input = f.input();
  input.artifactText = input.artifactText.replaceAll(
    "analytics_storage",
    "ad_personalization",
  );
  input.artifactHash = hash(input.artifactText);
  expect(
    evaluateConsentScenarios(policy, [input], f.context).checks[0].status,
  ).toBe("pass");
});
it("evaluates a complete declared matrix with selective, persisted and SPA states", () => {
  const f = fixture();
  f.policy.categories.push("ad_storage");
  f.policy.deniedRules.ad_storage = {
    ...f.policy.deniedRules.analytics_storage,
  };
  const denied = { analytics_storage: "denied", ad_storage: "denied" },
    granted = { analytics_storage: "granted", ad_storage: "granted" };
  const kinds = [
    "fresh",
    "reject",
    "accept",
    "selective",
    "revoke",
    "persisted",
    "region-variant",
    "spa",
  ];
  f.policy.scenarios = kinds.map((kind) => {
    const transitions = [{ transition: "default", state: denied }];
    if (kind === "reject")
      transitions.push({ transition: "reject", state: denied });
    if (kind === "accept" || kind === "revoke")
      transitions.push({ transition: "accept", state: granted });
    if (kind === "revoke")
      transitions.push({ transition: "revoke", state: denied });
    if (kind === "selective")
      transitions.push({
        transition: "selective",
        state: { analytics_storage: "granted", ad_storage: "denied" },
      });
    if (kind === "persisted")
      transitions.push({ transition: "persisted", state: granted });
    if (kind === "spa")
      transitions.push({ transition: "navigation", state: denied });
    return {
      ...f.policy.scenarios[0],
      scenarioId: kind,
      kind,
      region: kind === "region-variant" ? "EU" : "AU",
      transitions,
    };
  });
  const inputs = f.policy.scenarios.map((s) => {
    const a = {
      ...f.artifact,
      scenarioId: s.scenarioId,
      region: s.region,
      records: s.transitions.map((t, i) => ({
        id: `state-${i}`,
        sequence: i,
        at: `2026-11-18T10:0${i}:00Z`,
        kind: "state",
        ...t,
      })),
    };
    const artifactText = JSON.stringify(a);
    return {
      ...f.input(),
      sourceId: s.scenarioId,
      artifactText,
      artifactHash: hash(artifactText),
    };
  });
  const r = evaluateConsentScenarios(f.policy, inputs, f.context);
  expect(r.status).toBe("pass");
  expect(r.checks).toHaveLength(8);
  expect(r.dataRequests).toEqual([]);
});
