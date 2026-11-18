import { validateRunContract } from "./run-contract.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateAuditData } from "./validate.mjs";
import { saveCheckpoint } from "./state.mjs";
import { buildReportDocuments } from "./report.mjs";
const jsonl = (values) =>
  values.map((value) => JSON.stringify(value)).join("\n") +
  (values.length ? "\n" : "");
/** Internal new-only persistence; caller must resolve authorized output boundaries. */
export async function writeRevision(
  audit,
  config,
  registry,
  output,
  reportOptions = {},
) {
  validateRunContract(audit.run, config);
  const validation = validateAuditData(audit, registry);
  if (!validation.valid)
    throw new Error(`Invalid revision: ${validation.errors.join("; ")}`);
  // Validate all supplied report attachments before creating any output. The
  // caller supplies trusted presentation options, never a replacement registry.
  const documents = buildReportDocuments(audit, registry, {
    brandName: config.brandName,
    ...reportOptions,
  });
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  async function write(name, value) {
    await mkdir(path.dirname(path.join(output, name)), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(path.join(output, name), value, {
      flag: "wx",
      mode: 0o600,
      encoding: "utf8",
    });
  }
  for (const [name, value] of Object.entries(audit.artifacts))
    await write(name, value);
  await write("config.json", JSON.stringify(config, null, 2) + "\n");
  await write("inventory.jsonl", jsonl(audit.inventory));
  await write("evidence.jsonl", jsonl(audit.evidence));
  await write("checks.jsonl", jsonl(audit.checks));
  await write("findings.json", JSON.stringify(audit.findings, null, 2) + "\n");
  await saveCheckpoint(output, audit.run);
  for (const [name, value] of Object.entries(documents))
    await write(name, value);
  return {
    directory: output,
    runId: audit.run.runId,
    parentRunId: audit.run.parentRunId,
    status: audit.run.status,
    coverage: JSON.parse(documents["coverage.json"]),
    files: Object.keys(documents).map((name) => path.join(output, name)),
  };
}
