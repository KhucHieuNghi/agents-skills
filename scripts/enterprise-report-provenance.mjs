import { Buffer } from "node:buffer";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { readFile, readdir, lstat } from "node:fs/promises";
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
function inspectOne(run, report, parent) {
  validateEnterpriseRun(run);
  validateEnterpriseReport(report);
  assert(
    report.edition === "customer",
    "Generated provenance requires a customer report",
  );
  assert(
    report.actions.length === 0 && report.decisions.length === 0,
    "Curated actions and review prose require governed provenance",
  );
  assert(
    report.sourceRunDigest === enterpriseDigest(run),
    "Report source binding mismatch",
  );
  const modules = compileStoredEnterpriseModules(run);
  const metadata = Object.fromEntries(
    ["sourceRunDigest", "revisionId", "authorId", "generatedAt", "brand"].map(
      (k) => [k, report[k]],
    ),
  );
  if (parent)
    assert(
      Date.parse(run.assessmentAt) >=
        Date.parse(parent.assessment.assessmentAt),
      "Report assessment time moved backwards",
    );
  const expected = buildEnterpriseReport(
    run,
    {
      ...metadata,
      ...(parent ? { parentReportDigest: report.parentReportDigest } : {}),
      findings: modules.flatMap((m) => m.projection.findings ?? []),
      observations: modules.flatMap((m) => m.projection.observations),
      narrative: modules.flatMap((m) => m.projection.narrative),
      actions: [],
      decisions: [],
    },
    parent,
  );
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
  return {
    schemaFamily: "private-generated-report-provenance",
    schemaVersion: 2,
    assessment: {
      generatedAt: report.generatedAt,
      assessmentAt: run.assessmentAt,
      parentRunIds: [...(run.parentRunIds ?? [])],
      parentReportDigest: report.parentReportDigest,
    },
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

/** Every ancestor is replayed from its own originals; no cached parent proof is accepted. */
export async function inspectGeneratedReportProvenance(
  run,
  report,
  ancestors = [],
) {
  assert(
    Array.isArray(ancestors) && ancestors.length <= 32,
    "Invalid generated report ancestor limit",
  );
  let bytes = 0;
  const chain = [...ancestors, { run, report }].map((entry) => {
    assert(
      entry &&
        Object.getPrototypeOf(entry) === Object.prototype &&
        Object.keys(entry).length === 2 &&
        Object.hasOwn(entry, "run") &&
        Object.hasOwn(entry, "report"),
      "Invalid generated report ancestor",
    );
    bytes += Buffer.byteLength(stableJson(entry));
    assert(
      bytes <= 64 * 1024 * 1024,
      "Generated report chain byte budget exceeded",
    );
    return globalThis.structuredClone(entry);
  });
  assert(
    (await compilerFingerprint()) === loadedCompilerDigest,
    "Compiler inventory changed; reload before provenance inspection",
  );
  let parent = null,
    provenance;
  const runSources = new Map(),
    reportIds = new Set();
  for (const entry of chain) {
    assert(
      !reportIds.has(entry.report.revisionId),
      "Duplicate report revision in generated chain",
    );
    reportIds.add(entry.report.revisionId);
    const source = enterpriseDigest(entry.run);
    assert(
      !runSources.has(entry.run.runId) ||
        runSources.get(entry.run.runId) === source,
      "Source run rewritten in generated chain",
    );
    runSources.set(entry.run.runId, source);
    provenance = inspectOne(entry.run, entry.report, parent);
    parent = entry.report;
  }
  assert(
    (await compilerFingerprint()) === loadedCompilerDigest,
    "Compiler inventory changed during provenance inspection",
  );
  return provenance;
}
const bindingKeys = [
  "sourceDirectory",
  "reportDirectory",
  "sourceRunDigest",
  "reportDigest",
  "manifestDigest",
];
function validatedBinding(value) {
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === bindingKeys.length &&
      bindingKeys.every((k) => Object.hasOwn(value, k)),
    "Invalid stored provenance options",
  );
  const binding = globalThis.structuredClone(value);
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
  return binding;
}
async function loadBinding(binding) {
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
}
/** Private already-authorized local content only, not a governed-text acquisition gate.
 * Complete root-first chain; optimistic rechecks do not lock through delivery. */
export async function loadVerifiedGeneratedReportChain(bindings) {
  assert(
    Array.isArray(bindings) && bindings.length >= 1 && bindings.length <= 33,
    "Invalid stored report chain limit",
  );
  const requested = bindings.map(validatedBinding);
  assert(
    new Set(requested.map((b) => b.reportDigest)).size === requested.length,
    "Duplicate report in generated chain",
  );
  let artifactBytes = 0;
  for (const binding of requested) {
    for (const [directory, names] of [
      [
        binding.sourceDirectory,
        ["enterprise-run.json", "enterprise-run.manifest.json"],
      ],
      [
        binding.reportDirectory,
        ["report.json", "report.md", "report.html", "manifest.json"],
      ],
    ]) {
      const root = await lstat(directory);
      assert(
        root.isDirectory() && !root.isSymbolicLink(),
        "Invalid chain artifact directory",
      );
      for (const name of names) {
        const info = await lstat(join(directory, name));
        assert(
          info.isFile() &&
            !info.isSymbolicLink() &&
            info.size <= 32 * 1024 * 1024,
          "Invalid chain artifact",
        );
        artifactBytes += info.size;
        assert(
          artifactBytes <= 64 * 1024 * 1024,
          "Generated report chain artifact byte budget exceeded",
        );
      }
    }
  }
  const entries = [];
  let bytes = 0;
  for (const binding of requested) {
    const entry = await loadBinding(binding);
    bytes += Buffer.byteLength(stableJson(entry));
    assert(
      bytes <= 64 * 1024 * 1024,
      "Generated report chain byte budget exceeded",
    );
    entries.push(entry);
  }
  const last = entries.at(-1);
  const provenance = await inspectGeneratedReportProvenance(
    last.run,
    last.report,
    entries.slice(0, -1),
  );
  for (const binding of requested) await loadBinding(binding);
  return { entries, provenance, bindings: requested };
}
/** Bind exact stored artifacts; optional ancestors must contain every parent to the root. */
export async function inspectStoredGeneratedReportProvenance(options) {
  assert(
    options && Object.getPrototypeOf(options) === Object.prototype,
    "Invalid stored provenance options",
  );
  const input = globalThis.structuredClone(options),
    ancestors = Object.hasOwn(input, "ancestors") ? input.ancestors : [];
  delete input.ancestors;
  assert(
    Array.isArray(ancestors) && ancestors.length <= 32,
    "Invalid stored provenance ancestors",
  );
  const { entries, provenance } = await loadVerifiedGeneratedReportChain([
    ...ancestors,
    input,
  ]);
  const report = entries.at(-1).report;
  return {
    ...provenance,
    artifactBinding: {
      manifestDigest: input.manifestDigest,
      reportJsonDigest: hash(stableJson(report) + "\n"),
      edition: report.edition,
      sourceRunDigest: input.sourceRunDigest,
    },
  };
}
