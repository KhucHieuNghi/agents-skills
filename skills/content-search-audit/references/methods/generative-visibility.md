# Measured generative visibility

Adapted from Profound's ai-prompt-portfolio-builder, ai-answer-accuracy-auditor
and aeo-operator-2026. See [NOTICE](../../NOTICE.md).

## Measurement design

Define the business question before selecting prompts. Derive user tasks and
language from authorized evidence when available; preserve hypothetical demand
as unknown. Group by task, intent, product, market and language, with distinct
stable, exploratory and diagnostic cohorts. Version every cohort change.

Keep consumer UI, API, search-enabled and non-search observations separate.
Record engine/surface/model when exposed, prompt text, locale, timestamp,
repetition, response artifact and collection method. Choose cadence from required
precision, variability and budget; do not install a recurring monitor implicitly.

## Analysis

1. Verify response artifacts exist and match observation metadata. Deduplicate
   duplicate imports; repeated independently captured responses remain separate.
2. Count brand mentions separately from domain citations and recommendations.
   Preserve exact cited URLs and the claim each citation appears to support.
3. State each denominator: valid captured responses in a named cohort for mention
   rate; eligible captured responses or citation instances for citation metrics.
   Never mix these definitions under the same metric name.
4. Adjudicate material claims against dated factual evidence. Separate accurate,
   incomplete, stale, contradicted, subjective and unverifiable observations.
   Report adjudication coverage alongside any accuracy rate.
5. Compare periods only on a common cohort with compatible surfaces and locale.
   Disclose missing responses, capture errors and platform/configuration drift.
6. Trace recurring cited source types before recommending a distribution channel.
   A single screenshot is an observation, not a durable market baseline.
7. Relate business metrics only when supplied attribution supports the link.
   Direct referrals do not measure every assisted effect, and correlation does
   not establish that a content change caused a conversion increase.

## Output

Return observed rates with explicit counts, dates and scope; factual discrepancies;
missing measurements; and a retest plan. If zero valid observations are available,
return unavailable metrics rather than zeros. Synthetic fixture responses are
never reported as live brand visibility.

## Limits

No universal citation-market mix, daily cadence or predicted percentage lift is
inherited from vendor research. Cross-surface aggregations require an explicit
weighting scheme and must retain their component results. No outreach or content
publication is performed by this method.
