import { buildEnterpriseReport } from "./enterprise-report-model.mjs";
import { mkdir, writeFile, readFile, lstat, rm } from "node:fs/promises";
import path from "node:path";
import { renderEnterpriseReport, sha256 } from "./enterprise-report-view.mjs";
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
) {
  const artifacts = renderEnterpriseReport(report, edition);
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
  const json = await read("report.json"),
    report = JSON.parse(json),
    expected = renderEnterpriseReport(report, report.edition);
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
  const parent = await loadEnterpriseReport(sourceDirectory, options);
  if (parent.edition !== "customer")
    throw new Error("Revision requires private parent report");
  const report = buildEnterpriseReport(run, bundle, parent);
  return saveEnterpriseReport(outputDirectory, report);
}
