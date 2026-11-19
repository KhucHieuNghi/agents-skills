# Attributed experiment review evaluation checkpoint

Implements receipt verification described in the [ingestion contract](../plans/website-audit-enterprise-experiment-ingestion.md). No package/release pin or website changed. This remains an offline supplied-evidence development adapter, not authenticated reviewer infrastructure, immutable report integration or commercial acceptance.

Each call rebuilds aggregate/support evidence from original bytes. An original review receipt must bind scope, protocol, synthetic state, complete evidence and caller policy, inventory every supplied source, and provide all 12 attributed verdicts with mapped evidence and valid source lines. Accepted reviewer relationship/conflict declarations remain unauthenticated. Exact source/hash and line checks establish reference identity, not semantic truth.

Chronology and effective expiry are recomputed. Expired, mismatched, pending, rejected or unresolved reviews do not fill the semantic facts. Acceptance cannot filter mechanical conflicts, replace the selected source, shrink the family, or override source maturity/accounting. One explicit regression accepts an attributed receipt that excludes a conflicting aggregate from its narrative, yet the experiment decision remains blocked because original aggregate selection still fails.

The initial focused run passed 26 cases across the new review evaluator and existing packet tests. New checks cover role-specific dictionary/query coverage, reject/pending, exclusive effective expiry, policy/synthetic replay, added competing support, inventory completeness/conflict, excluded/wrong-role citations, source lines, review timing/relationship, mechanical conflict preservation, duplicate structures, original hash and missing-review requests. Shared packet fixtures were extracted to keep original source definitions consistent. This implementation was not test-first.

The independent design review required non-overridable mechanical conditions, exact role-specific coverage, explicit independence attribution, synthetic/policy lifetime and out-of-scope limitations. These are implemented. Source review and full verification results follow below.

Required continuation: immutable customer JSON/Markdown/HTML workflow with retained histories/refusals, real independent reviewer-host trials on original evidence, broad multi-profile scenarios, package/install validation and the parent enterprise commercial gates. None of the synthetic review fixtures represents a real customer experiment review.

## Independent source review correction

The independent reviewer ran the initial 26 focused tests and reproduced one P2 gap: the sole selected aggregate could be labeled out-of-scope while the review remained accepted and intervals were calculated from it. A new regression failed before correction. Acceptance now requires a supports disposition for every mechanically selected aggregate alias, without filtering/reselecting the original set. The author reran all 27 focused review/packet cases successfully. The reviewer did not rerun this correction or the full suite. No other material defect was identified in the inspected timing/replay/policy/gate-binding paths.

## Full verification

All seven repository checks passed after new files were staged: root format/lint/typecheck/build/tests plus site typecheck/tests. Root suite: 155 files / 2,012 tests. Staged diff whitespace check passed. Logs: `build/enterprise-experiment-review-verification/`. Only this documentation result was appended after the run; implementation/tests stayed unchanged.
