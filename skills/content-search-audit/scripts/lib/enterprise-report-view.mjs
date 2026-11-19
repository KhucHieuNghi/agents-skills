import {
  renderEnterpriseReport as renderV1,
  sha256,
} from "./enterprise-report-view-v1.mjs";
import { renderReportHtmlV2 } from "./enterprise-report-html-v2.mjs";
import { stableJson } from "./enterprise-state.mjs";
export { sha256, publicProjection } from "./enterprise-report-view-v1.mjs";

export function renderEnterpriseReport(
  input,
  edition = "customer",
  options = {},
) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => key !== "rendererVersion")
  )
    throw Error("Invalid renderer options");
  const version = options.rendererVersion ?? 2;
  if (![1, 2].includes(version))
    throw Error("Unsupported report renderer version");
  const original = renderV1(input, edition);
  if (version === 1) return original;
  // The V1 projection validates/redacts before any V2 renderer sees the model.
  const report = JSON.parse(original.json),
    html = renderReportHtmlV2(report);
  const manifest = {
    ...JSON.parse(original.manifest),
    schemaVersion: 2,
    renderer: { id: "enterprise-html", version: 2 },
  };
  manifest.files["report.html"] = sha256(html);
  return { ...original, html, manifest: stableJson(manifest) + "\n" };
}
