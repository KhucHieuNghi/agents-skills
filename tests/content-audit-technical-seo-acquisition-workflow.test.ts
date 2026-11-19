import { createHash } from "node:crypto";
import { mkdtemp, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  loadEnterpriseRun,
  saveEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { recordEnterpriseTechnicalSeoAcquisition } from "../skills/content-search-audit/scripts/lib/technical-seo/acquisition-workflow.mjs";
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "seo-acquisition-workflow-"));
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: "2026-11-19T12:00:00Z",
      profileIds: ["commerce"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  const scope = {
    customerId: "customer",
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/",
    profileId: "mobile",
    stateId: "anonymous",
  };
  const target = {
    targetId: "page",
    kind: "canonical",
    scope,
    method: null,
    window: { from: "2026-11-19T11:00:00Z", to: "2026-11-19T12:00:00Z" },
    maxAgeSeconds: 3600,
  };
  const attempt = {
    attemptId: "attempt-one",
    collectorVersion: "fixture-v1",
    result: {
      status: "unknown",
      synthetic: false,
      scope,
      startedAt: "2026-11-19T11:29:00Z",
      finishedAt: "2026-11-19T11:31:00Z",
      gaps: ["collection-deadline"],
      executionAuthenticated: false,
      semanticAcceptance: false,
    },
  };
  return { root, run, record: { target, attempt } };
}
function successful(record) {
  const next = structuredClone(record);
  next.attempt.attemptId = "attempt-two";
  next.attempt.result.status = "captured";
  next.attempt.result.gaps = [];
  const raw = {
    schemaVersion: 1,
    scope: next.target.scope,
    capturedAt: "2026-11-19T11:30:00Z",
    layers: {
      sourceHead: {
        complete: true,
        targets: ["https://example.com/PRIVATE_CAPTURE"],
      },
      renderedHead: { complete: true, targets: [next.target.scope.targetUrl] },
      httpLink: { complete: true, targets: [] },
    },
  };
  const artifactText = JSON.stringify(raw);
  next.attempt.result.source = {
    sourceId: "capture",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
  return next;
}
async function record(f, source, next, attempts, at = f.run.assessmentAt) {
  const previous = await loadEnterpriseRun(join(f.root, source));
  await recordEnterpriseTechnicalSeoAcquisition(
    join(f.root, source),
    {
      sourceDigest: enterpriseDigest(previous),
      newRunId: next,
      assessmentAt: at,
      attempts,
    },
    join(f.root, next),
  );
  return loadEnterpriseRun(join(f.root, next));
}
function report(run, revisionId, parent = null) {
  return buildEnterpriseReport(
    run,
    {
      sourceRunDigest: enterpriseDigest(run),
      revisionId,
      generatedAt: run.assessmentAt,
      authorId: "author",
      brand: { name: "Synthetic customer", accent: "#174f7b" },
      findings: [],
      actions: [],
      observations: [],
      narrative: [],
      decisions: [],
      ...(parent ? { parentReportDigest: enterpriseDigest(parent) } : {}),
    },
    parent,
  );
}
it("preserves valid untyped context evidence through acquisition and replay", async () => {
  const f = await fixture();
  const brief = {
    customerId: f.run.customerId,
    entityId: "site",
    evidenceId: "owner-brief",
    runId: f.run.runId,
    source: "supplied-owner-brief",
    observedAt: f.run.assessmentAt,
    validUntil: null,
    digest: enterpriseDigest("Synthetic business context"),
  };
  f.run.evidence.push(brief);
  await saveEnterpriseRun(join(f.root, "with-brief"), f.run);
  const failed = await record(f, "with-brief", "failed", [f.record]);
  expect(
    failed.evidence.find((e) => e.evidenceId === brief.evidenceId),
  ).toEqual(brief);
  const captured = await record(f, "failed", "captured", [
    successful(f.record),
  ]);
  expect(
    captured.checks.find((c) => c.ruleId === "seo-acquisition-page")?.status,
  ).toBe("pass");
  const expired = await record(
    f,
    "captured",
    "expired",
    [],
    "2026-11-19T12:30:00Z",
  );
  expect(
    expired.checks.find((c) => c.ruleId === "seo-acquisition-page")?.status,
  ).toBe("unknown");
  expect(
    expired.evidence.find((e) => e.evidenceId === brief.evidenceId),
  ).toEqual(brief);
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "with-brief"))),
  ).toBe(enterpriseDigest(f.run));
});

it("records failure then matching capture and expiry without losing source history or implying SEO passed", async () => {
  const f = await fixture();
  const failed = await record(f, "initial", "failed", [f.record]);
  const check = failed.checks.find((c) =>
    c.ruleId.startsWith("seo-acquisition-"),
  );
  expect(check.status).toBe("unknown");
  const request = failed.dataRequests.find(
    (r) => r.requestedArtifact === check.ruleId,
  );
  expect(request.status).toBe("requested");
  expect(request.acceptedFormats).toEqual(["canonical-capture-v1"]);
  const firstReport = report(failed, "failed-report");
  const ready = await record(
    f,
    "failed",
    "ready",
    [successful(f.record)],
    "2026-11-19T12:01:00Z",
  );
  expect(ready.technicalSeoAcquisitions[0].sourceEvidenceIds).toHaveLength(2);
  expect(ready.checks.find((c) => c.checkId === check.checkId).status).toBe(
    "pass",
  );
  expect(
    ready.checks.filter((c) => !c.ruleId.startsWith("seo-acquisition-")),
  ).toEqual(f.run.checks);
  expect(
    ready.dataRequests.find((r) => r.requestedArtifact === check.ruleId).status,
  ).toBe("provided");
  expect(
    ready.history.some(
      (h) => h.check.checkId === check.checkId && h.check.status === "unknown",
    ),
  ).toBe(true);
  const readyReport = report(ready, "ready-report", firstReport);
  await saveEnterpriseReport(join(f.root, "report"), readyReport);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(
    readyReport,
  );
  for (const name of ["report.json", "report.md", "report.html"])
    expect(await readFile(join(f.root, "report", name), "utf8")).not.toContain(
      "PRIVATE_CAPTURE",
    );
  const expired = await record(
    f,
    "ready",
    "expired",
    [],
    "2026-11-19T12:30:00Z",
  );
  expect(expired.checks.find((c) => c.checkId === check.checkId).status).toBe(
    "unknown",
  );
  expect(
    expired.dataRequests.find((r) => r.requestedArtifact === check.ruleId)
      .status,
  ).toBe("expired");
  expect(expired.technicalSeoAcquisitions[0].sourceEvidenceIds).toEqual(
    ready.technicalSeoAcquisitions[0].sourceEvidenceIds,
  );
  report(expired, "expired-report", readyReport);
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(enterpriseDigest(f.run));
});
it("retains usable prior capture when a later matching attempt fails", async () => {
  const f = await fixture();
  const ready = await record(f, "initial", "ready", [successful(f.record)]);
  const later = structuredClone(f.record);
  later.attempt.attemptId = "later-failure";
  later.attempt.result.startedAt = "2026-11-19T11:40:00Z";
  later.attempt.result.finishedAt = "2026-11-19T11:41:00Z";
  const after = await record(f, "ready", "after", [later]);
  expect(
    after.checks.find((c) => c.ruleId.startsWith("seo-acquisition-")).status,
  ).toBe("pass");
  expect(after.technicalSeoAcquisitions[0].sourceEvidenceIds).toHaveLength(2);
  expect(ready.technicalSeoAcquisitions[0].sourceEvidenceIds).toHaveLength(1);
});
it("rejects rollback to an older internally valid availability projection", async () => {
  const f = await fixture();
  const ready = await record(f, "initial", "ready", [successful(f.record)]);
  const next = await record(f, "ready", "next", [], "2026-11-19T12:01:00Z");
  next.technicalSeoAcquisitions[0].projectionEvidenceId =
    ready.technicalSeoAcquisitions[0].projectionEvidenceId;
  const priorCheck = ready.checks.find((c) =>
    c.ruleId.startsWith("seo-acquisition-"),
  );
  next.checks = next.checks.map((c) =>
    c.checkId === priorCheck.checkId ? structuredClone(priorCheck) : c,
  );
  const priorRequest = ready.dataRequests.find(
    (r) => r.requestedArtifact === priorCheck.ruleId,
  );
  const request = next.dataRequests.find(
    (r) => r.requestedArtifact === priorCheck.ruleId,
  );
  request.evidenceIds = priorRequest.evidenceIds;
  request.evidenceDigests = priorRequest.evidenceDigests;
  await saveEnterpriseRun(join(f.root, "rollback"), next);
  await expect(
    record(f, "rollback", "rejected", [], next.assessmentAt),
  ).rejects.toThrow(/superseded/);
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("bounds historical replay work before evaluating oversized reference populations", async () => {
  const f = await fixture();
  const run = await record(f, "initial", "failed", [f.record]);
  const original = run.evidence.find(
    (e) =>
      e.evidenceId === run.technicalSeoAcquisitions[0].projectionEvidenceId,
  );
  const oversized = structuredClone(original);
  oversized.content.sourceEvidenceIds = Array(20001).fill(
    run.technicalSeoAcquisitions[0].sourceEvidenceIds[0],
  );
  oversized.digest = enterpriseDigest(oversized.content);
  oversized.evidenceId = `seo-acquisition-assessment-${oversized.digest}`;
  run.evidence.push(oversized);
  await saveEnterpriseRun(join(f.root, "oversized"), run);
  await expect(record(f, "oversized", "rejected", [])).rejects.toThrow(
    /replay work budget/,
  );
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("bounds aggregate replay bytes before repeated source parsing", async () => {
  const f = await fixture();
  const input = successful(f.record);
  input.attempt.result.source.artifactText += " ".repeat(512 * 1024);
  input.attempt.result.source.artifactHash = createHash("sha256")
    .update(input.attempt.result.source.artifactText)
    .digest("hex");
  const run = await record(f, "initial", "ready", [input]);
  const oversized = structuredClone(
    run.evidence.find(
      (e) =>
        e.evidenceId === run.technicalSeoAcquisitions[0].projectionEvidenceId,
    ),
  );
  oversized.content.sourceEvidenceIds = Array(129).fill(
    run.technicalSeoAcquisitions[0].sourceEvidenceIds[0],
  );
  oversized.digest = enterpriseDigest(oversized.content);
  oversized.evidenceId = `seo-acquisition-assessment-${oversized.digest}`;
  run.evidence.push(oversized);
  await saveEnterpriseRun(join(f.root, "oversized"), run);
  await expect(record(f, "oversized", "rejected", [])).rejects.toThrow(
    /replay byte budget/,
  );
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
it("keeps synthetic attempts unknown and separates target request receipts", async () => {
  const f = await fixture();
  const first = successful(f.record);
  first.attempt.result.synthetic = true;
  const sibling = structuredClone(f.record);
  sibling.target.targetId = "desktop";
  sibling.target.scope.profileId = "desktop";
  sibling.attempt.result.scope.profileId = "desktop";
  const run = await record(f, "initial", "separate", [
    first,
    successful(sibling),
  ]);
  expect(
    run.checks.find((c) => c.ruleId === "seo-acquisition-page").status,
  ).toBe("unknown");
  expect(
    run.checks.find((c) => c.ruleId === "seo-acquisition-desktop").status,
  ).toBe("pass");
  expect(
    run.dataRequests.find((r) => r.requestedArtifact === "seo-acquisition-page")
      .status,
  ).toBe("requested");
  expect(
    run.dataRequests.find(
      (r) => r.requestedArtifact === "seo-acquisition-desktop",
    ).status,
  ).toBe("provided");
});
it("retains an owner's declined request when independently supplied capture is assessed", async () => {
  const f = await fixture();
  const run = await record(f, "initial", "failed", [f.record]);
  const request = run.dataRequests.find(
    (r) => r.requestedArtifact === "seo-acquisition-page",
  );
  request.status = "declined";
  request.reason = "Owner declined the request";
  await saveEnterpriseRun(join(f.root, "declined"), run);
  const next = await record(f, "declined", "supplied", [successful(f.record)]);
  const retained = next.dataRequests.find(
    (r) => r.requestedArtifact === request.requestedArtifact,
  );
  expect(retained.status).toBe("declined");
  expect(retained.reason).toBe(request.reason);
  expect(
    next.checks.find((c) => c.ruleId === request.requestedArtifact).status,
  ).toBe("pass");
});
it.each([
  "duplicate-attempt",
  "rebound-window",
  "missing-source-index",
  "forged-status",
  "changed-request",
])("rejects %s without output", async (condition) => {
  const f = await fixture();
  const failed = await record(f, "initial", "failed", [f.record]);
  let attempts = [];
  if (condition === "duplicate-attempt") attempts = [f.record];
  if (condition === "rebound-window") {
    const next = successful(f.record);
    next.target.window.from = "2026-11-19T10:00:00Z";
    attempts = [next];
  }
  if (condition === "missing-source-index")
    failed.technicalSeoAcquisitions[0].sourceEvidenceIds = [];
  if (condition === "forged-status") {
    const check = failed.checks.find((c) =>
      c.ruleId.startsWith("seo-acquisition-"),
    );
    check.status = "pass";
    check.assessedAt = failed.assessmentAt;
    failed.evidence.find(
      (e) => e.evidenceId === check.evidenceIds[0],
    ).validUntil = "2026-11-19T13:00:00Z";
  }
  if (condition === "changed-request")
    failed.dataRequests.find((r) =>
      r.requestedArtifact.startsWith("seo-acquisition-"),
    ).acceptedFormats = ["unrelated"];
  await saveEnterpriseRun(join(f.root, "modified"), failed);
  await expect(record(f, "modified", "rejected", attempts)).rejects.toThrow();
  await expect(access(join(f.root, "rejected"))).rejects.toThrow();
});
