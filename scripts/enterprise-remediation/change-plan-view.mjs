import { createHash } from "node:crypto";
import { planChanges } from "./change-plan.mjs";
import {
  enterpriseDigest,
  stableJson,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

const escape = (value) =>
  String(value ?? "Not supplied").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const md = (value) =>
  String(value ?? "Not supplied")
    .replace(/([\\`*_{}[\]()<>!|#+.~-])/g, "\\$1")
    .replace(/[\r\n]/g, " ");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) =>
  JSON.stringify(JSON.parse(stableJson(value)), null, 2);
const notice = "Draft — execution not authorized";
const disclosure =
  "Private customer dossier. Not permission to publish, execute, or resolve a finding. Zero planning gaps does not establish current authorization, dependency completion, rollback readiness or successful retest.";
const facts = (entry) => ({
  "Finding / check": `${entry.findingId} / ${entry.checkId}`,
  Owner: entry.ownerRole,
  "Asset / environment": entry.binding
    ? `${entry.binding.assetId} / ${entry.binding.environment}`
    : "Not mapped",
  Dependencies: entry.dependencies.length
    ? entry.dependencies.join(", ")
    : "None declared",
  "Proposed artifact SHA-256": entry.artifactDigest,
  "Required current artifact SHA-256": entry.preconditionDigest,
  "Rollback artifact SHA-256": entry.rollbackDigest,
  "Planning gaps": entry.gaps.length
    ? entry.gaps.join(", ")
    : "None recorded; execution remains unauthorized",
});

/** Private projection only. Host mappings/policies must be supplied independently of imported data. */
export function renderChangePlan({ plan, planningInput, hostContext }) {
  if (
    !hostContext ||
    !Array.isArray(hostContext.trustedAssetBindings) ||
    !Array.isArray(hostContext.trustedAcceptancePolicies)
  )
    throw new Error("Trusted host bindings required");
  const rebuilt = planChanges({
    ...planningInput,
    trustedAssetBindings: hostContext.trustedAssetBindings,
    trustedAcceptancePolicies: hostContext.trustedAcceptancePolicies,
  });
  if (enterpriseDigest(plan) !== enterpriseDigest(rebuilt))
    throw new Error("Change plan source or host binding mismatch");
  // All projections use the validated rebuilt value, never the imported object.
  const json = pretty(rebuilt) + "\n";
  const detail = (e) => ({
    baselineCheck: e.baselineCheck,
    reviewDigests: e.reviewDigests,
    acceptance: e.acceptance,
    sourceEvidence: e.sourceEvidence,
    dataRequests: e.dataRequests,
  });
  const metadata = {
    planId: rebuilt.planId,
    customerId: rebuilt.customerId,
    createdAt: rebuilt.createdAt,
    planDigest: rebuilt.planDigest,
    reportDigest: rebuilt.reportDigest,
    sourceRunDigest: rebuilt.sourceRunDigest,
  };
  const htmlFacts = (values) =>
    `<dl>${Object.entries(values)
      .map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`)
      .join("")}</dl>`;
  const markdown = [
    "# Change plan",
    "",
    notice,
    "",
    disclosure,
    "",
    ...Object.entries(metadata).map(([k, v]) => `- ${md(k)}: ${md(v)}`),
    "",
    ...rebuilt.entries.flatMap((e) => [
      `## ${md(e.changeId)}`,
      "",
      ...Object.entries(facts(e)).map(([k, v]) => `- ${md(k)}: ${md(v)}`),
      "",
      "### Required inputs",
      "",
      ...(e.dataRequests.length
        ? e.dataRequests.map(
            (r) =>
              `- ${md(r.reason)} — owner: ${md(r.ownerRole)}; provide: ${md(r.requestedArtifact)}; formats: ${md(r.acceptedFormats.join(", "))}; fallback: ${md(r.fallback)}`,
          )
        : [
            "No planning inputs requested. Authorization must still be checked at execution.",
          ]),
      "",
    ]),
    "## Limitations",
    "",
    ...rebuilt.limitations.map((x) => `- ${md(x)}`),
    "",
    "## Complete authoritative plan",
    "",
    "<pre>" + escape(json).replace(/!/g, "&#33;") + "</pre>",
    "",
  ].join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Change plan</title><style>body{margin:0;font:16px/1.6 system-ui,sans-serif;color:#18212b;background:#fff}main{max-width:64rem;margin:auto;padding:1.25rem}a{color:#174a8b}h1,h2,h3,h4{line-height:1.25;overflow-wrap:anywhere}section{border-top:1px solid #aeb7c0;margin-top:2rem;padding-top:1rem}dt{font-weight:700}dd{margin:0 0 1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 monospace;background:#f2f4f6;padding:1rem}p,dd,li{overflow-wrap:anywhere}summary{cursor:pointer;padding:.5rem}a:focus,summary:focus{outline:3px solid #174a8b;outline-offset:3px}.notice{border-left:4px solid #174a8b;padding:.75rem;background:#f2f4f6}</style></head><body><a href="#main">Skip to plan</a><main id="main" tabindex="-1"><h1>Change plan</h1><p class="notice"><strong>${notice}</strong></p><p>${disclosure}</p>${htmlFacts(metadata)}${rebuilt.entries.map((e) => `<section><h2>${escape(e.changeId)}</h2>${htmlFacts(facts(e))}<h3>Required inputs</h3>${e.dataRequests.length ? e.dataRequests.map((r) => `<article><h4>${escape(r.reason)}</h4>${htmlFacts({ Owner: r.ownerRole, Provide: r.requestedArtifact, Formats: r.acceptedFormats.join(", "), Fallback: r.fallback })}</article>`).join("") : "<p>No planning inputs requested. Authorization must still be checked at execution.</p>"}<details><summary>Acceptance, source evidence and review bindings</summary><pre>${escape(pretty(detail(e)))}</pre></details></section>`).join("")}<section><h2>Limitations</h2><ul>${rebuilt.limitations.map((x) => `<li>${escape(x)}</li>`).join("")}</ul><details><summary>Complete authoritative plan</summary><pre>${escape(json)}</pre></details></section></main></body></html>\n`;
  const manifest = {
    schemaFamily: "enterprise-change-plan-artifacts",
    schemaVersion: 1,
    edition: "private",
    planDigest: rebuilt.planDigest,
    files: {
      "plan.json": sha(json),
      "plan.md": sha(markdown),
      "plan.html": sha(html),
    },
  };
  return { json, markdown, html, manifest };
}

/** Exact replay checks projections as well as hashes; a self-signed manifest is insufficient. */
export function verifyChangePlanArtifacts({ artifacts, ...source }) {
  const expected = renderChangePlan(source);
  if (enterpriseDigest(artifacts) !== enterpriseDigest(expected))
    throw new Error("Change plan artifact mismatch");
  return true;
}
