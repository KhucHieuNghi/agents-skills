import { validateRunContract } from "./run-contract.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateAuditData } from "./validate.mjs";
import { saveCheckpoint } from "./state.mjs";
import { renderReport } from "./report.mjs";
const jsonl = (values) =>
  values.map((value) => JSON.stringify(value)).join("\n") +
  (values.length ? "\n" : "");
/** Internal new-only persistence; caller must resolve authorized output boundaries. */
export async function writeRevision(audit, config, registry, output) {
  validateRunContract(audit.run, config);
  const validation = validateAuditData(audit, registry);
  if (!validation.valid)
    throw new Error(`Invalid revision: ${validation.errors.join("; ")}`);
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
  const report = await renderReport(output, { brandName: config.brandName });
  return {
    directory: output,
    runId: audit.run.runId,
    parentRunId: audit.run.parentRunId,
    status: audit.run.status,
    coverage: report.coverage,
    files: report.files,
  };
}
