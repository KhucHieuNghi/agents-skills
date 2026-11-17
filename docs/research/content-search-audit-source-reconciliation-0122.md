# Source reconciliation — candidate 0.1.22

Reviewed 2026-11-16T01:44:52.098829+00:00. This supersedes the historical 0.1.12 map for current source/fixture accounting, without rewriting that snapshot. No customer package bytes or upstream pins changed.

## Verified scope

- 26 registry rules match their existing source mappings; all named pinned headings exist.
- Five upstream commits and complete selected-tree digests match the provenance lock.
- Both original MIT license texts match packaged notices by hash.
- All nine selected Corey reference hashes and existing disposition records remain unchanged.
- Six internal method files were read; all package file digests match the lock.
- Fifteen registry primary documents plus the method-specific deprecation notice were reopened.

[Machine-readable receipt](content-search-audit-source-reconciliation-0122.json) retains hashes, mappings, primary-document sections and limits.

## Current primary-source interpretation

| Primary document                                                                                                      | Sections inspected                                                          | Bounded interpretation                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [creating-helpful-content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)           | Content and quality questions; Expertise questions                          | Supports audience usefulness and factual/source care as context; not an official score or proof of authorship.                                        |
| [http-status-codes](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)                    | HTTP status codes; 2xx; 3xx                                                 | Successful transport is not indexing. Distinguish final response, redirect observations and engine processing.                                        |
| [block-indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing)                          | Implementing noindex; HTTP response header                                  | Meta and HTTP directives require crawler access to be read. Robots blocking alone is not a noindex substitute.                                        |
| [robots-meta-tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)                        | Using robots meta; X-Robots-Tag; page/text controls                         | Preserve HTML versus response-header and snippet-control scopes. Local directives do not establish processing time.                                   |
| [consolidate-duplicate-urls](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)  | Canonical methods; rel=canonical HTTP header                                | Declarations are signals, not observed selection; HTTP Link canonicals apply to supported non-HTML resources.                                         |
| [title-link](https://developers.google.com/search/docs/appearance/title-link)                                         | Best practices for influencing title links                                  | Descriptive task-relevant titles matter; no universal title character cutoff or guaranteed displayed title.                                           |
| [snippet](https://developers.google.com/search/docs/appearance/snippet)                                               | How snippets are created; best practices                                    | Snippets can derive from page content or descriptions and vary by query. No universal description-length failure.                                     |
| [links-crawlable](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)                        | Make links crawlable; anchor text placement                                 | Inspect actual href markup and meaningful anchors; an incomplete graph does not establish sitewide orphan status.                                     |
| [sd-policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)                       | General and technical guidelines; content                                   | Syntax, visible-content consistency, feature eligibility and observed appearance remain separate. No appearance guarantee.                            |
| [localized-versions](https://developers.google.com/search/docs/specialty/international/localized-versions)            | Guidelines for all methods                                                  | Retain reciprocal relationships and documented partial-set qualifications; no blanket failure of all locales.                                         |
| [javascript-seo-basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) | How Google processes JavaScript                                             | Crawling, rendering and indexing are distinct. Raw versus ready DOM does not identify the mechanism causing a difference.                             |
| [ai-features](https://developers.google.com/search/docs/appearance/ai-features)                                       | Technical requirements; SEO best practices; measuring performance; controls | No additional AI-specific schema/file requirement. Search Console Web includes AI-feature traffic; aggregate Web metrics are not isolated AI metrics. |
| [bots](https://developers.openai.com/api/docs/bots)                                                                   | OAI-SearchBot; GPTBot; ChatGPT-User                                         | Search discovery, model-training crawling and user-triggered access have distinct controls; no default allow-all policy.                              |
| [decision-tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)                                               | Functional, informative, complex and decorative image branches              | Assess function and context: empty alt can be correct; complex information may be supplied equivalently nearby.                                       |
| [transcripts](https://www.w3.org/WAI/media/av/transcripts/)                                                           | Introduction; Does My Media Need a Transcript?                              | Basic audio transcripts and descriptive visual equivalents differ; requirements depend on media context and conformance level.                        |
| [12474899](https://support.google.com/webmasters/answer/12474899)                                                     | International Targeting report deprecation notice                           | The legacy report and country-targeting setting are retired; hreflang remains supported.                                                              |

The English-parameter deprecation URL initially timed out. The same official help article without the parameter was opened successfully; community search results were not used as authority.

## Rule-to-fixture reconciliation

The older traceability file predates the 12-dossier holdout and still lists some dedicated fixtures as missing. The following table records the later evidence. A listed fixture means the case exists and was exercised; it is not a per-rule acceptance certificate.

| Rule                       | Current method                                | Later holdout cases                                                    | Acceptance |
| -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| `quality-task-fit`         | `references/methods/content-quality.md`       | 01-setup.md, 02-media.md, 05-render.md, 06-facts.md, 10-journey.md     | Open       |
| `quality-claims`           | `references/methods/content-quality.md`       | 03-titles.md, 08-answers.md                                            | Open       |
| `quality-freshness`        | `references/methods/content-quality.md`       | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `quality-accessible-media` | `references/methods/content-quality.md`       | 02-media.md                                                            | Open       |
| `quality-readable-text`    | `references/methods/content-quality.md`       | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `seo-response`             | `references/methods/technical-seo.md`         | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `seo-index-controls`       | `references/methods/technical-seo.md`         | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `seo-canonical`            | `references/methods/technical-seo.md`         | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `seo-metadata`             | `references/methods/technical-seo.md`         | 03-titles.md                                                           | Open       |
| `seo-internal-links`       | `references/methods/technical-seo.md`         | 04-links.md                                                            | Open       |
| `seo-structured-data`      | `references/methods/technical-seo.md`         | 12-markup.md                                                           | Open       |
| `seo-locales`              | `references/methods/technical-seo.md`         | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `seo-rendering`            | `references/methods/technical-seo.md`         | 05-render.md                                                           | Open       |
| `aio-crawler-policy`       | `references/methods/ai-search-readiness.md`   | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `aio-entity-consistency`   | `references/methods/ai-search-readiness.md`   | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `aio-retrievable-facts`    | `references/methods/ai-search-readiness.md`   | 06-facts.md                                                            | Open       |
| `aeo-question-coverage`    | `references/methods/answer-quality.md`        | 07-questions.md                                                        | Open       |
| `aeo-answer-context`       | `references/methods/answer-quality.md`        | 01-setup.md                                                            | Open       |
| `aeo-answer-evidence`      | `references/methods/answer-quality.md`        | 08-answers.md                                                          | Open       |
| `geo-observed-presence`    | `references/methods/generative-visibility.md` | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `geo-answer-accuracy`      | `references/methods/generative-visibility.md` | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `geo-cohort-validity`      | `references/methods/generative-visibility.md` | 11-periods.md                                                          | Open       |
| `portfolio-task-gaps`      | `references/methods/content-portfolio.md`     | 07-questions.md                                                        | Open       |
| `portfolio-duplication`    | `references/methods/content-portfolio.md`     | 09-overlap.md                                                          | Open       |
| `portfolio-contradictions` | `references/methods/content-portfolio.md`     | Use earlier related evidence in receipt; no new dedicated case claimed | Open       |
| `portfolio-journey-links`  | `references/methods/content-portfolio.md`     | 04-links.md, 10-journey.md                                             | Open       |

The [0.1.22 native replay](content-search-audit-trials/semantic-0122/README.md) preserves exact reports and findings adjudication. Both hosts found 15 seeded units, but Claude reporting failures remain. This reconciliation does not turn earlier related fixtures into a complete benchmark.

## Boundaries that remain open

- Independent semantic and domain acceptance, including correctness of proposed corrections and final summaries.
- Actual optional browser/PDF extraction acceptance; supplied snapshots are a different evidence surface.
- Full comparison-candidate closure and adoption decisions beyond the five selected packages.
- No proof of ranking, citations, conversion lift, authorship or vendor-method efficacy follows from a source mapping.

The source-freshness and attribution review for the current selected 26-rule registry is complete at this timestamp. The broader product goal and commercial-release gates remain open.
