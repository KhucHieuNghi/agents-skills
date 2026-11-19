# Original experiment export development checkpoint

The [ingestion contract](../plans/website-audit-enterprise-experiment-ingestion.md) and `scripts/enterprise-journeys/experiments.mjs` implement supplied aggregate ingestion. This is not a complete experiment capability: semantic review, supporting evidence, report integration and commercial acceptance remain open. No package lock or customer website changed.

## Implemented evidence boundary

Original bytes are bounded, hashed and parsed with duplicate-key rejection. Context retains the full protocol, outcome identities/dictionary digest, cohort definition, enrollment, horizons and freshness policy. Exports must match exact scope/protocol/cohort/synthetic declarations. Original source accounting, quality, incomplete metrics and per-source reasons remain visible. Complete equivalent exports are aliases rather than additional samples; conflicting eligible exports block selection; partial exports are never merged into a complete family.

Maturity checks include the maximum outcome horizon plus ingestion lag. Freshness derives from enrollment end, so redownloading old results cannot renew them. Stable evidence identity excludes the assessment clock, while invocation identity includes it. All semantic review facts remain unknown; a source cannot self-approve via a review/pass field. The resulting decision remains blocked and includes scoped requests with original evidence requirements and maturity timestamps.

## Independent review and corrections

Design review required supporting-artifact hashes/roles beyond aggregate exports, explicit business outcome identities, stable review bindings and no merging of partial families. Outcome IDs and stable bindings are implemented. Supporting artifacts and independently bound per-prerequisite verdicts remain required before semantic acceptance. Locators and hash-shaped strings are not treated as verified supporting evidence.

The source reviewer independently ran the initial 16 tests and reproduced two P2 issues. First, request IDs depended on assessmentAt and changed on every reassessment, disrupting request/refusal continuity. Second, unknown original assignment counts were omitted from source eligibility reasons, allowing an incomplete export to conflict with a complete export. Both received explicit regressions that failed before correction and passed afterward. Requests now use stable binding/owner/condition identity with a separate assessment timestamp; missing assignment counts are retained as source ineligibility. The reviewer has not independently rerun these fixes.

The final focused suite has 25 passing cases covering original bytes, forged review fields, aliases/order, conflicts, partial families, stable clock reassessment, expiry, watermark/lag, quality restrictions, foreign definitions, Unicode/calendar rejection, missing evidence, size limits, late registration/stopping, and the two review regressions. Six synthetic business-profile cases retain distinct outcome identities; these are binding smoke tests, not semantic validation of commerce/booking/lead/subscription/publishing/mixed business data. The initial implementation was not test-first; only the two review corrections have explicit red-to-green evidence.

## Required continuation

Implement bounded supporting-artifact verification for registration/configuration/query/cohort/dictionary records; bind each independent verdict to those verified hashes plus the protocol and stable aggregate evidence set. Recheck reviewer timing/expiry, source maturity and freshness at every assessment. Then integrate immutable JSON/Markdown/HTML and request lifecycle, exercise all profiles and host trials, and complete enterprise release gates. Provider authentication, causal acceptance and action authorization remain false.

## Full verification

After staging all new files, all seven repository checks passed: root format/lint/typecheck/build/tests plus site typecheck/tests. Root suite: 153 files / 1,985 tests. Staged diff whitespace check passed. Logs: `build/enterprise-experiment-exports-verification/`. This result paragraph was appended after verification; implementation/tests stayed unchanged.
