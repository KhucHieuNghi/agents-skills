import { expect, it } from "vitest";
// @ts-expect-error development module
import { bindAcceptancePolicy } from "../scripts/enterprise-remediation/acceptance-policy.mjs";
const binding = {
  customerId: "customer",
  checkId: "check",
  contextDigest: "a".repeat(64),
  assetBindingDigest: "b".repeat(64),
  assessmentAt: "2026-11-19T12:00:00Z",
  authorId: "author",
  earliestReviewAt: "2026-11-19T10:00:00Z",
  baselineWindowId: null,
};
function policy() {
  return {
    policyRef: "acceptance-1",
    customerId: "customer",
    checkId: "check",
    contextDigest: "a".repeat(64),
    assetBindingDigest: "b".repeat(64),
    authorId: "policy-author",
    reviewerId: "reviewer",
    reviewerType: "independent-ai",
    reviewReason: "Reviewed acceptance predicate and window",
    reviewedAt: "2026-11-19T11:00:00Z",
    expectedStatus: "pass",
    minimumCompleteness: 1,
    window: {
      kind: "point",
      baselineWindowId: null,
      retestWindowId: null,
      start: "2026-11-19T13:00:00Z",
      end: "2026-11-19T14:00:00Z",
      timezone: "UTC",
      filtersDigest: "c".repeat(64),
      ingestionLagSeconds: 0,
    },
  };
}
it("freezes an exact check/target/window policy without authorizing execution", () => {
  const p = policy();
  const r = bindAcceptancePolicy(p, binding);
  p.window.start = "changed";
  expect(r.policy.window.start).toBe("2026-11-19T13:00:00Z");
  expect(r.policyDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(r.executionAllowed).toBe(false);
});
it.each(["customerId", "checkId", "contextDigest", "assetBindingDigest"])(
  "rejects changed binding %s",
  (key) => {
    const p = policy();
    Object.assign(p, { [key]: "different" });
    expect(() => bindAcceptancePolicy(p, binding)).toThrow();
  },
);
it("requires independent review and unexpired future observation window", () => {
  const p = policy();
  p.reviewerId = "author";
  expect(() => bindAcceptancePolicy(p, binding)).toThrow();
  const q = policy();
  q.window.end = "2026-11-19T12:00:00Z";
  expect(() => bindAcceptancePolicy(q, binding)).toThrow();
});
it("does not accept weakened completeness/status or unknown fields", () => {
  const p = policy();
  p.minimumCompleteness = 0.5;
  expect(() => bindAcceptancePolicy(p, binding)).toThrow();
  const q = policy();
  q.expectedStatus = "unknown";
  expect(() => bindAcceptancePolicy(q, binding)).toThrow();
  const r = policy();
  Object.assign(r, { command: "ignored?" });
  expect(() => bindAcceptancePolicy(r, binding)).toThrow();
});
it("requires a distinct explicit period window and valid timezone", () => {
  const p = policy();
  Object.assign(p.window, {
    kind: "period",
    baselineWindowId: "baseline",
    retestWindowId: "after",
    timezone: "Asia/Ho_Chi_Minh",
    ingestionLagSeconds: 3600,
  });
  const b = { ...binding, baselineWindowId: "baseline" };
  expect(bindAcceptancePolicy(p, b).policy.window.kind).toBe("period");
  Object.assign(p.window, { retestWindowId: "baseline" });
  expect(() => bindAcceptancePolicy(p, b)).toThrow();
  Object.assign(p.window, { retestWindowId: "after", timezone: "not-a-zone" });
  expect(() => bindAcceptancePolicy(p, b)).toThrow();
});
it("rejects point policy for a period-based check", () =>
  expect(() =>
    bindAcceptancePolicy(policy(), {
      ...binding,
      baselineWindowId: "baseline",
    }),
  ).toThrow());

it("rejects self-reviewed policy even when report author differs", () => {
  const p = policy();
  p.authorId = p.reviewerId;
  expect(() => bindAcceptancePolicy(p, binding)).toThrow();
});
it("supports existing opaque report author identifiers", () => {
  const p = policy();
  expect(
    bindAcceptancePolicy(p, { ...binding, authorId: "team/" + "a".repeat(200) })
      .executionAllowed,
  ).toBe(false);
});
