# Accessibility native foundation review

Date: 2026-11-19. Status: development foundation outside the packaged skill. Candidate 0.3.12 is unchanged. [Plan](../plans/website-audit-enterprise-accessibility.md), [implementation](../../scripts/enterprise-accessibility/axe.mjs), [regressions](../../tests/content-audit-accessibility.test.ts), [actual browser probe](../../tests/browser/enterprise-axe-contract.mjs).

## Evidence and decisions

Official W3C evaluation/criterion guidance and native axe 4.14.1 API references are linked in the plan. Root checked the actual local dependency and all four public-pilot evidence files: they record axe 4.14.1. The pilot README's 4.14.0 prose was corrected, preserving report/capture bytes and verdicts.

Native loopback Chromium experiments established that a rule can appear in both violations and passes, resultTypes can truncate reported node lists, and include/exclude context is not stored in AxeResults. Therefore imported automated passes refer only to reported-tested-elements; full page/state coverage and effective configuration provenance remain unknown with a specific request. axe.configure can override built-in behavior without changing engine version. No standard criterion/conformance or execution-authenticity claim is inferred.

Independent reviewer `/root/performance_contract_review` identified three contract gaps: missing context/config provenance, empty category semantics, and unspecified final P2 identity mapping. The plan now addresses them explicitly. The development helper identity is not used as a final P2 check identity. Manual/journey and canonical workflow tasks remain open.

## Implementation review and corrections

The reviewer independently reproduced three implementation findings:

1. A rule error placed in passes could yield pass. The parser now rejects errors outside native incomplete results.
2. A disabled rule or null nested check could yield pass. The parser now validates nested check objects and rejects explicit disabled-rule contradictions.
3. Supported native detail options were rejected. Actual axe noHtml produces null HTML and selectors:false omits target. Both are now retained with null detail hashes and missing-detail requests rather than invented identities or broader coverage.

Root added four regressions, observed all four fail, implemented the corrections and reran them successfully. The missing-detail case uses the actual native null HTML shape. A separate initial test assertion falsely matched the word “privately” in static instructions; it was corrected to a unique sensitive sentinel. This was a test defect, not raw error leakage.

## Actual runtime trials

Private artifacts: build/enterprise-axe-contract-001 through -005. Trial001 failed due to the harness passing a CSS string “document”; it was corrected to pass the actual document object. Trial002 proved three native behaviors; trial003 integrated the evaluator; trial004 exercised the initial parser corrections. Trial005 exercises five cases including native noHtml and selectors:false, retaining exact native JSON and normalized evaluations with hashes. All navigation is loopback synthetic; no public sites, forms or transactions are exercised.

The five-case harness verifies mixed nodes, truncated counts, excluded-context pass and both omitted-detail profiles. Each runs through the normalizer/evaluator; full coverage and conformance remain unassessed. Stored native outputs are evidence of the local run, not imported execution authority.

## Remaining work

Manual keyboard/focus/dialog/error recovery and multi-step scenarios; criterion registry; immutable P2 report integration and privacy review; real public pilots with scoped permissions; customer CLI/package and both fresh host installs; native host/commercial evaluation. No production deployment or broad accessibility acceptance is claimed.

## Verification and handoff

Focused suite: **27 tests passed**. Actual final loopback harness: **5 cases passed**, native axe-core 4.14.1. Full repository: **92 files / 822 tests passed**, one worker, unchanged timeouts (89.31 seconds). Format, lint, typecheck, build and staged diff checks passed. Package component digest remains `bdb6764755d52a8aea51d1d93b5ab50b5d21c597c8d19175e7b6b0766f8ba926`, matching candidate 0.3.12.

Independent review identified the contract and implementation issues; root verified the fixes with failing-then-passing regressions and actual native exports. No second independent acceptance of the final fixed implementation is claimed. No reviewer finding is deferred in this foundation scope. Task 1 is complete; tasks 2 and 3 remain explicitly open in the plan.
