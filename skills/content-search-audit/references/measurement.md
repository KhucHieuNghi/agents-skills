# Importing supplied AI observations

`importMeasurements(observations, metadata)` in
`scripts/lib/measurements.mjs` accepts in-memory supplied exports. It performs no
network activity and does not subscribe to monitoring or upload artifacts.

## Metadata

Provide brand, an explicit lowercase array of brandHosts, synthetic (boolean) and
an artifacts object mapping responseArtifact IDs to exact UTF-8 response strings.
All observations in one import share the synthetic flag. Do not mix fixture and
real responses. Brand hosts match exactly: list www and subdomains intentionally.

## Observation records

Each record requires observationId, engine, surface (`api`, `consumer-ui`, or
`export`), model (use `unknown` if unavailable), searchMode (`enabled`, `disabled`,
`unknown`), locale, market, cohortId, cohortVersion, promptId, prompt, capturedAt
(timezone-bearing timestamp), repetition (positive integer), and status.

Captured records require responseArtifact, responseHash (SHA-256 of supplied UTF-8
bytes), annotationMethod, brandMentioned (boolean or null) and citations (array of
HTTP(S) URL strings or null). These are supplied annotations; the importer does
not invent them. Empty citations means a reviewed absence; null means unreviewed
or unavailable. Source authentication and annotation adjudication remain required
before using these numbers as business evidence.

Error records require errorReason and null mention/citation fields, without a
response artifact/hash. Errors remain in their segment's captureErrors count.
Identical repeated imports of one observation ID are deduplicated. Conflicting
reuse of an ID is rejected. Independently captured repetitions need distinct IDs.

## Interpretation

Each group separates engine, surface, model, search mode, locale, market and cohort
version. Mention rate uses captured responses with known mention annotations.
Citation rate uses captured responses with reviewed citation arrays, counting a
response once when at least one cited host matches. Neither metric is a share of
all citations. Counts, unknown annotations, errors and observation dates accompany
each rate. A zero denominator yields null, not zero. An empty import yields no
observed groups.

Accuracy requires the separately supplied claim review below. The importer does
not infer factual truth, business attribution, statistical confidence or
cross-period uplift. Comparisons require a compatible common cohort. It cannot prove that an export really came from a
claimed provider or that a citation supports a claim. Preserve these limitations
in reports, and keep synthetic labels visible.

## Supplied Search Console pages

`node scripts/audit.mjs import-search-console EXPORT.json` invokes the original
`importSearchConsole` adapter. It reads supplied JSON and emits normalized JSON to
stdout; no API calls, OAuth flow, credential storage or automatic report mutation.
This command remains inside the single content-search-audit skill.

Input envelope:

```json
{
  "sourceId": "gsc-export-2026-10",
  "property": "sc-domain:example.com",
  "locator": "approved export location",
  "capturedAt": "2026-11-16T00:00:00Z",
  "synthetic": false,
  "pages": [
    {
      "request": {
        "startDate": "2026-10-01",
        "endDate": "2026-10-31",
        "dimensions": ["page", "country"],
        "rowLimit": 25000,
        "startRow": 0
      },
      "responseText": "{\"rows\":[],\"responseAggregationType\":\"byPage\"}",
      "responseHash": "SHA-256 of exact responseText UTF-8 bytes; replace this placeholder"
    }
  ]
}
```

Retain original response strings, not reserialized approximations of their bytes.
Pages must describe one unchanged query, start at zero and have contiguous offsets.
Full last pages leave pagination pending; short/empty pages exhaust that supplied
query. Conflicting or duplicate dimension tuples fail, rather than silently
merging possibly shifting exports. Separate queries require separate imports.
The importer accepts up to 1000 pages and 32 MiB of response text; these are local
operational limits, not API promises. Request fields are allowlisted; omit tokens
and credentials. Export location and query text may themselves be sensitive and
must be reviewed before sharing output.

The [official query reference](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
(reviewed 2026-11-16) documents ordered dimension keys, Pacific-time date ranges,
response aggregation, incomplete-data metadata and API top-row limits. Therefore,
`paginationExhausted` never sets `populationComplete`: the latter stays false.
Missing rows are not zero observations. No cross-query totals, averaged CTR or
summed position are computed. Original metrics, request filters, freshness metadata
and response hashes remain attached for review. Search traffic is not an AI
citation or answer-accuracy measurement.

This receipt is integrity-checked supplied data, not proof of provider authenticity.
The host must cite it explicitly when using it in analysis and keep its missingness
and synthetic flag visible. Authenticated connector collection remains separate implementation work.
Supplied normalized logs use the [server-log contract](server-logs.md). Existing AI observation imports stay separate.

## Attach exports to the customer report

Use an options JSON object containing `searchConsoleExports: [EXPORT, ...]`, where
each element is the full original envelope above, not a previously computed receipt.
Up to 20 exports per provider and 32 MiB of combined serialized Search Console,
GA4, Bing and server-log input are accepted. Source IDs must be
unique. The renderer revalidates every response hash and recomputes receipts before
creating output. Different queries remain separate even when their time ranges overlap.

For a campaign, run:

```sh
node scripts/audit.mjs campaign-report SOURCE REVIEW_DIRECTORY NEW_DIRECTORY OPTIONS.json
```

The new report includes measurement provenance, filters, dates, synthetic labeling,
pagination gaps and links to `search-console-evidence.json`. That file preserves
original response strings and normalized receipts. The campaign report manifest
hashes it alongside the rendered reports. Keep it with the report when sharing;
query strings and source locators may contain sensitive business information.
It does not change the campaign, review receipt, check results or completion gate.

For an existing validated standalone run that has not yet been rendered:

```sh
node scripts/audit.mjs render-with-measurements RUN_DIRECTORY OPTIONS.json
```

This follows the existing new-only report contract and refuses to overwrite reports.
`start` and revisions already render automatically; the command does not retrofit
those outputs. Use campaign reporting for new report editions with measurements.
Standalone options also accept `brandName` and the existing AI `measurements`
input. The CLI rejects registry overrides. No provider connection is required.

## Supplied Google Analytics 4 reports

`node scripts/audit.mjs import-analytics EXPORT.json` validates supplied GA4 Data
API runReport pages. It does not connect to Google, resolve credentials or execute
filters. The envelope has `sourceId`, `property` (such as `properties/123`),
`locator`, timezone-bearing `capturedAt`, explicit `synthetic`, and `pages`.
Each page contains the original `request`, exact UTF-8 `responseText`, and its
SHA-256 `responseHash`. Maximum input: 1000 pages / 32 MiB response text.

Example request within a page:

```json
{
  "dateRanges": [{ "startDate": "2026-10-01", "endDate": "2026-10-31" }],
  "dimensions": [{ "name": "landingPagePlusQueryString" }],
  "metrics": [{ "name": "activeUsers" }, { "name": "purchaseRevenue" }],
  "offset": "0",
  "limit": "10000"
}
```

Use explicit absolute dates; resolve relative dates before collecting the export.
Queries, filters and date ranges must stay identical across contiguous pages.
Header order and metric names are checked against each response; changing headers,
row counts, query scope, duplicate dimension tuples and modified bytes are rejected.
Nested filter/cohort/metric expressions are retained as inert data. This is a
bounded ingestion contract, not a complete Google request-schema validator.

[Google's response contract](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/RunReportResponse)
defines ordered headers and a query-wide rowCount independent of page size.
The importer uses that count for pagination, retains dimension values exactly,
and preserves metric strings and types to avoid numeric precision loss. Supplied
provider totals/minimums/maximums are labeled separately; it computes no totals.

[Response metadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData)
carries sampling, thresholding, truncation, restrictions, currency, timezone and
empty-result explanations. Those fields are retained per page. Missing metadata
remains unknown; thresholding does not prove that rows were actually suppressed.
Even exhausted pagination leaves `populationComplete=false` because the receipt
does not prove complete tracking or provider authenticity.

[The query contract](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)
allows overlapping date ranges and omitted zero rows. Keep date-range/comparison
columns distinct. Missing records are not invented zeros, and users, sessions,
rates or revenue are never added across rows or queries by this helper. A landing
path does not authorize network access, establish site inventory completeness or
prove that an AI citation caused a visit or purchase. Official references reviewed
2026-11-16.

To attach GA4 data to either report renderer, include `analyticsExports: [EXPORT,
...]` in the report options JSON. All supported provider arrays may be present together.
The renderer recomputes receipts and saves original exports plus receipts in
`analytics-evidence.json`, independently of `search-console-evidence.json`.
Campaign manifests hash both files. Report tables show provider/query identity,
metric types, captured time, pending pages and complete per-page metadata;
synthetic labels and missing-data limitations remain visible. The row metrics and
provider aggregates are in the linked JSON, without arithmetic across exports.

Source IDs are unique within each provider; the provider/source pair identifies an
export. Combined source input is bounded to 32 MiB and each provider to 20 exports.
Malformed input fails before output creation. Measurements do not alter checks,
findings or the audit completion gate. Standalone existing-report restrictions
remain as documented above. Preserve all evidence bundles with the report; do not
relabel analytics as Search Console or AI observations.

## Supplied Bing traffic and AI dashboard evidence

`node scripts/audit.mjs import-bing EXPORT.json` is an offline importer. It uses no
API key, dashboard session, scraper or unofficial endpoint. Both input kinds use
`sourceId`, `siteUrl` (HTTP(S), no credentials), `locator`, timezone-bearing
`capturedAt`, explicit `synthetic`, `responseText` and its SHA-256 `responseHash`.
Each text artifact is limited to 16 MiB, with at most 100000 response rows.

`scope` requires nonempty strings for `locale`, `market`, `timezone`, `period` and
`surfaces`. Use `unknown` when unavailable; do not assume the provider has filtered
to a language or market. This is supplied scope metadata, not enforced API filtering.

### Search traffic

Set `kind: "search-query-stats"` and retain the exact GetQueryStats JSON response,
including its `d` array. The
[Microsoft GetQueryStats reference](https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getquerystats?view=bing-webmaster-dotnet)
describes top-query traffic with Query, Date, Clicks, Impressions,
AvgClickPosition and AvgImpressionPosition. The importer keeps the two averages
separate. Native `/Date(milliseconds-offset)/` and timezone-bearing ISO timestamps
are accepted; raw dates stay attached and UTC instants are additional fields.
It does not treat the offset suffix as a second shift of the native epoch value.
No all-query completeness, pooled position or AI citation rate is inferred.
Duplicate query/instant tuples and unsafe integer counts fail instead of silently
merging or rounding them. Empty exports do not manufacture zero-traffic rows.

### AI Performance mapping

Set `kind: "ai-performance-mapped"`. This is our explicit mapping schema, **not a
claimed public Bing API response schema**. Supply exact original dashboard/export
text as `sourceText` and `sourceHash`, plus `mapping` containing `method`, `reviewer`
and timezone-bearing `reviewedAt`. The separately hashed `responseText` contains:

```json
{
  "rows": [
    {
      "dimensions": { "topic": "Example", "page": "https://example.com/page" },
      "metrics": {
        "citations": { "kind": "exact", "value": 15 },
        "topicSize": { "kind": "approximate", "value": 1000 },
        "opportunityCitations": { "kind": "range", "lower": 100, "upper": 200 },
        "averageCitedPages": { "kind": "unknown", "reason": "not supplied" }
      }
    }
  ]
}
```

Dimensions may include page, groundingQuery, topic and date. Additional supported
metrics are sitesCited and queries. Keep each provider table's grain intact;
use separate imports for different tables/scopes. The helper validates structure,
hashes, duplicate tuples and precision kinds; it cannot prove a human mapping
matches the source or that the source really came from Bing.

[Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
distinguishes citations, daily average cited pages and sampled grounding queries.
Grounding phrases are retrieval evidence, not necessarily the original user prompt.
Aggregate citation counts do not establish ranking, answer correctness, answer-level
mention rates, traffic or conversions. Keep supported-surface scope visible.

[Topics Portfolio](https://blogs.bing.com/webmaster/2026/10/introducing-topics-portfolio-beta-in-ai-performance/)
uses approximate ecosystem metrics and ranges for opportunity citation volumes.
The importer therefore rejects exact topicSize/sitesCited/queries values and exact
opportunityCitations. It never computes range midpoints. Unknown metrics require a
reason without a numeric value. Topic classification is not a verified business
taxonomy; retain the provider's beta/directional limitations. These official sources
were reviewed 2026-11-16.

Both kinds return `populationComplete: false` and no computed totals. Retain the
source envelope and receipt for attributed review. To attach either Bing kind, add `bingExports: [EXPORT, ...]` to the same report
options used for Search Console and GA4. The renderer recomputes receipts before
creating output and saves exact source envelopes in `bing-evidence.json` alongside
normalized receipts. Campaign manifests hash this evidence bundle. Reports include
scope, mapping attribution, source/response hashes, synthetic labels and counts of
metric cells by precision kind; those counts are not citation totals. Full metric
values/ranges remain in the linked evidence bundle.

Each provider supports at most 20 exports; the combined serialized input across
all supported providers must fit 32 MiB. Source IDs must be unique within Bing, including
across its two input kinds. Existing standalone report files remain protected from
overwrite. Do not pass Bing receipts as Search Console/GA4/AI-response observations
or use measurements to close missing audit checks automatically.

## Supplied AI-answer accuracy reviews

A captured observation may include `accuracyReview`; omitted or null means
unreviewed. Capture errors cannot carry a review. This is supplied adjudication,
not automatic fact checking. Never infer accuracy from sentiment, mention or a
citation alone.

Review fields: `reviewer` (named reviewer), `reviewedAt` (actual ISO timestamp with
timezone), `claimsComplete` (explicit boolean), and `claims` (array). Each claim
has a unique `claimId` within its response, exact response `quote`, `verdict`
(`correct`, `incorrect`, `unknown`), nonempty `reason`, and `sources` array.
Consolidate repeated phrasings of the same material claim before annotation.

Correct/incorrect claims require at least one source. Each source has `artifact`
(a key in the same metadata.artifacts map), exact `sha256`, original `locator`,
`capturedAt`, and exact supporting `quote`. The importer verifies both source
bytes and quote presence. A URL alone does not supply evidence. Unknown claims
may use an empty source array but still require a reason and response quote.
Review time cannot precede response or source capture; submission uses the existing
five-minute future-clock tolerance. Plausible past timestamps and reviewer
identity are attributed data, not independently authenticated facts.

Example review, with actual times and source hashes to be supplied:

```json
{
  "reviewer": "Content owner",
  "reviewedAt": "2026-11-16T00:00:00Z",
  "claimsComplete": true,
  "claims": [
    {
      "claimId": "seats",
      "quote": "Basic includes three seats.",
      "verdict": "unknown",
      "reason": "No approved entitlement source was supplied",
      "sources": []
    }
  ]
}
```

Within each existing engine/surface/model/search-mode/locale/market/cohort group:

- `accuracy.claims` counts correct / (correct + incorrect) supplied material-claim
  judgments. Unknown claims are excluded and separately counted. This is accuracy
  among adjudicated claims, not all claims in an answer or all market responses.
- `accuracy.responses` counts fully correct responses / eligible fully reviewed
  responses. Eligibility requires a complete, nonempty claim inventory and no
  unknown verdict. One incorrect claim makes an eligible response incorrect.
- `reviewedResponses`, `unreviewedResponses`, `unknownClaims`,
  `incompleteInventories`, `emptyInventories` and `unresolvedResponses` expose
  missingness. The last three counts can overlap. Zero denominators yield null;
  empty inventories never imply perfect accuracy.

Both standalone and campaign reports accept `measurements: { observations,
metadata }` in options. They recompute mention/citation/accuracy, display counts
and limitations, and save exact supplied responses, source snapshots, reviews and
computed receipts in `ai-observation-evidence.json`. Campaign report manifests
hash this file. Keep it with the report and review supplied private data before
sharing. AI input counts toward the combined 32 MiB report measurement budget.
Malformed reviews fail before report output creation. Historical inputs without
reviews remain valid and show accuracy unavailable. Measurements do not resolve
missing audit checks or authorize content changes.

## Observation JSONL export

When AI measurements are supplied, both report paths also write
`ai-observations.jsonl`: one validated, deduplicated observation per line, in the
importer's stable order. Each exported row carries the authoritative bundle-level
`synthetic` flag, `evidenceBundle: "ai-observation-evidence.json"`, and that file's
SHA-256 as `evidenceBundleSha256`. These generated context fields override any
same-named untrusted input extensions; the exact original input remains in the
JSON evidence bundle. Response/source artifact bytes and metadata stay in that
bundle rather than being duplicated into every row. Keep both files together.

No AI input means no JSONL output. An explicitly supplied empty observation set
produces an empty JSONL file and unavailable rates; it does not invent a response.
Capture errors and unknown annotations remain records, not negative observations.
Campaign manifests hash both outputs. JSONL rows satisfy the observation schema;
schema validity alone does not validate the linked bundle or semantic truth.

## Sharing transformed measurement presentations

Both `redact-report` and `campaign-redact-report` accept an optional final
OPTIONS.json with the same supplied measurement inputs as the normal report path.
Inputs are validated before rendering; report counts/rates are computed from the
original validated data. Presentation masking happens before text escaping.

Measurement JSON attachments are wrapped as `kind: redacted-measurement-presentation`,
`sourceDocumentHash`, `limitations`, and `data`. JSONL uses the same wrapper for
each original record, with that record's source hash. The output manifest records
the hash of the complete transformed file. The wrapper deliberately does not match
the original import schema: never import these files as original observations or
revalidate masked quotes against unchanged raw-source hashes. Embedded receipt
hashes describe original inputs; the wrapper identifies that their string values
may have changed. Numbers and booleans are preserved; strings, including metric
strings if explicitly selected, can be masked and must be interpreted accordingly.

Keys remain schema field names. Literal policies cannot certify that every private
value has been found; supply encoded variants where necessary and review outputs.
The originals and policy remain private and unchanged. Missing inputs still produce
unavailable measurements, never synthetic zero observations.

## Historical study sources supplied in documents

A dated study aggregate is supplied measurement evidence even when current brand
observations, response-level records and provider exports are absent. Preserve
its actual scope and collection window in both the report and final reply; do not
summarize that state as "no measurements supplied". Publication date is not the
collection window. Do not fabricate individual AI responses from an aggregate.

Attach historical document evidence through `studySources` in report options
(`render-with-measurements`, `campaign-report`, or their redacted equivalents).
Each of 1–20 sources supplies:

- `sourceId`: unique nonempty ID; `kind`: `historical-study`.
- `locator`: supplied filename/URL/identifier; no fetching is implied.
- `sourceText`: the actual supplied text and `sourceHash`: its SHA-256 UTF-8 hash.
- `synthetic`: explicit boolean. Fixture or simulated observations must be true.
- `scope`: attributed source population, interface/locale and collection window;
  retain unknowns rather than inventing metadata.
- `limitations`: nonempty list including inference and missingness limitations.
- `passages`: 1–20 objects with one-based inclusive `startLine`, `endLine` and
  `quote`. Quote the complete relevant lines, including qualifications. CRLF
  line separators normalize to LF for passage comparison; the source hash binds
  the original bytes. Use sourceText from a faithful text extraction for PDFs,
  preserving original-file extraction provenance elsewhere in the audit.

The helper verifies source bytes and exact line spans and writes
`study-evidence.json`; all report paths display the same passages. It does not
verify study authenticity, interpretation, scope annotation or sampling quality.
Historical sources never create current visibility rates, observation rows or
completed audit checks. Source scope is explicitly labelled reviewer-supplied.
The source bundle includes full supplied text: review before sharing. Redacted
report commands mask declared string values and mark the bundle as a derivative.
Do not treat a masked passage as an original exact quote.

Combine `studySources` with real provider exports or AI response observations
when both exist. Empty provider fields mean no such export was attached to this
report, not that the supplied documents contain no measurements. Keep these
surfaces separate in the final narrative.
