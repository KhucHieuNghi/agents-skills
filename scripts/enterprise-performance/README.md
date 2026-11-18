# Performance development foundation

This directory implements the [enterprise performance contract](../../docs/plans/website-audit-enterprise-performance.md) incrementally. It is not included in the released skill package and is not a customer command. Once lab evaluation and immutable report integration are tested, move the implementation into the package, refresh provenance and freeze a new candidate. Existing candidate archives remain immutable.

`crux.mjs` exports `normalizeCruxResponse(input, context)` and `evaluateCruxField(context, inputs)`. It consumes supplied native queryRecord responses only; it makes no network calls and does not authenticate Google execution. Tests contain synthetic native-shaped fixtures. Run `npx vitest run tests/content-audit-performance.test.ts --maxWorkers=1` from the repository root.

Context binds customer/entity/environment, assessmentAt, canonical URL or origin target, PHONE/DESKTOP/TABLET/ALL, an exact inclusive 28-day period, maxAgeDays and explicitly authorized normalized URLs. Envelope scope must match; request dimensions must match native record dimensions. Separate origin requests can provide contextual records for URL assessments but cannot pass their checks. Native field values retain returned target, form factor, period and source hash. No percentile pooling across periods, devices or normalized targets.

Freshness uses the end of the inclusive CrUX date range in fixed PST (UTC-8), plus maxAgeDays. Expiry is inclusive. This is the product's explicit eligibility policy, not a provider freshness guarantee. Existing source capture timestamps cannot refresh old measurements. The provider's declared 28-day aggregation window does not prove 28 days of actual user coverage.

Source verification on 2026-11-19:

- [CrUX API](https://developer.chrome.com/docs/crux/api): native metric types, normalization, collection period and PST behavior.
- [Google discovery schema](https://chromeuxreport.googleapis.com/$discovery/rest?version=v1): CollectionPeriod properties are firstDate and lastDate, inclusive; URL normalization carries originalUrl and normalizedUrl. Verified directly because the prose's endDate wording conflicts with the schema/examples.
- [CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds): classification thresholds. CLS uses integer hundredths internally; no preclassification rounding.

## Lighthouse lab foundation

`lighthouse.mjs` exports `normalizeLighthouse` and `evaluateLighthouseLab`. The initial native profile is exactly Lighthouse **13.6.0 navigation**. Other versions/modes remain visible as unsupported records; they do not produce assessed metrics. Supported measurements include LCP, FCP, TBT, CLS, Speed Index and the native 0–1 performance score. There is no field INP substitution or CWV verdict.

Supplied artifacts alone produce individual observations. A repeated-run summary requires at least three successful comparable measurements, complete configuration, distinct collector-bound receipts and sequential runs on the same machine. The optional host argument is trusted in-session state, never an imported receipt JSON or customer claim. Full configuration and browser digests separate groups. All known receipt overlap on the same machine is checked across groups. External throttling or screen emulation remains unverified rather than inferred from a scoring form factor.

Semantic identity collapses reformatted exports; divergent values for one identity prevent summary. Runtime failures, partial/unsupported/conflicted records and ungrouped evidence remain in explicit accounting. Failed navigation may retain only hashes of non-HTTP document locations. Warning/error text remains in the raw artifact and is represented by hashes in intermediate outputs. Failed attempts are never silently removed from the denominator.

Native references: [v13.6.0 LHR types](https://github.com/GoogleChrome/lighthouse/blob/v13.6.0/types/lhr/lhr.d.ts), [configuration types](https://github.com/GoogleChrome/lighthouse/blob/v13.6.0/types/lhr/settings.d.ts), [native metric implementations](https://github.com/GoogleChrome/lighthouse/tree/v13.6.0/core/audits/metrics), and [scoring/variance guidance](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). Implementation is original; these references establish field semantics rather than copied source.

Run the synthetic regression with `npx vitest run tests/content-audit-lighthouse.test.ts --maxWorkers=1`. The optional actual Chromium harness is `node tests/browser/enterprise-lighthouse.mjs DEPENDENCY_ROOT NEW_OUTPUT`: use an isolated local dependency root containing Lighthouse 13.6.0, with the repository's existing Playwright Chromium. It starts a loopback-only synthetic fixture and three fresh browser sessions; it never audits production. Existing output directories are refused. Its stored receipts are historical evidence, not automatically trusted input to a future product import.

These evaluators emit intermediate results, not a P2 moduleResult ready for report persistence. No findings are automatically promoted to customer reports. The generic field all-three rule is not a promise to reproduce PSI/Search Console badges. Transport failure receipts, PSI/RUM ingestion, canonical report projection, CLI, installed-host trials and commercial acceptance remain pending.
