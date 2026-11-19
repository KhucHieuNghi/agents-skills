# Full enterprise report assembly implementation plan

> **For agentic workers:** Use superpowers:executing-plans task by task. Independent source review remains required before each implementation closure.

**Goal:** Build one complete enterprise report from validated final-run evidence across the selected modules, with actionable missing-data requests, historical/current separation and current research disclosure rights.

**Architecture:** Module owners replay their own original inputs and emit bounded projections. A final-run assembler accounts for every selected module, owned check/request, evidence object and historical finding before rendering canonical JSON/Markdown/HTML. Dispatch follows module-owned parent/derived graphs: measurement and performance rows can inherit their parent artifactType, so artifactType alone is not an evaluation identity. Acquisition, assessment, report generation and external action remain separate authorities.

**Tech stack:** Existing Node ES modules, enterprise state/report validators, Vitest and existing offline browser harnesses. Only Codex and Claude Code are supported hosts.

**Spec:** [Enterprise specification](../specs/website-audit-enterprise.md), [parent implementation plan](website-audit-enterprise.md), [journey plan](website-audit-enterprise-journeys.md).

## Current source findings and implementation order

| Owner                      | Current authoritative evidence                                                                                                                          | Required integration                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey                    | `scripts/enterprise-journeys/report.mjs` replays all three stored namespaces; active evidence must match the final assessment clock                     | Extend into full assembly without allowing caller omissions; retain existing original-byte/fingerprint checks                                                    |
| Tracking/consent           | `enterprise-runtime-workflow.mjs` content stores kind/context/contract/result/fingerprint but omits original `entry.sources`                            | Version original-source retention and replay before report projection; legacy cached results cannot become freshly verified                                      |
| Provider/config/business   | `measurement-config.mjs` stores normalized payload plus source digest; `businessSnapshot` in provider workflow stores normalized result                 | Retain original supplied input and normalization context in a versioned private envelope; distinguish canonical import payload from original native export bytes |
| Measurement interpretation | `measurement-assessment/workflow.mjs` exposes `inspectEnterpriseMeasurement(run)` with replay validation                                                | Add complete projection over validated current/history checks and requests; inspection alone is not report rendering                                             |
| Performance                | `enterprise-performance-workflow.mjs` retains entry/sources and privately rebuilds its index; `mergePerformanceObservations` merges projections         | Expose validated projection without restoring execution authority from saved receipt digests; field/lab populations remain separate                              |
| Accessibility              | Private `validateIndex` rebuilds base/check evidence and requests from original source; workflow emits record-count observations and candidate findings | Extract reusable projection, verify supported fingerprint and all historical ownership; keep scoped automated/manual limits                                      |
| Technical SEO              | Private `validateIndex` replays canonical, URL Inspection, index control, hreflang, declared-target and structured-data evidence                        | Preserve original kind-specific rules, target/source bindings, unknown states, candidate findings and retained history                                           |
| Browser                    | `enterprise-browser-workflow.mjs` retains original `entry.source` and importer digest                                                                   | Replay normalization and coverage requests; a capture remains acquisition evidence, not module assessment                                                        |
| Qualitative research       | `buildStoredResearchDraft` reads encrypted control-store revision, applies registered source/candidate/review bindings and rechecks revision            | Require current control-store access at report generation; do not replay old authorized text from immutable run history after withdrawal                         |

Paths without prefixes in the table are under `skills/content-search-audit/scripts/lib/`; research code is under `scripts/enterprise-journeys/`. This inventory was checked against live source. It is not proof these modules are commercially complete.

## Global constraints

- JSON is authoritative; Markdown and HTML must derive deterministically from the same revision.
- Report construction never authorizes provider writes, website changes, transactions or disclosure.
- A hash proves a binding, not provider authenticity, independent review or live execution.
- Never reconstruct missing original bytes from a normalized result and label them original.
- Old evidence remains immutable; schema upgrades require explicit new revisions and retained provenance.
- Unknown/missing/expired/declined are distinct. No missing value defaults to zero or pass.
- Package edits require digest/lock refresh, archive extraction and fresh installation on both supported hosts before a candidate is considered verified.

## Review focus

1. A legacy normalized-only record is supplied without its original payload: retain historical limitations and request reacquisition; do not silently bless a recomputed cache.
2. Another workflow advances the assessment clock: each module must reassess or report unknown with a precise request; no cached current result is reused.
3. A caller deletes an ownership index or supplies only favorable projections: full accounting rejects the omission.
4. Research permission is withdrawn after review: old customer text cannot reappear through report history or cached HTML; retain non-disclosing decision provenance.
5. Saved performance receipts or source-authored verdicts claim authority: restored bytes retain attributed status, never trusted live-session capability.

## Task 1 — original-source retention and replay for runtime

**Files:** Modify `skills/content-search-audit/scripts/lib/enterprise-runtime-workflow.mjs`; add a focused replay module beside it if needed; extend `tests/content-audit-runtime-workflow.test.ts` and source privacy/report tests.

**Interfaces:** Version private runtime evidence content; retain complete original source envelopes, context, contract, evaluation time and evaluator fingerprint. Add `inspectEnterpriseRuntime(run)` returning replay-validated current/history descriptors and explicit legacy limitations, without customer payload text or approval authority.

- [ ] Write failing tests for original-byte preservation, forged cached results, source/hash changes, omitted index/request ownership and changed clock.
- [ ] Implement versioned retention and replay. Validate raw bytes with existing tracking/consent parsers; compare derived checks/requests/evidence and policy bindings rather than cached verdicts. Replace reliance on index-supplied deletion IDs and cached findings with derived ownership; a forged index must not delete another module's checks or requests.
- [ ] Define explicit legacy disposition: no original sources means unavailable replay, not an inferred pass or fabricated migration. Generate precise source requests when producing a new assessment revision.
- [ ] Test independently supplied historical originals against their original bindings; reject mismatches, foreign customer, incompatible context and fingerprint without rewriting old evidence.
- [ ] Independently review and run focused tests; prepare package candidate update with required full verification and both-host archive installs.

## Task 2 — provider source envelopes

**Files:** `measurement-config.mjs`, `enterprise-provider-workflow.mjs`, provider/config/business tests.

**Interfaces:** New private source envelope retains the exact supplied import representation, normalization context and fingerprint. For native-byte inputs retain original text/hash; object-only APIs declare canonical imported-object representation explicitly. Never imply a native provider export was retained when only an object was received.

- [ ] Add tests that distinguish native bytes, canonical import objects and legacy normalized-only evidence.
- [ ] Implement replay from the retained input using the owning normalizer; verify resource/property/container/window/scope and business dictionary bindings.
- [ ] Retain pagination/thresholding/sampling/completeness/latency limitations and requests. Reimporting data does not mean account authentication or live acquisition.
- [ ] Test clock advance, conflicting sources, refusal, foreign tenant and tampered normalized cache. Obtain independent review and required package verification.

## Task 3 — pure projections for remaining evaluators

**Files:** Measurement, performance, accessibility, technical SEO and browser workflow owners listed above; corresponding workflow tests.

**Interfaces:** Each owner exposes `projectStored<Module>(run)` returning findings, observations, narrative and accounting descriptors after validation. Unsupported input versions return explicit disposition or reject; no arbitrary generic evaluator accepts source-authored result objects.

- [ ] Add equality tests comparing fresh workflow output with projection from stored evidence; pin fresh/current/historical and unknown cases.
- [ ] Extract shared private projection functions rather than duplicate rule logic. Validate all retained ownership indices and prior evidence, not just the active subset.
- [ ] Reject missing indices/rows/requests, unsupported fingerprints and injected customer text. Preserve historical findings and review bindings; new candidate findings remain unreviewed.
- [ ] Verify saved performance evidence does not reacquire a collector capability. Keep receipt-scoped historical observations distinct from current supplied-input interpretation.
- [ ] Independently review source, run module tests and refresh package candidate before relying on installed behavior.

## Task 4 — research-aware assembly

**Files:** `scripts/enterprise-journeys/research-stored-report.mjs`, research projection/control-store modules, new assembly integration tests.

**Interfaces:** A supplied research context binds expected control-store revision and customer/run scope. Assembly consumes only the current authorized customer draft and a non-disclosing provenance receipt; private research records/keys remain outside report payloads.

- [ ] Add withdrawal, expiry, regrant, stale revision and concurrent-revision-change tests across report generation.
- [ ] Recheck authorized storage state before output publication. Specify bounded optimistic consistency and caller responsibility for later delivery; do not claim locking.
- [ ] Preserve audit history without re-emitting withdrawn text. If the report revision retention contract cannot represent disclosure removal, implement a versioned redaction/supersession contract with explicit reviewer acceptance before integration.
- [ ] Independently review privacy and report-history semantics; test generated JSON/Markdown/HTML, not only in-memory decisions.

## Task 5 — full final-run assembler and reassessment orchestration

**Files:** New `scripts/enterprise-report-assembly.mjs`, shared assembly tests and browser harness; later packaged CLI and entrypoint documentation.

**Interfaces:** `buildStoredEnterpriseReport(sourceDirectory, metadata, outputDirectory, accessContext)` accepts presentation metadata and required access bindings, never caller-selected module projections. Module registry owns supported evidence kinds and accounting requirements. Explicit reassessment is a separate immutable workflow; rendering cannot silently advance time.

- [ ] Fail tests for every missing selected module, orphan/unknown evidence, deleted index, duplicated namespace and missing projection; each source must have exactly one owner or an explicit unsupported disposition.
- [ ] Implement all-module accounting and deterministic aggregation. A module with no evidence remains visible with its precise requests and fallback; an unsupported format cannot disappear from the report.
- [ ] Reconcile dependencies and preserved refusals across both workflow orders, multiple entities, mixed business profiles and clock changes.
- [ ] Preserve findings/actions/review decisions through verified report-parent revisions; never reset them to empty arrays merely to make assembly pass.
- [ ] Offline browser checks at mobile/desktop, public/customer editions, real pilot volume, adversarial labels and non-disclosing research withdrawal. Verify canonical parity, all expected sections and missing-data requests.

## Task 6 — commercial integration acceptance

- [ ] Rebuild versioned archive, extract and install in fresh Codex and Claude Code projects; exercise acquisition-to-report and negative workflows from the installed package.
- [ ] Re-run authorized pilots with available account data, preserve unsupported sources and request missing originals/access rather than claiming full coverage.
- [ ] Complete P7 isolated native trials, matched baselines, independent holdouts, profile/mixed coverage, cost/failure reporting and owner final risk review; preserve existing thresholds from the parent plan.
- [ ] Complete remaining P3 acquisition, P4 runtime matrix and P6 remediation/recovery requirements. This assembly plan does not reduce their scope.
- [ ] Only after those gates pass, update commercial claims/catalog and perform the authorized release/deployment workflow.

## Status

All tasks above are open. Journey-only automatic assembly is already implemented separately; its tests are not evidence that these remaining tasks are finished. The immediate next implementation is Task 1 because a generic projector cannot repair missing original runtime sources.

## Independent architecture review

The independent reviewer traced runtime, provider, measurement and performance source without edits or test execution. It confirmed the original-source retention gaps, the measurement replay boundary and performance live-session authority limitation. It additionally identified runtime index-supplied deletion IDs/cached findings and parent/derived evidence sharing artifact types; these are now explicit requirements above. Its suggested implementation order began with the measurement/performance projectors. This plan prioritizes runtime source retention first because it blocks complete replay and also needs ownership hardening; independent projector work remains separable. Neither order changes the final acceptance scope.

Runtime retention checkpoint: [candidate 0.3.25 evidence](../research/enterprise-runtime-replay-0325/README.md) implements source schema v2, replay inspection, derived ownership and pre-save validation. Legacy records reject explicitly and require a separate clean assessment; automatic reacquisition/migration and final-clock report projection remain open. Candidate archive installation checks are separate from native/commercial acceptance.

Runtime projection checkpoint: [journey/runtime assembly](../research/enterprise-runtime-assembly.md) now uses original-source inspection, exact final-clock gating and actual current failed checks before projecting runtime candidate findings. Mixed task/runtime canonical output and offline browser checks are covered; other module adapters and report-parent/research disclosure semantics remain open.

Provider retention checkpoint: [candidate 0.3.26 evidence](../research/enterprise-provider-replay-0326/README.md) implements workflow-owned original import-object retention and normalization replay, exact target/check/request ownership, private descriptors and explicit legacy rejection. Native-byte provenance is claimed only for preserved native-text fields, not object-only inputs. Snapshot selection, final-clock projection, migration and commercial acceptance remain open.

Provider inventory checkpoint: [development projection](../research/enterprise-provider-projection/README.md) adds replay-validated alias accounting, lifecycle-aware candidate states, unresolved competing inputs and canonical missing-data requests to the general assembler. Numerical metric projection, semantic eligibility/source resolution and assessment acceptance remain open.

Measurement projection checkpoint: [candidate 0.3.27](../research/enterprise-measurement-projection-0327/README.md) closes orphan measurement inventory projection and retains ordinary reassessment history, exposing verified bases to the development report assembler. Final-clock/current-fail gates and private fixed projections are covered. Disposition/revocation, numeric reporting, remaining module adapters and commercial acceptance remain open.

Performance replay checkpoint: [candidate 0.3.28](../research/enterprise-performance-replay-0328/README.md) separates live collector results from replay-only persisted output and closes three reproduced active-state tampering cases. Complete historical ownership, pure compiler extraction, exact request descriptors and the general performance projector remain open; source records predating the replay contract require separate assessment or reviewed migration.

Performance inventory/assembly checkpoint: [candidate 0.3.29](../research/enterprise-performance-history-0329/README.md) adds a shared persisted compiler, full current/history artifact ownership, activation chronology and exact request descriptors. The development general assembler now projects inspected field/lab observations with final-clock gates and actual current CrUX findings. Remaining module/research/parent/native/commercial tasks above stay open.
