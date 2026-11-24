# OpenSEO read-only pilot

Use this workflow only when the user requests OpenSEO for a declared public audit
target. It is optional. The URL-only workflow and supplied exports remain usable
without a connector.

## Connect and resolve the target

Follow the vendor's [Codex guide](https://openseo.so/docs/codex-plugin) or
[Claude Code guide](https://openseo.so/docs/claude-code-plugin). The user connects
OpenSEO in the host and chooses the Google integrations in that OpenSEO project.
Use [Google integration setup](https://openseo.so/docs/google-integrations).
Never ask for a token, password or verification code. Connector setup does not
switch projects or rebind Google properties.

1. Call `list_projects` in the active host session. For a requested bare domain,
   use its declared HTTPS URL. Write an input JSON object with `target`,
   `projects` from the response scoped to that session, and optional `projectId`
   selected by the user. Call `node scripts/audit.mjs openseo-plan INPUT.json`.
   The planner checks an exact hostname, including any subdomain. It performs
   no provider calls. If multiple matching projects exist, let the user choose.
   If no match or the tool is unavailable, continue URL-only and state the gap.
2. Confirm the project and the Search Console site and GA4 property using the
   project's integration settings. Ownership cannot be inferred from a similarly
   named property. Do not use `set_search_console_site`, `set_google_analytics_property`
   or `create_project` during an audit. If the applicable resource cannot be
   verified, skip that source and describe the gap.
3. Use a past date window before the capture date. Choose final GSC data and an
   explicitly comparable time window. Preview the intended project, sources,
   date range and crawl ID. The allowed reads use existing observations; no
   paid research, new crawl, project updates, tracker runs or report upload
   belong to this flow.
4. Save the connector's `structuredContent` as JSON without altering its fields.
   Evidence is the original JSON serialization captured by the host, never a
   reconstructed payload, pasted table, or direct export of the Google API.
   Inspect each returned response before drawing conclusions. If a receipt fails validation, omit it from the new report and record the reason in the handoff. Recollect it only when scope and permission are clear.

## Supported reads and scope

- `get_search_console_performance`: explicit `startDate`, `endDate`, `type: "web"`,
  `dataState: "final"`, and `dimensions: ["page"]`. Use a bounded first page without filters or a pagination offset
  and retain the real continuation status. Returned site, window and dimensions
  must match. Only declared inventory URLs are projected, with query values masked.
- `get_google_analytics_organic_overview`: supply both dates. The declared
  `analyticsProperty` must match the returned property ID, with the actual
  property timezone and Organic Search channel. Only sessions, active users,
  key events and transactions present as numeric values are projected. These
  are property-level measurements, not page- or keyword-level outcomes.
- `get_audit_pages`: after checking the saved audit scope and status through
  `list_site_audits` or `get_audit_status`, pass that explicit `auditId`, page
  and limit (1–100) without filters. Retain crawl pagination and fetch barriers. This result
  describes the original crawl, not the current site state or Google index.

API errors, empty results and partial pagination are distinct. Do not infer zero
from an empty result. A prioritized opportunity is a hypothesis to investigate,
never a promised change in clicks, ranking or conversions. No GSC/GA4 joins or
AI visibility measurements are produced by this pilot.

## Attach to a new report

Create a private options JSON file with `openseoEvidence`. Use the same
`reportLocale` as the audit. The receipt bundle has these fields:

| Field                                | Value                                                                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`, `synthetic`, `host` | `1`, whether the entire bundle is a fixture, and `codex` or `claude-code`                                                                                                                                                    |
| `target` and `project`               | Exact declared URL and the selected `{id, domain}`                                                                                                                                                                           |
| `searchConsoleProperty`              | Exact verified `siteUrl`, such as `sc-domain:example.com`, when attaching a successful GSC result                                                                                                                            |
| `analyticsProperty`                  | Exact verified property resource in `properties/123` format, for a successful GA4 result                                                                                                                                     |
| `receipts`                           | Up to twelve records of `{tool, capturedAt, request, responseText, responseHash}`. Capture time is UTC ISO with milliseconds. Preserve request arguments and project ID. Hash the UTF-8 bytes of `responseText` with SHA-256 |

Pass those options to `render-revision SOURCE_RUN OPTIONS.json NEW_RUN` or
`campaign-report SOURCE_CAMPAIGN REVIEW NEW_REPORT OPTIONS.json`. Use a new
output directory and keep the old revision. Validate the resulting directory
with `public-report-validate`. That command checks byte integrity only. The
option adds a separate connected-evidence section and a private
`openseo-evidence.json` file. It never changes saved crawl or audit verdicts,
or upgrades an unknown audit check.

Keep the connected report and receipt private. The filename
`public-report-manifest.json` identifies the existing public-URL report format
and does not grant permission to publish. A redacted report excludes OpenSEO
receipts. Sanitize the proposed customer summary separately if sharing is
requested.
