import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
function fixture() {
  const run = resolveAuditContext(
    {
      customerId: "tenant-private-841",
      runId: "run",
      assessmentAt: "2026-11-18T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  const evidence = {
    evidenceId: "trace",
    customerId: run.customerId,
    runId: run.runId,
    entityId: "site",
    digest: "a".repeat(64),
    source: "supplied-test-trace",
    observedAt: "2026-11-18T11:00:00Z",
    validUntil: "2026-11-19T12:00:00Z",
    content: undefined,
  };
  delete evidence.content;
  run.evidence.push(evidence);
  run.checks[0] = {
    ...run.checks[0],
    status: "fail",
    evidenceIds: ["trace"],
    dependencies: ["trace"],
    assessedAt: run.assessmentAt,
    reason: "Synthetic redirect defect",
  };
  const finding = {
    findingId: "F-1",
    checkId: run.checks[0].checkId,
    evidenceIds: ["trace"],
    severity: "high",
    confidence: "high",
    title: "Redirect broken",
    description: "Observed failure",
    businessImpact: "Visitors cannot reach product",
    recommendation: "Repair the redirect",
    verification: "Retest the declared route",
  };
  const bundle = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report-1",
    generatedAt: "2026-11-18T13:00:00Z",
    authorId: "author",
    brand: { name: "Customer <script>alert(1)</script>", accent: "#14532d" },
    findings: [finding],
    actions: [
      {
        actionId: "A-1",
        findingIds: ["F-1"],
        status: "proposed",
        ownerRole: "Web team",
        effort: "Small estimate",
        description: "Repair redirect",
        verification: "Re-run route",
        dependencies: [],
      },
    ],
    observations: [],
    narrative: [],
    decisions: [],
  };
  return { run, bundle };
}

function input() {
  const { run, bundle } = fixture();
  const report = buildEnterpriseReport(run, bundle);
  return {
    planId: "plan-1",
    assessmentAt: "2026-11-18T14:00:00Z",
    report,
    sourceRun: run,
    trustedAssetBindings: [
      {
        bindingRef: "binding-1",
        customerId: run.customerId,
        entityId: "site",
        entityDigest: enterpriseDigest(run.entities[0]),
        assetId: "site-prod",
        environment: "production",
      },
    ],
    proposals: [
      {
        changeId: "change-1",
        findingId: "F-1",
        bindingRef: "binding-1",
        ownerRole: "Web team",
        artifactDigest: "b".repeat(64),
        preconditionDigest: "c".repeat(64),
        rollbackDigest: "d".repeat(64),
        dependencies: [],
      },
    ],
  };
}
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
