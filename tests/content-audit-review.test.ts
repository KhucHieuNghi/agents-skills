import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { reviewAudit } from "../skills/content-search-audit/scripts/lib/review.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "audit-review-"));
  dirs.push(root);
  const content = path.join(root, "content");
  await mkdir(content);
  const page = path.join(content, "page.md");
  await writeFile(page, "# Example\nA documented product.");
  const run = await startAudit(
    {
      inputs: [{ path: page, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
    },
    path.join(root, "original"),
  );
  const audit = await loadAuditData(run.directory);
  const review = {
    itemId: audit.inventory[0].itemId,
    ruleId: "seo-response",
    status: "not-applicable",
    evidenceIds: [audit.evidence[0].evidenceId],
    reason:
      "Offline export has no captured HTTP response; assess live deployment separately",
    reviewer: "fixture-reviewer",
    reviewedAt: new Date().toISOString(),
  };
  return { root, content, run, audit, review };
}
it("creates immutable review revisions, preserves unrelated prior assessments and reports partial coverage", async () => {
  const { root, run, audit, review } = await setup();
  const before = await readFile(path.join(run.directory, "checks.jsonl"));
  const revised = await reviewAudit(
    run.directory,
    { reviews: [review] },
    path.join(root, "reviewed"),
  );
  expect(await readFile(path.join(run.directory, "checks.jsonl"))).toEqual(
    before,
  );
  const data = await loadAuditData(revised.directory);
  expect(data.run.parentRunId).toBe(audit.run.runId);
  expect(data.checks.find((c) => c.ruleId === review.ruleId)?.status).toBe(
    "not-applicable",
  );
  expect(revised.status).toBe("partial");
  const next = await reviewAudit(
    revised.directory,
    { reviews: [] },
    path.join(root, "next"),
  );
  expect((await loadAuditData(next.directory)).checks).toEqual(data.checks);
  expect((await validateAudit(next.directory)).valid).toBe(true);
});
it("rejects invalid evidence and unknown items before creating an output", async () => {
  const { root, run, review } = await setup();
  const output = path.join(root, "invalid");
  await expect(
    reviewAudit(
      run.directory,
      { reviews: [{ ...review, evidenceIds: ["missing"] }] },
      output,
    ),
  ).rejects.toThrow(/evidence/i);
  await expect(access(output)).rejects.toThrow();
  await expect(
    reviewAudit(
      run.directory,
      { reviews: [{ ...review, itemId: "missing" }] },
      output,
    ),
  ).rejects.toThrow(/item/i);
});
it("refuses source-root outputs and artifact overwrites", async () => {
  const { root, content, run, audit } = await setup();
  await expect(
    reviewAudit(run.directory, { reviews: [] }, path.join(content, "audit")),
  ).rejects.toThrow(/content root/i);
  await expect(
    reviewAudit(
      run.directory,
      { reviews: [], artifacts: { [audit.evidence[0].artifact]: "changed" } },
      path.join(root, "bad"),
    ),
  ).rejects.toThrow(/artifact/i);
});

it("validates new artifact-backed semantic evidence and requires findings for failures", async () => {
  const { root, run, audit, review } = await setup();
  const value = "Audience needs the documented product overview.";
  const evidence = {
    ...audit.evidence[0],
    evidenceId: "audience-1",
    kind: "audience-context",
    artifact: "evidence/audience.txt",
    value,
    snapshotHash: createHash("sha256").update(value).digest("hex"),
    sourceEvidenceIds: [audit.evidence[0].evidenceId],
  };
  const assessment = {
    ...review,
    ruleId: "quality-task-fit",
    status: "pass",
    reason: "The supplied overview covers the evidenced audience task",
    evidenceIds: [audit.evidence[0].evidenceId, evidence.evidenceId],
  };
  const bundle = {
    reviews: [assessment],
    evidence: [evidence],
    artifacts: { [evidence.artifact]: value },
  };
  const revised = await reviewAudit(
    run.directory,
    bundle,
    path.join(root, "semantic"),
  );
  expect(
    (await loadAuditData(revised.directory)).checks.find(
      (c) => c.ruleId === assessment.ruleId,
    )?.status,
  ).toBe("pass");
  await expect(
    reviewAudit(
      run.directory,
      { ...bundle, reviews: [{ ...assessment, status: "fail" }] },
      path.join(root, "missing-finding"),
    ),
  ).rejects.toThrow(/lacks finding/i);
  await expect(access(path.join(root, "missing-finding"))).rejects.toThrow();
  await expect(
    reviewAudit(
      run.directory,
      { reviews: [] },
      path.join(run.directory, "nested"),
    ),
  ).rejects.toThrow(/source run/i);
});
it("exposes review through the standalone dispatcher", async () => {
  const { root, run, review } = await setup();
  const bundle = path.join(root, "review.json");
  await writeFile(bundle, JSON.stringify({ reviews: [review] }));
  const result = await promisify(execFile)(process.execPath, [
    path.resolve("skills/content-search-audit/scripts/audit.mjs"),
    "review",
    run.directory,
    bundle,
    path.join(root, "cli-review"),
  ]);
  expect(JSON.parse(result.stdout).status).toBe("partial");
});
it("retains distinct raw, supplied DOM and schema snapshots without automatically passing rendering or schema", async () => {
  const { root, content } = await setup();
  const source = '<html><body><div id="app"></div></body></html>';
  const page = path.join(content, "shell.html");
  await writeFile(page, source);
  const run = await startAudit(
    {
      inputs: [{ path: page, source: "fixture" }],
      localRoots: [content],
      inventoryComplete: true,
    },
    path.join(root, "shell"),
  );
  const initial = await loadAuditData(run.directory);
  const raw = initial.evidence.find((record) => record.kind === "content");
  expect(raw.value).toBe(source);
  const dom =
    '<html><body><h1>Example</h1><script type="application/ld+json">{"@type":"Product","name":"Example"}</script></body></html>';
  const schema = {
    source: "supplied-dom",
    jsonLd: [{ "@type": "Product", name: "Example" }],
  };
  const schemaBytes = JSON.stringify(schema);
  const records = [
    {
      ...raw,
      evidenceId: "supplied-dom",
      kind: "rendered-dom",
      method: "supplied-fixture-dom",
      artifact: "evidence/supplied-dom.html",
      value: dom,
      encoding: "utf8",
      snapshotHash: createHash("sha256").update(dom).digest("hex"),
      sourceEvidenceIds: [raw.evidenceId],
      limitations: [
        "Synthetic supplied DOM; no browser executed in this test.",
      ],
    },
    {
      ...raw,
      evidenceId: "supplied-schema",
      kind: "schema-extraction",
      method: "supplied-fixture-extraction",
      artifact: "evidence/supplied-schema.json",
      value: schema,
      encoding: "json",
      snapshotHash: createHash("sha256").update(schemaBytes).digest("hex"),
      sourceEvidenceIds: ["supplied-dom"],
      limitations: [
        "Synthetic extraction; no eligibility or parser-fidelity claim.",
      ],
    },
  ];
  const bundle = {
    reviews: [],
    evidence: records,
    artifacts: {
      "evidence/supplied-dom.html": dom,
      "evidence/supplied-schema.json": schemaBytes,
    },
  };
  const originalChecks = await readFile(
    path.join(run.directory, "checks.jsonl"),
  );
  const revised = await reviewAudit(
    run.directory,
    bundle,
    path.join(root, "captured"),
  );
  const data = await loadAuditData(revised.directory);
  expect(
    data.evidence.find((record) => record.evidenceId === raw.evidenceId),
  ).toEqual(raw);
  for (const record of records) {
    expect(
      data.evidence.find(
        (candidate) => candidate.evidenceId === record.evidenceId,
      ),
    ).toEqual(record);
  }
  for (const ruleId of [
    "seo-rendering",
    "seo-structured-data",
    "seo-index-controls",
  ]) {
    expect(data.checks.find((check) => check.ruleId === ruleId)?.status).toBe(
      "unknown",
    );
  }
  expect(data.findings).toEqual([]);
  expect((await validateAudit(revised.directory)).completionAllowed).toBe(
    false,
  );
  expect(await readFile(path.join(run.directory, "checks.jsonl"))).toEqual(
    originalChecks,
  );
  expect(await readFile(page, "utf8")).toBe(source);
  const tampered = structuredClone(bundle);
  tampered.artifacts["evidence/supplied-dom.html"] = "Changed DOM";
  const rejected = path.join(root, "tampered-capture");
  await expect(reviewAudit(run.directory, tampered, rejected)).rejects.toThrow(
    /hash|value/i,
  );
  await expect(access(rejected)).rejects.toThrow();
});

it("rejects future review timestamps before creating output while retaining historical source bytes", async () => {
  const { root, run, review } = await setup();
  const before = await readFile(path.join(run.directory, "run.json"));
  const output = path.join(root, "future");
  await expect(
    reviewAudit(
      run.directory,
      { reviews: [{ ...review, reviewedAt: "2099-01-01T00:00:00Z" }] },
      output,
    ),
  ).rejects.toThrow(/Future reviewedAt/);
  await expect(access(output)).rejects.toThrow();
  expect(await readFile(path.join(run.directory, "run.json"))).toEqual(before);
  const accepted = await reviewAudit(
    run.directory,
    { reviews: [{ ...review, reviewedAt: "2024-01-01T00:00:00Z" }] },
    path.join(root, "historical"),
  );
  const state = JSON.parse(
    await readFile(path.join(accepted.directory, "run.json"), "utf8"),
  );
  expect(Number.isFinite(Date.parse(state.reviewAcceptedAt))).toBe(true);
});
