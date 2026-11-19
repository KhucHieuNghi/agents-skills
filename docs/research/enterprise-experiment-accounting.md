# Experiment ITT accounting checkpoint

Development-only implementation of the denominator reconciliation requirement from the [experiment review](../plans/website-audit-enterprise-experiments.md). This is one internal component of task 2, not a completed experiment evaluator, source importer, report integration or commercial acceptance. No package pins or website changed.

`reconcileExperimentArm` keeps the assigned population intact and checks the full disjoint outcome partition. Exposure and outcome joins are overlapping process counts. Missing values remain null; malformed input throws; contradictory counts retain all detectable diagnostics. Any missing count, empty cohort, incomplete join, unresolved outcome, post-assignment exclusion, duplicate or crossover blocks binary-arm output. Passing accounting still does not establish valid inference. The adapter must prove the meaning and evidence of confirmed non-success; absent telemetry is insufficient.

The initial focused run failed because the module did not exist. After implementation, all 28 cases passed, including partial outcomes, inconsistent partitions, unexposed assigned units, missing fields one at a time, overlapping process counts, simultaneous contradictions, empty cohorts, strict count bounds and immutable input behavior. Independent reviewer `enterprise_contract_review` read source/tests and independently reran the same 28 cases successfully; no material defect found within this boundary. No broader task 2 or release acceptance was given.

All counts represent distinct units in the declared assigned cohort. Original artifact/scope binding, cross-arm/metric consistency, maturity, missingness diagnosis, SRM, effect uncertainty, multiplicity and decision rules remain open in the parent plan. The accounting bound is 10^12 units; the Fisher kernel supports at most 10,000 combined units. Larger cohorts must receive explicit method-support limitations, not truncation or subsampling to pass the kernel.

## Full verification

With new files staged for documentation scanning, all seven repository checks passed: root format, lint, typecheck, build and tests, plus site typecheck/tests. Root tests: 150 files / 1,912 tests. Staged diff whitespace check passed. Logs are in `build/enterprise-experiment-accounting-verification/`. This documentation-only result was appended after the run; source/tests were unchanged.
