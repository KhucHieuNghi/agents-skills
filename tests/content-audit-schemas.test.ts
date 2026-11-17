import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
import {
  loadAuditData,
  validateAuditData,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
import { importMeasurements } from "../skills/content-search-audit/scripts/lib/measurements.mjs";

const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const schemaRoot = "skills/content-search-audit/schemas";
for (const file of await readdir(schemaRoot)) {
  if (file.endsWith(".schema.json"))
    ajv.addSchema(
      JSON.parse(await readFile(path.join(schemaRoot, file), "utf8")),
    );
}
const validate = (name: string, data: unknown) => {
  const check = ajv.getSchema(`urn:nkskills:content-search-audit:${name}`)!;
  const valid = check(data);
  return { valid, errors: check.errors };
};
const record = async (directory: string, file: string) => {
  const raw = await readFile(path.join(directory, file), "utf8");
  return file.endsWith(".jsonl")
    ? raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : JSON.parse(raw);
};
const archived =
  "docs/research/content-search-audit-trials/offline-012/artifacts";
const files: Record<string, string> = {
  run: "run.json",
  inventory: "inventory.jsonl",
  evidence: "evidence.jsonl",
  check: "checks.jsonl",
  finding: "findings.json",
  coverage: "coverage.json",
};
async function checkRun(directory: string) {
  for (const [schema, file] of Object.entries(files)) {
    const data = await record(directory, file);
    const rows = ["run", "coverage"].includes(schema) ? [data] : data;
    for (const row of rows) {
      const result = validate(schema, row);
      expect(
        result.valid,
        `${directory}/${file}: ${JSON.stringify(result.errors)}`,
      ).toBe(true);
    }
  }
}
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});

it("compiles offline schemas strictly and accepts actual collected/reviewed host artifacts", async () => {
  for (const directory of [
    "codex/offline-collection",
    "codex/offline-review",
    "claude-code/run-1",
    "claude-code/run-2",
  ])
    await checkRun(path.join(archived, directory));
});

it("accepts fresh helper output with unsupported content and unresolved checks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-schema-"));
  temporary.push(root);
  const page = path.join(root, "page.md"),
    pdf = path.join(root, "guide.pdf");
  await writeFile(page, "# A supplied document\nA bounded fixture.\n");
  await writeFile(pdf, "%PDF-synthetic");
  const output = await mkdtemp(path.join(tmpdir(), "audit-schema-output-"));
  temporary.push(output);
  const run = path.join(output, "run");
  await startAudit(
    {
      inputs: [
        { path: page, source: "fixture" },
        { path: pdf, source: "fixture", type: "pdf" },
      ],
      localRoots: [root],
      inventoryComplete: true,
    },
    run,
  );
  await checkRun(run);
});

it("rejects malformed records without coercion or silently filling required fields", async () => {
  const directory = path.join(archived, "codex/offline-review");
  const examples: Record<string, Record<string, unknown>> = {};
  for (const [schema, file] of Object.entries(files)) {
    const data = await record(directory, file);
    examples[schema] = ["run", "coverage"].includes(schema) ? data : data[0];
  }
  const mutations: Array<[string, Record<string, unknown>]> = [
    ["run", { ...examples.run, cursor: -1 }],
    ["run", { ...examples.run, configHash: "not-a-hash" }],
    ["run", { ...examples.run, updatedAt: "2026-02-30T00:00:00Z" }],
    [
      "inventory",
      {
        ...examples.inventory,
        uri: "https://example.com/",
        path: "/also-present",
      },
    ],
    [
      "inventory",
      { ...examples.inventory, state: "unsupported", reason: "  " },
    ],
    ["inventory", { ...examples.inventory, requiredRuleIds: [] }],
    ["evidence", { ...examples.evidence, artifact: "../escape.txt" }],
    ["evidence", { ...examples.evidence, artifact: "evidence/../escape.txt" }],
    ["evidence", { ...examples.evidence, artifact: "evidence//empty.txt" }],
    [
      "evidence",
      { ...examples.evidence, encoding: "utf8", value: { unparsed: true } },
    ],
    ["check", { ...examples.check, status: "pass", evidenceIds: [] }],
    ["check", { ...examples.check, status: "not-applicable" }],
    ["finding", { ...examples.finding, severity: "urgent" }],
    ["finding", { ...examples.finding, evidenceIds: [] }],
    ["coverage", { ...examples.coverage, total: "4" }],
  ];
  for (const [schema, value] of mutations)
    expect(
      validate(schema, value).valid,
      `${schema}: ${JSON.stringify(value)}`,
    ).toBe(false);
  for (const [schema, value] of Object.entries(examples))
    expect(validate(schema, value).valid).toBe(true);
});

it("matches captured/error AI observation branches and preserves unavailable annotations", () => {
  const response = "Synthetic answer";
  const captured = {
    observationId: "one",
    engine: "Fixture",
    surface: "api",
    model: "unknown",
    searchMode: "unknown",
    locale: "vi",
    market: "VN",
    cohortId: "panel",
    cohortVersion: "1",
    promptId: "p1",
    prompt: "What is supplied?",
    capturedAt: "2026-11-16T00:00:00Z",
    repetition: 1,
    status: "captured",
    brandMentioned: null,
    citations: null,
    responseArtifact: "answer",
    responseHash: createHash("sha256").update(response).digest("hex"),
    annotationMethod: "supplied-review",
  };
  const { responseArtifact, responseHash, annotationMethod, ...identity } =
    captured;
  void responseArtifact;
  void responseHash;
  void annotationMethod;
  const error = {
    ...identity,
    observationId: "two",
    status: "error",
    errorReason: "No response captured",
  };
  const metadata = {
    brand: "Fixture",
    brandHosts: ["example.com"],
    synthetic: true,
    artifacts: { answer: response },
  };
  for (const valid of [captured, error]) {
    expect(validate("ai-observation", valid).valid).toBe(true);
    expect(() => importMeasurements([valid], metadata)).not.toThrow();
  }
  for (const invalid of [
    { ...captured, repetition: 0 },
    { ...captured, capturedAt: "yesterday" },
    { ...error, brandMentioned: false },
    { ...error, responseHash: captured.responseHash },
  ]) {
    expect(validate("ai-observation", invalid).valid).toBe(false);
    expect(() => importMeasurements([invalid], metadata)).toThrow();
  }
});

it("does not confuse shape acceptance with artifact integrity or a trustworthy timestamp", async () => {
  const directory = path.join(archived, "codex/offline-review");
  const audit = await loadAuditData(directory);
  const registry = JSON.parse(
    await readFile("skills/content-search-audit/rules/core.json", "utf8"),
  );
  audit.evidence[0].snapshotHash = "0".repeat(64);
  expect(validate("evidence", audit.evidence[0]).valid).toBe(true);
  expect(validateAuditData(audit, registry).valid).toBe(false);
  const future = { ...audit.evidence[0], collectedAt: "2099-01-01T00:00:00Z" };
  expect(validate("evidence", future).valid).toBe(true);
  // Calendar syntax is declarative; actual observation time needs a runtime clock/provenance check.
});
