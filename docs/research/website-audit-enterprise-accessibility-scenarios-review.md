# Accessibility scenario predicates and native fixtures

Date: 2026-11-19. Development scope only; no package, production deployment or commercial acceptance. [Scenario contract](../plans/website-audit-enterprise-accessibility-scenarios.md), [internal predicates](../../scripts/enterprise-accessibility/scenario-rules.mjs), [predicate tests](../../tests/content-audit-accessibility-scenarios.test.ts), [browser fixture harness](../../tests/browser/enterprise-accessibility.mjs).

## Independent contract review

Reviewer `/root/performance_contract_review` found four semantic gaps, all incorporated into the contract:

- Focus obscuration: the reveal exception requires persistent content opened by the user. An automatic sticky/overlay obstruction cannot pass merely because it can later be dismissed or scrolled away.
- Keyboard escape: an undocumented shortcut does not establish a trap when a usable standard route exists. A negative standard-exit fact explicitly means reviewed absence; null means unreviewed.
- Freshness: newly dated steps cannot refresh old attachments. Each fact expires from the earliest supporting observation and step time. Predicates expose exact fact dependencies so unrelated stale material does not invalidate an independent sufficient result. Enforcement belongs to the upcoming source importer.
- Outcome scope: each journey obligation declares sandbox or production before evidence arrives. Missing/mismatched scope stays unknown. Product journey outcomes are not WCAG criteria.

The rule table's enum delimiters were fixed so all predicate text remains inside its intended Markdown column. Root additionally required proof the function is available by another input before treating a blocked keyboard action as a keyboard defect; a shared backend failure is not sufficient.

## Implementation and review

The internal registry implements ten typed predicates. It carries source-limited meaning and never authenticates execution, human attribution or semantic acceptance. No source ingestion or freshness gate is bypassed by calling it; it is not exposed in the skill CLI/package.

The reviewer ran the initial 18 tests and independently probed focus visibility/order, dialog naming and horizontal reflow. One P2 contradiction remained: an observed successful standard exit could coexist with reviewed absence of a usable standard exit and still pass. The opposite contained/no-exit plus verified standard route was also inconsistent. Root added two reproductions, observed both fail, then rejected those contradictions before eligibility evaluation. Additional tests cover substantive pass/fail branches, prototype-inherited facts and non-keyboard contradictory inputs. Final focused suite: **30 tests passed**. The final fixed code was verified by root; no second independent acceptance is claimed.

## Native browser evidence

build/enterprise-accessibility-scenarios-001 and -002 contain nine scenarios each: escapable and Escape-suppressed native dialogs, fully and partially covered focused controls, invalid-submit with and without text error, overflow at CSS width320 and390, and failed local booking. Trial002 explicitly checks the dialog opened and focus entered it before evaluating Escape behavior. Exact action/focus/DOM trace bytes and screenshots have SHA-256 receipts. All network traffic stays on the loopback fixture server; exactly one POST reaches the synthetic failing-booking endpoint.

These traces deliberately contain no automatic criterion verdicts. A native modal can move focus toward browser chrome while still open; an empty activeElement ID must not be relabeled as a proven keyboard trap. Three point hit-tests do not establish complete visual visibility/contrast. The 390px overflow is a mobile observation, not a WCAG reflow verdict. A sandbox failed booking is not a production failure. Full screen-reader/manual review remains missing.

## Remaining implementation

Implement scenarios.mjs to parse exact source bytes, validate attachments/attribution/protocol/device, enforce per-fact expiry, resolve conflicts/deduplicate and preserve unvisited obligations. Connect actual trace evidence to attributed facts before any customer report. Then complete immutable P2 integration, customer instructions/CLI, independent report review, package freeze and native host/commercial evaluation. This work does not close those gates.

## Repository verification

Full regression: **93 files / 852 tests passed**, one worker and unchanged timeouts (98.98 seconds). Final focused predicates: **30 passed**; final browser trial002: **9 passed**. Format, lint, typecheck, build, registry table structure and staged diff checks passed. A lint-only change qualified structuredClone as globalThis.structuredClone; the focused suite and lint were rerun afterward. Candidate 0.3.12 component digest remains `bdb6764755d52a8aea51d1d93b5ab50b5d21c597c8d19175e7b6b0766f8ba926`.

No independent finding is deferred in the pure predicate scope. Source ingestion, attachment freshness and P2 integration remain unimplemented and explicitly open, rather than counted as passing capabilities.
