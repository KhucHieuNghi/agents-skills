import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  advanceResearchAccessState as advance,
  bindResearchAccessRevision as bindRaw,
  checkResearchAccessRevision as check,
} from "../scripts/enterprise-journeys/research-access-state.mjs";
const bind = (s, c, a, t) => bindRaw(s, c, a, t, ["p1"]);
const artifact = "a".repeat(64);
async function context() {
  return JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/research-content.json",
      "utf8",
    ),
  ).context;
}
it("binds reviewed artifact to a private generation without granting delivery", async () => {
  const c = await context(),
    s = advance(null, null, c),
    b = bind(s, c, artifact, c.assessmentAt);
  expect(check(s, c, b, artifact)).toEqual({
    revisionMatches: true,
    reasons: [],
    deliveryAuthorized: false,
    storageAuthorized: false,
  });
});
it("preserves generation for unchanged access and advances observation time", async () => {
  const c = await context(),
    s = advance(null, null, c);
  c.assessmentAt = "2026-11-19T02:01:00Z";
  const n = advance(s, enterpriseDigest(s), c);
  expect(n.generation).toBe(1);
  expect(n.changedAt).toBe(s.changedAt);
  expect(n.observedAt).toBe(c.assessmentAt);
});
it("old artifact never revives after revoke then regrant", async () => {
  const c = await context(),
    s = advance(null, null, c),
    b = bind(s, c, artifact, c.assessmentAt);
  c.assessmentAt = "2026-11-19T02:01:00Z";
  c.access[0].customerSummaryAllowed = false;
  const revoked = advance(s, enterpriseDigest(s), c);
  expect(check(revoked, c, b, artifact).revisionMatches).toBe(false);
  c.assessmentAt = "2026-11-19T02:02:00Z";
  c.access[0].customerSummaryAllowed = true;
  const regrant = advance(revoked, enterpriseDigest(revoked), c);
  expect(regrant.generation).toBe(3);
  expect(check(regrant, c, b, artifact).revisionMatches).toBe(false);
  expect(() => bind(regrant, c, artifact, b.reviewedAt)).toThrow(/predates/);
  expect(
    check(regrant, c, bind(regrant, c, artifact, c.assessmentAt), artifact)
      .revisionMatches,
  ).toBe(true);
});
it("detects racing writers using the prior state digest", async () => {
  const c = await context(),
    s = advance(null, null, c),
    digest = enterpriseDigest(s);
  c.assessmentAt = "2026-11-19T02:01:00Z";
  const n = advance(s, digest, c);
  expect(() => advance(n, digest, c)).toThrow(/compare-and-swap/);
});
it("rejects scope rebinding and backwards assessment", async () => {
  const c = await context(),
    s = advance(null, null, c);
  c.assessmentAt = "2026-11-19T01:59:00Z";
  expect(() => advance(s, enterpriseDigest(s), c)).toThrow(/backwards/);
  c.assessmentAt = "2026-11-19T02:01:00Z";
  c.recipientId = "foreign";
  expect(() => advance(s, enterpriseDigest(s), c)).toThrow(/rebound/);
});
it("expiry invalidates revision even with unchanged bytes", async () => {
  const c = await context(),
    s = advance(null, null, c),
    b = bind(s, c, artifact, c.assessmentAt);
  c.assessmentAt = "2026-11-20T00:00:00Z";
  expect(check(s, c, b, artifact).revisionMatches).toBe(false);
  const n = advance(s, enterpriseDigest(s), c);
  expect(n.generation).toBe(1);
  expect(() => bind(n, c, artifact, c.assessmentAt)).toThrow(/expired/);
});
it("refresh or freshness policy change requires a new generation", async () => {
  const c = await context(),
    s = advance(null, null, c);
  c.assessmentAt = "2026-11-19T02:01:00Z";
  c.maxAccessAgeSeconds = 3600;
  expect(advance(s, enterpriseDigest(s), c).generation).toBe(2);
});
it("requires exact artifact, scope and current snapshot", async () => {
  const c = await context(),
    s = advance(null, null, c),
    b = bind(s, c, artifact, c.assessmentAt);
  expect(check(s, c, b, "b".repeat(64)).revisionMatches).toBe(false);
  c.access[0].analysisAllowed = false;
  expect(check(s, c, b, artifact).revisionMatches).toBe(false);
  expect(() => bind(s, c, artifact, c.assessmentAt)).toThrow(/snapshot/);
});
it("rejects binding for denied contributor access", async () => {
  const c = await context();
  c.access[0].analysisAllowed = false;
  const s = advance(null, null, c);
  expect(() => bind(s, c, artifact, c.assessmentAt)).toThrow(/ineligible/);
});

it("rejects private unexpected fields and invalid creation ancestry", async () => {
  const c = await context();
  expect(() => advance(null, artifact, c)).toThrow(/creation/);
  const s = advance(null, null, c);
  s.rawText = "PRIVATE";
  expect(() => advance(s, enterpriseDigest(s), c)).toThrow(/state/);
});
it("does not allow a same-time permission change to reuse a prior review timestamp", async () => {
  const c = await context(),
    s = advance(null, null, c);
  c.access[0].customerSummaryAllowed = false;
  expect(() => advance(s, enterpriseDigest(s), c)).toThrow(/strictly/);
});

it("retains withdrawn participants without blocking remaining permitted contributors", async () => {
  const c = await context();
  c.protocol.participants.push({ participantId: "p2", aliases: [] });
  c.protocolDigest = enterpriseDigest(c.protocol);
  c.access[0].scope.protocolDigest = c.protocolDigest;
  c.access.push({
    ...structuredClone(c.access[0]),
    participantId: "p2",
    analysisAllowed: false,
    customerSummaryAllowed: false,
    validUntil: c.assessmentAt,
  });
  const s = advance(null, null, c),
    b = bind(s, c, artifact, c.assessmentAt);
  expect(check(s, c, b, artifact).revisionMatches).toBe(true);
  expect(() => bindRaw(s, c, artifact, c.assessmentAt, ["p1", "p2"])).toThrow(
    /ineligible/,
  );
  expect(c.protocol.participants).toHaveLength(2);
});
