import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { pathToFileURL } from "node:url";

it("runs supplied SEO evaluation, failed acquisition and report revision from an isolated installed tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "seo-installed-"));
  const skill = join(root, "skill");
  await cp(resolve("skills/content-search-audit"), skill, { recursive: true });
  const execute = promisify(execFile);
  const cli = async (...args: string[]) => {
    const result = await execute(
      process.execPath,
      [join(skill, "scripts/audit.mjs"), ...args],
      { cwd: root },
    );
    return JSON.parse(result.stdout);
  };
  const input = async (name: string, value: unknown) => {
    const file = join(root, name + ".json");
    await writeFile(file, JSON.stringify(value));
    return file;
  };
  const at = "2026-11-19T12:00:00Z";
  const config = await input("intake", {
    customerId: "customer",
    runId: "initial",
    assessmentAt: at,
    profileIds: ["commerce"],
    entities: [{ entityId: "site", type: "site" }],
  });
  const initial = join(root, "initial");
  const receipt = await cli("enterprise-intake", config, initial);
  const scope = {
    customerId: "customer",
    entityId: "site",
    environment: "production",
    targetUrl: "https://example.com/",
    profileId: "mobile",
    stateId: "anonymous",
  };
  const window = { from: "2026-11-19T11:00:00Z", to: at };
  const artifactText = JSON.stringify({
    schemaVersion: 1,
    scope,
    capturedAt: "2026-11-19T11:30:00Z",
    layers: {
      sourceHead: { complete: true, targets: [scope.targetUrl] },
      renderedHead: { complete: true, targets: [scope.targetUrl] },
      httpLink: { complete: true, targets: [] },
    },
  });
  const context = {
    entityId: scope.entityId,
    environment: scope.environment,
    targetUrl: scope.targetUrl,
    profileId: scope.profileId,
    stateId: scope.stateId,
  };
  const evaluations = await input("evaluations", {
    sourceDigest: receipt.digest,
    newRunId: "seo",
    assessmentAt: at,
    evaluations: [
      {
        evaluationId: "page",
        kind: "canonical",
        window,
        context: {
          ...context,
          maxAgeSeconds: 3600,
          expectedCanonical: scope.targetUrl,
        },
        sources: [
          {
            sourceId: "capture",
            artifactText,
            artifactHash: createHash("sha256")
              .update(artifactText)
              .digest("hex"),
          },
        ],
      },
    ],
  });
  const seo = join(root, "seo");
  const assessed = await cli(
    "enterprise-technical-seo-evaluate",
    initial,
    evaluations,
    seo,
  );
  expect(assessed.executionAuthenticated).toBe(false);
  expect(assessed.findings).toEqual([]);
  const reportInput = (digest: string, revisionId: string) => ({
    sourceRunDigest: digest,
    revisionId,
    generatedAt: at,
    authorId: "test",
    brand: { name: "Synthetic customer", accent: "#174f7b" },
    findings: [],
    actions: [],
    observations: [],
    narrative: [],
    decisions: [],
  });
  const report = join(root, "report");
  await cli(
    "enterprise-report",
    seo,
    await input("report-input", reportInput(assessed.digest, "report")),
    report,
  );
  const attempts = await input("attempts", {
    sourceDigest: assessed.digest,
    newRunId: "failed",
    assessmentAt: at,
    attempts: [
      {
        target: {
          targetId: "page",
          kind: "canonical",
          scope,
          method: null,
          window,
          maxAgeSeconds: 3600,
        },
        attempt: {
          attemptId: "attempt-one",
          collectorVersion: "synthetic-test",
          result: {
            status: "unknown",
            synthetic: true,
            scope,
            startedAt: "2026-11-19T11:40:00Z",
            finishedAt: "2026-11-19T11:41:00Z",
            gaps: ["navigation-failed"],
            executionAuthenticated: false,
            semanticAcceptance: false,
          },
        },
      },
    ],
  });
  const failed = join(root, "failed");
  const attemptResult = await cli(
    "enterprise-technical-seo-acquisition",
    seo,
    attempts,
    failed,
  );
  const revisedReport = join(root, "revised-report");
  await cli(
    "enterprise-report-revise",
    report,
    failed,
    await input("revised-input", {
      ...reportInput(attemptResult.digest, "revised"),
      generatedAt: "2026-11-19T12:01:00Z",
      parentReportDigest: (
        await import(
          pathToFileURL(join(skill, "scripts/lib/enterprise-state.mjs")).href
        )
      ).enterpriseDigest(
        JSON.parse(await readFile(join(report, "report.json"), "utf8")),
      ),
    }),
    revisedReport,
  );
  await cli("enterprise-report-validate", revisedReport);
  const result = JSON.parse(
    await readFile(join(revisedReport, "report.json"), "utf8"),
  );
  expect(result.summary.unknownChecks).toBeGreaterThan(0);
  for (const file of ["report.md", "report.html"])
    expect(
      (await readFile(join(revisedReport, file), "utf8")).length,
    ).toBeGreaterThan(100);
  await expect(
    cli("enterprise-technical-seo-evaluate", initial, evaluations, seo),
  ).rejects.toThrow();
});
