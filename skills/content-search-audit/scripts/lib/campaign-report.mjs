import {
  closeReportView,
  findingView,
  openPriorities,
  openReportDetails,
  openReportView,
} from "./report-view.mjs";
import { deliverySummary } from "./delivery-summary.mjs";
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
import { publicReadinessHeaders, publicReadinessRows } from "./report.mjs";
import { normalizeItems, publicUrlLabel } from "./inventory.mjs";

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
function publicLocatorLabel(locator) {
  if (typeof locator !== "string") return locator;
  try {
    const url = new URL(locator);
    return ["http:", "https:"].includes(url.protocol)
      ? publicUrlLabel(url.href)
      : locator;
  } catch {
    return /^https?:/i.test(locator.trim()) ? "Invalid public URL" : locator;
  }
}
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
  const bundle = await readReview(reviewDirectory);
  const assessment = await evaluateCampaignReview(sourceDirectory, bundle);
  const delivery = deliverySummary(
    assessment.itemCoverage,
    assessment.completionAllowed,
    measurements.documents,
  );
  if (redact)
    measurements.documents = redactMeasurementDocuments(
      measurements.documents,
      redact,
    );
  const sourceRoot = await realpath(sourceDirectory),
    reviewRoot = await realpath(reviewDirectory);
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
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
  const publicReport = !redact && Boolean(config.network);
  const coverage = publicReport
    ? {
        ...assessment.itemCoverage,
        pendingQueue: assessment.itemCoverage.pendingQueue.map((entry) =>
          entry.locator === undefined
            ? entry
            : { ...entry, locator: publicLocatorLabel(entry.locator) },
        ),
      }
    : assessment.itemCoverage;
  const coverageDocument = {
    schemaVersion: 1,
    scope: "campaign",
    campaignId: assessment.campaignId,
    itemCoverage: coverage,
    completionAllowed: assessment.completionAllowed,
    globalReviewComplete: assessment.globalReviewComplete,
    unresolvedRuleIds: assessment.unresolvedRuleIds,
    denominator:
      "Unique declared content identities, with owned items and collection states counted separately; global review is an additional completion gate.",
    limitations: assessment.limitations,
  };

  const publicUrls = new Map(
    publicReport
      ? normalizeItems(config.inputs, {
          trackingParameters: config.trackingParameters ?? [],
        })
          .filter((item) => /^https?:\/\//i.test(item.uri))
          .map((item) => [item.itemId, publicUrlLabel(item.uri)])
      : [],
  );
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { mode: 0o700 });
  const handles = new Map(),
    hashes = new Map();
  const files = [
    "report.md",
    "report.html",
    ...(publicReport ? ["report.json"] : []),
    "content-actions.csv",
    "coverage.json",
    "delivery-summary.md",
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
      ? `<a href="${value.url.startsWith("#") ? escapeHtml(value.url) : html(value.url)}">${html(value.label)}</a>`
      : html(value);
  const mdCell = (value) =>
    value && typeof value === "object" && "url" in value
      ? `[${md(value.label)}](${value.url})`
      : md(value);
  async function write(name, text) {
    await handles.get(name).writeFile(text, "utf8");
    hashes.get(name).update(text);
  }
  let firstBlock = true;
  async function startJsonBlock(text) {
    if (!publicReport) return;
    await write("report.json", (firstBlock ? "" : ",") + text);
    firstBlock = false;
  }
  async function heading(title, description, includeInHtml = true) {
    await startJsonBlock(JSON.stringify({ title, description }));
    await write("report.md", `\n## ${md(title)}\n\n${md(description)}\n\n`);
    if (includeInHtml)
      await write(
        "report.html",
        `<h2>${html(title)}</h2><p>${html(description)}</p>`,
      );
  }
  async function table(headers, produce, { present, identify } = {}) {
    await startJsonBlock('{"headers":' + JSON.stringify(headers) + ',"rows":[');
    let firstRow = true;
    await write(
      "report.md",
      `| ${headers.map(md).join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n`,
    );
    if (!present)
      await write(
        "report.html",
        `<div class="table-wrap"><table><thead><tr>${headers.map((value) => `<th scope="col">${html(value)}</th>`).join("")}</tr></thead><tbody>`,
      );
    await produce(async (row, references) => {
      if (publicReport) {
        await write("report.json", (firstRow ? "" : ",") + JSON.stringify(row));
        firstRow = false;
      }
      await write("report.md", `| ${row.map(mdCell).join(" | ")} |\n`);
      await write(
        "report.html",
        present
          ? present(row, references)
          : `<tr${identify ? identify(row) : ""}>${row.map((value) => `<td>${htmlCell(value)}</td>`).join("")}</tr>`,
      );
    });
    if (!present) await write("report.html", "</tbody></table></div>");
    if (publicReport) await write("report.json", "]}");
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
    await write(
      "delivery-summary.md",
      (redact ? redact(delivery) : delivery) + "\n",
    );
    for (const [name, content] of Object.entries(measurements.documents))
      await write(name, content);
    const status = assessment.completionAllowed
      ? "Complete for declared scope"
      : "Partial";
    if (publicReport) {
      const metadata = {
        schemaVersion: 1,
        kind: "content-search-audit-public-campaign-report",
        campaignId: manifest.campaignId,
        brand,
        reportTime,
        status,
        coverage: coverageDocument,
      };
      await write(
        "report.json",
        JSON.stringify(metadata).slice(0, -1) + ',"blocks":[',
      );
    }
    await write(
      "report.md",
      `# ${md(brand)} — Content Search Audit\n\n${status}.\n`,
    );
    await write(
      "report.html",
      openReportView({
        brand,
        status,
        total: coverage.total,
        collected: coverage.collected,
        audited: coverage.audited,
        escape: html,
      }) + openPriorities(),
    );
    await heading(
      "Priority backlog",
      "Ordered by severity, then global findings and partition order. Confidence is separate. Each finding retains its scope; potentially overlapping findings are not silently merged. Proposed actions are not executed.",
      false,
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
    const findingHeaders = [
      "Scope / finding",
      "Severity",
      "Confidence",
      "Classification",
      "Observation",
      "Affected items",
      ...(publicReport ? ["Affected URLs"] : []),
      "Recommendation",
      "Action",
      "Action origin",
      "Action reason",
      "Verification",
      "Owner role",
      "Effort",
      "Evidence",
    ];
    const evidenceAnchor = (label) => `evidence-${digest(label)}`;
    await table(
      findingHeaders,
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
          await emit(
            [
              `${scope} / ${findingId}`,
              severity,
              confidence,
              classification,
              observation,
              items.join(", "),
              ...(publicReport
                ? [
                    items
                      .map((id) => publicUrls.get(id))
                      .filter(Boolean)
                      .join(", "),
                  ]
                : []),
              action,
              proposal.action,
              proposal.origin,
              proposal.reason,
              verification,
              ownerRole ?? "Not supplied",
              effort ?? "Not supplied",
              labels,
            ],
            refs,
          );
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
      {
        present: (row, refs) =>
          findingView({
            title: row[4],
            row,
            headers: findingHeaders,
            cell: htmlCell,
            escape: html,
            evidence: refs.map((ref, index) => ({
              url: `#${evidenceAnchor(`${ref.part}:${ref.evidenceId}`)}`,
              label: `Evidence ${index + 1}`,
            })),
          }),
      },
    );
    if (localFindings === 0 && bundle.findings.length === 0)
      await write(
        "report.html",
        "<p>No findings were recorded. Open the scope below to see what was checked and which checks remain unverified.</p>",
      );
    await write("report.html", "</section>" + openReportDetails);
    await heading("Delivery summary", delivery);
    if (publicReport) {
      await heading("Public audit targets", "Declared public URL inventory.");
      await table(["Item", "URL"], async (emit) => {
        for (const [itemId, url] of publicUrls) await emit([itemId, url]);
      });
    }
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
      {
        identify: (row) =>
          row[2] === "Partition report"
            ? ""
            : ` id="${evidenceAnchor(row[0])}"`,
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
            publicReport ? publicLocatorLabel(record.locator) : record.locator,
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
    if (publicReport) {
      await heading(
        "Public readiness signals",
        "These signals reuse attributable AIO and AEO checks. Use the next verification step for unresolved or failed signals. Measured GEO visibility requires observed AI responses.",
      );
      await table(publicReadinessHeaders, async (emit) => {
        for (const part of manifest.parts) {
          const audit = await loadAuditData(path.join(sourceRoot, part.path));
          if (
            digest(JSON.stringify(audit)) !==
            bundle.partSnapshotHashes[part.path]
          )
            throw new Error("Source partition changed during report");
          const ownedUrls = new Map(
            part.ownedItemIds
              .filter((id) => publicUrls.has(id))
              .map((id) => [id, publicUrls.get(id)]),
          );
          for (const row of publicReadinessRows(audit, ownedUrls))
            await emit(row);
        }
      });
    }
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
    await write("report.html", closeReportView);
    if (publicReport) await write("report.json", "]}\n");
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
    coverage,
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
  if (publicReport) {
    const files = Object.fromEntries(
      ["report.json", "report.md", "report.html"].map((name) => [
        name,
        result.files[name],
      ]),
    );
    await writeFile(
      path.join(output, "public-report-manifest.json"),
      JSON.stringify(
        { schemaVersion: 1, campaignId: manifest.campaignId, files },
        null,
        2,
      ) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  }
  return { directory: output, ...result };
}
