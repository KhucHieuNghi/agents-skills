import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  createDataRequest,
  mergeDataRequests,
  reconcileDataRequests,
  validateDataRequest,
} from "../skills/content-search-audit/scripts/lib/data-requests.mjs";
import {
  enterpriseDigest,
  enterpriseReviewCheckBinding,
  validateEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { forkEnterpriseEvidenceRun } from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
const now = "2026-11-19T12:00:00Z";
function fixture(flag) {
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: now,
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  const check = run.checks[0],
    content = { review: "synthetic-initial" };
  const evidence = {
    evidenceId: "review-1",
    customerId: run.customerId,
    runId: run.runId,
    entityId: "site",
    artifactType: "attributed-review",
    scopeKey: "site",
    windowId: check.windowId,
    source: "synthetic-review",
    observedAt: now,
    validUntil: "2026-11-19T13:00:00Z",
    content,
    digest: enterpriseDigest(content),
  };
  run.evidence.push(evidence);
  Object.assign(check, {
    status: "not-applicable",
    reason: "Synthetic attributed disposition",
    evidenceIds: [evidence.evidenceId],
    dependencies: [evidence.evidenceId],
    review: {
      reviewer: "reviewer",
      rationale: "Synthetic scope decision",
      reviewedAt: now,
    },
  });
  const request = createDataRequest({
    customerId: run.customerId,
    runId: run.runId,
    requestedArtifact: evidence.artifactType,
    scopeKey: "site",
    windowId: check.windowId,
    moduleIds: [check.moduleId],
    affectedCheckIds: [check.checkId],
    reason: "Obtain an attributed review for the current context",
    acceptedFormats: ["Scoped review JSON"],
    leastPrivilegeAccess: "Read-only",
    exportInstructions: "Review the exact current target",
    suggestedOwnerRole: "Independent reviewer",
    fallback: "Keep the target unknown",
    priority: "medium",
    ...(flag === undefined ? {} : { revalidateOnCheckInvalidation: flag }),
  });
  Object.assign(request, {
    status: "provided",
    evidenceIds: [evidence.evidenceId],
    evidenceDigests: { [evidence.evidenceId]: evidence.digest },
  });
  run.dataRequests.push(request);
  return { run, check, request, evidence };
}
it.each([undefined, false, true])(
  "opts into context revalidation only for flag %s",
  (flag) => {
    const f = fixture(flag),
      original = enterpriseDigest(f.run);
    const result = reconcileEnterpriseChecks(
      f.run,
      structuredClone(f.run),
      now,
      { invalidateCheckIds: [f.check.checkId] },
    );
    const request = result.run.dataRequests.find((r) => r.id === f.request.id);
    expect(request.status).toBe(flag === true ? "invalid" : "provided");
    expect(request.evidenceIds).toEqual(flag === true ? [] : ["review-1"]);
    if (flag === true)
      expect(request.invalidatedEvidenceDigests).toEqual([f.evidence.digest]);
    expect(enterpriseDigest(f.run)).toBe(original);
  },
);
it("revalidates an already unknown target and rejects renamed stale review receipts", () => {
  const f = fixture(true);
  Object.assign(f.check, { status: "unknown", review: null, assessedAt: null });
  const next = reconcileEnterpriseChecks(f.run, structuredClone(f.run), now, {
    invalidateCheckIds: [f.check.checkId],
  }).run;
  const request = next.dataRequests.find((r) => r.id === f.request.id);
  expect(request.status).toBe("invalid");
  const renamed = { ...f.evidence, evidenceId: "renamed" };
  const result = reconcileDataRequests([request], [renamed], {
    assessmentAt: now,
    verifiedEvidence: [
      {
        evidenceId: renamed.evidenceId,
        bindingDigest: enterpriseDigest(renamed),
      },
    ],
  });
  expect(result.requests[0].status).toBe("invalid");
  const content = { review: "synthetic-current-context" };
  const fresh = {
    ...renamed,
    evidenceId: "new-review",
    content,
    digest: enterpriseDigest(content),
  };
  const provided = reconcileDataRequests([request], [fresh], {
    assessmentAt: now,
    verifiedEvidence: [
      { evidenceId: fresh.evidenceId, bindingDigest: enterpriseDigest(fresh) },
    ],
  });
  expect(provided.requests[0].status).toBe("provided");
  expect(provided.requests[0].invalidatedEvidenceDigests).toEqual([
    f.evidence.digest,
  ]);
});
it("gives expiration precedence and preserves refusal and unrelated provided requests", () => {
  const f = fixture(true);
  const expired = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-19T13:00:00Z",
    { invalidateCheckIds: [f.check.checkId] },
  ).run;
  expect(expired.dataRequests.find((r) => r.id === f.request.id).status).toBe(
    "expired",
  );
  const unrelated = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    now,
    { invalidateCheckIds: [f.run.checks[1].checkId] },
  ).run;
  expect(unrelated.dataRequests.find((r) => r.id === f.request.id).status).toBe(
    "provided",
  );
  f.request.status = "declined";
  f.request.evidenceIds = [];
  f.request.evidenceDigests = {};
  const declined = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    now,
    { invalidateCheckIds: [f.check.checkId] },
  ).run;
  expect(declined.dataRequests.find((r) => r.id === f.request.id)).toEqual({
    ...f.request,
    invalidatedEvidenceDigests: [f.evidence.digest],
  });
});
it("validates revalidation policy and does not let merge order disable it", () => {
  const f = fixture(true);
  for (const value of [null, "true", 1, {}])
    expect(() =>
      validateDataRequest({
        ...f.request,
        revalidateOnCheckInvalidation: value,
      }),
    ).toThrow();
  const ordinary = { ...f.request };
  delete ordinary.revalidateOnCheckInvalidation;
  for (const pair of [
    [f.request, ordinary],
    [ordinary, f.request],
  ])
    expect(() => mergeDataRequests(pair)).toThrow();
  expect(() =>
    validateDataRequest({
      ...f.request,
      invalidatedEvidenceDigests: [f.evidence.digest],
    }),
  ).toThrow();
});
it.each(["policy", "dependency", "profile"])(
  "invalidates review receipts when %s context changes",
  (mode) => {
    const f = fixture(true);
    f.check.policyIds = ["review-policy"];
    f.run.policyVersions["review-policy"] = "1";
    const next = structuredClone(f.run);
    if (mode === "policy") next.policyVersions["review-policy"] = "2";
    if (mode === "profile") next.profileVersions.commerce = "2";
    if (mode === "dependency") {
      next.evidence.push({
        ...f.evidence,
        evidenceId: "new-context",
        digest: enterpriseDigest({ new: true }),
        content: { new: true },
      });
      next.checks[0].dependencies = ["new-context"];
      next.checks[0].evidenceIds = ["new-context"];
    }
    const result = reconcileEnterpriseChecks(f.run, next, now);
    expect(result.run.checks[0].status).toBe("unknown");
    expect(
      result.run.dataRequests.find((r) => r.id === f.request.id),
    ).toMatchObject({
      status: "invalid",
      invalidatedEvidenceDigests: [f.evidence.digest],
    });
  },
);
it("preserves review policy and rejected receipt history through forks and report projections", async () => {
  const f = fixture(true);
  const invalid = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    now,
    { invalidateCheckIds: [f.check.checkId] },
  ).run;
  const forked = forkEnterpriseEvidenceRun(
    invalid,
    {
      sourceDigest: enterpriseDigest(invalid),
      newRunId: "forked",
      assessmentAt: now,
      responses: [{}],
    },
    "responses",
  );
  const request = forked.dataRequests.find(
    (r) => r.requestedArtifact === f.request.requestedArtifact,
  );
  expect(request).toMatchObject({
    status: "invalid",
    revalidateOnCheckInvalidation: true,
    invalidatedEvidenceDigests: [f.evidence.digest],
  });
  const report = buildEnterpriseReport(forked, {
    sourceRunDigest: enterpriseDigest(forked),
    revisionId: "review-policy",
    authorId: "author",
    generatedAt: now,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  expect(report.dataRequests.find((r) => r.id === request.id)).toMatchObject({
    revalidateOnCheckInvalidation: true,
    invalidatedEvidenceDigests: [f.evidence.digest],
  });
  const root = await mkdtemp(join(tmpdir(), "review-request-report-"));
  await saveEnterpriseReport(join(root, "report"), report);
  expect(await loadEnterpriseReport(join(root, "report"))).toEqual(report);
});

it.each(["remove", "disable", "forget"])(
  "rejects %s of durable review obligations",
  (mode) => {
    const f = fixture(true);
    const prior = reconcileEnterpriseChecks(
      f.run,
      structuredClone(f.run),
      now,
      { invalidateCheckIds: [f.check.checkId] },
    ).run;
    const next = structuredClone(prior);
    const request = next.dataRequests.find((r) => r.id === f.request.id);
    if (mode === "remove")
      next.dataRequests = next.dataRequests.filter((r) => r.id !== request.id);
    if (mode === "disable") {
      delete request.revalidateOnCheckInvalidation;
      delete request.invalidatedEvidenceDigests;
    }
    if (mode === "forget") request.invalidatedEvidenceDigests = [];
    expect(() => reconcileEnterpriseChecks(prior, next, now)).toThrow(
      /review request/i,
    );
  },
);

it("enforces review continuity for direct parent-bound report revisions", () => {
  const f = fixture(true);
  const prior = reconcileEnterpriseChecks(f.run, structuredClone(f.run), now, {
    invalidateCheckIds: [f.check.checkId],
  }).run;
  const bundle = {
    sourceRunDigest: enterpriseDigest(prior),
    revisionId: "parent",
    authorId: "author",
    generatedAt: now,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  };
  const parent = buildEnterpriseReport(prior, bundle);
  const next = forkEnterpriseEvidenceRun(
    prior,
    {
      sourceDigest: enterpriseDigest(prior),
      newRunId: "child",
      assessmentAt: "2026-11-19T12:01:00Z",
      responses: [{}],
    },
    "responses",
  );
  const childBundle = {
    ...bundle,
    sourceRunDigest: enterpriseDigest(next),
    revisionId: "child",
    generatedAt: "2026-11-19T12:01:00Z",
    parentReportDigest: enterpriseDigest(parent),
  };
  expect(() => buildEnterpriseReport(next, childBundle, parent)).not.toThrow();
  for (const mode of ["remove", "disable", "forget", "rebind"]) {
    const changed = structuredClone(next);
    const request = changed.dataRequests.find(
      (r) => r.requestedArtifact === f.request.requestedArtifact,
    );
    if (mode === "remove")
      changed.dataRequests = changed.dataRequests.filter(
        (r) => r.id !== request.id,
      );
    if (mode === "disable") {
      delete request.revalidateOnCheckInvalidation;
      delete request.invalidatedEvidenceDigests;
    }
    if (mode === "forget") request.invalidatedEvidenceDigests = [];
    if (mode === "rebind") request.affectedCheckIds = [next.checks[1].checkId];
    expect(() =>
      buildEnterpriseReport(
        changed,
        { ...childBundle, sourceRunDigest: enterpriseDigest(changed) },
        parent,
      ),
    ).toThrow(/review request/i);
  }
});

it("rejects reassignment of the durable review target", () => {
  const f = fixture(true),
    next = structuredClone(f.run);
  next.dataRequests.find((r) => r.id === f.request.id).affectedCheckIds = [
    f.run.checks[1].checkId,
  ];
  expect(() => reconcileEnterpriseChecks(f.run, next, now)).toThrow(
    /review request targets/,
  );
});
it.each(["requested", "invalid", "declined", "expired"])(
  "denies old review content even when incoming status is %s",
  (status) => {
    const f = fixture(true),
      next = structuredClone(f.run);
    const request = next.dataRequests.find((r) => r.id === f.request.id);
    Object.assign(request, { status, evidenceIds: [], evidenceDigests: {} });
    const result = reconcileEnterpriseChecks(f.run, next, now, {
      invalidateCheckIds: [f.check.checkId],
    }).run;
    expect(result.dataRequests.find((r) => r.id === request.id)).toMatchObject({
      status,
      invalidatedEvidenceDigests: [f.evidence.digest],
    });
  },
);

it("rejects a directly built report that restores an invalidated parent review receipt", () => {
  const f = fixture(true);
  const bundle = {
    sourceRunDigest: enterpriseDigest(f.run),
    revisionId: "parent",
    authorId: "author",
    generatedAt: now,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  };
  const parent = buildEnterpriseReport(f.run, bundle);
  const fork = forkEnterpriseEvidenceRun(
    f.run,
    {
      sourceDigest: enterpriseDigest(f.run),
      newRunId: "child",
      assessmentAt: "2026-11-19T12:01:00Z",
      responses: [{}],
    },
    "responses",
  );
  fork.profileVersions.commerce = "changed";
  const next = reconcileEnterpriseChecks(f.run, fork, fork.assessmentAt).run;
  const childBundle = {
    ...bundle,
    revisionId: "child",
    generatedAt: fork.assessmentAt,
    parentReportDigest: enterpriseDigest(parent),
    sourceRunDigest: enterpriseDigest(next),
  };
  expect(() => buildEnterpriseReport(next, childBundle, parent)).not.toThrow();
  const request = next.dataRequests.find(
    (r) => r.requestedArtifact === f.request.requestedArtifact,
  );
  Object.assign(request, {
    status: "provided",
    evidenceIds: [f.evidence.evidenceId],
    evidenceDigests: { [f.evidence.evidenceId]: f.evidence.digest },
  });
  delete request.invalidatedEvidenceDigests;
  expect(() =>
    buildEnterpriseReport(
      next,
      { ...childBundle, sourceRunDigest: enterpriseDigest(next) },
      parent,
    ),
  ).toThrow(/review request/i);
});

it("invalidates reviewed N/A and its request when the replacement is forcibly invalidated", () => {
  const f = fixture(true),
    replacement = f.run.checks[1];
  f.check.review.checkBindings = {
    [replacement.checkId]: enterpriseReviewCheckBinding(
      f.run,
      replacement.checkId,
    ),
  };
  f.check.review.validUntil = "2026-11-19T12:30:00Z";
  validateEnterpriseRun(f.run);
  const next = reconcileEnterpriseChecks(f.run, structuredClone(f.run), now, {
    invalidateCheckIds: [replacement.checkId],
  }).run;
  expect(next.checks[0].status).toBe("unknown");
  expect(next.dataRequests.find((r) => r.id === f.request.id).status).toBe(
    "invalid",
  );
  expect(
    next.history.some(
      (h) =>
        h.check.checkId === f.check.checkId &&
        h.check.status === "not-applicable",
    ),
  ).toBe(true);
});
it("rejects stale, expired, self-bound and nested N/A reviews and preserves bindings in reports", () => {
  const f = fixture(true),
    replacement = f.run.checks[1];
  f.check.review.checkBindings = {
    [replacement.checkId]: enterpriseReviewCheckBinding(
      f.run,
      replacement.checkId,
    ),
  };
  f.check.review.validUntil = "2026-11-19T12:30:00Z";
  const bundle = {
    sourceRunDigest: enterpriseDigest(f.run),
    revisionId: "bound-review",
    authorId: "author",
    generatedAt: now,
    brand: { name: "Synthetic", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  };
  const report = buildEnterpriseReport(f.run, bundle);
  expect(report.assessment.checks[0].review.checkBindings).toEqual(
    f.check.review.checkBindings,
  );
  for (const mode of ["expired", "profile", "self", "nested", "reason"]) {
    const next = structuredClone(f.run);
    if (mode === "expired") next.assessmentAt = "2026-11-19T12:30:00Z";
    if (mode === "profile") next.profileVersions.commerce = "changed";
    if (mode === "reason")
      next.checks[1].reason = "Changed semantic explanation";
    if (mode === "self")
      next.checks[0].review.checkBindings = {
        [f.check.checkId]: "a".repeat(64),
      };
    if (mode === "nested") {
      next.checks[1].status = "not-applicable";
      next.checks[1].review = {
        reviewer: "r",
        rationale: "Synthetic",
        reviewedAt: now,
      };
    }
    expect(() => validateEnterpriseRun(next)).toThrow();
    expect(() =>
      buildEnterpriseReport(next, {
        ...bundle,
        sourceRunDigest: enterpriseDigest(next),
      }),
    ).toThrow();
  }
  for (const binding of [null, false, [], {}]) {
    const malformed = structuredClone(f.run);
    malformed.checks[0].review.checkBindings = binding;
    expect(() => validateEnterpriseRun(malformed)).toThrow();
  }
  const expired = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-19T12:30:00Z",
  ).run;
  expect(expired.checks[0].status).toBe("unknown");
  expect(expired.dataRequests.find((r) => r.id === f.request.id).status).toBe(
    "invalid",
  );
});

it("enforces explicit standalone review expiry without changing legacy reviews", () => {
  const f = fixture(true);
  validateEnterpriseRun(f.run);
  f.check.review.validUntil = "2026-11-19T12:30:00Z";
  validateEnterpriseRun(f.run);
  const next = reconcileEnterpriseChecks(
    f.run,
    structuredClone(f.run),
    "2026-11-19T12:30:00Z",
  ).run;
  expect(next.checks[0].status).toBe("unknown");
  const expired = structuredClone(f.run);
  expired.assessmentAt = "2026-11-19T12:30:00Z";
  expect(() => validateEnterpriseRun(expired)).toThrow();
  for (const value of [null, "bad", true]) {
    const malformed = structuredClone(f.run);
    malformed.checks[0].review.validUntil = value;
    expect(() => validateEnterpriseRun(malformed)).toThrow();
  }
});
