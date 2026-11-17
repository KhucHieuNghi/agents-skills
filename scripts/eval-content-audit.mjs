import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function unique(values, label) {
  requireCondition(
    Array.isArray(values) && values.every(nonempty),
    `Invalid ${label}`,
  );
  requireCondition(
    new Set(values).size === values.length,
    `Duplicate ${label}`,
  );
  return new Set(values);
}
/** Aggregates explicit adjudications; it neither judges truth nor approves releases. */
export function evaluateTrial(trial, responseText) {
  requireCondition(
    trial?.schemaVersion === 1,
    "Unsupported adjudication schema",
  );
  for (const key of ["trialId", "cohortId"])
    requireCondition(nonempty(trial[key]), `Missing ${key}`);
  requireCondition(
    ["codex", "claude-code"].includes(trial.host),
    "Unsupported host",
  );
  requireCondition(
    /^[a-f0-9]{64}$/.test(trial.componentDigest),
    "Invalid component digest",
  );
  requireCondition(nonempty(trial.response?.path), "Missing response path");
  requireCondition(
    createHash("sha256").update(responseText).digest("hex") ===
      trial.response.sha256,
    "Response hash mismatch",
  );
  requireCondition(
    nonempty(trial.reviewer?.name) &&
      ["primary-agent", "human"].includes(trial.reviewer.kind),
    "Explicit reviewer identity and kind required",
  );
  for (const key of [
    "findingsComplete",
    "reportingReviewComplete",
    "instructionReviewComplete",
  ])
    requireCondition(typeof trial[key] === "boolean", `Missing ${key}`);
  for (const key of [
    "goldUnits",
    "findings",
    "reportingErrors",
    "criticalChecks",
    "fabricatedMetrics",
    "instructionFailures",
  ])
    requireCondition(Array.isArray(trial[key]), `Missing ${key}`);
  const gold = unique(
    trial.goldUnits.map((unit) => unit.id),
    "gold IDs",
  );
  trial.goldUnits.forEach((unit) =>
    requireCondition(
      typeof unit.critical === "boolean",
      "Gold critical status required",
    ),
  );
  unique(
    trial.findings.map((finding) => finding.id),
    "finding IDs",
  );
  const required = unique(trial.requiredCases, "required cases");
  const accounted = unique(trial.accountedCases, "accounted cases");
  requireCondition(
    [...accounted].every((id) => required.has(id)),
    "Unknown accounted case",
  );
  function quote(record) {
    requireCondition(
      nonempty(record.quote) && responseText.includes(record.quote),
      "Adjudication quote is absent from bound response",
    );
    requireCondition(
      nonempty(record.rationale),
      "Adjudication rationale required",
    );
  }
  const matched = new Set();
  for (const finding of trial.findings) {
    requireCondition(
      ["supported", "unsupported", "unjudged"].includes(finding.verdict),
      "Invalid finding verdict",
    );
    quote(finding);
    requireCondition(
      Array.isArray(finding.sourceRefs) &&
        finding.sourceRefs.length > 0 &&
        finding.sourceRefs.every(nonempty),
      "Finding source references required",
    );
    if (finding.goldId !== undefined) {
      requireCondition(
        gold.has(finding.goldId) && finding.verdict === "supported",
        "Gold credit requires a supported known gold ID",
      );
      requireCondition(
        !matched.has(finding.goldId),
        "Gold credit duplicate; consolidate repeated findings before adjudication",
      );
      matched.add(finding.goldId);
    }
  }
  for (const record of [...trial.reportingErrors, ...trial.fabricatedMetrics])
    quote(record);
  for (const failure of trial.instructionFailures)
    requireCondition(
      nonempty(failure.traceRef) && nonempty(failure.rationale),
      "Instruction failure requires trace evidence",
    );
  unique(
    trial.criticalChecks.map((check) => check.id),
    "critical check IDs",
  );
  for (const check of trial.criticalChecks)
    requireCondition(
      ["pass", "fail", "unjudged"].includes(check.verdict) &&
        nonempty(check.rationale),
      "Invalid critical check adjudication",
    );
  const supported = trial.findings.filter(
    (f) => f.verdict === "supported",
  ).length;
  const unsupported = trial.findings.filter(
    (f) => f.verdict === "unsupported",
  ).length;
  const unjudged = trial.findings.filter(
    (f) => f.verdict === "unjudged",
  ).length;
  const precision =
    trial.findingsComplete && !unjudged && supported + unsupported > 0
      ? supported / (supported + unsupported)
      : null;
  const recall =
    trial.findingsComplete && !unjudged && gold.size
      ? matched.size / gold.size
      : null;
  const unmatchedGoldIds = [...gold].filter((id) => !matched.has(id));
  const missedGoldIds =
    trial.findingsComplete && !unjudged ? unmatchedGoldIds : null;
  const missingCases = [...required].filter((id) => !accounted.has(id));
  const gates = {
    precision: precision !== null && precision >= 0.9,
    recall: recall !== null && recall >= 0.8,
    criticalGold: trial.goldUnits
      .filter((unit) => unit.critical)
      .every((unit) => matched.has(unit.id)),
    criticalChecks:
      trial.criticalChecks.length > 0 &&
      trial.criticalChecks.every((check) => check.verdict === "pass"),
    accounting: required.size > 0 && missingCases.length === 0,
    reporting:
      trial.reportingReviewComplete && trial.reportingErrors.length === 0,
    noFabricatedMetrics:
      trial.reportingReviewComplete && trial.fabricatedMetrics.length === 0,
    noInstructionFailures:
      trial.instructionReviewComplete && trial.instructionFailures.length === 0,
  };
  return {
    schemaVersion: 1,
    trialId: trial.trialId,
    cohortId: trial.cohortId,
    host: trial.host,
    componentDigest: trial.componentDigest,
    responseSha256: trial.response.sha256,
    reviewer: trial.reviewer,
    findingsComplete: trial.findingsComplete,
    counts: {
      supported,
      unsupported,
      unjudged,
      matchedGold: matched.size,
      gold: gold.size,
      reportingErrors: trial.reportingErrors.length,
    },
    precision,
    recall,
    missedGoldIds,
    unmatchedGoldIds,
    missingCases,
    gates,
    thresholdsMet: Object.values(gates).every(Boolean),
    releaseAccepted: false,
    limitation:
      "Scores aggregate supplied adjudications, not independently verified truth. No pooling across hosts, cohorts or repeated trials; release acceptance requires the remaining product gates and independent review.",
  };
}

export async function evaluateFile(input) {
  const absolute = path.resolve(input);
  const adjudicationText = await readFile(absolute, "utf8");
  const trial = JSON.parse(adjudicationText);
  const response = await readFile(
    path.resolve(path.dirname(absolute), trial.response.path),
    "utf8",
  );
  return {
    ...evaluateTrial(trial, response),
    adjudicationSha256: createHash("sha256")
      .update(adjudicationText)
      .digest("hex"),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    requireCondition(
      process.argv.length === 4,
      "Usage: node scripts/eval-content-audit.mjs adjudication.json NEW-result.json",
    );
    const result = await evaluateFile(process.argv[2]);
    await writeFile(process.argv[3], JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    process.stdout.write(
      JSON.stringify({
        trialId: result.trialId,
        thresholdsMet: result.thresholdsMet,
        releaseAccepted: false,
      }) + "\n",
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
