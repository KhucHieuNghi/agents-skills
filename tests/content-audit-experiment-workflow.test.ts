import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { reviewedFixture } from "./helpers/experiment-reviewed.js";
import { hash, encode } from "./helpers/experiment-exports.js";
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
import { evaluateEnterpriseExperiments as evaluate } from "../scripts/enterprise-journeys/experiment-workflow.mjs";
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "experiment-workflow-")),
    s = reviewedFixture();
  const run = resolveAuditContext(
    {
      customerId: s.context.scope.customerId,
      runId: "initial",
      assessmentAt: s.context.assessmentAt,
      profileIds: ["commerce"],
      entities: [{ entityId: s.context.scope.entityId, type: "site" }],
    },
    [],
  );
  await saveEnterpriseRun(join(root, "initial"), run);
  const { assessmentAt, ...context } = s.context,
    artifactText = JSON.stringify(s.receipt);
  const entry = {
    evaluationId: "pricing-test",
    context,
    aggregateSources: s.aggregates,
    supportSources: s.supports,
    reviewPolicy: s.policy,
    receipt: { artifactText, artifactHash: hash(artifactText) },
    presentation: {
      experimentLabel: "Synthetic checkout experiment",
      metricLabels: [
        { metricId: "conversion", label: "Completed purchases" },
        { metricId: "harm", label: "Refund outcome" },
      ],
    },
  };
  return {
    root,
    run,
    entry,
    bundle: {
      sourceDigest: enterpriseDigest(run),
      newRunId: "first",
      assessmentAt,
      evaluations: [entry],
    },
  };
}
const request = (run) =>
  run.dataRequests.find(
    (r) => r.requestedArtifact === "ux-experiment-evaluation",
  );
const bundle = (run, result) => ({
  sourceRunDigest: enterpriseDigest(run),
  revisionId: "r1",
  authorId: "author",
  generatedAt: run.assessmentAt,
  brand: { name: "Synthetic enterprise", accent: "#174f7b" },
  findings: [],
  actions: [],
  observations: result.observations,
  narrative: result.narrative,
  decisions: [],
});
it("creates immutable canonical reports with qualified intervals and no raw private review/support", async () => {
  const f = await setup();
  const result = await evaluate(
    join(f.root, "initial"),
    f.bundle,
    join(f.root, "first"),
  );
  const run = await loadEnterpriseRun(join(f.root, "first"));
  expect(request(run).status).toBe("provided");
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("ux-experiment-"))
      .every((c) => c.status === "unknown"),
  ).toBe(true);
  const report = buildEnterpriseReport(run, bundle(run, result));
  await saveEnterpriseReport(join(f.root, "report"), report);
  expect(await loadEnterpriseReport(join(f.root, "report"))).toEqual(report);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).toContain("synthetic");
    expect(text).toContain("Completed purchases");
    expect(text).toContain("insufficient-evidence");
    expect(text).toContain("approximate");
    expect(text).not.toContain("Original registration history");
    expect(text).not.toContain("Synthetic review judgment only");
    expect(text).not.toContain("artifactText");
  }
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
  expect(result.findings).toEqual([]);
});
it("reopens provided evidence on expiry while preserving historical interpretation", async () => {
  const f = await setup();
  await evaluate(join(f.root, "initial"), f.bundle, join(f.root, "first"));
  const first = await loadEnterpriseRun(join(f.root, "first"));
  const result = await evaluate(
    join(f.root, "first"),
    {
      sourceDigest: enterpriseDigest(first),
      newRunId: "second",
      assessmentAt: "2026-11-06T00:00:00Z",
      evaluations: [f.entry],
    },
    join(f.root, "second"),
  );
  const second = await loadEnterpriseRun(join(f.root, "second"));
  expect(request(second).status).toBe("expired");
  expect(
    second.evidence.filter(
      (e) => e.artifactType === "ux-experiment-evaluation",
    ),
  ).toHaveLength(2);
  expect(
    result.narrative.some(
      (n) =>
        n.text.includes("Historical") &&
        n.text.includes("insufficient-evidence"),
    ),
  ).toBe(true);
  expect(
    result.narrative.some(
      (n) => n.text.includes("Current") && n.text.includes("blocked"),
    ),
  ).toBe(true);
});
it("preserves refusal when subsequently supplied review becomes usable", async () => {
  const f = await setup();
  const missing = { ...f.entry, receipt: null };
  await evaluate(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [missing] },
    join(f.root, "first"),
  );
  const first = await loadEnterpriseRun(join(f.root, "first"));
  request(first).status = "declined";
  request(first).reason = "Owner declined further requests.";
  await saveEnterpriseRun(join(f.root, "declined"), first);
  await evaluate(
    join(f.root, "declined"),
    {
      sourceDigest: enterpriseDigest(first),
      newRunId: "second",
      assessmentAt: "2026-11-04T01:00:00Z",
      evaluations: [f.entry],
    },
    join(f.root, "second"),
  );
  expect(request(await loadEnterpriseRun(join(f.root, "second"))).status).toBe(
    "declined",
  );
});
it("revalidates policy-only revisions and preserves the original receipt/history", async () => {
  const f = await setup();
  await evaluate(join(f.root, "initial"), f.bundle, join(f.root, "first"));
  const first = await loadEnterpriseRun(join(f.root, "first"));
  const revised = {
    ...f.entry,
    reviewPolicy: { ...f.entry.reviewPolicy, maxAgeSeconds: 3600 },
  };
  await evaluate(
    join(f.root, "first"),
    {
      sourceDigest: enterpriseDigest(first),
      newRunId: "second",
      assessmentAt: "2026-11-04T01:00:00Z",
      evaluations: [revised],
    },
    join(f.root, "second"),
  );
  const second = await loadEnterpriseRun(join(f.root, "second"));
  expect(request(second).status).toBe("expired");
  expect(
    second.evidence.filter(
      (e) => e.artifactType === "ux-experiment-evaluation",
    ),
  ).toHaveLength(2);
});
it("rejects synthetic-to-real rebinding and never writes a rejected output", async () => {
  const f = await setup();
  await evaluate(join(f.root, "initial"), f.bundle, join(f.root, "first"));
  const first = await loadEnterpriseRun(join(f.root, "first"));
  const changed = structuredClone(f.entry);
  changed.context.protocol.synthetic = false;
  changed.context.protocolDigest = enterpriseDigest(changed.context.protocol);
  changed.aggregateSources = changed.aggregateSources.map((source) => {
    const raw = JSON.parse(source.artifactText);
    raw.synthetic = false;
    raw.protocolDigest = changed.context.protocolDigest;
    return encode(raw, source.sourceId, source.capturedAt);
  });
  changed.supportSources = changed.supportSources.map((source) => ({
    ...source,
    synthetic: false,
    protocolDigest: changed.context.protocolDigest,
  }));
  changed.receipt = null;
  await expect(
    evaluate(
      join(f.root, "first"),
      {
        sourceDigest: enterpriseDigest(first),
        newRunId: "bad",
        assessmentAt: "2026-11-04T01:00:00Z",
        evaluations: [changed],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow();
  await expect(access(join(f.root, "bad"))).rejects.toThrow();
});
it("rejects deletion of the ownership index", async () => {
  const f = await setup();
  await evaluate(join(f.root, "initial"), f.bundle, join(f.root, "first"));
  const first = await loadEnterpriseRun(join(f.root, "first"));
  first.experimentEvaluations = [];
  await saveEnterpriseRun(join(f.root, "tampered"), first);
  await expect(
    evaluate(
      join(f.root, "tampered"),
      {
        sourceDigest: enterpriseDigest(first),
        newRunId: "bad",
        assessmentAt: "2026-11-04T01:00:00Z",
        evaluations: [],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/Incomplete/);
});
it("does not overwrite an existing output directory", async () => {
  const f = await setup();
  await expect(
    evaluate(join(f.root, "initial"), f.bundle, join(f.root, "initial")),
  ).rejects.toThrow();
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "initial"))),
  ).toBe(f.bundle.sourceDigest);
});

it("rejects a deleted declined request rather than recreating fulfillment", async () => {
  const f = await setup();
  await evaluate(join(f.root, "initial"), f.bundle, join(f.root, "first"));
  const first = await loadEnterpriseRun(join(f.root, "first"));
  request(first).status = "declined";
  request(first).reason = "Owner declined.";
  await saveEnterpriseRun(join(f.root, "declined"), first);
  first.dataRequests = first.dataRequests.filter(
    (r) => r.requestedArtifact !== "ux-experiment-evaluation",
  );
  await saveEnterpriseRun(join(f.root, "missing-request"), first);
  await expect(
    evaluate(
      join(f.root, "missing-request"),
      {
        sourceDigest: enterpriseDigest(first),
        newRunId: "bad",
        assessmentAt: "2026-11-04T01:00:00Z",
        evaluations: [f.entry],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/request/);
});

it("invalidates fulfillment when fresh evidence becomes conflicting", async () => {
  const f = await setup();
  await evaluate(join(f.root, "initial"), f.bundle, join(f.root, "first"));
  const first = await loadEnterpriseRun(join(f.root, "first"));
  const changed = structuredClone(f.entry),
    raw = JSON.parse(changed.aggregateSources[0].artifactText);
  raw.metrics[0].treatment.confirmedSuccess = 30;
  raw.metrics[0].treatment.confirmedNonSuccess = 70;
  changed.aggregateSources.push(encode(raw, "conflict"));
  await evaluate(
    join(f.root, "first"),
    {
      sourceDigest: enterpriseDigest(first),
      newRunId: "second",
      assessmentAt: "2026-11-04T01:00:00Z",
      evaluations: [changed],
    },
    join(f.root, "second"),
  );
  expect(request(await loadEnterpriseRun(join(f.root, "second"))).status).toBe(
    "invalid",
  );
});
it("rejects forged fulfillment of an unreviewed evaluation", async () => {
  const f = await setup();
  await evaluate(
    join(f.root, "initial"),
    { ...f.bundle, evaluations: [{ ...f.entry, receipt: null }] },
    join(f.root, "first"),
  );
  const first = await loadEnterpriseRun(join(f.root, "first")),
    e = first.evidence.find(
      (x) => x.artifactType === "ux-experiment-evaluation",
    );
  const r = request(first);
  r.status = "provided";
  r.evidenceIds = [e.evidenceId];
  r.evidenceDigests = { [e.evidenceId]: e.digest };
  await saveEnterpriseRun(join(f.root, "forged"), first);
  await expect(
    evaluate(
      join(f.root, "forged"),
      {
        sourceDigest: enterpriseDigest(first),
        newRunId: "bad",
        assessmentAt: "2026-11-04T01:00:00Z",
        evaluations: [f.entry],
      },
      join(f.root, "bad"),
    ),
  ).rejects.toThrow(/Unverified/);
});
