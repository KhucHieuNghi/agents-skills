import {
  analyticsExport,
  bingExport,
  serverLogExport,
  searchConsoleExport,
} from "./helpers/content-audit-measurements.js";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import {
  buildReportDocuments,
  renderReport,
} from "../skills/content-search-audit/scripts/lib/report.mjs";
const core = JSON.parse(
  await readFile("skills/content-search-audit/rules/core.json", "utf8"),
);
const registry = {
  ...core,
  rules: core.rules.filter((rule) => rule.ruleId === "quality-readable-text"),
};
function fixture() {
  const value = "";
  return {
    run: {
      runId: "report-test",
      registryVersion: registry.version,
      status: "complete",
      inventoryComplete: true,
      mode: "full",
      pendingQueue: [],
    },
    inventory: [
      {
        itemId: "page",
        state: "audited",
        requiredRuleIds: ["quality-readable-text"],
      },
    ],
    evidence: [
      {
        evidenceId: "e1",
        itemId: "page",
        kind: "extracted-text",
        value,
        artifact: "evidence/page.txt",
        encoding: "utf8",
        snapshotHash: createHash("sha256").update(value).digest("hex"),
        method: "supplied-extraction",
        locator: "page.md",
        collectedAt: "2026-11-16T00:00:00Z",
        redaction: "none",
        limitations: ["Export only"],
        sourceEvidenceIds: [],
      },
    ],
    checks: [
      {
        itemId: "page",
        ruleId: "quality-readable-text",
        dimension: "quality",
        status: "fail",
        evidenceIds: ["e1"],
        dependencies: ["page"],
        reason: "Extraction is empty",
      },
    ],
    findings: [
      {
        findingId: "f1",
        title: "Empty extraction",
        affectedItemIds: ["page"],
        ruleIds: ["quality-readable-text"],
        dimensions: ["quality"],
        evidenceIds: ["e1"],
        severity: "medium",
        confidence: "high",
        classification: "observed",
        remediation: "Check extractor against source",
        verification: "Repeat extraction",
        ownerRole: "Content reviewer",
        effort: "small",
      },
    ],
    artifacts: { "evidence/page.txt": value },
  };
}
it("renders matching coverage, findings, item checks and evidence in all report forms", () => {
  const result = buildReportDocuments(fixture(), registry, {
    brandName: "Customer",
  });
  expect(JSON.parse(result["coverage.json"]).audited).toBe(1);
  expect(result["report.md"]).toContain("Empty extraction");
  expect(result["report.html"]).toContain("quality-readable-text");
  expect(result["report.html"]).toContain("evidence/page.txt");
  expect(result["report.html"]).toContain("Customer");
  expect(result["content-actions.csv"]).toContain("Repeat extraction");
  expect(result["report.md"]).toContain("Visibility measurements unavailable");
});
it("uses one explicit report clock for capture and date-only review ages without changing coverage", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    const data = fixture();
    const result = buildReportDocuments(data, registry);
    for (const name of ["report.html", "report.md"]) {
      const text = result[name].replaceAll("\\", "");
      expect(text).toContain("2026-11-19T12:00:00.000Z");
      expect(text).toContain("3 full elapsed days");
      expect(text).toContain("3 UTC calendar days (date only)");
      expect(text).toContain("no stale-content verdict follows from age alone");
    }
    expect(JSON.parse(result["coverage.json"]).audited).toBe(1);
    expect(data.evidence[0].collectedAt).toBe("2026-11-16T00:00:00Z");
  } finally {
    vi.useRealTimers();
  }
});
it("preserves one reconciled finding across two dimensions without multiplying actions", () => {
  const audit = fixture();
  const combinedRegistry = {
    ...core,
    rules: core.rules.filter((rule) =>
      ["quality-readable-text", "seo-response"].includes(rule.ruleId),
    ),
  };
  const value = JSON.stringify({ status: 404 });
  audit.inventory[0].requiredRuleIds.push("seo-response");
  audit.evidence.push({
    ...audit.evidence[0],
    evidenceId: "http",
    kind: "http-response",
    value: JSON.parse(value),
    encoding: "json",
    artifact: "evidence/http.json",
    snapshotHash: createHash("sha256").update(value).digest("hex"),
  });
  Object.assign(audit.artifacts, { "evidence/http.json": value });
  audit.checks.push({
    ...audit.checks[0],
    ruleId: "seo-response",
    dimension: "seo",
    evidenceIds: ["http"],
    reason: "Captured response was 404",
  });
  Object.assign(audit.findings[0], {
    title: "One unavailable content incident",
    ruleIds: ["quality-readable-text", "seo-response"],
    dimensions: ["quality", "seo"],
    evidenceIds: ["e1", "http"],
  });
  const documents = buildReportDocuments(audit, combinedRegistry);
  for (const name of ["report.md", "report.html", "content-actions.csv"]) {
    expect(
      documents[name].match(/One unavailable content incident/g),
    ).toHaveLength(1);
  }
  expect(documents["report.md"]).toContain("quality, seo");
  expect(documents["report.html"]).toContain("quality, seo");
  expect(documents["content-actions.csv"].trim().split("\r\n")).toHaveLength(2);
  const coverage = JSON.parse(documents["coverage.json"]);
  for (const dimension of ["quality", "seo"]) {
    expect(coverage.dimensions[dimension]).toEqual({
      total: 1,
      completed: 1,
      unknown: 0,
      notApplicable: 0,
    });
  }
  expect(audit.findings).toHaveLength(1);
});
it("escapes hostile HTML, Markdown and spreadsheet formulas", () => {
  const audit = fixture();
  audit.findings[0].title = "<img src=x onerror=alert(1)>";
  audit.findings[0].remediation = '=HYPERLINK("https://evil.test")';
  const result = buildReportDocuments(audit, registry, {
    brandName: "<script>alert(1)</script>",
  });
  expect(result["report.html"]).not.toContain("<script>");
  expect(result["report.html"]).not.toContain("<img src=x");
  expect(result["report.md"]).not.toContain("<img src=x");
  expect(result["content-actions.csv"]).toContain("'=HYPERLINK");
});
it("keeps partial scope visible and refuses invalid audit data", () => {
  const audit = fixture();
  audit.run.status = "partial";
  audit.run.inventoryComplete = false;
  const result = buildReportDocuments(audit, registry);
  expect(result["report.md"]).toContain("Partial");
  expect(result["report.md"]).toContain("Inventory completeness is unknown");
  audit.run.status = "complete";
  expect(() => buildReportDocuments(audit, registry)).toThrow(/invalid audit/i);
});
it("sorts priorities without inventing an overall SEO score", () => {
  const audit = fixture();
  audit.findings.push({
    ...audit.findings[0],
    findingId: "f2",
    title: "Critical issue",
    severity: "critical",
  });
  const result = buildReportDocuments(audit, registry);
  expect(result["report.md"].indexOf("Critical issue")).toBeLessThan(
    result["report.md"].indexOf("Empty extraction"),
  );
  expect(result["report.md"]).not.toContain("SEO score");
});

it("writes reports beside validated source artifacts without overwriting an existing report", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-report-"));
  try {
    const audit = fixture();
    await mkdir(path.join(dir, "evidence"));
    for (const [name, value] of Object.entries({
      "run.json": JSON.stringify(audit.run),
      "inventory.jsonl": audit.inventory
        .map((item) => JSON.stringify(item))
        .join("\n"),
      "evidence.jsonl": audit.evidence
        .map((item) => JSON.stringify(item))
        .join("\n"),
      "checks.jsonl": audit.checks
        .map((item) => JSON.stringify(item))
        .join("\n"),
      "findings.json": JSON.stringify(audit.findings),
      ...audit.artifacts,
    }))
      await writeFile(path.join(dir, name), value);
    const result = await renderReport(dir, {
      registry,
      searchConsoleExports: [searchConsoleExport()],
    });
    expect(result.files).toHaveLength(5);
    expect(
      JSON.parse(
        await readFile(path.join(dir, "search-console-evidence.json"), "utf8"),
      ).exports,
    ).toEqual([searchConsoleExport()]);
    expect(await readFile(path.join(dir, "report.html"), "utf8")).toContain(
      "Empty extraction",
    );
    await expect(renderReport(dir, { registry })).rejects.toThrow(/exist/i);
    expect(
      JSON.parse(await readFile(path.join(dir, "coverage.json"), "utf8"))
        .audited,
    ).toBe(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("labels synthetic AI observations and shows counts without calling them live visibility", () => {
  const response = "Example response";
  const result = buildReportDocuments(fixture(), registry, {
    measurements: {
      observations: [
        {
          observationId: "one",
          engine: "Example",
          surface: "api",
          model: "unknown",
          searchMode: "enabled",
          locale: "vi-VN",
          market: "VN",
          cohortId: "fixture",
          cohortVersion: "1",
          promptId: "q",
          prompt: "Example question",
          capturedAt: "2026-11-16T00:00:00Z",
          repetition: 1,
          status: "captured",
          responseArtifact: "response",
          responseHash: createHash("sha256").update(response).digest("hex"),
          brandMentioned: null,
          citations: [],
          annotationMethod: "fixture",
        },
      ],
      metadata: {
        brand: "Example",
        brandHosts: ["example.com"],
        synthetic: true,
        artifacts: { response },
      },
    },
  });
  expect(result["report.html"]).toContain("SYNTHETIC FIXTURE DATA");
  expect(result["report.html"]).toContain("Unavailable (0 reviewed responses)");
  expect(result["report.html"]).toContain("0/1 (0.0%)");
});

it("persists original Search Console responses with recomputed receipts and visible limitations", () => {
  const input = searchConsoleExport();
  const documents = buildReportDocuments(fixture(), registry, {
    searchConsoleExports: [input],
  });
  const saved = JSON.parse(documents["search-console-evidence.json"]);
  expect(saved.exports).toEqual([input]);
  expect(saved.receipts[0].populationComplete).toBe(false);
  expect(saved.exportsHash).toBe(
    createHash("sha256")
      .update(JSON.stringify([input]))
      .digest("hex"),
  );
  expect(documents["report.html"]).toContain("SYNTHETIC FIXTURE DATA");
  expect(documents["report.html"]).toContain("No — more pages required");
  expect(documents["report.html"]).toContain(
    'href="search-console-evidence.json"',
  );
  expect(documents["report.html"]).not.toContain("<script>supplied");
  expect(JSON.parse(documents["coverage.json"])).toEqual(
    JSON.parse(buildReportDocuments(fixture(), registry)["coverage.json"]),
  );
  input.pages[0].responseHash = "0".repeat(64);
  expect(() =>
    buildReportDocuments(fixture(), registry, {
      searchConsoleExports: [input],
    }),
  ).toThrow(/hash/i);
});

it("rejects ambiguous source IDs and empty supplied bundles", () => {
  expect(() =>
    buildReportDocuments(fixture(), registry, {
      searchConsoleExports: [searchConsoleExport(), searchConsoleExport()],
    }),
  ).toThrow(/duplicate/i);
  expect(() =>
    buildReportDocuments(fixture(), registry, { searchConsoleExports: [] }),
  ).toThrow(/exports/i);
});

it("attaches GA4 and Search Console separately without changing coverage or rounding metrics", () => {
  const input = analyticsExport();
  const result = buildReportDocuments(fixture(), registry, {
    analyticsExports: [input],
    searchConsoleExports: [searchConsoleExport()],
  });
  const evidence = JSON.parse(result["analytics-evidence.json"]);
  expect(evidence.exports).toEqual([input]);
  expect(evidence.receipts[0].rows[0].metrics.activeUsers.value).toBe(
    "9007199254740993",
  );
  expect(result["search-console-evidence.json"]).toBeDefined();
  expect(result["report.html"]).toContain('href="analytics-evidence.json"');
  expect(result["report.html"]).toContain("subjectToThresholding");
  expect(result["report.html"]).toContain(
    "SYNTHETIC FIXTURE DATA — not live analytics",
  );
  expect(result["report.html"]).not.toContain("<script>analytics");
  expect(result["coverage.json"]).toBe(
    buildReportDocuments(fixture(), registry)["coverage.json"],
  );
  input.pages[0].responseHash = "0".repeat(64);
  expect(() =>
    buildReportDocuments(fixture(), registry, { analyticsExports: [input] }),
  ).toThrow(/hash/i);
  expect(() =>
    buildReportDocuments(fixture(), registry, {
      analyticsExports: [analyticsExport(), analyticsExport()],
    }),
  ).toThrow(/duplicate/i);
});

it("preserves Bing source mapping and range/unknown precision in the report bundle", () => {
  const input = bingExport();
  const report = buildReportDocuments(fixture(), registry, {
    bingExports: [input],
  });
  const saved = JSON.parse(report["bing-evidence.json"]);
  expect(saved.exports).toEqual([input]);
  expect(saved.receipts[0].rows[0].metrics.opportunityCitations).toEqual({
    kind: "range",
    lower: 100,
    upper: 200,
  });
  expect(report["report.html"]).toContain("Metric cells (not citation totals)");
  expect(report["report.html"]).toContain("fixture reviewer");
  expect(report["report.html"]).toContain('href="bing-evidence.json"');
  expect(report["report.html"]).not.toContain("<script>Bing");
  expect(report["coverage.json"]).toBe(
    buildReportDocuments(fixture(), registry)["coverage.json"],
  );
  input.sourceHash = "0".repeat(64);
  expect(() =>
    buildReportDocuments(fixture(), registry, { bingExports: [input] }),
  ).toThrow(/hash/i);
});

it("reports rejected log lines and unverified identity without converting them to audit failures", () => {
  const input = serverLogExport();
  const result = buildReportDocuments(fixture(), registry, {
    serverLogExports: [input],
  });
  const saved = JSON.parse(result["server-log-evidence.json"]);
  expect(saved.exports).toEqual([input]);
  expect(saved.receipts[0].acceptedLines).toBe(1);
  expect(saved.receipts[0].rejectedLines).toBe(1);
  expect(saved.receipts[0].rows[0].crawlerIdentity).toBe("unverified");
  expect(result["report.html"]).toContain("No — unresolved input");
  expect(result["report.html"]).toContain("server-log-row");
  expect(result["report.html"]).not.toContain("<script>log");
  expect(result["coverage.json"]).toBe(
    buildReportDocuments(fixture(), registry)["coverage.json"],
  );
});

it("preserves explicit reviewer action decisions across formats and labels legacy defaults", () => {
  for (const action of ["keep", "update", "consolidate", "investigate"]) {
    const audit = fixture();
    Object.assign(audit.findings[0], {
      action,
      actionReason: "Reviewer rationale for this content",
    });
    const docs = buildReportDocuments(audit, registry);
    for (const file of ["report.md", "report.html", "content-actions.csv"]) {
      expect(docs[file]).toContain(action);
      expect(docs[file].replaceAll("\\", "")).toContain("reviewer-proposal");
      expect(docs[file]).toContain("Reviewer rationale for this content");
    }
    expect(docs["content-actions.csv"]).toContain(
      `"${action}","reviewer-proposal"`,
    );
  }
  const legacy = buildReportDocuments(fixture(), registry);
  expect(legacy["content-actions.csv"]).toContain('"update","default-triage"');
  for (const extra of [
    { action: "delete", actionReason: "Not supported" },
    { action: "keep" },
    { actionReason: "Orphan reason" },
    { action: "consolidate", actionReason: " " },
  ]) {
    const audit = fixture();
    Object.assign(audit.findings[0], extra);
    expect(() => buildReportDocuments(audit, registry)).toThrow(/action/i);
  }
});

it("keeps the same action condition on recommendation and verification in every format", () => {
  const audit = fixture();
  Object.assign(audit.findings[0], {
    actionCondition: "the owner confirms the comment is unintended",
    remediation: "Remove the comment",
    verification: "Confirm the comment is absent",
  });
  const docs = buildReportDocuments(audit, registry);
  for (const file of ["report.md", "report.html", "content-actions.csv"]) {
    const text = docs[file].replaceAll("\\", "");
    expect(text).toContain(
      "Only if the owner confirms the comment is unintended: Remove the comment",
    );
    expect(text).toContain(
      "Only if the owner confirms the comment is unintended: Confirm the comment is absent",
    );
  }
  for (const actionCondition of ["", "  ", null, false, {}]) {
    Object.assign(audit.findings[0], { actionCondition });
    expect(() => buildReportDocuments(audit, registry)).toThrow(/condition/i);
  }
});
