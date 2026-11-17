# Technical and on-page SEO

Adapted from Corey Haines' seo-audit intake, foundation ordering, on-page review
and evidence-led reporting. See [NOTICE](../../NOTICE.md). This adaptation does
not import the upstream's universal character limits or keyword-position rules.

## Evidence plan

For each public page, record original/final URL, response status, redirects,
response headers, raw HTML and collection date. Where rendering is relevant,
collect rendered DOM separately. For exports, mark live responses unknown.
Request supplied webmaster exports only when they are necessary to resolve an
indexing question; lack of access must not stop unrelated content checks.

## Procedure

1. Compare intended visibility with access: status, redirect loops, authorization,
   robots restrictions, WAF evidence and internal discovery. Distinguish an
   intentional private page from an accidentally inaccessible public page.
2. Inspect applicable index/snippet directives, canonical declarations and sitemap
   membership. Document conflicting values and affected URLs. Verify current
   engine documentation before assigning consequences; recommendations are not
   proof that an engine selected a canonical or indexed the page. For a non-HTML
   resource, inspect captured HTTP Link headers and intended variants. Non-HTML
   format alone does not establish that canonical review is not applicable.
   If relevant headers or intent are unavailable, retain the uncertainty.
3. Compare title, description, headings and main content with the page task. Flag
   missing/misleading metadata with evidence. Length is contextual; do not fail
   a page for exceeding a universal character count or having multiple H1s.
4. Build the observed internal link graph. Resolve links against the source URL.
   Separate navigation/body links and record broken targets only when checked.
   An orphan finding needs a sufficiently complete graph or must be provisional.
5. Inspect structured data present in the actual captured surface and compare it
   with visible claims. Raw HTML can contain valid server-rendered JSON-LD.
   Absence in raw source does not prove absence in rendered DOM. Syntax validity,
   vocabulary meaning and engine feature eligibility are different checks.
6. Retain locale variants. Inspect reciprocal alternatives, language/content
   mismatches and canonical conflicts using current engine-specific guidance.
   Avoid inferring that one faulty pair invalidates every locale relationship.
   Verify a proposed fix by re-reading the supplied revised annotations on both
   sides, matching intended language targets and self-references. This is distinct
   from observing live indexing or engine-selected language results. Do not send
   the customer to Search Console's retired International Targeting report or
   country-targeting setting. The [official deprecation notice](https://support.google.com/webmasters/answer/12474899?hl=en)
   was checked on 2026-11-16; it does not retire hreflang itself. URL index evidence
   answers a different question and does not replace reciprocal-link inspection.
7. If performance evidence exists, separate field measurements from lab tests,
   device/network configuration and collection dates. Do not infer Core Web
   Vitals from page size or a single local timing.

## Output

For each issue: affected URLs, observed signal, intended behavior, confidence,
user/search consequence, proposed fix and a repeatable check. Keep collection
failures separate from content defects. Changes to redirects, robots, noindex,
canonicals or live content require a separate implementation task.

## Limits

Search operators are not an exhaustive index count. Keyword overlap alone is
not cannibalization. Schema does not guarantee a search appearance. Do not
recommend a deprecated diagnostic tool or rich-result feature without checking
current official documentation. No numeric SEO health score is produced.

## Direct documentation

Use the rule-specific links in [the registry](../../rules/core.json) for HTTP
responses, index/preview controls, canonical signals, metadata, links, structured
data, locale relationships and JavaScript rendering. Each source supports its
named topic and platform; it does not validate every heuristic in this method.
