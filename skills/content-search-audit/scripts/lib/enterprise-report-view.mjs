import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  stableJson,
  enterpriseDigest,
  timestampValue,
} from "./enterprise-state.mjs";
import { validateEnterpriseReport } from "./enterprise-report-model.mjs";

const publicDisclosure =
  "Aggregate edition only. Detailed claims, identifiers, evidence and customer narrative are withheld. This is not permission to publish.";
const publicModuleIds = new Set(
  JSON.parse(
    await readFile(
      new URL("../../rules/enterprise.json", import.meta.url),
      "utf8",
    ),
  ).modules.map((module) => module.id),
);

export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const md = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/[[\]<>`*_{}|]/g, (char) => `\\${char}`)
    .replace(/\r?\n/g, " ");
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
const percentage = (value) =>
  value === null ? "Not assessed" : `${(value * 100).toFixed(1)}%`;

export function publicProjection(report) {
  validateEnterpriseReport(report);
  return {
    schemaFamily: "enterprise-public-report",
    schemaVersion: 1,
    edition: "public",
    revisionId: `public-${enterpriseDigest([report.revisionId, report.sourceRunDigest]).slice(0, 24)}`,
    generatedAt: report.generatedAt,
    parentReportDigest: enterpriseDigest(report),
    sourceRunDigest: report.sourceRunDigest,
    tool: report.tool,
    summary: report.summary,
    coverage: report.coverage,
    disclosure: publicDisclosure,
    brand: { name: "Website audit — public summary", accent: "#234e52" },
  };
}
function validatePublic(report) {
  const allowed = [
    "schemaFamily",
    "schemaVersion",
    "edition",
    "revisionId",
    "generatedAt",
    "parentReportDigest",
    "sourceRunDigest",
    "tool",
    "summary",
    "coverage",
    "disclosure",
    "brand",
  ];
  if (!report || Object.keys(report).some((key) => !allowed.includes(key)))
    throw new Error("Unexpected public report field");
  if (
    report?.schemaFamily !== "enterprise-public-report" ||
    report.schemaVersion !== 1 ||
    report.edition !== "public" ||
    !report.summary ||
    !report.coverage?.modules ||
    !/^#[a-f0-9]{6}$/i.test(report.brand?.accent)
  )
    throw new Error("Invalid public report");
  const exact = (value, keys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).length !== keys.length ||
      Object.keys(value).some((key) => !keys.includes(key))
    )
      throw new Error("Invalid public aggregate fields");
  };
  exact(report, allowed);
  if (
    !timestampValue(report.generatedAt) ||
    report.disclosure !== publicDisclosure ||
    typeof report.coverage.reportComplete !== "boolean" ||
    Array.isArray(report.coverage.modules) ||
    Object.keys(report.coverage.modules).some((id) => !publicModuleIds.has(id))
  )
    throw new Error("Invalid public metadata/scope");
  exact(report.tool, ["name", "version", "node", "sourceDigest"]);
  exact(report.brand, ["name", "accent"]);
  if (
    report.tool.name !== "enterprise-report" ||
    report.tool.version !== 1 ||
    !/^\d+\.\d+\.\d+$/.test(report.tool.node) ||
    !/^[a-f0-9]{64}$/.test(report.tool.sourceDigest) ||
    report.brand.name !== "Website audit — public summary" ||
    report.brand.accent !== "#234e52" ||
    !/^public-[a-f0-9]{24}$/.test(report.revisionId) ||
    !/^[a-f0-9]{64}$/.test(report.sourceRunDigest) ||
    !/^[a-f0-9]{64}$/.test(report.parentReportDigest)
  )
    throw new Error("Invalid public metadata");
  exact(report.coverage, ["modules", "reportComplete"]);
  exact(report.summary, [
    "reportComplete",
    "assessedChecks",
    "unknownChecks",
    "failedChecks",
    "notApplicableChecks",
    "applicableChecks",
    "assessmentCoverage",
    "findings",
    "untriagedFailedChecks",
    "siteHealth",
    "implementationStatus",
    "historicalObservations",
    "currentObservations",
    "reviewStatus",
    "reviewTargets",
    "acceptedReviewTargets",
  ]);
  const modules = Object.values(report.coverage.modules);
  if (
    report.coverage.reportComplete &&
    (!modules.length || modules.some((module) => !(module.total > 0)))
  )
    throw new Error("Vacuous public completeness");
  for (const module of modules)
    exact(module, [
      "total",
      "applicable",
      "passed",
      "failed",
      "unknown",
      "notApplicable",
      "assessmentCoverage",
      "status",
    ]);
  if (
    modules.some(
      (module) =>
        ![
          module.total,
          module.passed,
          module.failed,
          module.unknown,
          module.notApplicable,
          module.applicable,
        ].every((value) => Number.isSafeInteger(value) && value >= 0) ||
        module.total !==
          module.passed +
            module.failed +
            module.unknown +
            module.notApplicable ||
        module.applicable !== module.passed + module.failed + module.unknown ||
        module.assessmentCoverage !==
          (module.applicable
            ? (module.passed + module.failed) / module.applicable
            : null),
    )
  )
    throw new Error("Public coverage mismatch");
  for (const module of modules) {
    const validStatus =
      module.status === "assessed"
        ? module.total > 0 && module.unknown === 0
        : module.status === "partial"
          ? module.unknown > 0
          : module.status === "unplanned"
            ? module.passed === 0 &&
              module.failed === 0 &&
              module.notApplicable === 0
            : false;
    if (
      !validStatus ||
      (module.status === "unplanned" && report.coverage.reportComplete)
    )
      throw new Error("Invalid public module status");
  }
  const total = (key) => modules.reduce((sum, module) => sum + module[key], 0);
  if (
    report.summary.assessedChecks !== total("passed") + total("failed") ||
    report.summary.unknownChecks !== total("unknown") ||
    report.summary.failedChecks !== total("failed")
  )
    throw new Error("Public summary mismatch");
  const summary = report.summary,
    applicable = total("applicable"),
    assessed = total("passed") + total("failed");
  const expectedHealth = total("failed")
    ? "failed-checks-observed"
    : total("unknown") || !report.coverage.reportComplete
      ? "undetermined"
      : "no-failed-checks-in-declared-scope";
  const counters = [
    "findings",
    "untriagedFailedChecks",
    "historicalObservations",
    "currentObservations",
    "reviewTargets",
    "acceptedReviewTargets",
  ];
  if (
    counters.some(
      (key) => !Number.isSafeInteger(summary[key]) || summary[key] < 0,
    ) ||
    summary.acceptedReviewTargets > summary.reviewTargets ||
    summary.untriagedFailedChecks > summary.failedChecks ||
    summary.reportComplete !== report.coverage.reportComplete ||
    summary.applicableChecks !== applicable ||
    summary.notApplicableChecks !== total("notApplicable") ||
    summary.assessmentCoverage !==
      (applicable ? assessed / applicable : null) ||
    summary.siteHealth !== expectedHealth ||
    summary.reviewStatus !==
      (summary.reviewTargets > 0 &&
      summary.acceptedReviewTargets === summary.reviewTargets
        ? "reviewed"
        : "pending") ||
    !["proposed", "not-started"].includes(summary.implementationStatus)
  )
    throw new Error("Public summary invariant mismatch");
}
export function reportSections(report) {
  const sections = [];
  const add = (id, title, paragraphs = [], columns = [], rows = []) =>
    sections.push({ id, title, paragraphs, columns, rows });
  const s = report.summary;
  add("overview", "Scope and decision summary", [
    `Report accounting: ${s.reportComplete ? "all declared checks are represented" : "incomplete planning or missing declared checks"}. Assessment coverage: ${percentage(s.assessmentCoverage)}.`,
    `Site health: ${s.siteHealth}. Failed checks: ${s.failedChecks}. Unknown checks: ${s.unknownChecks}. Implementation: ${s.implementationStatus}.`,
    `Independent review: ${s.reviewStatus} (${s.acceptedReviewTargets}/${s.reviewTargets} targets accepted). Review attribution is not proof of reviewer independence.`,
    `Measurements attached: ${s.historicalObservations} historical and ${s.currentObservations} current. Historical results do not establish current performance.`,
  ]);
  add(
    "coverage",
    "Module coverage",
    [],
    [
      "Module",
      "Declared checks",
      "Pass",
      "Fail",
      "Unknown",
      "N/A",
      "Assessed",
      "Status",
    ],
    Object.entries(report.coverage.modules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, module]) => [
        id,
        module.total,
        module.passed,
        module.failed,
        module.unknown,
        module.notApplicable,
        percentage(module.assessmentCoverage),
        module.status,
      ]),
  );
  if (report.edition === "public") {
    add("limitations", "Disclosure", [
      report.disclosure,
      "No commercial acceptance or performance improvement is established by this summary.",
    ]);
    return sections;
  }
  add(
    "scope",
    "Declared scope and methods",
    [
      `Run: ${report.assessment.runId}. Inventory: ${report.assessment.inventoryMode}. Operation: ${report.assessment.operationMode}. Assessment time: ${report.assessment.assessmentAt}.`,
      `Planning stage: ${report.assessment.planningStatus ?? "unspecified"}. Profiles: ${Object.keys(report.assessment.profileVersions).sort().join(", ") || "not supplied"}.`,
    ],
    ["Entity", "Type"],
    report.assessment.entities.map((entity) => [entity.entityId, entity.type]),
  );
  add(
    "findings",
    "Findings and business impact",
    s.untriagedFailedChecks
      ? [
          `${s.untriagedFailedChecks} failed checks still need detailed finding records.`,
        ]
      : [],
    [
      "ID",
      "Severity / confidence",
      "Finding",
      "Observed detail",
      "Business impact",
      "Recommendation",
      "Verify",
      "Evidence",
    ],
    report.findings.map((item) => [
      item.findingId,
      `${item.severity} / ${item.confidence}`,
      item.title,
      item.description,
      item.businessImpact,
      item.recommendation,
      item.verification,
      item.evidenceIds.join(", "),
    ]),
  );
  add(
    "checks",
    "Assessment details",
    [],
    ["Check", "Module / entity", "Status", "Reason", "Evidence"],
    [
      ...report.assessment.checks,
      ...report.assessment.declaredScope.checks
        .filter(
          (declared) =>
            !report.assessment.checks.some(
              (check) => check.checkId === declared.checkId,
            ),
        )
        .map((declared) => ({
          ...declared,
          status: "unknown",
          reason: "Missing declared check; assessment is pending",
          evidenceIds: [],
        })),
    ].map((check) => [
      check.checkId,
      `${check.moduleId} / ${check.entityId}`,
      check.status,
      check.reason,
      check.evidenceIds.join(", "),
    ]),
  );
  add(
    "requests",
    "What to provide next",
    [
      "Requests retain declined, invalid and expired states. A provided artifact does not automatically pass an assessment.",
    ],
    [
      "Artifact / scope",
      "Status / priority",
      "Reason",
      "Accepted formats",
      "How to provide",
      "Access",
      "Owner role",
      "Fallback",
    ],
    report.dataRequests.map((request) => [
      `${request.requestedArtifact} / ${request.scopeKey}`,
      `${request.status} / ${request.priority}`,
      request.reason,
      request.acceptedFormats.join(", "),
      request.exportInstructions,
      request.leastPrivilegeAccess,
      request.suggestedOwnerRole,
      request.fallback,
    ]),
  );
  add(
    "actions",
    "Prioritized changes and verification",
    [
      "All actions here are proposals. Applying or publishing changes requires separate scoped authorization.",
    ],
    [
      "ID",
      "Findings",
      "Status",
      "Owner",
      "Effort estimate",
      "Change",
      "Acceptance check",
      "Dependencies",
    ],
    report.actions.map((action) => [
      action.actionId,
      action.findingIds.join(", "),
      action.status,
      action.ownerRole,
      action.effort,
      action.description,
      action.verification,
      action.dependencies.join(", "),
    ]),
  );
  add(
    "measurements",
    "Measurements and historical observations",
    [],
    [
      "ID",
      "Observation",
      "Value",
      "Unit / precision",
      "Classification",
      "Period",
      "Scope",
      "Evidence",
    ],
    report.observations.map((item) => [
      item.observationId,
      item.label,
      display(item.value),
      `${item.unit} / ${item.precision}`,
      item.classification,
      `${item.period.from} to ${item.period.to}`,
      item.scopeDescription,
      item.evidenceIds.join(", "),
    ]),
  );
  add(
    "narrative",
    "Attributed analysis",
    [
      "Narrative claims require evidence and independent review; the renderer does not establish their semantic truth.",
    ],
    ["ID", "Kind", "Analysis", "Evidence"],
    report.narrative.map((item) => [
      item.narrativeId,
      item.kind,
      item.text,
      item.evidenceIds.join(", "),
    ]),
  );
  add(
    "evidence",
    "Evidence index",
    [
      "Raw payloads remain in the private source run. Hashes identify snapshots; they do not authenticate the original provider.",
    ],
    ["Evidence", "Source", "Observed", "Valid until", "Digest"],
    report.assessment.evidence.map((item) => [
      item.evidenceId,
      item.source,
      item.observedAt,
      item.validUntil ?? "Unknown",
      item.digest,
    ]),
  );
  add(
    "review",
    "Review decisions",
    [],
    ["Target", "Verdict", "Reviewer / type", "Time", "Reason", "Target digest"],
    report.decisions.map((item) => [
      `${item.targetType}:${item.targetId}`,
      item.verdict,
      `${item.reviewerId} / ${item.reviewerType}`,
      item.reviewedAt,
      item.reason,
      item.targetDigest,
    ]),
  );
  add(
    "history",
    "Historical verdicts",
    ["Historical verdicts are excluded from current assessment counts."],
    [
      "Check",
      "Previous status",
      "Previous reason",
      "Invalidated",
      "Reasons",
      "Source run",
    ],
    (report.assessment.history ?? []).map((item) => [
      item.check.checkId,
      item.check.status,
      item.check.reason,
      item.invalidatedAt,
      item.reasons.join(", "),
      item.sourceRunId,
    ]),
  );
  add(
    "response-history",
    "Request response history",
    ["Responses are attributed statements, not proof of provider behavior."],
    ["Request", "Outcome", "Actor", "Time", "Statement"],
    (report.assessment.requestResponses ?? []).map((item) => [
      item.requestId,
      item.outcome,
      item.actor,
      item.at,
      item.text ?? item.reason,
    ]),
  );
  add("limitations", "Methodology and limitations", report.methodology);
  return sections;
}

export function renderEnterpriseReport(input, edition = "customer") {
  if (!["customer", "public"].includes(edition))
    throw new Error("Invalid report edition");
  let report;
  if (input?.schemaFamily === "enterprise-public-report") {
    if (edition !== "public")
      throw new Error("Cannot reconstruct private details from public edition");
    validatePublic(input);
    report = input;
  } else {
    validateEnterpriseReport(input);
    report = edition === "public" ? publicProjection(input) : input;
  }
  if (edition === "public") validatePublic(report);
  const sections = reportSections(report);
  const json = stableJson(report) + "\n";
  const markdown =
    [
      `# ${md(report.brand.name)}`,
      `Revision: ${md(report.revisionId)} · ${md(report.generatedAt)} · ${edition}`,
      ...sections.flatMap((section) => [
        `## ${section.title}`,
        ...section.paragraphs.map(md),
        ...(section.columns.length
          ? [
              [
                `| ${section.columns.map(md).join(" | ")} |`,
                `| ${section.columns.map(() => "---").join(" | ")} |`,
                ...section.rows.map(
                  (row) =>
                    `| ${row.map((value) => md(display(value))).join(" | ")} |`,
                ),
              ].join("\n"),
              ...(section.rows.length ? [] : ["No entries recorded."]),
            ]
          : []),
      ]),
    ].join("\n\n") + "\n";
  const css = `:root{color-scheme:light;--accent:${report.brand.accent}}*{box-sizing:border-box}body{margin:0;background:#f6f7f8;color:#17202a;font:16px/1.6 system-ui,sans-serif}main,header{max-width:1200px;margin:auto;padding:24px}header{border-bottom:3px solid var(--accent)}h1,h2{line-height:1.2;overflow-wrap:anywhere}h1{font-size:clamp(1.8rem,4vw,3rem)}h2{font-size:1.5rem;color:#234e52}section{background:white;padding:24px;margin:20px 0;border:1px solid #dce1e5;border-radius:8px}p,td{overflow-wrap:anywhere}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#234e52}a:focus-visible{outline:3px solid #b45309;outline-offset:4px}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{padding:10px;border-bottom:1px solid #dce1e5;text-align:left;vertical-align:top;min-width:110px}th{background:#eef2f4}caption{text-align:left;font-weight:600}.skip{position:absolute;left:-10000px}.skip:focus{left:16px;top:8px;background:white;padding:8px}@media(max-width:600px){main,header{padding:16px}section{padding:16px}}`;
  const styleHash = createHash("sha256").update(css).digest("base64");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'sha256-${styleHash}'; base-uri 'none'; form-action 'none'"><title>${escape(report.brand.name)}</title><style>${css}</style></head><body><a class="skip" href="#main">Skip to report</a><header><h1>${escape(report.brand.name)}</h1><p>Revision ${escape(report.revisionId)} · ${escape(report.generatedAt)} · ${edition}</p><nav aria-label="Report sections">${sections.map((section) => `<a href="#${section.id}">${section.title}</a>`).join("")}</nav></header><main id="main">${sections.map((section) => `<section id="${section.id}" aria-labelledby="${section.id}-title"><h2 id="${section.id}-title">${section.title}</h2>${section.paragraphs.map((text) => `<p>${escape(text)}</p>`).join("")}${section.columns.length ? `<div class="table-scroll" role="region" aria-label="${section.title}" tabindex="0"><table><caption>${section.title}</caption><thead><tr>${section.columns.map((value) => `<th scope="col">${escape(value)}</th>`).join("")}</tr></thead><tbody>${section.rows.map((row) => `<tr>${row.map((value) => `<td>${escape(display(value))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${section.rows.length ? "" : "<p>No entries recorded.</p>"}` : ""}</section>`).join("")}</main></body></html>\n`;
  const manifest =
    stableJson({
      schemaFamily: "enterprise-report-manifest",
      schemaVersion: 1,
      revisionId: report.revisionId,
      edition: report.edition,
      generatedAt: report.generatedAt,
      sourceRunDigest: report.sourceRunDigest,
      parentReportDigest: report.parentReportDigest,
      tool: report.tool,
      files: {
        "report.json": sha256(json),
        "report.md": sha256(markdown),
        "report.html": sha256(html),
      },
    }) + "\n";
  return { json, markdown, html, manifest };
}
