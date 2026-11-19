import { createHash } from "node:crypto";
import { validateEnterpriseHistoryV2 } from "./enterprise-history-v2.mjs";
import { stableJson } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { renderEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report-view.mjs";

const htmlEscape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const markdownEscape = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/[[\]<>`*_{}|]/g, (ch) => `\\${ch}`)
    .replace(/[\r\n]+/g, " ");
const display = (value) =>
  typeof value === "object" ? stableJson(value) : String(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Private in-memory display prototype. No disclosure decision, persistent
 * artifact, customer manifest, public projection or delivery authority. */
export function renderPrivateEnterpriseHistoryV2(input) {
  const report = globalThis.structuredClone(input);
  validateEnterpriseHistoryV2(report);
  const current = renderEnterpriseReport(report.current, "customer");
  const sections = report.history.entries.map((entry) => ({
    title: `${entry.type} · ${entry.disposition} · ${entry.sourceRef}`,
    fields: Object.entries(entry.content).map(([key, value]) => [
      key,
      display(value),
    ]),
  }));
  const notice =
    "Private draft. Historical dispositions describe the next revision, not remediation. Source verification and disclosure authority are separate.";
  const withheld = report.history.withheld
    ? "Restricted content withheld."
    : null;
  const coverage = `History coverage: ${report.history.coverage}; declaration is not independently verified.`;
  const sources = report.history.sources.map(
    (source) =>
      `Source ${source.sourceRef}; revision ${source.revisionId}; generated ${source.generatedAt}; assessment ${source.assessmentAt}; predecessor ${source.predecessorRef ?? "none"}.`,
  );
  const markdown =
    current.markdown +
    "\n## Historical report entries\n\n" +
    markdownEscape(notice) +
    "\n\n" +
    markdownEscape(coverage) +
    "\n\n" +
    (sources.length
      ? sources.map((source) => `- ${markdownEscape(source)}`).join("\n")
      : "No historical sources declared.") +
    "\n\n" +
    (withheld ? `${withheld}\n\n` : "") +
    (sections.length
      ? sections
          .map(
            (section) =>
              `### ${markdownEscape(section.title)}\n\n${section.fields.map(([key, value]) => `- **${markdownEscape(key)}:** ${markdownEscape(value)}`).join("\n")}`,
          )
          .join("\n\n")
      : "No historical entries recorded.") +
    "\n";
  const historyHtml = `<section id="editorial-history" aria-labelledby="editorial-history-title"><h2 id="editorial-history-title">Historical report entries</h2><p>${htmlEscape(notice)}</p><p>${htmlEscape(coverage)}</p>${sources.length ? `<ul>${sources.map((source) => `<li>${htmlEscape(source)}</li>`).join("")}</ul>` : "<p>No historical sources declared.</p>"}${withheld ? `<p>${htmlEscape(withheld)}</p>` : ""}${sections.length ? sections.map((section) => `<details><summary>${htmlEscape(section.title)}</summary>${section.fields.map(([key, value]) => `<p><strong>${htmlEscape(key)}:</strong> ${htmlEscape(value)}</p>`).join("")}</details>`).join("") : "<p>No historical entries recorded.</p>"}</section>`;
  if (!current.html.includes("</main>") || !current.html.includes("</nav>"))
    throw Error("Unsupported current report HTML projection");
  const html = current.html
    .replace(
      "</nav>",
      '<a href="#editorial-history">Historical entries</a></nav>',
    )
    .replace("</main>", `${historyHtml}</main>`);
  const json = stableJson(report) + "\n";
  const manifest =
    stableJson({
      schemaFamily: "private-enterprise-history-draft-manifest",
      schemaVersion: 1,
      files: {
        "report.json": sha256(json),
        "report.md": sha256(markdown),
        "report.html": sha256(html),
      },
    }) + "\n";
  return {
    json,
    markdown,
    html,
    manifest,
    persistenceAuthorized: false,
    disclosureAuthorized: false,
    deliveryAuthorized: false,
  };
}
