import { createHash } from "node:crypto";
import { reportSections } from "./enterprise-report-view-v1.mjs";
import { stableJson } from "./enterprise-state.mjs";
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const display = (value) =>
  value === null || value === undefined
    ? "Unknown"
    : typeof value === "object"
      ? "numerator" in value
        ? `${value.numerator}/${value.denominator}`
        : "min" in value
          ? `${value.min}–${value.max}`
          : stableJson(value)
      : String(value);
const anchor = (id) =>
  "evidence-" + createHash("sha256").update(id).digest("hex");
const references = (ids) =>
  ids.length
    ? `<details class="evidence-references"><summary>${ids.length} evidence reference${ids.length === 1 ? "" : "s"}</summary><ul>${ids.map((id) => `<li><a href="#${anchor(id)}">${escape(id)}</a></li>`).join("")}</ul></details>`
    : "<p>No evidence references.</p>";
function evidenceIds(report, section, row, index) {
  if (section.id === "findings") return report.findings[index].evidenceIds;
  if (section.id === "measurements")
    return report.observations[index].evidenceIds;
  if (section.id === "checks")
    return (
      report.assessment.checks.find((c) => c.checkId === row[0])?.evidenceIds ??
      []
    );
  return null;
}
function sectionBody(report, section) {
  if (section.id === "narrative")
    return (
      report.narrative
        .map(
          (item) =>
            `<article class="narrative-article"><h3>${escape(item.kind)}</h3><p class="record-id">${escape(item.narrativeId)}</p><p class="narrative-text">${escape(item.text)}</p>${references(item.evidenceIds)}</article>`,
        )
        .join("") || "<p>No entries recorded.</p>"
    );
  if (!section.columns.length) return "";
  if (!section.rows.length) return "<p>No entries recorded.</p>";
  if (section.id === "coverage")
    return `<div class="table-scroll" role="region" aria-label="${escape(section.title)}" tabindex="0"><table><caption>${escape(section.title)}</caption><thead><tr>${section.columns.map((v) => `<th scope="col">${escape(v)}</th>`).join("")}</tr></thead><tbody>${section.rows.map((row) => `<tr>${row.map((v) => `<td>${escape(display(v))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return section.rows
    .map((row, index) => {
      const ids = evidenceIds(report, section, row, index);
      const evidence = section.id === "evidence";
      return `<article class="record"${evidence ? ` id="${anchor(row[0])}" tabindex="-1"` : ""}><h3>${escape(display(row[0]))}</h3><dl>${section.columns.map((label, i) => (i === 0 || (ids !== null && label === "Evidence") ? "" : `<div class="record-field"><dt>${escape(label)}</dt><dd>${escape(display(row[i]))}</dd></div>`)).join("")}</dl>${ids === null ? "" : references(ids)}</article>`;
    })
    .join("");
}
export function renderReportHtmlV2(report) {
  const sections = reportSections(report);
  const css = `:root{color-scheme:light;--accent:${report.brand.accent}}*{box-sizing:border-box}body{margin:0;background:#f6f7f8;color:#17202a;font:16px/1.6 system-ui,sans-serif}main,header{max-width:1200px;margin:auto;padding:24px}header{border-bottom:3px solid var(--accent)}h1,h2,h3{line-height:1.25;overflow-wrap:anywhere}h1{font-size:clamp(1.8rem,4vw,3rem)}h2{font-size:1.5rem;color:#234e52}h3{font-size:1.05rem}section{background:white;padding:24px;margin:20px 0;border:1px solid #dce1e5;border-radius:8px}p,li,dt,dd,td,summary{overflow-wrap:anywhere}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#234e52}a:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:3px solid #b45309;outline-offset:4px}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{padding:10px;border-bottom:1px solid #dce1e5;text-align:left;vertical-align:top;min-width:110px}th{background:#eef2f4}caption{text-align:left;font-weight:600}article{padding:16px 0;border-top:1px solid #dce1e5;min-width:0}article:first-of-type{border-top:0}.record-id{font-size:.875rem;color:#455464}.narrative-text{max-width:80ch}dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:0}.record-field{min-width:0}dt{font-weight:600}dd{margin:4px 0 0}details{margin-top:16px;padding:12px;background:#f6f7f8;border-radius:4px}summary{cursor:pointer;font-weight:600}details ul{padding-left:20px}details li{margin:10px 0}.skip{position:absolute;left:-10000px}.skip:focus{left:16px;top:8px;background:white;padding:8px}@media(max-width:600px){main,header{padding:16px}section{padding:16px}dl{grid-template-columns:minmax(0,1fr)}}`;
  const hash = createHash("sha256").update(css).digest("base64");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'sha256-${hash}'; base-uri 'none'; form-action 'none'"><title>${escape(report.brand.name)}</title><style>${css}</style></head><body><a class="skip" href="#main">Skip to report</a><header><h1>${escape(report.brand.name)}</h1><p>Revision ${escape(report.revisionId)} · ${escape(report.generatedAt)} · ${escape(report.edition)}</p><nav aria-label="Report sections">${sections.map((s) => `<a href="#${s.id}">${escape(s.title)}</a>`).join("")}</nav></header><main id="main">${sections.map((s) => `<section id="${s.id}" aria-labelledby="${s.id}-title"><h2 id="${s.id}-title">${escape(s.title)}</h2>${s.paragraphs.map((t) => `<p>${escape(t)}</p>`).join("")}${sectionBody(report, s)}</section>`).join("")}</main></body></html>\n`;
}
