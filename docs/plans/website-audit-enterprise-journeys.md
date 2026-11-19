# Enterprise UX/CRO and journey evidence contract

Status: design and implementation in progress; no UX/CRO commercial acceptance. This completes the missing detailed P5 interface rather than replacing the parent enterprise goal. The five business profiles and mixed profiles remain required.

## Evidence boundaries and reuse

Existing tracking evaluators cover event stages/payload/order/dedup. Business observations distinguish accepted/rejected/settled/refunded outcomes. Accessibility scenarios already contain attributed error-recovery and journey-outcome predicates. Reuse these observations by explicit IDs and scopes; do not relabel their assessment as complete UX/CRO coverage. A legitimate business rejection is not automatically a UX defect. A purchase event is not payment settlement; a thank-you page is not CRM acceptance.

UX/CRO needs four separate outputs: observed task behavior, user-research evidence, descriptive funnel measurements, and experiment interpretation. Recommendations derived from heuristics remain hypotheses with a test plan. Neither a high conversion rate nor a complete funnel export creates a site-wide UX pass. No automatic revenue/uplift claim from before/after data.

Primary sources checked 2026-11-19:

- [GA4 funnel API](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1alpha/properties/runFunnelReport): funnel definitions include entry behavior, steps and scoped breakdown/segment choices. Preserve these definitions; do not derive open-funnel progression by subtracting unrelated step totals.
- [Google funnel report guide](https://support.google.com/analytics/answer/13012015): open funnels allow entry at later steps; closed funnels require entry at the first step. The product must distinguish new entrants from continuing participants.
- [Microsoft experiment data-quality guidance](https://www.microsoft.com/en-us/research/articles/data-quality-fundamental-building-blocks-for-trustworthy-a-b-testing-analysis/): allocation mismatch and asymmetric missingness can invalidate experimental interpretation. Do not treat arithmetic significance or a supplied verdict as design validation.

## Implementation sequence

1. Supplied aggregate funnel foundation in `scripts/enterprise-journeys/funnel.mjs`, with strict bounded parsing, source bytes, scope/definition/population/freshness and every declared transition accounted for. This is a development adapter, not a native GA4 importer or a shipped skill capability until packaged integration is complete.
2. Journey observation contract: scenario/step/device/market/language, declared valid/invalid task conditions, actor, source artifact locators and original evidence bytes. Reuse tracking/business/a11y predicates where relevant. Distinguish visible UX response from terminal business outcome and source lag. Missing/contradictory/untested stages produce scoped requests. No automatic navigation or form action is granted by an imported declaration.
3. User-research adapter: method, recruitment/population, sample and task, moderator prompts, attribution, consent/access scope, observed friction vs participant statement vs analyst inference. Repeated statements by one participant do not become independent observations. No prevalence claim from convenience samples.
4. Experiment evidence and qualified interpretation: preregistered hypothesis/metrics/decision rule, assignment unit and allocation, exposures/joins, exclusions, windows, missingness/SRM, uncertainty, multiplicity/stopping policy, guardrails and business significance. Keep diagnostic gate failures and interpretation separate. Invalid/insufficient designs block causal claims; observational comparisons stay descriptive. Implement supported statistical methods only with their own validated contracts/tests; no generic p-value badge.
5. Immutable UX/CRO workflow into existing enterprise run/report: evaluation IDs bind kind/entity/journey/population/window/definition, source/rule fingerprints and history. Preserve other modules, intake placeholders and declined requests. Generate precise customer requests and hypotheses with owner, scope, effort uncertainty and acceptance/retest. JSON authoritative, Markdown/V2 HTML parity; no raw participant data in customer projections.
6. Authorized controlled browser fixtures, all five profile/mixed fixtures, real-site pilot observations and both-host installed/native evaluations. Transactions require applicable trusted authorization and test identities. P6 owns production changes/retest. Do not erase original failures or call synthetic success a real business result.

## Aggregate funnel V1 interface

`evaluateFunnel(context, sources)` is offline and returns moduleId `ux-cro`, namespace `descriptive-funnel`, source accounting, one result for every declared transition, and precise missing-data requests. No filesystem/network/mutation execution. Never returns a UX-quality pass or causal acceptance.

Context has exact fields: customerId, entityId, environment, journeyId, definitionDigest, definition, ingestionLagSeconds, funnelKind (`open`/`closed`), population `{unit, device, market, segmentId, cohortId}`, window `{from,to}` (half-open UTC timestamps), assessmentAt, maxAgeSeconds and transitions `[{transitionId, fromStepId, toStepId}]`. Units are users, sessions or attempts. Transitions are explicit directed pairs, not inferred from array position; distinct retry steps can be represented. Reject self-links, duplicate IDs/pairs, invalid calendar dates and empty scope. Population/definition equality is an attributed contract, not proof that an upstream query implemented it correctly.

Each source envelope has exact sourceId, sourceKind `funnel-aggregate-v1`, capturedAt, artifactText and SHA-256 artifactHash. Raw JSON has schemaVersion 1, scope, definitionDigest, funnelKind, population, window, dataCompleteThrough, synthetic flag, provenance `{actor, locator, method, sourceSystem, queryDigest}`, quality `{complete, sampled, thresholded, modeled, precision}`, and transitions `[{transitionId, eligibleCount, continuedCount, samePopulation}]`. Quality flags and samePopulation may be null. Counts may be null, otherwise nonnegative safe integers bounded at 10^12. Precision is exact/approximate/unknown; method is export/manual. Imported provenance remains unauthenticated.

Strict parser limits: at most 20 sources, each at most 2 MiB UTF-8 and total 16 MiB; at most 100 declared transitions; strict duplicate JSON keys rejected; finite JSON, maximum depth 32 and maximum 10,000 nodes (the existing strict capture parser); reject lone surrogates, unknown fields, extra undeclared transitions, mixed synthetic/real cohorts, malformed hashes and contradictory ownership. Fail without producing an output on invalid source input. Source IDs must be unique; duplicate artifacts never count as independent samples.

Only fresh, fully captured-window, complete, unsampled, unthresholded, unmodeled, exact export observations with samePopulation=true and both counts present are eligible for ratios. Freshness derives from the end of the measurement window, not download time; expiry is exclusive. Manual/partial/stale counts remain attributed source observations with explicit eligibility reasons. No source is silently discarded.

For each transition, eligibleCount is the declared eligible cohort and continuedCount is its declared subset. Require continuedCount <= eligibleCount when both exist. Retention is continued/eligible and observed non-continuation is (eligible-continued)/eligible, retaining integer numerator/denominator. Zero denominator yields null rates, not zero/100%. Do not chain transition rates into an end-to-end conversion rate or impose cross-transition monotonicity: open funnels and differing cohorts can legitimately differ. Subset attribution requires review; valid arithmetic does not prove it.

Multiple eligible sources with identical counts form aliases for one descriptive observation. Conflicting eligible counts yield unknown with all conflicting evidence, regardless of order. Ineligible historical/manual artifacts are retained with their reasons but do not override fresh eligible evidence. Every declared transition stays present, even when all sources are missing. No arbitrary conversion benchmark is introduced.

Requests identify journey/transition, definition digest, population/window, owner role, accepted export shape, read-only access and fallback. Ask for the actual eligibility/continuation definition and query/export metadata; do not ask for secrets. If counts are truly zero, retain the denominator and request a meaningful agreed observation window only when a rate is needed. No mutation occurs merely to fill a gap.

## Required evaluation matrix

- Clean lead, commerce, booking, subscription and publishing funnels, plus mixed profile; identical counts do not imply identical business outcomes.
- Open funnel with more later-step entries: no invented negative abandonment, no cross-transition monotonicity rule.
- Empty eligible cohort, missing counts, mixed units/cohort/segment/device/window, changed definition and unregistered transition.
- Approximate/sampled/thresholded/modeled/manual exports; missing quality flags; incomplete window, stale re-download and exact expiry boundary.
- Reordered conflicting sources, identical duplicates, unique source IDs vs reserialized duplicate content; retain original denominator accounting.
- Unsafe counts, null vs zero, bool/string coercion, duplicate keys, invalid dates/UTF-8/surrogates, deep/oversized artifacts, foreign customer, malicious strings and untrusted grant/command fields.
- UI success with backend rejection/pending, legitimate rejection with correct feedback, recovery after invalid input and valid retry, unavailable stock/slot and cross-domain handoff.
- Research statement vs observed failure, repeated participant, unsupported prevalence; experiment SRM/late data/metric switching/stopping violations and nonrandom before/after comparison.
- Immutable report source/revision, original findings and refusals retained, all missing checks/requests visible, no invented uplift or broad UX pass, no unauthorized action.

Independent design review precedes implementation closure. Each deliverable needs source tests and report/runtime evidence appropriate to its scope. Foundation arithmetic tests alone do not close P5 UX/CRO, provider ingestion, real user research, experiment validation or P7 commercial evaluation.

## Independent design review resolutions

Four interface gaps from `enterprise_contract_review` are incorporated before foundation closure:

1. Context retains a bounded structured `definition` with version 1, entryRule, identityRule, deduplicationRule, retryRule and one transition definition per declared transition. Each retains transitionId, fromStepId, toStepId, eligibleRule, continuationRule, entryPopulation (`first-entry-cohort`/`any-step-entrant`), ordering (`direct`/`indirect`) and maxContinuationSeconds. `definitionDigest` must equal the canonical digest of this exact object; source declarations must match it. Closed funnels require first-entry-cohort. The definition documents attribution, not authenticated query execution.
2. Context includes ingestionLagSeconds. Each source includes an event-time dataCompleteThrough watermark, no later than capture. Ratios require watermark >= eligibility-window end + continuation horizon, and capture >= that boundary + ingestion lag. Freshness must allow a nonempty mature interval. Unknown until then. The complement is `nonContinuation`, not an assertion of intentional abandonment. No maturity claim is reconstructed from a download timestamp alone.
3. Transition output explicitly contains transition identity, synthetic marker, status `observed` or `unknown`, reason, all sourceIds with that transition, selectedSourceIds eligible for comparison, counts, retention/nonContinuation (null or integer numerator/denominator plus ratio), qualification and requestId. Reasons are declared-cohort-ratio, missing-source, missing-transition, ineligible-source, subset-unproven, missing-counts, immature-window, conflicting-counts or zero-denominator. Conflicting selectedSourceIds mean candidates compared, never a chosen winner. Source records retain all original counts/quality/provenance and ineligibility reasons. Later enterprise integration must not map observed into a UX-quality pass.
4. Result retains full context and digest, actual definition, source/transition accounting and explicit synthetic classification: synthetic, real-declared or unknown (no sources). Every derived transition and request carries the source synthetic flag or null. No source marker means unknown, not real. All-synthetic fixtures may exercise arithmetic but remain labeled synthetic.

Requests now also retain customer/entity/environment, the actual transition definition, requiredCompleteThrough and ingestion lag. Strict parsing reuses the existing duplicate-key-aware capture parser rather than introducing a competing parser. `providerAuthenticated`, `semanticAcceptance` and `causalAcceptance` remain false; `uxQualityAssessment` remains not-assessed. The development foundation is not a native GA4 importer or enterprise report adapter.

Source review found that transition endpoints were initially outside the definition digest: relabeling submit as payment-settled could reuse 60/100 from the old export. The retained definition now contains fromStepId and toStepId, with exact equality to the declared transition mapping before any result is produced. The unchanged-source relabeling regression was observed failing before the fix, then passed. This is a source-binding correction, not evidence that supplied business definitions are truthful.

## Development workflow checkpoint

The descriptive-funnel part of step 5 now has immutable enterprise run and report integration; see [review and verification](../research/enterprise-journey-workflow.md). Ratios remain descriptive, UX checks unknown, source exports private, and lifecycle/history retained. This does not close the remaining journey, research, experiment, packaging or runtime work.
