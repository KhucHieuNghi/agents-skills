import { resolveAuditContext } from "../../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { buildEnterpriseReport } from "../../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
export function fixture() {
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

export function input() {
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
