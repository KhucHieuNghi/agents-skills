# Performance development foundation

This directory implements the [enterprise performance contract](../../docs/plans/website-audit-enterprise-performance.md) incrementally. It is not included in the released skill package and is not a customer command. Once lab evaluation and immutable report integration are tested, move the implementation into the package, refresh provenance and freeze a new candidate. Existing candidate archives remain immutable.

`crux.mjs` exports `normalizeCruxResponse(input, context)` and `evaluateCruxField(context, inputs)`. It consumes supplied native queryRecord responses only; it makes no network calls and does not authenticate Google execution. Tests contain synthetic native-shaped fixtures. Run `npx vitest run tests/content-audit-performance.test.ts --maxWorkers=1` from the repository root.

Context binds customer/entity/environment, assessmentAt, canonical URL or origin target, PHONE/DESKTOP/TABLET/ALL, an exact inclusive 28-day period, maxAgeDays and explicitly authorized normalized URLs. Envelope scope must match; request dimensions must match native record dimensions. Separate origin requests can provide contextual records for URL assessments but cannot pass their checks. Native field values retain returned target, form factor, period and source hash. No percentile pooling across periods, devices or normalized targets.

Freshness uses the end of the inclusive CrUX date range in fixed PST (UTC-8), plus maxAgeDays. Expiry is inclusive. This is the product's explicit eligibility policy, not a provider freshness guarantee. Existing source capture timestamps cannot refresh old measurements. The provider's declared 28-day aggregation window does not prove 28 days of actual user coverage.

Source verification on 2026-11-19:

- [CrUX API](https://developer.chrome.com/docs/crux/api): native metric types, normalization, collection period and PST behavior.
- [Google discovery schema](https://chromeuxreport.googleapis.com/$discovery/rest?version=v1): CollectionPeriod properties are firstDate and lastDate, inclusive; URL normalization carries originalUrl and normalizedUrl. Verified directly because the prose's endDate wording conflicts with the schema/examples.
- [CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds): classification thresholds. CLS uses integer hundredths internally; no preclassification rounding.

The evaluator emits field-only intermediate checks and requests, not a P2 moduleResult ready for report persistence. No findings are automatically promoted to customer reports. The generic all-three rule is not a promise to reproduce PSI/Search Console badges. Unsupported transport receipts, Lighthouse/PSI/RUM ingestion, canonical report projection, CLI, installed-host trials and commercial acceptance remain pending.
