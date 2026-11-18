# CrUX field foundation independent review

Date: 2026-11-19. Status: developmental foundation, not a packaged capability or commercial acceptance.

Implementation: [CrUX normalizer and evaluator](../../scripts/enterprise-performance/crux.mjs). Contract: [performance plan](../plans/website-audit-enterprise-performance.md). Tests: [synthetic native-shaped field cases](../../tests/content-audit-performance.test.ts).

The evaluator re-reads exact supplied bytes, checks scope/request/returned dimensions, validates native metrics and collection dates, and computes scoped metric and all-three field outcomes. It retains source context for absent data, errors, stale periods and mismatches. Origin records cannot pass URL checks; distinct periods/devices/normalized populations cannot be pooled. Conflicts resolve per metric before aggregate evaluation. No provider authentication, lab metric substitution or commercial acceptance is asserted.

## Source correction discovered during implementation

The [official native schema](https://chromeuxreport.googleapis.com/$discovery/rest?version=v1) uses firstDate/lastDate, despite endDate wording in prose. The [CrUX API documentation](https://developer.chrome.com/docs/crux/api) specifies fixed PST for collection dates. Code and the plan now use the inclusive lastDate boundary at the following day's 08:00 UTC; expiry adds the explicit product max-age policy. The 28-day window does not establish 28 days of actual visitor coverage.

## Independent review and correction

Reviewer: `/root/performance_contract_review`, separate read-only AI review. It inspected source and ran the focused suite and targeted probe; author retained implementation responsibility.

One P2 finding was reproduced: explicit native `formFactor: null` or `"ALL"` could be accepted as aggregate-device data and yield pass. The native provider dimension only permits PHONE/DESKTOP/TABLET when present; aggregate-device data omits the key. Implementation now distinguishes omission via Object.hasOwn and rejects null, ALL and empty string in native responses. ALL remains an internal/envelope label. The reviewer reran the probe and confirmed closure; omission still passes the synthetic positive control.

Focused suite: **34 tests passed**, independently rerun. Coverage includes thresholds, missing INP with/without another failing metric, no sources, origin fallback, device/period mismatch, fixed-PST expiry, provider errors, per-metric contradictions, normalized-target conflicts, semantic decimal equality, scoped identities, tampered hashes, malformed calendar data, unknown envelope claims, invalid native values, oversized artifacts and projection of untrusted provider annotations. These are deterministic regression tests, not measured commercial precision/recall or real-host trials.

## Remaining implementation

Lighthouse/PSI/RUM normalization, transport failure receipts, canonical P2 moduleResult mapping, immutable report import/revision, CLI, packaging/installations and real performance pilots are pending. The developmental intermediate output must not be passed off as a validated P2 report. Existing 0.3.11 skill bytes, locks and archives are unchanged. The next implementation step is lab normalization/evaluation and then the report workflow, before freezing a new candidate.

## Repository verification

Format, lint, typecheck, build and diff checks passed. Full regression: **89 files / 745 tests passed** with `npm test -- --maxWorkers=1`, unchanged test timeouts (45.82 seconds). The focused 34-case suite was also rerun independently. No existing packaged skill source changed, so this checkpoint does not refresh component locks or claim a new installed release.
