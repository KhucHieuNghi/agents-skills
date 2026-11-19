# UX/CRO funnel foundation — development checkpoint

This checkpoint advances the [enterprise journey plan](../plans/website-audit-enterprise-journeys.md). It is not a released capability, native GA4 integration or completed UX/CRO assessment. Candidate 0.3.24 and its archive are unchanged.

## Implemented boundary

The offline evaluator consumes hash-bound supplied aggregate exports with explicit cohort/population/window, retained transition definitions and quality declarations. It reports scoped retention and non-continuation only when declared membership, freshness and observation maturity support them. It keeps every requested transition, source aliases/conflicts, unknown counts, zero denominators and missing-data requests visible. Requests include source scope, definition, required completeness cutoff, owner, read-only instructions and fallback. It makes no website calls or mutations.

A measured ratio is not a UX-quality verdict, causal uplift, real provider authentication or terminal business verification. The exact result context and all-synthetic markers remain in outputs. Input `samePopulation=true` and watermarks are attributed declarations, not proof that the source query honored them. Independent semantic review and provider/query evidence remain necessary.

## Independent review and corrections

Reviewer `enterprise_contract_review` first identified four contract gaps: missing retained definitions, unfinished conversion opportunities/late ingestion, underspecified result states and possible loss of synthetic classification. The contract and implementation now retain actual definitions and digests, horizon/watermark/ingestion lag, explicit observed/unknown reason codes, and synthetic classification at result/transition/request levels.

Source review then reproduced an important defect: changing only a transition's destination from submit to payment-settled reused the old 60/100 observation. A new regression failed before the fix. Each retained transition definition now binds both step endpoints, and exact endpoint correspondence is checked before evaluation. The same regression passes after the fix. Reviewer found no other material issue in the inspected arithmetic, maturity, conflicts, parser or classification boundaries; the fix was verified by regression, not a second independent review.

## Tests and scope

The focused suite has 34 tests: rates/denominators; open funnel entries; zero and missing counts; complete/sampled/thresholded/modeled/precision flags; manual declarations and unknown membership; exact expiry and re-downloads; capture chronology; order-independent conflicts and duplicate aliases; source identity/scope/definition/population; count coercion/bounds; duplicate JSON keys/nonfinite values/calendar errors/Unicode; bytes/depth/injected grants; maturity and lag; synthetic propagation; endpoint relabeling; and synthetic profile fixtures for lead generation, commerce, booking, subscription, publishing and mixed branches.

Initial implementation tests observed 15 failures against a stub before implementation. The subsequent endpoint regression separately reproduced the real review finding. All examples are exposed development fixtures; they are not holdouts, native host trials or precision/recall evidence. No customer counts were invented or imported from the public website pilots.

The full UX/CRO task still needs functional journey orchestration, research/experiment contracts, source adapters, immutable report/CLI integration, authorized runtime trials and commercial evidence. These are retained in the plan rather than marked complete from arithmetic tests.

Repository verification passed: 135 test files / 1,656 tests, format, lint, typecheck, build, site typecheck/site tests and diff whitespace checks. This checkpoint changes no bundled skill files, component lock, release archive or installation behavior.
