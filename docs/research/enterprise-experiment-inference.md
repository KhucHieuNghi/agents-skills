# Allocation and difference-interval development checkpoint

This adds two numerical methods required by the [experiment plan](../plans/website-audit-enterprise-experiments.md). It does not complete task 2 interpretation, enterprise report integration or commercial acceptance. No release pins or customer websites changed.

## Method boundaries

The allocation diagnostic assumes declared independent Bernoulli assignment with fixed rational treatment probability. Original assigned counts are mandatory; filtered or converted populations are not valid substitutes. Exact BigInt probability ordering includes ties and avoids positive p-values underflowing to zero. The method does not infer a diagnostic threshold or verify actual assignment. Fixed quotas, blocks, strata and adaptive assignment need separate methods.

The difference interval combines Wilson endpoints using the Newcombe hybrid score method without continuity correction. The estimand is treatment minus control risk difference; nominal two-sided coverage is 95% and approximate/marginal, not exact or simultaneous. This is not inversion of Fisher's odds-ratio test. No automatic improvement, safety, equivalence or rollout decision is returned.

## Numerical evidence

The first focused run failed because the allocation module was absent. An intermediate run had 37 passing tests and one failing reference test because the separate Python oracle was still initializing and its redirected JSON output was empty. The live process was polled to completion; no values were manually substituted. The subsequent run passed all 38 tests across the inference and original-statistics suites.

The committed synthetic reference fixture was generated using SciPy 1.18.1 and statsmodels 0.15.0 in the isolated `build/experiment-reference-venv` environment. The generator explicitly selects two-sided binomial testing and Newcombe difference intervals with alpha 0.05 and no continuity correction. It supplies eight allocation and eight difference cases, including zero/all successes, unequal arms/probabilities and large sparse samples. Product runtime has no new dependency. Oracle package installation is development-only; the normal test suite consumes the committed numbers.

Independent weighted bit-mask enumeration checks every treated count for populations 1–8 at probabilities 1/2, 1/3, 2/3 and 3/5 without reproducing the binomial recurrence. Additional tests cover correct unequal allocation, extreme positive probability, maximum rational denominator/population, strict method/input rejection, arm-swap symmetry and difference bounds. These numerical checks do not measure power, minimum coverage or clinical/business validity.

## Remaining work

Original-source binding and full denominator/assignment diagnostics, preregistration/stopping, metric completeness, multiplicity and joint primary/guardrail semantics remain mandatory. The fixed-95 interval does not support arbitrary confidence levels or automatically justify confirmatory claims across a metric family. Evidence imports must preserve unsupported-method outcomes for larger samples or other designs. Public pilots contain no randomized experiment results.

Sources and exact interfaces are recorded in the plan. The implementation uses the mathematical formulas and generated numerical reference values, not copied upstream source.

## Independent review

`enterprise_contract_review` found no material numerical defect, independently ran the original 38 focused tests and regenerated the oracle values in the isolated Python environment with matching results. The reviewer highlighted the 6/8 control versus 1/5 treatment case: Newcombe excludes zero while Fisher gives approximately 0.10256. An additional author regression preserves this disagreement and verifies that neither output supplies a shared significance flag. This is precisely why downstream decision rules must state which method governs each claim. The added regression is author-tested; the reviewer did not rerun it or the full suite.

## Full verification

All seven checks passed after staging new files: root format/lint/typecheck/build/tests and site typecheck/tests. Root suite: 151 files / 1,931 tests. Staged diff whitespace check passed. Logs: `build/enterprise-experiment-inference-verification/`. This result paragraph is the only post-run documentation change; implementation and tests stayed unchanged.
