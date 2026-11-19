import { buildPrivateHistoryDraft } from "../scripts/enterprise-history-draft.mjs";
import { createDataRequest } from "../skills/content-search-audit/scripts/lib/data-requests.mjs";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { inspectReportTransition } from "../scripts/enterprise-report-lineage.mjs";
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

function reports() {
  const { run, bundle } = fixture();
  bundle.narrative = [
    {
      narrativeId: "N-1",
      kind: "limitation",
      text: "PRIVATE_HISTORY_CANARY",
      evidenceIds: ["trace"],
    },
  ];
  const draft = buildEnterpriseReport(run, bundle);
  bundle.decisions = [
    {
      targetType: "action",
      targetId: "A-1",
      targetDigest: enterpriseReviewTargetDigest(draft, "action", "A-1"),
      reviewerId: "independent",
      reviewerType: "independent-ai",
      reviewedAt: bundle.generatedAt,
      verdict: "accept",
      reason: "PRIVATE_REVIEW_CANARY",
    },
  ];
  const parent = buildEnterpriseReport(run, bundle);
  const nextBundle = {
    ...bundle,
    revisionId: "report-2",
    generatedAt: "2026-11-18T14:00:00Z",
    parentReportDigest: enterpriseDigest(parent),
  };
  return { run, parent, nextBundle };
}
it("detects silent editorial loss without copying historical text or review reasons", () => {
  const { run, parent, nextBundle } = reports();
  const child = buildEnterpriseReport(
    run,
    { ...nextBundle, findings: [], actions: [], narrative: [], decisions: [] },
    parent,
  );
  const result = inspectReportTransition(parent, child);
  expect(
    result.items.filter((x) => x.state === "removed").map((x) => x.type),
  ).toEqual(["finding", "action", "narrative"]);
  expect(result.decisions[0]).toMatchObject({
    state: "stale",
    reasons: ["target-removed"],
  });
  expect(JSON.stringify(result)).not.toContain("PRIVATE_HISTORY_CANARY");
  expect(JSON.stringify(result)).not.toContain("PRIVATE_REVIEW_CANARY");
  expect(result).toMatchObject({
    audience: "private",
    persistenceAuthorized: false,
    historyPreserved: false,
  });
});
it("distinguishes carried and missing-valid decisions", () => {
  const { run, parent, nextBundle } = reports();
  const carried = buildEnterpriseReport(run, nextBundle, parent);
  expect(inspectReportTransition(parent, carried).decisions[0].state).toBe(
    "carried",
  );
  const omitted = buildEnterpriseReport(
    run,
    { ...nextBundle, decisions: [] },
    parent,
  );
  expect(inspectReportTransition(parent, omitted).decisions[0].state).toBe(
    "missing-valid",
  );
});
it("detects same-ID finding edits and transitive invalidation of action acceptance", () => {
  const { run, parent, nextBundle } = reports();
  const child = buildEnterpriseReport(
    run,
    {
      ...nextBundle,
      findings: [
        { ...nextBundle.findings[0], description: "Changed conclusion" },
      ],
      decisions: [],
    },
    parent,
  );
  const result = inspectReportTransition(parent, child);
  expect(result.items.find((x) => x.type === "finding").state).toBe("changed");
  expect(result.items.find((x) => x.type === "action").state).toBe("retained");
  expect(result.decisions[0]).toMatchObject({
    state: "stale",
    reasons: ["target-context-changed"],
  });
});
it("requires new review when the next author is the previous reviewer", () => {
  const { run, parent, nextBundle } = reports();
  const child = buildEnterpriseReport(
    run,
    { ...nextBundle, authorId: "independent", decisions: [] },
    parent,
  );
  expect(inspectReportTransition(parent, child).decisions[0]).toMatchObject({
    state: "stale",
    reasons: ["reviewer-is-author"],
  });
});
it("rejects foreign or stale parent binding without treating a digest as authority", () => {
  const { run, parent, nextBundle } = reports();
  const standalone = buildEnterpriseReport(run, {
    ...nextBundle,
    parentReportDigest: null,
  });
  expect(() => inspectReportTransition(parent, standalone)).toThrow(
    /parent binding/,
  );
});

it("invalidates old review on a newer assessment even when the target text is unchanged", () => {
  const { run, parent, nextBundle } = reports();
  const nextRun = structuredClone(run);
  nextRun.runId = "next-run";
  for (const entity of nextRun.entities) entity.runId = nextRun.runId;
  nextRun.dataRequests = nextRun.dataRequests.map((r) =>
    createDataRequest({ ...r, runId: nextRun.runId }),
  );
  nextRun.parentRunIds = [run.runId];
  nextRun.assessmentAt = "2026-11-18T13:30:00Z";
  const child = buildEnterpriseReport(
    nextRun,
    {
      ...nextBundle,
      sourceRunDigest: enterpriseDigest(nextRun),
      decisions: [],
    },
    parent,
  );
  expect(inspectReportTransition(parent, child).decisions[0].reasons).toContain(
    "review-predates-assessment",
  );
});
it("distinguishes exact observation demotion from current retention", () => {
  const { run, bundle } = fixture();
  bundle.observations = [
    {
      observationId: "O-1",
      classification: "current",
      label: "Synthetic count",
      value: 3,
      unit: "records",
      precision: "exact",
      period: { from: "2026-11-18", to: "2026-11-18" },
      scopeDescription: "Supplied sample",
      evidenceIds: ["trace"],
    },
  ];
  const parent = buildEnterpriseReport(run, bundle);
  const child = buildEnterpriseReport(
    run,
    {
      ...bundle,
      revisionId: "report-2",
      generatedAt: "2026-11-18T14:00:00Z",
      parentReportDigest: enterpriseDigest(parent),
      observations: [
        { ...bundle.observations[0], classification: "historical" },
      ],
    },
    parent,
  );
  expect(
    inspectReportTransition(parent, child).items.find(
      (x) => x.type === "observation",
    ).state,
  ).toBe("historical");
});

it("accounts for new decisions and distinguishes fresh replacement from stale prior acceptance", () => {
  const { run, parent, nextBundle } = reports();
  const changed = {
    ...nextBundle,
    findings: [
      { ...nextBundle.findings[0], description: "Changed conclusion" },
    ],
    decisions: [],
  };
  const draft = buildEnterpriseReport(run, changed, parent);
  const fresh = (type) => ({
    targetType: type,
    targetId: type === "action" ? "A-1" : "F-1",
    targetDigest: enterpriseReviewTargetDigest(
      draft,
      type,
      type === "action" ? "A-1" : "F-1",
    ),
    reviewerId: "new-reviewer",
    reviewerType: "independent-ai",
    reviewedAt: nextBundle.generatedAt,
    verdict: "accept",
    reason: "PRIVATE_NEW_REVIEW",
  });
  const child = buildEnterpriseReport(
    run,
    { ...changed, decisions: [fresh("action"), fresh("finding")] },
    parent,
  );
  const result = inspectReportTransition(parent, child);
  expect(result.decisions[0]).toMatchObject({
    state: "replaced",
    priorEligibility: "stale",
    reasons: ["target-context-changed"],
  });
  expect(
    buildPrivateHistoryDraft([parent, child]).entries.find(
      (e) => e.type === "decision",
    ),
  ).toMatchObject({
    state: "replaced",
    priorEligibility: "stale",
    reasons: ["target-context-changed"],
  });
  expect(result.decisionAdditions).toHaveLength(1);
  expect(result.decisionAdditions[0]).toMatchObject({
    targetType: "finding",
    targetId: "F-1",
  });
  expect(JSON.stringify(result)).not.toContain("PRIVATE_NEW_REVIEW");
});

it.each(["source", "revision", "time", "lineage"])(
  "rejects a valid standalone child with incompatible %s binding",
  (condition) => {
    const { run, parent, nextBundle } = reports();
    const child = buildEnterpriseReport(run, nextBundle, parent);
    if (condition === "source") child.sourceRunDigest = "b".repeat(64);
    if (condition === "revision") child.revisionId = parent.revisionId;
    if (condition === "time") child.generatedAt = parent.generatedAt;
    if (condition === "lineage") {
      child.assessment.runId = "unrelated";
      for (const entity of child.assessment.entities)
        entity.runId = "unrelated";
      child.assessment.parentRunIds = [];
    }
    expect(() => inspectReportTransition(parent, child)).toThrow();
  },
);

it("keeps original finding, action, narrative and decision content bound to their source in a private draft", () => {
  const { run, parent, nextBundle } = reports();
  const next = buildEnterpriseReport(
    run,
    { ...nextBundle, findings: [], actions: [], narrative: [], decisions: [] },
    parent,
  );
  const draft = buildPrivateHistoryDraft([parent, next]);
  expect(draft.currentReportDigest).toBe(enterpriseDigest(next));
  for (const type of ["finding", "action", "narrative", "decision"]) {
    const item = draft.entries.find((entry) => entry.type === type);
    expect(item.sourceReportDigest).toBe(enterpriseDigest(parent));
    expect(item.content).toEqual(
      type === "decision"
        ? parent.decisions[0]
        : parent[type === "narrative" ? "narrative" : type + "s"][0],
    );
  }
  expect(draft).toMatchObject({
    persistenceAuthorized: false,
    disclosureAuthorized: false,
    historyPreserved: false,
  });
  expect(next.summary.findings).toBe(0);
});
it("rejects an incomplete or substituted report history", () => {
  const { run, parent, nextBundle } = reports();
  const next = buildEnterpriseReport(run, nextBundle, parent);
  expect(() => buildPrivateHistoryDraft([next, next])).toThrow();
  const changed = structuredClone(parent);
  changed.revisionId = "sibling";
  expect(() => buildPrivateHistoryDraft([changed, next])).toThrow();
});

it("accounts for each source across three revisions and retains review eligibility", () => {
  const { run, parent, nextBundle } = reports();
  const next = buildEnterpriseReport(run, nextBundle, parent);
  const third = buildEnterpriseReport(
    run,
    {
      ...nextBundle,
      revisionId: "report-3",
      generatedAt: "2026-11-18T15:00:00Z",
      parentReportDigest: enterpriseDigest(next),
    },
    next,
  );
  const draft = buildPrivateHistoryDraft([parent, next, third]);
  expect(new Set(draft.entries.map((e) => e.sourceReportDigest))).toEqual(
    new Set([enterpriseDigest(parent), enterpriseDigest(next)]),
  );
  const decision = draft.entries.find((e) => e.type === "decision");
  expect(decision.priorEligibility).toBe("eligible");
  expect(decision.reasons).toEqual([]);
  expect(() => buildPrivateHistoryDraft([parent, third])).toThrow();
});

it("rejects oversized history before cloning", () => {
  expect(() =>
    buildPrivateHistoryDraft([{ payload: "x".repeat(65 * 1024 * 1024) }, {}]),
  ).toThrow(/byte budget/);
});
