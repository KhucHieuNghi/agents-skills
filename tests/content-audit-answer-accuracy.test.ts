import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { loadAuditData } from "../skills/content-search-audit/scripts/lib/validate.mjs";
import { buildReportDocuments } from "../skills/content-search-audit/scripts/lib/report.mjs";
import { startCampaign } from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { reviewCampaign } from "../skills/content-search-audit/scripts/lib/campaign-review.mjs";
import { renderCampaignReport } from "../skills/content-search-audit/scripts/lib/campaign-report.mjs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { importMeasurements } from "../skills/content-search-audit/scripts/lib/measurements.mjs";
import { prepareMeasurementReport } from "../skills/content-search-audit/scripts/lib/measurement-report.mjs";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function fixture() {
  const now = new Date().toISOString();
  const response = "Basic has 3 seats. Export is free.";
  const source = "Basic has 3 seats. Export costs USD 5.";
  const evidence = {
    artifact: "policy",
    sha256: hash(source),
    locator: "approved-policy.txt",
    capturedAt: now,
    quote: source,
  };
  const observation = {
    observationId: "one",
    engine: "fixture",
    surface: "api",
    model: "unknown",
    searchMode: "enabled",
    locale: "vi-VN",
    market: "VN",
    cohortId: "core",
    cohortVersion: "1",
    promptId: "p",
    prompt: "What is included?",
    capturedAt: now,
    repetition: 1,
    status: "captured",
    responseArtifact: "answer",
    responseHash: hash(response),
    annotationMethod: "supplied human review",
    brandMentioned: null,
    citations: null,
    accuracyReview: {
      reviewer: "fixture reviewer",
      reviewedAt: now,
      claimsComplete: true,
      claims: [
        {
          claimId: "seats",
          quote: "Basic has 3 seats.",
          verdict: "correct",
          reason: "Matches approved policy",
          sources: [evidence],
        },
        {
          claimId: "export",
          quote: "Export is free.",
          verdict: "incorrect",
          reason: "Policy specifies a fee",
          sources: [evidence],
        },
      ],
    },
  };
  return {
    observation,
    metadata: {
      brand: "Example",
      brandHosts: ["example.com"],
      synthetic: true,
      artifacts: { answer: response, policy: source },
    },
  };
}
it("separates claim accuracy from fully reviewed response accuracy", () => {
  const { observation, metadata } = fixture();
  const a = importMeasurements([observation], metadata).groups[0].accuracy;
  expect(a.claims).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
  expect(a.responses).toEqual({ numerator: 0, denominator: 1, rate: 0 });
});
it("retains absent, empty, incomplete and unknown reviews without perfect scores", () => {
  const { observation, metadata } = fixture();
  const absent = { ...observation, accuracyReview: null };
  const empty = {
    ...observation,
    observationId: "empty",
    accuracyReview: { ...observation.accuracyReview, claims: [] },
  };
  const partial = {
    ...observation,
    observationId: "partial",
    accuracyReview: { ...observation.accuracyReview, claimsComplete: false },
  };
  const unknown = {
    ...observation,
    observationId: "unknown",
    accuracyReview: {
      ...observation.accuracyReview,
      claims: [
        {
          ...observation.accuracyReview.claims[0],
          verdict: "unknown",
          sources: [],
        },
      ],
    },
  };
  const a = importMeasurements([absent, empty, partial, unknown], metadata)
    .groups[0].accuracy;
  expect(a.responses.rate).toBeNull();
  expect(a.unreviewedResponses).toBe(1);
  expect(a.emptyInventories).toBe(1);
  expect(a.incompleteInventories).toBe(1);
  expect(a.unknownClaims).toBe(1);
  expect(a.claims.rate).toBe(0.5);
});
it("rejects modified source bytes, invented quotations, missing support and duplicate claim IDs", () => {
  const { observation, metadata } = fixture();
  expect(() =>
    importMeasurements([observation], {
      ...metadata,
      artifacts: { ...metadata.artifacts, policy: "changed" },
    }),
  ).toThrow(/source.*hash/i);
  for (const patch of [
    { quote: "Invented sentence" },
    { sources: [] },
    { claimId: "export" },
  ]) {
    const o = structuredClone(observation);
    Object.assign(o.accuracyReview.claims[0], patch);
    expect(() => importMeasurements([o], metadata)).toThrow();
  }
  const bad = structuredClone(observation);
  bad.accuracyReview.claims[0].sources[0].quote = "invented source quote";
  expect(() => importMeasurements([bad], metadata)).toThrow(/source.*quote/i);
});
it("rejects review data on capture errors and future or pre-capture reviews", () => {
  const { observation, metadata } = fixture();
  expect(() =>
    importMeasurements(
      [
        {
          ...observation,
          status: "error",
          errorReason: "timeout",
          responseArtifact: undefined,
          responseHash: undefined,
        },
      ],
      metadata,
    ),
  ).toThrow(/error/i);
  for (const reviewedAt of ["2099-01-01T00:00:00Z", "2000-01-01T00:00:00Z"]) {
    expect(() =>
      importMeasurements(
        [
          {
            ...observation,
            accuracyReview: { ...observation.accuracyReview, reviewedAt },
          },
        ],
        metadata,
      ),
    ).toThrow();
  }
});
it("keeps accuracy segments separate and deduplicates repeated observation imports", () => {
  const { observation, metadata } = fixture();
  const result = importMeasurements(
    [
      observation,
      observation,
      { ...observation, observationId: "ui", surface: "consumer-ui" },
    ],
    metadata,
  );
  expect(result.groups).toHaveLength(2);
  expect(result.groups.every((g) => g.accuracy.claims.denominator === 2)).toBe(
    true,
  );
});
it("persists exact response/source bytes and computed accuracy in the shared report bundle", () => {
  const { observation, metadata } = fixture();
  const report = prepareMeasurementReport({
    measurements: { observations: [observation], metadata },
  });
  const bundle = JSON.parse(report.documents["ai-observation-evidence.json"]);
  expect(bundle.input.metadata.artifacts).toEqual(metadata.artifacts);
  expect(bundle.receipt.groups[0].accuracy.claims.rate).toBe(0.5);
  expect(JSON.stringify(report.sections)).toContain("1/2 (50.0%)");
  expect(JSON.stringify(report.sections)).toContain("0/1 (0.0%)");
  const ages = report.sections.find(
    (s) => s.title === "Measurement source ages",
  );
  expect(ages.rows.map((row) => row[2])).toEqual([
    "Response captured",
    "Accuracy review",
    "Claim source captured",
    "Claim source captured",
  ]);
  expect(ages.rows.every((row) => row[4] === "0 full elapsed days")).toBe(true);
});

it("exports deduplicated JSONL with explicit synthetic context and no invented observations", () => {
  const { observation, metadata } = fixture();
  const report = prepareMeasurementReport({
    measurements: { observations: [observation, observation], metadata },
  });
  const rows = report.documents["ai-observations.jsonl"]
    .trim()
    .split("\n")
    .map(JSON.parse);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toEqual({
    ...observation,
    synthetic: true,
    evidenceBundle: "ai-observation-evidence.json",
    evidenceBundleSha256: hash(
      report.documents["ai-observation-evidence.json"],
    ),
  });
  expect(
    JSON.parse(report.documents["ai-observation-evidence.json"]).input
      .observations,
  ).toHaveLength(2);
  expect(
    prepareMeasurementReport({}).documents["ai-observations.jsonl"],
  ).toBeUndefined();
  expect(
    prepareMeasurementReport({ measurements: { observations: [], metadata } })
      .documents["ai-observations.jsonl"],
  ).toBe("");
});

it("validates optional review schema while rejecting unsupported verdicts and error-branch reviews", async () => {
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(
    JSON.parse(
      await readFile(
        "skills/content-search-audit/schemas/common.schema.json",
        "utf8",
      ),
    ),
  );
  const validate = ajv.compile(
    JSON.parse(
      await readFile(
        "skills/content-search-audit/schemas/ai-observation.schema.json",
        "utf8",
      ),
    ),
  );
  const { observation, metadata } = fixture();
  expect(validate(observation), JSON.stringify(validate.errors)).toBe(true);
  const exported = prepareMeasurementReport({
    measurements: { observations: [observation], metadata },
  });
  expect(
    validate(JSON.parse(exported.documents["ai-observations.jsonl"].trim())),
  ).toBe(true);
  expect(validate({ ...observation, synthetic: "yes" })).toBe(false);
  expect(
    validate({ ...observation, evidenceBundleSha256: "not-a-digest" }),
  ).toBe(false);
  expect(validate({ ...observation, accuracyReview: undefined })).toBe(true);
  const bad = structuredClone(observation);
  bad.accuracyReview.claims[0].sources = [];
  expect(validate(bad)).toBe(false);
  expect(
    validate({
      ...observation,
      status: "error",
      errorReason: "timeout",
      responseArtifact: undefined,
      responseHash: undefined,
    }),
  ).toBe(false);
});
it("renders matching accuracy and bound evidence in standalone and campaign reports, rejecting bad data before output", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "accuracy-report-"));
  try {
    const content = path.join(root, "content");
    await mkdir(content);
    const file = path.join(content, "page.md");
    await writeFile(file, "# Customer content");
    const config = {
      inputs: [{ path: file, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
    };
    const run = await startAudit(config, path.join(root, "run"));
    const { observation, metadata } = fixture();
    const options = { measurements: { observations: [observation], metadata } };
    const registry = JSON.parse(
      await readFile("skills/content-search-audit/rules/core.json", "utf8"),
    );
    const standalone = buildReportDocuments(
      await loadAuditData(run.directory),
      registry,
      options,
    );
    expect(standalone["report.html"]).toContain("1/2 (50.0%)");
    expect(standalone["report.md"].replaceAll("\\", "")).toContain(
      "0/1 (0.0%)",
    );
    const campaign = await startCampaign(config, path.join(root, "campaign"));
    const bytes = await readFile(
      path.join(campaign.directory, "campaign.json"),
    );
    const manifest = JSON.parse(bytes.toString());
    const hashes = {};
    for (const part of manifest.parts)
      hashes[part.path] = hash(
        JSON.stringify(
          await loadAuditData(path.join(campaign.directory, part.path)),
        ),
      );
    const review = await reviewCampaign(
      campaign.directory,
      {
        schemaVersion: 1,
        campaignId: manifest.campaignId,
        sourceManifestHash: hash(bytes.toString()),
        partSnapshotHashes: hashes,
        reviews: [],
        contextEvidence: [],
        findings: [],
        reviewer: "fixture",
        reviewedAt: new Date().toISOString(),
      },
      path.join(root, "review"),
    );
    const output = path.join(root, "report");
    await renderCampaignReport(
      campaign.directory,
      review.directory,
      output,
      options,
    );
    expect(await readFile(path.join(output, "report.html"), "utf8")).toContain(
      "1/2 (50.0%)",
    );
    expect(
      await readFile(path.join(output, "ai-observation-evidence.json"), "utf8"),
    ).toBe(standalone["ai-observation-evidence.json"]);
    expect(
      await readFile(path.join(output, "ai-observations.jsonl"), "utf8"),
    ).toBe(standalone["ai-observations.jsonl"]);
    const reportManifest = JSON.parse(
      await readFile(path.join(output, "report-manifest.json"), "utf8"),
    );
    expect(reportManifest.files["ai-observations.jsonl"]).toBe(
      hash(standalone["ai-observations.jsonl"]),
    );
    expect(reportManifest.files["ai-observation-evidence.json"]).toBe(
      hash(standalone["ai-observation-evidence.json"]),
    );
    const optionsFile = path.join(root, "options.json");
    await writeFile(optionsFile, JSON.stringify(options));
    const cliOutput = path.join(root, "cli-report");
    const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
    execFileSync(process.execPath, [
      cli,
      "campaign-report",
      campaign.directory,
      review.directory,
      cliOutput,
      optionsFile,
    ]);
    expect(
      await readFile(
        path.join(cliOutput, "ai-observation-evidence.json"),
        "utf8",
      ),
    ).toBe(standalone["ai-observation-evidence.json"]);
    await writeFile(optionsFile, JSON.stringify({ ...options, registry: {} }));
    expect(() =>
      execFileSync(
        process.execPath,
        [
          cli,
          "campaign-report",
          campaign.directory,
          review.directory,
          path.join(root, "cli-rejected"),
          optionsFile,
        ],
        { stdio: "pipe" },
      ),
    ).toThrow();
    await expect(access(path.join(root, "cli-rejected"))).rejects.toThrow();
    observation.accuracyReview.claims[0].quote = "not in response";
    const rejected = path.join(root, "rejected");
    await expect(
      renderCampaignReport(
        campaign.directory,
        review.directory,
        rejected,
        options,
      ),
    ).rejects.toThrow(/quote/);
    await expect(access(rejected)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
