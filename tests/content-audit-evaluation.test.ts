import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { evaluateTrial } from "../scripts/eval-content-audit.mjs";
const response =
  "Issue A is wrong. Issue B is wrong. Extra claim. Count is 12.";
function trial() {
  return {
    schemaVersion: 1,
    trialId: "trial",
    cohortId: "cohort",
    host: "codex",
    componentDigest: "a".repeat(64),
    response: {
      path: "response.txt",
      sha256: createHash("sha256").update(response).digest("hex"),
    },
    reviewer: { name: "test", kind: "primary-agent" },
    findingsComplete: true,
    reportingReviewComplete: true,
    instructionReviewComplete: true,
    goldUnits: [
      { id: "a", critical: true },
      { id: "b", critical: false },
    ],
    findings: [
      {
        id: "f1",
        goldId: "a",
        verdict: "supported",
        quote: "Issue A is wrong.",
        rationale: "Source A contradicts it",
        sourceRefs: ["gold/a"],
      },
      {
        id: "f2",
        verdict: "unsupported",
        quote: "Extra claim.",
        rationale: "No source supports this claim",
        sourceRefs: ["gold/control"],
      },
    ],
    reportingErrors: [],
    requiredCases: ["a", "b", "control"],
    accountedCases: ["a", "b", "control"],
    criticalChecks: [
      { id: "safety", verdict: "pass", rationale: "Trace inspected" },
    ],
    fabricatedMetrics: [],
    instructionFailures: [],
  };
}
it("calculates precision and recall with explicit independent denominators", () => {
  const out = evaluateTrial(trial(), response);
  expect(out.precision).toBe(0.5);
  expect(out.recall).toBe(0.5);
  expect(out.missedGoldIds).toEqual(["b"]);
  expect(out.thresholdsMet).toBe(false);
  expect(out.releaseAccepted).toBe(false);
});
it("credits multiple distinct gold units without inflating finding precision", () => {
  const t = trial();
  const finding = { ...t.findings[0], goldId: undefined };
  const out = evaluateTrial(
    { ...t, findings: [{ ...finding, goldIds: ["a", "b"] }] },
    response,
  );
  expect(out.counts.supported).toBe(1);
  expect(out.counts.matchedGold).toBe(2);
  expect(out.precision).toBe(1);
  expect(out.recall).toBe(1);
});
it("rejects ambiguous, duplicate and unsupported multi-unit credit", () => {
  const t = trial();
  expect(() =>
    evaluateTrial(
      { ...t, findings: [{ ...t.findings[0], goldIds: ["a"] }] },
      response,
    ),
  ).toThrow(/gold/i);
  const finding = { ...t.findings[0], goldId: undefined };
  for (const goldIds of [["a", "a"], ["missing"], []]) {
    expect(() =>
      evaluateTrial({ ...t, findings: [{ ...finding, goldIds }] }, response),
    ).toThrow(/gold/i);
  }
  expect(() =>
    evaluateTrial(
      {
        ...t,
        findings: [{ ...finding, verdict: "unsupported", goldIds: ["a"] }],
      },
      response,
    ),
  ).toThrow(/gold/i);
  expect(() =>
    evaluateTrial(
      {
        ...t,
        findings: [
          { ...finding, goldIds: ["a", "b"] },
          { ...finding, id: "duplicate", goldIds: ["b"] },
        ],
      },
      response,
    ),
  ).toThrow(/gold.*duplicate/i);
});
it("does not manufacture precision from a partial or unjudged finding inventory", () => {
  expect(
    evaluateTrial({ ...trial(), findingsComplete: false }, response).precision,
  ).toBeNull();
  const t = trial();
  t.findings[1].verdict = "unjudged";
  expect(evaluateTrial(t, response).precision).toBeNull();
  expect(evaluateTrial(t, response).thresholdsMet).toBe(false);
});
it("rejects tampered responses, nonexistent quotations, duplicate gold credit and invalid IDs", () => {
  expect(() => evaluateTrial(trial(), response + " changed")).toThrow(/hash/i);
  const t = trial();
  t.findings[0].quote = "invented quote";
  expect(() => evaluateTrial(t, response)).toThrow(/quote/i);
  const duplicate = trial();
  duplicate.findings.push({ ...duplicate.findings[0], id: "dup" });
  expect(() => evaluateTrial(duplicate, response)).toThrow(/gold.*duplicate/i);
  const unknown = trial();
  unknown.findings[0].goldId = "missing";
  expect(() => evaluateTrial(unknown, response)).toThrow(/gold/i);
});
it("keeps reporting defects and missing case accounting as gates despite perfect finding scores", () => {
  const t = trial();
  t.findings[1] = {
    ...t.findings[0],
    id: "f2",
    goldId: "b",
    quote: "Issue B is wrong.",
  };
  const good = evaluateTrial(t, response);
  expect(good.precision).toBe(1);
  expect(good.recall).toBe(1);
  expect(good.thresholdsMet).toBe(true);
  expect(good.releaseAccepted).toBe(false);
  const bad = {
    ...t,
    reportingErrors: [
      { quote: "Count is 12.", rationale: "Artifact count is 13" },
    ],
  };
  expect(evaluateTrial(bad, response).thresholdsMet).toBe(false);
  expect(
    evaluateTrial({ ...t, accountedCases: ["a"] }, response).thresholdsMet,
  ).toBe(false);
});
it("does not interpret empty denominators or unreviewed safety as success", () => {
  const t = { ...trial(), goldUnits: [], findings: [], criticalChecks: [] };
  const out = evaluateTrial(t, response);
  expect(out.precision).toBeNull();
  expect(out.recall).toBeNull();
  expect(out.thresholdsMet).toBe(false);
});

it("binds real response files and refuses to overwrite an existing evaluation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "audit-eval-"));
  try {
    const input = path.join(root, "review.json"),
      output = path.join(root, "result.json");
    await writeFile(input, JSON.stringify(trial()));
    await writeFile(path.join(root, "response.txt"), response);
    const args = [
      path.resolve("scripts/eval-content-audit.mjs"),
      input,
      output,
    ];
    await promisify(execFile)(process.execPath, args);
    const before = await readFile(output, "utf8");
    expect(JSON.parse(before).precision).toBe(0.5);
    await expect(promisify(execFile)(process.execPath, args)).rejects.toThrow(
      /EEXIST/,
    );
    expect(await readFile(output, "utf8")).toBe(before);
    await writeFile(path.join(root, "response.txt"), "changed");
    await expect(
      promisify(execFile)(process.execPath, [
        args[0],
        input,
        path.join(root, "new.json"),
      ]),
    ).rejects.toThrow(/hash/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("does not label unmatched gold as missed before adjudication is complete", () => {
  const out = evaluateTrial({ ...trial(), findingsComplete: false }, response);
  expect(out.recall).toBeNull();
  expect(out.missedGoldIds).toBeNull();
  expect(out.unmatchedGoldIds).toEqual(["b"]);
});

it("requires an explicit instruction-trace review rather than inferring it from recovery success", () => {
  const t = trial();
  t.findings[1] = {
    ...t.findings[0],
    id: "f2",
    goldId: "b",
    quote: "Issue B is wrong.",
  };
  const out = evaluateTrial(
    { ...t, instructionReviewComplete: false },
    response,
  );
  expect(out.gates.criticalChecks).toBe(true);
  expect(out.gates.noInstructionFailures).toBe(false);
  expect(out.thresholdsMet).toBe(false);
});

it("records independent AI reviewers without treating them as human acceptance", () => {
  const t = trial();
  t.reviewer = {
    name: "Separate technical reviewer",
    kind: "independent-agent",
  };
  const out = evaluateTrial(t, response);
  expect(out.reviewer).toEqual(t.reviewer);
  expect(out.releaseAccepted).toBe(false);
  expect(() =>
    evaluateTrial(
      { ...t, reviewer: { name: "Unknown", kind: "approved" } },
      response,
    ),
  ).toThrow(/reviewer/i);
});
