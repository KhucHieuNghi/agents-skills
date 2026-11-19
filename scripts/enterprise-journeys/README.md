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
