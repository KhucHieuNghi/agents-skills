import { redactMeasurementDocuments } from "./redacted-measurements.mjs";
import {
  resolveActionProposal,
  conditionalActionText,
} from "./action-proposal.mjs";
import { sourceAge, sourceAgeContext } from "./source-age.mjs";
import { lstat, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { loadAuditData, validateAuditData } from "./validate.mjs";
import { prepareMeasurementReport } from "./measurement-report.mjs";
const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const escapeMarkdown = (value) =>
  escapeHtml(value)
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&")
    .replace(/[\r\n]+/g, " ");
function csvCell(value) {
  let text = String(value ?? "");
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
const severity = { critical: 0, high: 1, medium: 2, low: 3 };
const confidence = { high: 0, medium: 1, low: 2 };
const pathUrl = (value) =>
  value
    .split("/")
    .map((part) =>
      encodeURIComponent(part).replace(
        /[!'()*]/g,
        (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase(),
      ),
    )
    .join("/");
/** Rendering only: validates every input first, shares rows across output formats,
 * and never includes raw artifact values or executes target content. */
export function buildReportDocuments(audit, registry, options = {}) {
  return buildDocuments(audit, registry, options);
}
/** Presentation-only redaction after original audit validation; no measurement exports. */
export function buildRedactedReportDocuments(
  audit,
  registry,
  redact,
  evidence,
  options = {},
) {
  return buildDocuments(
    audit,
    registry,
    { ...options, brandName: options.brandName ?? audit.config?.brandName },
    { redact, evidence },
  );
}
function buildDocuments(audit, registry, options, presentation = null) {
  const show = (value) =>
    presentation ? presentation.redact(String(value ?? "")) : value;
  const htmlText = (value) => escapeHtml(show(value));
  const mdText = (value) => escapeMarkdown(show(value));
  const csvText = (value) => csvCell(show(value));
  const displayObject = (value) => {
    if (typeof value === "string") return show(value);
    if (Array.isArray(value)) return value.map(displayObject);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          displayObject(child),
        ]),
      );
    return value;
  };
  const reportTime = new Date().toISOString();
  const validation = validateAuditData(audit, registry);
  if (!validation.valid)
    throw new Error(`Invalid audit: ${validation.errors.join("; ")}`);
  const coverage = validation.coverage;
  const brand = options.brandName ?? "Content audit";
  if (typeof brand !== "string" || !brand.trim())
    throw new Error("Brand name must be nonempty text");
  const findings = [...audit.findings].sort(
    (a, b) =>
      severity[a.severity] - severity[b.severity] ||
      confidence[a.confidence] - confidence[b.confidence] ||
      a.findingId.localeCompare(b.findingId),
  );
  const status = validation.completionAllowed
    ? "Complete for declared scope"
    : "Partial";
  const measurements = prepareMeasurementReport(options, reportTime);
  const sections = [];
  const paragraph = (title, text) => sections.push({ title, text });
  const table = (title, headers, rows) =>
    sections.push({ title, headers, rows });
  if (presentation)
    paragraph(
      "Redacted presentation",
      "This is a transformed display of a validated source audit, not a new audit. Linked artifacts are redacted derivatives. Counts retain source scope; quotations and locators may be masked. Only declared literal strings were removed; review before sharing. Supplied measurement attachments are transformed presentations, not original importable exports.",
    );
  paragraph("Source age reference", sourceAgeContext(reportTime));
  paragraph(
    "Audit status",
    `${status}. Run ${audit.run.runId}. ${findings.length} findings. Coverage is separate from whether content checks pass. Structural validation does not establish semantic truth or search performance.`,
  );
  table(
    "Coverage",
    ["Metric", "Count"],
    [
      ["Declared items", coverage.total],
      ["In scope", coverage.inScope],
      ["Audited", coverage.audited],
      ["Accounted", coverage.accounted],
      ["Excluded", coverage.excluded],
      ["Blocked", coverage.states.blocked],
      ["Failed", coverage.states.failed],
      ["Unsupported", coverage.states.unsupported],
      ["Pending", coverage.states.pending],
      ["Missing checks", coverage.missingChecks.length],
      ["Remaining queue", coverage.pendingQueueCount],
    ],
  );
  paragraph("Coverage denominator", coverage.denominator);
  paragraph(
    "Scope limitations",
    coverage.limitations.length
      ? coverage.limitations.join("; ")
      : "No unresolved coverage gaps in the declared inventory. Discovery completeness remains a supplied scope assertion.",
  );
  table(
    "Priority backlog",
    [
      "ID",
      "Finding",
      "Rules",
      "Dimensions",
      "Severity",
      "Confidence",
      "Classification",
      "Items",
      "Action",
      "Action origin",
      "Action reason",
      "Recommendation",
      "Verification",
      "Owner",
      "Effort",
      "Evidence",
    ],
    findings.map((f) => [
      f.findingId,
      f.title,
      f.ruleIds.join(", "),
      f.dimensions.join(", "),
      f.severity,
      f.confidence,
      f.classification,
      f.affectedItemIds.join(", "),
      resolveActionProposal(f).action,
      resolveActionProposal(f).origin,
      resolveActionProposal(f).reason,
      conditionalActionText(f, "remediation"),
      conditionalActionText(f, "verification"),
      f.ownerRole,
      f.effort,
      f.evidenceIds.join(", "),
    ]),
  );
  if (!findings.length)
    paragraph(
      "Finding interpretation",
      "No findings were recorded. This does not resolve unknown checks or demonstrate measured search visibility.",
    );
  table(
    "Dimension coverage",
    [
      "Dimension",
      "Supplied checks",
      "Pass/fail assessed",
      "Unknown",
      "Not applicable",
    ],
    Object.entries(coverage.dimensions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dimension, data]) => [
        dimension,
        data.total,
        data.completed,
        data.unknown,
        data.notApplicable,
      ]),
  );
  sections.push(...measurements.sections);
  table(
    "Inventory appendix",
    ["Item", "State", "Reason", "Required checks"],
    audit.inventory.map((item) => [
      item.itemId,
      item.state,
      item.reason ?? "",
      item.requiredRuleIds.length,
    ]),
  );
  table(
    "Checks appendix",
    ["Item", "Rule", "Dimension", "Status", "Reason", "Evidence"],
    audit.checks.map((check) => [
      check.itemId,
      check.ruleId,
      check.dimension,
      check.status,
      check.reason,
      check.evidenceIds.join(", "),
    ]),
  );
  table(
    "Missing checks",
    ["Item", "Rule"],
    coverage.missingChecks.map((check) => [check.itemId, check.ruleId]),
  );
  table(
    "Evidence appendix",
    [
      "Evidence",
      "Item",
      "Method",
      "Collected",
      "Age at report time",
      "Artifact",
      "Hash",
      "Limitations",
    ],
    audit.evidence.map((record) => {
      const derivative = presentation?.evidence.get(record.evidenceId);
      if (presentation && !derivative)
        throw new Error("Missing redacted evidence mapping");
      return [
        record.evidenceId,
        record.itemId,
        record.method,
        record.collectedAt,
        sourceAge(record.collectedAt, reportTime),
        { artifact: derivative?.artifact ?? record.artifact },
        derivative?.snapshotHash ?? record.snapshotHash,
        [
          ...record.limitations,
          ...(derivative
            ? [
                "Redacted derivative; original snapshot hash is in redaction-manifest.json",
              ]
            : []),
        ].join("; "),
      ];
    }),
  );
  table(
    "Rule provenance",
    ["Rule", "Reviewed", "Age at report time", "Sources", "Limitations"],
    registry.rules.map((rule) => [
      rule.ruleId,
      rule.lastReviewedAt,
      sourceAge(rule.lastReviewedAt, reportTime),
      rule.authoritativeSources.join("; "),
      rule.limitations,
    ]),
  );
  paragraph(
    "Next steps",
    validation.completionAllowed
      ? "Review substantive findings with the responsible domain owner before implementing changes. Measure outcomes separately using a stable cohort and appropriate source data."
      : "Resolve the listed scope, item and check gaps, refresh changed evidence, re-run validation and regenerate reports. Do not describe this run as a full audit until the completion gate passes.",
  );
  const htmlCell = (value) =>
    value && typeof value === "object" && "artifact" in value
      ? `<a href="${escapeHtml(pathUrl(value.artifact))}">${escapeHtml(value.artifact)}</a>`
      : htmlText(value);
  const mdCell = (value) =>
    value && typeof value === "object" && "artifact" in value
      ? `[${escapeMarkdown(value.artifact)}](${pathUrl(value.artifact)})`
      : mdText(value);
  const markdown =
    `# ${mdText(brand)} — Content Search Audit\n\n` +
    sections
      .map(
        (section) =>
          `## ${section.title}\n\n` +
          (section.text
            ? mdText(section.text)
            : section.rows.length
              ? `| ${section.headers.map(mdCell).join(" | ")} |\n| ${section.headers.map(() => "---").join(" | ")} |\n${section.rows.map((row) => `| ${row.map(mdCell).join(" | ")} |`).join("\n")}`
              : "No records.") +
          "\n",
      )
      .join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${htmlText(brand)} — Content Search Audit</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#17202a;background:#fff;margin:0}main{max-width:1200px;margin:auto;padding:32px 24px}h1{font-size:2rem;line-height:1.2}h2{margin-top:2.5rem}p{max-width:85ch}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border:1px solid #d5dbe1;padding:10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f2f4f6}a{color:#1752a0}footer{margin-top:3rem;color:#4c5966}@media print{main{padding:0}.table-wrap{overflow:visible}tr{break-inside:avoid}}</style></head><body><main><h1>${htmlText(brand)} — Content Search Audit</h1>${sections.map((section) => `<section><h2>${section.title}</h2>${section.text ? `<p>${htmlText(section.text)}</p>` : section.rows.length ? `<div class="table-wrap"><table><thead><tr>${section.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${section.rows.map((row) => `<tr>${row.map((value) => `<td>${htmlCell(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "<p>No records.</p>"}</section>`).join("")}<footer>Audit evidence and proposed actions; no automatic content changes or publication performed.</footer></main></body></html>\n`;
  const csv =
    [
      [
        "finding_id",
        "action",
        "action_origin",
        "action_reason",
        "title",
        "severity",
        "confidence",
        "classification",
        "item_ids",
        "remediation",
        "verification",
        "owner_role",
        "effort",
        "evidence_ids",
      ],
      ...findings.map((f) => [
        f.findingId,
        resolveActionProposal(f).action,
        resolveActionProposal(f).origin,
        resolveActionProposal(f).reason,
        f.title,
        f.severity,
        f.confidence,
        f.classification,
        f.affectedItemIds.join(";"),
        conditionalActionText(f, "remediation"),
        conditionalActionText(f, "verification"),
        f.ownerRole,
        f.effort,
        f.evidenceIds.join(";"),
      ]),
    ]
      .map((row) => row.map(csvText).join(","))
      .join("\r\n") + "\r\n";
  return {
    ...(presentation
      ? redactMeasurementDocuments(measurements.documents, presentation.redact)
      : measurements.documents),
    "report.md": markdown,
    "report.html": html,
    "coverage.json": JSON.stringify(displayObject(coverage), null, 2) + "\n",
    "content-actions.csv": csv,
  };
}

/** Writes only new report files into an existing validated stable run directory.
 * Existing reports require a new run/output revision rather than silent replacement. */
export async function renderReport(runDirectory, options = {}) {
  const registry =
    options.registry ??
    JSON.parse(
      await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
    );
  const audit = await loadAuditData(runDirectory);
  const documents = buildReportDocuments(audit, registry, options);
  for (const name of Object.keys(documents)) {
    try {
      await lstat(path.join(runDirectory, name));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error(`Report already exists: ${name}`);
  }
  const created = [];
  try {
    for (const [name, content] of Object.entries(documents)) {
      const target = path.join(runDirectory, name);
      await writeFile(target, content, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      created.push(target);
    }
  } catch (error) {
    await Promise.all(created.map((file) => rm(file, { force: true })));
    throw error;
  }
  return { files: created, coverage: JSON.parse(documents["coverage.json"]) };
}
