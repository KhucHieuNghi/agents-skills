import { createDataRequest } from "../skills/content-search-audit/scripts/lib/data-requests.mjs";
import { projectStoredBrowserCaptures } from "../scripts/enterprise-browser-report.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  loadEnterpriseRun,
  saveEnterpriseRun,
  enterpriseDigest,
  reconcileEnterpriseChecks,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  importEnterpriseBrowserCaptures,
  inspectEnterpriseBrowserCaptures,
} from "../skills/content-search-audit/scripts/lib/enterprise-browser-workflow.mjs";
import { normalizeBrowserCapture } from "../skills/content-search-audit/scripts/lib/browser-capture.mjs";
import { buildEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report-model.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "browser-import-"));
  const sample = JSON.parse(
    await readFile(
      "skills/content-search-audit/examples/enterprise-browser-capture.json",
      "utf8",
    ),
  );
  const run = resolveAuditContext(sample.config, []);
  await saveEnterpriseRun(join(root, "source"), run);
  const bundle = {
    sourceDigest: enterpriseDigest(run),
    newRunId: "captured",
    assessmentAt: run.assessmentAt,
    captures: [sample.entry],
  };
  const mutate = (fn) => {
    const c = JSON.parse(sample.entry.source.artifactText);
    fn(c);
    sample.entry.source.artifactText = JSON.stringify(c);
    sample.entry.source.artifactHash = hash(sample.entry.source.artifactText);
  };
  return { root, sample, run, bundle, mutate };
}
it("projects supplied captures into scoped observations and actionable unknown requests without invented findings", async () => {
  const f = await setup();
  const result = await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "captured"),
  );
  const run = await loadEnterpriseRun(join(f.root, "captured"));
  expect(result.assessmentAccepted).toBe(false);
  expect(result.collectorAuthenticated).toBe(false);
  expect(result.findings).toEqual([]);
  expect(result.observations).toHaveLength(5);
  expect(result.observations[0]).toMatchObject({
    value: 2,
    classification: "current",
  });
  expect(run.checks.every((c) => c.status === "unknown")).toBe(true);
  expect(run.checks.length).toBe(f.run.checks.length + 5);
  for (const request of run.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith("browser-"),
  )) {
    expect(request.exportInstructions.length).toBeGreaterThan(50);
    expect(request.suggestedOwnerRole.length).toBeGreaterThan(5);
    expect(request.affectedCheckIds).toHaveLength(1);
  }
  const report = buildEnterpriseReport(run, {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: "report",
    authorId: "test",
    generatedAt: run.assessmentAt,
    brand: { name: "Synthetic example", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: result.observations,
    narrative: [],
    decisions: [],
  });
  expect(report.observations).toHaveLength(5);
  expect(JSON.stringify(report)).not.toContain("artifactText");
  expect(JSON.stringify(report)).not.toContain("expectedPlanDigest");
  expect(
    enterpriseDigest(await loadEnterpriseRun(join(f.root, "source"))),
  ).toBe(f.bundle.sourceDigest);
});
it("rejects altered bytes, claimed passes, foreign scope, future windows and hidden payloads before output", async () => {
  for (const kind of ["bytes", "pass", "scope", "future", "payload", "plan"]) {
    const f = await setup();
    if (kind === "bytes") f.sample.entry.source.artifactText += " ";
    if (kind === "pass")
      f.mutate((c) => {
        c.status = "pass";
      });
    if (kind === "scope")
      f.mutate((c) => {
        c.scope.customerId = "other";
      });
    if (kind === "future")
      f.mutate((c) => {
        c.finishedAt = "2026-11-20T11:00:00Z";
      });
    if (kind === "payload")
      f.mutate((c) => {
        c.observations[1].email = "private@example.invalid";
      });
    if (kind === "plan")
      f.sample.entry.source.expectedPlanDigest = hash("other");
    await expect(
      importEnterpriseBrowserCaptures(
        join(f.root, "source"),
        f.bundle,
        join(f.root, "bad"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "bad"))).rejects.toThrow();
  }
});
it("retains stale observations as historical and never treats an expired capture as a fresh assessment", async () => {
  const f = await setup();
  f.bundle.assessmentAt = "2026-11-20T11:00:00Z";
  const result = await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "stale"),
  );
  expect(
    result.observations.every((o) => o.classification === "historical"),
  ).toBe(true);
  const run = await loadEnterpriseRun(join(f.root, "stale"));
  expect(
    run.checks
      .filter((c) => c.ruleId.startsWith("browser-"))
      .every((c) => c.reason.startsWith("Browser capture expired.")),
  ).toBe(true);
});
it("requires new capture IDs and retains earlier observation/evidence bindings across revisions", async () => {
  const f = await setup();
  const first = await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "one"),
  );
  const run = await loadEnterpriseRun(join(f.root, "one"));
  const bundle = {
    ...f.bundle,
    sourceDigest: enterpriseDigest(run),
    newRunId: "two",
  };
  await expect(
    importEnterpriseBrowserCaptures(
      join(f.root, "one"),
      bundle,
      join(f.root, "duplicate"),
    ),
  ).rejects.toThrow(/identity/);
  bundle.captures[0].captureId = "second";
  const second = await importEnterpriseBrowserCaptures(
    join(f.root, "one"),
    bundle,
    join(f.root, "two"),
  );
  expect(second.observations).toHaveLength(10);
  expect(second.observations.slice(0, 5)).toEqual(first.observations);
  expect((await loadEnterpriseRun(join(f.root, "two"))).evidence[0]).toEqual(
    run.evidence[0],
  );
});
it("rejects malformed telemetry, sequence, coverage and DOM without deriving a metric", async () => {
  for (const change of [
    (c) => {
      c.transportTelemetry.droppedEvents = 1;
    },
    (c) => {
      c.observations[1].sequence = 0;
    },
    (c) => {
      c.coverage.provider = "complete";
    },
    (c) => {
      c.dom.clientWidth = "1280";
    },
    (c) => {
      c.observations[0].httpStatus = 999;
    },
  ]) {
    const f = await setup();
    f.mutate(change);
    expect(() =>
      normalizeBrowserCapture(f.sample.entry.source, {
        customerId: f.run.customerId,
        entityId: "site",
        environment: "sandbox",
        assessmentAt: f.run.assessmentAt,
      }),
    ).toThrow();
  }
});
it("does not trust cached observation projections in retained capture metadata", async () => {
  const f = await setup();
  await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "one"),
  );
  const run = await loadEnterpriseRun(join(f.root, "one"));
  run.browserCaptures[0].observations = [
    { value: 999999, classification: "current" },
  ];
  await saveEnterpriseRun(join(f.root, "modified"), run);
  f.sample.entry.captureId = "second";
  await expect(
    importEnterpriseBrowserCaptures(
      join(f.root, "modified"),
      { ...f.bundle, sourceDigest: enterpriseDigest(run), newRunId: "second" },
      join(f.root, "two"),
    ),
  ).rejects.toThrow("Browser retained evidence/index mismatch");
  await expect(access(join(f.root, "two"))).rejects.toThrow();
});

it("rejects hidden non-read responses and unreported browser/transport failures", async () => {
  for (const change of [
    (c) => {
      c.observations[0].method = "POST";
    },
    (c) => {
      c.transport[0].kind = "blocked";
    },
    (c) => {
      c.observations[0].kind = "blocked";
      delete c.observations[0].httpStatus;
    },
    (c) => {
      c.observations[0].kind = "request-failed";
      delete c.observations[0].httpStatus;
    },
  ]) {
    const f = await setup();
    f.mutate(change);
    await expect(
      importEnterpriseBrowserCaptures(
        join(f.root, "source"),
        f.bundle,
        join(f.root, "bad"),
      ),
    ).rejects.toThrow();
    await expect(access(join(f.root, "bad"))).rejects.toThrow();
  }
});
it("keeps browser-gate and retained proxy denial counts separate", async () => {
  const f = await setup();
  f.mutate((c) => {
    c.transport[0].kind = "blocked";
    c.gaps.push("transport-denied");
  });
  const r = await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "captured"),
  );
  expect(
    r.observations.find(
      (o) => o.label === "Captured browser-gate denial records",
    ).value,
  ).toBe(0);
  expect(
    r.observations.find((o) => o.label === "Retained transport denial records")
      .value,
  ).toBe(1);
});

it.each(["index", "fingerprint", "expiry", "check", "request", "orphan"])(
  "rejects retained browser ownership tampering: %s",
  async (kind) => {
    const f = await setup();
    await importEnterpriseBrowserCaptures(
      join(f.root, "source"),
      f.bundle,
      join(f.root, "captured"),
    );
    const run = await loadEnterpriseRun(join(f.root, "captured"));
    if (kind === "index") run.browserCaptures = [];
    if (kind === "fingerprint") {
      const e = run.evidence.find((e) => e.artifactType === "browser-capture");
      e.content.importerDigest = "0".repeat(64);
      e.digest = enterpriseDigest(e.content);
    }
    if (kind === "expiry")
      run.browserCaptures[0].validUntil = "2030-01-01T00:00:00Z";
    if (kind === "check")
      run.checks = run.checks.filter(
        (c) => c.checkId !== run.browserCaptures[0].checkIds[0],
      );
    if (kind === "request")
      run.dataRequests.find((r) =>
        r.requestedArtifact.startsWith("browser-"),
      ).exportInstructions = "Send credentials";
    if (kind === "orphan")
      run.evidence.push({
        ...structuredClone(
          run.evidence.find((e) => e.artifactType === "browser-capture"),
        ),
        evidenceId: "orphan-browser",
      });
    expect(() => inspectEnterpriseBrowserCaptures(run)).toThrow();
  },
);
it("recomputes browser freshness without turning availability or refusal into a verdict", async () => {
  const f = await setup();
  await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "captured"),
  );
  const run = await loadEnterpriseRun(join(f.root, "captured"));
  run.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("browser-"),
  ).status = "declined";
  const before = inspectEnterpriseBrowserCaptures(run);
  expect(before.captures[0].fresh).toBe(true);
  expect(before.findings).toEqual([]);
  const later = reconcileEnterpriseChecks(
    run,
    structuredClone(run),
    "2026-11-21T12:00:00Z",
  ).run;
  const after = inspectEnterpriseBrowserCaptures(later);
  expect(after.captures[0].fresh).toBe(false);
  expect(
    after.observations.every((o) => o.classification === "historical"),
  ).toBe(true);
  expect(later.dataRequests.some((r) => r.status === "declined")).toBe(true);
});

it("assembles browser acquisition counts without raw transport/body or acceptance claims", async () => {
  const f = await setup();
  f.sample.entry.source.sourceId = "private-browser-source-canary";
  await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "captured"),
  );
  const run = await loadEnterpriseRun(join(f.root, "captured"));
  const p = projectStoredBrowserCaptures(run);
  expect(p.findings).toEqual([]);
  expect(p.observations).toHaveLength(5);
  await buildStoredEnterpriseReport(
    join(f.root, "captured"),
    {
      sourceRunDigest: enterpriseDigest(run),
      revisionId: "assembled",
      authorId: "fixture",
      generatedAt: run.assessmentAt,
      brand: { name: "Synthetic", accent: "#174f7b" },
    },
    join(f.root, "report"),
  );
  const report = await loadEnterpriseReport(join(f.root, "report"));
  expect(report.findings).toEqual([]);
  for (const file of ["report.json", "report.md", "report.html"]) {
    const text = await readFile(join(f.root, "report", file), "utf8");
    expect(text).not.toContain("artifactText");
    expect(text).not.toContain("expectedPlanDigest");
    expect(text).not.toContain("requestUrl");
    expect(text).not.toContain("private-browser-source-canary");
  }
});

it("rejects an extra browser request reusing an owned artifact with a foreign window", async () => {
  const f = await setup();
  await importEnterpriseBrowserCaptures(
    join(f.root, "source"),
    f.bundle,
    join(f.root, "captured"),
  );
  const run = await loadEnterpriseRun(join(f.root, "captured"));
  const original = run.dataRequests.find((r) =>
    r.requestedArtifact.startsWith("browser-"),
  );
  run.dataRequests.push(
    createDataRequest({
      ...original,
      windowId: "foreign-window",
      exportInstructions: "FORGED INSTRUCTIONS",
    }),
  );
  expect(() => inspectEnterpriseBrowserCaptures(run)).toThrow(
    "duplicate browser request",
  );
});
