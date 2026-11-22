# Storage-bounded audit campaigns

Use a campaign when the declared inventory needs multiple run directories. The
customer invokes the same skill; campaign/partition commands are internal helpers.
This implements collection partitioning and unique-item coverage aggregation.
It supports immutable continuation and attributed global review receipts. Automatic
repair of corrupt registered parts is not implemented.

```sh
node scripts/audit.mjs campaign /absolute/config.json /absolute/new-campaign
node scripts/audit.mjs campaign-validate /absolute/new-campaign
node scripts/audit.mjs campaign-resume /absolute/old-campaign /absolute/new-campaign
```

Configuration is the normal start config, optionally with partitionSize from 1 to
500 (default 500). This bounds a batch, never the entire inventory. maxRunBytes
continues to bound each partition. Complete source memberships, aliases and locale
metadata are preserved when inputs normalize to one identity.

Optional config.discovery embeds the supplied-source request described in
[discovery](discovery.md). Its recomputed inventory must match config.inputs and
its incomplete scope cannot be overridden. Discovery receipts and queues live once
at campaign scope, remain visible in aggregate coverage, and survive continuation
and part-review revisions. Part configs intentionally omit global discovery data.

## Execution and ownership

The helper repeatedly selects pending identities and creates a new partition under
parts/000001, parts/000002, and so on. Each partition has independent evidence,
checks, findings and reports. It processes as much of the batch as fits, then the
campaign advances the remaining identities into later partitions. If a batch cannot
make progress, the batch is reduced. A single item that still cannot fit is retained
as unpartitionable-item while other items continue; it is never silently excluded.

All public partitions share one collector, robots cache, cooldown map and host
scheduler. Moving to a new directory must not reset rate limits or authorization.
Source files are read-only. Output is new-only and outside authorized content roots
and the installed package. No failed or old partition is automatically deleted.

Ownership is exact: a partition owns the processed prefix recorded in its checkpoint,
not every placeholder row initially planned in its inventory. Each declared item
can have at most one owner. Pending rows copied into a later partition are not counted
twice. Unowned items must remain in the campaign's explicit remaining list or pending
queue. Collection accounting includes attempted failures/blocked/unsupported items;
collected snapshot count and completed audit count are separate.

## Validation and reports

campaign.json records identity, configuration hash, full normalized ID list, remaining
IDs, part paths/run identities and ownership, and exceptional pending items. It is
atomically replaced after each completed partition. Config/manifest files are bounded
at 32 MiB. The original explicit inventory remains a metadata-level memory dependency;
this is not an unlimited streaming source importer.

Validation reads one partition's raw evidence at a time, rechecks the trusted rule
registry and artifact hashes, compares partition policy and declared metadata to the
campaign config, verifies checkpoint/check consistency and processed-prefix ownership,
and rejects duplicate/unknown ownership or omitted unowned items. Part paths are
restricted to generated numeric directories; symlink manifests/directories are rejected
under the stable-directory operating contract. Validation does not authenticate that
a captured response actually came from a remote provider or certify semantic truth.

campaign-report.md links every partition report. campaign-coverage.json aggregates
unique item states, supplied check dimensions, unresolved/missing checks and queues.
A campaign does not flatten all large raw artifacts into one run. Missing check counts
include unowned items; dimension counts represent supplied checks only.

The collection campaign remains partial with globalReviewRequired=true, even when
collectionAccounted=true. A separate validated global review receipt evaluates
overall completion against the current source snapshots. Cross-part duplication, contradictions, journey coverage
and other portfolio judgments need a global evidence/review layer. Finishing byte
collection alone cannot complete the requested SEO/AIO/AEO/GEO audit.

## Immutable continuation

campaign-resume validates the registered source campaign and creates a new directory
outside the source campaign, content roots and installed package. The old campaign
is never modified. It copies only validated, registered partition snapshots through
the artifact validator/report writer, preserving run identities, capture timestamps,
source evidence and review state. The new campaign records parentCampaignId and
recovery metadata. It then collects the still-unowned declared identities.

Before new public requests, validated retained HTTP and robots captures restore
unexpired server Retry-After cooldowns for allowed origins, plus the minimum
one-second host interval. Recovery does not reset a server-requested delay. Robots
permission is fetched again when needed; prior capture validation does not certify
remote authenticity. Expired cooldowns do not prevent new collection.

A copied snapshot is historical. It is not recollected just because the underlying
source changed. The new report explicitly distinguishes retained snapshots from new
collection; coverage accounting is not a claim that all captures are contemporaneous.
For a fully fresh collection, start a new campaign with the desired current config.
A snapshot continuation does not retry already-owned failed/blocked items or change
the source config/budget; their unresolved status remains visible.

Unregistered numeric partition entries are listed in skippedUnregisteredParts and
left untouched in the source. Their evidence is not trusted or copied, even if a
partial run appears usable. Corresponding unowned items are recollected. A corrupt
registered partition fails source validation before new output is created. Repairing
inconsistent registered manifests is outside this command's contract.

New metadata checkpoints register each retained partition only after its files have
been written, so interrupted continuation can itself be inspected and continued into
another new directory. A failed in-flight write can leave an unregistered output part;
no directory is automatically deleted or overwritten. Report files are produced after
final validation. This remains a single-writer stable-directory workflow, not a
cross-process lock or crash-atomic transaction over all files.

Before invoking continuation for a genuinely interrupted run, the orchestrating host
must establish that its original process/job is terminal or absent. A collecting
manifest by itself is not evidence that the writer has stopped. Fixtures simulate an
interrupted checkpoint after their source function has returned; no live process is
inferred stopped from a timeout or state label. Cross-part semantic review and host
behavior evaluation remain release requirements.

## Global review reference index

Run `node scripts/audit.mjs campaign-index SOURCE NEW_DIRECTORY` to prepare a
metadata index for cross-part review. It validates the source, then writes
items.jsonl (every declared identity with its unique owner or null), evidence.jsonl
(partition-scoped references and artifact metadata, without raw values), and
checks.jsonl (owned item checks only). index.json is written last and contains
file digests/counts, source identity, partition snapshot hashes and coverage.
Missing index.json means export did not finish; do not consume partial output.

Evidence IDs are local to a partition. Always resolve `{part, evidenceId}` against
the validated source and read the referenced artifact before making a content
judgment. Source lineage references use the same pair. Included lineage metadata
for non-owned placeholders never establishes ownership. Item state in the index
points to the owning partition; it is not an audited-state assertion. Unowned items
remain visible alongside the campaign's pending queue.

Export reads one partition at a time, repeats validation and compares loaded
snapshot hashes across passes to detect changes. This is still a terminal-writer,
stable-directory contract, not a lock against concurrent mutations. Hashes bind
local snapshots; they do not prove remote authenticity. The index is a derived
navigation artifact, not an independently authenticated audit. Existing directories
are never overwritten, and source/content/package directories cannot contain output.

This command supplies global review inputs; it does not perform duplicate,
contradiction or journey analysis, apply reviews, or unlock campaign completion.
Raw content remains in the original partitions, which must accompany the index.

## Attributed global portfolio review

Use `campaign-review SOURCE BUNDLE.json NEW_DIRECTORY` after examining the indexed
artifacts and applying the portfolio method. Recheck with
`campaign-review-validate SOURCE REVIEW_DIRECTORY`; this recomputes the result
from review.json and the source, ignoring any saved completion flag. The collection
campaign stays immutable. The receipt and its source campaign form the assessed
snapshot; neither the index nor an edited review-result.json certifies completion.

Bundle fields:

- schemaVersion: 1; campaignId, sourceManifestHash and partSnapshotHashes copied
  from a matching campaign index. Every registered partition must match exactly.
- contextEvidence: records with evidenceId, kind, value (text), snapshotHash
  (SHA-256 of UTF-8 value), locator, collectedAt and sourceReferences (partition/ID
  pairs). Supported kinds: inventory-map, question-set, entity-record, link-graph,
  audience-context. Imported customer context needs a real locator/date; synthetic
  context must stay explicitly labeled. Hash verification is not source authentication.
- reviews: at most one judgment for each portfolio rule in rules/core.json, with
  ruleId, status, reason, reviewer, reviewedAt, itemIds, evidenceReferences and
  contextEvidenceIds. Missing rules and unknown judgments stay unresolved.
- findings: failed-rule findings with unique findingId, ruleId, severity,
  confidence, observation, recommendation, verification, affectedItemIds and
  evidenceReferences supported by that review. A fail requires a finding.

A resolved portfolio judgment must cover the entire declared inventory and cite
content from every item's owning partition. Pass/fail additionally require all of
the rule's evidence kinds. Not-applicable requires an explicit applicabilityReason
and still requires the full content denominator; lack of data is unknown. Unknown
judgments can preserve partial evidence without claiming full coverage.

All four global judgments resolving does not override per-item coverage. Overall
completion additionally requires declared complete discovery, full mode, nonempty
inventory, unique collection ownership, no unresolved item checks, no missing checks
and no pending queues. Failed quality checks can be fully assessed; missing data
cannot. Local portfolio checks are not silently rewritten by a global receipt.

The helpers validate references, attribution fields and coverage, not the truth of
reviewer prose, the reviewer's identity or whether a not-applicable rationale is
substantively justified. Semantic host trials remain required. Bundles are bounded
at 32 MiB; source access follows the same terminal-writer/stable-directory contract.

## Immutable per-part assessment revisions

`campaign-review-parts SOURCE BUNDLE.json NEW_DIRECTORY` applies local item reviews
without manually editing campaign manifests. It does not fetch content. The bundle
contains schemaVersion: 1, campaignId, sourceManifestHash and a nonempty parts array.
Each entry contains path (registered numeric part), sourceSnapshotHash from the
campaign index, and bundle (the standard per-run review bundle: reviews plus optional
evidence/artifacts/findings). Selected parts must be unique. Review and newly added evidence item IDs must belong to the selected part's owned
prefix; placeholder rows are not assessment targets. Added evidence refreshes affected
deterministic checks under the standalone review contract, without host pass/fail overrides.

Every selected bundle is validated before output creation. Selected parts receive
new run identities and the existing attributed-review/evidence validation; unselected
registered parts retain exact loaded snapshots. The new campaign has its own identity,
a parent link and snapshot-review provenance. Collection dates, pending queues,
unowned inventory and all source content remain unchanged. No old or unregistered
source directory is deleted. Existing output directories are rejected.

Part files are registered only after writing. Interrupted output can be inspected
with campaign-validate, but it may contain an unregistered partial write. Use the
continuation contract after establishing that its writer has stopped. Continuation
collects still-unowned identities; it does not replay review bundles from an
interrupted revision. To preserve the original intended assessments exactly, rerun
the part-review command from the intact original into a different new directory.

Build a fresh index for the revised campaign before global review. Old global
receipts deliberately fail their identity/snapshot bindings. campaign-report.md
links the new part reports and campaign-coverage.json recomputes unique item totals.
Neither local review completion nor this orchestration alone resolves global rules.

## Unified customer report

`campaign-report SOURCE REVIEW_DIRECTORY NEW_DIRECTORY` revalidates the global
receipt against source snapshots and writes report.md, report.html and
content-actions.csv. For a public campaign it also writes `report.json` with the
same report headings, descriptions and table rows as the Markdown and HTML
views, including declared public URLs and affected URLs in the backlog.
`public-report-validate DIRECTORY` checks the three files against `public-report-manifest.json`. URL labels omit query strings. Item IDs still distinguish query variants.
report-manifest.json is written last with file hashes,
source/review identity, recomputed coverage and local/global finding counts.
Treat missing report-manifest.json as an incomplete export. Saved review-result.json
flags are ignored. Existing output is never overwritten; output must be outside
source campaign, receipt, content roots and package.

The report combines unique-item coverage, dimension totals, attributed global
judgments, local and global findings, scoped evidence links, pending queues and next
steps. Findings are ordered by severity; confidence and classification stay separate.
Global findings remain attributed judgments, not automatically verified observations.
Potentially overlapping findings retain distinct scoped identities rather than being
silently merged. Review semantic duplication before handing the backlog to implementers.

Raw partitions are loaded one at a time, revisited for severity ordering, while report
rows are streamed. Raw evidence values are not embedded. HTML escapes target content,
uses no scripts/external assets and has a restrictive content policy; Markdown escapes
untrusted text and CSV neutralizes formula-leading cells. Source artifact links remain
relative: keep the source campaign, review receipt and report together with their
relative directory structure. Do not treat a copied HTML file alone as evidence closure.

No visibility observations are inferred or pooled. The report directs readers to
supplied dated measurements; missing metrics are unknown, not zero. A complete audit
may have failed content checks. Green coverage does not certify semantic correctness,
search performance, or approval to implement recommendations.

The renderer rechecks snapshot bindings after writing and closes all opened files on
failure. Failed output may remain for diagnosis without a final manifest. Stable source
directories and a terminal writer remain required; this is not a concurrent snapshot
transaction or remote authenticity check.

## Action ownership in unified reports

Local findings retain their required `ownerRole` and `effort` in HTML, Markdown
and CSV. Global findings may supply these two fields as nonempty strings; assign
them from actual review context rather than guessing a customer team or timeline.
Legacy global findings without either field remain readable and show `Not supplied`
for that value. Null, empty or non-string supplied values are rejected. Missing
assignment metadata is not evidence of a completed remediation or an approval to
implement it. The action CSV includes `owner_role` and `effort` columns; consumers
should read column names rather than assume fixed positions.

## Named coverage and rule provenance outputs

Unified reports write `coverage.json` with `schemaVersion: 1` and
`scope: "campaign"`. It contains the recomputed `itemCoverage`, campaign ID,
`completionAllowed`, `globalReviewComplete`, `unresolvedRuleIds`, denominator and
limitations. Use `schemas/campaign-coverage.schema.json` for this envelope;
standalone `coverage.json` retains its existing `schemas/coverage.schema.json`
shape. Item collection completeness is not global semantic completion. The
report manifest hashes the coverage file and retains its existing coverage field.

Both human-readable campaign reports include the validated packaged registry's
rule IDs, authoritative source URLs, review dates and limitations. Dates describe
rule review, not evidence collection or current search-engine outcomes. This
appendix does not convert method heuristics into proven ranking requirements.

## Redacted campaign presentation

`campaign-redact-report SOURCE REVIEW_DIRECTORY POLICY.json NEW_DIRECTORY [OPTIONS.json]` uses
the literal policy documented in evidence-contract.md. It evaluates the original
campaign and bound global receipt before rendering a marked transformed view.
All displayed text passes through literal masking before output escaping; original
coverage numbers and completion judgments remain unchanged. It does not issue
a new review or claim that masked quotations are exact source text.

Evidence links point to new text derivatives in the output directory. The table
SHA-256 values identify original source evidence; report-manifest.json records
source and derivative hashes. Global receipt JSON is parsed before masking string
values so JSON escaping does not prevent matches. Partition reports are not copied
because their original links point outside the export; the unified report retains
local findings, global findings and coverage. Optional supplied measurements are validated first and exported as explicitly
transformed presentation attachments; original exports are never copied unchanged.

Declared literals cannot identify all private information or transformed text.
Review every derivative and report before sharing. A failed/interrupted render
may leave partial files; require a complete manifest and matching file hashes.
Original campaigns and receipts remain unchanged and private.
