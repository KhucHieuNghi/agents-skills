import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { RESEARCH_DRAFT_LIMITATIONS } from "./research-projection.mjs";
const assert = (ok) => {
  if (!ok) throw Error("Invalid research customer draft");
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
  );
const uuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    v,
  );
const text = (v) =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= 8192 &&
  v.isWellFormed();
const fields = [
  "taskContext",
  "summary",
  "limitation",
  "recommendation",
  "retest",
];
const labels = {
  taskContext: "Task context",
  summary: "Observation or interpretation",
  limitation: "Limitations",
  recommendation: "Recommendation",
  retest: "Retest",
};
const kinds = {
  "observed-behavior": "Observed behavior",
  "participant-statement": "Participant statement",
  "analyst-interpretation": "Analyst interpretation",
};
const sha = (v) => createHash("sha256").update(v).digest("hex");
const html = (v) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const md = (v) =>
  v
    .replace(/([\\`*_{}[\]()#+.!|~-])/g, "\\$1")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/\r\n|\r|\n/g, "  \n");
const css =
  "body{font:18px/1.6 system-ui,sans-serif;color:#20242b;background:#fff;margin:auto;padding:1.25rem;max-width:70rem;overflow-wrap:anywhere}a{color:#174ea6}a:focus{outline:3px solid #174ea6;outline-offset:3px}h1,h2,h3{line-height:1.25}section,article{margin-block:2rem}article{border-top:2px solid #707780;padding-top:1rem}p{white-space:pre-wrap}dt{font-weight:700}dd{margin:0 0 1.25rem}.skip{display:block}small{font-size:1rem}";
function validate(d) {
  shape(d, [
    "schemaVersion",
    "editionId",
    "assessmentDate",
    "status",
    "synthetic",
    "items",
    "limitations",
  ]);
  assert(
    d.schemaVersion === 1 &&
      uuid(d.editionId) &&
      typeof d.assessmentDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.assessmentDate) &&
      timestampValue(d.assessmentDate + "T00:00:00Z"),
  );
  assert(
    [true, false, null].includes(d.synthetic) &&
      Array.isArray(d.items) &&
      d.items.length <= 1000,
  );
  assert(
    d.status === (d.items.length ? "reviewed-material-draft" : "inconclusive"),
  );
  assert(stableJson(d.limitations) === stableJson(RESEARCH_DRAFT_LIMITATIONS));
  const refs = new Set();
  for (const item of d.items) {
    shape(item, ["reference", "kind", ...fields, "reviewType"]);
    assert(
      uuid(item.reference) &&
        !refs.has(item.reference) &&
        Object.hasOwn(kinds, item.kind) &&
        ["ai", "human"].includes(item.reviewType) &&
        fields.every((f) => text(item[f])),
    );
    refs.add(item.reference);
  }
  assert(Buffer.byteLength(stableJson(d)) <= 16 * 1024 * 1024);
}
/** In-memory artifacts only. Input is customerDraft, never the enclosing private response. */
export function renderResearchDraft(draft) {
  validate(draft);
  const d = JSON.parse(stableJson(draft));
  const classification =
    d.synthetic === true
      ? "Synthetic evidence"
      : d.synthetic === false
        ? "Real-declared evidence; not authenticated"
        : "Evidence classification unknown";
  const summary = d.items.length
    ? "Reviewed material draft; not authorized for delivery"
    : "Inconclusive: no releasable observations in this draft";
  const json = stableJson(d) + "\n";
  const markdown = [
    "# Research findings — customer draft",
    "",
    summary,
    "",
    classification,
    "",
    `Assessment date: ${d.assessmentDate}`,
    "",
    `Edition: ${d.editionId}`,
    "",
    "## Scope and limitations",
    "",
    ...d.limitations.flatMap((s) => [md(s), ""]),
    ...d.items.flatMap((item, i) => [
      `## ${i + 1}. ${kinds[item.kind]}`,
      "",
      `Reference: ${item.reference}`,
      "",
      `Declared review: ${item.reviewType === "ai" ? "AI" : "Human"} (identity not authenticated)`,
      "",
      ...fields.flatMap((f) => [`### ${labels[f]}`, "", md(item[f]), ""]),
    ]),
  ].join("\n");
  const styleHash = createHash("sha256").update(css).digest("base64");
  const htmlText = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'sha256-${styleHash}'; base-uri 'none'; form-action 'none'"><title>Research findings — customer draft</title><style>${css}</style></head><body><a class="skip" href="#main">Skip to report</a><main id="main" tabindex="-1"><h1>Research findings — customer draft</h1><p>${html(summary)}</p><p>${html(classification)}</p><p>Assessment date: ${d.assessmentDate}</p><p>Edition: ${d.editionId}</p><section aria-labelledby="scope"><h2 id="scope">Scope and limitations</h2>${d.limitations.map((s) => `<p>${html(s)}</p>`).join("")}</section>${d.items.map((item, i) => `<article id="item-${item.reference}"><h2>${i + 1}. ${kinds[item.kind]}</h2><p>Reference: ${item.reference}</p><p>Declared review: ${item.reviewType === "ai" ? "AI" : "Human"} (identity not authenticated)</p><dl>${fields.map((f) => `<dt>${labels[f]}</dt><dd><p data-field="${f}">${html(item[f])}</p></dd>`).join("")}</dl></article>`).join("")}</main></body></html>\n`;
  return {
    json,
    markdown,
    html: htmlText,
    manifest: {
      schemaVersion: 1,
      renderer: "research-draft-v1",
      editionId: d.editionId,
      files: {
        "report.json": sha(json),
        "report.md": sha(markdown),
        "report.html": sha(htmlText),
      },
      limitations:
        "Digests establish artifact consistency only; no storage, delivery, review identity or current access is authenticated.",
    },
  };
}
/** Reject tampered derived bytes even if a caller recomputes manifest hashes. */
export function validateResearchDraftArtifacts(artifacts) {
  shape(artifacts, ["json", "markdown", "html", "manifest"]);
  assert(
    typeof artifacts.json === "string" &&
      Buffer.byteLength(artifacts.json) <= 16 * 1024 * 1024,
  );
  const expected = renderResearchDraft(JSON.parse(artifacts.json));
  assert(
    artifacts.json === expected.json &&
      artifacts.markdown === expected.markdown &&
      artifacts.html === expected.html &&
      stableJson(artifacts.manifest) === stableJson(expected.manifest),
  );
  return JSON.parse(expected.json);
}
