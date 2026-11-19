# Supplied task observation adapter checkpoint

Development-only `scripts/enterprise-journeys/observations.mjs` implements evidence-bound task observations using the internal task predicates and existing business-observation normalizer. Candidate 0.3.24 and customer archives are unchanged. This advances journey plan step 2; report/runtime/research/experiment integration and enterprise acceptance remain open.

The adapter retains original source bytes/hash, attributed provenance, complete protocol and attempt manifest, step prerequisites/retries, channel scope and horizons. It distinguishes visible UI feedback from explicitly correlated declared business outcomes. Missing, stale, manual, partial, clock-unproven and conflicting evidence stays attributed or unknown. Every declared attempt remains present and generates specific missing-data requests where required. No transaction execution or imported authorization is supported.

Independent design review identified five safeguards: attempt-specific correlation; prerequisite/retry semantics; full negative-evidence intervals; explicit lifecycle selection; shared-precondition conflicts across channels. They were incorporated using a unique attempt correlation key, retained prerequisite mappings, declared full-interval coverage, conservative single-terminal-record policy and shared-fact consensus. The single-record policy intentionally cannot answer final-state questions for a lifecycle with multiple records; these produce a scoped request instead of a selected winner.

During implementation, author inspection found that matching status and correlation alone did not bind the business outcome definition. A regression accepted an unrelated payment outcome before the fix; steps now bind sourceSystem, outcomeId and the exact dictionary digest.

Independent source reviewer `enterprise_contract_review` then confirmed three P1 defects with narrow reproductions:

1. A predecessor could complete after the dependent attempt started. Decisive per-channel timestamps now establish prerequisite satisfaction before the dependent start. Both rejecting the invalid chronology and accepting a correctly ordered continuation are tested.
2. Sources bound protocol and attempt IDs but not the mapping of attempts to steps. The complete attempt manifest now has a digest bound into source scope; relabeling a step with unchanged source bytes is rejected even if the caller recomputes the context digest.
3. Different same-status business records from separate exports were merged. Cross-source agreement now includes normalized selected-record identity/content; different records remain unknown, identical aliases do not become independent trials.

Each source-review defect had a failing regression before correction. The reviewer did not run the full suite or independently re-review fixes. The fixture cohort is synthetic and does not establish native provider authenticity, actual conversion performance, accessibility conformance, production authorization or enterprise quality metrics.

Remaining boundaries: complete/clock-aligned/reviewed flags are attributed declarations. The current adapter does not parse browser traces into semantic facts or independently validate query execution. Its private raw result is not a customer/public projection. Integration into immutable enterprise reports, tracking/a11y evidence reuse, real multi-industry journeys, user research, experiment validation and native-host evaluation remain required.

Final verification: 138 files / 1712 tests passed; format, lint, typecheck, build, site typecheck and site tests also passed. The adapter has 25 focused tests; all four journey suites total 90. [Verification receipt](enterprise-journey-observations-verification.json) binds source files and local logs.
