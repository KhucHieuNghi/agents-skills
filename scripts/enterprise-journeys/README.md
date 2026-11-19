# UX/CRO development foundation

Development-only source, not bundled in content-search-audit 0.3.24. The [full journey implementation contract](../../docs/plans/website-audit-enterprise-journeys.md) retains functional journeys, research, experiments, immutable report integration and authorized runtime work. This first evaluator implements supplied aggregate funnel arithmetic only.

```js
import { evaluateFunnel } from "./funnel.mjs";
const result = evaluateFunnel(context, sources);
```

Inputs are strict, bounded and offline. No network, filesystem writes, browser actions, credentials or imported authorization are consumed. Use the synthetic JSON examples in `tests/fixtures/content-audit/enterprise/journeys/` to inspect the exact shapes. Their source bytes are hash-bound and their values are fictional. They do not establish native GA4 ingestion, backend correctness, user research, causality or commercial profile coverage.

The context retains the actual eligibility/continuation definition, endpoints, identity/dedup/retry rules, population and cohort window. Definition digests bind the step endpoints as well as the textual rules. Source descriptors bind original JSON bytes, export/manual attribution, scope, definition, population, window, quality flags and the event-time completeness watermark. Imported provenance and completeness remain declarations; the helper does not authenticate providers or verify query execution.

A rate is `observed` only when the declared cohort is exact, complete, unsampled, unthresholded and unmodeled, with matching subset membership, a mature continuation horizon and ingestion lag, and fresh evidence. This is measurement availability, never a UX-quality pass. Zero denominator retains zero counts but null rates. Missing or conflicting eligible evidence yields unknown and a scoped request. Stale/manual/partial counts remain in source accounting. The complement is observed non-continuation within the declared horizon, not proof of abandonment intent.

Open funnels may have more eligible entrants at later transitions. No cross-step subtraction, multiplication into end-to-end conversion, revenue attribution or industry benchmark is performed. Identical source aliases never become independent samples; conflicting eligible counts are not selected by array order. All-synthetic results and their requests keep a synthetic marker; no-source results are unknown, never silently real.

Output includes the exact validated context, definition/digest, source records, every declared transition, explicit numerator/denominator/value or null, all/selected source IDs, qualifications, source/transition accounting and precise requests. `providerAuthenticated`, `semanticAcceptance` and `causalAcceptance` stay false; `uxQualityAssessment` stays not-assessed. The downstream enterprise workflow must preserve these semantics and refuse to convert arithmetic into a broad UX verdict.

Run focused regressions with `node build/dependency-hardening-20261119/npm22.mjs exec -- vitest run tests/content-audit-journey-funnel.test.ts --maxWorkers=1` in this development checkout. The standard project test command also includes this suite. No versioned customer CLI or runtime collector is claimed by this directory.

## Development enterprise workflow

`evaluateEnterpriseFunnels(sourceDirectory, bundle, newOutputDirectory)` from `workflow.mjs` reads an immutable enterprise run. The bundle has sourceDigest, newRunId, assessmentAt and evaluations. Each evaluation contains evaluationId, sources and the evaluator context without customerId/assessmentAt; the run owns those values. A supplied evaluation ID cannot change its scope. Untouched evaluations are replayed at the new assessment time, and the output directory must be new.

The workflow retains raw evidence privately, recomputes historical projections, validates active and historical evidence ownership, and returns report-compatible observations with explicit ratio numerators/denominators. Current unavailable ratios are null; old results remain historical. The existing report builder creates JSON/Markdown/HTML without raw export bodies. Every transition adds an unknown UX-quality check, never a pass or automated finding. Existing intake checks and other modules remain in scope.

One stable request per transition asks for both scoped aggregate evidence and independent task research. Missing-measurement details supplement that obligation; a ratio becoming available does not silently change the request into another artifact type. Lifecycle state, evidence bindings, invalidation metadata and refusal reasons persist; the core reconciler expires evidence when appropriate. `provided` means a response is present, not that either UX or the response's semantic correctness is accepted. Separate research/experiment evaluation and native provider acquisition remain future work.

Ten workflow regressions cover canonical report projection, stale replay, scope/index tampering, unchanged source directories, untouched journeys, intake preservation, declined/invalid/provided responses, response expiry, and historical ownership. The independent reviewer found lifecycle reset and historical-binding bypass defects; both had failing regressions before fixes. No installed-host or commercial acceptance follows from these development tests.

## Internal task predicates

`evaluateJourneyTask(definition, facts)` in `task-rules.mjs` separates expected UI feedback from a declared terminal business outcome. It can distinguish a deliberate invalid-input rejection from a failed conversion expectation, without treating either as an automatic UX-quality finding. Unknown facts stay null/unproven; pending/attempt outcomes do not count as completion. The result retains the definition/digest and facts digest, two scoped predicates, and explicit false acceptance/authenticity/authorization flags.

This is an internal predicate, not a source importer. Before using it, the future observation adapter must validate the retained protocol, original evidence bytes, explicit correlation, scope, source conflicts, maturity and freshness. In particular, a short trace cannot establish no-feedback before the response horizon, and conflicting observations cannot be selected opportunistically. Do not call these functions directly on website instructions or use their result to execute transactions. The [journey plan](../../docs/plans/website-audit-enterprise-journeys.md) specifies the required adapter and reuse boundaries.

## Supplied task observation adapter

`evaluateTaskObservations(context, sources)` in `observations.mjs` now implements the first supplied-observation adapter. It is offline and development-only. The test fixture builder in `tests/content-audit-journey-observations.test.ts` documents the exact input shape; every input has strict top-level fields, bounded original JSON bytes, SHA-256, capture time and attributed provenance. Duplicate JSON keys, foreign scope, changed protocol/attempt mapping, mixed synthetic cohorts and unsupported policies are rejected.

Context retains instructions, preconditions, UI/business definitions, horizons/lag, step prerequisites, expected predicates, business source/outcome/dictionary bindings and the complete attempt manifest. Sources bind both protocolDigest and attemptsDigest. Correlation is explicitly unique per attempt; retries require new IDs and a prior same-step link. Later steps require a prior scoped predicate to be satisfied before their own start, not merely eventually. Unknown prerequisite evidence stays unknown.

UI evidence needs coverage from the action start; no-feedback needs the full response horizon. Completeness and clock alignment remain source declarations, not independently authenticated guarantees. Business inputs reuse the existing original dictionary/export normalizer and require an explicit matching pseudonymous attempt key, completeness watermark, horizon and ingestion lag. The supported selection policy is intentionally `single-terminal-record`: multiple related records within the horizon or distinct records across eligible exports remain unresolved. It does not choose a settlement over a refund or infer final state from order. Identical aliases remain one artifact, not independent trials.

Results retain original source envelopes privately, normalized records, all attempts, per-channel source IDs, conflicts, decisive timestamps and precise requests with intervals and evidence gaps. Manual/stale/partial/clock-unproven observations remain in source accounting. Shared condition conflicts block both channels; UI-only conflicts do not fabricate a business conflict. Pass/fail only describes the supplied declared predicate. Provider authentication, semantic/causal acceptance, UX-quality assessment and action authorization are not granted.

This adapter does not yet generate enterprise report revisions, ingest native browser traces automatically, reuse tracking/a11y outputs directly, or execute a journey. Those integrations, research/experiment work and installed/native-host evaluation remain open. Original source envelopes may contain private identifiers; do not hand the raw result to a public renderer.

## Task report workflow

`evaluateEnterpriseTasks(sourceDirectory, bundle, newOutputDirectory)` in `task-workflow.mjs` now integrates the supplied adapter into immutable enterprise runs. Like the funnel workflow, the bundle binds sourceDigest/newRunId/assessmentAt and a bounded evaluations array; each entry owns evaluationId/context/sources, while customer and assessment time come from the run. Source files and the evaluator fingerprint are retained privately. Unsupported producer fingerprints are rejected rather than silently reinterpreted; this development checkpoint does not provide migration of earlier development runs.

The returned `narrative` and `observations` fit the existing enterprise report builder. Narratives describe per-channel predicate results with opaque task references, attribution, assessment time and evidence gaps. Numeric observations are source/attempt accounting only, never conversion or UX scores. Earlier narratives are explicitly historical; accounting observations retain stable IDs and historical classification. Customer/public projection uses the existing report renderer. When revising a report containing other modules, preserve those modules' existing findings, narratives and observations in the report bundle; this function returns only its own report contributions.

UI and business predicates do not become global UX pass/fail checks or automatic findings. The workflow adds unknown UX interpretation checks and stable evidence/review obligations. An explicitly UI-only protocol keeps a backend not-assessed narrative without inventing a backend obligation. Declined/invalid/provided states and bindings follow the existing request lifecycle. Both task and funnel workflows now require complete ownership indexes across their checks, policies and historical evidence; omitted indexes cannot bypass duplicate-scope guards.

`tests/browser/enterprise-task-report.mjs` generates a synthetic fresh/expired report pair and tests customer/public editions at 390/1440px offline. It checks narrative parity, backend identifier withholding, no scripts/external requests, skip navigation and overflow. These are bounded projection checks, not actual customer journeys, independent semantic acceptance or general usability certification.

## Research metadata preflight

`planResearchIntake(context, descriptors)` in `research-intake.mjs` is the first qualitative-research component. It accepts only private metadata, not raw research text, and performs no filesystem/network/action execution. Full shapes are exercised by `tests/content-audit-research-intake.test.ts` and described in the [research plan](../../docs/plans/website-audit-enterprise-research.md).

The protocol binds actual purpose/recruitment/population/tasks/prompts, participant aliases and expected sessions. Assessment-time access binds purpose/protocol/recipient and expiry separately from imported source metadata. Stable record identity, source scope, acquisition-unit isolation, direct-only inference dependencies and unchanged planned coverage prevent an eligible subset from becoming a complete-study claim. Same-person aliases and source re-exports do not create independent participants. Shared artifact hashes containing multiple record identities are withheld before acquisition.

Output is a private intake plan, not a customer report or consent certificate. Content verification, research interpretation, population prevalence, study completion and action authorization stay false. Raw-content acquisition, semantic/dependency revalidation, disclosure controls, historical withdrawal handling and enterprise report integration remain open; do not feed this internal output into public reports.

## Private research record validation

`evaluateResearchRecords(context, descriptors, payloads)` in `research-records.mjs` now validates already-authorized isolated JSON records offline. It recomputes metadata preflight against the supplied current access context and checks every payload identity/eligibility before reading any artifactText. Acquisition remains the caller's separate responsibility; this function does not fetch, write or recall data.

Each payload is `{sourceId, artifactText}` with a predeclared hash. Its exact JSON shape is schemaVersion, scope, capturedAt, synthetic, provenance `{actor,method,locator}` and one record containing descriptor identity fields plus representation/text/supportBindings. Method is session-note, transcript-excerpt or analyst-note. Representations are behavior-description, verbatim-declared, paraphrase or interpretation, constrained by kind. See the synthetic `research-content.json` fixture and focused tests for exact shapes. Payloads are bounded at 1 MiB each and 16 MiB total; strict JSON rejects duplicate keys, nonfinite values and invalid Unicode.

Canonical record digests bind scope, kind, representation, text, canonical participant/session/task/prompt/time and exact support bindings. Transport IDs, serialization, export capture times and provenance aliases are deliberately excluded from this content identity; provenance is retained separately for every available alias. A verbatim-declared label is not quotation verification. Supporting record IDs and content digests must exactly match eligible direct evidence; missing, changed, conflicted or withheld dependencies suppress inference text and attributions.

Identical artifact hashes can reuse verified bytes, but every descriptor is still checked. A missing distinct declared version keeps its record unresolved. No favorable version is selected by array order. Planned coverage retains missing metadata, withheld access and unavailable/partial content states; evidenceCoverageComplete requires all declared records and required coverage cells to be available. This is structural availability only: studyComplete, semantic/prevalence/causal acceptance, consent authentication and action authorization remain false.

The returned namespace is private-research-record-evaluation. Available authorized record text and participant IDs are private evidence; unresolved records expose no text or attributions. No raw artifactText is returned, no customer summary is generated, and errors do not echo payload text. Customer disclosure, privacy-aware persistence/historical handling, semantic review and full enterprise report integration remain future work.

## Private disclosure metadata

`planResearchDisclosure(context, descriptors, policy, candidates)` in
`research-disclosure.mjs` checks current analysis/sharing eligibility before
candidate text or full review receipts are acquired. Policy scope binds customer,
entity, study, recipient, purpose and protocol; candidate metadata binds isolated
payload/receipt hashes and exact support IDs/digests. Interpretation candidates
require an inference record and its full direct dependency closure. Cross-candidate
and source-evidence artifact aliases are withheld.

This is private metadata only. `fetchEligible` is not host permission, a verified
content digest, a review verdict, storage authority or customer export approval.
The next content stage must validate original bytes and exact support digests,
review receipts and safe customer fields. Caller must recheck trusted access
immediately before acquisition. See the
[disclosure contract](../../docs/plans/website-audit-enterprise-research-disclosure.md).

## Offline customer research draft

`projectResearchDisclosure(context, descriptors, researchPayloads, policy,
candidates, payloads)` in `research-projection.mjs` returns **two separate objects**:
`customerDraft` and `privateDecision`. Never publish or serialize the enclosing
response as a customer report. No files, network calls or delivery are performed.

Candidate payloads are `{candidateId, artifactText, receiptText}`. All candidate
identities/current sharing decisions are checked before reading any text; the
function then independently reevaluates original research payloads and exact
canonical support digests. Missing or changed support withholds the complete
candidate without reading its text. Supplied restricted payloads are rejected;
callers must use metadata preflight before retrieving them.

Original strict JSON candidate bytes contain schemaVersion=1, candidateId,
scope, kind, supportBindings and five authored paraphrase fields: taskContext,
summary, limitation, recommendation and retest. Each text is nonempty, bounded
and well-formed Unicode. No transcript or source text is automatically copied.
The original hashes must match candidate metadata. A canonical candidate digest
sorts supportBindings by record ID and binds every text field and the full scope.

Review receipt bytes contain schemaVersion=1, candidateDigest, policyDigest,
scope, reviewedAt, validUntil, reviewer `{id,type:ai|human}` and verdicts
`{meaning,disclosure,recommendation}`. Every verdict must be `accept`; `reject`
and `pending` withhold the candidate. Exact receipt bindings, source-capture
chronology, current review age and scope/access expiry are checked. Identity
and judgment remain declared, not authenticated or independently guaranteed.

The customer draft contains edition-local random references, date-only assessment,
explicit synthetic classification, the five reviewed fields, kind, declared
review type and fixed limitations. No private IDs, hashes, counts, source paths
or support maps are copied. Random references intentionally differ on a new
projection; renderers should derive artifacts from a single saved canonical
customer model, not rerun projection independently for each format.

The private decision retains scope digests and exact evidence links. Review
failures retain generic reasons without candidate text. A current permission
snapshot cannot prove a prior withdrawal did not invalidate a receipt; persistent
access generations/invalidation and qualified disclosure judgment remain required.
This offline development adapter does not implement JSON/Markdown/HTML file
packaging, storage, delivery, withdrawal or commercial acceptance.

## In-memory research artifacts

`renderResearchDraft(customerDraft)` returns canonical `json`, derived `markdown`
and offline `html`, plus a `research-draft-v1` manifest. It accepts only the exact
customer model; private wrappers and extra fields are rejected. It performs no
persistence or delivery. `validateResearchDraftArtifacts(artifacts)` regenerates
all bytes and compares the manifest, so recomputing a modified HTML hash does not
make tampering valid. Hashes establish consistency, not review/access authenticity.

Generate the three artifacts from one projection result. A new projection receives
new random edition/reference IDs; do not project separately for each format.
`research-draft-v1` rendering and limitation text must remain frozen for retained
artifacts. Any incompatible rendering change requires a versioned dispatcher and
historical regeneration tests before those artifacts are supported as persisted
records. This development renderer does not yet provide retention/withdrawal or
an enterprise archive integration. Its neutral presentation is not NKSkills
branding and does not override the customer's future brand profile.

## Private access revision state

`research-access-state.mjs` supplies a pure reducer and artifact revision guard:

- `advanceResearchAccessState(previous, expectedDigest, context)` preserves scope,
  monotonic observation time and whole-snapshot generation. Access/policy changes
  require a strictly later observation time and increment generation. Refreshing
  unchanged state preserves the generation. It does not persist anything.
- `bindResearchAccessRevision(state, context, artifactDigest, reviewedAt,
contributorIds)` binds a new review to the current generation and exact artifact.
  Contributor IDs must be the complete canonical dependency closure derived by the
  trusted integration, never a user-selected subset. All contributors need current
  scoped analysis/sharing permission. Expiry is local to those contributors, not
  the earliest withdrawn or unrelated participant in the whole study.
- `checkResearchAccessRevision` returns `revisionMatches`, reasons and false
  storage/delivery authority. It is an additional metadata check before reading
  historical candidate/review bytes, not a replacement for current preflight.

The trusted caller must bind the complete candidate-and-receipt bundle digest and
verify reviewedAt against the actual receipt, derive contributors from all direct
support, and keep the latest state in a trusted store. A fabricated new timestamp
or omitted contributor is not a valid integration. The pure reducer cannot prevent
state rollback, re-creation at generation 1, missed withdrawal events or concurrent
delivery from a stale process. Actual atomic compare-and-swap persistence, delivery
serialization, receipt invalidation and controlled storage remain unimplemented;
these functions are not yet connected to the projection/delivery path.

## Revision-aware projection workflow

Use `research-revision-workflow.mjs` to combine current access generations with
candidate acquisition and customer projection:

1. Trusted review integration calls `bindResearchCandidateRevision` using the actual
   review timestamp. It derives the full canonical contributor set from validated
   support metadata and binds candidate metadata, original candidate/receipt hashes
   and policy digest. Store the resulting registration privately with the latest
   trusted state; imported source content cannot supply authority.
2. Call `planResearchAtRevision` before retrieving any historical candidate or
   receipt. Missing/stale registrations, incomplete contributors and changed
   candidate/receipt/policy metadata block retrieval. Advance trusted state first
   if the observed access snapshot changed.
3. `projectResearchAtRevision` repeats the metadata checks for every supplied
   payload before reading any candidate text, then invokes original evidence and
   disclosure validation. The actual parsed receipt time must equal the registered
   review time. A fabricated new binding timestamp cannot revive an old receipt.

This integrates the pure state guard into offline projection, not a transactional
store. The caller must retain the latest state and registrations, prevent rollback
or recreation after withdrawal, serialize delivery/revocation, and apply storage
and host permissions. Partial-source removal still requires a newly reviewed
candidate; the future persistent registry must enforce historical candidate-ID
invalidation. These functions perform no network/file operations or delivery.
The lower-level projection remains available for isolated structural tests but is
not the revision-aware customer release entrypoint.

## Local encrypted control-state store

`research-control-store.mjs` exposes `createResearchControlStore(options)`,
`readResearchControlStore(options)` and `advanceStoredResearchAccess(options,
expectedRevision)`. Options contain directory (absolute canonical path), a
caller-managed 32-byte Buffer key, current research context and a separate storage
authority. Authority exact fields: scopeDigest of the research scope, directory,
stagingDirectory (the directory's parent), artifactClass
`research-control-metadata`, allowed=true, observedAt, validUntil and
maxAgeSeconds. Caller-provided current context/time and grants are trusted inputs,
not authentication. Grant failure precedes filesystem access.

The store supports access state, verified review registrations and retired candidate
identities/artifact hashes. It rejects unsupported content rather than accepting raw transcripts. `advanceStoredResearchAccess` reads and
authenticates the previous state, applies the generation reducer, encrypts the new
state and performs an exact storage-revision compare-and-swap. Concurrent stale
writers fail; they do not overwrite the winning state or reset generation.

A Python isolated worker receives ciphertext only through stdin and a minimal
PATH/LANG environment. It uses SQLite BEGIN IMMEDIATE, a rollback journal and FULL
synchronization. Node AES-256-GCM authenticates scope and storage revision as AAD.
The key stays in the caller process; supply it through an approved key manager,
not a file beside the database. Wrong keys/corruption fail closed. This does not
promise memory erasure, key rotation, backup recovery or resistance to whole-store
rollback by a principal controlling the local files/key.

Creation initializes an encrypted database in an authorized private sibling stage,
then publishes using a no-replace rename. Supported code paths are Darwin and Linux;
only Darwin was exercised here. Unsupported publication primitives fail closed.
Directory/db modes are 0700/0600, owner checked, and database symlink/hardlink and
noncanonical directory paths rejected. A hard crash before publication can leave a
private encrypted `.research-control-init-*` sibling. It does not occupy the final
path; a later create can succeed. Cleanup needs owner-scoped orphan verification,
not wildcard deletion. Existing targets are never replaced. Timeouts can leave an
unknown commit result; read current state before deciding whether to retry.

This is a local control-state backend, not the raw evidence vault, retention and
withdrawal subsystem or controlled delivery service. Same-UID hostile processes,
filesystem rollback, live credential authentication and distributed consistency
are outside this tested boundary. Never treat successful persistence as permission
to publish customer artifacts.

## Stored review registration lifecycle

`registerStoredResearchReviews(options, expectedRevision, bundle)` accepts
`{descriptors,researchPayloads,policy,candidates,payloads}`. It requires every
candidate in the transaction to have accepted exact evidence/review, derives actual
receipt time and full contributors, and stores only registration metadata. Private
source/candidate text stays transient. Missing/rejected candidates abort the whole
registration transaction; no partially accepted registration set is persisted.

Existing candidate IDs cannot acquire changed evidence, candidate text, review
bytes or policy. A generation change retires all active candidate IDs and clears
registrations in the same encrypted CAS update. Regrant never revives those IDs;
a newly authored and reviewed candidate needs a new ID. Unchanged access observation
preserves active registrations. This conservative whole-study invalidation also
applies to access refreshes that change the snapshot.

`planStoredResearchDisclosure` reads the current encrypted registry and feeds its
registrations to revision-aware metadata preflight before any historical candidate
text is retrieved. Store revision is returned for later transaction checks; a plan
is not delivery authority. Registration and revocation races have one CAS winner;
a losing revocation must be retried against the latest revision before withdrawal
can be considered applied. Do not call a rejected update a successful withdrawal.

Control schema 2 adds retiredCandidateIds. Legacy schema 1 with an empty registry
is normalized in memory without rewriting; the next successful CAS writes schema 2.
Unknown legacy content is rejected. Limits are 1,000 active registrations, 10,000
retired IDs, 20,000 retired hashes and 4 MiB plaintext before encryption. Exceeding a limit fails closed;
never truncate retirement history to make a write pass. Retention and controlled
cleanup of these private identifiers remain owner-governed work before production.

## Build a draft from the persistent registry

`buildStoredResearchDraft(options, expectedRevision, bundle)` in
`research-stored-report.mjs` accepts the same supplied-evidence bundle as registration.
It reads the authenticated current store, checks the expected revision and known
retired artifacts before payload access, selects persisted registrations, and runs
revision-aware projection. One canonical customer draft feeds JSON/Markdown/HTML.
A second authenticated read rejects the result if the store changed during the
work. The shared retired-artifact gate also runs in stored acquisition preflight.

Return values separate `customerDraft`, `customerArtifacts` and `privateDecision`.
Never serialize the whole response for a customer. This function performs no
customer-artifact writes or delivery. A successful result is consistent with the
final checked revision only: concurrent analysis is not locked, and the revision
can change after return. A later delivery step still needs current access and an
atomic distribution/withdrawal boundary. A conflict means discard the local draft,
read current state and repeat authorized preflight; never relabel it as current.

## Experiment arithmetic foundation

`experiment-statistics.mjs` exports `fisherExactBinary(control, treatment)` and
`wilsonBinary95(arm)`. Arms have exact fields `{successes,total}` with integer
counts, positive totals and at most 10,000 combined units for Fisher (10,000 for
a Wilson arm). Fisher returns exact positive probability numerator/denominator
strings, observed rates and treatment-minus-control risk difference. Do not cast
the large fraction to Number: that can overflow or underflow. No p-value verdict
or design eligibility is returned. Wilson is approximate marginal 95% coverage,
not a difference interval or simultaneous coverage across metrics.

These are internal development methods, not a released experiment evaluator.
Design, assignment, exclusion/denominator quality, source provenance, multiplicity,
stopping, guardrail interpretation and immutable enterprise integration remain
required in the [implementation plan](../../docs/plans/website-audit-enterprise-experiments.md).
See the [numerical evidence](../../docs/research/enterprise-experiment-statistics.md).

`experiment-accounting.mjs` adds internal ITT count reconciliation per arm/metric.
It retains unexposed assigned units, requires explicit outcome partitions and
known-zero unresolved/excluded/duplicate/crossover counts, and returns all
detectable accounting blockers. It produces a binary arm only when accounting
is eligible; this does not establish statistical or causal eligibility.
The exact field semantics and pending integration are in the experiment plan.

`experiment-allocation.mjs` provides an exact probability-ordered binomial
allocation diagnostic for a declared independent Bernoulli mechanism with a
fixed rational probability. It supports empty individual arms, positive combined
populations up to 10,000 and rational denominators up to 1,000. It returns no
SRM pass/fail or causal claim. `newcombeDifference95` adds an approximate marginal
95% treatment-minus-control risk-difference interval to the statistics module;
it is not a Fisher inversion or simultaneous multi-metric interval. Decision
thresholds, multiplicity and original-source validation remain separate work.

`experiment-decision.mjs` now composes reviewed caller facts, cohort/denominator
accounting, exact SRM and family-adjusted Newcombe intervals for one primary
and 1–19 guardrails. It retains missing metrics and the entire prespecified family,
uses direction-specific practical/harm margins, and separates insufficient effects
from unresolved effects. All source/design facts remain caller attestations; this
is not an importer. Joint support grants no causal or action authority. The plan
defines exact shapes, approximate nominal coverage and decision boundaries.
