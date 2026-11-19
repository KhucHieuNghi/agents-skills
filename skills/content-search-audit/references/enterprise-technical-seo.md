# Technical SEO evidence workflow

Evaluation candidate only. Use Node 22 or newer. These commands process supplied
evidence; they do not crawl a site, authorize collection or certify a release.
Use the [intake](enterprise-intake.md) to create a run with `technical-seo` in scope.
Use the [report workflow](enterprise-report.md) for canonical JSON and derived
Markdown/HTML, owner requests, independent review and parent-bound revisions.

From the installed skill directory:

```sh
node scripts/audit.mjs enterprise-technical-seo-evaluate RUN EVALUATIONS.json NEW_RUN
node scripts/audit.mjs enterprise-technical-seo-acquisition RUN ATTEMPTS.json NEW_ATTEMPT_RUN
```

Every output directory must be new. Keep private source runs outside public report
delivery. Neither command modifies the source run or the customer website.

Start with the synthetic [canonical evaluation](../examples/enterprise-technical-seo-evaluations.json)
and [failed attempt](../examples/enterprise-technical-seo-attempts.json) examples.
Their all-zero sourceDigest is deliberately unbound: replace it with the current
run digest. Replace fixture identities, URL, owner expectations and times with
actual evidence before customer use; do not relabel old fixture data as a live
capture. Recompute artifactHash whenever artifactText changes. Keep synthetic
attempts marked synthetic. To derive the current run digest from this directory:

```sh
node --input-type=module -e 'import {loadEnterpriseRun,enterpriseDigest} from "./scripts/lib/enterprise-state.mjs"; console.log(enterpriseDigest(await loadEnterpriseRun(process.argv[1])));' /absolute/path/to/RUN
```

## Evaluations

Input is `{sourceDigest,newRunId,assessmentAt,evaluations}`. Obtain sourceDigest
from the receipt returned when creating that run (intake or the preceding workflow).
For an existing run, use `loadEnterpriseRun` and `enterpriseDigest` exported by
`scripts/lib/enterprise-state.mjs`; do not hash formatted run JSON manually. Each
evaluation is `{evaluationId,kind,window,context,sources}`. Window is `{from,to}`
with UTC timestamps, inclusive start and exclusive end, ending no later than
assessmentAt. Each sources array has exactly one envelope:
`{sourceId,artifactText,artifactHash}`. Preserve original JSON text in artifactText;
artifactHash is its UTF-8 SHA-256. A hash establishes integrity, not authenticity.

Context binds entityId, environment, targetUrl and maxAgeSeconds. Browser kinds
also bind profileId and stateId. The workflow adds customerId and assessmentAt;
do not supply those in entry context. Read the exact capture/context contracts in
the linked evaluators before preparing evidence; provider responses alone are not
the scoped envelope.

| kind                     | Additional context / source contract                                                                                                                  | Assessment limits                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| canonical                | expectedCanonical (URL or null); [capture contract](../scripts/lib/technical-seo/canonical.mjs)                                                       | Declared source/rendered/HTTP canonical consistency; owner intent can remain unknown |
| gsc-url-inspection       | property, expectedCanonical, expectedIndexed; [inspection contract](../scripts/lib/technical-seo/url-inspection.mjs)                                  | Supplied provider retrieval and last crawl, not live index state                     |
| index-controls           | crawler: googlebot, expectedHttpStatus, expectedCrawlAllowed, expectedIndexable; [controls contract](../scripts/lib/technical-seo/index-controls.mjs) | Observed HTTP, robots and noindex, not proof of indexing                             |
| hreflang                 | method: html-source or html-rendered; [graph contract](../scripts/lib/technical-seo/hreflang.mjs)                                                     | Root codes, mapping and direct return links; no content-language/equivalence proof   |
| declared-target-controls | relationship: canonical or hreflang; method null for canonical; [target contract](../scripts/lib/technical-seo/target-controls.mjs)                   | Direct target response, Googlebot allowance and noindex absence                      |
| structured-data          | method, expectedTypes (array or null); [JSON-LD contract](../scripts/lib/technical-seo/structured-data.mjs)                                           | Inline syntax, basic shape, owner type policy and pinned class membership only       |

Absent owner policy stays null/unknown where supported. Do not infer expectations
from the observed page. A supplied answer updates a request, not its semantic check.
An owner answer of "no preference" still leaves expectedCanonical null and the
owner-intent check unknown. Retest plans must preserve that branch: assess observed
consistency independently and require owner-intent pass only when a concrete owner
expectation exists. Source/rendered disagreement does not identify a rewrite,
script, template or cause; name the discrepancy and investigate its mechanism.
Unsupported contexts, missing target captures and incomplete observations create
targeted requests with owner, formats and recovery instructions.

For a recovery action, write acceptance against check identities: name the
original obligation and its current status, the new evaluation population, and
the statuses to inspect in the resulting run/report. A `gsc-url-inspection`
evaluation creates separately scoped provider checks. It does not resolve or
replace the `provider-index-state` placeholder from a canonical or other non-GSC
evaluation. Retain that original unknown check and request, and report the new
provider assessment alongside it. Reusing the original evaluation ID for a
different kind is a rejected scope change. Do not promise that supplying an
export closes the original obligation, or prescribe deleting it to improve
coverage. Only describe a replacement when a supported workflow has actually
recorded a scope-matched disposition; this technical SEO workflow has no such
automatic replacement. A report revision preserves these distinctions rather
than merging checks because their descriptions sound similar.

The result includes findings and observations for the report bundle. Preserve
existing findings/actions/narratives through the report revision workflow; do not
replace the entire customer report with this module's returned arrays. Generate
and validate JSON/Markdown/HTML using the resulting run, then obtain independent
review before accepting claims. Reports exclude raw capture payloads by design.

For reassessment, use the current sourceDigest, a new runId and assessmentAt;
`evaluations: []` replays an existing validated population and expires stale checks.
It is not valid for an initial run without evaluations. Evaluation IDs cannot be
rebound to another scope/window. Runtime fingerprints are exact: runs from another
evaluator version are rejected. Preserve them; automatic migration is unavailable.

## Collection attempts and recovery

Input is `{sourceDigest,newRunId,assessmentAt,attempts}`. Each attempt entry is
`{target,attempt}` following the [normalizer contract](../scripts/lib/technical-seo/acquisition.mjs).
Target binds targetId, kind, scope, method, window and maxAgeSeconds before
collection. Scope binds customerId/entityId/environment/targetUrl/profileId/stateId.
Attempt binds attemptId, collectorVersion and result; result records start/finish,
captured or unknown status, synthetic flag, gaps and optional original envelopes.
executionAuthenticated and semanticAcceptance must remain false. Never invent
capture timestamps or a source envelope for denied/failed collection.
An absent capture is not an absent attempt: retain and describe supplied attempt
identity, collector version, scope, timestamps, status and gaps in the report and
final response. Do not invent missing page observations from those metadata.

This command appends immutable attempts and adds capture-availability obligations.
A usable supplied capture can pass availability only. Evaluate semantic SEO with
the separate evaluation command. A later failure does not discard an earlier
still-valid capture; expiry reopens its request. Declined requests remain declined.
Empty attempts reassess an existing population. Same target ID cannot change scope
or window; a later retry outside the original window needs a new target population.

The bundled [collector API](../scripts/lib/technical-seo/collector.mjs) requires a
host-supplied Chromium runtime and trusted authorization context. It retains
read-only URL/robots/network/revocation constraints. No browser is bundled and no
JSON field grants permission. Keep raw diagnostics private. The CLI above records
supplied results; it does not invoke this collector or authenticate execution.

## Data and unsupported semantics

The bundled classifiers use [Schema.org 30.1](schema-vocabulary-notice.md) and the
[IANA subset](iana-language-registry-notice.md). These are data sources, not skills.
They do not establish full vocabulary validity, required properties, rich-result
eligibility, actual content language, Microdata or RDFa correctness. The separate
development JSON-LD expansion worker and its jsonld dependency are not installed.
Do not present expansion recovery requests as an available automatic importer.
Missing provider/index evidence stays unknown even when local declarations pass.

## Stored replay inventory

`inspectEnterpriseTechnicalSeo` replays all indexed current and historical bases and generated rows, verifies scope, lineage, fingerprint and exact metadata, and rejects unowned canonical evidence. Indexes retain up to 100 historical bases; the existing revisionRunId remains part of each occurrence identity. Unsupported fingerprints or older incomplete indexes require separate assessment or reviewed migration. Request-window serialization and evaluation ordering are deterministic; the completed run is inspected before save.

Verified projections distinguish historical policy changes and changed check sets from the current evaluation. Changed owner expectations or removed target declarations do not establish that old failures were fixed. The development general report adapter requires current evaluations at the final run clock, projects actual current failed checks only, and excludes raw capture/provider/JSON-LD bodies and private alternate targets. Local captures do not establish provider index state or guarantee rich results, ranking or revenue. Acquisition-family evidence still requires a separate inspector/adapter.
