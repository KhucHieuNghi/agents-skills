# Report generation

`renderReport(runDirectory, options)` loads and validates the persisted run against
the packaged registry, then creates report.md, report.html, coverage.json, content-actions.csv and
delivery-summary.md alongside its evidence. It refuses invalid runs and existing
output files; use a new run/output revision instead of silently replacing a report.
The optional programmatic registry override is for trusted author tests only.

For a public collection run, the helper also writes `report.json` as the
canonical report model. Its status, coverage and sections drive the Markdown
and HTML views. The model contains evidence references and the priority backlog.
Raw snapshots stay in the run evidence directory. Deliver all three reports
from the same final run after persisting supported judgments through `review`.
A draft awaiting semantic review retains unknown checks in the report. The
public reports include the audited URL inventory and affected URLs for findings.
URL labels omit query strings and retain item IDs to distinguish variants. Review raw evidence before sharing because it can retain original URLs.
Keep the generated `public-report-manifest.json` with the report trio. Run
`node scripts/audit.mjs public-report-validate REPORT_DIRECTORY` to check that
all three delivered files match the manifest. The digest check can detect file
mismatch or edits. It does not certify judgments or authenticate the manifest.
The public readiness table carries forward reviewed entity consistency,
extractable facts and answer support with a verification step for each open
signal. Measured GEO visibility is tracked separately and stays unknown
without response observations.
The public JSON applies to normal public runs. The redaction workflow continues
to produce its separate presentation outputs.

For an already rendered run, use `render-revision SOURCE_RUN OPTIONS.json NEW_RUN`.
It validates the source configuration and snapshots, creates a new run identity
with `parentRunId`, and copies all retained evidence into the new complete folder
before writing reports with the supplied options. It preserves the original run
and its reports. The destination must be new and outside the source run, content
roots and installed skill package. Report options (including historical study
sources) are validated before creating the destination or its parents; the CLI
does not accept a registry override; the programmatic revision function rejects
one too. Config and its hash remain unchanged. Options are a complete replacement
of presentation inputs, not an attachment merge. Supply measurement/study inputs
explicitly for each edition. If the source has a rendered measurement attachment,
omitting its corresponding option is rejected before output with a resupply message;
an empty array or malformed replacement also fails validation. Empty options `{}`
are supported only when the source has no measurement attachments. Existing source
bundles are never implicitly trusted or copied as newly validated measurements.
This uses the
same empty-review revision path as `review`: supported evidence refresh rules can
reconcile stale unattributed checks, without introducing a new semantic verdict.

`buildReportDocuments(audit, registry, options)` returns the same report documents
without writing or copying evidence. Do not deliver these documents alone in a
different directory: use `render-revision` to preserve their local evidence links.
The HTML is self-contained and offline, with no remote fonts,
scripts or images. Customer brandName is optional; neutral styling applies when
no brand is supplied. Current deterministic labels are English; host narrative
translations must preserve validated counts and evidence references.

## Required content

Both human-readable formats share a single data model: audit status, coverage,
denominators and limitations, priority backlog, dimension counts, optional measured
visibility, inventory/check/missing-check appendices, evidence links, rule source
review dates and next steps. They do not reproduce raw evidence values. Evidence
links are local paths into the same run directory; move the run as a complete
folder to preserve them. Findings sort by severity, then confidence, then ID.

The CSV lists proposed actions, affected IDs, evidence, owner, effort and exact
verification. The initial default is update for observed findings and investigate
for inferred findings. It does not execute changes or infer a deletion/consolidation
approval. Keep/update/consolidate decisions still require the portfolio reviewer.

## Safety and interpretation

Text is escaped in HTML and Markdown; CSV cells are quoted and formula prefixes
neutralized. Filenames are encoded in evidence links. The report's CSP blocks
scripts and external resources. Review sensitive information before sharing even
though raw snapshots are not embedded. The folder itself still contains local
source evidence and may not be appropriate for external distribution.

Coverage complete does not mean all checks passed. A valid partial audit can be
rendered and is explicitly labeled Partial. Missing measurements are unavailable,
not zero. Optional measurements use importMeasurements; synthetic observations
are visibly labeled. No global SEO/GEO score or uplift forecast is generated.

The output writer assumes a stable trusted run directory and creates files with
owner-only permissions. It refuses pre-existing files before writing and removes
successfully created outputs if a later write fails. It is not a transaction across
process crashes; revalidate output presence after an interruption.

## Proposed action decisions

Both report paths preserve optional reviewer-supplied finding fields `action`
(`keep`, `update`, `consolidate`, `investigate`) and nonempty `actionReason`.
Supply both or neither. Unsupported action names, missing reasons and orphaned
reasons fail validation. HTML/Markdown and CSV expose the action, its origin and
reason alongside the existing recommendation, evidence and affected item IDs.
CSV consumers should use headers; columns may be added between versions.

An explicit decision is labelled `reviewer-proposal`. Without a decision, an
observed local finding defaults to `update`; an inferred local or unclassified
global finding defaults to `investigate`. These defaults are labelled
`default-triage`, with an explicit requirement for review. The helper never invents
`keep` or `consolidate`. `keep` means a proposed retention decision, not that every
check passed; `consolidate` does not merge inventory identities, remove evidence,
change completion, redirect URLs or grant implementation approval. Reviewer
judgments still need evidence and content-owner acceptance before implementation.

## Source-age reference

Each rendered report fixes one actual UTC report timestamp. Evidence captures,
global context captures and packaged rule review dates display their age against
that same timestamp. Unified report-manifest.json also retains reportTime.
Timestamp ages count complete elapsed 24-hour intervals; date-only rule reviews
use UTC calendar-day differences, labelled date only, without inventing a capture
time. Missing, invalid, timezone-ambiguous or future dates show unavailable rather
than zero or a negative age. Existing input validation still applies.

Historical study sources can be attached separately through `studySources`; see
[measurement contract](measurement.md#historical-study-sources-supplied-in-documents).
Their presence must remain visible in supplemental summaries even when no current
response-level observations were attached.

Attached measurement reports also list provider export capture dates, deduplicated
AI response/capture-attempt dates, supplied accuracy-review dates and each claim
source capture date. Provider/date roles remain separate. The age of an export is
not the age of its underlying observation window; publication date cannot replace
collection date. Review age does not mean the source was verified again today.
No age threshold changes a check, finding, coverage state, denominator or accuracy
rate. A historical claim may remain correct. These are timing annotations, not a
content-freshness score. Rendering the same data later may change report age text;
original input and measurement evidence bundles stay unchanged.

## Delivery summary

Both standalone and campaign renderers write `delivery-summary.md` and render
that same paragraph at the start of HTML/Markdown reports. It derives declared
and audited counts and completion from validated coverage, and attachment status
from validated measurement bundles. Use this generated paragraph as the factual
base of the executive summary and final reply; add the substantive findings,
priorities and recovery path separately. It is not a substitute for those judgments.
When translating, preserve its distinctions and compare the translation to the
original. For historical studies, also retain the source-specific dates, scope,
synthetic label and limitations from the measurement sections; the generated
paragraph does not summarize or authenticate their numerical results.

An attached export can contain zero usable observations; "attached" is not a
claim of measured performance. "Not attached" describes only the generated report,
not every source supplied to the host. If relevant supplied data was omitted,
attach it and regenerate before delivery. Redacted variants transform the summary
alongside the other report documents. Structural consistency of this paragraph
does not certify semantic correctness of the surrounding narrative.

Read the final validated `coverage.json` when composing the narrative and final
reply. Use the following fields, retaining the helper's definitions:

- Declared items: `total`.
- Fully audited items: `audited`.
- Unresolved items: `states.pending`, `states.failed`, `states.blocked` and
  `states.unsupported`, each named separately.
- Exclusions: `states.excluded`, with their recorded reasons.
- Completion: the validator's `completionAllowed`, with coverage limitations.

For a campaign, use its unified coverage envelope and label each denominator;
do not substitute a part's counts for campaign totals. Copy counts from the
validated output, not from the number of files read or findings discussed.
Describe successful collection/extraction separately from completed audit checks.
If every item is pending, report zero fully audited items even if every file was
inspected. A partial disclaimer does not correct an inaccurate audited count.
Mention only capture surfaces actually obtained; distinguish supplied/local
rendered DOM from engine rendering, and OCR from native PDF text.

## Redacted standalone/partition presentation

`redact-report SOURCE_RUN POLICY.json NEW_DIRECTORY [OPTIONS.json]` validates a configuration-bound
source and creates report.html, report.md, content-actions.csv, coverage.json, text
evidence derivatives and a hash manifest in a new directory. See the literal policy
in evidence-contract.md. Raw source/config/policy files are not copied.

The renderer uses original evidence and checks for validation and original numerical
coverage. It applies literal masking to displayed text before HTML/Markdown/CSV
escaping. Evidence links and displayed artifact hashes refer to the derivatives;
the manifest retains raw snapshot hash linkage. Reports visibly identify the result
as a transformed presentation; masked quotations must not be represented as exact
source quotations. This presentation cannot be passed off as a new validated run.

This command renders the base standalone/partition report. It does not copy an
existing customized narrative or campaign report. Optional supplied measurements
are validated and rendered as transformed attachments; see measurement.md.
Use campaign-redact-report for the unified campaign path. Exact matching cannot detect undeclared private data or transformed
variants; review every output before sharing. No privacy-clean certification is made.

## Conditional actions

For a conditional recommendation, persist the prerequisite once as nonempty
`actionCondition` on the finding. Write `remediation` (global: `recommendation`)
and `verification` as the consequent steps. All standalone and campaign report
formats scope both steps with the same condition. The condition qualifies the
action for an established defect; it is not evidence that a defect exists. For
example, an observed obsolete link can require an owner-approved replacement:

```json
{
  "actionCondition": "the owner approves the replacement destination",
  "remediation": "Replace the obsolete link with the approved destination",
  "verification": "Confirm the link resolves to the approved destination in a new capture"
}
```

When the prerequisite is false or unresolved, this proposal does not require the
change or its post-change verification. Do not claim the prerequisite was checked
without evidence. Omission preserves legacy text; it does not certify that an
existing free-text action is unconditional. The helper validates the field and
preserves it; it cannot infer undeclared prerequisites or certify semantic truth.
Carry the same condition into any supplemental narrative and final reply.

## Reading the HTML report

The standalone HTML opens with declared coverage and the proposed work. Each
finding shows the responsible role, proposed next step, and retest when those
fields were supplied. Open the scope disclosure for measurements, finding
details, and the full evidence inventory. The layout and offline brand assets
are presentation only. Preserve the JSON and Markdown from the same revision.

## Report language

Set `"reportLocale": "vi"` or `"reportLocale": "en"` in the standalone or
campaign config. English is the default for existing configs. To change the
presentation of an existing audit, pass `reportLocale` in the options JSON for
`render-revision` or `campaign-report` and write to a new directory. The option
localizes the main HTML labels, not the technical appendix or canonical schema.
Author finding titles, recommendations and retests in the selected language
before persisting them. Keep quotations, identifiers and URLs verbatim. Use
one primary report language for mixed-language requests unless the user asks
for a second edition.
