import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
import { fixture, input } from "./helpers/remediation-fixture.js";
it("creates a deterministic draft without mutating inputs or granting execution", () => {
  const x = input(),
    before = JSON.stringify(x);
  const a = planChanges(x),
    b = planChanges(x);
  expect(a).toEqual(b);
  expect(JSON.stringify(x)).toBe(before);
  expect(a.entries[0].executionAllowed).toBe(false);
  expect(a.entries[0].gaps).toContain("finding-review-required");
  expect(a.sourceRunDigest).toBe(x.report.sourceRunDigest);
  expect(a.entries[0].sourceEvidence[0].digest).toBe("a".repeat(64));
});
it("rejects report/run mismatch and foreign asset mappings", () => {
  const x = input();
  x.sourceRun.entities[0].entityId = "different";
  expect(() => planChanges(x)).toThrow();
  const y = input();
  y.trustedAssetBindings[0].customerId = "other";
  expect(() => planChanges(y)).toThrow();
});
it("preserves missing asset and rollback as actionable gaps", () => {
  const x = input();
  x.trustedAssetBindings = [];
  const p = planChanges(x);
  expect(p.entries[0].gaps).toContain("asset-mapping-required");
  expect(
    p.entries[0].dataRequests.some(
      (r: { ownerRole: string }) => r.ownerRole === "Web team",
    ),
  ).toBe(true);
  const y = input();
  Object.assign(y.proposals[0], { rollbackDigest: null });
  expect(planChanges(y).entries[0].gaps).toContain(
    "rollback-artifact-required",
  );
});
it("rejects duplicate IDs, missing dependencies and cycles", () => {
  const x = input();
  x.proposals.push({ ...x.proposals[0] });
  expect(() => planChanges(x)).toThrow();
  const y = input();
  Object.assign(y.proposals[0], { dependencies: ["absent"] });
  expect(() => planChanges(y)).toThrow();
  const z = input();
  Object.assign(z.proposals[0], { dependencies: ["change-2"] });
  z.proposals.push({
    ...z.proposals[0],
    changeId: "change-2",
    dependencies: ["change-1"] as never[],
  });
  expect(() => planChanges(z)).toThrow();
});
it("binds accepted review to exact current check and finding", () => {
  const x = input();
  const { bundle } = fixture();
  Object.assign(bundle, {
    decisions: [
      ...["finding", "check"].map((type) => {
        const id = type === "finding" ? "F-1" : x.report.findings[0].checkId;
        return {
          targetType: type,
          targetId: id,
          targetDigest: enterpriseReviewTargetDigest(x.report, type, id),
          reviewerId: "independent",
          reviewerType: "independent-ai",
          reviewedAt: "2026-11-18T12:30:00Z",
          verdict: "accept",
          reason: "Verified fixture",
        };
      }),
    ],
  });
  x.report = buildEnterpriseReport(x.sourceRun, bundle);
  const entry = planChanges(x).entries[0];
  expect(entry.gaps).not.toContain("finding-review-required");
  expect(entry.gaps).not.toContain("check-review-required");
  expect(entry.executionAllowed).toBe(false);
  expect(entry.gaps).toContain("acceptance-policy-required");
});
it("does not trust stale evidence just because report originally validated", () => {
  const x = input();
  x.assessmentAt = "2026-11-19T12:00:00Z";
  expect(planChanges(x).entries[0].gaps).toContain(
    "fresh-source-evidence-required",
  );
});
it("rejects future report, unknown proposal fields and malformed hashes", () => {
  const x = input();
  x.assessmentAt = "2026-11-18T12:00:00Z";
  expect(() => planChanges(x)).toThrow();
  const y = input();
  Object.assign(y.proposals[0], { command: "do-not-run" });
  expect(() => planChanges(y)).toThrow();
  const z = input();
  z.proposals[0].artifactDigest = "bad";
  expect(() => planChanges(z)).toThrow();
});
it("records distinct source entity and target binding digests", () => {
  const x = input(),
    p = planChanges(x);
  expect(p.entries[0].entityDigest).toBe(
    x.trustedAssetBindings[0].entityDigest,
  );
  expect(p.entries[0].bindingDigest).toBe(
    enterpriseDigest(x.trustedAssetBindings[0]),
  );
  const y = input();
  y.trustedAssetBindings[0].environment = "staging";
  expect(planChanges(y).planDigest).not.toBe(p.planDigest);
});

it("rejects an internally valid report attached to different source evidence", () => {
  const x = input();
  x.sourceRun.evidence[0].digest = "e".repeat(64);
  x.report.sourceRunDigest = enterpriseDigest(x.sourceRun);
  expect(() => planChanges(x)).toThrow();
});
it("projects only source evidence identifiers and binding metadata", () => {
  const x = input();
  Object.assign(x.sourceRun.evidence[0], {
    content: "PRIVATE_RAW_BODY",
    extraPrivate: "PRIVATE_EXTRA",
  });
  x.sourceRun.evidence[0].digest = enterpriseDigest("PRIVATE_RAW_BODY");
  const { bundle } = fixture();
  bundle.sourceRunDigest = enterpriseDigest(x.sourceRun);
  x.report = buildEnterpriseReport(x.sourceRun, bundle);
  const result = JSON.stringify(planChanges(x));
  expect(result).not.toContain("PRIVATE_RAW_BODY");
  expect(result).not.toContain("PRIVATE_EXTRA");
});

it("rejects reviewed report evidence different from bound source", () => {
  const x = input();
  x.report.assessment.evidence[0].digest = "f".repeat(64);
  expect(() => planChanges(x)).toThrow("evidence mismatch");
});

it("selects only a host-supplied acceptance policy bound to the exact check and asset", () => {
  const x = input();
  const check = x.sourceRun.checks[0];
  const policy = {
    policyRef: "acceptance-1",
    customerId: x.sourceRun.customerId,
    checkId: check.checkId,
    contextDigest: x.report.assessment.checkContextDigests[check.checkId],
    assetBindingDigest: enterpriseDigest(x.trustedAssetBindings[0]),
    authorId: "policy-author",
    reviewerId: "reviewer",
    reviewerType: "independent-ai",
    reviewReason: "Reviewed exact check and asset",
    reviewedAt: "2026-11-18T13:30:00Z",
    expectedStatus: "pass",
    minimumCompleteness: 1,
    window: {
      kind: "point",
      baselineWindowId: null,
      retestWindowId: null,
      start: "2026-11-18T15:00:00Z",
      end: "2026-11-18T16:00:00Z",
      timezone: "UTC",
      filtersDigest: "c".repeat(64),
      ingestionLagSeconds: 0,
    },
  };
  Object.assign(x.proposals[0], { acceptancePolicyRef: "acceptance-1" });
  expect(planChanges(x).entries[0].gaps).toContain(
    "acceptance-policy-required",
  );
  const supplied = { ...x, trustedAcceptancePolicies: [policy] };
  const p = planChanges(supplied);
  expect(p.entries[0].gaps).not.toContain("acceptance-policy-required");
  expect(p.entries[0].acceptance.policyDigest).toBe(enterpriseDigest(policy));
  expect(p.entries[0].executionAllowed).toBe(false);
  policy.reviewedAt = "2020-01-01T00:00:00Z";
  expect(() => planChanges(supplied)).toThrow();
  policy.reviewedAt = "2026-11-18T13:30:00Z";
  policy.assetBindingDigest = "f".repeat(64);
  expect(() => planChanges(supplied)).toThrow("binding mismatch");
});
