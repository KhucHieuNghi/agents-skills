# Performance canonical workflow review

Date: 2026-11-19. Status: developmental integration, not packaged or commercially accepted.

Implementation: [workflow](../../scripts/enterprise-performance/workflow.mjs); [integration tests](../../tests/content-audit-performance-workflow.test.ts); [usage/boundaries](../../scripts/enterprise-performance/README.md). The existing enterprise report model and renderer remain unchanged.

## Behavior verified

The workflow imports exact CrUX/Lighthouse bytes into immutable source-run revisions, preserving module/intake scope. Field metric checks and draft findings remain distinct from lab evidence-completeness checks and observations. Unknown/stale/unsupported states produce scoped requests. Failed aggregate field checks bind decisive current failures, preventing unrelated stale inputs from hiding a confirmed metric failure.

Every observation has its own evidence/expiry binding. Canonical JSON, Markdown and HTML round-trip through the existing report validator. Parent observations are retained; expired or superseded snapshots become historical without changing their content. Current independent verdicts must meet the new assessment timestamp; old timestamps are never rewritten. Declined requests remain declined.

Expiry now consistently uses an exclusive validUntil boundary across both evaluators and P2. Earlier developmental foundation notes described inclusive expiry; this integration supersedes that policy and adds exact-boundary regressions rather than changing P2 validation. Existing candidate skill bytes are unchanged.

## Independent integrity review

Reviewer `/root/performance_contract_review` separately inspected code, executed regression tests and ran targeted mutation probes. A P1 cache-trust issue required two iterations:

1. An unchecked persisted performanceEvaluations index could name unrelated intake checks/requests for deletion. The importer now validates all indexes against original evidence, entry scope and exact owned check/request bindings, reconstructs deletion IDs and rejects dangling, duplicate, foreign, missing or untouched invalid indexes before creating output.
2. Ownership validation alone still allowed a rehashed derived field row to say pass while original LCP remained 5000. The importer now compares the full recomputed field row, source bindings, expiry and non-unknown core verdict. All retained performance evaluations are rebuilt from raw sources at the new assessment, not carried forward from cache. Untouched lab evaluations cannot inherit prior receipt authority.

The reviewer reran both original probes and confirmed rejection/no output, and verified **15 workflow tests** at final closure. One additional byte-budget case was subsequently added. A separate lab boundary case directly checks exclusive expiry in its normalizer. Hash consistency does not authenticate the original provider; no customer-quality percentage is inferred from these tests.

## Native artifact and HTML evidence

The three actual Lighthouse 13.6.0 local-fixture artifacts from the previous browser trial were imported without restoring stored receipts as execution authority. `build/enterprise-performance-report-001/` contains the first canonical run/report: 24 observations, zero findings, lab completeness unknown. `build/enterprise-performance-report-002/` contains the immutable revision produced by the corrected workflow: 48 observations, including the 24 preserved historical snapshots, zero findings, lab completeness still unknown. Both retain the source-run lineage and native raw hashes privately.

Each report passed canonical JSON/Markdown/HTML loading and desktop 1280px/mobile 390px checks: no document overflow, page errors or external requests. Verification JSON and full-page screenshots are retained in each directory. This is automated rendering evidence, not manual accessibility conformance, user research or a public-site performance audit. Independent code review did not claim to review the visual artifacts.

## Remaining gates

Move the tested development modules into the skill, add customer-facing CLI/instructions/examples, refresh provenance/component locks, freeze a new candidate and install extracted archives for both supported hosts. Real public performance pilots, additional adapters, accessibility/UX/SEO runtime scope, authorized optimization/retest and P7 commercial evaluation remain required. No production deployment or catalog claim changes are included here.

## Final repository verification

Focused performance suites: **83 tests passed** (34 field, 33 lab, 16 workflow). Full repository regression: **91 files / 794 tests passed**, one worker, unchanged timeouts (48.26 seconds). Format, lint, typecheck, build and diff checks passed. Changes remain outside the bundled skill; package digests and previously frozen archives are unchanged.
