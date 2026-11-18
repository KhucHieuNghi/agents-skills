# P4 runtime observation foundation — interim

Status: working source after candidate 0.3.4, not a packaged runtime capability or P4 acceptance. The prior goal turn delivered independently reviewed provider candidate 0.3.4 with 616 passing tests and both-host installed workflows. This turn starts the next phase under [the runtime contract](../plans/website-audit-enterprise-runtime.md).

## Implemented boundary

tracking-observations.mjs normalizes supplied trace artifacts and checks their hash, customer/entity/environment/journey/scenario/window, capture freshness, source-kind/stage compatibility and stage-specific statuses. It preserves missing stages and null correlation as gaps. HTTP response status never creates provider/business observations. Repeated event keys remain ambiguity, not inferred duplicate conversions. Manual assertions keep supplied observer/method or a missing-attribution request. No browser execution, permission grant, evaluation verdict or live provider authentication is performed.

The tracking-observation schema describes normalized private evidence; runtime scope/hash/time checks remain mandatory. Source locator, observer and identifiers still require disclosure review. A schema-valid bundle is not authenticated, correct or complete evidence. usableForCurrentAssessment currently expresses freshness eligibility only; gaps and source limitations remain binding.

## Independent review

Initial verdict: changes requested. Review found accepted sourceKind arrays via object-key coercion, extra context.window fields leaking into normalized output, contradictory capture bounds and missing responsible observer attribution. Three regression tests failed before fixes. Fixes require string source kind, strict window projection contract, overlapping stage capture bounds and records within their declared capture bounds, and optional preserved actor/method with a precise missing-manual-attribution gap.

Focused tests also exercise tampered hashes, foreign scope, future/out-of-window captures, stale/manual evidence, prohibited payload fields, duplicate observation IDs, illegal stage statuses, repeated event keys and missing correlation. Schema tests reject false providerAuthenticated and invalid stage/status combinations. Independent re-review confirmed all three reported findings closed, with 11 focused tests passed and both manual provenance variants schema-valid. A subsequent positive provider/business/partial-capture test brings the local trace suite to 12 tests; the combined trace/business/report run passes 44 tests across three suites. This is normalizer-level evidence only.

## Remaining P4 work

Tracking payload/order/dedup semantics, shared report module result/revision integration, browser scenario fixtures/authorized runner, outcome reconciliation and live scenario coverage remain unimplemented. The declared stage and supplied-consent comparators described below do not establish these capabilities. P3 live-provider and URL Inspection importer gaps also remain open.

Package provenance/manifest still describe immutable 0.3.4; these P4 working files will require a new reviewed candidate before distribution. Do not silently alter the 0.3.4 archive or count these files as shipped.

## Verification follow-up

The first full working-tree run returned 619 passing and nine failing tests. Eight failures concern the unchanged 0.3.4 package locks versus new P4 source. The ninth was a documentation scanner false positive: the standard `jsonPointer` identifier contains a prohibited brand substring. The scanner now removes only that exact identifier before the brand-substring check; private URL and credential checks still inspect the original content. Regression coverage verifies prohibited values and embedded brand values remain rejected. Immutable pilot evidence was not modified. This does not close the eight packaging failures or establish a releasable P4 candidate.

Connected QuokkaGuide GSC data is now available as private pilot supplemental evidence. That read does not establish native URL Inspection importer support or close the remaining P3/P4 integration gates.

## Declared tracking stage evaluator

Added `tracking-evaluation.mjs`: re-normalizes original source envelopes, validates an owner-attributed scope-bound contract, and evaluates per-correlation stage counts/statuses. A response rule must declare accepted HTTP statuses; 204 never creates a provider/business receipt. Unknown is retained for missing/partial/manual/stale sources, unmapped correlation, overlapping sources, ambiguous repeated event keys, insufficient declared sample and provider latency. A refund is distinct from settlement unless explicitly forbidden by the owner's contract. Excess distinct event identities violate the declared count rule; this is not a claim of duplicate real conversions.

The evaluator's `pass` applies only to declared stage rules. Payload validation, cross-clock ordering, dedup implementation, consent and causal attribution remain explicitly unassessed. No CLI/report adapter or release acceptance is implied. Stage contracts and completeness remain supplied assertions requiring independent review.

Self-review reproduced an early-provider-capture false pass: later assessment alone did not make an earlier export complete. A red regression now requires provider capture at or after the declared latency boundary. Independent review reproduced a verdict-binding gap: changing envelope capture time could change freshness without changing artifact hashes. A second red regression now binds the complete input envelope digest in source bindings and each check evidence reference, preserving the original artifact hash and exposing capture/source-kind metadata. Raw source envelopes must be retained privately for replay.

Independent review also reproduced a false pass when one stage event key appeared under multiple declared correlations. The initial per-correlation duplicate check missed it. Red/green regressions now check identity uniqueness across the entire stage, including conflicting event names, before accepting counts. Independent closure verified 26/26 normalizer/evaluator tests and an additional conflicting-event-name probe, with no remaining material issue found in this subset. The review explicitly excludes payload/order/consent/dedup implementation, provider authentication, browser/CLI/report integration and full pilot coverage.

Latest verification after evaluator fixes: format, lint, typecheck, build and diff checks pass. Full suite: **635 passing / 8 failing across 82 files (643 tests)**; the remaining eight failures are composition/package checks in the two package/verifier suites because new P4 source has not been versioned into a new candidate. Log: `build/enterprise-p4-evaluation-tests.log`. This is a known development packaging blocker, not a green release. The prior immutable 0.3.4 archive is unchanged. Consent/module-result integration and a new reviewed candidate are next; do not publish working source under 0.3.4.

## Supplied consent policy comparator

`consent-scenarios.mjs` now compares complete scoped ordered traces with an owner-attributed technical policy. Policy includes customer/entity/environment, categories with explicit denied request/storage/cookie/identifier permissions, and scenario region/surface/mode/window/expected full-state transitions. Categories are not assumed to have identical storage semantics. Source bytes and complete envelopes are hashed; source kind, capture freshness, unique sequence/identity, timestamp order, scope and declared capture bounds are checked. Imports cannot supply authorization.

Required scenario kinds are fresh, reject, accept, selective, revoke, persisted, region-variant and SPA. Missing kinds produce requests and prevent overall pass. Labels alone do not satisfy reject/accept/selective/revoke/navigation transitions. A complete matrix test is a synthetic declared-policy comparison, not proof that a browser actually exercised these flows. Persisted/navigation states remain supplied source assertions; cross-context behavior must be verified by the forthcoming browser runner. The matrix does not prove all business regions, cookies, journeys or server paths are covered.

Basic mode prohibits requests/fired tags before a consent choice, even when a configured default says granted. A blocked tag before defaults does not create a false ordering failure. Advanced mode follows explicit per-category denied rules; null required request inspection remains unknown. State records describe effective consent (including CMP defaults), not exclusively gtag commands; a blocked basic tag is not required to emit a Google default request before interaction. Deletion of stored data is not treated as prohibited reading/writing. No legal compliance conclusion is produced.

Independent reviewer reproduced basic-before-choice false pass and blocked-tag-before-default false failure; regression tests were observed red before fixes. Review also required meaningful accept/reject states and explicit category permissions. Independent closure passed 40 tests (14 consent + 26 tracking), with no remaining material issue in this comparator. Two subsequent positive tests cover named ad_personalization policy and the eight-kind synthetic matrix; local combined run passes 42 tests. Browser integration, policy correctness, payload classification authenticity and enterprise acceptance remain outside these results.

Method checked against [Google consent mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode) on 2026-11-18: basic/advanced behavior and distinct consent categories. This is a technical implementation reference, not a legal assessment.

Consent follow-up full suite: **651 passing / 8 failing, 659 tests in 83 files** (`build/enterprise-p4-consent-tests.log`). The eight remaining failures are the same unrefreshed composition/package gates; no release has been rebuilt from this working source. Lint, typecheck, build and diff checks pass. Packaging remains an explicit blocker to distributing these additions.

## CLI/report integration and versioned follow-up

`enterprise-runtime-evaluate` now recomputes tracking/consent results from raw envelopes into a new bound enterprise revision. It adds scoped checks, candidate findings, explicit unknown capabilities and precise data requests; it never consumes supplied verdicts. Derived evidence binds comparator code, contract, context and source envelopes. Report projections omit raw input/source locator details. Superseded assessments are archived and unchanged same-time evaluations reuse immutable evidence.

Independent workflow review reproduced global freshness poisoning (stale unrelated scenario hid a fresh failure) and duplicate immutable evidence IDs. Both were observed red and fixed with per-check source expiry and evidence reuse. Re-review passed 14 runtime/provider tests, verified declined unresolved requests remain declined and retired requests remain recoverable in immutable parents, and found no remaining material issue in this scope. Eight runtime workflow tests include tracking, consent, scope/tampering rejection, replacement history and source CLI JSON/Markdown/HTML projection.

The historical packaging failures above are resolved by a new immutable [0.3.5 candidate](website-audit-enterprise-runtime-035-review.md), not by overwriting 0.3.4. Source full suite passed 667/667 tests. P4 payload/ordering/dedup and browser execution, remaining providers/P5/P6/P7 still remain open.
