# Technical SEO installed workflow

Status: implementation in progress; enterprise candidate remains 0.3.18. This
work does not close P3–P7 or establish commercial acceptance.

## Independent readiness review

Reviewer `measurement_workflow_review` inspected the development workflow and
collector before packaging. It identified five blocking requirements; progress
is recorded below:

1. Preserve supplied-data request progress on reassessment. The reviewer
   reproduced a valid `provided` response becoming `requested` at the same
   timestamp. Retain compatible bindings/states through reconciliation and
   generate check-specific formats, owners and export instructions.
2. Connect denied, failed and unsupported collection to explicit unknown
   obligations and actionable requests. The collector legitimately returns no
   capture; do not invent one to satisfy the workflow's one-source contract.
   Preserve host-bound authorization and continuous revocation checks.
3. Package the real import closure and data attribution. Relocate repository-only
   shared imports and fingerprint paths. The six existing workflow kinds do not
   use the separate JSON-LD expansion worker; that worker requires `jsonld@9.0.0`
   and its dependency/license closure before installed use can be claimed.
4. Reject unsupported evaluator fingerprints or provide explicit reviewed
   migration. Current replay accepts a syntactically valid historical fingerprint
   while executing current code; this cannot establish historical reproducibility.
5. Expose the installed CLI with an actionable JSON → assessment → report recipe,
   parent-report reassessment and fresh extracted installs on both supported hosts.
   Document all six kinds and distinguish supplied captures from live acquisition,
   offline graph expansion, rich-result eligibility and complete schema semantics.

## Provenance prerequisite

`src/composition.ts` now supports schema-v2 `kind: data` records with a publication
URL, version and original-snapshot digest. Standard v1 Git skill records remain
supported. Mixed lineage and unknown kinds are rejected. The source digest is a
reviewed declaration; package validation does not fetch or authenticate the remote
snapshot. See the [publisher contract](../guides/composition-provenance.md).

This change does not yet package the Schema.org or IANA extracts. That step still
requires reviewed source records, retained original snapshot bytes, applicable
license/attribution files, adapted file mappings, updated package/component hashes,
and a versioned CLI with v2 support. Existing five skill upstream pins remain
unchanged. Source data must not be counted as an additional reused skill.

Independent review found no material blocker in the validator prerequisite and
passed 25 focused tests. The requested explicit Git-kind and mixed Git-field
regressions were added, bringing composition coverage to 29 tests. Final full
verification passed 128 files / 1,545 tests in 82.74 seconds, plus lint, typecheck,
build, format, site typecheck and 19 site tests. Initial fixture-only lint and
public-boundary failures were corrected before that clean rerun. Local logs are
retained at `build/composition-data-provenance/verification/`. This is source work,
not a new release or deployment; candidate package/component pins are unchanged.

## Request integration implementation constraints

The follow-up independent review identified a reusable pattern in measurement
workflow state preservation. Compare complete request descriptors after normalizing
only `status`, `reason`, `evidenceIds`, and `evidenceDigests`; retain those four
fields only when descriptors match. Read old requests from the forked run, where
request IDs and expiry have already been reconciled. Keep final check reconciliation.
Automatic evidence matching is a separate operation and must not be introduced as
a side effect of preserving state.

Add explicit evaluator rule-ID bindings before deriving targeted requests. Index
controls and structured data already emit requests per unknown check; canonical
and URL Inspection can have several dependent checks per request. Target controls
need the exact target-specific rule ID, not just a target reference. Hreflang graph
requests need bindings to the aggregate root/return-link/language checks they
affect. The synthetic provider-index-state row requires its own provider request.
Do not infer these relationships from prose reasons or array position.

Derive immutable descriptors in the workflow projection and replay-validate them;
ownership-only validation is insufficient. Group only matching artifact, scope,
window, owner and format requirements. Every unknown row needs a targeted request.
Regression coverage must include provided/expired/invalid/declined state, descriptor
changes, similarly worded requests from separate evaluations, target-specific
separation, and provider-export versus owner-policy formats.

## Replay and response preservation checkpoint

The development workflow now rejects non-current evaluator fingerprints before
replaying source material or writing output. A regression creates an internally
consistent run under a synthetic unsupported fingerprint (including rewritten
evidence IDs, row hashes and policy digest); the earlier implementation accepted
it. Retain original runs; explicit migration is still unimplemented.

Request descriptors now come from one projection function used for generation and
index replay. Six altered-descriptor regressions prove that formats, instructions,
owner, fallback, access requirements and priority cannot be silently changed.
Compatible provided/invalid/expired/declined states retain their response reason
and evidence bindings from the already-forked run. Exact receipt expiry still
expires a provided response, and a provided response does not pass its unknown check.

Independent reviewer `measurement_workflow_review` passed 37 workflow tests and
found no new blocker in this bounded change. Targeted rule bindings and request
formats, no-capture acquisition results, installation and full technical coverage
remain open. These changes affect development sources only; candidate 0.3.18 is
unchanged and no customer website was modified.

The reviewer also executed an isolated generic-invalidation → SEO reassessment
scenario on Node 24.19.0. It archived the original failure, reproduced the failure
on reassessment, preserved a valid provided response without promoting the provider
index check, cleared receipt bindings at expiry, and verified the source stayed
unchanged. The local receipt is
`build/technical-seo-replay-review/external-invalidation.json`. This supplements
the focused regressions; it is not a native-host or commercial acceptance trial.

Full verification for this checkpoint passed 128 files / 1,556 tests in 155.83
seconds, plus lint, typecheck, build, format, site typecheck and 19 site tests.
Local logs: `build/technical-seo-replay-review/verification/`. Diff whitespace
and final documentation formatting were checked separately after recording results.

## Targeted request bindings checkpoint

All six development evaluator kinds now emit explicit rule bindings. Hreflang
graph requirements bind to the affected aggregate checks; declared-target
requirements bind the exact target-specific rule. The workflow projects only
requirements for the unknown row, preserves their private source locators, and
rejects an unknown row with no targeted request. The synthetic provider-index
request uses Search Console ownership and inspection formats separately from
local captures and owner policy.

Structured-data requests distinguish owner type policy, visible content, capture
and reviewed vocabulary provenance. Expired markup additionally requests fresh
capture while retaining the policy/content needs. Canonical fragment declarations
now have a recovery request for unresolved consistency, a previously uncovered
unknown state. Similar requests from separate profile evaluations must not share
provided/invalid/expired/declined state or receipt bindings.

Independent reviewer `measurement_workflow_review` found no remaining blocker
after verifying the structured-data freshness correction, passed 161 focused tests
across five files, and checked 96 synthetic hreflang combinations for unknown-row
request coverage. These are technical regressions, not recall or accuracy metrics.
The earlier open rule-binding item is implemented in development; failed-capture
integration, packaging, complete module coverage and commercial evaluations remain
open. Requested supplemental formats do not imply an automatic importer exists.

Full verification passed 128 files / 1,559 tests in 141.28 seconds, plus lint,
typecheck, build, format, site typecheck and 19 site tests. Logs are retained at
`build/technical-seo-targeted-requests/verification/`. Candidate/component locks
remain unchanged; this checkpoint is not packaged or deployed.

## Next acquisition adapter contract — not implemented

Independent design review recommends reusing enterprise run/evidence/request and
reconciliation APIs. Bind the target before collection: customer, entity,
environment, exact URL, profile, state, kind/method and observation window. Current
collector output alone lacks kind/method/window; bind these from the original plan,
not inferred source presence. Imported results cannot grant collection permission.

Retain immutable attempt ID, start/finish timestamps, collector version, synthetic
flag, bounded gap codes and successful capture digest references if present.
Failure has no capture reference. Authentication/semantic acceptance flags stay
false. Replay retained attempts and target bindings; append rather than overwrite.

Create a stable capture-availability check from the first attempt. Failure is
unknown with targeted capture instructions. Valid supplied capture can pass only
this availability predicate; semantic SEO assessment remains separate. Keep known
semantic obligations unknown, without inventing declaration-dependent target
inventories. Retain the acquisition request after success so expiry can reopen it.
Archive changed checks and retain declared scope and compatible response history.

Attempt timestamps are not capture observation timestamps. A live retry outside
the original observation window creates a new population/window and retains the
earlier unknown; only genuinely matching capture evidence can resolve that same
historical obligation. Do not silently rebind windows to make retry pass.

Required regressions: failed→successful matching capture; mismatched URL/profile/
window; expired or removed success; duplicate/replayed attempts; removed attempt
history; synthetic output; foreign or fabricated authorization fields; redirected
capture; and source/rendered methods resolving independently. This contract is a
design input for the next implementation, not evidence of existing capability.

## Acquisition normalization prerequisite — development only

`scripts/enterprise-technical-seo/acquisition.mjs` now provides the pure
`normalizeTechnicalSeoAttempt({ target, attempt, assessmentAt })` adapter. Target
fields are targetId, kind, scope, method, window and maxAgeSeconds. Scope binds
customer/entity/environment/URL/profile/state. An attempt binds attemptId,
collectorVersion and the attributed collector result. Four browser collector kinds
are supported: canonical, index-controls, hreflang and structured-data. Method is
null for canonical/index-controls or html-source/html-rendered for the other two.

Failed results retain attempt times/gaps but have no fabricated capture or observed
timestamp. Selected successful envelopes are hash/size checked and validated by
their actual evaluator, with exact attempt and observation-window bounds. Synthetic,
expired, unavailable-method and unusable scope/response captures remain unknown.
An availability pass means only that the supplied selected capture is usable under
this bounded contract; it proves neither authenticated execution nor semantic SEO
acceptance. Source and rendered methods remain separate populations.

Independent review reproduced a canonical redirect envelope incorrectly passing
availability: the collector can retain an empty/incomplete envelope after a scope,
status or navigation failure. New regressions and gap classification now keep those
unknown while retaining evidence. Rendering-only failures do not discard valid
source-method availability. The reviewer verified the fix with 50 focused tests
across acquisition and structured-data. Additional regressions cover foreign
capture scope, attempt chronology, duplicate methods, authority claims and omitted
private diagnostics. Structured-data request formats again include supported v2,
which the actual collector emits; its prior omission was corrected with a regression.

This adapter does not collect, authorize, persist a run, create report checks,
deduplicate attempts, or apply retry history. It now returns a bounded `sourceRecord`
and its digest separately from derived availability and assessment time. Retain all
supplied method envelopes in that source record, including an unselected method
when the requested method is missing; retaining only the selected capture would
make deterministic replay impossible. The reviewer identified this gap before
persistence implementation, and a roundtrip regression now reconstructs the adapter
input from the source record. Original absent source fields stay absent, and private
browser diagnostics are excluded. Store this bounded source record and a separately
fingerprinted projection in the upcoming immutable workflow; never trust cached
availability alone. Capture bytes remain private source evidence and must not be
copied into customer report text. Persistence, fingerprinted replay, stable availability checks,
requests, history, report projection and installed packaging are still required.

Final source-boundary review found that an unselected sibling envelope could retain
another customer's capture. All retained envelopes now pass their actual evaluator
with their own method and must match the bound scope, schema, attempt interval and
observation window before selection. Five regressions demonstrated the former
acceptance and now reject foreign customer/URL, unsupported schema and out-of-bounds
timestamps. Availability still depends on the selected method; a valid but incomplete
rendered sibling does not discard usable source evidence. The reviewer independently
passed all 31 acquisition tests and found no remaining blocker in this pure adapter
scope. Persistence/report integration is still a separate gate.

Final repository verification passed 129 files / 1,590 tests in 93.69 seconds,
plus lint, typecheck, build, format, site typecheck and 19 site tests. Earlier lint
required an explicit Node URL import; the final clean run includes that correction
and all source-record boundary regressions. Logs are retained at
`build/technical-seo-acquisition-normalization/verification/`. No skill package,
component lock, release version, customer website or deployment changed.

## Immutable acquisition workflow — development checkpoint

`acquisition-workflow.mjs` now creates immutable run revisions from attributed
attempt records. It retains typed source evidence and separately replayed assessment
projections, with exact evaluator fingerprints. Target scope/method/window is fixed;
duplicate attempt IDs within a target or duplicate populations are rejected. Empty
updates reassess retained attempts. Available captures are selected by observation
time with stable occurrence ordering; a later failed retry does not erase a still
usable capture. Source timestamps remain attempt metadata, not page observations.

Each target has a stable capture-availability check and durable data request. Valid
capture receipt can mark the request provided, expiry reopens it, and owner refusal
is preserved. Existing semantic checks are not promoted by capture availability.
Changes retain native check history and declared scope. Parent-bound JSON/Markdown/
HTML report regressions cover failure→capture→expiry and exclude raw capture content.

Index validation replays current and historical projections, requires append-only
source prefixes, and rejects rollback to an older projection by assessment time and
run lineage. A mutation test disabled the supersession guard and observed the
rollback regression fail, then restored the source. Replay work is bounded before
normalization: 20,000 reference occurrences and 64 MiB repeated capture bytes.
Additional limits cover 50 targets, 1,000 retained attempts, 50 new attempts/8 MiB
input, and 32 MiB serialized run. Limits reject rather than truncate history.

Independent reviewer `measurement_workflow_review` passed 12 workflow tests after
a test fixture was reduced below the canonical evaluator's individual input limit;
the aggregate byte-budget test still exceeds 64 MiB of referenced source bytes.
No remaining blocker was found in this development slice. Further work includes
installed entrypoint, provenance/package closure, fresh installs, broader semantic
coverage and commercial evaluation. The acquisition normalizer remains pure; its
earlier documentation of no persistence applies to that helper, not this new wrapper.

Packaging preparation verified the retained Schema.org 30.1 original bytes against
the existing source hash. The current IANA download has File-Date 2026-11-18 and
SHA-256 `8ac4e58567593c96e9e6d66e2017dbb8d3953dbcb42fe32ecd3b3fccdfdaba7b`;
it does not match the pinned 2026-09-17 source. The download and comparison receipt
are in `build/technical-seo-data-provenance/`. No registry pin was changed. Recover
the exact historical bytes or review an explicit dataset update and its behavioral
diff before creating the packaged data-source record; do not attribute the new
snapshot to the old digest.

Final integration verification passed 130 files / 1,602 tests in 123.97 seconds,
plus lint, typecheck, build, format, site typecheck and 19 site tests. Logs and the
rollback mutation result are retained in `build/technical-seo-acquisition-workflow/`.
This is a development API checkpoint; no package/component lock, release version,
customer website or deployment changed.

## Retained IANA source checkpoint

The explicit data update now pins the retained 2026-11-18 original snapshot in
`scripts/enterprise-technical-seo/sources/`. `language-registry-build.mjs` verifies
its exact SHA-256 before extracting the supported hreflang subset. Modified or
oversized bytes fail closed; the CLI creates output exclusively and never fetches
updates. `LANGUAGE-REGISTRY-NOTICE.md` records the source, qualified CC0 terms,
extraction scope, reproduction and required repository formatting step.

Independent reviewer `measurement_workflow_review` verified the 732,254-byte
snapshot hash, all three regressions, and a comparison against the prior committed
extract. Membership and deprecation sets are unchanged (190/224/272 entries and
6/0/11 deprecated language/script/region entries). The old source bytes remain
unavailable; this is an explicit new pin, not retroactive authentication. Registry
metadata changes the workflow fingerprint, so earlier runs remain unsupported
without a reviewed migration. The reviewer identified a byte-reproduction caveat:
the builder emits equivalent JSON, and repository Prettier formatting is a separate
documented step before hashing package files.

Full verification passed 131 files / 1,605 tests in 98.53 seconds, plus lint,
typecheck, build, format, site typecheck and 19 site tests. Local comparison and
verification receipts are in `build/technical-seo-data-provenance/`. The raw snapshot
and extractor are tracked so reproduction does not depend on that ignored folder.
This completes the IANA data prerequisite only. Packaged source records/license
closure, installed commands and fresh both-host installs still remain; candidate
0.3.18 and its component lock have not changed.
