import { buildEnterpriseReport } from "./enterprise-report-model.mjs";
import { mkdir, writeFile, readFile, lstat, rm } from "node:fs/promises";
import path from "node:path";
import { renderEnterpriseReport, sha256 } from "./enterprise-report-view.mjs";
import { stableJson } from "./enterprise-state.mjs";
export {
  buildEnterpriseReport,
  validateEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "./enterprise-report-model.mjs";
export { renderEnterpriseReport } from "./enterprise-report-view.mjs";

export async function saveEnterpriseReport(
  directory,
  report,
  edition = "customer",
  options = {},
) {
  const artifacts = renderEnterpriseReport(report, edition, options);
  await mkdir(directory, { mode: 0o700 });
  try {
    for (const [key, file] of Object.entries({
      json: "report.json",
      markdown: "report.md",
      html: "report.html",
      manifest: "manifest.json",
    }))
      await writeFile(path.join(directory, file), artifacts[key], {
        flag: "wx",
        mode: 0o600,
      });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    directory,
    edition,
    manifestDigest: sha256(artifacts.manifest),
    reportDigest: sha256(artifacts.json),
  };
}
export async function loadEnterpriseReport(
  directory,
  { expectedManifestDigest } = {},
) {
  const root = await lstat(directory);
  if (!root.isDirectory() || root.isSymbolicLink())
    throw new Error("Invalid report directory");
  const read = async (name) => {
    const file = path.join(directory, name),
      info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024)
      throw new Error("Invalid report artifact");
    return readFile(file, "utf8");
  };
  const manifestBytes = await read("manifest.json"),
    manifest = JSON.parse(manifestBytes);
  if (
    expectedManifestDigest !== undefined &&
    sha256(manifestBytes) !== expectedManifestDigest
  )
    throw new Error("Report manifest integrity mismatch");
  let rendererVersion;
  if (manifest.schemaFamily !== "enterprise-report-manifest")
    throw Error("Invalid report manifest");
  if (manifest.schemaVersion === 1 && !Object.hasOwn(manifest, "renderer"))
    rendererVersion = 1;
  else if (
    manifest.schemaVersion === 2 &&
    manifest.renderer?.id === "enterprise-html" &&
    manifest.renderer.version === 2 &&
    Object.keys(manifest.renderer).length === 2
  )
    rendererVersion = 2;
  else throw Error("Unsupported or contradictory report renderer manifest");
  const json = await read("report.json"),
    report = JSON.parse(json),
    expected = renderEnterpriseReport(report, report.edition, {
      rendererVersion,
    });
  for (const [key, file] of Object.entries({
    json: "report.json",
    markdown: "report.md",
    html: "report.html",
  })) {
    const bytes = file === "report.json" ? json : await read(file);
    if (manifest.files?.[file] !== sha256(bytes))
      throw new Error("Report integrity mismatch");
    if (bytes !== expected[key]) throw new Error("Report projection mismatch");
  }
  if (manifestBytes !== expected.manifest)
    throw new Error("Report manifest projection mismatch");
  return report;
}

/** Loads and checks every parent artifact before producing a new immutable revision. */
export async function reviseEnterpriseReport(
  sourceDirectory,
  run,
  bundle,
  outputDirectory,
  options = {},
) {
  const requested = globalThis.structuredClone({ run, bundle, options });
  const parent = await loadEnterpriseReport(sourceDirectory, requested.options);
  if (parent.edition !== "customer")
    throw new Error("Revision requires private parent report");
  const report = buildEnterpriseReport(requested.run, requested.bundle, parent);
  for (const [collection, key] of [
    ["findings", (item) => item.findingId],
    ["actions", (item) => item.actionId],
    ["narrative", (item) => item.narrativeId],
    ["decisions", (item) => `${item.targetType}:${item.targetId}`],
  ]) {
    for (const prior of parent[collection]) {
      const next = report[collection].find((item) => key(item) === key(prior));
      if (!next || stableJson(next) !== stableJson(prior))
        throw new Error(
          "V1 cannot represent this editorial history transition",
        );
    }
  }
  return saveEnterpriseReport(outputDirectory, report);
}
