# Accessibility scenario trace importer review

Date: 2026-11-19. Development API only; no packaged skill or customer report capability added. [Contract](../plans/website-audit-enterprise-accessibility-scenarios.md), [implementation](../../scripts/enterprise-accessibility/scenarios.mjs), [tests](../../tests/content-audit-accessibility-traces.test.ts), [native fixture import](../../tests/browser/enterprise-scenario-import.mjs).

## Implemented boundary

Strict source bytes bind customer/entity/environment, canonical target, viewport, journey/protocol/version and predeclared obligations. Attachments have their own exact hashes/timestamps and cannot be referenced by a fact outside its step. Steps are ordered and bounded; future/non-calendar times, unsupported author claims, extra fields, malformed/oversized source and scope changes reject. No network or executable action is accepted.

Each fact expires from its earliest supporting attachment/step, exclusively. Capture and interpretation timestamps cannot refresh old facts. Raw contradictions are checked first, then expired values become null for predicate evaluation. A fresh sufficient negative remains even when an unrelated fact is stale. Missing steps remain explicit unknown obligations with scoped requests. Source byte aliases deduplicate semantically while attribution is preserved as supplied, not authenticated or independently accepted.

## Independent findings and corrections

Reviewer `/root/performance_contract_review` ran the initial **51 trace/predicate tests** and reproduced two aggregation problems:

1. A fresh step backed only by expired attachments could hide another current failure by introducing an unknown outcome. Entirely stale evidence is no longer an opposing current assertion; it remains in records and missing-evidence requests.
2. Two contradictory fact sets could each yield fail and bypass status-only conflict checks. Aggregation now identifies conflicting current fact values first, masks them per source and reevaluates each source separately. A nonconflicted sufficient failure survives; otherwise unresolved conflict stays unknown. Complementary incomplete traces never synthesize a pass.

Root reproduced both failures, added regressions and verified fixes. Additional cases verify partial opposing assertions, exact expiry, sibling attachment rejection, per-protocol/device identities and source bounds. Final focused result: **58 tests passed** across trace import (28) and predicates (30). No second independent acceptance of the final fixed code is claimed. P2 integration remains unreviewed.

## Native evidence import

build/enterprise-accessibility-trace-import-001 and -002 import the nine actual Chromium fixture traces from build/enterprise-accessibility-scenarios-002. Native receipt hashes are checked before creating attributed source envelopes; raw trace and interpretation attachments remain separately bound. Final trial002 correctly labels overflow observation mode as programmatic and bounds receipt IDs used for local paths.

All nine imports pass their expected assertions: two scoped passes, one scoped failure and six unknown outcomes. These are fixture expectations, not precision/recall or customer quality percentages. The root AI interpretation of explicit invalid-submit text is supplied attribution only. An Escape-suppressed dialog remains unknown for trap assessment because the finite trace does not prove absence of every exit. Focus samples/overflow remain unknown without semantic prerequisites. A booking failure message without terminal receipt remains unknown for the outcome check. No real transaction or production site is exercised.

## Remaining work

Integrate axe/scenario evidence into immutable canonical P2 revisions; preserve source ownership, per-check freshness, aggregate conflict semantics and fresh independent decisions. Complete instructions/examples/customer CLI and private-to-customer projection review; package/reinstall both hosts only afterward. Manual/screen-reader/hidden-state/iframe/shadow coverage and full enterprise runtime/commercial gates remain open. Candidate 0.3.12 is unchanged.

## Final verification

Full repository regression: **94 files / 880 tests passed**, one worker, unchanged timeouts (48.07 seconds). Focused trace/predicate suites: **58 passed**. Native trace import trial002: **9 cases passed**. Format, lint, typecheck, build and staged diff checks passed. Candidate 0.3.12 component digest remains `bdb6764755d52a8aea51d1d93b5ab50b5d21c597c8d19175e7b6b0766f8ba926`.

Both independent aggregation findings have reproducing regressions and root-verified fixes. No finding is deferred in this development importer scope. Canonical report integration, full manual coverage, native host trials and commercial acceptance are still open requirements.
