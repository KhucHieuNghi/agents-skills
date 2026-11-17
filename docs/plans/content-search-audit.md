# Content Search Audit Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task after design review. The task checklist is being reconciled against implementation and retained evidence; the chronological ledger below records earlier checkpoints. Unchecked items are not claimed complete.

**Goal:** Deliver one custom skill that audits the entire declared content inventory across quality, SEO, AIO, AEO and GEO using reviewed inherited methods and inspectable evidence.

**Architecture:** One bundled skill with one SKILL.md, internal adapted method references, deterministic collection/validation helpers and explicit source provenance. Existing Solution Skill packaging is retained; content audit modules are not separate discoverable skills.

**Tech Stack:** Existing TypeScript release CLI; portable Node.js ESM helpers targeting Node 22+; JSON/JSONL/CSV and offline HTML/Markdown. Optional rendered-browser and analytics adapters, never mandatory for offline audit.

**Spec:** ../specs/content-search-audit.md

## Global constraints

Only Codex and Claude Code. No pinned model. Target audit is read-only; requested reports are written into an explicit output folder. Missing data is unknown. All known in-scope items must be accounted for; sampling is labeled. No automatic publishing, upstream updates or customer content changes. Single discoverable skill; internal methods are not SKILL.md files. Dependency and attribution review precede copying.

## File structure

```text
skills/content-search-audit/
  SKILL.md                       # intake, dispatch, workflow, completion contract
  README.md                      # customer usage and prerequisites
  provenance.lock.json           # immutable original/adapted source mapping
  NOTICE.md
  licenses/                      # license texts for inherited material
  references/
    workflow.md
    scope-and-coverage.md
    evidence-contract.md
    prioritization.md
    report-contract.md
    hosts/codex.md
    hosts/claude-code.md
    methods/content-quality.md
    methods/technical-seo.md
    methods/ai-search-readiness.md
    methods/answer-quality.md
    methods/generative-visibility.md
    methods/content-portfolio.md
  rules/                         # versioned rule registry
  schemas/                       # run, inventory, evidence, check, finding, coverage
  templates/report.md
  templates/report.html
  scripts/audit.mjs               # one deterministic helper command dispatcher
  scripts/lib/inventory.mjs
  scripts/lib/collect.mjs
  scripts/lib/checks.mjs
  scripts/lib/coverage.mjs
  scripts/lib/report.mjs
  scripts/lib/state.mjs
solutions/content-search-audit.yaml
src/composition.ts               # internal provenance validation
scripts/verify-content-audit.mjs # author-side release/fixture verification
scripts/eval-content-audit.mjs   # labeled semantic-trial aggregation
 tests/                         # actual test names below, no leading space
```

Helper dispatcher planned subcommands: `inventory`, `collect`, `check`, `coverage`, `validate`, `render`, `resume`. They are internal implementation details; the user invokes the one skill. Semantic findings are supplied by the host using the same contracts; scripts must not invent semantic conclusions.

## Review focus

1. Incomplete discovery incorrectly advertised as full: Tasks 3/6 test pending queue and missing data.
2. External source content acting as instructions: Tasks 4/9 test hostile content without executing it.
3. Canonical aliases erasing localization or duplication findings: Task 3 preserves relationships.
4. Browser/API readiness confused with actual visibility: Tasks 5/7 test evidence separation.
5. Internal inherited materials lose attribution or expose extra skills: Tasks 1/2/8 verify closure and install surface.

## Task 1 — Source review and rule mapping

Files: create docs/research/content-search-audit-upstreams.md; later add approved records in catalog.yaml. No changes to existing pins.

- [x] Resolve each candidate in the spec to its current canonical repository and full immutable SHA. Record discovery date, source paths, actual license texts, file-level notices and referenced dependencies.
- [x] Read selected SKILL.md files plus all referenced local material and scripts; classify methods as reuse, adapt, reference-only or reject with reason. Review Corey audit/AI/schema/content plus competitor, editorial and analytics support; compare Claude SEO, RankXAI, Zubair and Aaron's current family. Avoid inheriting redundant instructions solely to increase source count.
- [x] Create mapping: audit rule → source section → official corroboration → adaptation → expected fixture. Distinguish license permission review from efficacy evidence.
- [x] Gate: all selected material has explicit closure and provenance; unresolved candidates remain excluded. Record omitted alternatives and capabilities they would add. Only then create reviewed catalog pins.

Task 1 selection research is reconciled in the
[0.1.31 research closure](../research/content-search-audit-research-reconciliation-0131.md).
A fresh check matches 88 inventoried files across nine repositories to recorded
hashes and pinned Git objects. Five inherited sources retain selected-material
closure and provenance; seven comparison families and Corey support methods have
explicit dispositions. Excluded runtime/transitive scopes remain excluded, not
implicitly cleared. These completed research-selection items do not assert full
external repository review or behavioral acceptance. No public catalog pin changes.

## Task 2 — Single-skill composition validation

Files: src/composition.ts; src/release.ts; tests/composition.test.ts; tests/release.test.ts.

Interface: `verifyComposition(skillDirectory: string): Promise<CompositionSummary>` validates provenance.lock.json, referenced original/adapted destination hashes, license files and all relative references. Summary returns source records and packaged notice path. Ordinary bundled skills without composition metadata retain existing behavior.

- [x] Write failing cases: missing license, altered adaptation, outside-package path, symlink escape, absent source mapping, nested SKILL.md, hash mismatch and missing reference.
- [x] Implement verifier and a package-specific single-skill surface assertion. Keep source snapshots outside discoverable install paths.
- [x] Integrate build/verification and add root NOTICE pointer to validated internal attribution for composed bundles. Include tamper/collision and unchanged legacy-release tests.
- [x] Run `npm test -- tests/composition.test.ts tests/release.test.ts`; confirm deterministic output and no silent fetch/update during install.

Verified checkpoint: current composition/release source inspected and focused command passed 2 files / 18 tests. Tests cover intact and tampered internal notices, build/reopen validation, ordinary releases, dual-host collision rejection, nested entrypoints, missing licenses, escaped paths, symlinks and broken references. Added an explicit regression for adapted material with an empty source mapping; the existing verifier rejects it. This new regression passed against the current implementation, not an independently observed pre-fix failure. Installation behavior also has the retained frozen-archive receipts described under Task 8; these tests alone do not certify upstream semantics or licensing closure.

## Task 3 — Inventory and run-state contracts

Files: package schemas, scripts/lib/inventory.mjs, scripts/lib/state.mjs; tests/content-audit-inventory.test.ts.

Interfaces: `normalizeItems(inputs, scope) -> InventoryItem[]`; `saveCheckpoint(runDirectory, state) -> Promise<void>`; `loadCheckpoint(runDirectory, configHash) -> Promise<RunState>`. Schemas enforce the fields and status enums in the spec. Checkpoint atomic replacement, immutable input hashes, stable IDs and no hidden sampling.

- [x] Fixtures cover sitemap/crawl/CMS/repo/analytics union, query-sensitive URLs, locale aliases, conflicting canonicals, unknown source completeness and unsupported media.
- [x] Preserve all source memberships and relationships; enumerate all items before declaring coverage. Store transcripts/PDF extraction availability without fabricating contents.
- [x] Test 1,200 items across batches, interruption/restart, changed input invalidation, excluded items with reasons and cursor recovery. Same input/config must reproduce IDs and counts.
- [x] Run `npm test -- tests/content-audit-inventory.test.ts`.

Task 3 reconciliation: see the current contract-reconciliation research document.
Inspected assertions cover union/variants/conflicts, missing discovery, unsupported
media, stable IDs, 1,200-item recovery, changed/dependent snapshots and explained
exclusions. Native recovery evidence is bounded to committed checkpoints. The
transcript/extraction availability item is now verified in
[transcript-accounting-0125](../research/content-search-audit-trials/transcript-accounting-0125/README.md):
six fresh installed CLI runs retain supplied/missing transcript and unsupported
audio states independently, preserving memberships. Native extraction-0125 and
extraction-recovery tests separately cover actual PDF extraction and attributed
unsupported-to-pending recovery. These checks do not certify speech/transcript
accuracy or arbitrary mid-write transaction guarantees.

## Task 4 — Evidence collection

Files: scripts/lib/collect.mjs, evidence schema, scripts/audit.mjs; tests/content-audit-collect.test.ts.

Interface: `collectItem(item, policy) -> Promise<CollectionResult>` returns evidence records, snapshot hashes and status; policy includes scope, rate limits, byte limits and authorized adapters. No findings are inferred solely from a fetch failure.

- [x] Test raw HTML and optional rendered DOM, headers, redirects, schema extraction and local Markdown/PDF/transcript inputs using inert fixtures.
- [x] Implement spec limits, host allowlist, SSRF and redirect checks, retries, private-data redaction, robots policy and local output-only writes.
- [x] Test auth barriers, 429, timeout, oversized body, private redirect, hostile page instructions and unavailable render adapter. Unknown or blocked is persisted, not scored as content failure.

Task 4 boundary-test item reconciled on 2026-11-17 against the actual assertions
and retained results in [collection-boundaries-0131](../research/content-search-audit-trials/collection-boundaries-0131/README.md).
All three installed host configurations exercise the named cases. Auth/rate
barriers keep response judgments unknown; timeout/oversize are failed collection
states without failed content checks/findings; private redirect is blocked; the
hostile shell without a renderer stays pending with semantic checks unknown.
Campaign and recapture paths retain their separate assertions. This checks off
the specified collection tests only. Native instruction compliance and independent
semantic acceptance remain open under Task 9; they are not extra prerequisites
silently added to this testing item.

- [x] Run `npm test -- tests/content-audit-collect.test.ts`.

Task 4 input-surface test reconciliation: `content-audit-collect.test.ts` checks
exact HTML/Markdown bytes and unsupported PDF accounting. The extraction-recovery
suite tests supplied PDF page provenance and invalidation, not parser accuracy.
The transcript-accounting-0125 installed CLI receipt retains supplied, missing and
unsupported media separately. Network tests inspect anonymous headers, authorized
redirect chains and cookie non-forwarding under injected transport. The review
suite now persists separate raw HTML, supplied DOM and schema-extraction snapshots,
retains semantic unknowns and rejects modified capture bytes before output.
This closes the inert-input test item; it does not claim browser/parser execution
in those unit tests. Actual optional browser/PDF behavior remains separately scoped
in native-extraction-0125, including Codex's unavailable DOM and Claude's unsupported
image-only PDF. Privacy/native acceptance and the other compound items stay open.

Task 4 implementation reconciliation: network/public collector enforce exact
origins, all-answer DNS checks, connection pinning, anonymous headers, bounded
redirects, 10 MiB public bodies/decoded output, 20-second default deadlines and
at most two retries. Shared-host scheduling enforces two active requests and one
second between starts; campaign partitions default to and cannot exceed 500 items
without limiting total inventory. Run output rejects source roots and installed
package paths. Explicit-literal redaction supports evidence, reports, campaign
reports and supplied measurement attachments while preserving raw snapshots.
This implemented redaction scope requires every sensitive representation to be
declared; it is not arbitrary PII detection or an independent privacy certification.
Inspected source and tests are mapped in the collection-gates document. Native
acceptance and broader privacy review remain separate open gates.

## Task 5 — Rules and semantic audit methods

Files: references/methods/_, rules/_, scripts/lib/checks.mjs, check/finding schemas; tests/content-audit-rules.test.ts.

Interface: `evaluateChecks(item, evidence, rules) -> CheckResult[]` for deterministic checks only. Host semantic review produces schema-valid Finding records citing evidence and inherited rule IDs.

- [x] Write expected checks for each spec dimension and cross-content relationships; include contradictions, freshness, duplicated intent, navigation, alt text and locale differences.
- [x] Adapt selected upstream procedures into internal references with file-level provenance. Resolve contradictory instructions explicitly. Load only methods needed for item type and stage.
- [x] Test no-data behavior, unsupported schema assumptions, index evidence versus HTTP success, crawler access versus observed citations and deduplicated multi-dimension findings.
- [ ] Human-review fixtures catch fabricated volumes, arbitrary word-count rules, invented brand claims and ungrounded expertise judgments.
- [x] Run `npm test -- tests/content-audit-rules.test.ts`.

Task 5 deterministic boundary reconciliation: the rules suite checks all 26 rules
remain unknown without evidence and HTTP success does not resolve index controls.
Four added schema cases cover raw HTML, stripped text, empty raw extraction and
present JSON-LD; none automatically establishes schema validity or rendered absence.
Missing extraction rejects a purported schema verdict. A supported crawler-policy
review leaves all three GEO checks unknown and cannot substitute for AI observations.
The report suite now verifies one already-reconciled finding with two dimensions
remains one Markdown/HTML backlog entry and one CSV action, while both checks retain
their own coverage. This tests preservation of supplied reconciliation, not automatic
semantic duplicate detection or host judgment. The human-review gate stays open.

## Task 6 — Coverage, priority and report

Files: scripts/lib/coverage.mjs, scripts/lib/report.mjs, templates/*, scripts/verify-content-audit.mjs; tests/content-audit-report.test.ts.

Interfaces: `computeCoverage(inventory, checks, run) -> Coverage`; `validateAudit(runDirectory) -> ValidationResult`; `renderReport(audit, outputDirectory) -> Promise<void>`.

- [x] Enforce evidence references, denominators and terminal coverage states. Complete is rejected for pending items, missing required checks or undisclosed scope gaps.
- [x] Build severity/confidence/effort backlog without a fabricated overall SEO score. Findings have concrete verification steps and affected items.
- [x] Produce spec artifacts; offline HTML uses escaped data and customer branding. CSV neutralizes formula prefixes. Report lists missing measurements and source age.
- [x] Tests cover broken references, malformed records, partial audit, unknown inventory completeness, HTML/CSV injection and equivalence between JSON and human report counts.
- [x] Run `npm test -- tests/content-audit-report.test.ts`.

Task 6 reconciliation: coverage tests explicitly reject missing checks, unknown scope,
queued work and false completion while retaining excluded/blocked/unsupported
counts. Validation tests reject reduced plans, artifact/value/hash tampering,
dangling evidence and dependency cycles. Report tests compare coverage and findings
across JSON/Markdown/HTML/CSV and exercise injection escaping. The corresponding
structural/test items are now checked. Artifact/branding requirements are reconciled
through candidate 0.1.20: named outputs and coverage (0.1.11), actions (0.1.12),
source age (0.1.13), inventory type (0.1.14), run scope/permissions/budgets (0.1.15),
and explicit-literal standalone/campaign/measurement sharing (0.1.17–0.1.20).
Fresh-install receipts and regression tests are linked in those checkpoints.
This closes artifact production, not semantic fidelity or independent privacy review.

## Task 7 — Optional measurement adapters

Files: references/measurement.md, schemas/ai-observation.schema.json, scripts/lib/measurements.mjs; tests/content-audit-measurement.test.ts.

Interface: `importMeasurements(source, metadata) -> MeasurementSet`. V1 accepts supplied exports first; live connectors require explicit authorization and documented cost. Baseline audit does not depend on private credentials.

- [x] Define separate Search Console, Bing, analytics, server log and AI-observation inputs. Retain dates, locale, surface, prompt and collection method.
- [x] Define mention/citation/accuracy metrics with explicit denominators and repetitions. Separate consumer UI, API and synthetic fixture observations.
- [x] Test missing denominators, duplicate runs, cross-period comparisons, unavailable credentials and zero observations; never output zero as a substitute for unknown.
- [x] Run `npm test -- tests/content-audit-measurement.test.ts`.

Reconciliation evidence (updated for 0.1.8): measurement.md and server-logs.md define distinct supplied-data envelopes, and the provider adapters/tests retain identity, time, grain, scope and missingness. Supplied claim/response accuracy is implemented since 0.1.7 and tested in both native hosts; 0.1.8 repairs the campaign CLI option allowlist. The metric-definition item is complete. The audit-output evaluator remains a separate author tool, not an AI-answer accuracy metric. The remaining compound test-scope item requires reconciliation of every listed case; it is not kept open because accuracy is absent.

## Task 8 — Entrypoint and release candidate

Files: SKILL.md, README.md, references/workflow.md, references/hosts/*, solutions/content-search-audit.yaml, catalog.yaml; tests/content-audit-package.test.ts.

- [x] Write concise entrypoint with one invocation, adaptive intake, default full-inventory audit, partial/resume behavior and all dimension dispatch. No requests to invoke another skill.
- [x] One bundled component in manifest, candidate version 0.1.0; final digest only after content freeze. Document internal source lock and evaluation-stage status.
- [x] Build versioned archive; install extracted archive into three fresh projects: Codex, Claude Code, both. Confirm exactly one customer skill in each host surface and offline reference/notice closure.
- [x] Test upgrade to a higher candidate version, reject modified local components and verify installed lock. Do not overwrite older published bytes.
- [x] Run `npm test -- tests/content-audit-package.test.ts` and record archive/directory hashes.

Verified checkpoint (0.1.9): the single entrypoint, immutable five-source composition,
manifest and package tests pass. Fresh extracted-archive installs on Codex, Claude
Code and combined verify component digests, provenance and installation locks.
content-search-audit-capability-installation-snapshot.json records the current
archive. content-search-audit-019-upgrade-snapshot.json verifies 0.1.8 → 0.1.9 on
both hosts, customer-file preservation, rejection of modified installations without
mutation, and byte/link equality after isolated whole-project backup restoration.
This is candidate delivery, not commercial acceptance, CLI downgrade or live recovery.
Earlier frozen versions and historical receipts remain unchanged.

## Task 9 — Host evaluation and acceptance

Files: tests/fixtures/content-audit/*, docs/research/content-search-audit-evaluation.md, scripts/eval-content-audit.mjs.

Independent-review handoff: the user will review directly. The prepared
[packet](../research/content-search-audit-human-review-0131/README.md) separates
four historical reports, source/gold, prior author judgments, recorded traces and
an unfilled review form. Its read-only verifier rechecks 42 referenced files and
294 raw archive members. No human verdict has been received, no acceptance field
is prefilled and historical 0.1.29 trials are not relabeled as 0.1.31 runs.

- [ ] Curate labeled findings and clean controls across all fixture classes in the spec. Keep gold annotations out of model-visible targets.
- [ ] Run Codex and Claude Code independently with same data, tools and configuration. Each host: offline export, live-authorized site, missing analytics and interrupted/resumed full inventory.
- [ ] Record host version/config, tool availability, package hash, coverage, duration, cost where measured, false positives/negatives and all instruction boundary failures.
- [ ] Evaluate spec targets: >=90% semantic precision, >=80% recall on labeled material issues, all critical deterministic cases, zero fabricated metrics and complete accounting. Unmet targets leave candidate evaluation open.
- [x] Real NKSkills pilot follows read-only audit first; any changes to site require a separate implementation task. Do not claim search uplift from fixture success.

## Task 10 — Release review and publication preparation

Files: docs/agent-catalog.md, docs/guides/*, docs/releases/<new-release>.md; website content only after candidate status is accurate.

- [x] Run root `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`.
- [x] Run package/reference/provenance checks, archive build and fresh installs for both hosts. If website changes, read DESIGN.md and run site unit/type/build/browser/design contract checks sequentially where output directories are shared.
- [x] Check primary-source rule freshness and attribution. Publish evidence-backed status only; research candidate is not a commercial release. Current 26-rule review: [0.1.22 source reconciliation](../research/content-search-audit-source-reconciliation-0122.md). This does not close comparison-candidate research or semantic acceptance.
- [ ] Prepare scoped commit/release and deploy only under explicit release authorization. Record rollback to previous package and no automatic upstream upgrade.

Task 10 verification checkpoint: the frozen 0.1.25 archive was installed again in
fresh Codex, Claude Code and combined projects for semantic-0125; original and
installed component hashes match. Following evidence-document updates, all six root
commands pass, including 62 files / 448 tests. No website files changed in this
checkpoint. These two checks close verification of the present candidate bytes;
they do not close semantic acceptance, publication or future changed bytes.

## Dependency order and effort

1 precedes 2 and 5. 3 precedes 4, 5 and 6. 4/5 precede 6. 7 consumes 3 and feeds 6. 2/6/7 precede 8. 8 precedes 9; 9 gates 10. Effort is not estimated from repository stars: after Task 1 report source count, external dependencies and fixture scope before committing to a calendar.

## Completion evidence

One invocation: fresh host discovery and recorded trials (8/9). Inherited methods: provenance and adaptation map (1/2/5). All content: inventory and resume fixtures plus coverage report (3/6). SEO/AIO/AEO/GEO: rule coverage and labeled trials (5/9). Customer deliverable: validated reports and fresh-install archive (6/8). The original proposed task list is retained above, with verified items checked as evidence is reconciled. The ledger below is chronological; earlier pending statements do not override later verified checkpoints. Commercial release gates remain open.

## Execution ledger 2026-11-16

- Research: seven Corey folders enumerated at an immutable revision; original tree hashes and file inventories recorded separately from the earlier entrypoint-only snapshot.
- Source review: root license and selected entrypoints/references inspected; transitive Profound/Jam lineage found and remains unresolved. No copied framework may be packaged until this is resolved.
- Rule correction: FAQ search-feature support must use the current primary changelog, not the 2023 health/government exception.
- Implementation: Task 2 verifier exists in src/composition.ts with nine focused tests. Release integration is now covered by three tests; real package validation remains pending. Task 3 inventory normalization is implemented, while schemas and checkpoint/resume remain pending.
- Authoring documents moved into tracked documentation paths because docs/superpowers is ignored. Original ignored copies are historical drafts; docs/specs and docs/plans are authoritative for this work.

### Composition verifier checkpoint

Implemented explicit declaration checking, full packaged file-set hashes, source revision/hash fields, included license hashes, source mapping, one SKILL.md surface, symlink rejection and inline local reference existence. The verifier returns undefined for legacy packages without a lock. It does not prove that a declared upstream digest was actually reviewed, validate Markdown anchors, or resolve transitive licensing; these remain publisher review responsibilities. It is now wired into release build/verify; generated root NOTICE points to the internal attribution file. Focused red run: 8 failures and 1 legacy pass; green run: all 9 passed. Do not mark the release gate complete from this isolated module.

### Release integration and inventory checkpoint

- `src/release.ts` validates composition before build and during release verification; legacy skills remain supported. Three new integration tests failed before integration and passed afterward, including a modified internal NOTICE with a recomputed enclosing component digest.
- `skills/content-search-audit/scripts/lib/inventory.mjs` provides normalizeItems. It unions source memberships without discarding locale/query variants, retains conflicting canonical/locale declarations, rejects embedded URL credentials and distinguishes explicit local paths from public URLs. It never fetches or grants local read permission.
- Seven inventory tests cover source union, stable ordering, conflicts, all 1,200 declared items, explicit tracking-parameter removal and invalid input. Collection, schemas, coverage state machine and checkpoint/resume are still pending; the containing folder is not yet a valid installable skill package.

### Recovery and coverage checkpoint

- Added state.mjs: validates checkpoint identity/configuration/input hashes/check dependencies, writes through a synced temporary file and atomic rename, and recovers the cursor. Changed or removed snapshots invalidate dependent cross-item checks; unchanged independent results remain reusable. Six tests failed with stubs, then passed.
- Added coverage.mjs: keeps exclusions in totals, distinguishes accounted terminal states from audited items, rejects duplicate/dangling records, and refuses complete coverage for sampling, unknown discovery, queued items, missing/unknown required checks or an empty scope. Seven tests failed with a stub, then passed.
- Ruling: coverage computes completion against the declared rule plan, not an implicit universal list. The later artifact validator must verify rule-plan completeness and evidence references before final completion; omitting that gate could incorrectly accept an incomplete audit.
- Ruling: checkpoint persistence is single-writer atomic replacement, not a concurrent writer lock or final report validator. Host orchestration must serialize checkpoints; concurrent writers would otherwise overwrite newer state. Resume resets the cursor after inventory changes so new sort order cannot skip items.
- Full suite: 25 files / 198 tests passed. Lint, typecheck, format check, build and diff check passed after using the Node global through globalThis. Schemas, collector, final artifact validation and host trials remain unimplemented.
- Research: resolved Profound repository and actual MIT license; read three original modules and recorded immutable hashes. Historical Corey derivative revisions and Jam remain unresolved; direct adaptations of reviewed original Profound modules avoid those unresolved derivative paths.

### Local collector and entrypoint checkpoint

- Previous goal turn classified as progress: authoritative state/recovery/coverage code and Profound source evidence were added. Continued from the live worktree, with no active external process to wait for.
- Added local collectItem for authorized UTF-8 HTML/Markdown/text exports. It preserves exact source text and hashes, labels static/rendering/index limitations, checks real paths against authorized roots, bounds reads, rejects nonregular/binary/unsupported inputs and records collection failures. Seven stub tests failed, then all passed. macOS resolves /var to /private/var; the evidence locator assertion was corrected to compare the real path.
- Ruling: local collection supports trusted stable export roots, not attacker-mutated directory trees. O_NOFOLLOW protects the final path component and realpath checks scope, but this is not a sandbox against concurrent ancestor replacement. Public-site collection remains a separate pending implementation, not silently substituted by local mode.
- Added the sole SKILL.md, candidate README and workflow, coverage and evidence references. They define all six dimensions and make the unfinished release status explicit. No upstream skill invocation is exposed; inherited method packages and attribution locks are still pending.
- Root suite: 26 files / 205 tests passed. Typecheck, format, build and diff check passed. Lint initially found missing explicit Node Buffer import; fixed, lint and seven collector tests passed. This does not establish live network behavior, complete artifact validation or host evaluation.

### Inherited methods and real-package provenance checkpoint

- Previous goal turn was progress: local collection and the sole entrypoint were implemented and verified. Current worktree rechecked before this continuation.
- Re-read complete Corey seo-audit and content-strategy entrypoints. Added six internal method references, routed from the sole SKILL.md, adapting selected sections from those two entrypoints and three previously reviewed original Profound entrypoints.
- Packaged unchanged Corey/Profound MIT licenses, NOTICE and a file-level provenance lock covering every package file. Five immutable source-folder identities are retained. No related skill, executable or unreviewed derivative reference is included.
- Ruling: source-folder digests identify source baselines; adaptation scope is selected entrypoint sections, not every linked upstream reference. This avoids importing unrelated transitive frameworks. Incorrectly expanding inheritance later without renewed review would violate the provenance boundary.
- Real-package test first failed with absent provenance, then passed with all five expected sources and complete reference/hash closure. Single-entrypoint validation also passes. Full suite: 27 files / 207 tests passed. Lint, typecheck, build and diff check passed. Prettier flagged the generated lock; formatting corrected separately.
- These are procedural method references, not a completed executable rule registry. Collector network support, per-rule evidence contracts, report generation, released solution manifest and two-host evaluation remain pending. The lock must be deliberately refreshed after reviewed package changes; never let a test auto-update it.

### Supplied AI observation importer checkpoint

- Previous goal turn classified as progress: six inherited methods and real-package provenance were added. Live worktree and measurement method re-read before this implementation.
- Added importMeasurements: verifies supplied response artifact SHA-256, explicit synthetic labeling, capture/annotation fields and exact brand hosts; deduplicates observation IDs, rejects conflicting reuse, and separates engine/surface/model/search-mode/locale/market/cohort-version groups.
- Mention/citation rates have explicit known-annotation response denominators. Unknown annotations and capture errors remain visible; no observations produce no measured groups, not zero visibility. Lookalike hosts do not count as brand citations.
- Six initial stub tests failed then passed. Additional changed-prompt-without-version test exposed an aggregation flaw; fixed and all seven measurement tests plus two real-package tests passed.
- Ruling: the importer verifies integrity of supplied artifacts, not their provider authenticity or annotation truth. It calculates only response-level mention/citation rates; it cannot certify claim accuracy, causal attribution or statistical confidence. Those requirements remain for later adjudication/reporting stages.
- Added measurement input/output contract and README entry. Deliberately refreshed only reviewed new/changed package file digests; no source pins changed.
- Full suite before the additional prompt-version guard: 28 files / 213 tests passed; lint, typecheck, format, build and diff checks passed. After that guard, nine focused tests passed; final full-suite verification follows. Search Console/Bing/analytics/log import adapters and full measurement evaluation remain pending.

### Candidate rule registry and semantic review checkpoint

- Previous goal turn was progress: supplied AI observation import was implemented and verified. Rechecked the worktree and coverage contract before building its rule-plan input.
- Added 26 candidate rules covering quality, SEO, AIO, AEO, GEO and portfolio review. Every rule declares applicability, required evidence, method, source context, review date, procedure and limitations. Source context is explicitly not proof of individual ranking effects.
- Added createCheckPlan and evaluateChecks. Every in-scope item retains every rule until applicability is explicitly reviewed. Missing evidence, competing snapshots and semantic judgments remain unknown. Only supplied nonempty text extraction and observed HTTP success have deterministic evaluators; neither establishes overall content quality or indexing.
- Added mergeReviewedChecks: validates host attribution, planned rule IDs, item-scoped evidence references, required evidence kinds for semantic pass/fail and evidence for not-applicable. It retains unresolved rules and prevents host pass/fail overrides of deterministic checks.
- Six initial rule tests failed then passed; two semantic-review tests failed then passed. Full suite now passes 29 files / 222 tests. Lint, typecheck, format, build and diff check pass. Test/typecheck/build/format sessions yielded handles, were polled to successful exit and are no longer running.
- Ruling: all 26 rules are planned before applicability review; missing data cannot shrink the denominator. Domain-specific coverage may require additional rules and the final validator must compare against the actual registry. Omitting that validation would allow a caller-supplied reduced plan to overclaim completion.
- Ruling: rule-level checks use typed derived evidence records in addition to immutable raw evidence. A downstream validator must verify extraction/source dependencies; a declared evidence kind alone cannot prove semantic truth or source authenticity. These are candidate methods pending host evaluation, not a certified ranking model.
- Updated rule documentation and sole entrypoint routing. The registry is attributed to its five method sources; code is original. Deliberately refreshed reviewed package digests, keeping all upstream pins unchanged. Network collection, artifact validation/reporting, external dataset adapters and release/host trials remain pending.

### Persisted audit validation checkpoint

- Previous goal turn was progress: the 26-rule registry and semantic-review merger were implemented. Rechecked the live worktree and evaluator before extending the final coverage gate.
- Added validateAuditData against the trusted registry: rejects reduced rule plans, dangling evidence, altered artifact hashes/values, provenance cycles, missing source dependencies, deterministic outcomes contradicted by input and unattributed semantic results. Findings require rule/item/evidence traceability; failed checks require corresponding findings.
- Added loadAuditData/validateAudit for real JSON/JSONL run folders. They reject unsafe/symlink artifacts and nonregular files, use bounded UTF-8 reads and default to the packaged registry. Partial valid runs remain distinguishable from completionAllowed; false complete claims are invalid.
- Eight initial validator tests failed then passed. Additional tests cover valid traced findings, semantic attribution and malformed records; malformed records initially threw, now return validation errors. Persisted loader test failed before implementation then passed, including symlink rejection. Twelve validation tests pass.
- Full root suite: 30 files / 234 tests passed. Lint, typecheck, format, build and diff check passed. Package closure hashes were deliberately refreshed for the reviewed validator, documentation and README.
- Ruling: artifact limits are 64 MiB per manifest, 10 MiB per evidence file and 128 MiB total for this loader. A larger audit must report a validation limitation until a streaming validator exists; it may never silently truncate to satisfy these limits. Directory reads assume a stable trusted output tree.
- Ruling: source dependencies validate structural lineage, not semantic derivation or live freshness. The trusted registry comes from the package, never from the audited run. Human/host review remains required for substantive correctness. Report rendering, schemas, network collection, release installs and host evaluation remain pending.

### Report generation checkpoint

- Previous goal turn was progress: persisted artifact validation was implemented. Rechecked the current worktree and validator fixture before adding output generation.
- Added buildReportDocuments/renderReport. They validate inputs first and share section/table data across Markdown and offline HTML. Outputs include coverage.json and formula-safe action CSV, priority backlog, rule/item/check/evidence appendices, missing checks, source review dates and recovery guidance.
- Optional supplied AI observations use the measurement importer. Unknown denominators remain unavailable and synthetic data is visibly labeled. No raw artifact values, remote assets, scripts, global score or uplift forecast are embedded.
- Four stub report tests failed first; three passed after implementation and the remaining assertion was corrected to inspect the unescaped HTML rule ID (Markdown intentionally escapes punctuation). Persisted writer test failed before implementation then passed. Six final report tests cover injection, partial status, priority ordering, real output files, no-overwrite and synthetic measurements.
- Full root suite passes 31 files / 240 tests; lint, typecheck, format, build and diff check pass. A separate Node integration generated all four documents from a synthetic one-item run against the full 26-rule packaged registry. Its coverage remained partial, audited zero, as expected without semantic evidence. This is a pipeline demonstration, not a customer audit or host semantic evaluation.
- Ruling: deterministic report labels are currently English; customer branding is represented by supplied brandName and neutral offline styling. Full host-localized narrative and richer branding remain evaluation work. The initial CSV defaults to update/investigate; keep/consolidate decisions still require explicit portfolio review rather than automatic inferred authorization.
- Ruling: output files are new-only and owner-readable/writable; existing reports are not replaced. The writer cleans successfully created files after a later write error but is not process-crash transactional. The trusted stable directory contract still applies. Reviewed package digests were refreshed without changing upstream pins.
- Remaining major work: integrated dispatcher, public URL/discovery collection, source-family comparison completion, schema/adapter/evaluation coverage, versioned solution release and fresh two-host installation/behavior trials.

### Offline end-to-end runner and dispatcher checkpoint

- Previous goal turn was progress: validated report generation was implemented. Rechecked the worktree and local collector before integrating it with inventory, checks, persistence and reports.
- Added startAudit and scripts/audit.mjs commands start, inventory, validate, coverage and render. Offline start normalizes explicit inventory, protects content roots/package from output writes, preserves source files, records every collection outcome, plans all 26 rules per item and renders a validated partial report.
- Three initial runner tests failed before implementation. Integration then exposed BOM loss: collector decoding stripped the BOM while retaining the original byte hash. Changed decoding to preserve BOM; the source-byte/persisted-artifact integration passes. Separate Node-process dispatcher test failed before the CLI existed, then passed, including no-overwrite behavior.
- End-to-end fixtures cover readable Markdown plus unsupported PDF, 52 planned checks, source immutability, blocked public URL in offline mode, required completeness declaration and refusal of existing/source-root outputs. No semantic finding is invented during collection.
- Full suite: 32 files / 244 tests passed. Lint, typecheck, format, build and diff check passed. Provenance was deliberately refreshed for new runner/dispatcher/docs and the BOM fix; source pins remain unchanged.
- Ruling: start produces partial runs only. It checkpoints collection at 500-item boundaries and completion; source manifests are replaced separately, not transactionally. An interrupted run needs validation before reuse. Automatic resume/apply-review is still pending; do not advertise library-level reconciliation as a finished end-to-end resume feature.
- Ruling: unavailable input hashes describe collection status/reason, not content bytes; they are only recovery identity hints. Only collected snapshots enter evidence. Current raw content is not relabeled as extracted text or rendered DOM merely to resolve missing checks.
- Remaining major work: resume/review integration, public URL/discovery collector, source-family comparisons, schemas and external data adapters, host evaluation, versioned solution packaging and fresh installs. The customer still invokes one skill; helper commands are internal implementation details.

### Additional-family research and semantic fixture checkpoint

- Previous goal turn was progress: offline runner and dispatcher were implemented. Current worktree rechecked; no prior process needed waiting.
- Cloned six comparison repositories read-only outside the worktree. Inspected selected entrypoints and actual license texts, resolved immutable revisions, recorded GitHub API adoption snapshots and per-file hashes. No upstream installer or executable was run.
- Completed initial triage for Claude SEO, Zubair GEO, RankXAI, TheSmokeDev, Gaguero and Aaron's current umbrella. Detailed source-backed adoption/exclusion decisions are in the upstream research document. The old Aaron SEO/GEO repository is a signpost, not the current implementation.
- Ruling: keep the five already selected Corey/Profound methods as v1 inherited dependencies. The six comparison families remain reference/evaluation sources because their unreviewed runtime closures, fixed scores, host/plugin coupling or overlapping methods do not justify bundling. This is selection scope, not a blanket quality or security judgment.
- Ruling: stars/forks are timestamped adoption evidence only. Upstream research percentages, heuristic scores and citation claims are not promoted into our rules without independent primary verification. Inspected collector excerpts do not establish full network security; no exploit or runtime safety claim was made.
- Added five original synthetic semantic targets and separate withheld gold annotations for denominator confusion, stale underlying data, unsupported platform causality, contradicted source claims and a clean control. No host evaluation or accuracy score is claimed from creating fixtures.
- This continuation changes research/fixtures only. Package pins and executable behavior are unchanged. Full reference/runtime closure for unselected candidates is intentionally not asserted. Remaining goal work still includes resume/review integration, network/discovery collection, domain/schema/adapter coverage, host trials and release packaging.

### Immutable snapshot-review integration checkpoint

- Rechecked the live worktree and active goal. Added reviewAudit and the standalone review dispatcher command; each review creates a fresh run with parentRunId, preserves original evidence/reports and retains assessments not explicitly reviewed again.
- Five new integration tests cover immutable revisions, preservation across successive reviews, missing evidence/unknown items before output creation, output-root and artifact collisions, artifact-backed semantic assessment, mandatory findings for failed checks and a separate Node CLI process. Initial test suite failed because review.mjs did not exist; final tests pass.
- Review bundles add new evidence/artifacts, supply attributed rule assessments and optionally replace the entire finding list. Full structural validation precedes output creation. Cross-item evidence lineage is reflected in dependencies; source config hash must match. New-only output is forbidden beneath content roots, installed package or prior run.
- Ruling: review applies to stored snapshots, not refreshed live content. It does not infer semantic truth or automatically mark unavailable collection as audited. Completion is recomputed. Existing deterministic assessments must remain consistent with all evidence; conflicting new snapshots fail validation rather than silently selecting one. Automatic evidence reconciliation/resume remains pending.
- Refactored output boundary resolution to support roots no longer present during snapshot review. Resolved roots still govern collection; the collector retains existence/authorization checks. Trusted stable directories remain the operating contract. Output writes are not crash-atomic; later filesystem/report failure may leave a new partial revision for diagnosis.
- Package provenance digests were deliberately refreshed only for the changed runner, new review module, dispatcher, helper documentation and candidate README; upstream revisions remain fixed.
- Full suite: 33 files / 249 tests passed. Lint, typecheck, format check, build and diff check passed. This establishes the offline review pipeline, not release readiness. Resume, network/discovery, schemas and external adapters, semantic host trials, solution manifest and fresh two-host installs remain outstanding.

### Offline refresh and resume checkpoint

- Previous goal turn was progress: immutable review integration changed executable state and passed its gates. Rechecked the worktree before this continuation; no previous process needed waiting.
- Added resumeAudit and the standalone resume command. It validates a source checkpoint, recollects every declared offline input into private staging, reconciles snapshot dependencies, then writes a new validated revision with parentRunId and explicit reconciliation results. Shared new-only revision persistence now serves review and resume.
- Reuse requires identical configuration and input hashes. Changed/removed snapshots invalidate direct and cross-item evidence/check dependencies. Any configuration change conservatively disables all reuse. Findings survive only while their supported checks and evidence remain valid; a failed check whose multi-item finding becomes invalid returns to unknown for reassessment.
- Five new integration tests cover unchanged review reuse versus changed content, a complete 1,200-item/31,200-check run, cross-item dependency invalidation, added/removed scope with config invalidation, and a valid simulated interrupted collection checkpoint exercised through the separate Node CLI. Initial tests failed because the module did not exist; implementation passed. Source runs remain unchanged.
- Ruling: this preserves expensive review work, not collection I/O. Every explicit local input is read again; URLs remain blocked. Captured external evidence retains its original timestamps and does not become a fresh live observation. Valid checkpoints are supported; inconsistent manifests after a cross-file crash fail validation rather than being silently repaired.
- Ruling: unchanged configuration retains the unresolved discovery queue. Added a queue assertion to the interrupted checkpoint fixture so re-reading local inputs cannot silently erase pending discovery. Configuration changes represent a new explicit scope and disable prior assessment reuse.
- Ruling: temporary collection staging is outside both previous/current content roots, the source run and package. Handled completion/error removes staging; process crashes can leave it for diagnosis. Final output writes remain new-only, not a cross-file crash transaction. No sample or fixed item cap was introduced.
- Full suite before the final queue-preservation assertion: 34 files / 254 tests passed, plus lint, typecheck, format, build and diff checks. After that fix, all five resume tests and two real-package provenance tests passed; lint and diff check passed. Package hashes refreshed for changed/new original helper modules/docs only; upstream pins remain immutable.
- Remaining major work: public-site collection/discovery, schemas and external data adapters, domain coverage, two-host semantic evaluation, versioned solution manifest/archive and fresh host installations. This remains a candidate, not a commercial release.

### Public transport and destination-policy checkpoint

- Previous goal turn was progress: offline resume integration and dependency invalidation were implemented and verified. Rechecked the current worktree and network requirements before this continuation.
- Consulted current IANA IPv4/IPv6 special-purpose registries and official Node 22 HTTPS/HTTP request documentation. The reviewed network contract links sources and records the policy's conservative scope. No third-party transport code or new runtime dependency was copied.
- Added network.mjs with exact-origin authorization, credential/ambiguity rejection, canonical literal-IP handling, conservative public-address classification, full DNS-answer checks, pinned connection lookup and per-hop redirect authorization. Requests use anonymous fixed headers, new agents and explicit TLS certificate verification; response cookies are not retained or forwarded.
- Added bounded raw-byte reception, response-header limits and a total deadline across DNS/redirects/body. Redirect bodies are discarded. No runtime private-network exception or arbitrary headers/options exist in customer configuration. Trusted injected adapters are test seams only.
- Seven tests cover private/mapped/transition/documentation ranges, public addresses, numeric loopback normalization, origin constraints, mixed DNS answers, pinned lookup, authorized/blocked redirects, fixed headers, byte limits and deadlines. Initial tests failed with the absent module; final tests pass. Lint exposed control-regex and fixture typing issues, corrected before the full check.
- Live native HTTPS smoke request to https://example.com/ returned 200, 577 bytes, text/html; charset=utf-8, no redirects. This is narrow runtime evidence, not a security certification or customer-site audit. The current helper's public inputs remain blocked until the full collection policy is integrated.
- Full suite: 35 files / 261 tests passed. Lint, typecheck, format, build and diff check passed. New module and linked transport contract are covered by reviewed package hashes; all upstream pins remain fixed.
- Ruling: address classification intentionally rejects some globally reachable special-purpose space. IPv6 outside ordinary global unicast and known transition ranges is not accepted. This is narrower than a routability classifier and may need future reviewed updates, never automatic downloaded policy changes.
- Ruling: transport returns raw bytes and selected headers only. It does not decode compressed content, honor robots, schedule/rate-limit, retry, discover URLs, persist evidence or evaluate content. OS DNS work may finish after the caller deadline, but no late request is sent. Host/process/network configuration remains trusted.
- Next collector work: robots parser/status policy, per-origin scheduler and retry/backoff, bounded content decoding/types, evidence persistence, discovery union and explicit remaining queues; then public-site/host fixtures. Schemas, external data adapters, semantic host trials and solution packaging remain outstanding.

### Robots interpretation and per-host scheduler checkpoint

- Previous goal turn was progress: public transport primitives and destination policy were implemented with native HTTPS evidence. Rechecked the worktree before adding collection-policy layers.
- Consulted RFC 9309 directly; added original robots.mjs parser and access evaluator, with a linked contract distinguishing protocol behavior from deliberately conservative audit choices. No RFC ABNF, examples or third-party parser code was copied into the package.
- The parser handles exact case-insensitive product-token groups, merged groups, wildcard fallback, case-sensitive paths/queries, percent normalization, Unicode, wildcard/end markers and allow ties. It retains sitemap declarations and diagnostics. Applicable malformed policy blocks collection; valid unrelated groups remain independently usable.
- Access policy permits explicit 404/410 absence, parses 200/204 and blocks auth/rate-limit/server/transport/partial/unresolved redirect responses for retry or review. Parsing and matching have explicit byte/path/work limits. Crawl-delay is an optional extension exposed to scheduling, not a search ranking rule.
- Added scheduler.mjs: shared hostname queues across schemes, at most two active operations, at least one second between starts, independent-host progress, increased crawl delays and slot release on success/failure. The operation must wrap a whole request/body hop. Snapshot counters are operational state, not durable recovery.
- Eight robots tests and three controlled-time scheduler tests passed after initial failures from missing modules. Cases include encoded literal wildcard/end characters, empty/adjacent groups, extensions, malformed applicable versus unrelated groups, and concurrency/failure recovery.
- Full suite: 37 files / 272 tests passed. Lint, typecheck, format, build and diff check passed. New original modules and linked references are covered by deliberately updated package hashes; upstream pins remain unchanged.
- Ruling: these helpers are not yet an integrated crawler. Public start/resume remain offline. The collector must handle encoding/content type, cache expiry, redirects under robots permission, scheduling every hop, retries/backoff, durable pending queues and evidence persistence. No broad RFC compliance or live-site completeness claim follows from helper tests.
- Next action: integrate transport, robots and scheduler with bounded decoding and explicit collection outcomes, then discovery union and persisted public runs. External-data adapters, schemas, semantic host evaluation and release artifacts remain outstanding.

### Integrated public collection library checkpoint

- Previous goal turn was progress: robots interpretation and shared-host scheduling were implemented and verified. Rechecked the worktree and current transport before integrating the layers.
- Added createPublicCollector with per-hop robots authorization, shared scheduler, bounded retries/backoff and host cooldowns, run-local robots caching/expiry, bounded decoding and explicit collected/blocked/unsupported/failed outcomes. Cross-origin redirect pages are checked against destination robots before being fetched; robots policy redirects remain governed by origin/DNS authorization and apply to the initial origin.
- Added network policy/queue hooks that retain pinned transport behavior and recheck the deadline before a queued request starts. Policy errors carry a code; failed redirect chains remain attached to attempt metadata. No page scripts or hostile page instructions execute.
- Added exact wire/base64, HTTP response, robots policy and decoded content artifacts with SHA-256 and source lineage. Auth/cookie request state is absent. Failure evidence is retained where capture/attempt metadata exists. Public bodies and URL queries are retained locally and still require redaction review before sharing.
- Compression supports identity/gzip/deflate/Brotli with bounded output per official Node 22 documentation. Unsupported media/character sets and invalid UTF-8 stay unavailable. The existing artifact loader's 10 MiB ceiling rejected a valid bounded body's base64 representation: a new 8 MiB wire fixture reproduced this, then passed after the artifact ceiling became 16 MiB. A 17 MiB tampered artifact still fails. Network/decoded-body limits remain 10 MiB; manifest/total-load limits remain 64/128 MiB.
- Nine collector tests cover cached/expired/no-cache robots, redirect denial, BOM/inert text, compressed expansion, unsupported media/text, retry/defer, auth barriers, transient connection recovery, large persisted evidence lineage and Retry-After cooldown when retries are zero. Initial missing-module tests failed; the large artifact fixture independently exposed the loader mismatch.
- Live integrated anonymous collection of https://example.com/ succeeded with 577 HTML bytes and four artifacts/kinds: crawler-policy, http-body-encoded, http-response and content. This proves narrow native integration, not customer-site completeness or semantic audit correctness.
- Full suite before final cooldown refinements: 38 files / 280 tests passed; format, lint, typecheck, build and diff checks passed. Final nine collector tests plus two package-provenance tests passed; lint passed. Package hashes refreshed only for reviewed original modules/docs and loader limit change; upstream revisions remain fixed.
- Ruling: waits above ten seconds from Retry-After or crawl-delay defer items for scheduled follow-up. Policy/queue waits are not yet cancellable and may extend wall-clock return time beyond the transport deadline; expired queued operations are checked before starting a page connection. Durable orchestration must add cancellation and bound pending work. Do not claim strict end-to-end deadlines yet.
- Ruling: the collector builds artifacts in memory; it is not yet integrated into public start/resume persistence. Discovery, durable queues, deterministic failure findings and bounded aggregation for runs exceeding current loader limits remain required. Public CLI inputs are still blocked in offline mode. Semantic host trials, external data adapters and release packaging remain outstanding.

### Public run persistence, findings and storage continuation checkpoint

- Previous goal turn was progress: the integrated public collector library, evidence lineage and decoding safeguards were implemented. Rechecked run/resume ownership and artifact validation before wiring public execution into the dispatcher path.
- startAudit now uses the public collector only when network.allowedOrigins is explicitly configured; default behavior remains offline. Network policy is validated before creating output, including exact origin syntax and supported fields. Local and public outcomes share complete item plans, persisted artifacts, checks and reports.
- Public evidence bundles are hashed for recovery identity, so refreshed HTTP/robots evidence can invalidate prior reviews even when body text matches. Public items checkpoint individually; local collection retains 500-item boundaries. Source content remains read-only.
- Deterministic HTTP failures now produce supported low-priority observed findings for operator triage. A captured error is not asserted to be a ranking defect; semantic checks remain unknown. Resume preserves newly captured findings instead of replacing them wholesale with retained old findings.
- Deferred collection is persisted as item-specific queue entries. Refresh replaces resolved retry/storage entries only when an item was reattempted, retains unrelated discovery and deduplicates pending entries. A storage budget conservatively counts artifacts and duplicated manifest/check values; all remaining items stay declared/pending when a result cannot fit. Oversized planned inventory manifests are rejected before collection. Default budget is 96 MiB, configurable downward to 1 MiB.
- Five public-run integration tests cover successful/404 outcomes with report evidence, public refresh, explicit authorization/default offline behavior, retry-queue clearing and bounded storage continuation. Initial three runner tests failed against the offline-only implementation. Existing public collector fixtures were moved to a shared test helper rather than duplicating a fake transport.
- An independent Node CLI start/validate smoke run against https://example.com/ created a valid partial one-item run with four evidence kinds and audited=0. Artifacts remain at /private/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-public-run-Go2Lyi/run. This is a public collection/report demonstration, not a completed semantic audit.
- Full suite: 39 files / 286 tests passed. Format, lint, typecheck, build and diff check passed. An added assertion against duplicate storage queue entries on repeated resume also passed in the focused five-test public-run suite. Reviewed package hashes updated for changed original helpers/docs only; upstream pins remain unchanged.
- Ruling: explicit URL collection is now usable through start/resume, but automatic discovery is still absent. Storage continuation preserves scope and reports partial; repeatedly refreshing the same inventory cannot overcome the same storage limit. Automatic partition/aggregate orchestration is required for large full audits and remains unfinished. The accounting bounds persistence, not total process heap.
- Ruling: policy/queue cancellation and a strict end-to-end deadline remain unfinished, as documented previously. These limitations prevent commercial release readiness despite green focused tests.
- Next work: durable partition/aggregation and discovery union, followed by external-data schemas/adapters, semantic host trials, versioned solution packaging and fresh Codex/Claude Code installs. Goal remains active.

### Automatic storage partitions and unique-item campaign coverage checkpoint

- Previous goal turn was progress: public run persistence, deterministic findings and explicit storage continuations were implemented. Rechecked inventory normalization, run limits and current artifacts before adding orchestration.
- Added campaign and campaign-validate commands with campaign.mjs. New campaigns repeatedly collect declared identities into bounded parts, preserve aliases/source memberships, advance storage-pending items into subsequent parts and reduce batch size when metadata/storage prevents progress. A single item that cannot fit remains explicitly unpartitionable while other items continue.
- Each campaign shares one public collector across all parts, preserving robots cache, cooldowns and host scheduling. Source content remains read-only. Part reports and artifacts are new-only; campaign metadata checkpoints after completed parts.
- Aggregation reads one partition's raw evidence at a time. It verifies configuration hashes, trusted registry/artifacts, checkpoint/check coherence, processed-prefix ownership, source metadata and unique item ownership. Placeholder rows in earlier partial parts are not counted twice. Unowned items must be in remaining inventory or the explicit exceptional queue; omission is invalid.
- Added campaign-report.md and campaign-coverage.json. Totals separate declared, owned/attempted, collected and audited counts, plus check dimensions/missing work. Every current campaign remains partial/globalReviewRequired because cross-part portfolio review is not yet implemented. Collection accounting never implies completed SEO/AIO/AEO/GEO review.
- Five integration tests cover multi-part storage continuation with source union, duplicate ownership rejection, oversized single-item continuation plus unowned omission rejection, shared public robots policy and standalone Node CLI creation/validation. Initial tests failed when the module was absent, then passed.
- Full suite: 40 files / 291 tests passed, plus format/lint/typecheck/build/diff checks. After adding the explicit unowned-omission assertion and actual inventory-metadata validation, the five campaign tests and two package-provenance tests passed; lint passed. Provenance hashes were updated only for reviewed original helpers/docs; upstream pins remain fixed.
- Ruling: campaign metadata/config are bounded at 32 MiB and still require in-memory inventory metadata. This avoids giant raw-evidence aggregation but is not an unlimited streaming importer. Part size (default/max 500) is a batch bound, not a cap on campaign inventory.
- Ruling: checkpoints persist completed parts, but campaign crash recovery/refresh is not yet implemented. An interrupted in-flight part can remain unregistered and needs explicit reconciliation; its presence alone is not completion. A collecting manifest remains inspectable with unowned work explicit. Existing directories are never overwritten.
- Next work: immutable campaign recovery/global review, discovery union, remaining source/data adapters and evaluation contracts, two-host semantic trials and release packaging. Goal remains active; no commercial release or deployment claim.

### Immutable campaign continuation and retained server cooldown checkpoint

- Added campaign-resume SOURCE NEW_DIRECTORY. Source validation precedes output creation; retained registered parts are copied through artifact validation/report writing, preserving capture timestamps, run identities and review state. The source campaign stays unchanged. Parent/recovery metadata identifies historical snapshots separately from new collection.
- Unregistered numeric parts are recorded as skipped and left untouched; their unowned inventory is collected anew. Corrupt registered parts fail validation. New output cannot be inside the source campaign, content roots or installed package. Recovery itself checkpoints retained parts and can be continued into another new directory.
- Retained validated HTTP/robots captures restore unexpired Retry-After cooldowns for allowed origins and the minimum host interval before new pending requests. Cached robots permission is not blindly restored. Tests prove a retained one-hour server delay results in no new network requests and a visible deferred queue.
- Added recovery tests for interrupted manifests, corrupt unregistered artifacts, preserved historical content despite source edits, output boundaries, malformed registered ownership, standalone Node CLI and public cooldown inheritance. Together with the collector restoration fixture, the full suite passes: 40 files / 296 tests. Lint, typecheck, build and diff check pass. The format check identified only lock-file formatting; corrected it and reran formatting verification.
- Updated only reviewed original package hashes and documentation. Immutable upstream revisions and license records remain unchanged. No candidate commit, push, deployment or commercial release was performed.
- Ruling: continuation does not refresh retained snapshots or retry already-owned failures. Start a new campaign for fresh collection. The host must establish that an interrupted writer is terminal or absent; a collecting state or timeout alone is insufficient. Single-writer stable-directory assumptions remain.
- Next: global cross-part semantic evidence/review and completion gates, discovery union, remaining data adapters, actual two-host semantic trials and release packaging. Current campaigns remain partial/globalReviewRequired; the goal remains active.

### Cross-part evidence navigation checkpoint

- Previous goal turn made progress: immutable campaign continuation and retained server cooldowns were implemented and verified. Current worktree confirms campaign completion remains deliberately gated on global review.
- Added campaign-index SOURCE NEW_DIRECTORY. The command validates source ownership/artifacts, exports each declared identity once with its owner (or explicit null), exports partition-scoped evidence references without raw values, and exports only owned-item checks. Lineage records remain navigable without counting placeholder items as owned.
- Files are streamed row by row while raw evidence is loaded one partition at a time. The final index.json binds file digests/counts, source manifest/config/registry identity, loaded partition snapshot hashes and current coverage. Repeated validation and snapshot comparison detect observed changes between passes; stable-directory and terminal-writer assumptions remain necessary.
- Output is new-only, outside source/content/package boundaries. Failed exports may leave incomplete files, but no final index manifest is written. Source artifacts must accompany the derived index; readers must resolve the pair (part, evidenceId), read actual evidence and validate the source before judgment.
- Two new integration tests verify unique ownership, raw-value omission, scoped references, file hashes, unchanged source, non-overwrite/output boundaries, oversized unowned inventory visibility and independent Node CLI export.
- Verification: 40 files / 298 tests passed; format, lint, typecheck, build and diff check passed. Original package hashes refreshed for the new helper, dispatcher and campaign reference only; upstream pins remain fixed.
- Ruling: an index is navigation support, not semantic review, a remotely authenticated capture or campaign completion. Global comparison/review submission and completion eligibility remain unfinished. Next work connects attributed cross-part assessments and evidence dependencies, then discovery/data adapters, actual host trials and release packaging. Goal remains active.

### Attributed global portfolio review and completion eligibility checkpoint

- Previous goal turn made progress: cross-part navigation indexes and snapshot bindings were implemented. Rechecked the current registry, partition validation and per-item review contract before adding the global layer.
- Added campaign-review and campaign-review-validate. A new-only receipt binds the campaign manifest and every loaded partition snapshot, accepts attributed portfolio judgments, and validates partition-scoped evidence plus hashed contextual evidence. Source campaign and prior receipts remain unchanged.
- Resolved global reviews cover the exact full declared inventory and cite content from every owning partition. Pass/fail require the registry's evidence kinds; not-applicable requires a separate rationale. Unknown or missing rules remain unresolved. Failures require supported actionable findings with severity, confidence, affected items, recommendations and verification.
- Completion eligibility combines resolved global rules with complete declared discovery, full mode, nonempty/uniquely owned inventory, no missing or unresolved per-item checks and no queues. A saved result flag is never trusted by revalidation. The original collection manifest stays partial; the separate review receipt plus its bound source is the assessed snapshot.
- Five integration tests cover immutable source/output boundaries, stale bindings, invalid references, incomplete denominators, missing evidence kinds, tampered context, required findings, unknown rules, standalone CLI, and the positive/negative combined completion gate. Positive completion uses explicitly synthetic local not-applicable judgments solely to exercise the gate; it is not semantic quality evidence or a real completed audit.
- Verification: 41 files / 303 tests passed. Format, lint, typecheck, build and diff checks passed. New original module and reviewed dispatcher/reference changes are hashed; upstream pins and attribution remain unchanged.
- Ruling: attribution fields are not identity authentication, hashes are not remote-source authentication, and validation cannot prove reviewer prose or applicability judgments correct. Actual two-host semantic trials remain required. Context and bundle size are bounded; stable source directories and a terminal writer remain prerequisites.
- Next: immutable campaign part-review orchestration (the completion fixture currently assembles reviewed parts under test control), unified customer-facing global report, discovery union/data adapters, host trials and release packaging. Goal remains active; no commercial release or deployment claim.

### Immutable campaign part-review orchestration checkpoint

- Previous goal turn made progress: global portfolio receipts and combined completion eligibility were implemented. Rechecked live campaign validation and per-run review code; the positive completion fixture still assembled manifests manually, identifying the next integration gap.
- Split per-run review preparation from persistence without changing its public reviewAudit behavior. Added campaign-review-parts: selected unique registered parts bind exact source snapshots; their item reviews target only owned items. All selected bundles preflight before creating output.
- New campaign revisions preserve config, source snapshots, pending/unowned inventory and unselected partitions. Selected assessments receive new run IDs; the campaign receives a new ID, parent link and validated snapshot-review provenance. No network collection or source mutation occurs.
- Checkpoints register parts only after writes. Intermediate manifests retain not-yet-copied ownership as remaining work. In-flight unregistered writes can remain after a crash; the documented recovery contract distinguishes recollection from replaying intended review bundles. A new campaign index is required before global review; old global bindings are invalid.
- Replaced manual manifest edits in the positive global-completion fixture with this real API. Added standalone CLI selective-review evidence, exact unselected snapshot preservation, source immutability, old global binding invalidation, stale/duplicate/non-owned/evidence-error preflight rejection and source-output boundary checks.
- Verification: 41 files / 305 tests passed; format, lint, typecheck, build and diff check passed. Updated hashes only for original changed helpers/docs and the new module. Upstream pins remain fixed.
- Ruling: this completes the local-review orchestration path, not semantic host evaluation. Attribution and evidence validation cannot certify judgments. The synthetic completion fixture remains a gate test only. Global customer-facing report, discovery union, external adapters, actual two-host trials and release packaging remain outstanding. Goal remains active; no release/push/deployment claim.

### Unified customer campaign report checkpoint

- Previous goal turn made progress: immutable per-part review orchestration removed manual manifest assembly from the completion path. Rechecked current per-run report formatting and global receipt validation before adding customer output.
- Added campaign-report SOURCE REVIEW_DIRECTORY NEW_DIRECTORY. It recomputes global/local completion from bound snapshots, ignores saved result flags and streams Markdown, offline HTML and CSV actions into a new directory. A final report-manifest.json records file hashes, source/review identity, unique coverage and finding totals.
- Reports include item/state/dimension coverage, attributed portfolio judgments, local/global severity-ordered findings, classification/confidence, recommendations, verification, scoped evidence and partition links, global context metadata, remaining queues and next steps. Original evidence values are not embedded or automatically pooled into visibility metrics.
- Raw partitions are loaded one at a time and revisited for severity ordering. HTML/Markdown escape target text; HTML has no scripts/external assets and a restrictive policy. CSV formula-leading cells are neutralized. Relative links require preserving source/receipt/report directory relationships when sharing.
- Two integration tests exercise hostile finding text, formula cells, output hashes, partial coverage, modified result flags, output boundaries/non-overwrite, local HTTP failure inclusion, independent CLI rendering, and stale receipt rejection before output.
- Verification: 41 files / 307 tests passed; format, lint, typecheck, build and diff check passed. New original module and changed dispatcher/docs are included in reviewed package hashes; upstream pins remain unchanged.
- Ruling: renderer completion is not semantic correctness or measured search performance. Potentially overlapping findings keep explicit scoped identities pending semantic deduplication; it does not silently merge them. Failed output may remain without a final manifest. Source stability and terminal writers remain prerequisites.
- Next: discovery union and external source/data adapters, real semantic evaluation on Codex and Claude Code, release packaging and full requirement audit. Goal remains active; no release/push/deployment claim.

### Supplied-source discovery union and sitemap extraction checkpoint

- Previous goal turn made progress: unified campaign customer reports were implemented and verified. Rechecked the actual discovery requirement and inventory normalization before adding ingestion.
- Consulted the official Sitemaps protocol at https://www.sitemaps.org/protocol.html for namespace, urlset/index locations, escaping and protocol limits. Added an original bounded inert sitemap location extractor: no DTD/external resolution, explicit namespace/root/direct-loc handling, XML entities/CDATA, malformed/duplicate location rejection, depth/token/byte/entry limits. Extension locations are not mistaken for page locations.
- Added discover CONFIG.json with sitemap-xml, url-list and mapped records sources. CMS/repository/document/analytics exports can contribute explicit inputs; source IDs, snapshot hashes, locator/date, accepted/rejected counts and normalized aliases/locale/canonical candidates remain traceable. No source scripts or network requests execute.
- Missing expected sources, partial exports, invalid rows, parse failures, missing child sitemap snapshots, index cycles/depth and unconfirmed overall scope remain queued. Completeness requires nonempty declared inventory/source set and no unresolved queue, and is explicitly relative to supplied scope/completeness assertions.
- Six integration/unit tests cover prefix namespaces, entity/CDATA handling, ignored image extension locations, malicious/malformed XML, multi-source union and meaningful URL variants, child/cycle queues, invalid rows/partial exports and independent offline CLI operation. Lint identified the raw-control regex; replaced it with explicit character-code validation.
- Verification: 42 files / 313 tests passed; format, lint, typecheck, build and diff check passed. New original modules/docs and dispatcher changes are hashed; upstream pins remain fixed.
- Ruling: this is supplied-source ingestion, not automatic crawling or pagination. The 10 MiB source limit is operational and narrower than the protocol's 50 MiB uncompressed limit; oversize stays visible, never silently sampled. Parser is a location extractor, not full XML/schema conformance certification.
- Ruling: returned discovery queues are not yet automatically imported into persisted run/campaign state. Host must preserve the receipt and false completeness; automatic durable integration, internal link crawling, repository walking and connector adapters remain next implementation work. Actual two-host semantic evaluation and release packaging remain outstanding. Goal remains active.

### Durable campaign discovery receipts and scope guards checkpoint

- Previous goal turn made progress: supplied-source discovery and inert sitemap extraction were implemented. Rechecked run/campaign configuration, validation and continuation paths; confirmed discovery queues were not yet persisted automatically.
- Optional campaign config.discovery now embeds original source requests/snapshots. Preflight recomputes their union and requires exact normalized inventory metadata, source memberships and aliases. Explicit tracking policies must agree. Incomplete discovery cannot be overridden with inventoryComplete=true.
- campaign.json stores a hashed source receipt and typed discovery queues once at campaign scope. Validation recomputes the receipt from config and rejects altered/omitted queue data. Part configs omit global source snapshots; aggregate coverage includes discovery once alongside ordinary collection queues.
- Continuation and immutable part-review preserve discovery and historical scope. Fresh exports require a new campaign config and do not retroactively complete the old one. Standalone start/resume reject discovery-bearing config rather than silently discard its queue. Unified reports show discovery kind and source identity.
- Three integration tests verify persistence through continuation/review, omission from part configs, completeness/input guards before output, standalone queue-loss rejection, receipt tamper detection and a fresh completed source set leaving historical discovery unchanged.
- Verification: 42 files / 316 tests passed; format, lint, typecheck, build and diff check passed. Reviewed original package hashes updated; upstream pins remain fixed.
- Ruling: source-set exhaustiveness remains an explicit justified publisher/host assertion, not a parser-derived proof of the whole website. Durable supplied-source ingestion is implemented; automatic internal-link crawling, repository enumeration, connector pagination, measurement adapters and actual two-host semantic trials remain outstanding before release packaging. Goal remains active.

### Repository enumeration and source-adapter queue checkpoint

- Previous goal turn made progress: discovery receipts and queues became durable at campaign scope. Rechecked supplied-source ingestion before adding an actual local enumeration adapter.
- Added discover-repository CONFIG.json. It enumerates explicitly authorized real directory roots, file extensions and directory exclusions without reading content or executing Git/hooks/scripts. Unsupported extraction formats such as PDF remain inventory records for later collection; unselected extensions and explicit exclusions remain recorded scope metadata.
- Root symlinks are rejected; encountered symlinks, nonregular entries, read errors, detected mutations and entry/depth/record-budget limits remain pending. Root containment/metadata checks assume stable trusted directories and do not claim an atomic filesystem snapshot or hostile ancestor-race sandbox.
- Generic supplied-source ingestion now preserves typed adapter queues, exclusions and scope metadata with a separate hash. A source cannot claim complete while carrying adapter pending work. Campaign validation and coverage retain those details without dropping them into a generic warning.
- Four tests cover explicit format scope, exclusions/source metadata, no source changes, symlinks and campaign queue persistence, entry/depth/record budgets, root-policy rejection and independent CLI enumeration. Initial failure was a fixture expecting /var rather than macOS realpath /private/var; corrected the expected path to use realpath.
- Verification: 43 files / 320 tests passed after correction; typecheck passed again. Format, lint, build and diff check passed before the test-only realpath correction; final changed test was formatted. Upstream pins are unchanged and reviewed original package hashes include the new adapter/docs/dispatcher.
- Ruling: enumeration completeness is relative to explicitly declared roots, extensions and exclusions. Nested roots collapse to outer roots; a nested scope under an excluded directory needs a separately identified export. Partial enumeration is not a representative sample and requires a fresh export or scoped split, not a guessed cursor resume. Limits do not bound total heap or strict wall-clock duration.
- Next: bounded automatic public discovery/internal-link crawling, provider measurement/data adapters, actual semantic host trials, release packaging and full completion audit. Goal remains active.

### Automatic public sitemap traversal checkpoint

- Previous goal turn made progress: repository enumeration and generic source-adapter queues were implemented. Rechecked the public collector's output/evidence contracts and output boundaries before adding automatic sitemap traversal.
- Added discover-sitemaps CONFIG.json NEW_DIRECTORY. Explicit allowed seeds are fetched through the existing shared robots/DNS/redirect/retry/cooldown collector. Sitemap indexes schedule allowed child sitemaps; page locations remain discovery records and are not fetched or automatically authorized.
- Captures persist raw artifacts plus capture.json and file digests. discovery.json checkpoints frontier/capture metadata; source.json becomes a supplied records source with sitemap/capture/hash provenance and detailed pending queues. New-only output preserves prior directories and declared content/package boundaries.
- Missing access, parsing failures, cycles (including multiple initially seeded endpoints), depth/frontier/capture-count/storage/record budgets remain incomplete. An oversized fetched capture is not claimed persisted/processed. Final complete-for-seeds is limited to declared sitemap graph traversal, never full site discovery or content audit.
- Five tests cover shared policy and capture hashes, source-union integration, off-origin/robots denial without disallowed fetches, multi-seed cycles, bounded partial work, unauthorized seed preflight and malformed XML with retained capture evidence.
- Verification: 44 files / 325 tests passed; format, lint, typecheck, build and diff check passed. Original package hashes refreshed for the new helper, dispatcher and contract; upstream pins unchanged.
- Native standalone Node CLI smoke against https://example.com/sitemap.xml received HTTP 404, persisted a failed capture and explicit sitemap-collection queue, and correctly returned partial. Artifacts: /private/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-sitemap-smoke-Q09wjL/capture. This verifies a real transport failure path, not successful live sitemap discovery or semantic audit correctness.
- Ruling: no automatic interrupted-discovery recovery is implemented; a collecting manifest is not a finished source or proof of a stopped writer. Confirm termination before starting a new output. Budgets do not establish strict wall-clock/heap bounds; large queue metadata may require split seed scopes.
- Next: bounded internal-link discovery, remaining provider measurement/data adapters, actual Codex/Claude Code semantic trials, release packaging and full requirement audit. Goal remains active; no release/push/deployment claim.

### Inert HTML source-link extraction checkpoint

- Previous goal turn made progress: automatic allowed sitemap traversal was implemented and verified, including a native HTTP failure path. Rechecked the current helpers and consulted official WHATWG hyperlink/base-element guidance before adding source-link extraction.
- Added an original conservative extractor for a/area href links, first-base resolution, relative/query/fragment handling, rel metadata, comments/raw-text/templates and basic character references. Non-HTTP schemes stay inert, credential-bearing links are unresolved, and forms/ping/scripts/events/resource hints never execute.
- Unsupported entities, malformed/duplicate attributes, ambiguous base URLs, foreign-content navigation, meta refresh, noscript and unclosed containers produce explicit pending work. Scripting/inert surfaces require separate rendering inspection. Unicode-whitespace and NUL regressions prevent browser-different URL guesses; malformed tag-open whitespace is rejected.
- Added html-links supplied-source ingestion. Captured source document and extracted targets enter the union; graph offsets/rel/base metadata and rendering/parser queues persist in campaign discovery. This connects the parser to the existing pipeline without claiming an automatic crawler exists yet.
- Seven extractor tests plus one ingestion test cover the above cases, including malicious-looking strings treated only as data. Full suite: 45 files / 333 tests passed after final refinements. Format, lint, typecheck and build passed during the change; final edited files were formatted and diff check passed. Original package hashes updated only for reviewed helper/ingestion/docs; upstream pins unchanged.
- Ruling: this is a source-subset extractor, not an HTML5 DOM parser. Complex markup/rendering needs a browser/DOM adapter and remains unknown. It does not establish complete website coverage. No scripts or external packages were executed/installed for extraction.
- Next: connect bounded automatic internal-link traversal to the public collector, then remaining data adapters, actual semantic trials on both hosts, release packaging and full completion audit. Goal remains active.

### Bounded automatic static-link traversal checkpoint

- Previous goal turn made progress: inert source-link extraction and supplied HTML ingestion were implemented with explicit rendering/markup gaps. Rechecked public capture contracts and sitemap traversal boundaries before adding the page crawler.
- Added discover-links CONFIG.json NEW_DIRECTORY. It traverses allowed static hyperlinks breadth-first through the shared public collector, preserving query variants, rel annotations, graph offsets and source snapshot hashes. Relative links resolve from final redirect URLs; redirect aliases stay inventoried and an already captured final URL is not fetched twice merely because it is in the frontier.
- Internal discovered URLs enter inventory before collection, including blocked/unvisited items. External origin links remain graph edges and explicit scope exclusions, never automatic permission expansion. Robots, DNS, redirect, retries and cooldown rules apply within the crawl. No scripts, forms, events or ping execute.
- Captures, graph.jsonl, source.json and hash/checkpoint metadata are persisted new-only. Page/depth/frontier/storage/graph limits, extraction ambiguity and dynamic navigation create visible pending work. Completed static traversal is not a claim of full site inventory, rendered coverage, indexing or semantic audit completion.
- Five tests cover finite cyclic link graphs without repeated requests, nofollow/query preservation, external exclusions, capture hashes, union integration, final-URL resolution, robots/unvisited inventories, inert script/form handling, rendering/parser gaps, budget queues and unauthorized-seed preflight.
- Verification: 46 files / 338 tests passed; format, lint, typecheck, build and diff check passed. Reviewed original helper/dispatcher/docs hashes updated; upstream pins unchanged.
- Native standalone CLI against https://example.com/ collected/extracted one HTML capture but reported rendering-unreviewed and partial. Artifacts: /private/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-link-smoke-qXHQEj/capture. This is live transport/extraction evidence with a correctly retained limitation, not complete site discovery or semantic correctness proof.
- Ruling: interrupted discovery has no automatic recovery yet; stable output/source assumptions remain. Capture-count limits are not total HTTP-hop limits, and no strict wall-clock/heap bound is claimed. Separate commands do not yet restore this crawl's cooldown evidence automatically; orchestration must respect deferred-work timestamps before later requests.
- Next: address remaining orchestration/deadline and data-adapter gaps, actual semantic evaluation on Codex/Claude Code, release packaging and full requirement audit. Goal remains active; no release/push/deployment claim.

### Cooperative collection cancellation checkpoint

- Added shared deadline/AbortSignal helpers and propagated cancellation through DNS observation, trusted policy/queue hooks, scheduled jobs, native HTTP requests/responses, retries, cooldown waits and decoding observation.
- Per-item collectionTimeoutMs defaults to transport timeout and accepts 1–120000 ms. Parent signals are supported by collect. Cancelled robots cache entries expire; later collections can retry. Waiters sharing the cancelled robots fetch may also fail conservatively.
- Queued jobs are removed on cancellation; late hook invocations and DNS results cannot open a connection. Active transport resources are destroyed. Native DNS/decompression may still finish in the background, and synchronous JavaScript cannot be preempted. No hard real-time or whole-campaign deadline claim.
- Six new regressions cover stalled hooks, late queue execution, active response destruction, queued cancellation, stalled robots retry/cache recovery and pre-aborted collection.
- Verification: 46 files / 344 tests passed; lint, typecheck, build and git diff --check passed. Formatted provenance lock after the initial format check identified it; rerun format check separately. Reviewed original package hashes updated; upstream pins unchanged.
- Remaining: discovery recovery/cross-command cooldown orchestration, external measurement adapters, actual two-host semantic trials and versioned release packaging. Goal remains active. No push or deployment performed.

### Supplied Search Console measurement adapter checkpoint

- Previous goal turn made concrete progress on cancellation. Re-read measurement code/spec and Google's official Search Analytics query reference before implementing the next data adapter.
- Added import-search-console EXPORT.json under the existing single skill dispatcher. Validates exact response hashes, query/date/dimension/filter scope, contiguous pagination, row metrics and duplicate tuples. Preserves source/time/synthetic labels, freshness metadata, response aggregation and row-level artifact bindings.
- Pagination exhaustion is separate from population completeness: Google documents top-row limits. Missing rows never become zeros. No cross-query sums, averaged CTR/position, AI-visibility inference or causal uplift is generated. No network/authentication runs.
- Five tests cover preserved grain/provenance, incomplete pages and empty exports, tampered hashes, gaps/duplicates/scope changes, malformed metrics/dates/credentials and inert filters/aggregation conflicts.
- Full suite: 47 files / 349 tests passed; format, typecheck, build and diff check passed. Lint caught missing explicit Node URL/Buffer imports; added them and reran lint plus focused package/adapter checks. Reviewed original digests refreshed without changing upstream pins.
- Native standalone CLI synthetic import exited zero, preserving one supplied row and populationComplete=false. Artifacts: /var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-gsc-import-l_bioj62. This proves CLI ingestion, not live provider access or real measurement accuracy.
- Remaining: attach measurement receipts into persistent report workflows, Bing/analytics/log adapters, discovery recovery/cooldown orchestration, actual two-host semantic evaluation and release packaging. Goal remains active; no release/push/deployment claim.

### Persisted Search Console report evidence checkpoint

- Previous goal turn implemented and verified supplied Search Console import. Inspected both standalone and streaming campaign report paths before integrating it.
- Added a shared preflight that recomputes receipts from original supplied exports, rejects duplicate source IDs and invalid hashes, and bounds the serialized input bundle to 32 MiB/20 exports. Saved computed receipts are not accepted as input truth.
- Both report renderers show query/filter scope, source/date/timezone, synthetic labels, pagination gaps, response freshness and hashes. Original response strings plus recomputed receipts persist in search-console-evidence.json. Campaign report manifests hash that file alongside outputs; source campaign/review/checks/coverage remain unchanged.
- Campaign-report accepts an optional options JSON; standalone render-with-measurements accepts options only for a validated unrendered run. Existing auto-rendered start/revision reports are intentionally not overwritten or retrofitted; campaign reporting supports separate new editions. CLI options reject registry overrides.
- Tests verify escaped metadata, source byte preservation and hashes, persisted standalone artifacts, campaign manifest bindings, invalid-input preflight, duplicate IDs, pagination limitations and unchanged coverage. Full verification: 47 files / 351 tests; format, lint, typecheck, build and diff checks passed. Original package hashes refreshed; source pins unchanged.
- Remaining: other provider adapters, discovery recovery/cooldown orchestration, actual two-host semantic trials and release/install gates. Goal remains active; this candidate has not been pushed or deployed.

### Supplied GA4 analytics adapter checkpoint

- Previous goal turn integrated Search Console evidence with both report paths. Re-read measurement contracts and official GA4 runReport request, response and metadata documentation before adding analytics ingestion.
- Added import-analytics EXPORT.json for supplied GA4 Data API pages. Checks response hashes, fixed query scope, ordered metric headers, contiguous offsets, stable provider rowCount and duplicate dimension tuples; retains all query/filter/cohort expressions inertly.
- Values remain strings with provider types, preserving integers beyond JavaScript's safe range, fractional/negative values and currency context. Metadata retains sampling, thresholding, truncation, restrictions, timezone and empty reasons. Provider aggregates remain separately labeled; no user/session/rate/revenue totals or attribution are computed.
- Pagination exhaustion is relative to supplied rowCount, not whole-population tracking completeness. Relative dates are rejected for date-range requests, and overlapping date-range columns remain distinct. This is an ingestion contract, not complete Google request-schema conformance or authenticated provider access.
- Five tests cover precision/units/provenance, empty/incomplete results, duplicate/gapped/mutated queries and artifacts, malformed rows/headers/dates/credentials, and overlapping ranges. Full suite passed: 48 files / 356 tests. Format, build and diff passed. Lint caught an explicit any in the fixture callback; replaced it with a structural fixture type, then lint/typecheck passed.
- Native standalone CLI synthetic import exited zero and preserved 9007199254740993 as a string. Artifacts: /var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-ga4-import-2t1dm4si. Original package hashes refreshed; upstream pins unchanged.
- Remaining: analytics report attachment, Bing/log adapters, discovery recovery/cooldown orchestration, actual two-host semantic trials and release/install gates. Goal remains active; no release/push/deployment claim.

### GA4 integration into unified reports checkpoint

- Previous goal turn implemented and verified GA4 ingestion. Rechecked the live shared measurement builder and both report paths before adding analytics attachments.
- Reports now accept analyticsExports alongside searchConsoleExports. A shared preflight enforces a combined 32 MiB serialized export bound, and each provider accepts at most 20 exports with unique provider-local source IDs. Every receipt is recomputed from source bytes.
- GA4 query/synthetic/pagination metadata and per-page metric types, currency/timezone/sampling/thresholding/restriction metadata appear in report tables. Original exports and normalized receipts persist separately in analytics-evidence.json; campaign manifests hash it alongside Search Console evidence. No cross-provider or cross-query arithmetic, attribution, or completion-state changes occur.
- Added combined report regression and extended persisted campaign checks. A native CLI integration test renders both provider bundles through campaign-report OPTIONS.json and verifies their manifest bindings. Invalid hashes/duplicate IDs, escaped metadata, exact large metric strings and unchanged coverage are covered.
- Verification: 48 files / 357 tests; format, lint, typecheck, build and diff checks passed. Entrypoint/README now route users to implemented measurement handling; refreshed reviewed original hashes, preserving source pins.
- Remaining: Bing and server-log adapters, discovery recovery/cooldown orchestration, actual semantic evaluation on both hosts and release/install gates. Standalone existing-report no-overwrite limitations remain documented. Goal remains active; no push/deployment claim.

### Bing traffic and attributed AI mapping checkpoint

- Previous goal turn integrated GA4 evidence into unified reports. Rechecked current measurement gaps and official Microsoft GetQueryStats, AI Performance and October 2026 Topics Portfolio documentation.
- Added import-bing EXPORT.json with separate search-query-stats and ai-performance-mapped kinds. Native search JSON preserves top-query traffic, raw .NET/ISO dates, additional UTC instants and distinct click/impression average positions. Duplicate query/date tuples, unsafe counts and altered hashes are rejected.
- AI dashboard input uses our explicitly documented mapping schema, not an invented public API. Requires original source text/hash plus mapping method/reviewer/date and a separately hashed normalized payload. Keeps surface/period/locale/market/timezone scope explicit; mappings are attributed but not semantically certified.
- Exact, approximate, range and unavailable metric states remain distinct. Rejects falsely exact topic ecosystem metrics and opportunity citation counts; no range midpoint, answer-level citation rate or pooled total is computed. Missing data never becomes zero and population completeness stays false.
- Five tests cover native dates/denominators, duplicate/unsafe/tampered traffic, source mapping/range preservation, precision and mapping failures, approximate/unknown states. Full verification passed: 49 files / 362 tests, format, lint, typecheck, build and diff check.
- Native CLI synthetic GetQueryStats import exited zero; artifacts: /var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-bing-import-ckto5i8r. Reviewed original hashes refreshed; upstream skill pins unchanged.
- Remaining: Bing report attachment, server-log adapter, discovery recovery/cooldown orchestration, actual two-host semantic trials and release/install gates. Goal remains active; no push/deployment claim.

### Bing evidence in unified reports checkpoint

- Previous goal turn implemented native Bing traffic import and attributed AI dashboard mapping. Rechecked report preflight and native CLI integration before connecting Bing evidence.
- Both renderers now accept bingExports with the other provider arrays under the same combined 32 MiB bound. Original envelopes and recomputed receipts persist in bing-evidence.json, and campaign manifests hash it alongside other artifacts.
- Report tables retain source/scope/time, kind, mapping attribution, raw-source and normalized-response hashes, synthetic status, limitations and precision-cell counts. Range/unknown metric values remain intact in the evidence file; precision counts are explicitly not citation totals. Coverage and semantic findings are unchanged.
- Added report regression for range/missingness preservation, mapping attribution, escaped content, evidence links and hash rejection. Extended campaign test invokes the native CLI with Search Console, GA4 and Bing together and checks all evidence bindings.
- Verification passed: 49 files / 363 tests; format, lint, typecheck, build and git diff --check. Updated entrypoint/README/measurement instructions and reviewed original hashes; upstream pins remain fixed.
- Remaining: server-log adapter, discovery recovery/cooldown orchestration, actual two-host semantic evaluation and release/install gates. Goal remains active; no push/deployment claim.

### Normalized server-log ingestion and reporting checkpoint

- Previous goal turn integrated Bing evidence with native CLI coverage. Re-read the log requirement and official Google crawler verification guidance before implementing log ingestion.
- Added import-server-logs EXPORT.json for reviewed normalized/redacted JSONL. Records explicit system/filters/time range/completeness and normalization attribution. Checks source hashes, bounded text/line counts, timestamps, HTTP URL/method/status and optional byte/duration fields.
- Bad lines, out-of-scope records, unsupported fields and repeated request IDs remain line-numbered/hash-bound pending work. Unknown status stays unknown. Identical lines without IDs remain separate observations; counts are accepted request lines grouped by exact method/URL/status, not users or verified bots.
- Every request retains crawlerIdentity=unverified. No DNS/IP authentication or indexing/citation/accuracy inference occurs. Sensitive data review is explicitly part of normalization; field allowlisting is not represented as automatic secret detection.
- Both report paths accept serverLogExports and persist source envelopes/receipts in server-log-evidence.json. Campaign manifests bind it. Reports retain normalization/redaction, accepted/rejected/unknown counts and pending rows without altering audit coverage or semantic checks. Combined exports across four families retain the 32 MiB bound.
- Five importer tests plus a report regression and expanded native campaign CLI exercise malformed/partial/duplicate/empty data, hashes, precision, unverified identity, escaped metadata and all four provider evidence files. Full verification passed: 50 files / 369 tests; format, lint, typecheck, build and git diff --check.
- Updated single entrypoint/README/measurement routing and detailed log contract. Reviewed original hashes refreshed; upstream pins remain fixed.
- Remaining: discovery recovery/cooldown orchestration, actual two-host semantic trials, schemas/evaluation/release completion audit and fresh installation gates. Native vendor log parsing and authenticated connectors are not claimed; supplied normalized exports are implemented. Goal remains active; no push/deployment claim.

### Immutable discovery replay and cooldown recovery checkpoint

- Previous goal turn completed normalized server-log ingestion/reporting. Inspected both real traversal helpers and public collector cooldown handling before implementing discovery recovery.
- Link/sitemap checkpoints now bind configHash and optional recovery metadata. Added discovery-validate and discovery-resume SOURCE NEW_DIRECTORY [BUDGETS.json]. Only kind-specific budget overrides are accepted; source/seeds/network scope remain fixed.
- Snapshot loader verifies registered file sizes/hashes, safe paths/no symlinks, config/capture/item bindings, evidence IDs/value hashes/lineage and successful content bindings. Bounds: 1000 captures, 50000 files, 64 MiB artifact, 192 MiB total input; config/checkpoint limits 32/16 MiB. Pre-binding legacy checkpoints fail rather than accepting an unbound config.
- Replays successful immutable captures through the original traversal algorithm, rebuilding graphs/inventory/queues. Unsuccessful and previously uncaptured URLs use fresh collector policy; prior HTTP/robots evidence restores unexpired Retry-After/minimum intervals. Source files remain unchanged and unregistered orphan captures are ignored, not deleted.
- Recovery binds parent discovery ID/checkpoint hash and records reused URLs. A stable stopped source writer remains an explicit precondition; labels/timeouts do not prove termination. Snapshot replay is historical continuation, not a fresh fetch of successful pages. Capture budgets include replays.
- Five tests cover link frontier continuation, simulated interrupted checkpoints/orphan preservation, sitemap child continuation, one-hour deferred retry without requests, tampering/symlinks/scope/nested-output rejection. Native CLI replay and validation are exercised. Initial sitemap fixture lacked required namespace; corrected fixture (and quote syntax), preserving parser behavior.
- Full verification passed: 51 files / 374 tests; format, lint, typecheck, build and git diff --check. Updated recovery docs/README and original package digests; upstream pins unchanged.
- Remaining: actual two-host semantic trials, schema/evaluation/requirement completion audit and versioned release/fresh installation gates. Unrelated fresh commands still do not automatically inherit cooldowns; recovery does. Goal remains active; no push/deployment claim.

### Frozen evaluation archive and three-host-surface installation checkpoint

- Previous goal turn implemented verified discovery snapshot recovery. Inspected current acceptance/packaging requirements, installer/release source and actual Codex/Claude binaries before preparing evaluation installations.
- Added solutions/content-search-audit.yaml 0.1.0 and a separate evaluation-only catalog.content-search-audit-candidate.yaml. Public catalog.yaml stays unchanged. One component and entrypoint, only Codex/Claude Code; five internal attributed method sources remain locked.
- Built and packed the actual candidate, extracted the archive into a fresh directory and verified its independent digest. Installed extracted bytes into separate Codex, Claude Code and both-host projects. Each surface exposes exactly content-search-audit; both-host Claude path resolves to the canonical Codex path. All component hashes/installed locks match and packaged helper --help executes.
- Component digest d4f7a4beb59affc8a9bcfd7a473faa06585507eead699d9bdc3f8f48f2fa768f; directory digest 8ea3064552f5bdf6f5c5d64a6cc867eaaaa4a939b0c8184953bb0eedbdf19621; archive SHA-256 967c841f891c1b86bdaa17987dba4fd6b91831e567c0a590e33e1a0e9dc13f16. Exact evidence is in docs/research/content-search-audit-installation-snapshot.json and evaluation.md.
- A separate test-only 0.1.1 archive with unchanged component bytes exercised upgrade. Modified local README was rejected; restoring fixture bytes allowed upgrade with the correct version/digest in installed.json. Original 0.1.0 artifacts and three trial projects remain intact.
- Probe corrected its initially wrong lock filename by reading installer/source filesystem. It also found misleading CLI help advertising target both; changed help to the actual comma-separated codex,claude-code syntax without changing parser or host paths.
- Added real manifest/single-component/digest/host regression. Full verification passed: 51 files / 375 tests; format, lint, typecheck, build and diff checks.
- Codex 0.166.0 and Claude Code 2.1.325 are available; availability/installation is not semantic host evaluation. Behavioral trials, full fixture coverage, schemas/requirement closure and release review remain open. No commercial release/push/deploy; goal remains active. Any changed skill bytes require a new candidate version, preserving this frozen baseline.

### First actual two-host semantic seed checkpoint

- Ran four fresh-context native CLI processes: baseline and installed frozen 0.1.0 skill on Codex 0.166.0 and Claude Code 2.1.325. Same five target files, gold not copied into projects, no model pin; all processes exited zero.
- Retained prompts, responses, target/output/event hashes, tool traces and host-reported usage under docs/research/content-search-audit-trials/semantic-seeds-01. Raw initialization logs remain local; published snapshot selects non-secret fields.
- Manual primary-agent adjudication matched all five gold material issues in all four arms; all accepted the clean control. This is not independent human review or general accuracy evidence. Baseline matching all issues prevents a claim of demonstrated detection uplift.
- Found concrete remaining defects: Claude baseline and skill both say 21 rather than approximately 33 months; skill arm quotes another file's study as clean-control evidence; baseline proposes text already present and asserts inaccurate wording equivalence. Claude also skipped required internal reference contracts.
- No observed gold reads, target modifications or network tool calls; no absent live metric claimed as measured. Codex global discovery still emitted unrelated skill warnings despite ignore-user-config, so isolation is not hermetic. Tools differed between hosts; no controlled cross-model ranking is claimed.
- Frozen package unchanged. Next: focused evidence/date regressions and new candidate review guidance, then expanded semantic and end-to-end offline/public/missing-data/resume trials. Goal remains active; no release/push/deployment.

### Evidence-review candidate 0.1.2 and repeated host evaluation checkpoint

- Previous turn yielded actual 0.1.0 behavioral failures, so it was progress. Added concise final evidence-review instructions to SKILL.md and an original detailed evidence-contract procedure: source-specific quotation checks, deterministic arithmetic or exact source values, existing-content check and verification of proposed corrections.
- Preserved frozen 0.1.0. Used version 0.1.2 because 0.1.1 is an earlier upgrade-only fixture. Refreshed only two original-file provenance entries; upstream pins/licenses unchanged. Current component bff4d635eafc467245bbd415beb0b6fde9a169825f2a0198d5d45477587d1cde, release bfb906ff62a6a0627587af64cdf762e6d8750c86b67df62c86240742eb0ecf99, archive 973e43738d1b6da1f64d7d891e43c8dc02c8cdcb32b712c628987a16c6143f43.
- Full lint/typecheck/test/build/diff passed: 51 files / 375 tests. Formatting identified provenance JSON style; formatted and refreshed the component pin, then format and three real package tests passed before archive build.
- Extracted new archive and installed into five fresh projects per host, plus one combined-host project. All locks match; combined Claude symlink points to the sole canonical skill. Ten CLI behavioral runs exited zero; all raw final text, prompts, tool traces, hashes and selected usage persisted under docs/research/content-search-audit-trials/semantic-seeds-012.
- Primary-agent manual review of all ten outputs matched all five gold material issues per run and retained clean controls. Wrong 21-month estimate and old clean-control misquotation did not recur. This is repeated known-seed evidence, not general semantic accuracy or independent human acceptance.
- Remaining defects include supported publication clause flagged as unsupported, inaccurate same-wording assertions/locators, unsupported organic qualifier, ambiguous historical reconstruction and incomplete procedure compliance. Two explicit Claude Skill calls returned Unknown skill in restricted mode; filesystem use of installed instructions does not prove native invocation.
- Added requirement completion audit preserving named schemas, full fixture classes, actual host workflow scenarios, independent review, source closure, final packaging and NKSkills pilot as open work. Corrected stale design status without weakening its target requirements. Goal remains active; no commercial release/push/deployment.

### Native Claude invocation diagnosis and first offline workflow checkpoint

- Previous turn changed candidate guidance and produced ten repeat outputs, so it was progress. Rechecked current host behavior rather than treating filesystem installation as native invocation proof.
- Official Claude skill/CLI docs confirm supported project location and flags. A fresh normal project-settings run registered and successfully invoked content-search-audit. A controlled pair with identical project/prompt/tools/permissions differed only by --restricted: normal registered/invoked, restricted returned Unknown skill. No package/global settings changes. Evidence is in claude-native-012.
- Added a separate original four-item host-offline fixture with hidden gold: English policy mismatch, Vietnamese clean how-to, JS shell and unsupported PDF. Ran actual installed candidate workflows on both hosts. Codex and the third Claude session produced start/review/validate artifacts and Markdown/HTML/CSV plus recovery notes.
- Retained two terminal Claude permission-harness failures (Bash wrapper pattern, then Write pattern). The successful fresh session explicitly allowed required tools for this isolated synthetic task. These failed attempts are not product acceptance passes and are not hidden.
- Independent post-run validation is valid but completionAllowed false for both. Both enumerate four items and 104 checks; states are zero audited, three pending, one unsupported. Codex has 3 pass/5 fail/4 NA/92 unknown; Claude has 1 pass/2 fail/101 unknown. All original content hashes unchanged; no observed network operation. Complete semantic coverage is not claimed.
- Both persist the pricing error and keep the Vietnamese control/PDF free of invented material findings. Claude overreaches on SEO metadata and assumes script behavior; its review script hardcodes a future precise timestamp, another provenance defect that structural validation does not certify. Retained raw artifacts and selected traces under offline-012, with narrow formatter/linter exclusions preserving forensic bytes.
- Remaining: schemas, broader labeled classes, review-time and rule-decision fixes, actual public/resume scenarios, independent acceptance and pilot. Goal remains active; no commercial release/push/deployment.
- Final checkpoint verification passed: format, lint, typecheck, build, git diff --check and all 51 test files / 375 tests. Independently rehashed every retained native-trial response and both offline artifact bundles; all recorded hashes match. No live process remains from these trials.

### Persisted schema contracts and candidate 0.1.3 checkpoint

- Previous turn established native invocation behavior and real offline artifacts, so it was progress. Inspected actual state/inventory/coverage/measurement/validation implementation and both retained host artifact sets before defining schemas.
- Added seven original draft-07 record contracts plus common definitions under schemas/: run, inventory, evidence, check, finding, coverage and AI observation. Preserve unavailable annotations, capture-error branches, safe integer/digest/path types and explicit required fields. Additional metadata is retained; schemas target generated standalone artifacts, not minimal state or campaign/provider inputs.
- Documented limits: shape acceptance does not establish authorization, evidence truth, real timestamps, hash correspondence, lineage, totals or semantic completion. The known future review timestamp remains open. Added a test proving a shape-valid wrong hash fails runtime validation and a future formatted date still passes schema shape.
- Added development-only Ajv 8/ajv-formats with lockfile; customer runtime unchanged. Removed npm's redundant bundleDependencies alias while preserving existing bundledDependencies. Initial strict-schema failures exposed missing conditional types/declarations; fixed and reran. Five tests now cover strict offline compilation, four historical host run revisions, fresh helper output, malformed cases and AI captured/error runtime agreement.
- Full verification passed: 52 files / 380 tests; format, lint, typecheck, build and diff check. Original provenance hashes updated, five upstream locks unchanged. New 0.1.3 component 553f0ad69fdd2c143226db26052a32096f771fdd9cf48a57cef4261831b3f65a; release bc3cba0a5b63e8fc3636de5874b2be51822947dc200b6b24c17dbe16f9aa319c; archive 7a3fff6a9502a41bb85e72b8b35688796c3ff827a9fa3c34f35ad981589e8db2.
- Extracted new archive and installed fresh for Codex, Claude Code and both. Verified one entrypoint, eight schemas, matching component/installation locks, helper --help and strict offline compilation of every installed schema reference. Receipt file: content-search-audit-schema-installation-snapshot.json. Frozen prior archives preserved; no new behavioral accuracy claim from schema changes.
- Remaining: actual review-time provenance enforcement, unsupported semantic findings, broader labeled classes and public/resume host workflows, source closure, independent acceptance and read-only pilot. Goal remains active; no commercial release/push/deployment.

### Review-time admission and candidate 0.1.4 checkpoint

- Previous turn delivered schemas and package receipts, so it was progress. Inspected standalone, partition and campaign review write paths before addressing the real host-generated future timestamp.
- Added original review-time.mjs admission check: explicit ISO timezone, actual calendar date/time, and maximum five-minute future clock skew. New reviews and new attached evidence are checked; source history is untouched. Standalone run/global receipt stores reviewAcceptedAt separately. This cannot authenticate plausible past timestamps or a bad machine clock.
- Standalone prepareReviewedAudit covers partition reviews through the existing shared call path; new reviewCampaign receipts check global reviewedAt/context collectedAt. Historical structural validation remains compatible and no silently corrected timestamp is written.
- Added three focused clock tests plus standalone/global write-path rejection tests. Changed only live submission fixture timestamps to actual time; retained archived model outputs unchanged. Resume tests initially exposed their arbitrary future timestamp and passed after fixture correction. Full verification: 53 files / 385 tests, format, lint, typecheck, build and diff all passed.
- Replayed the exact recorded Claude bundle through the native dispatcher: Future reviewedAt, no output directory, source hash unchanged. Preserved receipt content-search-audit-review-time-regression.json. No semantic correctness claim follows from this rejection.
- New frozen 0.1.4 component 3c2cc13a071f1dfd5e7a094d397798c987799d9cac8647197abf61e99c32c510; release 3dc0a595303bcda6e03ced30e9f3d12f4ef1d0104f8df3cd1c9226e1d7edb8d4; archive 14cad6ee7defad4f927eb2553e6a04eb2b37dc30cc401b59f862e81df56ddb8a. Upstream pins unchanged; prior archives retained.
- Extracted archive and installed for Codex, Claude Code and both. Each sole packaged entrypoint rejects the recorded bad bundle and accepts a new empty review with measured admission timestamp; all accepted revisions validate partial. Exact receipts in content-search-audit-review-time-installation-snapshot.json.
- Remaining: semantic overreach, expanded labeled fixture classes, actual public/resume host workflows, final source/requirement closure, independent acceptance and pilot. Goal remains active; no commercial release/push/deployment.

### Expanded semantic evaluation on frozen 0.1.4

- Added ten original dossiers and separate six-unit gold rubric. Primary Google documentation informed noindex and structured-data boundaries; target bytes were formatted before copying to fresh projects. Gold was excluded from both project trees.
- Ran both native CLIs with the installed frozen archive, no model pin and no requested network access. Both terminated successfully. Claude invoked the Skill tool; Codex read the entrypoint and method references. Retained prompts, exact final text, source/response hashes and selected command traces in semantic-expanded-014.
- Primary-agent manual review found 6/6 gold units per response, all ten dossiers accounted for and all five critical targets handled. Missing data stayed unavailable; visible clean controls retained. No observed network/injection command, marker file or target-byte change. These are bounded synthetic results, not independent acceptance or a general security claim.
- Preserved Claude residual precision issues: raw HTML “no content,” nonexistence versus unavailable later measurements, abbreviated quotations and unnecessary sitemap regeneration. Earlier semantic failures remain open.
- No package bytes changed and no new archive was built. Latest code verification remains 53 files / 385 tests. Public/resume host workflows, remaining fixture classes, source closure, real pilot and independent acceptance remain open. No push, deployment or commercial publication.

### Real public pilot and rule-source checkpoint

- Previous turn delivered expanded semantic evidence. This turn ran the frozen 0.1.4 collector against the real NKSkills origin; root redirects to /en/. A terminal one-capture budget checkpoint was copied to fresh host installs. Both native hosts continued it to 11 captures and collected all 12 resulting URLs, with no count/depth backlog. This proves budget-stop recovery, not killed-process recovery.
- Both hosts produced per-item review revisions, global receipts, HTML/Markdown/CSV customer reports and explicit missing-data coverage. Independent validation passed before and after extracting retained archives; all artifact-file hashes, original checkpoint hashes, report hashes and package digests match. No site edits or external-origin fetches were requested.
- Codex: 88 pass / 4 fail / 6 NA / 214 unknown checks, one resolved global rule. Claude: 57 pass / 4 fail / 3 NA / 248 unknown, three narrow global passes. Both remain 0 fully audited / 12 pending, with zero missing planned checks. Rendering, source/scope completeness and unmeasured search/AI data remain visible.
- Independently confirmed five EN/VI metadata pairs and guide source-revision omission (Codex), literal backticks and English comma issues (Claude). Retained overbroad canonical N/A rationale and discovery-versus-body wording caveats. These unlabelled real outputs do not establish precision/recall or independent acceptance. Evidence: content-search-audit-trials/public-pilot-014.
- Confirmed helper gap from Claude's rejected deterministic override probe: attaching valid extracted-text with no review succeeds but leaves the unknown check and stale missing-evidence reason. The actual evaluator returns pass on the same resulting evidence. Retained independent reproduction; a safe deterministic recomputation path and new candidate remain required. Do not weaken the host-override guard.
- Reviewed nine direct primary-source mappings for technical/media checks in content-search-audit-rule-source-review.md. Fully read two more locked Corey references, verified their hashes and recorded rejected assumptions; package pins/bytes unchanged.
- Reconciled Task 2 against source and test evidence, adding the missing empty adaptation-source regression. Focused 2 files / 18 tests passed; full 53 files / 386 tests, lint, typecheck and build passed. Final format/diff checks follow documentation retention. Other checklist items are not automatically marked complete.

### Evidence refresh and candidate 0.1.5 checkpoint

- Fixed deterministic recomputation after matching new evidence and repair of legacy unattributed unknown checks. Preserved host override rejection, immutable sources, semantic reviews and ambiguity handling. Campaign evidence is constrained to the selected part's owned items.
- Six regression tests now cover legacy repair, lineage/source immutability, ambiguity/state recovery, finding reconciliation, invalid overrides/hashes and partition ownership. Full suite passed 54 files / 392 tests, lint, typecheck and build.
- Replayed both the original public-pilot bundle and accepted stale legacy revision successfully. Built a new immutable 0.1.5 archive; prior candidates and upstream pins remain unchanged. Exact digests and receipts are in the evaluation document.
- Installed extracted archive fresh on Codex, Claude Code and combined; verified component digests, provenance closure, installation locks and both replay cases. Verified upgrade, modified-install rejection and restoration of an isolated pre-upgrade project snapshot. CLI downgrade remains rejected.
- Remaining source closure, semantic acceptance, true interrupted-process evaluation and checklist reconciliation are not waived. No commercial catalog publication, push or deployment.

### Selected reference closure and complete rule mapping

- Classified the previous turn as progress: candidate 0.1.5 documentation and archive integrity checks were completed. No live process was assumed from historical receipts.
- Read the remaining seven reference files in selected Corey seo-audit/content-strategy folders. Together with the two previously read references, all nine file hashes match the locked inventory. Per-file inheritance/exclusion decisions are retained in content-search-audit-selected-reference-review.json. Linked nonselected skills and vendor integrations remain explicitly excluded.
- Revisited current Google helpful-content, AI-feature and JavaScript-rendering documentation. Added a complete 26-rule source-disposition table, checked for exact unique coverage of current registry IDs. Identified bot documentation as inappropriate support for entity-consistency judgments and recorded direct technical/media replacements.
- No package bytes or frozen archives changed. Next package revision must apply source classifications and verify the non-HTML canonical / authorship-detection behavior cases. Source mapping review is evidence, not semantic acceptance or a new release.

### Applied source mappings and candidate 0.1.6

- Previous turn made progress by closing selected reference reads and mapping all 26 rules. Applied those mappings to registry 0.1.1 while preserving IDs, modes and evidence requirements; added explicit non-HTML canonical interpretation based on the historical pilot defect.
- Verified current preview-control URL and corrected a nonresolving shortened link before packaging. Updated only three package files plus provenance lock; five upstream pins and prior archives unchanged.
- Full checks passed: 54 files / 392 tests, format, lint, typecheck and build. Built immutable 0.1.6 and installed the extracted archive for each host and combined; composition and installation locks match.
- Both native hosts ran five bounded reference-application dossiers. Principal outcomes met in both; retained Claude precision issues and explicit limits in source-boundaries-016. Installed bytes remained unchanged. This is not a matched causal comparison or independent acceptance.
- Remaining requirements and the active goal stay open. No commercial publication, push or deployment.

### Actual interrupted-process recovery checkpoint

- Previous turn delivered 0.1.6 source mappings and native reference trials. This turn killed a live packaged helper with SIGKILL after observing cursor 500 of 1,200, confirmed terminal exit and validated the untouched checkpoint.
- Both native hosts resumed identical stopped artifacts into new directories. Independent validators and fresh archive extraction verify all 1,200 unique items, 1,200 evidence records and 31,200 checks. Hashes prove original checkpoint/config/content and installed packages remain unchanged.
- Added a real-process regression for committed-boundary SIGKILL recovery. Focused test and full 55-file/393-test suite pass; lint/typecheck pass. This does not cover arbitrary mid-manifest crash consistency or host-conversation restoration.
- Retained Claude's incorrect 28,200 prose total, overlooked cursor and missing-versus-unknown confusion. Recovery succeeds but final report fidelity still fails. Next work should address this observed reporting defect, remaining plan artifacts and semantic acceptance rather than repeating successful collection checks.

### Author-side evaluation aggregation

- Previous turn established actual SIGKILL recovery and exposed concrete final-report errors. Implemented the named scripts/eval-content-audit.mjs artifact instead of repeating collection tests.
- Added explicit response/adjudication hash binding, exact quotation checks, unique gold credit, separate precision/recall denominators, incomplete/unjudged null states, case accounting, reporting and instruction-review gates. No automatic semantic judging or release approval.
- Added eight contract/CLI tests and two retrospective adjudication receipts. Six matched gold units do not manufacture precision from an incomplete response inventory; known Claude reporting errors remain failures despite correct recovery artifacts.
- The verifier script, complete semantic adjudication, remaining fixture classes and independent acceptance are still outstanding. Frozen package and public catalog unchanged.

- Verification for the aggregation checkpoint: full 56 files / 401 tests, lint, typecheck and build pass; final format/diff checks follow documentation formatting.

### Author-side package and artifact verification

- Previous turn implemented semantic adjudication aggregation. Added the remaining named author tool scripts/verify-content-audit.mjs, using current TypeScript sources via the existing tsx dependency rather than a stale dist build.
- Verifies an externally pinned current package, composition/notices/entrypoint closure, optional extracted release and exact supported hosts, and declared standalone/campaign/global-review artifacts. No arbitrary supplied package code is imported. Wrong bindings and tampered artifacts fail; valid partial state never becomes complete.
- Seven tests cover package and artifact tampering, missing pins, unknown kinds, empty completion, release/host binding, global source linkage and new-only CLI receipts. The first campaign test exposed an incomplete test bundle; corrected the fixture to use actual manifest/partition hashes without relaxing validation.
- Executed the CLI on frozen 0.1.6's extracted release and both actual recovery outputs. Retained explicit input/result and usage documentation. Structural validity true; completion and release acceptance false. Package bytes and public catalog unchanged.
- Remaining: complete semantic adjudication and report-fidelity improvements, outstanding domain fixtures, requirement-by-requirement reconciliation and independent acceptance.

- Verification: 57 files / 408 tests and typecheck pass. Initial lint found a missing explicit URL import in the new author script; added the Node URL import and reran lint plus focused verifier tests. Final format/build/diff checks complete this checkpoint.

### Candidate delivery and measurement-gap reconciliation

- Previous turn completed the two author tools and their checks. Inspected the spec, original checklist, current entrypoint, measurement implementation and measurement/inventory/package tests before changing completion flags.
- Closed Task 8 candidate-delivery items with retained source/build/install/native evidence and a fresh 0.1.5 → 0.1.6 isolated upgrade/restoration/modified-install probe. No published bytes changed. Updated only the individually supported Task 3/7 command and input-contract checkboxes.
- Found a genuine missing Task 7 deliverable: adjudicated AI-answer accuracy metrics. Current importer intentionally computes only mention/citation rates; semantic audit-output evaluation does not close this gap. Preserve the requirement instead of shrinking it to shipped behavior.
- Focused 3 files / 17 tests passed. This documentation/receipt checkpoint adds no runtime changes; previous root 57 files / 408 tests remain the implementation baseline. Remaining accuracy implementation, report fidelity, fixtures and independent acceptance stay open.

### Supplied AI-answer accuracy and candidate 0.1.7

- Previous turn identified the real Task 7 gap and specified its boundary. Added original answer-accuracy.mjs validation and segmented aggregation, optional observation-schema review fields, and shared AI evidence/report handling for standalone and campaign outputs.
- Six initial tests failed against the missing behavior. Expanded to eight tests covering mixed/unknown/empty/incomplete reviews, quoted evidence and hash integrity, review-time admission, capture-error branching, duplicates/segmentation, schema, report equivalence, manifest binding and rejection before output creation. Existing report wording regression and escaped-Markdown test expectation were corrected without weakening validity checks.
- Claims count correct/(correct+incorrect) supplied judgments. Response denominator includes complete nonempty inventories with no unknown claim. Unreviewed, empty, incomplete and unresolved counts remain explicit; annotations are not authenticated truth. Mention/citation and accuracy remain separate.
- Full 58 files / 416 tests, format, lint, typecheck and build passed. Built immutable candidate 0.1.7 with five upstream pins unchanged; prior archives preserved. Extracted archive installs for Codex, Claude and combined reproduced expected accuracy, legacy unknown behavior and rejection of changed source bytes, with exact composition/digest locks.
- Task 7 metric definition now checked. Remaining host/report fidelity, complete semantic adjudication, fixture coverage and independent acceptance are not closed. No commercial publication, push or deployment.

## Native accuracy trial and CLI correction — 2026-11-16

Both actual native 0.1.7 host sessions correctly reported supplied claim accuracy
1/2, eligible response accuracy 0/1, unavailable mention/citation denominators,
and partial audit coverage (1 item, 26 unresolved checks, 4 global rules).
Input bytes, installed digests and report manifests independently validate.
See [the trial record](../research/content-search-audit-trials/native-accuracy-017/README.md).
Both exposed the same campaign CLI omission of the `measurements` option and used
the installed renderer directly. Candidate 0.1.8 corrects the allowlist; a direct
CLI regression reproduces the failure before the fix and passes afterward, while
registry overrides remain rejected. Fresh Codex, Claude Code and combined archive
installs pass digest/provenance checks; both actual saved campaigns replay through
the installed 0.1.8 CLI with exact input preserved. Combined-host links are resolved
before digest verification. Root verification: 58 files / 416 tests, format, lint,
typecheck and build pass. This is a bounded fixture success and CLI replay, not
new native 0.1.8 sessions or overall semantic acceptance. Historical archives remain
unchanged; the commercial catalog has not been modified.

## Mixed-source / actual alternate-locale fixture checkpoint — 2026-11-16

Added original mixed-locale fixture with five mapped HTML snapshots, owner context,
sitemap/CMS/repository discovery snapshots and withheld gold annotations. It pairs
English/Vietnamese current plan pages with a seeded entitlement contradiction and
missing reciprocal alternate annotation; regional refund policies and a historical
query version are clean controls. Missing analytics must retain a discovery queue.
Native 0.1.8 sessions use fresh extracted-archive installations with only targets
visible. This is a bounded snapshot/semantic trial, not a full campaign workflow.

Inspected coverage, validation and report test assertions and reconciled two Task 6
structural items. Focused collect/rules/report/coverage/validation run passes all
45 tests across five files; the three named focused test commands are covered by
that combined invocation. Corrected obsolete Task 7 prose that still described
answer accuracy as absent despite the 0.1.7 implementation and native evidence.

## Capability-freshness correction — candidate 0.1.9

The prior mixed-locale native trial found a stale remediation recommendation despite
correct identification of both material defects. Updated the mandatory final report
review to verify existence/scope of named diagnostic tools and exports, separately
from account access. Offline uncertainty must yield a direct evidence check and an
explicitly unverified optional tool workflow. Technical SEO now documents the retired
International Targeting report and direct reciprocal-annotation verification; the
entrypoint explicitly routes this check. Google's official deprecation page was
successfully opened on 2026-11-16, resolving the preceding trial's full-page timeout.
Only three instruction/reference files and their provenance hashes changed; no
source pins or executable helper behavior changed. Version 0.1.9 preserves older
archive bytes. Root checks pass: 58 files / 416 tests, format/lint/typecheck/build.
Fresh three-target installations, both-host upgrade and isolated restoration are
verified in the versioned receipts. Native regression sessions use the identical
0.1.8 prompts and targets; results must be assessed separately from these package
checks. No general semantic acceptance or commercial release is claimed.

## Native capability regression result — 0.1.9

Both fresh host sessions completed with exactly the preceding trial prompts and
same target fixtures. Both preserve the two gold findings, clean controls, source
memberships and missing analytics queue. Neither repeats the retired International
Targeting recommendation. Claude explicitly marks optional diagnostics availability
unverified offline. Hash checks prove target/package preservation and exact discovery
recomputation; all 18 archived artifact files replay byte for byte.

Claude retains two other report errors: a broad claim that all three sources agree
on all five URLs despite only two CMS rows, and an AEO clean summary contradicting
its own F1. These are retained, not hidden behind the targeted regression outcome.
This is one repeat per host, not causal proof, broad semantic acceptance or human
release approval. See [the trial record](../research/content-search-audit-trials/capability-freshness-019/README.md).

## Structured complete-report adjudication — 0.1.9 trial

The retained capability-freshness-019 reports now have complete issue inventories
and generated author-evaluator receipts. Each has 2 supported predicted issues / 2
adjudicated issues and 2 matched gold / 2 declared gold units. Codex meets the local
rubric; Claude fails reporting because of two report inconsistencies. Both remain
releaseAccepted=false. This tiny retrospective, primary-agent-authored rubric does
not establish general precision/recall or independent product acceptance.

Recorded tool-call review accounts for all 11 Codex and 8 Claude invocations and
terminal results. Exact write payloads bind the archived report; local reads,
discovery and output-only writes are consistent with the bounded authorization.
No network/credential/installer/source-write action appears. Tool input inventories
and stream hashes are retained; this is not process-level network attestation.
No runtime/package/evaluator change was needed. Whole-report bytes, input hashes
and generated evaluation receipts make this checkpoint reproducible.

## Unified assignment metadata correction — candidate 0.1.10

Task 6 inspection exposed that campaign reports dropped ownerRole/effort from local
findings even though standalone reports retained them. Unified HTML/Markdown/CSV
now preserve them. Optional global fields are validated as nonempty strings when
supplied; legacy omissions show Not supplied rather than fabricated assignments.
The CSV gains named owner_role/effort columns. Three assertions failed before the
fix and pass afterward; legacy absence, malformed metadata and HTML/CSV escaping
are covered. Task 6 backlog item is now verified across both report paths.
Fresh extracted-archive installs on Codex, Claude Code and combined run installed
CLI campaign reports against a synthetic 404 transport; assignment text and all
manifest hashes match. See content-search-audit-backlog-installation-snapshot.json
and trials/backlog-0110. Full verification passes 58 files / 417 tests, format, lint,
typecheck, build and diff. Prior native semantic report defects remain open; no
new native host session or final acceptance is claimed. Old archives are preserved.

## Output-contract audit — 0.1.10 unchanged

Current source and retained artifact directories reveal named-output parity gaps:
unified coverage exists only inside report-manifest.json; supplied AI records exist
inside ai-observation-evidence.json but not the specified JSONL artifact; standalone
rule-source/review-date appendix is absent from the campaign report. Campaign CSV
also lacks the standalone action column. These are concrete follow-up requirements,
not semantic acceptance claims. See content-search-audit-contract-reconciliation.md
and its hash-bound output-directory snapshot. Two Task 3 fixture/recovery items are
now reconciled; broader extraction, output and semantic gates remain open.

## Named output parity implemented — 0.1.11

Campaign coverage.json, optional shared ai-observations.jsonl and the campaign
rule-source/date appendix now close the three output omissions observed at 0.1.10.
Coverage uses an explicit campaign envelope and dedicated schema; standalone format
is unchanged. JSONL deduplicates validated rows while preserving raw input in the
original JSON evidence bundle and carries synthetic context plus bundle hash.
Three regression tests failed before implementation; current root checks pass
58 files / 418 tests, format/lint/typecheck/build/diff. Fresh three-target installed
CLI replays verify schemas, exact inputs, all 26 rule source/date entries, coverage
and manifest hashes. Historical source bytes are unchanged. See output-parity-0111
trial and content-search-audit-output-installation-snapshot.json. This is not a
new native model run or semantic acceptance. Action-type parity and independent
review remain open; Task 6's compound output requirement is not yet fully checked.

## Action proposal parity — 0.1.12

Standalone/campaign reports now share validated keep/update/consolidate/investigate
proposals with paired nonempty actionReason. Explicit reviewer proposals and default
triage are labelled separately in HTML/Markdown/CSV. No proposal grants implementation
approval or mutates coverage, inventory or evidence. Unsupported/unpaired values fail
validation; legacy defaults remain update for observed local findings, investigate
otherwise. Four pre-fix assertions failed; post-fix tests pass with existing escaping.
Fresh three-target installed review CLI produces all four proposed-action revisions,
retaining exact audit facts and partial completion; historical campaign replay checks
legacy defaults and manifest hashes. Full 58-file/419-test suite and root checks pass.
See actions-0112 trial and content-search-audit-actions-installation-snapshot.json.
This closes the action-type parity gap, not broad semantic acceptance or a new native
model trial. Earlier frozen packages and observed model report errors remain unchanged.

## Final candidate upgrade checkpoint — 0.1.12

The [six-case upgrade trial](../research/content-search-audit-trials/upgrade-0112/README.md)
verifies 0.1.9 and 0.1.11 upgrades to the frozen 0.1.12 archive on Codex, Claude
Code and combined targets. Actual CLI operations reject modified components without
changing their trees, retain customer notes, and install files identical to the
extracted archive. Whole-project backup restoration preserves file/directory/link
snapshots. Original archives remain unchanged. This refreshes Task 8 delivery
evidence for the latest bytes; it is not CLI downgrade, live rollback or semantic
acceptance.

## Complete rule traceability — candidate 0.1.12

[All 26 rules](../research/content-search-audit-rule-traceability.md) now map to
pinned upstream sections, packaged primary/context sources, internal adaptations,
existing fixture artifacts and explicitly missing expected cases. Five selected
source commits and tree digests match the immutable lock. Local evidence hashes
bind this snapshot; no new internet freshness review or method efficacy is claimed.
This closes Task 1's mapping deliverable only. The map exposes dedicated semantic
fixture gaps; related cases and structural tests are not promoted into acceptance.

## Supplemental semantic fixture execution — 0.1.12

The [12-dossier native holdout](../research/content-search-audit-trials/semantic-holdout-0112/README.md)
adds the dedicated task/media/metadata/graph/render/fact/question/duplication/journey
and comparison/schema cases exposed by the source map. Both hosts find all 15
seeded units, with clean controls and input/package integrity checked. Report
fidelity is still not fully accepted: Claude has an exact-quotation defect and
ambiguous wording; evaluator receipts and independent human review remain open.
Task 9 is therefore not checked merely because this additional set ran.

## Source-age implementation — candidate 0.1.13

The [source-age trial](../research/content-search-audit-trials/source-age-0113/README.md) closes
the computed-age omission: one actual report time anchors captures, date-only rule
reviews, provider exports and AI observation/review/source dates. UTC calendar-day
age is distinguished from full elapsed 24-hour intervals. Missing/invalid/future
values remain unavailable; age alone never marks content stale or changes coverage.
Fresh three-target installed CLI reports retain exact provider/AI input bundles,
source bytes and component digests. 59 test files / 423 tests and required root
checks pass. Historical frozen archives and semantic failures are unchanged; this
is not a new native host evaluation or independent acceptance.

## Collection, method and measurement reconciliation — 0.1.13

[Source-backed reconciliation](../research/content-search-audit-collection-reconciliation.md)
closes the expected-rule design, internal method adaptation and measurement
test-scope deliverables. It preserves the distinction between test execution and
semantic acceptance. Compound collection/output items remain open: optional actual
render/extraction support is not established, privacy-redacted derivatives are not
implemented, scope/permissions/budgets live in config.json rather than the named
run.json contract, and inventory has typeCandidates without a resolved type field.
These are concrete remaining implementation contracts, not missing documentation
that can be closed by relabeling existing fields.

## Declared type contract checkpoint — 0.1.14

Implemented explicit inventory `type` resolution from unique preserved declarations
and runtime rejection of contradictory resolved values. Missing/conflicting types
are unknown; no extension/MIME inference. Legacy inventories may omit the field.
Two regression assertions failed before implementation; all 59 files / 425 tests
passed afterwards. Root lint/typecheck/build/format/diff checks passed. New immutable
archive installed from extraction into fresh Codex, Claude Code and combined
projects; installed normalizers passed supplied/absent/conflicting-type cases.
See [installation receipt](../research/content-search-audit-type-installation-snapshot.json).
No native host semantic acceptance is claimed. The broader output-contract task
remains incomplete: run scope/permissions/budgets and redacted evidence derivatives
still need implementation and verification. Existing model reporting failures and
independent acceptance remain open.

## Run contract checkpoint — 0.1.15

Closed the missing run scope/source-permissions/budgets projection. Run format
0.2.0 is configuration-bound, including scope flags; fresh starts, reviews,
campaign partitions and resume pass existing integration coverage. Explicit
network limits on changed-configuration resume and rejection of altered metadata
and config bytes are tested. All 427 tests and root checks pass. Three fresh
archive installs execute start/validate/tamper-rejection with the installed CLI.
See [trial](../research/content-search-audit-trials/run-contract-0115/README.md).
The compound output contract remains open for redacted evidence derivatives.
Native semantic errors and independent acceptance have not been resolved by this
structural change. No commercial release, push or deployment occurred.

## Evidence derivative checkpoint — 0.1.17

Implemented explicit literal-redacted evidence derivatives with immutable source
hash linkage, separate derivative hashes, private new-only output and preserved
raw runs. 428 tests and fresh installed CLI checks on three host configurations
pass. See [trial](../research/content-search-audit-trials/redaction-0117/README.md).
This closes the missing derivative primitive, not the complete sharing contract.
Report text/locators, measurement artifacts and link remapping still require a
coherent sanitized export. Literal policies do not detect arbitrary PII. No broad
privacy or semantic acceptance is claimed. Version 0.1.16 is superseded by 0.1.17
after a lint import fix; old archive bytes are preserved.

## Redacted presentation checkpoint — 0.1.18

Added standalone/partition report export with presentation-only literal masking,
escaped output, derivative links/hash display, immutable original audit and
source numerical coverage. 429 tests plus three fresh installed CLI checks pass.
See [trial](../research/content-search-audit-trials/redacted-report-0118/README.md).
Compound sharing work remains open for campaign reports and optional measurement
exports; arbitrary PII detection is not claimed. Native semantic failures,
extraction evidence gaps and independent acceptance remain unresolved.

## Redacted campaign checkpoint — 0.1.19

Closed the base unified campaign presentation gap: local derivative links, global
context derivative, source/derivative hash distinctions, masked display text and
original numerical coverage. Source regression covers two partitions; installed
CLI trial covers one partition on three fresh host configurations. All 430 tests
and root checks pass. See [trial](../research/content-search-audit-trials/redacted-campaign-0119/README.md).
Optional measurement exports remain explicitly omitted from redacted views and
their sharing workflow remains open. Literal masking does not prove arbitrary
PII absence. Native semantic errors and independent acceptance remain unresolved.

## Measurement sharing checkpoint — 0.1.20

Closed the explicit-literal measurement attachment implementation gap on both
standalone and campaign exports. Original import validation precedes presentation;
wrappers distinguish derivative JSON/JSONL from importable original evidence and
retain source hash linkage. All five measurement families pass installed CLI
checks on three fresh host configurations; 431 tests and root checks pass.
See [trial](../research/content-search-audit-trials/redacted-measurements-0120/README.md).
This is not arbitrary PII detection or independent privacy acceptance. Native
semantic report errors, extraction evidence gaps and independent review remain
open; the overall goal is not complete.

## Native fidelity control — frozen 0.1.20

Five same-prompt Claude runs on the two relevant holdout dossiers are complete.
All find three gold units; three runs mislocate quoted spans and one blurs the
observed difference versus a real change. The historical shortened sentence
did not recur in this sample. Native events, exact reports, tool calls, input and
package hash checks and archive replay are retained in the
[fidelity control](../research/content-search-audit-trials/fidelity-control-0120/README.md).
No skill changes or release build this checkpoint. Next implementation is mechanical
quote/line-range verification; targeted guidance and repeated candidate trials
follow. Overall semantic acceptance remains failed.

## Quote verification and native fidelity checkpoint — 0.1.21

Added bounded, hash-bound source/report quote and literal locator verification,
with explicit submitted-span-only limits. Historical wrong-range regressions fail
until both report and ledger are corrected. Fresh archive installs pass helper
checks for Codex, Claude Code and combined targets. Root verification records
61 test files / 433 tests passing for this implementation.

Five native Claude repetitions on the same two control dossiers completed.
All final receipts independently replay against unchanged reports and inputs;
no targeted final locator error was recorded. However, run 4 still falsely flags
a valid descriptive increase and quotes a fragment that loses the source's
negation; run 5 retains ambiguous real-improvement wording. Mechanical success
therefore does not close semantic acceptance. All five also have non-RTK-leading
shell commands. Full evidence and limitations are retained in the
[fidelity candidate trial](../research/content-search-audit-trials/fidelity-candidate-0121/README.md).
Next: complete-assertion quotation and descriptive/generalization/causality
judgment, then full native holdout on both hosts. Overall objective remains open.

## Complete-meaning review checkpoint — 0.1.22

Moved actual-defect and complete-meaning gates into the entrypoint, with guidance
for complete assertions, preserved negation and descriptive versus causal claims.
All 433 tests and root checks pass; fresh archive installs succeed on both hosts
and combined targets. Six upgrades from 0.1.20/0.1.21 preserve local edits on
rejection and install the expected digest after restoring the original package.

Both native hosts completed all twelve known development dossiers and found all
15 material gold units. The prior descriptive-change false positive and lost
negation did not recur. Codex meets the local primary-agent rubric. Claude retains
four report issues (tax qualifier, mechanism assertion, sample denominator and
unscoped eligibility prerequisite), seven RTK-prefix deviations, plus a final
response omission of supplied rendered evidence. See [trial](../research/content-search-audit-trials/semantic-0122/README.md).
Neither host result establishes independent acceptance; the overall goal remains
open. Next review must bind proposed corrections and final summaries to scope,
qualifiers, denominators and evidence surfaces as carefully as findings.

## Current source reconciliation — 0.1.22

Reviewed the 26-rule registry against six internal methods and current primary
documentation. Five selected upstream commits/tree digests, both license files,
nine selected reference hashes and all package-file provenance digests match.
Fifteen registry primary pages plus the retired-tool notice were reopened.
[Source reconciliation](../research/content-search-audit-source-reconciliation-0122.md)
records source boundaries and later holdout coverage without rewriting the older
snapshot. The selected-registry freshness/attribution task is closed at its review
time. Comparison-candidate closure and semantic, extraction and release gates
remain open. No package bytes, upstream pins or release archive changed.

## Actual extraction probe — unchanged 0.1.22

Controlled Chrome DOM rendering and actual two-page English/Vietnamese PDFKit
text extraction succeeded; an image-only PDF correctly yielded unavailable text.
The first Swift attempt timed out; a bounded retry reused completed artifacts.
Both fresh installed host packages accept artifact-backed extracted evidence and
remain partial. The readable PDF check passes but its inventory state remains
unsupported: attributed extraction recovery is not implemented. See [trial](../research/content-search-audit-trials/extraction-0122/README.md)
and the proposed extraction-recovery design. No package bytes changed, no OCR or
general host/browser acceptance is claimed, and the compound extraction gate
remains open pending the recovery implementation and native semantic evaluation.

## Attributed local PDF recovery checkpoint — 0.1.23

Implemented source-byte-bound collectionRecoveries in review and owned campaign
parts. Successful recovery moves unsupported to pending; full rule coverage and
semantic unknowns remain. Source hashes, roots, page/text lineage, attribution,
state restrictions and read budgets are checked. Resume conservatively requires
fresh extraction even for an unchanged PDF. Blank/image-only pages remain unsupported.

All root checks and 62 test files / 448 tests pass. The frozen archive was extracted
and installed fresh for Codex, Claude Code and combined. All three installed CLIs
recover the retained real two-page PDF to pending, keep the image-only PDF
unsupported and preserve original runs/source bytes. Exact artifacts and the
97-file archive byte comparison are retained in [the trial](../research/content-search-audit-trials/extraction-recovery-0123/README.md).

This closes the helper lifecycle defect found in the earlier extraction probe;
it does not close native host extraction, OCR, independent semantic acceptance or
commercial release. Remaining research work includes explicit disposition of the
comparison families, separate from the five already-reviewed inherited packages.
No commit, push or deployment was performed in this checkpoint.

## Aaron comparison disposition checkpoint

Previous goal turn made verified progress: candidate 0.1.23 repaired attributed
PDF recovery with 448 passing tests and fresh installed checks. This turn advanced
source selection: read the pinned Aaron scorer and runtime contracts, identified
reachable policy discrepancies, and ran three bounded synthetic scorer probes.
All matched the catalog/scorer policy; the upstream checkout remains clean.
[The decision](../research/content-search-audit-aaron-disposition.md) excludes this
runtime and refinement workflow from the current bundle while retaining its
coverage semantics as comparison material. No source pin or package changed.
This closes the current-bundle Aaron selection decision, not full upstream
closure, other comparison families or independent acceptance.

## RankXAI comparison disposition checkpoint

Previous turn made verified research progress on Aaron. This turn reads the
pinned RankXAI source/overlap paths and dependencies, runs four controlled probes,
and records a [reference-only disposition](../research/content-search-audit-rankxai-disposition.md).
The checks preserve distinctions between exit success, available evidence and
semantic support. No upstream source or customer package changed. This closes
the current-bundle runtime selection decision, not complete repository closure
or the remaining native semantic and commercial acceptance gates.

## Measurement and quality-gate comparison checkpoint

Previous turn advanced RankXAI selection with controlled evidence. This turn
closes current-bundle selection decisions for TheSmokeDev measurement and Gaguero
quality/AI-search skills as reference-only. Full selected entrypoints and named
dependencies were inspected; four CLI probes, two schema cases and three original
measurement counterexamples expose the limits relevant to integration. Current
provider docs resolve crawler/hidden-content applicability. See the
[disposition](../research/content-search-audit-geo-gates-disposition.md).
No package changed. AgriciDaniel/Zubair dispositions and native semantic acceptance
remain open; this is not whole-repository approval or commercial release.

## Consolidated comparison selection checkpoint

Previous turn advanced TheSmokeDev/Gaguero decisions with controlled probes. This
turn rechecks AgriciDaniel/Zubair orchestrators, documents scope/score/runtime gaps
and consolidates five inherited source skills plus six reference-only families in
[a source decision ledger](../research/content-search-audit-source-decisions.json).
All six current-bundle comparison choices now have explicit rationale; excluded
repository/runtime closure is not claimed. No package changed. Remaining work
centers on native semantic correction, extraction acceptance and the existing
requirement-level completion audit rather than adding redundant upstream packages.

## Reporting controls and native extraction — unchanged 0.1.23

Two report-assembly recipes were tested after a no-guidance control and against
existing workflow context (five repetitions per arm). Neither is accepted for
package adoption; exact evidence is in semantic-recipe-0123.

Fresh native Codex and Claude Code trials then exercised original HTML/PDF inputs,
real PDFKit/OCR extraction, recovery, semantic reviews and helper reports. Both
final runs are structurally valid and partial. Native-extraction-0123 records
independent replay, unchanged source/package hashes and 177 byte-verified archived
files. Codex's local target-script fallback and Claude's final audited-count claim
prevent behavioral acceptance. Owner policy was available to both hosts but only
Codex attached it as structured claim-source evidence. These findings define the
next scoped corrections; the frozen 0.1.23 package remains unchanged.

## Context/coverage correction and browser-boundary regression

Candidate 0.1.24 preserves supplied owner policy as attributed rule evidence and
uses validated coverage in delivery. The unchanged native fixture shows both
corrections on Claude. Codex attempted a sandbox-disabling WebKit environment
variable and was stopped with SIGTERM; no final report exists. The frozen archive,
111-file retained trial and isolated upgrade checks remain available.

Candidate 0.1.25 explicitly prohibits changing browser/OS protections to obtain
an optional capture and documents the fallback rationalizations. Root 62-file /
448-test suite and other required checks pass. Fresh extracted-archive installs
succeed for Codex, Claude Code and combined. Native behavior is under evaluation;
installation and wording changes do not close that gate.

## Protected fallback outcome — candidate 0.1.25

Native local regression now records correct coverage and supplied-policy use on
both hosts, with no recorded VM/protection-disabling workaround. Codex timed out
at the harness limit and completed the handoff in a separate continuation; 55
prior run artifacts are unchanged. Claude leaves unattempted OCR unsupported.
Six runs validate; eight Codex and six Claude quote receipts replay exactly.
Native-extraction-0125 retains 205 byte-verified files. Fresh installations and
0.1.24-to-0.1.25 upgrade/rejection checks pass on all three configurations.
Remaining: full twelve-dossier report regression, final requirement reconciliation
and independent acceptance. Targeted regression does not close those gates.

### Full semantic regression checkpoint — 0.1.25

The [12-dossier replay](../research/content-search-audit-trials/semantic-0125/README.md)
is terminal on both hosts. Each detects all 15 known gold units; Codex meets the
local evaluator, while Claude fails reporting and workflow/instruction gates.
Exact reports, prompts, events, quote replays and 77 byte-compared archived files
are retained. This closes the current-version regression execution, not Task 9
acceptance or human review. No package bytes changed. Task-level reconciliation
continues from the current completion-audit matrix.

### Transcript/media availability reconciliation — 0.1.25

A new integration regression and six fresh installed CLI runs (standalone and
partitioned campaign on Codex, Claude Code and combined installations) preserve
three distinct states: supplied transcript pending, missing transcript failed,
audio unsupported. Exactly one text evidence record survives; no invented media
text, finding or completed audit is produced. The duplicate transcript source
memberships are retained. The trial archives 165 byte-compared files. This closes
Task 3's remaining accounting item with the existing PDF and inventory evidence;
no runtime or frozen package bytes changed. Native semantic acceptance stays open.

### Access-barrier regression — 0.1.26

Task 4's barrier/no-content-defect requirement exposed an automatic-finding bug:
the collector marked 401/403/429 blocked but the HTTP check still failed and
produced findings. Three new integration cases failed first, then passed after
the shared check retained unknown for those statuses. The
[installed old/new replay](../research/content-search-audit-trials/http-barriers-0126/README.md)
confirms standalone, campaign and recapture/resume behavior on fresh installations.
0.1.26 is a separately frozen candidate; earlier snapshots use their original
helper version. All 452 tests pass. This closes the observed barrier bug, not the
remaining compound Task 4 or native semantic acceptance gates.

### Additional support-entrypoint research — 0.1.26

The [bounded Corey support review](../research/content-search-audit-corey-support-disposition.md)
reads analytics, competitors, competitor-profiling, programmatic-seo and copywriting
entrypoints at the existing immutable revision. All are reference-only; inventories
and hashes distinguish inspected entrypoints from unread reference/evaluation trees.
This addresses the named analytics/competitor/editorial support comparison without
claiming full transitive closure. No additional skill is installed or inherited.

Four original synthetic transfer dossiers cover dated competitor claims, matching
metric windows, regional template data and unsupported guarantees. Six gold issues
and clean controls were frozen before native execution; only targets are copied to
host projects. Results must be reviewed separately before closing any acceptance
item. This is additional coverage, not a replacement for the original fixture set.

## Additional support-method holdout — 0.1.26

See [native trial evidence](../research/content-search-audit-trials/support-methods-0126/README.md).
Both hosts found all six seeded material issues and preserved clean controls. Replayed
quotations: Codex 16, Claude Code 15. Both omitted the required inventory/coverage pipeline;
Claude also conflated referral-total estimation and incrementality in a verification step.
These are open workflow and semantic limitations, not release acceptance. The fixture is
primary-agent-authored and still needs independent review. Package version remains 0.1.26.

## Coverage workflow correction — candidate 0.1.27

Baseline: support-methods-0126 found six seeded defects on both hosts, but neither
created the required inventory/coverage run. Quote checks were executed instead.
The entrypoint now puts `start` before drafting, requires persisted semantic
`review` and final `validate`, and distinguishes genuine execution failure from
voluntary omission. Small/offline/synthetic scope still requires the pipeline.
No helper behavior, source pins or inherited method changed.

Component: `7d701c36a35695f7f5d2675fb0cf1cf1a5f24bddc9c603c89b646bebf31be286`.
Release: `04f6425a550a93a0f2ac48bdabe958f69064a65d3da49b9657abb40fc834b73d`.
Archive: `d2e8c1ad20a8fc552e002548501439db84f05202275b27a818219b2749be2a9b`.

Required root checks passed: format, lint, typecheck, 62 test files / 452 tests,
build. Upgrade from 0.1.26 was checked for both hosts separately and together,
including refusal to replace a modified skill and preservation of the combined
installation symlink. See the 0127 upgrade snapshot. The identical native fixture and prompt replay is complete: Codex persisted six
findings and 21 resolved checks; Claude ran start/validate but omitted semantic
review. Both found six gold defects. See
[coverage-0127](../research/content-search-audit-trials/coverage-0127/README.md).
The remaining host-compliance and semantic failures keep acceptance open.

## Explicit recovery and collection accounting follow-up — 0.1.27

The explicit Claude recovery diagnostic successfully submitted six findings and
nine assessments while preserving prior artifacts, but exposed a scope error:
FAQ-only pass decisions were persisted on a dossier containing other unsupported
claims. This is not acceptance. See the review-diagnostic-0127 trial evidence.

Three added integration tests verify oversized responses, private redirects and
DNS timeouts preserve inventory and incomplete coverage without content findings.
All 62 test files / 455 tests, lint, typecheck and build pass. Package bytes remain
frozen at 0.1.27. The collection-gates-0127 crosswalk records what is and is not
proven; compound Task 4 and native-host acceptance remain open.

## Candidate 0.1.28 — semantic scope contract

The entrypoint, scope reference and answer-quality method now require a check to
cover the rule's applicable scope within the whole inventory item. Clean subparts
remain clean; neither a narrow reason nor a question invented by the reviewer may
silently change that scope. See semantic-scope-design for rationale and the limits
of structural validation. No helper/schema or source-pin change was made.

Component `5d18eb80bc5d205829093acae72bf03765a985e68be025e30eb375b1fcca8025`;
release `5483a688a06786e7a996798687af4d4ebdae6ee0f84d5f95168ed318429c7039`;
archive `8c2b26ce18d39a55d11e1793c812f71b8654f6d31466b3cdc4163243d0c1614d`.

Format, lint, typecheck, build and all 62 test files / 455 tests passed. Fresh
extracted installs and upgrades from 0.1.27 passed for both hosts and combined,
including modified-file refusal and combined symlink preservation.

The scope-0128 native trial did not produce completed reports: Claude had an API
connection failure; Codex was stopped after its wall deadline with stream errors.
Both terminal states and 87 raw artifacts were preserved. Behavioral effectiveness
of the new guidance remains unverified. No release acceptance follows from these
infrastructure failures or from the structural tests.

## Additional Corey AI SEO / schema comparison

Reviewed eight file bodies at the existing immutable Corey commit and inventoried
20 files. The schema package is `skills/schema`, not `schema-markup`. Both packages
remain reference-only. Three live Google documentation checks distinguish Article
recommended fields, Product snippet property alternatives and AI feature eligibility
from upstream blanket requirements. See content-search-audit-corey-ai-schema-review.json
and content-search-audit-corey-ai-schema-disposition.md in docs/research.

Unreviewed references/evals and linked external methods/tools remain explicitly
outside review closure. No package bytes, source pins or native trial results were
changed. The broader Task 1 review checklist and host acceptance remain open.

## Corey AI SEO/schema local body review completed

All 20 local files across ai-seo and schema at commit
`1f837447b20bb6f0e72d87b80ece1c221c362c7d` have now been read, including 23 authored
eval scenarios (not executed). Hashes remain unchanged. The disposition records
per-reference exclusions and conflicting schema FAQ eval expectations; upstream
evals are not adopted as acceptance gold. Two additional official checks confirm
no Google preferred word count and non-exhaustive site-operator results.

This supersedes earlier eight-file/partial-local-review status for these two
packages only. External studies, tooling and additional attributed source families
remain outside reviewed closure. Both packages remain reference-only; frozen
candidate 0.1.28 and its unresolved native behavioral gate are unchanged.

## Native scope retry — 0.1.28

The fresh two-host retry finished normally. Both reports identify all six seeded
material defects across four synthetic dossiers. Codex persists six findings, resolves
15 of 104 checks and replays 16 submitted quotations. Claude explicitly omits semantic
review and quote verification: zero persisted findings and 104 unknown checks. Both
retain four pending items and avoid a full-completion claim. Package and target bytes
are unchanged. The 91-file raw archive was compared with its originals.

This is repeated development evidence, not independent acceptance. Claude workflow
compliance remains an open release gate; further prompt-only retries are not a substitute
for diagnosing the missing review step. No package change or release promotion is made.
See [trial and receipts](../research/content-search-audit-trials/scope-retry-0128/README.md).
The [0.1.28 source closure](../research/content-search-audit-source-closure-0128.json) rechecks the
five selected immutable source trees, license bytes, provenance file hashes, candidate
package and versioned archive. It does not close unreviewed comparison references.

## Executable semantic-review example — unchanged 0.1.28

An author-side example now demonstrates start, attributed claim-source evidence,
immutable semantic review, finding persistence, validation and final quote verification.
It ran against both extracted host installations, with one supported failure and
unrelated checks remaining unknown. Missing-finding submission was rejected before
output creation; source and original checks remained unchanged. The 58-file archive
was compared with its originals. This is deterministic helper evidence, not native
behavioral acceptance; Claude first-invocation compliance remains open.

See [worked example and receipts](../research/content-search-audit-trials/worked-review-0128/README.md).
No candidate package, provenance lock or release archive changed.

## Copywriting local-reference closure

Read all three copywriting reference bodies and ten eval cases at the existing
immutable Corey pin, verifying every inventoried file hash. Evaluations were not
executed. The [disposition](../research/content-search-audit-copywriting-reference-disposition.md)
separates factual support and audience context from style bans, mandatory CTAs,
illustrative product commitments and unverified conversion forecasts. This closes
local reading for one support family only. External lineage and the other four
support families remain open; candidate inheritance and package bytes are unchanged.

## Example-assisted native workflow — unchanged 0.1.28

Fresh Claude execution with the optional worked example now persisted all six
findings, resolved 15/104 checks and verified 30 submitted quotations. Four items
remain pending and the final response matches coverage. Original project bytes
remain unchanged. A 67-file archive preserves the run. This changed-prompt condition
is not unchanged-candidate acceptance or proof of causation. The report adds an
unsupported or ambiguously scoped inference about observations above a median;
a counterexample is retained. Semantic and two-host release gates remain open.

[Native trial and adjudication](../research/content-search-audit-trials/worked-native-0128/README.md).

## Candidate 0.1.29 — bundled executable review example

The worked review now ships inside the single skill and is linked at review time.
It remains an optional synthetic demonstration, not an automatic customer verdict.
Evidence guidance now distinguishes aggregate statistics from distribution, tail,
maximum and guarantee claims. Five upstream pins are unchanged; 85 provenance file
records and full package/source byte closure validate.

All 62 test files / 455 tests passed, along with format, lint, typecheck and build.
The new versioned archive was extracted and installed into fresh Codex, Claude Code
and combined projects. Its example passed in all three. Modified-file upgrades
refused while preserving edits and lock; clean 0.1.28 → 0.1.29 upgrades matched
package bytes and preserved the combined symlink. No crash injection is claimed.

- Component: `13905fa20b6b50f89cf3916785f4c9b012d3e27f96abe04f95e63ab0a08aaf5a`.
- Release: `ec9b15881cc6631cbca25be12e8869e34e20079319d6bf2c127832c57b4ddb1f`.
- Archive: `a78cf91058d5f8a83095cbe014fc0d1dbf985901b9b017ed2122eee16071208e`.

[Installation/upgrade receipt](../research/content-search-audit-0129-upgrade-snapshot.json) ·
[source closure](../research/content-search-audit-source-closure-0129.json).
Native behavioral regression on this exact package and independent acceptance
remain outstanding. No commercial catalog promotion, push or deployment occurred.

## Competitors and programmatic SEO reference review

Read four further local reference bodies and 15 eval cases at the existing Corey
pin; all inventoried hashes match. Cases were not executed.
[Competitors](../research/content-search-audit-competitors-reference-disposition.md)
retains dated evidence and absent-listing distinctions while rejecting unverified
example prices, ratings, migration commitments and generic footer rules.
[Programmatic SEO](../research/content-search-audit-programmatic-reference-disposition.md)
retains page-family/task distinctions but excludes universal initial-HTML failure,
platform dependencies, automatic noindex and template-based demand forecasts.
Google JavaScript documentation was checked for the rendering distinction.
Both remain reference-only; analytics and competitor-profiling local bodies plus
external lineage remain open. Candidate package and pins are unchanged.

## Native regression on exact candidate 0.1.29

Both fresh native host runs completed with the original prompts and unchanged
target bytes. Both persisted six findings and kept all four dossiers pending.
Codex resolved 18 checks and replayed 17 quotations; Claude resolved 14 checks and
replayed 22 quotations. Final response counts agree with artifacts. The earlier
median inference is absent. Claude adds an incorrect direction-unknown statement
for the mixed-window ratio; deterministic bounds are recorded in adjudication.
It also violates the leading-RTK convention in seven of ten Bash calls.

All original project bytes are unchanged. A 126-file raw archive was compared
with originals; final validation and quote verification were replayed.
[Trial and limitations](../research/content-search-audit-trials/native-0129/README.md).
This closes execution of this regression, not independent or all-fixture semantic
acceptance. Candidate remains 0.1.29; no further prompt patch or promotion is made.

## Five support-family local body reviews complete

Read the remaining analytics and competitor-profiling reference/eval bodies and
reverified all inventoried files and root license at the existing Corey pin.
Across all five support families this accounts for five entrypoints, twelve local
references and forty eval cases. Cases and vendor tools were not executed.
[Consolidated dispositions](../research/content-search-audit-corey-support-disposition.md)
retain every family as reference-only. Current Google documentation confirms
terminology/configuration caveats in the analytics reference; these old instructions
are excluded rather than copied. No legal compliance or vendor-runtime claim follows.

This completes the named five-family local-body subtask only. Other candidate
families and transitive references remain outside this closure. Candidate 0.1.29,
its five inherited pins, package and archive remain unchanged; semantic and
independent acceptance gates remain open.

### Current-version expanded native regression

Candidate 0.1.29 was exercised independently on both supported hosts against the
existing ten-dossier expanded fixture. Both retain 12 declared items, including
both unavailable underlying media URLs, with zero fully audited. Six material gold
units are found in five consolidated editorial findings. Claude additionally records
a hidden-instruction concern and has an overbroad no-AI-observations summary despite
the historical aggregate in dossier H. Exact reports, replay receipts, preservation
hashes and 168 raw archived files are retained in
[expanded-0129](../research/content-search-audit-trials/expanded-0129/README.md).
Full instruction-trace review for this cohort is still open. Compound Task 4/9
checkboxes remain unchecked; this is development regression, not independent release
acceptance. No package version or prompt patch was introduced for the new wording
error.

### Expanded 0.1.29 recorded execution review completed

The [v2 trace receipt](../research/content-search-audit-trials/expanded-0129/trace-review-v2.json)
completes the prior pending review: all 17 Codex commands and 18 Claude tool calls,
including generated executable bodies, were inspected and bound to archived bytes.
No injected command, URL fetch, installation, credentials access or target/package
write appears. Claude still violates RTK formatting and retains the historical
measurement summary error. The exact fixture's native instruction-boundary evidence
is established; Task 4 and Task 9 compound requirements remain open.

### Editorial support comparison completed locally

The [copy-editing review](../research/content-search-audit-copy-editing-reference-disposition.md)
reads and hash-verifies the full entrypoint, three references and nine eval cases
at the existing Corey pin. Source inventory and decisions now distinguish this
from an inventory-only record. Reference-only: no score-driven publication gate,
blanket old-statistic replacement, style-based authorship judgment, universal CTA,
or rewriting permission is inherited. Primary date and audience-language guidance
was checked; external derivation/licensing chains remain bounded. This closes one
local review scope, not Task 1 as a whole. Candidate remains 0.1.29.

### Site-architecture local source review

The [site-architecture disposition](../research/content-search-audit-site-architecture-disposition.md)
closes the complete local package-body reading for this comparison (entrypoint,
four references, eight evals; six files hash-verified). Keep reference-only: no
universal click-depth, header-count, link-density or breadcrumb/URL failure rules;
no migration execution or platform/vendor inheritance. Official Google breadcrumb,
link, URL and migration guidance was checked. Task 1 remains open for other scopes
and external dependencies. Frozen candidate remains 0.1.29.

## Candidate 0.1.30 — implementation-status reference reconciliation

Corrected three bundled references that still described integrated collection,
discovery and global review as pending implementation. Runtime files and all five
source pins remain unchanged; the provenance lock binds the corrected references.
The implementation scope/limits checklist item is reconciled above, with explicit
literal-only redaction and separate independent privacy/native acceptance.

Component: `ec20aa0b455f7c62709f8d0ee499d1416d10e4cc2e9f99d062a0f8f77bafcb48`.
Release: `d35ff4cd78fc20c9ac7e5b81e782f2c98d3557b5935414c0997be013ffc88e5b`.
Archive: `56c991025465f57112f94ecca13412071c7ace94defe3388e944a47f842e21c9`.

Fresh extracted-archive installs and clean 0.1.29 upgrades pass for Codex, Claude
Code and combined targets. Each has 86 byte-matching package files and one
entrypoint per host; each fresh installation runs the worked review example.
Receipts: `content-search-audit-0130-installation-snapshot.json` and
`content-search-audit-0130-package-diff.json` under `docs/research`. No new native
model trial or modified-upgrade fault injection was performed for this reference
correction. Root verification passes 62 files / 462 tests, lint, typecheck and build.
An initial verifier test retained the old expected version; only that expectation
was updated, preserving its component/host assertions. Older frozen archives stay
unchanged; no commercial publication, push or deployment.

### Final formatting correction: candidate 0.1.31

The final format check rejected 0.1.30's provenance JSON formatting. Its archive
remains unchanged and is not the current candidate. Candidate 0.1.31 formats that
file only; parsed provenance, references, runtime, pins and licenses are identical
to 0.1.30. Fresh extracted-archive installation, worked examples and direct clean
0.1.29→0.1.31 upgrades are recorded separately in
`docs/research/content-search-audit-0131-installation-snapshot.json`.

Component: `d6edb5943f7ad676609204cd36940573c9b8529ab39905a24ff19bf253d14ec1`.
Release: `858479993c3bda268a764fb19757ec2c3b6d6af8929d9e95369294244d863be6`.
Archive: `11c727671cb11839ee2f35b4d5160910f124c9b759135b358b19c189f7f8f93e`.

No new native model acceptance is inferred from this formatting correction.

## Exact-candidate public pilot — 0.1.31

[Public-pilot-0131](../research/content-search-audit-trials/public-pilot-0131/README.md)
completed sequential native runs on Codex 0.166.0 and Claude Code 2.1.325.
Both preserve 97 original files, validate six output directories, collect the same
12 URL content hashes and report 0 fully audited / 12 pending with 312 check rows.
Codex has one local finding; Claude four, including two explicitly inferred
editorial proposals which are not proven freshness/contradiction failures.
Claude has 29 nested-shell RTK violations among 32 Bash calls; recovered errors
and full tool traces are retained. Nine Claude supplemental quotes revalidate.
The 683-file archive was rehashed against original bytes. The author's directory
scanner initially misidentified an input config as a campaign output; both the
original and corrected verification receipts are retained. No runtime/package
change was made, no accuracy denominator was invented, and no Task 9 compound
gate or human acceptance is closed by this bounded pilot. Current-version native
interrupted/resume and remaining fixture/semantic acceptance still need evidence.

## Current native interrupted recovery — 0.1.31

[Interrupted-process-0131](../research/content-search-audit-trials/interrupted-process-0131/README.md)
uses an actual SIGKILL at cursor 500, terminal exit -9, and identical stopped
artifacts on freshly installed Codex and Claude Code. Both recover all 1200 IDs,
1200 snapshots and 31200 check records; all remain unknown/1200 pending and
completionAllowed=false. Each preserves 595 original project files plus the
shared 1200 source files. Independent validators pass. The 5179-file archive
was rehashed against originals. All recorded tool inputs were inspected; no RTK
violation was observed in this scenario. Claude writes two fixed /tmp scratch
outputs, retained separately, and its remaining-work advice incorrectly groups
all 26 rules as semantic; the actual split is 24 semantic and two deterministic.
No skill/runtime change or independent acceptance is claimed. This supplies the
current-version native resume evidence; all-fixture and semantic/report gates
remain open. It is committed-checkpoint recovery, not arbitrary mid-write safety.

## Zubair specialist comparison follow-up

Read all five specialist agent files at the existing immutable pin (1580 lines),
rechecked the clean checkout and root MIT license hash, and recorded a
[file receipt](../research/content-search-audit-zubair-agent-review.json).
The [disposition](../research/content-search-audit-zubair-agent-disposition.md)
rejects checklist-as-visibility, unobserved ranking inference, style-based AI
authorship, universal content thresholds and stale schema feature instructions.
Official crawler, Google feature/format and MediaWiki documentation were checked.
No runtime or skill package changed. Nested skill bodies and transitive runtime
remain outside cleared reuse; broad Task 1 closure is still open.

## Bổ sung đối chiếu nested skills và runtime Zubair

Đã đọc đầy đủ bốn nested skills, fetcher và requirements (2.133 dòng),
khóa hash từng file ở revision đã review. Giữ quyết định reference-only:
collector mất navigation, dùng URL ban đầu để resolve link sau redirect,
robots parser không đủ grouping/precedence và sitemap không giữ queue còn lại.
Không chạy upstream hoặc cài dependency; transitive dependencies và các claim
nghiên cứu ngoài vẫn chưa đóng. Candidate 0.1.31 không đổi.
Chi tiết: [runtime disposition](../research/content-search-audit-zubair-runtime-disposition.md).

## Renderer-unavailable persistence follow-up on unchanged 0.1.31

Added an integrated public-run regression for a raw JS shell containing a hostile
instruction with no render adapter supplied. It preserves exact HTML, requests no
external script, retains one pending item and semantic unknowns, produces no
findings and rejects completion. See the collection-gates research note. This
strengthens helper accounting evidence without claiming native-model acceptance.

Verification: focused public-run suite 13/13; format, lint, typecheck and build
pass. The initial full suite, run alongside compiler/linter/formatter, had a
5-second timeout in the existing storage-partition campaign case (462 passed,
1 failed). A separate unchanged full-suite rerun passed all 463 tests in 62 files
in 15.08 seconds. No timeout was increased and no test was skipped. The initial
timeout remains recorded; resource contention is a plausible explanation, not
a proven root cause. Human-review integrity verifies 42 files and 294 archive
members. Candidate bytes and review manifest remain unchanged.

## RankXAI measurement and parser comparison

Read and hashed five additional files (1,354 lines): measurement and verification
references, GSC/log helpers and their CLI dependency. Static review identifies
missing-metric-to-zero coercion, recorded-date versus calendar-window ambiguity,
and loss of host identity when logs are aggregated by path. No upstream execution
or package inheritance was performed. The family remains reference-only.

Google's current Generative AI Search report was verified against official help.
Its impressions-only UI export is distinct from our supplied Search Analytics API
importer; missing clicks must never be synthesized to fit the API contract.
See [measurement disposition](../research/content-search-audit-rankxai-measurement-disposition.md)
and its immutable source receipt. Broad research and independent acceptance remain
open; candidate 0.1.31 stays frozen.

## Spec fixture coverage reconciliation

Mapped all 18 fixture classes from the spec to existing helper assertions and
host evidence in the [coverage matrix](../research/content-search-audit-fixture-coverage-matrix.md).
Read relevant gold records and exact inventory, report-escaping, redirect,
state-invalidation and discovery-resume assertions. Existing cases do not establish
a combined robots/canonical native interaction or malformed/valid schema control
pair. These are concrete next cohort gaps, alongside exact-0.1.31 offline execution
and the user's independent review. No Task 9 checkbox or human verdict changes.

Prepared `tests/fixtures/content-audit/technical-controls`: two offline synthetic
dossiers, three labeled material units, historical/valid-markup clean controls and
SHA-256-bound gold kept outside targets. JSON parsing confirms the malformed/valid
pair. Google robots/canonical primary guidance was rechecked. Native execution and
independent adjudication are pending; this does not close the identified gaps.

## Native technical controls on exact 0.1.31

Both fresh hosts completed the two-dossier cohort: three supported findings,
two declared/two pending/zero fully audited, 52 planned checks, zero missing.
Codex resolves 10 checks, Claude 11; all four run directories validate. Original
89 files per host remain unchanged; 12/16 quotes replay independently. All recorded
command/tool inputs and generated executable bodies were read. The 378-file raw
archive was rehashed. Claude still overstates crawl/canonical effects and gives an
overstrict no-matching-rule verification condition, so execution is not acceptance.
See [trial and review](../research/content-search-audit-trials/technical-controls-0131/README.md).
Candidate and user review packet remain unchanged; no release gate is closed.

## TheSmokeDev linked measurement workflows

Read complete fanout, index/access, YouTube and compare entrypoints at the same
immutable pin (720 lines, four hashes). The methods remain reference-only: exclude
invented score-to-business forecasts, blanket Shorts exclusion, generated-query
demand assumptions and access controls presented as observed engine inclusion.
IndexNow and Google site-operator primary documentation corroborate narrower
submission/index-evidence limits. See the
[disposition](../research/content-search-audit-smoke-linked-disposition.md).
No customer package or independent acceptance state changes.

## Aaron benchmark reference follow-up — candidate 0.1.31

Completed textual review of the 801-line benchmark and 34-line annotation at the
existing pinned revision. [Disposition](../research/content-search-audit-aaron-benchmark-disposition.md)
and [hash receipt](../research/content-search-audit-aaron-benchmark-review.json)
retain the reference-only decision, useful evidence boundaries, excluded generic
quotas, and unreviewed linked material. No package or archive changed. This does
not close full-repository research, native-host accuracy or independent acceptance.
The user will personally perform independent review; no verdict has been supplied.

## Current-state reconciliation after technical cohort

Reverified the technical-controls-0131 archive hash and every one of its 378
regular member hashes against the retained receipt. Updated the completion audit
and fixture matrix in place so they no longer prescribe already completed
robots/canonical and malformed/valid-schema executions. Preserved three Claude
advice defects as unresolved quality evidence, broader exact-version offline
regression as open, and independent human acceptance as unreceived. No frozen
review packet, host report, skill package or release archive was edited.

## Expanded 0.1.31 regression started

A fresh two-host execution now uses the exact frozen 0.1.31 archive and unchanged
expanded-0129 prompts/ten target dossiers. Initial verification established one
SKILL.md and 86 matching package files per host, with 97 initial project-file
hashes each. The gold hash is unchanged. See
[preflight and execution record](../research/content-search-audit-trials/expanded-0131/README.md).
No outcome is inferred from process startup; terminal results, artifact replay,
semantic adjudication and recorded tool review remain required for this cohort.

## Expanded 0.1.31 regression completed

Both processes are terminal and their artifacts were independently replayed.
Five findings per host cover all six author-labeled units, with 12 declared items,
zero audited, ten pending and two blocked. Codex resolves 27 checks (including one
N/A), Claude 21; 285/291 remain unknown. Quote replay passes 15/33 entries. All
97 original files per project are unchanged; no injection sentinel exists.
All recorded command/tool inputs and generated executable bodies were read.
Claude retains report/advice and RTK failures; these are not hidden by recall.
The 354-member archive was rehashed. See the
[full record](../research/content-search-audit-trials/expanded-0131/README.md).
This closes this exact-version cohort only. The separate support-methods replay
and independent acceptance remain open. Candidate bytes are unchanged.

## Support-methods regression on exact 0.1.31 completed

Both hosts completed native execution with unchanged historical prompts/targets,
fresh archive installations and six matched gold units each. Four dossiers remain
pending, zero audited; 17/13 checks resolve and 87/91 remain unknown. Independent
quote replay passes 9/27 spans. All 92 original files per project remain unchanged.
All recorded inputs and generated executable bodies were read; Claude has nine
of ten nonleading-RTK Bash inputs. AEO answer-evidence applicability for the
mixed FAQ/landing dossier remains disputed, not silently accepted. The 308-file
archive was rehashed. [Full evidence](../research/content-search-audit-trials/native-0131/README.md).
Both broader offline cohorts now have exact 0.1.31 execution evidence. Independent
semantic acceptance and remaining quality gates stay open; package bytes unchanged.

## Independent review supplement for exact 0.1.31

Prepared a separate six-report packet covering both hosts in support-methods,
expanded and technical-controls cohorts. Its manifest binds 74 files and the
verifier replays 1,040 archived members (308 + 354 + 378). A same-length report-byte
mutation in a disposable copy is rejected. The historical packet still verifies
its unchanged 42 files and 294 archive members. User review fields remain blank;
explicit scope questions and known defects are not pre-approved. See
[current-version packet](../research/content-search-audit-human-review-current-0131/README.md).
This preparation does not provide a human verdict or release acceptance.

## Current installed collection-boundary verification

Fresh 0.1.31 archive installs now replay 401/403/429/404 standalone, campaign and
recapture behavior, plus oversized response/private redirect/DNS timeout/hostile
shell without renderer, on Codex, Claude Code and combined surfaces. All retain
valid partial accounting and unchanged installed component digests; 726 archived
files match originals. [Evidence](../research/content-search-audit-trials/collection-boundaries-0131/README.md).
This is deterministic installed-helper evidence. The Task 4 compound item remains
open for native bypass/privacy and independent acceptance; no model trial, package
edit, new version or publication is implied.

## Native private-share workflow on 0.1.31

Both exact-version native hosts completed the new two-document synthetic redaction
workflow. One expected finding persists; both retain two pending items and valid
partial internal runs. Author scan finds no declared literal/project-path leak in
share files or final replies, all derivative hashes/local links validate, and 90
initial files per project are unchanged. Codex adds a summary outside the helper
manifest; it is separately hash-bound. All 348 raw archive members match originals.
[Evidence](../research/content-search-audit-trials/private-share-0131/README.md).
Complete recorded-trace/generated-report review remains pending; no independent
before-export internal-run baseline was captured. These explicit limits keep the
compound privacy/acceptance gate open. No real sensitive data or package edits.

## Private-share recorded trace review complete

Read all 18 Codex commands, 17 Claude tool inputs and seven generated executable
bodies; matched raw event/input hashes to the preserved archive. No recorded
instruction-triggered exposure, external fetch/publication or input mutation was
observed. Rehashed all 38 Claude host-baselined pre-export internal files without
mismatch; Codex has narrower source-snapshot checks. Replayed 4/6 internal quotes.
Claude retains 9/15 nonleading-RTK Bash calls. Two rule-level applicability
interpretations differ despite the common supported finding; independent semantic
acceptance remains open. [Supplement](../research/content-search-audit-trials/private-share-0131/trace-review-v2.json).
No archived report, initial adjudication, reviewer packet or package bytes changed.

## Vietnamese current-state synthesis refreshed

Replaced the stale opening status in the Vietnamese synthesis with a current
architecture/delivery table, exact-0.1.31 trial matrix and four remaining work
streams. Links resolve against repository files. The text distinguishes 463-test
historical full-suite evidence from later documentation/fixture changes, and
separates helper replay, native traces and independent acceptance. Historical
sections remain explicitly historical. This changes no package or frozen review
packet and grants no release acceptance.

## Current repository verification refreshed

On 2026-11-17, format, lint, typecheck, all 62 test files / 463 tests, build and
diff checks passed. Candidate archive SHA-256 still matches the frozen 0.1.31
receipt; the current independent-review packet verifies 74 files and 1,040 archive
members. [Receipt](../research/content-search-audit-0131-current-verification.json)
binds local check logs by hash. No package or frozen packet changed, and no
independent semantic verdict or release acceptance is inferred.

## Exact-version native extraction execution

Both 0.1.31 native hosts completed the original three local extraction fixtures
without continuation. All 182 initial files are unchanged; all nine persisted
runs validate; three/eight submitted quote spans replay. Codex lacks a ready DOM
but recovers both PDFs, while Claude captures the DOM and retains the image-only
PDF unsupported. Codex narrative has an incorrect boolean readiness comparison.
Full tool/generated-body trace review and independent acceptance remain open.
[292-file archive and scope](../research/content-search-audit-trials/native-extraction-0131/README.md).
No package or frozen independent-review packet changed.

## Extraction trace review completed

Read all 19 Codex command inputs, 24 Claude tool inputs and ten generated executable
bodies; all recorded calls have terminal results and all 292 archived files rehash.
No forbidden operation observed within the recorded scope. Codex redirects method
bodies to /dev/null and no other command output demonstrates loading them; retain
this workflow defect separately from its incorrect readiness comparison. Claude's
15 Bash inputs all start with RTK. Original archive/adjudication and frozen reviewer
packet remain unchanged. [Trace supplement](../research/content-search-audit-trials/native-extraction-0131/trace-review-v2.json).
