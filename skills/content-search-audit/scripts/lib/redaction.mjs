import { buildRedactedReportDocuments } from "./report.mjs";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadAuditData, validateAuditData } from "./validate.mjs";
import { resolveRunOutput } from "./run.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
export function createLiteralRedactor(policy) {
  if (
    !policy ||
    Object.keys(policy).some((key) => key !== "values") ||
    !Array.isArray(policy.values) ||
    !policy.values.length ||
    policy.values.length > 500 ||
    policy.values.some(
      (value) =>
        typeof value !== "string" || !value.length || value.length > 4096,
    )
  )
    throw new Error(
      "Invalid redaction policy: supply 1–500 nonempty literal values, each at most 4096 characters",
    );
  const values = [...new Set(policy.values)].sort(
    (a, b) => b.length - a.length,
  );
  // Literal-only, longest match first; no caller-supplied regular expressions.
  const pattern = new RegExp(
    values
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "gu",
  );
  return (text) => {
    let replacements = 0;
    const value = text.replace(pattern, () => {
      replacements++;
      return "[REDACTED]";
    });
    return { value, replacements };
  };
}
/** Explicit literal redaction of evidence only, not a general PII detector or report exporter. */
export async function redactEvidence(source, policy, target) {
  return exportRedacted(source, policy, target, false);
}
export async function redactReport(source, policy, target, options = {}) {
  return exportRedacted(source, policy, target, true, options);
}
async function exportRedacted(
  source,
  policy,
  target,
  includeReport,
  options = {},
) {
  const redact = createLiteralRedactor(policy);
  const audit = await loadAuditData(source);
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const validation = validateAuditData(audit, registry);
  if (!validation.valid)
    throw new Error("Cannot redact an invalid source audit");
  if (!audit.config)
    throw new Error(
      "Redaction requires a configuration-bound run; refresh legacy runs first",
    );
  const sourceRoot = await realpath(source);
  const { output } = await resolveRunOutput(
    { localRoots: [sourceRoot, ...(audit.config?.localRoots ?? [])] },
    target,
  );
  const records = [];
  const derivatives = [];
  for (const evidence of audit.evidence) {
    const { value, replacements } = redact(audit.artifacts[evidence.artifact]);
    const sourceEvidenceIdHash = hash(evidence.evidenceId);
    const artifact = `evidence-${sourceEvidenceIdHash}.txt`;
    records.push({
      sourceEvidenceIdHash,
      sourceSnapshotHash: evidence.snapshotHash,
      artifact,
      snapshotHash: hash(value),
      encoding: "utf8",
      redaction: "explicit-literal-values",
      replacements,
    });
    derivatives.push([artifact, value]);
  }
  const documents = includeReport
    ? buildRedactedReportDocuments(
        audit,
        registry,
        (text) => redact(text).value,
        new Map(
          audit.evidence.map((record, i) => [record.evidenceId, records[i]]),
        ),
        options,
      )
    : {};
  const manifest = {
    schemaVersion: 1,
    kind: includeReport
      ? "redacted-report-presentation"
      : "redacted-evidence-derivatives",
    sourceRunIdHash: hash(audit.run.runId),
    createdAt: new Date().toISOString(),
    records,
    documents: Object.entries(documents).map(([artifact, value]) => ({
      artifact,
      snapshotHash: hash(value),
    })),
    limitations: [
      "Only exact declared strings are replaced; encoded, transformed or undeclared sensitive values may remain.",
      includeReport
        ? "Transformed report presentation, not an audit revision. Supplied measurements are separate transformed attachments. Original evidence remains private and unchanged."
        : "Not an audit revision or a complete shareable report. Original evidence remains private and unchanged.",
      "Text files may contain source markup as text; do not serve them as executable HTML.",
      "Source hashes bind bytes, not truth or authorization. Review all derivatives before sharing.",
    ],
  };
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  try {
    for (const [name, value] of [
      ...derivatives,
      ...Object.entries(documents),
      ["redaction-manifest.json", JSON.stringify(manifest, null, 2) + "\n"],
    ])
      await writeFile(path.join(output, name), value, {
        flag: "wx",
        mode: 0o600,
      });
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
  return manifest;
}
