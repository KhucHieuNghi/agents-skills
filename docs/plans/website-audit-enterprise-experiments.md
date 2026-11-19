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
