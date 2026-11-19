# Experiment arithmetic development checkpoint

This checkpoint implements task 1 of the [experiment plan](../plans/website-audit-enterprise-experiments.md), not experiment or UX/CRO commercial acceptance. No package version, component lock, archive or customer website changes.

## Implemented boundary

`fisherExactBinary` enumerates the feasible fixed-margin two-arm binary tables, comparing integer hypergeometric weights against the observed table. All equally probable tables are included. The shared exact denominator is the number of ways to select the total successes from the combined population. BigInt integer arithmetic preserves extreme positive probabilities without rounding them to zero. Output fractions are unreduced decimal integer strings, bounded by the 10,000-unit population limit. Absolute risk difference and observed rates are descriptive floating-point values.

`wilsonBinary95` uses the NIST Wilson score formula with the standard-normal 0.975 quantile. It retains boundary uncertainty even for zero or all successes. The interval is approximate and marginal; it is neither a confidence interval for the difference nor multiplicity-adjusted. Its method ID says so.

The numerical kernel cannot verify assignment, independent units, preregistration, exposure joins, missingness, maturity, stopping rules, guardrails or business relevance. It returns no pass, causal acceptance or action permission. Unvalidated observations must not be passed through this kernel and reported as a valid randomized experiment.

## Test evidence

The first focused run failed because the numerical module did not yet exist. After implementation, 20 tests passed. They include the SciPy documented table [[6,2],[1,4]] (two-sided p = 0.10256410256410256); exhaustive individual-assignment enumeration for each pair of arm sizes 1 through 5 and every success count; arm-swap and success-complement invariance; tied and degenerate margins; and strict shape/count/bound validation. The independent small-table oracle enumerates bit masks instead of reproducing the implementation recurrence.

Maximum-size fixtures cover both a balanced wide-support table and complete separation with 5,000 units per arm. The latter retains numerator 2 and a denominator with over 2,900 digits, rather than an underflowed zero. Wilson tests cover a non-boundary proportion and zero/all-success limits. These are deterministic arithmetic checks, not simulation-based coverage or experiment-design validation.

Independent review and full repository verification are recorded below when completed. Remaining tasks are the exact design/decision contract, effect uncertainty and SRM methods, original evidence importer, immutable report workflow, multi-profile fixtures, native-host evaluation and release integration. Public pilots provide no randomized experiment data. Research raw-storage lifecycle and controlled distribution remain separate open work.

Method sources and attribution are in the linked plan. No upstream implementation was copied and no runtime dependency was added.

## Independent review

`enterprise_contract_review` independently inspected the numerical source/tests and reran all 20 focused tests successfully. No material defect was identified in task 1. Four interpretation-layer requirements remain open in the plan: risk-difference interval/decision semantics, executable ITT accounting, assignment-specific SRM, and joint primary/guardrail multiplicity rules. The reviewer did not run the full repository suite or approve enterprise release.

## Repository verification

After staging the new files so documentation checks include them, all seven checks passed: root format, lint, typecheck, build and tests; site typecheck and tests. The root suite passed 149 files / 1,884 tests. `git diff --cached --check` also passed. Logs are retained locally in `build/enterprise-experiment-statistics-verification/`. A documentation-only addition records these results after the run; no implementation or test changed after verification.
