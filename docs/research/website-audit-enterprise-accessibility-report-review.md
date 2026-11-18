# Accessibility canonical report integration review

Date: 2026-11-19. Development integration, not packaged capability or commercial acceptance. [Contract](../plans/website-audit-enterprise-accessibility-report.md), [workflow](../../scripts/enterprise-accessibility/workflow.mjs), [tests](../../tests/content-audit-accessibility-workflow.test.ts), [native report trial](../../tests/browser/enterprise-accessibility-report.mjs).

## Implemented behavior

Axe and attributed scenario evidence now enter immutable P2 source-run revisions. Completed half-open observation windows bind timestamps; check labels expose URL/state/device/environment, protocol and expected outcome scope. Axe results remain reported-tested-elements. Scenario WCAG references remain separate from ux-cro product diagnostics. All entries retain an unknown manual-coverage check; imported source attribution never grants independent acceptance.

Every retained evaluation is reprojected at the new assessment, even when untouched in the incoming bundle. Recomputed row evidence controls check expiry and dependencies. Parent bytes remain unchanged; prior verdicts are archived by P2 reconciliation. Historical supplied-record counts are preserved in report revisions. Unknown requests carry exact scope and fallback, retaining declined status/reason. Raw source payloads, selectors/HTML, browser strings and interpretation notes are excluded from customer JSON/Markdown/HTML.

## Independent contract and implementation review

Reviewer `/root/performance_contract_review` identified two contract gaps, addressed before final integration:

1. Index/check deletion together could evade an orphan-check-only guard. Every evaluation ID in retained base evidence now requires a validated active index and reconstructed check set. Latest assessment/lineage binding also rejects an internally consistent rollback pointer.
2. Obligation-array order and overlapping subsets could duplicate populations. Rule/step ordering is canonical; population identity excludes obligation lists and rejects separate IDs for the same population. Existing IDs cannot silently remove/change declared obligations.

The reviewer then ran **70 tests** across the initial workflow, trace and predicate suites and independently probed altered row expiry, foreign request ownership, policy rebinding and removed evidence. Each rejected before output. Same-time reassessment retained its scoped failure; exact expiry became unknown with zero findings. No actionable finding remained in that reviewed scope. Root subsequently added explicit rollback-pointer and stale/fresh independent-review timestamp regressions.

## Native fixture reports

build/enterprise-accessibility-report-001 contains ten evaluations from the actual axe trial005 and nine native scenario trace imports trial002. Initial and revised canonical reports save/reload successfully. Revision2 preserves twenty historical count observations and two scoped draft findings; no independent acceptance is asserted. One incoming reevaluation causes all ten retained entries to rebuild, exercising untouched-source behavior.

The report renders at 1280px and 390px without horizontal overflow, page errors or external requests. Full-page screenshots and hash receipts are retained beside JSON/Markdown/HTML. These are automated rendering checks, not manual accessibility conformance or user research. Existing local native fixture evidence is used offline; no production site, account or transaction is accessed.

## Remaining gates

Package the reviewed modules with a customer CLI, concise guides/examples, provenance/component lock and fresh archive installs for both hosts. Reproduce installed positive/negative workflows and review customer projections independently. Real public runtime/manual coverage, further technical SEO/UX/provider scope, optimization/retest and commercial/native-host evaluation remain open. Candidate 0.3.12 is unchanged.

## Final verification

Final integration suite: **14 tests passed**. Full repository: **95 files / 894 tests passed**, one worker and unchanged timeouts (47.87 seconds). Format, lint, typecheck, build and staged diff checks passed. Native canonical trial: ten evaluations, two scoped draft findings, twenty preserved historical observations, two viewport render checks passed.

The independent review covered the initial 70 workflow/trace/predicate tests and targeted integrity probes; the two later regressions were root-verified. No independent finding is deferred in this integration scope. Package component digest remains `bdb6764755d52a8aea51d1d93b5ab50b5d21c597c8d19175e7b6b0766f8ba926`, matching candidate 0.3.12. Packaging, customer projection acceptance and enterprise release gates are not implied by these results.
