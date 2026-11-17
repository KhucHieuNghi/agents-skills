# Zubair nested skills and fetcher: static review

This supplements the [agent review](content-search-audit-zubair-agent-disposition.md).
The [receipt](content-search-audit-zubair-runtime-review.json) binds four complete
nested skill files, the 506-line fetcher and requirements manifest: 2,133 lines.
The upstream revision is unchanged. No upstream code or dependencies were executed
or installed. Findings below are source inferences, not reproduced exploits.

## Fetcher suitability

| Source behavior                                                                          | Consequence for a complete audit                                                                                   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Relative links resolve against input URL after redirects                                 | A redirected directory can produce incorrect discovered URLs; final response URL and HTML base semantics matter.   |
| Navigation, header and footer removed before link/image inventory                        | Site navigation and supporting media disappear from inventory. Text cleanup must not destroy the discovery source. |
| Headings collected by level                                                              | Output loses document order and cannot establish actual heading sequence.                                          |
| SSR flag defaults true and relies on text thresholds                                     | This is a heuristic, not evidence that browser rendering was verified.                                             |
| JSON-LD extraction only                                                                  | Absence in this output does not prove absence of Microdata or RDFa. Parsing alone is not semantic validation.      |
| Sitemap results deduplicated with a set and sliced to 50 by default                      | No stable continuation or record of the remaining queue; insufficient for complete inventory accounting.           |
| Requests follow redirects; no explicit private-address, origin or response-size boundary | Do not adopt as the bounded collector. Timeouts exist; their presence does not supply these other controls.        |
| Non-200 llms.txt responses can leave exists=false without a status-specific error        | Unavailable and absent are conflated. A 403 also cannot prove the underlying file exists.                          |

The robots parser holds one current user agent, so consecutive agent names do not
share the following rules correctly. Exact-case dictionary matching misses some
case variants. Its bot-wide root-disallow summary cannot represent URL-specific
Allow/Disallow precedence. These differ from the grouping, case-insensitive agent
matching and most-specific path rules in [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html).
For example, consecutive GPTBot and ClaudeBot names followed by Disallow `/`
leave the former with empty rules in this implementation. This is a static
counterexample, not a newly executed regression test.

Requirements use version ranges rather than a complete immutable dependency lock.
Reading that manifest does not establish transitive license compatibility or a
clean vulnerability assessment. No dependency is imported into our candidate.

## Method decisions

**Citability.** Keep contextual completeness, source attribution and readable
answers as editorial questions. Exclude universal word-count targets, prescribed
statistics density and uplift forecasts without population-specific evidence.
The nested skill and its parent agent use different weights and aggregation
populations, so their numbers are not interchangeable measurements.

**Crawler roles.** Separate search discovery, training and user-triggered fetching.
The nested crawler guidance conflates some of those purposes. Anthropic documents
ClaudeBot for training, Claude-SearchBot for search and Claude-User for user-directed
retrieval. Allowing training is a site-owner decision, not a prerequisite inferred
from a desired search outcome. [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).

Noindex is not a universal network access block. Google must be able to crawl to
read it, and conflicting applicable directives do not reduce to a universal
HTTP-header-overrides-meta rule. [Google robots directives](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

**llms.txt.** The current v2 proposal permits a root or subpath file; its only
required section is H1. Mandatory blockquotes, H2 sections, minimum link counts
and universal line budgets in the nested method are not those format requirements.
Treat a curated file as an optional agent-navigation aid, not measured citation
uplift or proof of full content coverage. [Proposal](https://llmstxt.org/).

**Brand mentions.** Keep explicit platform scope, entity disambiguation, dated
observations and deduplication. Exclude platform bonuses, follower thresholds and
unverified correlation/multiplier claims as substitutes for observed citations.
A failed search does not establish brand absence. External searches or account
writes require the task's applicable access boundary; this review performed no
platform posting or profile changes.

## Closure and effect

This closes the complete-source-read gap for the six named local files. It does
not close the repository, transitive dependencies or cited empirical studies.
The previous receipt remains a historical record of its narrower pass.
The candidate stays 0.1.31 with unchanged runtime, archive and provenance locks.
Broad research and independent semantic acceptance gates remain open.
