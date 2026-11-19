import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath, URL } from "node:url";
import { join, relative } from "node:path";
import { compileStoredEnterpriseModules } from "./enterprise-report-assembly.mjs";
import {
  enterpriseDigest,
  stableJson,
  validateEnterpriseRun,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  validateEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report-model.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function compilerFingerprint() {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw Error("Unsupported compiler inventory symlink");
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && /\.(mjs|json)$/.test(entry.name))
        files.push(path);
    }
  }
  for (const directory of [
    "scripts",
    "skills/content-search-audit/scripts",
    "skills/content-search-audit/rules",
  ])
    await walk(join(root, directory));
  files.push(join(root, "package-lock.json"));
  const entries = await Promise.all(
    files
      .sort()
      .map(async (path) => [relative(root, path), hash(await readFile(path))]),
  );
  return enterpriseDigest(entries);
}
// Conservative development inventory: all local script/rule files and root dependency lock.
// A change requires a fresh module process; this is not code signing or host authentication.
const loadedCompilerDigest = await compilerFingerprint();
const collections = {
  finding: "findings",
  observation: "observations",
  narrative: "narrative",
};
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};

/** Replay-derived private provenance only. No content storage or redisclosure grant. */
export async function inspectGeneratedReportProvenance(run, report) {
  run = globalThis.structuredClone(run);
  report = globalThis.structuredClone(report);
  validateEnterpriseRun(run);
  validateEnterpriseReport(report);
  assert(
    report.edition === "customer" && report.parentReportDigest === null,
    "Generated provenance currently requires a standalone customer report",
  );
  assert(
    report.actions.length === 0 && report.decisions.length === 0,
    "Curated actions and review prose require governed provenance",
  );
  assert(
    report.sourceRunDigest === enterpriseDigest(run),
    "Report source binding mismatch",
  );
  assert(
    (await compilerFingerprint()) === loadedCompilerDigest,
    "Compiler inventory changed; reload before provenance inspection",
  );
  const modules = compileStoredEnterpriseModules(run);
  const metadata = Object.fromEntries(
    ["sourceRunDigest", "revisionId", "authorId", "generatedAt", "brand"].map(
      (k) => [k, report[k]],
    ),
  );
  const expected = buildEnterpriseReport(run, {
    ...metadata,
    findings: modules.flatMap((m) => m.projection.findings ?? []),
    observations: modules.flatMap((m) => m.projection.observations),
    narrative: modules.flatMap((m) => m.projection.narrative),
    actions: [],
    decisions: [],
  });
  assert(
    stableJson(expected) === stableJson(report),
    "Generated report replay mismatch; curated or unsupported provenance",
  );
  const items = [];
  for (const [type, collection] of Object.entries(collections)) {
    for (const item of report[collection]) {
      const id = item[`${type}Id`];
      const owners = modules.filter((m) =>
        (m.projection[collection] ?? []).some((v) => v[`${type}Id`] === id),
      );
      assert(owners.length === 1, "Missing or ambiguous generated item owner");
      const check =
        type === "finding"
          ? run.checks.find((c) => c.checkId === item.checkId)
          : null;
      const ids = [
        ...new Set([...item.evidenceIds, ...(check?.dependencies ?? [])]),
      ].sort();
      items.push({
        collection,
        itemId: id,
        itemDigest: enterpriseDigest(item),
        targetDigest: enterpriseReviewTargetDigest(report, type, id),
        origin: {
          kind: "generated",
          moduleId: owners[0].moduleId,
          compilerDigest: loadedCompilerDigest,
          sourceRunDigest: enterpriseDigest(run),
          evidenceBindings: ids.map((evidenceId) => {
            const source = run.evidence.find(
              (e) => e.evidenceId === evidenceId,
            );
            assert(source, "Missing generated item source binding");
            return { evidenceId, digest: source.digest };
          }),
        },
      });
    }
  }
  assert(
    (await compilerFingerprint()) === loadedCompilerDigest,
    "Compiler inventory changed during provenance inspection",
  );
  return {
    schemaFamily: "private-generated-report-provenance",
    schemaVersion: 1,
    audience: "private",
    reportDigest: enterpriseDigest(report),
    revisionId: report.revisionId,
    scope: { customerId: run.customerId, runId: run.runId },
    compilerDigest: loadedCompilerDigest,
    items,
    persistenceAuthorized: false,
    disclosureAuthorized: false,
    historyPreserved: false,
  };
}

/** Read-only local binding for already-authorized generated report artifacts.
 * Not a governed-text loader: resolve disclosure/storage rights before calling.
 * Rechecks are optimistic and do not lock files through future delivery. */
export async function inspectStoredGeneratedReportProvenance(options) {
  const keys = [
    "sourceDirectory",
    "reportDirectory",
    "sourceRunDigest",
    "reportDigest",
    "manifestDigest",
  ];
  assert(
    options &&
      Object.getPrototypeOf(options) === Object.prototype &&
      Object.keys(options).length === keys.length &&
      keys.every((k) => Object.hasOwn(options, k)),
    "Invalid stored provenance options",
  );
  const binding = globalThis.structuredClone(options);
  assert(
    ["sourceDirectory", "reportDirectory"].every(
      (k) => typeof binding[k] === "string" && binding[k].length > 0,
    ) &&
      ["sourceRunDigest", "reportDigest", "manifestDigest"].every(
        (k) =>
          typeof binding[k] === "string" && /^[a-f0-9]{64}$/.test(binding[k]),
      ),
    "Invalid stored provenance binding",
  );
  const load = async () => {
    const [run, report] = await Promise.all([
      loadEnterpriseRun(binding.sourceDirectory),
      loadEnterpriseReport(binding.reportDirectory, {
        expectedManifestDigest: binding.manifestDigest,
      }),
    ]);
    assert(
      enterpriseDigest(run) === binding.sourceRunDigest &&
        enterpriseDigest(report) === binding.reportDigest,
      "Stored provenance source/report binding mismatch",
    );
    return { run, report };
  };
  const { run, report } = await load();
  const provenance = await inspectGeneratedReportProvenance(run, report);
  await load();
  return {
    ...provenance,
    artifactBinding: {
      manifestDigest: binding.manifestDigest,
      reportJsonDigest: hash(stableJson(report) + "\n"),
      edition: report.edition,
      sourceRunDigest: binding.sourceRunDigest,
    },
  };
}
