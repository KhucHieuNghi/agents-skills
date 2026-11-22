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
import { networkFixture } from "./helpers/content-audit-network.js";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import { reviewAudit } from "../skills/content-search-audit/scripts/lib/review.mjs";
import {
  loadAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
const dirs: string[] = [];

it("requires a visible answer and a separate entity source for public AEO and AIO failures", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-public-verdict-"));
  dirs.push(root);
  const url = "https://example.com/offer";
  const otherUrl = "https://example.com/other";
  const otherText = "A different page says the price is USD 59.";
  const visible = "The price is USD 29.";
  const raw = visible + '\n\n```json\n{"price":"19"}\n```\n';
  const run = await startAudit(
    {
      inputs: [
        { uri: url, source: "fixture" },
        { uri: otherUrl, source: "fixture" },
      ],
      network: { allowedOrigins: ["https://example.com"], retries: 0 },
      inventoryComplete: true,
      localRoots: [],
    },
    path.join(root, "public"),
    {
      network: networkFixture({
        "https://example.com/robots.txt": { status: 404 },
        [url]: { body: raw },
        [otherUrl]: { body: otherText },
      }).adapters,
    },
  );
  const audit = await loadAuditData(run.directory);
  function snapshot(uri: string) {
    const itemId = audit.inventory.find((item) => item.uri === uri).itemId;
    return audit.evidence.find(
      (e) => e.kind === "content" && e.itemId === itemId,
    );
  }
  const content = snapshot(url);
  const otherContent = snapshot(otherUrl);
  const artifacts: Record<string, string> = {};
  const evidence = [];
  const at = new Date().toISOString();
  function add(
    id: string,
    kind: string,
    value: string,
    locator: string,
    sourceEvidenceIds: string[],
  ) {
    const artifact = `evidence/${id}.txt`;
    artifacts[artifact] = value;
    evidence.push({
      ...content,
      evidenceId: id,
      artifact,
      kind,
      value,
      locator,
      method: "Synthetic test fixture",
      snapshotHash: createHash("sha256").update(value).digest("hex"),
      encoding: "utf8",
      sourceEvidenceIds,
      collectedAt: at,
    });
    return id;
  }
  const text = add("page-visible", "extracted-text", visible, url, [
    content.evidenceId,
  ]);
  const answer = add("answer", "visible-answer", visible, url, [text]);
  const fakeAnswer = add("schema-only", "visible-answer", '"price":"19"', url, [
    text,
  ]);
  const mixed = add(
    "mixed",
    "extracted-text",
    visible + "\n" + otherText,
    url,
    [content.evidenceId, otherContent.evidenceId],
  );
  const otherAnswer = add("foreign-answer", "visible-answer", otherText, url, [
    mixed,
  ]);
  const claims = add(
    "approved-price",
    "claim-sources",
    "Approved price USD 19.",
    "https://example.com/policy",
    [],
  );
  const same = add(
    "same-source-entity",
    "entity-record",
    "Schema price is 19.",
    url,
    [content.evidenceId],
  );
  const authority = add(
    "separate-entity",
    "entity-record",
    "Current public policy confirms USD 19.",
    "https://example.com/policy",
    [],
  );
  const itemId = content.itemId;
  async function submit(
    ruleId: string,
    dimension: string,
    ids: string[],
    name: string,
    recordFailure = true,
  ) {
    const evidenceIds = [content.evidenceId, ...ids];
    return reviewAudit(
      run.directory,
      {
        artifacts,
        evidence,
        reviews: recordFailure
          ? [
              {
                itemId,
                ruleId,
                evidenceIds,
                reason: "Fixture price conflicts with the policy.",
                status: "fail",
                reviewer: "fixture reviewer",
                reviewedAt: at,
              },
            ]
          : [],
        findings: [
          {
            findingId: "price-conflict",
            title: recordFailure
              ? "The visible price conflicts with the policy"
              : "The schema price and visible price differ",
            affectedItemIds: [itemId],
            ruleIds: [ruleId],
            dimensions: [dimension],
            evidenceIds,
            severity: "high",
            confidence: "high",
            classification: "observed",
            remediation: "Reconcile the price with the policy.",
            verification:
              "Compare both captures for the same market and period.",
            ownerRole: "Pricing owner",
            effort: "small",
          },
        ],
      },
      path.join(root, name),
    );
  }

  await expect(
    submit("aeo-answer-evidence", "aeo", [claims], "missing-answer"),
  ).rejects.toThrow(/visible-answer/);
  await expect(
    submit("aeo-answer-evidence", "aeo", [claims, fakeAnswer], "schema-answer"),
  ).rejects.toThrow(/visible-answer/);
  await expect(
    submit("aeo-answer-evidence", "aeo", [claims, otherAnswer], "other-page"),
  ).rejects.toThrow(/single-page extraction/);
  await expect(
    submit("aio-entity-consistency", "aio", [same], "same-entity"),
  ).rejects.toThrow(/separate public entity source/);

  const narrow = await submit(
    "seo-structured-data",
    "seo",
    [],
    "narrow",
    false,
  );
  const savedNarrow = await loadAuditData(narrow.directory);
  expect(savedNarrow.findings).toHaveLength(1);
  expect(savedNarrow.findings[0].dimensions).toEqual(["seo"]);
  for (const ruleId of ["aio-entity-consistency", "aeo-answer-evidence"]) {
    expect(
      savedNarrow.checks.find(
        (check) => check.itemId === itemId && check.ruleId === ruleId,
      ).status,
    ).toBe("unknown");
  }

  const resolvedAeo = await submit(
    "aeo-answer-evidence",
    "aeo",
    [claims, answer],
    "visible-answer",
  );
  const resolvedAio = await submit(
    "aio-entity-consistency",
    "aio",
    [authority],
    "distinct-entity",
  );
  for (const [result, rule] of [
    [resolvedAeo, "aeo-answer-evidence"],
    [resolvedAio, "aio-entity-consistency"],
  ] as const) {
    const saved = await loadAuditData(result.directory);
    expect(
      saved.checks.find(
        (check) => check.itemId === itemId && check.ruleId === rule,
      ).status,
    ).toBe("fail");
    expect((await validateAudit(result.directory)).valid).toBe(true);
  }
});
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

it("persists a supported narrow finding without manufacturing a resolved broader check", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-narrow-finding-"));
  dirs.push(root);
  const contentRoot = path.join(root, "content");
  await mkdir(contentRoot);
  const page = path.join(contentRoot, "policy.md");
  await writeFile(
    page,
    "# Basic plan\nThe current Basic plan includes 100 units monthly.\nThe same current Basic plan includes 200 units monthly.\nThe authoritative entitlement is unavailable.\n",
  );
  const run = await startAudit(
    {
      inputs: [{ path: page, source: "fixture" }],
      localRoots: [contentRoot],
      inventoryComplete: true,
    },
    path.join(root, "run"),
  );
  const original = await loadAuditData(run.directory);
  const itemId = original.inventory[0].itemId;
  const content = original.evidence.find((e) => e.kind === "content");
  const finding = {
    findingId: "quota-conflict",
    title: "Same plan has two current quota claims",
    affectedItemIds: [itemId],
    ruleIds: ["quality-claims"],
    dimensions: ["quality"],
    evidenceIds: [content.evidenceId],
    severity: "high",
    confidence: "high",
    classification: "observed",
    remediation:
      "Obtain the authoritative entitlement before correcting the conflicting claims.",
    verification:
      "Compare both statements with the same approved plan and period.",
    ownerRole: "Product policy owner",
    effort: "small",
  };
  const wrongDimension = path.join(root, "wrong-dimension");
  await expect(
    reviewAudit(
      run.directory,
      {
        reviews: [],
        findings: [{ ...finding, dimensions: ["quality", "aio"] }],
      },
      wrongDimension,
    ),
  ).rejects.toThrow(/dimensions allowed by its cited rules: quality/);
  await expect(access(wrongDimension)).rejects.toThrow();
  const result = await reviewAudit(
    run.directory,
    { reviews: [], findings: [finding] },
    path.join(root, "reviewed"),
  );
  const data = await loadAuditData(result.directory);
  expect(data.findings).toEqual([finding]);
  expect(data.checks.find((c) => c.ruleId === "quality-claims").status).toBe(
    "unknown",
  );
  expect((await validateAudit(result.directory)).completionAllowed).toBe(false);
  for (const name of ["report.md", "report.html", "content-actions.csv"]) {
    expect(await readFile(path.join(result.directory, name), "utf8")).toContain(
      finding.title,
    );
  }
  expect((await loadAuditData(run.directory)).findings).toEqual(
    original.findings,
  );
});

it("refreshes missing-evidence reasons without resolving semantic checks or overwriting explicit review", async () => {
  const { root, run, audit, review } = await setup();
  const value = "Audience needs the documented product overview.";
  const evidence = {
    ...audit.evidence[0],
    evidenceId: "new-audience",
    kind: "audience-context",
    artifact: "evidence/new-audience.txt",
    value,
    byteLength: Buffer.byteLength(value),
    snapshotHash: createHash("sha256").update(value).digest("hex"),
    sourceEvidenceIds: [audit.evidence[0].evidenceId],
  };
  const bundle = {
    reviews: [],
    evidence: [evidence],
    artifacts: { [evidence.artifact]: value },
  };
  const before = await readFile(path.join(run.directory, "checks.jsonl"));
  const refreshed = await reviewAudit(
    run.directory,
    bundle,
    path.join(root, "evidence-only"),
  );
  const data = await loadAuditData(refreshed.directory);
  for (const ruleId of ["quality-task-fit", "aio-retrievable-facts"]) {
    const check = data.checks.find((c) => c.ruleId === ruleId);
    expect(check.status).toBe("unknown");
    expect(check.reason).toBe(
      "Semantic review and applicability assessment required",
    );
    expect(check.evidenceIds).toContain(evidence.evidenceId);
    expect(check.reviewer).toBeUndefined();
  }
  expect(data.inventory[0].state).toBe("pending");
  expect(await readFile(path.join(run.directory, "checks.jsonl"))).toEqual(
    before,
  );
  const assessment = {
    ...review,
    ruleId: "quality-task-fit",
    status: "unknown",
    reason:
      "Reviewer must reconcile the intended audience before judging task fit",
  };
  const explicit = await reviewAudit(
    run.directory,
    { reviews: [assessment] },
    path.join(root, "explicit"),
  );
  const explicitBefore = (await loadAuditData(explicit.directory)).checks.find(
    (c) => c.ruleId === assessment.ruleId,
  );
  const kept = await reviewAudit(
    explicit.directory,
    bundle,
    path.join(root, "explicit-new-evidence"),
  );
  expect(
    (await loadAuditData(kept.directory)).checks.find(
      (c) => c.ruleId === assessment.ruleId,
    ),
  ).toEqual(explicitBefore);
});
