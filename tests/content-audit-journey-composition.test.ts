import { buildStoredJourneyReport } from "../scripts/enterprise-journeys/report.mjs";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { reviewedFixture } from "./helpers/experiment-reviewed.js";
import { hash } from "./helpers/experiment-exports.js";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
  loadEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { evaluateEnterpriseExperiments } from "../scripts/enterprise-journeys/experiment-workflow.mjs";
import { evaluateEnterpriseTasks } from "../scripts/enterprise-journeys/task-workflow.mjs";
import { evaluateEnterpriseFunnels } from "../scripts/enterprise-journeys/workflow.mjs";

it.each(["provided", "declined"])(
  "composes task, funnel and experiment evidence while preserving %s lifecycle",
  async (status) => {
    const root = await mkdtemp(join(tmpdir(), "journey-composition-"));
    const s = reviewedFixture();
    const { assessmentAt, ...context } = s.context;
    const receiptText = JSON.stringify(s.receipt);
    const experiment = {
      evaluationId: "shared-id",
      context,
      aggregateSources: s.aggregates,
      supportSources: s.supports,
      reviewPolicy: s.policy,
      receipt: { artifactText: receiptText, artifactHash: hash(receiptText) },
      presentation: {
        experimentLabel: "Synthetic experiment",
        metricLabels: [
          { metricId: "conversion", label: "Purchases" },
          { metricId: "harm", label: "Refunds" },
        ],
      },
    };
    let run = resolveAuditContext(
      {
        customerId: context.scope.customerId,
        runId: "initial",
        assessmentAt,
        profileIds: ["commerce"],
        entities: [{ entityId: "site", type: "site" }],
      },
      [],
    );
    await saveEnterpriseRun(join(root, "initial"), run);
    let source = join(root, "initial");
    const advance = async (evaluate, entry, id, at) => {
      const before = await loadEnterpriseRun(source);
      const original = enterpriseDigest(before);
      const directory = join(root, id);
      const result = await evaluate(
        source,
        {
          sourceDigest: original,
          newRunId: id,
          assessmentAt: at,
          evaluations: [entry],
        },
        directory,
      );
      expect(enterpriseDigest(await loadEnterpriseRun(source))).toBe(original);
      const next = await loadEnterpriseRun(directory);
      for (const evidence of before.evidence)
        expect(next.evidence).toContainEqual(evidence);
      source = directory;
      run = next;
      return result;
    };
    await advance(
      evaluateEnterpriseExperiments,
      experiment,
      "experiment-first",
      assessmentAt,
    );
    const originalEvidence = run.experimentEvaluations[0].evidenceId;
    if (status === "declined") {
      const request = run.dataRequests.find(
        (r) => r.requestedArtifact === "ux-experiment-evaluation",
      );
      request.status = "declined";
      request.reason = "Owner declined additional experiment evidence.";
      source = join(root, "declined");
      await saveEnterpriseRun(source, run);
    }
    const task = JSON.parse(
      await readFile(
        "tests/fixtures/content-audit/enterprise/journeys/task-commerce.json",
        "utf8",
      ),
    );
    const at = task.context.assessmentAt;
    delete task.context.customerId;
    delete task.context.assessmentAt;
    const taskResult = await advance(
      evaluateEnterpriseTasks,
      {
        evaluationId: "shared-id",
        context: task.context,
        sources: task.sources,
      },
      "task",
      at,
    );
    expect(
      run.dataRequests.find(
        (r) => r.requestedArtifact === "ux-experiment-evaluation",
      ).status,
    ).toBe(status === "declined" ? "declined" : "expired");
    const funnel = JSON.parse(
      await readFile(
        "tests/fixtures/content-audit/enterprise/journeys/commerce.json",
        "utf8",
      ),
    );
    delete funnel.context.customerId;
    delete funnel.context.assessmentAt;
    for (const source of funnel.sources) {
      const raw = JSON.parse(source.artifactText);
      raw.scope.customerId = context.scope.customerId;
      source.artifactText = JSON.stringify(raw);
      source.artifactHash = hash(source.artifactText);
    }
    const funnelResult = await advance(
      evaluateEnterpriseFunnels,
      {
        evaluationId: "shared-id",
        context: funnel.context,
        sources: funnel.sources,
      },
      "funnel",
      at,
    );
    const retainedNamespaces = ["task", "funnel"].map((namespace) => ({
      namespace,
      index: structuredClone(run[`${namespace}Evaluations`]),
      checks: structuredClone(
        run.checks.filter((c) => c.ruleId.startsWith(`ux-${namespace}-`)),
      ),
      requests: structuredClone(
        run.dataRequests.filter((r) =>
          r.requestedArtifact.startsWith(`ux-${namespace}-`),
        ),
      ),
      policy: run.policyVersions[`ux-${namespace}-shared-id`],
    }));
    const experimentResult = await advance(
      evaluateEnterpriseExperiments,
      experiment,
      "combined",
      at,
    );
    for (const saved of retainedNamespaces) {
      expect(saved.index).toHaveLength(1);
      expect(saved.index[0].evaluationId).toBe("shared-id");
      expect(run[`${saved.namespace}Evaluations`]).toEqual(saved.index);
      expect(
        run.evidence.some((e) => e.evidenceId === saved.index[0].evidenceId),
      ).toBe(true);
      expect(saved.checks).toHaveLength(saved.namespace === "task" ? 2 : 1);
      expect(
        run.checks.filter((c) => c.ruleId.startsWith(`ux-${saved.namespace}-`)),
      ).toEqual(saved.checks);
      expect(saved.policy).toMatch(/^[a-f0-9]{64}$/);
      expect(run.policyVersions[`ux-${saved.namespace}-shared-id`]).toBe(
        saved.policy,
      );
      expect(saved.requests).toHaveLength(saved.checks.length);
      for (const before of saved.requests) {
        const after = run.dataRequests.filter(
          (r) => r.requestedArtifact === before.requestedArtifact,
        );
        expect(after).toHaveLength(1);
        expect(after[0]).toMatchObject({
          status: before.status,
          affectedCheckIds: before.affectedCheckIds,
          evidenceIds: before.evidenceIds,
          windowId: "shared-id",
          scopeKey: "site",
        });
        expect(after[0].runId).toBe("combined");
      }
    }
    expect(run.experimentEvaluations).toHaveLength(1);
    expect(
      run.dataRequests.filter(
        (r) => r.requestedArtifact === "ux-experiment-evaluation",
      ),
    ).toHaveLength(1);
    expect(
      run.dataRequests.find(
        (r) => r.requestedArtifact === "ux-experiment-evaluation",
      ).status,
    ).toBe(status === "declined" ? "declined" : "expired");
    expect(run.evidence.some((e) => e.evidenceId === originalEvidence)).toBe(
      true,
    );
    expect(
      run.checks
        .filter((c) => c.moduleId === "ux-cro")
        .every((c) => c.status === "unknown"),
    ).toBe(true);
    const results = [taskResult, funnelResult, experimentResult];
    const report = buildEnterpriseReport(run, {
      sourceRunDigest: enterpriseDigest(run),
      revisionId: "combined-r1",
      authorId: "fixture",
      generatedAt: at,
      brand: { name: "Synthetic multi-source audit", accent: "#174f7b" },
      findings: [],
      actions: [],
      observations: results.flatMap((r) => r.observations),
      narrative: results.flatMap((r) => r.narrative ?? []),
      decisions: [],
    });
    const funnelChecks = report.assessment.checks.filter((c) =>
      c.ruleId.startsWith("ux-funnel-"),
    );
    expect(funnelChecks).toHaveLength(1);
    expect(funnelChecks[0]).toMatchObject({
      status: "unknown",
      reason: expect.stringContaining("unknown (ineligible-source)"),
    });
    expect(
      report.dataRequests.filter(
        (r) => r.requestedArtifact === funnelChecks[0].ruleId,
      ),
    ).toHaveLength(1);
    const funnelObservations = report.observations.filter((o) =>
      o.label.startsWith("Funnel "),
    );
    expect(funnelObservations).toHaveLength(4);
    for (const observation of funnelObservations) {
      expect(observation.value).toBeNull();
      expect(observation.precision).toBe("unknown");
      expect(observation.scopeDescription).toContain(
        "unknown/ineligible-source",
      );
      expect(observation.evidenceIds).toEqual([
        run.funnelEvaluations[0].evidenceId,
      ]);
    }
    const metadata = {
      sourceRunDigest: enterpriseDigest(run),
      revisionId: "combined-r1",
      authorId: "fixture",
      generatedAt: at,
      brand: { name: "Synthetic multi-source audit", accent: "#174f7b" },
    };
    await buildStoredJourneyReport(
      source,
      metadata,
      join(root, "automatic-report"),
    );
    expect(await loadEnterpriseReport(join(root, "automatic-report"))).toEqual(
      report,
    );
    await expect(
      buildStoredJourneyReport(
        source,
        { ...metadata, observations: [] },
        join(root, "omitted"),
      ),
    ).rejects.toThrow(/metadata/);
    const oldRun = await loadEnterpriseRun(join(root, "task"));
    await expect(
      buildStoredJourneyReport(
        join(root, "task"),
        { ...metadata, sourceRunDigest: enterpriseDigest(oldRun) },
        join(root, "stale"),
      ),
    ).rejects.toThrow(/Reassess/);
    for (const namespace of ["task", "funnel", "experiment"]) {
      const tampered = structuredClone(run);
      tampered[`${namespace}Evaluations`] = [];
      const dir = join(root, `missing-${namespace}`);
      await saveEnterpriseRun(dir, tampered);
      await expect(
        buildStoredJourneyReport(
          dir,
          { ...metadata, sourceRunDigest: enterpriseDigest(tampered) },
          join(root, `bad-${namespace}`),
        ),
      ).rejects.toThrow(/Incomplete/);
    }
    await expect(
      buildStoredJourneyReport(
        source,
        { ...metadata, sourceRunDigest: "0".repeat(64) },
        join(root, "wrong-digest"),
      ),
    ).rejects.toThrow(/binding/);
    await expect(
      buildStoredJourneyReport(
        source,
        metadata,
        join(root, "automatic-report"),
      ),
    ).rejects.toThrow();
    expect(await loadEnterpriseReport(join(root, "automatic-report"))).toEqual(
      report,
    );
    for (const namespace of ["task", "funnel", "experiment"]) {
      const tampered = structuredClone(run);
      tampered.dataRequests = tampered.dataRequests.filter(
        (r) => !r.requestedArtifact.startsWith(`ux-${namespace}-`),
      );
      const dir = join(root, `missing-request-${namespace}`);
      await saveEnterpriseRun(dir, tampered);
      await expect(
        buildStoredJourneyReport(
          dir,
          { ...metadata, sourceRunDigest: enterpriseDigest(tampered) },
          join(root, `bad-request-${namespace}`),
        ),
      ).rejects.toThrow(/request/);
      await expect(
        access(join(root, `bad-request-${namespace}`)),
      ).rejects.toThrow();
    }
    expect(enterpriseDigest(await loadEnterpriseRun(source))).toBe(
      metadata.sourceRunDigest,
    );
    await saveEnterpriseReport(join(root, "report"), report);
    expect(await loadEnterpriseReport(join(root, "report"))).toEqual(report);
    for (const file of ["report.json", "report.md", "report.html"]) {
      const text = await readFile(join(root, "report", file), "utf8");
      expect(text).toContain("declared-business-outcome-matched");
      expect(text).toContain("Historical");
      expect(text).toContain("blocked");
      expect(text).not.toContain("artifactText");
      expect(text).not.toContain("pseudonymous-attempt");
      expect(text).not.toContain("Original registration history");
    }
  },
);
