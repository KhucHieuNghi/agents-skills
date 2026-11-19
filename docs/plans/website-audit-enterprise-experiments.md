# Enterprise experiment evaluation implementation plan

> Execution: implement task by task using `superpowers:executing-plans`, with independent AI review before closure. Existing owner authorization covers implementation; this document does not authorize customer-site experiments or rollout.

**Goal:** produce source-bound, qualified experiment interpretations across all five business profiles and mixed profiles, with explicit requests when evidence is missing.

**Architecture:** separate statistical arithmetic, experiment design/data-quality eligibility, original export ingestion, and immutable enterprise report integration. Arithmetic cannot authenticate assignment, establish causality or authorize actions.

**Tech stack:** existing bounded JSON parser, Node.js BigInt arithmetic, Vitest, existing enterprise state/report contracts. No new runtime dependency.

**Spec:** [UX/CRO contract](website-audit-enterprise-journeys.md), step 4 and steps 5–6; [enterprise spec](../specs/website-audit-enterprise.md).

## Global constraints

Only Codex and Claude Code are supported. Preserve original evidence, all attempts and unknown states. JSON is authoritative, Markdown and HTML are derived. No production changes, experiment creation, traffic allocation or tracking writes from imported declarations. No population-wide UX pass or revenue estimate from a conversion comparison. The scope below is a first supported statistical method; unsupported experiment designs remain visible and require the appropriate method, not conversion into this method.

## Required contract

The experiment protocol must bind customer/entity/environment, experiment ID, business profile and outcome dictionary, hypothesis, eligible population, assignment unit, stable allocation and bucketing policy, enrollment interval, observation horizon, ingestion lag, preregistration timestamp and immutable artifact digest. Retain metric definitions, success direction, minimum practically relevant effect, guardrail harm margins, exclusions, stopping rule, multiplicity family and planned analysis. Record the full declared analysis/metric family, not only favorable outcomes. Preregistration is a supplied attribution until independently corroborated; digest integrity is not proof it preceded enrollment.

The first inferential method supports two independent randomized arms, one binary outcome per assigned unit, intention-to-treat, fixed horizon, and a single prespecified primary comparison. Revenue means, repeated events, cluster randomization, adaptive allocation, switchbacks, sequential stopping, per-protocol analyses and post-hoc segments require separate validated methods. They remain descriptive with explicit unsupported-method requests. A single primary comparison does not make secondary metrics confirmatory. Guardrails require their own direction, harm margin and compatible uncertainty method; absence of statistical significance is not evidence of safety.

Source exports retain original bytes/hash, source ID, query/provenance and definition digest, capture and completeness watermark, assigned/exposed/joined/analyzed/excluded/missing counts by arm, success counts, duplicate/crossover diagnostics and synthetic marker. Every exclusion category and denominator needs exact reconciliation; zero missingness is not inferred from an absent field. Assignment SRM uses original assigned units and configured allocation, not converted users or a filtered sample. Exposure and join imbalance are separate diagnostics. Export aliases are not additional samples; conflicting eligible exports stay unresolved. Sampling, thresholding, modeling, missingness, late outcomes and post-randomization selection must not silently become zero failures or valid complete data.

Outputs keep descriptive rates and absolute effect separate from inferential results, eligibility diagnostics and decision. Relative change is null at zero control rate. Zero-sized arms have no estimates. Uncertainty must name its method and estimand; a per-arm Wilson interval is not a difference interval. Fisher's two-sided probability ordering is not a confidence interval for the risk difference. No automatic equivalence, noninferiority or business improvement conclusion from p > alpha or point estimate alone. Retain exact numerator/denominator where the method provides them, and compare thresholds without floating underflow. Never display a tiny positive exact probability as p = 0.

A qualified interpretation needs independent design/source review in addition to arithmetic and diagnostics. Provider authentication, causal acceptance, UX quality and action authority remain separate fields. Observational before/after results remain descriptive even when statistical arithmetic is computable. Requests identify owner, experiment/metric/population/window, missing original artifact and acceptable read-only export; never ask for passwords or participant-level PII by default.

## Tasks and verification

### 1. Bounded statistical primitives

Files: `scripts/enterprise-journeys/experiment-statistics.mjs`, `tests/content-audit-experiment-statistics.test.ts`.

- [x] Add `fisherExactBinary(control, treatment)`, with exact arm shapes `{successes,total}`, safe integer counts, positive arm sizes and combined total <= 10000. Return method ID, exact two-sided probability fraction as decimal integer strings, arm rates and absolute risk difference; no verdict or authority field.
- [x] Use hypergeometric probability ordering with fixed margins. All tied tables count; exact BigInt comparisons avoid tolerance-dependent tail inclusion. Return unreduced fractions consistently. Bound loops and validate all input before combinatorics.
- [x] Add `wilsonBinary95(arm)` for an explicitly marginal approximate 95% Wilson score interval. Do not expose it as a difference interval or a simultaneous multi-metric interval.
- [x] Test a published reference example, balanced/degenerate tables, arm swap and success complement invariance, independent exhaustive small-table enumeration, extreme probabilities beyond floating range, strict input rejection and the maximum supported total. Independent reviewer checks derivation and tests.

### 2. Design, quality and uncertainty interpretation

Files: `experiment-rules.mjs` and corresponding tests. Define strict protocol/facts contracts before implementing predicates. Add validated risk-difference uncertainty and planned harm-margin checks, exact allocation SRM with declared threshold, explicit quality blockers and unsupported-design requests. Bind every metric to the complete prespecified family and distinguish primary, exploratory and guardrail roles. Test SRM, equal-arm missingness as well as asymmetric loss, metric switching, optional stopping, missing guardrails, immature outcomes, zero baseline and statistically detectable but practically insufficient effects. Do not label passing an SRM diagnostic as randomization proof.

### 3. Original source adapter

Files: `experiments.mjs` and corresponding tests. Reuse bounded duplicate-key-aware parsing and scope/digest conventions of `funnel.mjs` and `observations.mjs`. Add exact-count reconciliation, original query/protocol binding, freshness/maturity, aliases/conflicts and complete metric accounting. Every result carries observed/declaration provenance. Invalid bytes fail closed; absent/unsupported evidence produces targeted requests. Test five profiles plus mixed, schema abuse, source substitution, stale re-download, omitted unfavorable metrics and synthetic/real mixing.

### 4. Immutable report integration and evaluation

Files: `experiment-workflow.mjs`, workflow tests, browser fixtures and a research dossier. Preserve original enterprise source/history, other module findings and declined requests. Render all declared metrics and blockers in canonical JSON, MD and V2 HTML, with no causal badge from arithmetic alone. Verify offline mobile/desktop readability and parity on real-size reports. Run independent source review and both-host native/installed trials. Public-site pilots supply no real randomized experiment evidence yet; request authorized exports instead of inventing a trial.

### 5. Release integration

Only after review and method/adapter/report checks: validate package, update reviewed component lock, rebuild candidate archive and fresh-install both hosts. Complete the parent P3–P7 gates, including commercial evaluation and owner risk decision; this plan does not replace them.

## Review focus

Most consequential cases are omitted unfavorable analyses, selection after assignment, mismatched unit denominators, late business outcomes, and a safe-looking nonsignificant guardrail with too little data. Each belongs in tasks 2–4. The numerical kernel alone cannot close any of these cases.

## Primary method sources checked 19 November 2026

- [SciPy Fisher exact documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html): fixed-margin hypergeometric null and probability-ordered two-sided test; the example [[6,2],[1,4]] gives 0.10256410256410256. This is a method reference, not copied implementation.
- [NIST proportion confidence intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm): Wilson score interval formula and small-sample caveats. Use the explicit Wilson formula; do not label it an exact interval.
- [Microsoft experiment data quality](https://www.microsoft.com/en-us/research/articles/data-quality-fundamental-building-blocks-for-trustworthy-a-b-testing-analysis/): assignment mismatch, telemetry loss, missingness and data readiness require separate diagnostics before interpretation.

## Independent review checkpoint

The independent reviewer inspected task 1 and reran its 20 tests with no material numerical defect found. This accepts the numerical foundation only. Before task 2 implementation, the following contract decisions remain mandatory and open:

1. Choose and source-validate the risk-difference interval: method/version, sidedness, confidence, boundary handling and sample conditions. Define which method governs each claim when it disagrees with Fisher. Fisher probability ordering must not be presented as inversion of an unrelated difference interval.
2. Make ITT accounting executable: per metric and arm, eligible assigned = confirmed success + confirmed non-success + unresolved. Exposures/joins are overlapping process counts, not additive outcome categories. Unexposed units stay assigned; missing telemetry does not mean failure. Distinguish pre-assignment eligibility from post-assignment exclusions. Initial inference requires zero unresolved outcomes.
3. Bind SRM to the assignment mechanism. The initial diagnostic will require independent Bernoulli assignment with a fixed declared probability; fixed quotas, blocks and strata need separate validated diagnostics. Define an exact probability representation and two-sided tail rule before implementation.
4. Define joint primary/guardrail decision states and multiplicity policy. Separate detectable improvement with unestablished practical relevance from unresolved guardrail safety. All-guardrails-required joint decisions and separate confirmatory claims are different hypotheses; do not apply an unexplained blanket correction.

These retained findings block interpretation-layer closure, not task 1 arithmetic. Full enterprise completion and commercial acceptance remain open.

## ITT accounting interface

`reconcileExperimentArm(input)` in `scripts/enterprise-journeys/experiment-accounting.mjs` is an internal predicate, called once for each arm and metric after the adapter binds source and population. Exact fields are assigned, exposed, joined, confirmedSuccess, confirmedNonSuccess, unresolved, postAssignmentExcluded, duplicateUnits and crossoverUnits. Each is null (unknown) or a nonnegative safe integer <= 10^12. No field may be omitted; unknown must never default to zero.

All fields count distinct assignment units, not events. `assigned` is the original eligible randomized cohort before post-assignment exclusions. Pre-assignment exclusions belong to the protocol/eligibility ledger. `exposed` counts assigned units exposed to their variant; unexposed units stay in the denominator. `joined` counts assigned units explicitly linked to the outcome evidence, including records whose terminal outcome is unresolved. It is independent of exposure count: an unexposed assigned unit can have a confirmed outcome. Neither process count is added to outcome categories. The outcome partition must sum exactly to assigned; confirmed non-success requires actual mature observation under the metric definition, not absence of an event.

Post-assignment exclusions, duplicate units and crossover units count affected assigned units, not additional rows; they may overlap with each other and process/outcome counts. All must be known zero for this first method. Every non-null count must be <= assigned when assigned is known. Joined must equal assigned; unresolved must be zero; assigned must be positive. Contradictory well-formed counts are retained with all detectable reasons and no binary input, rather than silently repaired. Malformed shapes/types/bounds throw.

Output has namespace, a copied counts object, deterministic reasons, accountingEligible and binaryArm (null unless eligible, otherwise successes/total). It also explicitly returns providerAuthenticated, causalAcceptance and actionAuthorized as false. Accounting eligibility does not prove outcome maturity, units, coverage, population identity, independence, randomization, source truth or diagnostic power. Larger valid populations can pass accounting while exceeding a particular numerical method's bound; the adapter must preserve an unsupported-method result, not truncate the sample. Paired-arm checks, scope/metric completeness, uncertainty, SRM and joint decision semantics remain required.

## Allocation and risk-difference numerical methods

`bernoulliAllocationExact(input)` takes exactly mechanism (`independent-bernoulli`), controlAssigned, treatmentAssigned and treatmentProbability `{numerator,denominator}`. Counts are nonnegative integers with positive combined total <= 10,000; an individual arm may be empty so allocation failures are still diagnosable. The declared fixed treatment probability is a rational a/b with 1 <= a < b <= 1,000. Fixed quotas, blocks, strata, adaptive assignment and unknown mechanisms are unsupported, never treated as Bernoulli.

The two-sided tail sums binomial table probabilities no greater than the observed probability, including exact ties. BigInt weights are C(n,x) a^x (b-a)^(n-x), with shared denominator b^n. Return exact positive numerator/denominator strings, method ID and copied allocation input. The caller must use original assigned counts, bind the declared mechanism/configuration and compare against its preregistered diagnostic threshold without floating underflow. Passing this diagnostic cannot prove randomization or absence of bias, and small samples can have little diagnostic power. No threshold or eligibility verdict is inferred by this kernel.

`newcombeDifference95(control,treatment)` implements the Newcombe hybrid Wilson score interval without continuity correction for independent binomial proportions, treatment minus control. It uses marginal Wilson endpoints with lower width sqrt((pT-LT)^2+(UC-pC)^2) and upper width sqrt((UT-pT)^2+(pC-LC)^2). Confidence is fixed nominal two-sided 95%, approximate marginal coverage, with no guarantee of minimum 95% coverage across all finite populations. It supports the same positive arm/combined-count bound as Fisher and retains uncertainty at zero/all successes. This interval is not an inversion of the conditional Fisher test and is not simultaneous across metrics.

For the forthcoming interpretation contract, use this named interval to describe risk-difference uncertainty; retain Fisher as a separately labeled diagnostic. Neither kernel decides practical improvement, guardrail safety, equivalence or rollout. Any confirmatory decision must explicitly bind confidence/multiplicity and threshold semantics; a general family or alternate alpha is not supported by the fixed-95 kernel. The remaining joint decision contract is still open.

Method sources checked 19 November 2026: [SciPy binomial test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html) and [statsmodels independent-proportion intervals](https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.confint_proportions_2indep.html), explicitly selecting `newcomb`, difference and alpha 0.05. Independent development oracle versions and numerical outputs are retained in `tests/fixtures/content-audit/experiment-numerical-reference.json`; `experiment_reference.py` regenerates the fixture using a separate Python environment. No Python statistical package is required in the shipped runtime.

## Joint interpretation predicate

`evaluateExperimentDecision(protocol, facts, observations)` is an internal evaluator over caller-reviewed facts. It does not read original source bytes or authenticate the caller. The next source adapter must bind every declaration to actual scoped evidence, including cohort and complete preregistered family. Returned protocol/facts are copied for attribution; neither is authority.

Protocol exact fields: mechanism (independent-bernoulli, fixed-quota, blocked, stratified, adaptive, observational or unknown), cohortDigest (lowercase SHA-256), treatmentProbability, srmThreshold and metrics. Probabilities/thresholds are exact positive rational numerator/denominator with numerator < denominator; allocation denominator <= 1,000, SRM threshold denominator <= 1,000,000. Threshold is caller-prespecified, not selected from observed results. Only independent Bernoulli has a supported allocation diagnostic. Other mechanisms retain an unsupported blocker.

The complete family has 2–20 unique metrics, exactly one primary and remaining guardrails. Each definition has metricId, role, direction (increase/decrease) and an absolute probability-point margin strictly between 0 and 1. Primary margin means minimum practical improvement; guardrail margin means largest acceptable harm. This initial contract requires at least one explicit guardrail. Secondary/exploratory metrics and alternative methods need a separate declared analysis; they cannot be silently promoted into this confirmatory family.

Facts have exact fields: controlAssigned and treatmentAssigned (null or nonnegative integers <= 10^12), plus tri-state designReviewed, preregistered, randomizationVerified, noInterference, metricFamilyReviewed, onePlannedAnalysis, sourceScopeVerified, populationComplete, outcomesMature, fixedHorizonCompleted, metricDefinitionsVerified and qualityReviewed. Every attestation must be true for interpretation. False and unknown both block; supplied true is not authenticated proof. The adapter must verify timestamps, source completeness, exposure/join quality, stopping and immutable definitions rather than accepting source-authored pass fields.

Observations contain exact metricId, cohortDigest, control and treatment accounting records. Missing metrics stay present in output and block the joint result. Extra/duplicate IDs are invalid input. Both arm denominators must match original assigned counts; cohortDigest must match the full protocol cohort, not merely matching totals. Every metric's original accounting/reasons remains visible. Any metric or global eligibility blocker suppresses all interval-based statuses for the joint run; it never shrinks the family.

SRM rejects when exact binomial p <= the prespecified threshold, using cross-multiplied BigInt fractions. Zero individual arms remain diagnosable; empty/oversized/unknown combined counts block interpretation. The statistical bound remains 10,000 combined units, with explicit unsupported-population status rather than truncation.

For M complete family metrics, intervals use Newcombe with normal quantile Phi^-1(1 - 0.05/(2M)), alpha 0.05/M. Constants for M=1..20 are generated with Python NormalDist and interval results checked against the independent statsmodels oracle for every M. Corrected intervals have a distinct method ID, family size, per-comparison alpha and nominal family confidence 0.95. This uses Bonferroni allocation of error across named intervals; Newcombe is approximate, so no exact minimum family coverage is claimed. It is not required to assume metrics independent. This policy intentionally supports separate interval statements, rather than claiming it is the only possible joint-decision method.

Raw intervals retain treatment-minus-control direction. For decreasing-is-better metrics, oriented bounds are [-upper,-lower]. Primary states: lower > margin is practical-improvement-supported; lower > 0 and upper < margin is detectable-improvement-practically-insufficient; lower > 0 with the practical boundary included is detectable-improvement-practical-margin-unresolved; upper < 0 is adverse-direction-supported; otherwise upper < margin is practical-improvement-excluded, else inconclusive. Exact equality to the practical boundary remains unresolved. Guardrails: lower > -margin excludes the harm margin; upper < -margin exceeds it; all other cases, including equality, remain safety-unresolved. No nonsignificance-as-safety shortcut.

Joint decision is blocked if any prerequisite fails; otherwise adverse-evidence if any primary adverse direction or guardrail harm is supported; supports-preregistered-criteria only if primary practical improvement and every guardrail margin pass; otherwise insufficient-evidence. The last category retains the more informative per-metric insufficiency states. Fisher is separately returned as an unadjusted diagnostic and does not vote on interval conclusions. Provider authentication, causal acceptance and action authorization remain false for every outcome.

The independent design review required explicit practical insufficiency, cohort binding, complete-family M, equality behavior and approximate coverage labeling; these are incorporated. Source review and integration acceptance are separate. [NIST Bonferroni inequality](https://www.itl.nist.gov/div898/handbook/prc/section4/prc473.htm) supports the error-allocation rationale; its ANOVA t-interval formula is not used for these binary metrics.

Original-export follow-up: the [ingestion contract](website-audit-enterprise-experiment-ingestion.md) and `experiments.mjs` implement aggregate bytes, exact scope/protocol/outcome bindings, maturity/quality, aliases/conflicts and stable evidence/request identity. Independent semantic review remains blocked pending separately bound supporting artifacts and verdicts. [Review evidence](../research/enterprise-experiment-exports.md) includes two reproduced and corrected source-selection/request-lifecycle defects.
