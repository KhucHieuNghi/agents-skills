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

const vietnameseLabels = {
  "Audit coverage": "Phạm vi đã kiểm tra",
  "See priority actions": "Xem việc cần làm",
  "Scope and evidence": "Phạm vi và bằng chứng",
  "Skip to report": "Đến nội dung báo cáo",
  "Partial audit": "Kiểm tra một phần",
  "Complete for declared scope": "Hoàn tất trong phạm vi đã khai báo",
  "items fully audited": "mục đã kiểm tra đầy đủ",
  "collected.": "mục đã thu thập.",
  "Coverage describes the checks performed.":
    "Số liệu thể hiện các bước kiểm tra đã thực hiện.",
  "Some checks still need evidence or review.":
    "Một số mục còn thiếu bằng chứng hoặc cần xem xét.",
  "Priority actions": "Việc cần ưu tiên",
  "No findings were recorded. Open the scope below to see what was checked and any outstanding gaps.":
    "Chưa ghi nhận phát hiện. Xem phạm vi bên dưới để biết phần đã kiểm tra và phần còn thiếu.",
  Owner: "Phụ trách",
  "Proposed next step": "Việc đề xuất",
  "How to verify": "Cách kiểm tra lại",
  Evidence: "Bằng chứng",
  "Finding details": "Chi tiết phát hiện",
  "Scope, measurements and evidence": "Phạm vi, số liệu và bằng chứng",
  "Font licenses": "Giấy phép phông chữ",
  "critical severity": "Mức nghiêm trọng",
  "high severity": "Mức cao",
  "medium severity": "Mức trung bình",
  "low severity": "Mức thấp",
};

export function resolveReportLocale(locale = "en") {
  if (!["en", "vi"].includes(locale))
    throw new Error("Invalid reportLocale; use en or vi");
  return locale;
}

const label = (locale, text) =>
  locale === "vi" ? (vietnameseLabels[text] ?? text) : text;
export function openReportView({
  brand,
  status,
  total,
  collected,
  audited,
  escape,
  locale,
}) {
  const t = (text) => label(locale, text);
  const complete = status === "Complete for declared scope";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"><title>${escape(brand)} — Content Search Audit</title><style>${fonts}${css}</style></head><body>
    <a class="skip-link" href="#report">${t("Skip to report")}</a>
    <header class="masthead"><div class="wrap masthead-inner"><span class="wordmark"><span aria-hidden="true">${logo}</span><span>NK<span class="wordmark-accent">Skills</span></span></span><span class="product">Content Search Audit</span></div></header>
    <main id="report" class="wrap" tabindex="-1">
      <section class="hero" aria-labelledby="report-title">
        <div><h1 id="report-title">${escape(brand)}</h1><p>Content Search Audit</p><div class="report-nav"><a class="primary" href="#priorities">${t("See priority actions")}</a><a href="#report-scope">${t("Scope and evidence")}</a></div></div>
        <aside class="scope" aria-label="${t("Audit coverage")}">
          <p class="status${complete ? " complete" : ""}">${t(complete ? status : "Partial audit")}</p>
          <p class="coverage-count"><strong>${escape(audited)}${locale === "vi" ? "/" : " of "}${escape(total)}</strong> ${t("items fully audited")}</p>
          <p>${collected === undefined ? "" : `${escape(collected)} ${t("collected.")} `}${t(complete ? "Coverage describes the checks performed." : "Some checks still need evidence or review.")}</p>
        </aside>
      </section>`;
}

export function openPriorities(locale, count) {
  const t = (text) => label(locale, text);
  return `<section class="priorities" id="priorities" aria-labelledby="priority-title" tabindex="-1"><h2 id="priority-title">${t("Priority actions")}</h2>${count === 0 ? `<p>${t("No findings were recorded. Open the scope below to see what was checked and any outstanding gaps.")}</p>` : ""}`;
}

export function findingView({
  title,
  row,
  headers,
  cell,
  escape,
  evidence = [],
  locale,
}) {
  const t = (text) => label(locale, text);
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
    <div class="finding-meta"><span class="severity">${escape(t(`${severity} severity`))}</span><span><strong>${t("Owner")}</strong> ${cell(owner)}</span></div>
    <h3>${escape(title)}</h3>
    <dl class="action-summary"><dt>${t("Proposed next step")}</dt><dd>${cell(fields.get("Recommendation"))}</dd><dt>${t("How to verify")}</dt><dd>${cell(fields.get("Verification"))}</dd></dl>
    ${evidence.length ? `<ul class="evidence-links" aria-label="${t("Evidence")}">${evidence.map((entry) => `<li>${cell(entry)}</li>`).join("")}</ul>` : ""}
    <details><summary>${t("Finding details")}</summary><dl class="finding-fields">${rows.join("")}</dl></details>
    </article>`;
}

export function openReportDetails(locale) {
  return `<details class="audit-details" id="audit-details"><summary>${label(locale, "Scope, measurements and evidence")}</summary><div class="appendix" id="report-scope">`;
}

export function closeReportView(locale) {
  return `<details class="font-notices"><summary>${label(locale, "Font licenses")}</summary><pre>${fontNotices}</pre></details></div></details></main></body></html>\n`;
}
