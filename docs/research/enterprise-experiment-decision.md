# Joint experiment decision development checkpoint

This implements an internal multiple-metric decision layer from the [experiment plan](../plans/website-audit-enterprise-experiments.md). It is not source ingestion, a customer report, causal validation or release acceptance. Package pins and customer websites are unchanged.

## Behavior and interpretation

One prespecified primary and 1–19 guardrails retain complete family size even when evidence is missing. Every caller-reviewed prerequisite, accounting record, cohort binding and original assigned denominator must match. Failed or unknown requirements block all interval interpretations without discarding the counts or narrowing the family. Exact SRM comparison uses the original declared allocation and a prespecified rational threshold.

Newcombe intervals use per-comparison alpha 0.05/M for the full named family. Coverage is approximate nominal Bonferroni family coverage, not guaranteed exact 95%. This supports separately reported intervals, including correlated metrics, without claiming it is the only valid joint policy. Fisher remains an unadjusted diagnostic outside decision logic.

Direction-aware bounds distinguish supported practical improvement, positive but practically insufficient effects, unresolved practical relevance, exclusion of the practical threshold and adverse direction. Guardrail safety requires exclusion of its prespecified harm margin; nonsignificance is insufficient. Equality at a decision boundary remains unresolved. Joint support never grants source authentication, causal acceptance or execution authority. Returned protocol and facts are attributed copies, not authenticated records.

## Independent review and numerical checks

Design review identified a material distinction missing from the initial proposal: an interval entirely below the practical threshold can establish practical insufficiency rather than merely unresolved relevance. It also required complete-family M, cohort identity, explicit two-sided quantiles and boundary behavior. These were incorporated before closure.

The independent reviewer inspected the implementation, ran 64 focused tests across decision/inference/statistics, and regenerated the Python oracle. All values matched, including all 20 family-size cases. No material defect found within the internal interface. Tests cover missing guardrails preserving M, all unknown/false attestations, same-sized different cohorts, denominator changes, unresolved outcomes, SRM despite favorable effects, directional guardrail harm and exact practical boundaries.

Four author follow-up regressions add practical exclusion/adverse distinction, exact SRM threshold equality, the other guardrail equality boundary and protocol/facts copy isolation. The independent reviewer did not rerun these additions or the full repository suite. This checkpoint did not follow a red-first implementation sequence for the new joint evaluator; verification relies on the independent method oracle, behavioral regressions and source review rather than claiming test-first evidence.

## Required next work

Original-byte ingestion must substantiate the preregistered protocol, cohort membership, experiment design, definitions, outcome maturity, completeness and all review attestations. It must retain missing/unsupported/conflicting evidence and precise requests, rather than trusting source-authored booleans. Family/metric IDs cannot substitute for verifying omitted analyses. Immutable JSON/Markdown/HTML workflow, multi-profile fixtures, native-host trials, packaging and parent enterprise commercial gates remain open.

## Full verification

All seven repository checks passed with new files staged for documentation scanning: root format/lint/typecheck/build/tests and site typecheck/tests. Root result: 152 files / 1,960 tests. Staged diff whitespace check passed. Logs: `build/enterprise-experiment-decision-verification/`. This result paragraph is documentation-only; source/tests were unchanged after the run.
