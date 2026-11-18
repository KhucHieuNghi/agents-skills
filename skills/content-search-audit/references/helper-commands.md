# Internal helper commands

The customer invokes this one skill; the host runs these helpers as implementation
details. Resolve the installed package to an absolute path once and keep the
working directory in the customer project. Call its helper by absolute path;
there is no need to change into the installed skill directory. In the examples,
`/absolute/installed-skill/` means the resolved package, never target content.
Read local references and artifacts with the host's file-reading tools when
available; these reads do not require shell pipelines or directory changes.
Use [supplied-source discovery](discovery.md) to union sitemap and export snapshots
before collection, and [campaigns](campaigns.md) for partitioned review/reporting.
Node.js 22+ is required. No install/download command or external runtime package is
needed.

```sh
node /absolute/installed-skill/scripts/audit.mjs --help
node /absolute/installed-skill/scripts/audit.mjs inventory /absolute/config.json
node /absolute/installed-skill/scripts/audit.mjs start /absolute/config.json /absolute/new-run
node /absolute/installed-skill/scripts/audit.mjs validate /absolute/new-run
node /absolute/installed-skill/scripts/audit.mjs coverage /absolute/new-run
```

Example config shape (replace placeholder paths with authorized content roots):

```json
{
  "inputs": [
    {
      "path": "/absolute/content/page.md",
      "source": "repository",
      "locale": "vi"
    },
    { "path": "/absolute/content/guide.pdf", "source": "export", "type": "pdf" }
  ],
  "localRoots": ["/absolute/content"],
  "inventoryComplete": false,
  "mode": "full",
  "brandName": "Customer"
}
```

`inventoryComplete` is mandatory and must describe discovery for the declared
scope. Do not set it true merely because input parsing succeeded. Inputs union by
normalized identity; query and locale relationships remain preserved. Empty roots
permit no local reads. Public URLs are blocked unless explicit network.allowedOrigins is configured.

`start` requires a new run directory outside content roots and the skill package.
It writes raw evidence, complete planned inventory, checks, findings, config and
run checkpoint, validates the result and creates five base report files. It preserves
UTF-8 BOM/newlines so artifact hashes remain stable. Source files are read-only.
No semantic result is generated. Collected items stay pending for host review;
unsupported/blocked/failed items retain reasons. The final status is partial.

Checkpoint metadata is refreshed after every public item, at 500-item local
collection boundaries and at the end.
`inputHashes` contains content hashes for successful collection and hashes of
status/reason descriptors for unavailable items; those descriptors are not content
evidence. Cross-file manifest replacements are not a transaction. After interruption,
validate the persisted run before reuse. The state library supports reconciliation,
and the resume command below refreshes a validated checkpoint into a new run.
Do not restart `start` into an existing directory or claim restart coverage.

`validate` returns valid, completionAllowed, recomputed coverage and errors. Exit
zero means structural validity, not full coverage; inspect completionAllowed.
`coverage` exposes the same validated coverage. Invalid artifacts exit nonzero.

```sh
node /absolute/installed-skill/scripts/audit.mjs render /absolute/run-without-reports "Customer"
```

`render` creates new report files only. The starter already renders a partial
report. For subsequent revisions, preserve prior reports and create a separate
output revision containing the validated inputs/evidence. Do not delete evidence
or modify source content to make a gate pass. No source content is published.

All commands output JSON except help. Errors go to stderr with nonzero status.
The starter bridges declared collection to host review; it does not replace
automatic discovery, semantic, measurements or release evaluation gates.

## Attributed snapshot review

For a complete executable example connecting snapshots, attributed evidence, a
semantic verdict, its finding and a quote ledger, read [worked review](worked-review.md).
The example is separate synthetic data; its judgments are not defaults for a real run.

```sh
node /absolute/installed-skill/scripts/audit.mjs review /absolute/old-run /absolute/review.json /absolute/new-run
```

The bundle contains a required `reviews` array, optional additional `evidence`
records and `artifacts` map, and optional `findings`. Each review contains `itemId`,
`ruleId`, `status`, `reason`, `evidenceIds`, `reviewer` and `reviewedAt`.
Use the exact rule IDs from the packaged registry. New evidence follows the
[evidence contract](evidence-contract.md) and artifact validator; artifact paths
must start with `evidence/`, be new, and be referenced by evidence. Values are
UTF-8 artifact strings, including JSON serialized as a string when appropriate.

This operates on collected snapshots, not a fresh site capture. Evidence IDs must
be unique; existing artifacts cannot be replaced. Review only the rules assessed: other existing assessments are preserved, except
affected deterministic checks recomputed from newly added evidence (see below). Supplying `findings` replaces the full
finding list, allowing corrected findings to be withdrawn while requiring every
remaining failed check to retain a supported finding. Omitting it preserves findings.

A semantic pass/fail requires the rule's evidence kinds. A not-applicable decision
requires attributed reasoning and supporting evidence; it is not a shortcut for
missing live data. Deterministic pass/fail outcomes cannot be overridden by a
review. New deterministic evidence triggers recomputation without granting host overrides;
multiple retained snapshots remain unknown until reconciled. Stale failure findings
must be explicitly withdrawn from the new revision as described below.

The original run, reports and content remain unchanged. Output must be a new
sibling or separate directory outside the original run, content roots and skill
package. Original config hash is verified. New run identity includes parentRunId;
all source artifacts are copied with their hashes preserved. Structural validation
occurs before creating output. A later filesystem/report error can leave a partial
new directory for diagnosis; this is not a crash-atomic transaction.
Completion is recomputed, never accepted from bundle metadata. Blocked, failed or
unsupported collection remains unresolved. All semantic conclusions still need
host/domain evaluation; artifact validation does not certify their truth.

## Refresh and resume explicit inventory

```sh
node /absolute/installed-skill/scripts/audit.mjs resume /absolute/previous-run /absolute/config.json /absolute/new-run
```

Resume validates the previous manifests and configuration hash, then re-reads every
input in the new explicit configuration. It never skips a file solely because its
position is below the saved cursor. This supports valid collection checkpoints as
well as completed collection runs. Corrupt or inconsistent checkpoints fail
validation; this command does not repair a crash between individual manifest writes.

The command preserves review work, not collection I/O: all declared inputs are read
again, with public access governed by the same explicit network policy. Identical configuration
and content hashes allow previous assessments and their immutable evidence to be
reused. Changed or removed source snapshots invalidate dependent checks, including
cross-item evidence lineage. Added/removed items are reported explicitly. An unchanged configuration retains
its unresolved discovery queue; refresh does not claim to resolve discovery. Any config
change conservatively disables all reuse, including changes to locale, declared
scope or customer context; no assumption is made that a config edit is cosmetic.

Unchanged external evidence is still an old captured snapshot. Reuse does not
refresh analytics, claims, AI responses or live website conditions. Inspect capture
and review timestamps; import new evidence or reassess when those facts may have
changed. A previous failure whose supporting multi-item finding becomes invalid
returns to unknown and requires reassessment. Existing failures with intact
support remain failures, not silently repaired content.

Output must be new and outside both old and new content roots, the skill package
and previous run. The run records parentRunId and reconciliation counts/IDs. The
prior run remains immutable. A temporary sibling directory holds fresh collection;
it is removed after success or a handled error. A process crash can leave that
private staging directory; it is not silently treated as a completed audit. Do not
manually delete an active run's staging directory. No fixed page cap or sample is
introduced; an integration fixture exercises 1,200 inputs and 31,200 checks.

Public collection transport progress and remaining gates are documented in the
[network contract](network-collection.md). Public start/resume requires the configuration below.

## Explicit public collection

```json
{
  "inputs": [{ "uri": "https://example.com/page", "source": "declared-url" }],
  "localRoots": [],
  "inventoryComplete": false,
  "network": {
    "allowedOrigins": ["https://example.com"],
    "maxBytes": 10485760,
    "timeoutMs": 20000,
    "maxRedirects": 5,
    "retries": 2
  },
  "maxRunBytes": 100663296
}
```

Start/resume use the same command syntax as offline mode. Allowlisting authorizes
reads, not publication or source changes. Redirect origins must be explicitly
allowed too. The collector validates configuration before creating output. Adding
an origin does not authorize private IPs, credentials or authenticated requests.

Every public outcome retains available evidence, even blocked/failed collection.
Captured HTTP failures produce low-priority observed findings for operator triage;
they do not automatically prove a search defect. Rendered DOM, index status and
semantic quality remain separately unknown. Public inputHashes cover the evidence
bundle, so changed HTTP/robots captures invalidate prior review, even if body text
is identical. Resume preserves fresh deterministic findings and clears an item's
retry queue only after that item is reattempted; unrelated discovery remains queued.

maxRunBytes defaults to 96 MiB and accepts 1–96 MiB. Conservative accounting includes
artifact bytes and duplicated manifest/check values. When storage cannot accommodate
the next result, all remaining items stay in inventory with a storage-continuation
queue and the run remains partial. Oversized inventory manifests require partitioning
before collection. This bounds artifact persistence, not total process heap usage.
Use [campaign orchestration](campaigns.md) for automatic partitioning of a new
collection. Repeatedly resuming the same single run alone will not progress beyond
its storage boundary. Immutable campaign-resume is available for validated checkpoints; cross-part
semantic review and repair of corrupt registered partitions remain unfinished; never remove items or claim complete coverage to bypass those gates.

New review submissions require explicit timezone timestamps and reject values more than five minutes ahead of the actual admission clock. See [review time provenance](evidence-contract.md#review-time-provenance). Source snapshots retain their original timestamps; the new run/receipt records reviewAcceptedAt separately.

### Added evidence and deterministic refresh

A review bundle may contain `reviews: []` with new artifact-backed evidence. The
helper recomputes deterministic rules whose required evidence kinds were added for
that item. For example, attach a faithful `extracted-text` snapshot linked to its
captured content; the helper computes nonempty/empty status itself. Do not submit a
host-authored pass/fail for that deterministic rule. Unrelated checks and semantic
judgments are preserved; evidence presence never resolves semantic quality.

A pre-0.1.5 revision may already contain added evidence while its deterministic
check still has an unattributed unknown result. A new review (including an empty
reviews array) recomputes that check when all required evidence kinds exist. Explicit
attributed unknown/not-applicable decisions are retained unless new matching evidence
or a new review affects them. The historical source is never rewritten.

All retained snapshots participate. Adding a second extraction does not select the
newest: ambiguity becomes unknown, with the actual evidence IDs and source lineage.
An audited item returns to pending if a required check becomes unresolved. Explicit
new attributed unknown/not-applicable reviews remain subject to the existing review
contract; unaffected earlier applicability decisions are preserved.

A newly computed failure still requires a supported finding in the bundle. If new
evidence makes an earlier deterministic failure unresolved or non-failing, supply a
reconciled complete `findings` list that removes that old item/rule failure claim.
The helper rejects stale findings rather than silently deleting a potentially
multi-item finding or presenting an unresolved observation as a current failure.
Keep the original revision for history. Invalid evidence or reconciliation fails
before output creation. The same behavior applies to campaign part reviews, where
new evidence, like reviews, must belong to the selected part's owned items.

## Redacted evidence export

`redact-evidence SOURCE_RUN POLICY.json NEW_DIRECTORY` creates separately hashed
text derivatives using explicit literal replacements; it does not change raw
evidence or export a sanitized report. See evidence-contract.md for policy,
legacy-run requirements and privacy limitations.

`redact-report SOURCE_RUN POLICY.json NEW_DIRECTORY` adds a base report presentation
with derivative links and hashes. It preserves original coverage numbers and marks
transformed text. Campaigns use the command below; optional supplied measurements can be included as transformed attachments.

`campaign-redact-report SOURCE REVIEW_DIRECTORY POLICY.json NEW_DIRECTORY` renders
a unified transformed campaign report with local derivative links. See campaigns.md
for source/derivative hash distinctions. Both report redaction commands accept
a final optional OPTIONS.json; measurement attachments are explicitly transformed
presentations, not original importable exports.

## Quote and line-range gate

`verify-quotes BUNDLE.json` checks final-report/source hashes, each declared quote
within its source lines, and the same quote and explicit locator within its report
block. Returns nonzero on mismatch. See quote-verification.md for the ledger
contract and submitted-spans-only limitation. It never certifies semantic truth.
