import { redactMeasurementDocuments } from "./redacted-measurements.mjs";
import { createLiteralRedactor } from "./redaction.mjs";
import {
  resolveActionProposal,
  conditionalActionText,
} from "./action-proposal.mjs";
import { sourceAge, sourceAgeContext } from "./source-age.mjs";
import { prepareMeasurementReport } from "./measurement-report.mjs";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import { evaluateCampaignReview } from "./campaign-review.mjs";
import { loadAuditData } from "./validate.mjs";
import { resolveRunOutput } from "./run.mjs";

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
const escapeCsv = (value) => {
  let text = String(value ?? "");
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
const urlPath = (value) =>
  value
    .split(path.sep)
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
      ),
    )
    .join("/");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function readReview(directory) {
  const file = path.join(directory, "review.json"),
    stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 32 * 1024 * 1024)
    throw new Error("Unsafe or oversized review receipt");
  return JSON.parse(await readFile(file, "utf8"));
}

/** Stream a unified offline report from bound source snapshots, never from saved result flags. */
export async function renderCampaignReport(
  sourceDirectory,
  reviewDirectory,
  outputDirectory,
  options = {},
) {
  return renderCampaign(
    sourceDirectory,
    reviewDirectory,
    outputDirectory,
    options,
  );
}
export async function renderRedactedCampaignReport(
  source,
  review,
  output,
  policy,
  options = {},
) {
  const redact = createLiteralRedactor(policy);
  return renderCampaign(
    source,
    review,
    output,
    options,
    (value) => redact(value).value,
  );
}
async function renderCampaign(
  sourceDirectory,
  reviewDirectory,
  outputDirectory,
  options,
  redact = null,
) {
  const show = (value) => (redact ? redact(String(value ?? "")) : value);
  const html = (value) => escapeHtml(show(value));
  const md = (value) => escapeMarkdown(show(value));
  const csv = (value) => escapeCsv(show(value));
  const display = (value) => {
    if (typeof value === "string") return show(value);
    if (Array.isArray(value)) return value.map(display);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, display(child)]),
      );
    return value;
  };
  const derivatives = [];
  const reportTime = new Date().toISOString();
  const measurements = prepareMeasurementReport(options, reportTime);
  if (redact)
    measurements.documents = redactMeasurementDocuments(
      measurements.documents,
      redact,
    );
  const bundle = await readReview(reviewDirectory);
  const assessment = await evaluateCampaignReview(sourceDirectory, bundle);
  const sourceRoot = await realpath(sourceDirectory),
    reviewRoot = await realpath(reviewDirectory);
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const coverageDocument = {
    schemaVersion: 1,
    scope: "campaign",
    campaignId: assessment.campaignId,
    itemCoverage: assessment.itemCoverage,
    completionAllowed: assessment.completionAllowed,
    globalReviewComplete: assessment.globalReviewComplete,
    unresolvedRuleIds: assessment.unresolvedRuleIds,
    denominator:
      "Unique declared content identities, with owned items and collection states counted separately; global review is an additional completion gate.",
    limitations: assessment.limitations,
  };
  const config = JSON.parse(
    await readFile(path.join(sourceRoot, "config.json"), "utf8"),
  );
  const manifest = JSON.parse(
    await readFile(path.join(sourceRoot, "campaign.json"), "utf8"),
  );
  const { output } = await resolveRunOutput(config, outputDirectory);
  for (const root of [sourceRoot, reviewRoot]) {
    const relative = path.relative(root, output);
    if (
      !relative ||
      (!relative.startsWith(`..${path.sep}`) &&
        relative !== ".." &&
        !path.isAbsolute(relative))
    )
      throw new Error(
        "Report output must be outside source campaign and review receipt",
      );
  }
  const brand = config.brandName ?? "Content audit";
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  const handles = new Map(),
    hashes = new Map();
  const files = [
    "report.md",
    "report.html",
    "content-actions.csv",
    "coverage.json",
    ...Object.keys(measurements.documents),
  ];
  async function derivative(value, sourceSnapshotHash, key, json = false) {
    const artifact = `redacted-${digest(key)}.txt`;
    const existing = derivatives.find((record) => record.artifact === artifact);
    if (!existing) {
      const bytes = json
        ? JSON.stringify(display(JSON.parse(value)), null, 2) + "\n"
        : show(value);
      await writeFile(path.join(output, artifact), bytes, {
        flag: "wx",
        mode: 0o600,
      });
      const snapshotHash = digest(bytes);
      derivatives.push({ artifact, sourceSnapshotHash, snapshotHash });
      hashes.set(artifact, createHash("sha256").update(bytes));
    }
    return { url: artifact, label: artifact };
  }
  const link = (absolute, label) => ({
    url: urlPath(path.relative(output, absolute)),
    label,
  });
  const htmlCell = (value) =>
    value && typeof value === "object" && "url" in value
      ? `<a href="${html(value.url)}">${html(value.label)}</a>`
      : html(value);
  const mdCell = (value) =>
    value && typeof value === "object" && "url" in value
      ? `[${md(value.label)}](${value.url})`
      : md(value);
  async function write(name, text) {
    await handles.get(name).writeFile(text, "utf8");
    hashes.get(name).update(text);
  }
  async function heading(title, description) {
    await write("report.md", `\n## ${md(title)}\n\n${md(description)}\n\n`);
    await write(
      "report.html",
      `<h2>${html(title)}</h2><p>${html(description)}</p>`,
    );
  }
  async function table(headers, produce) {
    await write(
      "report.md",
      `| ${headers.map(md).join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n`,
    );
    await write(
      "report.html",
      `<div class="table-wrap"><table><thead><tr>${headers.map((value) => `<th scope="col">${html(value)}</th>`).join("")}</tr></thead><tbody>`,
    );
    await produce(async (row) => {
      await write("report.md", `| ${row.map(mdCell).join(" | ")} |\n`);
      await write(
        "report.html",
        `<tr>${row.map((value) => `<td>${htmlCell(value)}</td>`).join("")}</tr>`,
      );
    });
    await write("report.html", "</tbody></table></div>");
  }
  let localFindings = 0;
  try {
    for (const file of files) {
      handles.set(file, await open(path.join(output, file), "wx", 0o600));
      hashes.set(file, createHash("sha256"));
    }
    await write(
      "coverage.json",
      JSON.stringify(display(coverageDocument), null, 2) + "\n",
    );
    for (const [name, content] of Object.entries(measurements.documents))
      await write(name, content);
    const status = assessment.completionAllowed
      ? "Complete for declared scope"
      : "Partial";
    await write(
      "report.md",
      `# ${md(brand)} — Content Search Audit\n\n${status}.\n`,
    );
    await write(
      "report.html",
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${html(brand)} — Content Search Audit</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#17202a;background:white;margin:0}main{max-width:1200px;margin:auto;padding:32px 24px}h1{line-height:1.2}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{border:1px solid #d5dbe1;padding:10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f2f4f6}a{color:#1752a0}@media print{.table-wrap{overflow:visible}tr{break-inside:avoid}}</style></head><body><main><h1>${html(brand)} — Content Search Audit</h1><p>${status}.</p>`,
    );
    await heading("Source age reference", sourceAgeContext(reportTime));
    if (redact)
      await heading(
        "Redacted presentation",
        "Transformed display of a validated campaign, not a new audit. Counts retain original scope. Links point to redacted text derivatives; SHA-256 table columns identify original evidence. Derivative hashes are in report-manifest.json. Original partition reports are omitted. Supplied measurement attachments are transformed presentations, not original exports. Only declared strings are masked; review before sharing.",
      );
    await heading(
      "Scope and coverage",
      "Counts use unique owned content, not repeated placeholder rows. Completion concerns audit coverage, not whether content is defect-free. Discovery completeness is a declared scope assertion.",
    );
    const coverage = assessment.itemCoverage;
    await table(["Metric", "Value"], async (emit) => {
      for (const row of [
        ["Campaign", manifest.campaignId],
        ["Declared items", coverage.total],
        ["Owned/attempted", coverage.owned],
        ["Collected", coverage.collected],
        ["Audited", coverage.audited],
        ["Inventory complete", coverage.inventoryComplete],
        ["Mode", coverage.mode],
        ["Unresolved items", coverage.unresolvedItems],
        ["Missing checks", coverage.missingChecks],
        ["Pending queue", coverage.pendingQueue.length],
        [
          "Global rules unresolved",
          assessment.unresolvedRuleIds.join(", ") || "None",
        ],
        ...Object.entries(coverage.states),
      ])
        await emit(row);
    });
    await heading(
      "Dimension coverage",
      "Supplied checks only; missing checks are reported separately. No combined SEO/GEO score is calculated.",
    );
    await table(
      [
        "Dimension",
        "Supplied",
        "Assessed pass/fail",
        "Unknown",
        "Not applicable",
      ],
      async (emit) => {
        for (const [dimension, values] of Object.entries(coverage.dimensions))
          await emit([
            dimension,
            values.total,
            values.completed,
            values.unknown,
            values.notApplicable,
          ]);
      },
    );
    await heading(
      "Global portfolio review",
      "Attributed judgments remain subject to domain review. Evidence hashes and valid references do not certify semantic truth or reviewer identity.",
    );
    await table(
      [
        "Rule",
        "Status",
        "Reason",
        "Reviewer",
        "Reviewed",
        "Applicability reason",
      ],
      async (emit) => {
        for (const review of bundle.reviews)
          await emit([
            review.ruleId,
            review.status,
            review.reason,
            review.reviewer,
            review.reviewedAt,
            review.applicabilityReason ?? "",
          ]);
      },
    );
    await heading(
      "Priority backlog",
      "Ordered by severity, then global findings and partition order. Confidence is separate. Each finding retains its scope; potentially overlapping findings are not silently merged. Proposed actions are not executed.",
    );
    await write(
      "content-actions.csv",
      [
        "scope",
        "finding_id",
        "severity",
        "confidence",
        "classification",
        "observation",
        "item_ids",
        "recommendation",
        "action",
        "action_origin",
        "action_reason",
        "verification",
        "owner_role",
        "effort",
        "evidence",
      ]
        .map(csv)
        .join(",") + "\r\n",
    );
    await table(
      [
        "Scope / finding",
        "Severity",
        "Confidence",
        "Classification",
        "Observation",
        "Affected items",
        "Recommendation",
        "Action",
        "Action origin",
        "Action reason",
        "Verification",
        "Owner role",
        "Effort",
        "Evidence",
      ],
      async (emit) => {
        async function finding(
          scope,
          findingId,
          severity,
          confidence,
          classification,
          observation,
          items,
          action,
          proposal,
          verification,
          ownerRole,
          effort,
          refs,
        ) {
          const labels = refs
            .map((ref) => `${ref.part}:${ref.evidenceId}`)
            .join("; ");
          await emit([
            `${scope} / ${findingId}`,
            severity,
            confidence,
            classification,
            observation,
            items.join(", "),
            action,
            proposal.action,
            proposal.origin,
            proposal.reason,
            verification,
            ownerRole ?? "Not supplied",
            effort ?? "Not supplied",
            labels,
          ]);
          await write(
            "content-actions.csv",
            [
              scope,
              findingId,
              severity,
              confidence,
              classification,
              observation,
              items.join(";"),
              action,
              proposal.action,
              proposal.origin,
              proposal.reason,
              verification,
              ownerRole ?? "Not supplied",
              effort ?? "Not supplied",
              labels,
            ]
              .map(csv)
              .join(",") + "\r\n",
          );
        }
        for (const severity of ["critical", "high", "medium", "low"]) {
          for (const f of bundle.findings.filter(
            (entry) => entry.severity === severity,
          ))
            await finding(
              "global",
              f.findingId,
              f.severity,
              f.confidence,
              "attributed global judgment",
              f.observation,
              f.affectedItemIds,
              conditionalActionText(f, "recommendation"),
              resolveActionProposal(f, { global: true }),
              conditionalActionText(f, "verification"),
              f.ownerRole,
              f.effort,
              f.evidenceReferences,
            );
          for (const part of manifest.parts) {
            const audit = await loadAuditData(path.join(sourceRoot, part.path));
            if (
              digest(JSON.stringify(audit)) !==
              bundle.partSnapshotHashes[part.path]
            )
              throw new Error("Source partition changed during report");
            for (const f of audit.findings.filter(
              (entry) =>
                entry.severity === severity &&
                entry.affectedItemIds.some((id) =>
                  part.ownedItemIds.includes(id),
                ),
            )) {
              localFindings++;
              await finding(
                part.path,
                f.findingId,
                f.severity,
                f.confidence,
                f.classification,
                f.title,
                f.affectedItemIds,
                conditionalActionText(f, "remediation"),
                resolveActionProposal(f),
                conditionalActionText(f, "verification"),
                f.ownerRole,
                f.effort,
                f.evidenceIds.map((evidenceId) => ({
                  part: part.path,
                  evidenceId,
                })),
              );
            }
          }
        }
      },
    );
    await heading(
      "Finding interpretation",
      `${localFindings} local findings; ${bundle.findings.length} global findings. Zero findings does not resolve unknown checks or demonstrate measured search visibility.`,
    );
    await heading(
      "Evidence and partition reports",
      redact
        ? "Evidence identifiers are scoped by partition. Links point to redacted derivatives. Original snapshots and partition reports remain private; original hashes below bind the source bytes."
        : "Evidence identifiers are scoped by partition. Links resolve to the original validated snapshots; keep source campaign and receipt with this report when sharing. Raw bodies are not embedded here.",
    );
    await table(
      [
        "Partition / evidence",
        "Item",
        "Kind",
        "Captured",
        "Age at report time",
        "SHA-256",
        "Artifact",
      ],
      async (emit) => {
        for (const part of manifest.parts) {
          await emit([
            redact
              ? `${part.path}: original partition report withheld`
              : link(path.join(sourceRoot, part.path, "report.md"), part.path),
            "",
            "Partition report",
            "",
            "",
            "",
            "",
          ]);
          const audit = await loadAuditData(path.join(sourceRoot, part.path));
          for (const record of audit.evidence)
            await emit([
              `${part.path}:${record.evidenceId}`,
              record.itemId,
              record.kind,
              record.collectedAt,
              sourceAge(record.collectedAt, reportTime),
              record.snapshotHash,
              redact
                ? await derivative(
                    audit.artifacts[record.artifact],
                    record.snapshotHash,
                    `${part.path}:${record.evidenceId}`,
                    record.encoding === "json",
                  )
                : link(
                    path.join(sourceRoot, part.path, record.artifact),
                    record.artifact,
                  ),
            ]);
        }
      },
    );
    await heading(
      "Global context evidence",
      "Context values and review source references are preserved in the linked receipt. Validate its bound source before interpreting judgments.",
    );
    await table(
      [
        "Evidence",
        "Kind",
        "Locator",
        "Collected",
        "Age at report time",
        "SHA-256",
        "Receipt",
      ],
      async (emit) => {
        for (const record of bundle.contextEvidence)
          await emit([
            record.evidenceId,
            record.kind,
            record.locator,
            record.collectedAt,
            sourceAge(record.collectedAt, reportTime),
            record.snapshotHash,
            redact
              ? await derivative(
                  await readFile(path.join(reviewRoot, "review.json"), "utf8"),
                  digest(await readFile(path.join(reviewRoot, "review.json"))),
                  "global-review-receipt",
                  true,
                )
              : link(path.join(reviewRoot, "review.json"), "review.json"),
          ]);
      },
    );
    await heading(
      "Remaining work",
      "Resolve these queues and unknown checks before claiming full coverage. Empty queues alone do not resolve unknown checks.",
    );
    await table(["Kind", "Item", "Reason"], async (emit) => {
      for (const entry of coverage.pendingQueue)
        await emit([
          entry.discoveryKind
            ? `${entry.kind}/${entry.discoveryKind}`
            : entry.kind,
          entry.itemId ?? entry.sourceId ?? entry.locator ?? "",
          entry.reason ?? "",
        ]);
    });
    await heading(
      "Measurements and interpretation",
      "No visibility metrics are inferred or pooled by this report. Consult explicitly supplied, dated, surface-specific measurements in the underlying evidence. Readiness is not measured mentions, citations, ranking or revenue; missing observations are unknown, not zero.",
    );
    for (const section of measurements.sections) {
      await heading(section.title, section.text ?? "");
      if (section.rows)
        await table(section.headers, async (emit) => {
          for (const row of section.rows)
            await emit(
              row.map((value) =>
                value && typeof value === "object" && "artifact" in value
                  ? link(path.join(output, value.artifact), value.artifact)
                  : value,
              ),
            );
        });
    }
    await heading(
      "Rule provenance",
      "Sources and review dates belong to the validated packaged rule registry; they do not certify current search outcomes.",
    );
    await table(
      ["Rule", "Reviewed", "Age at report time", "Sources", "Limitations"],
      async (emit) => {
        for (const rule of registry.rules)
          await emit([
            rule.ruleId,
            rule.lastReviewedAt,
            sourceAge(rule.lastReviewedAt, reportTime),
            rule.authoritativeSources.join("; "),
            rule.limitations,
          ]);
      },
    );
    await heading(
      "Next steps",
      assessment.completionAllowed
        ? "Review the evidence and proposed changes with the responsible owner; measure outcomes separately. No content changes or publication were performed."
        : "Resolve missing local/global evidence, complete declared discovery, apply new immutable reviews and regenerate this report. The current audit is partial.",
    );
    await write("report.html", "</main></body></html>\n");
    await evaluateCampaignReview(sourceRoot, bundle);
  } finally {
    await Promise.all([...handles.values()].map((file) => file.close()));
  }
  const result = {
    schemaVersion: 1,
    reportTime,
    campaignId: manifest.campaignId,
    status: assessment.status,
    sourceManifestHash: bundle.sourceManifestHash,
    reviewHash: digest(JSON.stringify(bundle)),
    coverage: assessment.itemCoverage,
    completionAllowed: assessment.completionAllowed,
    globalReviewComplete: assessment.globalReviewComplete,
    unresolvedRuleIds: assessment.unresolvedRuleIds,
    localFindings,
    globalFindings: bundle.findings.length,
    files: Object.fromEntries(
      [...hashes].map(([name, value]) => [name, value.digest("hex")]),
    ),
  };
  if (redact) {
    result.campaignId = show(result.campaignId);
    result.coverage = display(result.coverage);
  }
  if (redact)
    result.redaction = {
      kind: "literal-redacted-campaign-presentation",
      derivatives,
      limitations: [
        "Not a new audit or privacy certification. Undeclared strings may remain.",
        "Original partition reports are omitted; supplied measurements are transformed attachments.",
      ],
    };
  await writeFile(
    path.join(output, "report-manifest.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return { directory: output, ...result };
}
