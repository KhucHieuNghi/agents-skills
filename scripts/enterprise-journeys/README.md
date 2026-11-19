# UX/CRO development foundation

Development-only source, not bundled in content-search-audit 0.3.24. The [full journey implementation contract](../../docs/plans/website-audit-enterprise-journeys.md) retains functional journeys, research, experiments, immutable report integration and authorized runtime work. This first evaluator implements supplied aggregate funnel arithmetic only.

```js
import { evaluateFunnel } from "./funnel.mjs";
const result = evaluateFunnel(context, sources);
```

Inputs are strict, bounded and offline. No network, filesystem writes, browser actions, credentials or imported authorization are consumed. Use the synthetic JSON examples in `tests/fixtures/content-audit/enterprise/journeys/` to inspect the exact shapes. Their source bytes are hash-bound and their values are fictional. They do not establish native GA4 ingestion, backend correctness, user research, causality or commercial profile coverage.

The context retains the actual eligibility/continuation definition, endpoints, identity/dedup/retry rules, population and cohort window. Definition digests bind the step endpoints as well as the textual rules. Source descriptors bind original JSON bytes, export/manual attribution, scope, definition, population, window, quality flags and the event-time completeness watermark. Imported provenance and completeness remain declarations; the helper does not authenticate providers or verify query execution.

A rate is `observed` only when the declared cohort is exact, complete, unsampled, unthresholded and unmodeled, with matching subset membership, a mature continuation horizon and ingestion lag, and fresh evidence. This is measurement availability, never a UX-quality pass. Zero denominator retains zero counts but null rates. Missing or conflicting eligible evidence yields unknown and a scoped request. Stale/manual/partial counts remain in source accounting. The complement is observed non-continuation within the declared horizon, not proof of abandonment intent.

Open funnels may have more eligible entrants at later transitions. No cross-step subtraction, multiplication into end-to-end conversion, revenue attribution or industry benchmark is performed. Identical source aliases never become independent samples; conflicting eligible counts are not selected by array order. All-synthetic results and their requests keep a synthetic marker; no-source results are unknown, never silently real.

Output includes the exact validated context, definition/digest, source records, every declared transition, explicit numerator/denominator/value or null, all/selected source IDs, qualifications, source/transition accounting and precise requests. `providerAuthenticated`, `semanticAcceptance` and `causalAcceptance` stay false; `uxQualityAssessment` stays not-assessed. The downstream enterprise workflow must preserve these semantics and refuse to convert arithmetic into a broad UX verdict.

Run focused regressions with `node build/dependency-hardening-20261119/npm22.mjs exec -- vitest run tests/content-audit-journey-funnel.test.ts --maxWorkers=1` in this development checkout. The standard project test command also includes this suite. No versioned customer CLI or runtime collector is claimed by this directory.

## Development enterprise workflow

`evaluateEnterpriseFunnels(sourceDirectory, bundle, newOutputDirectory)` from `workflow.mjs` reads an immutable enterprise run. The bundle has sourceDigest, newRunId, assessmentAt and evaluations. Each evaluation contains evaluationId, sources and the evaluator context without customerId/assessmentAt; the run owns those values. A supplied evaluation ID cannot change its scope. Untouched evaluations are replayed at the new assessment time, and the output directory must be new.

The workflow retains raw evidence privately, recomputes historical projections, validates active and historical evidence ownership, and returns report-compatible observations with explicit ratio numerators/denominators. Current unavailable ratios are null; old results remain historical. The existing report builder creates JSON/Markdown/HTML without raw export bodies. Every transition adds an unknown UX-quality check, never a pass or automated finding. Existing intake checks and other modules remain in scope.

One stable request per transition asks for both scoped aggregate evidence and independent task research. Missing-measurement details supplement that obligation; a ratio becoming available does not silently change the request into another artifact type. Lifecycle state, evidence bindings, invalidation metadata and refusal reasons persist; the core reconciler expires evidence when appropriate. `provided` means a response is present, not that either UX or the response's semantic correctness is accepted. Separate research/experiment evaluation and native provider acquisition remain future work.

Ten workflow regressions cover canonical report projection, stale replay, scope/index tampering, unchanged source directories, untouched journeys, intake preservation, declined/invalid/provided responses, response expiry, and historical ownership. The independent reviewer found lifecycle reset and historical-binding bypass defects; both had failing regressions before fixes. No installed-host or commercial acceptance follows from these development tests.

## Internal task predicates

`evaluateJourneyTask(definition, facts)` in `task-rules.mjs` separates expected UI feedback from a declared terminal business outcome. It can distinguish a deliberate invalid-input rejection from a failed conversion expectation, without treating either as an automatic UX-quality finding. Unknown facts stay null/unproven; pending/attempt outcomes do not count as completion. The result retains the definition/digest and facts digest, two scoped predicates, and explicit false acceptance/authenticity/authorization flags.

This is an internal predicate, not a source importer. Before using it, the future observation adapter must validate the retained protocol, original evidence bytes, explicit correlation, scope, source conflicts, maturity and freshness. In particular, a short trace cannot establish no-feedback before the response horizon, and conflicting observations cannot be selected opportunistically. Do not call these functions directly on website instructions or use their result to execute transactions. The [journey plan](../../docs/plans/website-audit-enterprise-journeys.md) specifies the required adapter and reuse boundaries.
