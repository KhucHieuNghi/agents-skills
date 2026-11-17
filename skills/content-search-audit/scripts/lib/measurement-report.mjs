import { importMeasurements } from "./measurements.mjs";
import { measurementAgeRows } from "./source-age.mjs";
import { importServerLogs } from "./server-logs.mjs";
import { importBing } from "./bing.mjs";
import { importAnalytics } from "./analytics.mjs";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { importSearchConsole } from "./search-console.mjs";
/** Recompute receipts from supplied exports; never trust saved computed flags. */
export function prepareSearchConsoleReport(exports) {
  if (exports === undefined)
    return {
      documents: {},
      sections: [
        {
          title: "Search Console measurements unavailable",
          text: "No Search Console export supplied. Missing measurements are unknown, not zero. Audit completion does not imply measured search performance.",
        },
      ],
    };
  if (!Array.isArray(exports) || exports.length === 0 || exports.length > 20)
    throw new Error("Supply 1–20 Search Console exports");
  const serialized = JSON.stringify(exports);
  if (Buffer.byteLength(serialized) > 32 * 1024 * 1024)
    throw new Error("Report measurement bundle exceeds 32 MiB");
  const inputs = JSON.parse(serialized),
    seen = new Set();
  const receipts = inputs.map((input) => {
    const receipt = importSearchConsole(input);
    if (seen.has(receipt.sourceId))
      throw new Error("Duplicate measurement sourceId");
    seen.add(receipt.sourceId);
    return receipt;
  });
  const name = "search-console-evidence.json";
  const sections = [
    {
      title: "Search Console measurement interpretation",
      text: "Supplied exports are separate from audit coverage and AI visibility. No cross-query totals or causal uplift are calculated. Pagination exhaustion does not prove complete population coverage. Missing rows are not zeros. Hashes bind supplied data; they do not authenticate Google as its source.",
    },
  ];
  for (const receipt of receipts) {
    sections.push({
      title: "Search Console export",
      headers: ["Field", "Value"],
      rows: [
        ["Source", receipt.sourceId],
        ["Property", receipt.property],
        ["Locator", receipt.locator],
        ["Captured", receipt.capturedAt],
        [
          "Data label",
          receipt.synthetic
            ? "SYNTHETIC FIXTURE DATA — not live performance"
            : "Supplied measurement; authenticity requires review",
        ],
        ["Query and filters", JSON.stringify(receipt.query)],
        ["Query hash", receipt.queryHash],
        ["Date timezone", receipt.timezone],
        ["Supplied rows", receipt.rows.length],
        [
          "Pagination exhausted",
          receipt.paginationExhausted ? "Yes" : "No — more pages required",
        ],
        ["Population complete", "Not established"],
        [
          "Pending work",
          receipt.pendingQueue.map((entry) => entry.reason).join("; ") ||
            "None for supplied pagination; provider limits remain",
        ],
        ["Evidence bundle", { artifact: name }],
      ],
    });
    sections.push({
      title: "Search Console response provenance",
      headers: [
        "Source",
        "Page",
        "Rows",
        "Aggregation",
        "Freshness metadata",
        "Response SHA-256",
      ],
      rows: receipt.pages.map((page) => [
        receipt.sourceId,
        page.pageIndex,
        page.rowCount,
        page.responseAggregationType,
        JSON.stringify(page.metadata),
        page.responseHash,
      ]),
    });
  }
  return {
    sections,
    documents: {
      [name]:
        JSON.stringify(
          {
            schemaVersion: 1,
            exportsHash: createHash("sha256").update(serialized).digest("hex"),
            exports: inputs,
            receipts,
          },
          null,
          2,
        ) + "\n",
    },
  };
}

export function prepareAnalyticsReport(exports) {
  if (exports === undefined)
    return {
      documents: {},
      sections: [
        {
          title: "Analytics measurements unavailable",
          text: "No GA4 export supplied. Missing analytics is unknown, not zero; content readiness does not establish traffic or revenue.",
        },
      ],
    };
  if (!Array.isArray(exports) || !exports.length || exports.length > 20)
    throw new Error("Supply 1–20 analytics exports");
  const serialized = JSON.stringify(exports);
  if (Buffer.byteLength(serialized) > 32 * 1024 * 1024)
    throw new Error("Report measurement bundle exceeds 32 MiB");
  const inputs = JSON.parse(serialized),
    seen = new Set();
  const receipts = inputs.map((input) => {
    const receipt = importAnalytics(input);
    if (seen.has(receipt.sourceId))
      throw new Error("Duplicate analytics sourceId");
    seen.add(receipt.sourceId);
    return receipt;
  });
  const name = "analytics-evidence.json";
  const sections = [
    {
      title: "Analytics measurement interpretation",
      text: "GA4 observations remain separate from Search Console, AI visibility and audit coverage. No cross-row or cross-query totals, conversion attribution or causal uplift are inferred. Original metric strings/types and provider aggregates are retained in the evidence bundle. Pagination exhaustion does not establish complete tracking; missing metadata and rows remain unknown.",
    },
  ];
  for (const receipt of receipts) {
    sections.push({
      title: "GA4 export",
      headers: ["Field", "Value"],
      rows: [
        ["Provider/source", `${receipt.provider}/${receipt.sourceId}`],
        ["Property", receipt.property],
        ["Locator", receipt.locator],
        ["Captured", receipt.capturedAt],
        [
          "Data label",
          receipt.synthetic
            ? "SYNTHETIC FIXTURE DATA — not live analytics"
            : "Supplied analytics; authenticity requires review",
        ],
        ["Query and filters", JSON.stringify(receipt.query)],
        ["Query hash", receipt.queryHash],
        ["Supplied rows", receipt.rows.length],
        [
          "Pagination exhausted",
          receipt.paginationExhausted ? "Yes" : "No — more pages required",
        ],
        ["Population complete", "Not established"],
        [
          "Pending work",
          receipt.pendingQueue.map((entry) => entry.reason).join("; ") ||
            "None for supplied pagination; tracking limitations remain",
        ],
        ["Evidence bundle", { artifact: name }],
      ],
    });
    sections.push({
      title: "GA4 response provenance and limitations",
      headers: [
        "Source",
        "Page",
        "Rows / declared rows",
        "Metric types",
        "Provider metadata (null = unknown)",
        "Response SHA-256",
      ],
      rows: receipt.pages.map((page) => [
        receipt.sourceId,
        page.pageIndex,
        `${page.rowCount} / ${page.declaredRowCount}`,
        JSON.stringify(page.metricHeaders),
        JSON.stringify(page.metadata),
        page.responseHash,
      ]),
    });
  }
  return {
    sections,
    documents: {
      [name]:
        JSON.stringify(
          {
            schemaVersion: 1,
            exportsHash: createHash("sha256").update(serialized).digest("hex"),
            exports: inputs,
            receipts,
          },
          null,
          2,
        ) + "\n",
    },
  };
}

export function prepareBingReport(exports) {
  if (exports === undefined)
    return {
      documents: {},
      sections: [
        {
          title: "Bing measurements unavailable",
          text: "No Bing traffic or AI dashboard export supplied. Missing observations are unknown, not zero.",
        },
      ],
    };
  if (!Array.isArray(exports) || !exports.length || exports.length > 20)
    throw new Error("Supply 1–20 Bing exports");
  const serialized = JSON.stringify(exports);
  if (Buffer.byteLength(serialized) > 32 * 1024 * 1024)
    throw new Error("Report measurement bundle exceeds 32 MiB");
  const inputs = JSON.parse(serialized),
    seen = new Set();
  const receipts = inputs.map((input) => {
    const receipt = importBing(input);
    if (seen.has(receipt.sourceId)) throw new Error("Duplicate Bing sourceId");
    seen.add(receipt.sourceId);
    return receipt;
  });
  const name = "bing-evidence.json",
    sections = [];
  for (const receipt of receipts) {
    sections.push({
      title: "Bing measurement interpretation",
      text: receipt.limitations.join("; "),
    });
    sections.push({
      title: "Bing export",
      headers: ["Field", "Value"],
      rows: [
        ["Provider/source", `${receipt.provider}/${receipt.sourceId}`],
        ["Kind", receipt.kind],
        ["Site", receipt.siteUrl],
        ["Locator", receipt.locator],
        ["Captured", receipt.capturedAt],
        [
          "Data label",
          receipt.synthetic
            ? "SYNTHETIC FIXTURE DATA — not live Bing performance"
            : "Supplied export; provider authenticity requires review",
        ],
        ["Scope", JSON.stringify(receipt.scope)],
        [
          "Mapping attribution",
          receipt.mapping
            ? JSON.stringify(receipt.mapping)
            : "Native supplied response; no dashboard mapping",
        ],
        ["Rows", receipt.rows.length],
        ["Population complete", "Not established"],
        ["Response SHA-256", receipt.responseHash],
        ["Original source SHA-256", receipt.sourceHash],
        ["Evidence bundle", { artifact: name }],
      ],
    });
    if (receipt.kind === "ai-performance-mapped") {
      const precisions = Object.fromEntries(
        ["exact", "approximate", "range", "unknown"].map((kind) => [kind, 0]),
      );
      for (const row of receipt.rows)
        for (const metric of Object.values(row.metrics))
          precisions[metric.kind]++;
      sections.push({
        title: "Bing AI measurement precision",
        headers: ["Source", "Precision", "Metric cells (not citation totals)"],
        rows: Object.entries(precisions).map(([kind, count]) => [
          receipt.sourceId,
          kind,
          count,
        ]),
      });
    }
  }
  return {
    sections,
    documents: {
      [name]:
        JSON.stringify(
          {
            schemaVersion: 1,
            exportsHash: createHash("sha256").update(serialized).digest("hex"),
            exports: inputs,
            receipts,
          },
          null,
          2,
        ) + "\n",
    },
  };
}

export function prepareServerLogReport(exports) {
  if (exports === undefined)
    return {
      documents: {},
      sections: [
        {
          title: "Server-log measurements unavailable",
          text: "No normalized server-log export supplied. Crawl/access observations remain unavailable.",
        },
      ],
    };
  if (!Array.isArray(exports) || !exports.length || exports.length > 20)
    throw new Error("Supply 1–20 server-log exports");
  const serialized = JSON.stringify(exports);
  if (Buffer.byteLength(serialized) > 32 * 1024 * 1024)
    throw new Error("Report measurement bundle exceeds 32 MiB");
  const inputs = JSON.parse(serialized),
    seen = new Set();
  const receipts = inputs.map((input) => {
    const receipt = importServerLogs(input);
    if (seen.has(receipt.sourceId))
      throw new Error("Duplicate server-log sourceId");
    seen.add(receipt.sourceId);
    return receipt;
  });
  const name = "server-log-evidence.json",
    sections = [];
  for (const receipt of receipts) {
    sections.push({
      title: "Server-log interpretation",
      text: receipt.limitations.join("; "),
    });
    sections.push({
      title: "Server-log export",
      headers: ["Field", "Value"],
      rows: [
        ["Source", receipt.sourceId],
        ["Locator", receipt.locator],
        ["Captured", receipt.capturedAt],
        [
          "Data label",
          receipt.synthetic
            ? "SYNTHETIC FIXTURE DATA — not live access logs"
            : "Supplied normalized logs; server authenticity requires review",
        ],
        ["Scope", JSON.stringify(receipt.scope)],
        ["Normalization/redaction", JSON.stringify(receipt.normalization)],
        ["Accepted request lines", receipt.acceptedLines],
        ["Rejected lines", receipt.rejectedLines],
        ["Unknown status", receipt.unknownStatus],
        [
          "Supplied export fully parsed",
          receipt.suppliedExportParsed
            ? "Yes (not a whole-system coverage claim)"
            : "No — unresolved input",
        ],
        ["Source SHA-256", receipt.sourceHash],
        ["Evidence bundle", { artifact: name }],
      ],
    });
    sections.push({
      title: "Server-log pending work",
      headers: ["Source", "Kind", "Line", "Reason"],
      rows: receipt.pendingQueue.map((entry) => [
        receipt.sourceId,
        entry.kind,
        entry.line ?? "",
        entry.reason,
      ]),
    });
  }
  return {
    sections,
    documents: {
      [name]:
        JSON.stringify(
          {
            schemaVersion: 1,
            exportsHash: createHash("sha256").update(serialized).digest("hex"),
            exports: inputs,
            receipts,
          },
          null,
          2,
        ) + "\n",
    },
  };
}

/** One combined bound for the external exports attached to a report. */
export function prepareMeasurementReport(
  options = {},
  reportTime = new Date().toISOString(),
) {
  const input = {
    searchConsoleExports: options.searchConsoleExports,
    analyticsExports: options.analyticsExports,
    bingExports: options.bingExports,
    serverLogExports: options.serverLogExports,
    measurements: options.measurements,
  };
  if (Buffer.byteLength(JSON.stringify(input)) > 32 * 1024 * 1024)
    throw new Error("Combined report measurement exports exceed 32 MiB");
  const ai = prepareAIReport(input.measurements);
  const search = prepareSearchConsoleReport(input.searchConsoleExports);
  const analytics = prepareAnalyticsReport(input.analyticsExports);
  const bing = prepareBingReport(input.bingExports);
  const logs = prepareServerLogReport(input.serverLogExports);
  const documents = {
    ...ai.documents,
    ...search.documents,
    ...analytics.documents,
    ...bing.documents,
    ...logs.documents,
  };
  const ageRows = measurementAgeRows(documents, reportTime);
  return {
    sections: [
      ...ai.sections,
      ...search.sections,
      ...analytics.sections,
      ...bing.sections,
      ...logs.sections,
      ...(ageRows.length
        ? [
            {
              title: "Measurement source ages",
              text: `As of ${reportTime}; export/capture/review ages do not replace the underlying observation window.`,
              headers: [
                "Bundle",
                "Source / observation",
                "Date role",
                "Date",
                "Age at report time",
              ],
              rows: ageRows,
            },
          ]
        : []),
    ],
    documents: {
      ...ai.documents,
      ...search.documents,
      ...analytics.documents,
      ...bing.documents,
      ...logs.documents,
    },
  };
}

function prepareAIReport(input) {
  if (input === undefined)
    return {
      documents: {},
      sections: [
        {
          title: "Visibility measurements unavailable",
          text: "No AI response observations supplied. Readiness is not measured mentions, citations or factual accuracy; missing observations remain unknown.",
        },
      ],
    };
  const receipt = importMeasurements(input.observations, input.metadata);
  const metric = (value, unit = "reviewed responses") =>
    value.rate === null
      ? `Unavailable (0 ${unit})`
      : `${value.numerator}/${value.denominator} (${(value.rate * 100).toFixed(1)}%)`;
  const name = "ai-observation-evidence.json";
  const bundle =
    JSON.stringify({ schemaVersion: 1, input, receipt }, null, 2) + "\n";
  const bundleHash = createHash("sha256").update(bundle).digest("hex");
  const jsonl = receipt.observations
    .map(
      (observation) =>
        JSON.stringify({
          ...observation,
          synthetic: receipt.synthetic,
          evidenceBundle: name,
          evidenceBundleSha256: bundleHash,
        }) + "\n",
    )
    .join("");
  const sections = [
    {
      title: "Visibility measurement status",
      text: receipt.synthetic
        ? "SYNTHETIC FIXTURE DATA — not live visibility"
        : "Supplied observations; authenticity and annotation truth require independent review",
    },
    {
      title: "Visibility observations",
      headers: [
        "Engine",
        "Surface",
        "Model",
        "Search",
        "Locale/market",
        "Cohort",
        "Dates",
        "Mention",
        "Citation",
        "Capture errors",
        "Unknown mention/citation",
      ],
      rows: receipt.groups.map((g) => [
        g.engine,
        g.surface,
        g.model,
        g.searchMode,
        `${g.locale}/${g.market}`,
        `${g.cohortId}@${g.cohortVersion}`,
        `${g.from} – ${g.to}`,
        metric(g.mention),
        metric(g.citation),
        g.captureErrors,
        `${g.mentionUnknown}/${g.citationUnknown}`,
      ]),
    },
    {
      title: "Adjudicated AI-answer accuracy",
      headers: [
        "Segment",
        "Claim accuracy",
        "Fully reviewed response accuracy",
        "Unknown claims",
        "Reviewed/unreviewed responses",
        "Incomplete/empty/unresolved inventories",
      ],
      rows: receipt.groups.map((g) => [
        JSON.stringify([
          g.engine,
          g.surface,
          g.model,
          g.searchMode,
          g.locale,
          g.market,
          g.cohortId,
          g.cohortVersion,
        ]),
        metric(g.accuracy.claims, "adjudicated claims"),
        metric(g.accuracy.responses, "fully reviewed responses"),
        g.accuracy.unknownClaims,
        `${g.accuracy.reviewedResponses}/${g.accuracy.unreviewedResponses}`,
        `${g.accuracy.incompleteInventories}/${g.accuracy.emptyInventories}/${g.accuracy.unresolvedResponses}`,
      ]),
    },
    {
      title: "Accuracy denominator",
      text: "Claim accuracy uses correct/(correct+incorrect) supplied material-claim judgments; unknown claims are excluded and disclosed. Response accuracy includes only complete, nonempty claim inventories without unknown verdicts; all claims must be correct. Missing reviews and zero denominators are unavailable, never perfect. These are reviewer assertions, not automatic fact checks or population estimates; inventory exclusion counts can overlap.",
    },
    { title: "Measurement denominator", text: receipt.denominator },
    { title: "Measurement limitations", text: receipt.limitations.join("; ") },
    {
      title: "AI observation evidence",
      headers: ["Artifact"],
      rows: [[{ artifact: name }], [{ artifact: "ai-observations.jsonl" }]],
    },
  ];
  return {
    sections,
    documents: {
      [name]: bundle,
      "ai-observations.jsonl": jsonl,
    },
  };
}
