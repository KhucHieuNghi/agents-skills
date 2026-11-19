import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";
import {
  enterpriseDigest,
  loadEnterpriseRun,
} from "../lib/enterprise-state.mjs";

// Fixed packaged synthetic input only; never executes customer export content.
if (process.argv.length !== 3 || !process.argv[2].trim())
  throw new Error("Usage: node worked-measurement.mjs NEW_OUTPUT_DIRECTORY");
const out = resolve(process.argv[2]);
const cli = fileURLToPath(new URL("../audit.mjs", import.meta.url));
const example = JSON.parse(
  await readFile(
    new URL("../../examples/enterprise-measurement.json", import.meta.url),
    "utf8",
  ),
);
await mkdir(out);
const write = async (name, value) => {
  const path = join(out, name);
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  return path;
};
const invoke = (...args) =>
  JSON.parse(
    execFileSync(process.execPath, [cli, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
const config = await write("config.json", example.config);
invoke("enterprise-intake", config, join(out, "intake"));
const initial = await loadEnterpriseRun(join(out, "intake"));
const bundle = await write("evaluations.json", {
  sourceDigest: enterpriseDigest(initial),
  newRunId: example.newRunId,
  assessmentAt: example.assessmentAt,
  evaluations: example.evaluations,
});
const result = invoke(
  "enterprise-measurement-evaluate",
  join(out, "intake"),
  bundle,
  join(out, "assessed"),
);
await write("assessment-receipt.json", result);
const reportBundle = await write("report-input.json", {
  sourceRunDigest: result.digest,
  revisionId: "synthetic-measurement-report",
  authorId: "synthetic-example",
  generatedAt: example.assessmentAt,
  brand: { name: "Synthetic measurement example", accent: "#174f7b" },
  findings: result.findings,
  actions: [],
  observations: [],
  narrative: [],
  decisions: [],
});
invoke(
  "enterprise-report",
  join(out, "assessed"),
  reportBundle,
  join(out, "report"),
);
const validation = invoke("enterprise-report-validate", join(out, "report"));
await write("report-validation.json", validation);
process.stdout.write(
  JSON.stringify({
    directory: out,
    reportDirectory: join(out, "report"),
    synthetic: true,
    semanticAcceptance: false,
  }) + "\n",
);
