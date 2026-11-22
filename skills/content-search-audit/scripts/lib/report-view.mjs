import { readFileSync } from "node:fs";

const asset = (name, encoding) =>
  readFileSync(new URL(`../report-assets/${name}`, import.meta.url), encoding);
const logo = asset("nkskills-mark.svg", "utf8");
const css = asset("report.css", "utf8");
const fontNotices = ["fraunces-OFL.txt", "source-sans-3-OFL.txt"]
  .map((name) =>
    asset(name, "utf8").replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
  )
  .join("\n\n");
const latin = "U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2212,U+FFFD";
const vietnamese =
  "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";
const fonts = [
  ["Fraunces Variable", "fraunces", "full", 100],
  ["Source Sans 3 Variable", "source-sans-3", "wght", 200],
]
  .flatMap(([name, family, axis, minimum]) =>
    [
      ["latin", latin],
      ["vietnamese", vietnamese],
    ].map(
      ([subset, range]) =>
        `@font-face{font-family:"${name}";font-weight:${minimum} 900;font-display:swap;src:url("data:font/woff2;base64,${asset(`${family}-${subset}-${axis}-normal.woff2`, "base64")}") format("woff2");unicode-range:${range}}`,
    ),
  )
  .join("");

export function openReportView({
  brand,
  status,
  total,
  collected,
  audited,
  escape,
}) {
  const complete = status === "Complete for declared scope";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"><title>${escape(brand)} — Content Search Audit</title><style>${fonts}${css}</style></head><body>
    <a class="skip-link" href="#report">Skip to report</a>
    <header class="masthead"><div class="wrap masthead-inner"><span class="wordmark"><span aria-hidden="true">${logo}</span><span>NK<span class="wordmark-accent">Skills</span></span></span><span class="product">Content Search Audit</span></div></header>
    <main id="report" class="wrap" tabindex="-1">
      <section class="hero" aria-labelledby="report-title">
        <div><h1 id="report-title">${escape(brand)}</h1><p>Content Search Audit</p><div class="report-nav"><a class="primary" href="#priorities">See priority actions</a><a href="#report-scope">Scope and evidence</a></div></div>
        <aside class="scope" aria-label="Audit coverage">
          <p class="status${complete ? " complete" : ""}">${complete ? status : "Partial audit"}</p>
          <p class="coverage-count"><strong>${escape(audited)} of ${escape(total)}</strong> items fully audited</p>
          <p>${collected === undefined ? "" : `${escape(collected)} collected. `}${complete ? "Coverage describes the checks performed." : "Some checks still need evidence or review."}</p>
        </aside>
      </section>`;
}

export function openPriorities(count) {
  return `<section class="priorities" id="priorities" aria-labelledby="priority-title" tabindex="-1"><h2 id="priority-title">Priority actions</h2>${count === 0 ? "<p>No findings were recorded. Open the scope below to see what was checked and any outstanding gaps.</p>" : ""}`;
}

export function findingView({
  title,
  row,
  headers,
  cell,
  escape,
  evidence = [],
}) {
  const fields = new Map(headers.map((label, index) => [label, row[index]]));
  const severity = fields.get("Severity");
  const owner = fields.get("Owner role") ?? fields.get("Owner");
  const summaryFields = new Set([
    "Finding",
    "Observation",
    "Severity",
    "Owner role",
    "Owner",
    "Recommendation",
    "Verification",
  ]);
  const rows = headers.map((label, index) =>
    row[index] === "" || summaryFields.has(label)
      ? ""
      : `<dt>${escape(label)}</dt><dd>${cell(row[index])}</dd>`,
  );
  return `<article class="finding">
    <div class="finding-meta"><span class="severity">${escape(severity)} severity</span><span><strong>Owner</strong> ${cell(owner)}</span></div>
    <h3>${escape(title)}</h3>
    <dl class="action-summary"><dt>Proposed next step</dt><dd>${cell(fields.get("Recommendation"))}</dd><dt>How to verify</dt><dd>${cell(fields.get("Verification"))}</dd></dl>
    ${evidence.length ? `<ul class="evidence-links" aria-label="Evidence">${evidence.map((entry) => `<li>${cell(entry)}</li>`).join("")}</ul>` : ""}
    <details><summary>Finding details</summary><dl class="finding-fields">${rows.join("")}</dl></details>
    </article>`;
}

export const openReportDetails =
  '<details class="audit-details" id="audit-details"><summary>Scope, measurements and evidence</summary><div class="appendix" id="report-scope">';
export const closeReportView = `<details class="font-notices"><summary>Font licenses</summary><pre>${fontNotices}</pre></details></div></details></main></body></html>\n`;
