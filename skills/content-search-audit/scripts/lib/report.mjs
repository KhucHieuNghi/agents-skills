import {
  closeReportView,
  findingView,
  openPriorities,
  openReportDetails,
  openReportView,
} from "./report-view.mjs";
import { deliverySummary } from "./delivery-summary.mjs";
import { redactMeasurementDocuments } from "./redacted-measurements.mjs";
import {
  resolveActionProposal,
  conditionalActionText,
} from "./action-proposal.mjs";
import { sourceAge, sourceAgeContext } from "./source-age.mjs";
import { lstat, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { URL } from "node:url";
import { loadAuditData, validateAuditData } from "./validate.mjs";
import { publicUrlLabel } from "./inventory.mjs";
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
export const publicReadinessHeaders = [
  "Item",
  "URL",
  "Readiness signal",
  "Status",
  "Basis",
  "Evidence",
  "Next verification",
];
const publicReadiness = new Map([
  [
    "aio-entity-consistency",
    [
      "Entity consistency",
      "Compare the page and the authoritative public entity record.",
    ],
  ],
  [
    "aio-retrievable-facts",
    [
      "Extractable facts",
      "Check that the public page presents concrete facts in context for the expected audience.",
    ],
  ],
  [
    "aeo-answer-evidence",
    [
      "Answer support",
      "Compare material answers with attributable public sources.",
    ],
  ],
]);
export function* publicReadinessRows(audit, publicUrls) {
  for (const check of audit.checks) {
    const signal = publicReadiness.get(check.ruleId);
    const url = publicUrls.get(check.itemId);
    if (!signal || !url) continue;
    const [label, retest] = signal;
    yield [
      check.itemId,
      url,
      label,
      check.status,
      check.reason,
      check.evidenceIds.join(", "),
      ["unknown", "fail"].includes(check.status) ? retest : "",
    ];
  }
}
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
  const delivery = deliverySummary(
    coverage,
    validation.completionAllowed,
    measurements.documents,
  );
  const publicReport =
    !presentation &&
    audit.run.sourceMode === "authorized-public-and-local-inventory";
  const publicUrls = new Map(
    publicReport
      ? audit.inventory
          .filter((item) => /^https?:\/\//i.test(item.uri))
          .map((item) => [item.itemId, publicUrlLabel(item.uri)])
      : [],
  );
  const report = {
    schemaVersion: 1,
    kind: "content-search-audit-public-report",
    runId: audit.run.runId,
    reportTime,
    brand,
    status,
    coverage,
    sections: [],
  };
  const { sections } = report;
  const paragraph = (title, text) => sections.push({ title, text });
  const table = (title, headers, rows) =>
    sections.push({ title, headers, rows });
  if (presentation)
    paragraph(
      "Redacted presentation",
      "This is a transformed display of a validated source audit, not a new audit. Linked artifacts are redacted derivatives. Counts retain source scope; quotations and locators may be masked. Only declared literal strings were removed; review before sharing. Supplied measurement attachments are transformed presentations, not original importable exports.",
    );
  paragraph("Delivery summary", delivery);
  if (publicReport)
    table(
      "Public audit targets",
      ["URL", "Item", "Collection state"],
      audit.inventory
        .filter((item) => publicUrls.has(item.itemId))
        .map((item) => [publicUrls.get(item.itemId), item.itemId, item.state]),
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
      ...(publicReport ? ["Affected URLs"] : []),
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
      ...(publicReport
        ? [
            f.affectedItemIds
              .map((id) => publicUrls.get(id))
              .filter(Boolean)
              .join(", "),
          ]
        : []),
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
  if (publicReport) {
    paragraph(
      "Interpreting public readiness",
      "These public readiness signals reuse attributable AIO and AEO checks. Use the next verification step for unresolved or failed signals. Measured GEO visibility requires observed AI responses.",
    );
    table("Public readiness signals", publicReadinessHeaders, [
      ...publicReadinessRows(audit, publicUrls),
    ]);
  }
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
    `# ${mdText(report.brand)} — Content Search Audit\n\n` +
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
  const backlog = sections.find(
    (section) => section.title === "Priority backlog",
  );
  const evidenceById = new Map(
    audit.evidence.map((entry) => [entry.evidenceId, entry]),
  );
  const priorities = backlog.rows
    .map((row, index) =>
      findingView({
        title: findings[index].title,
        row,
        headers: backlog.headers,
        cell: htmlCell,
        escape: htmlText,
        evidence: findings[index].evidenceIds.map((id) => {
          const record = evidenceById.get(id);
          return {
            artifact:
              presentation?.evidence.get(id)?.artifact ?? record.artifact,
          };
        }),
      }),
    )
    .join("");
  const details = sections
    .filter((section) => section !== backlog)
    .map(
      (section) =>
        `<section><h2>${htmlText(section.title)}</h2>${section.text ? `<p>${htmlText(section.text)}</p>` : section.rows.length ? `<div class="table-wrap"><table><thead><tr>${section.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${section.rows.map((row) => `<tr>${row.map((value) => `<td>${htmlCell(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "<p>No records.</p>"}</section>`,
    )
    .join("");
  const html =
    openReportView({
      brand: report.brand,
      status,
      total: coverage.total,
      audited: coverage.audited,
      escape: htmlText,
    }) +
    openPriorities(findings.length) +
    priorities +
    "</section>" +
    openReportDetails +
    details +
    "<p>Actions in this report are proposals. This audit made no changes to the site.</p>" +
    closeReportView;
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
  const documents = {
    ...(presentation
      ? redactMeasurementDocuments(measurements.documents, presentation.redact)
      : measurements.documents),
    "delivery-summary.md":
      (presentation ? presentation.redact(delivery) : delivery) + "\n",
    ...(publicReport
      ? { "report.json": JSON.stringify(report, null, 2) + "\n" }
      : {}),
    "report.md": markdown,
    "report.html": html,
    "coverage.json": JSON.stringify(displayObject(coverage), null, 2) + "\n",
    "content-actions.csv": csv,
  };
  if (publicReport) {
    const files = Object.fromEntries(
      ["report.json", "report.md", "report.html"].map((name) => [
        name,
        createHash("sha256").update(documents[name]).digest("hex"),
      ]),
    );
    documents["public-report-manifest.json"] =
      JSON.stringify(
        { schemaVersion: 1, runId: report.runId, files },
        null,
        2,
      ) + "\n";
  }
  return documents;
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
