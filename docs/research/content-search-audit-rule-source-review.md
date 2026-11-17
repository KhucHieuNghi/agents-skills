# Rule-specific primary-source review

Current follow-up: [0.1.22 source reconciliation](content-search-audit-source-reconciliation-0122.md). The chronology and earlier fixture-gap labels below are retained as historical evidence.

Reviewed 2026-11-16 against current primary documentation. This addendum supplements
the chronological upstream review; it does not rewrite a frozen candidate or imply
that every rule has completed source closure. Candidate 0.1.4 often links broad
Google AI-feature/helpful-content pages where a more specific reference is useful.
The table records the direct source and the bounded claim it can support. Apply
these mappings in a subsequent reviewed package revision, with a new digest.

| Rule                                     | Direct primary source                                                                                                                                    | Supported audit boundary                                                                                                                                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seo-response`                           | [Google crawler HTTP status handling](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)                                     | Captured response codes describe transport and processing inputs; our successful fetch is not observed indexing. Redirect types and engine behavior must not be reduced to one universal hop limit.                                                                           |
| `seo-canonical`                          | [Canonical selection signals and declarations](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)                   | Compare intended and declared canonical signals, avoid contradictory declarations, preserve locale context. A declaration is not proof of Google's selected canonical. Do not use robots blocking as canonicalization.                                                        |
| `seo-locales`                            | [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)                                               | For actual alternate pages, inspect fully qualified URLs, self references and reciprocal relationships. HTML, HTTP headers and sitemaps are alternative mechanisms. Do not require a nonexistent translation.                                                                 |
| `seo-metadata`                           | [Title links](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet) | Review descriptive, page-specific titles/descriptions against actual content. Google may generate different title links and snippets. Do not infer observed appearance or a guaranteed ranking change from source metadata alone.                                             |
| `seo-internal-links`                     | [Crawlable links and anchor context](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)                                        | Inspect actual destinations and descriptive context. Static anchor markup and dynamically inserted anchors require appropriate capture modes. No ideal fixed link count; incomplete discovery cannot establish orphan status.                                                 |
| `quality-accessible-media`               | [W3C WAI alt decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)                                                                      | Evaluate the image's purpose in context: informative, functional, redundant or decorative. Empty alt can be correct; complex information may need an equivalent elsewhere. This source does not establish transcript completeness or a full accessibility conformance result. |
| `seo-index-controls`                     | [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)                                                             | Compare meta and HTTP directives with intent. The crawler must be able to access the directive; robots blocking can prevent that. A local capture does not establish when an engine processed a change.                                                                       |
| `seo-structured-data`                    | [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)                                      | Check that markup represents visible content and meets the relevant feature requirements. Syntax validity, content consistency, eligibility and observed appearance are distinct; even eligible markup does not guarantee a rich result.                                      |
| `quality-accessible-media` (audio/video) | [W3C WAI transcripts](https://www.w3.org/WAI/media/av/transcripts/)                                                                                      | Distinguish basic speech/non-speech transcripts from descriptive transcripts including necessary visual information. Applicable conformance requirements depend on live/prerecorded and audio/video context. A URL or caption file alone does not prove equivalent content.   |

## Review observations

The previous Google HTTP documentation URL redirects to the Crawling Infrastructure
documentation. Retain the current destination above in future rule mappings. The
canonical documentation explicitly distinguishes declarations/signals from selection;
the localized-versions page requires bidirectional relationships for interpreted
pairs, with qualifications for partial sets. A simplistic every-language-to-every-
language hard failure would lose those qualifications.

The WAI source is more directly applicable to image alternatives than a generic
helpful-content page. Its decision tree explicitly does not cover every case.
The transcript source supplements image guidance; caption-specific evaluation and actual media equivalence still require suitable evidence.

No wording, script or example was copied into the customer package in this review.
These are original short interpretations for audit design, not evidence that the
host correctly applied the rules to a customer page. Live host evaluation remains
separate. Other rule mappings, source freshness and final provenance closure remain
open until explicitly reconciled with the packaged registry.

## Complete registry reconciliation, 2026-11-16

Inspected the current 26-rule registry and its method references after candidate
0.1.5. This is the proposed source disposition for the next package, not a claim
that the current archive already includes these mappings. Every current rule ID
appears below exactly once. No rule is promoted into a proven ranking factor.

| Rule                       | Source disposition                                                                             | Interpretation boundary                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `quality-task-fit`         | Retain helpful-content guidance as context                                                     | Audience tasks must come from customer evidence.                                                       |
| `quality-claims`           | Retain helpful-content guidance as context                                                     | Actual verification uses claim-specific sources, not general SEO advice.                               |
| `quality-freshness`        | Retain helpful-content guidance as context                                                     | Evaluate changing facts; neither age nor a changed date proves quality.                                |
| `quality-accessible-media` | Replace with the WAI image and transcript references above                                     | Assess purpose and equivalent information; no blanket alt requirement or whole-site conformance claim. |
| `quality-readable-text`    | Label explicitly as an original collection diagnostic                                          | Nonempty extraction is a local invariant, not a Google quality requirement.                            |
| `seo-response`             | Replace with direct HTTP source above                                                          | Successful final transport does not establish indexation.                                              |
| `seo-index-controls`       | Use direct noindex source and current preview-control documentation                            | Preserve publisher intent and distinguish index from snippet controls.                                 |
| `seo-canonical`            | Replace with direct canonical source above                                                     | HTTP declarations can apply to non-HTML; source format alone does not justify NA.                      |
| `seo-metadata`             | Replace with title-link and snippet sources above                                              | No universal length or query-position gate.                                                            |
| `seo-internal-links`       | Replace with crawlable-link source above                                                       | Retain graph scope; incomplete graph cannot prove an orphan.                                           |
| `seo-structured-data`      | Replace with direct policy source above                                                        | Verify feature-specific current documentation before prescribing markup.                               |
| `seo-locales`              | Replace with direct localized-versions source above                                            | Assess actual variants and relevant relationship subsets.                                              |
| `seo-rendering`            | Use JavaScript SEO basics below                                                                | Local DOM evidence is distinct from Google's observed rendering.                                       |
| `aio-crawler-policy`       | Retain OpenAI bot reference; add Google AI-feature context for Google surfaces                 | Provider-specific control; no universal allow-all recommendation.                                      |
| `aio-entity-consistency`   | Remove bot documentation as support for entity consistency; retain upstream method attribution | Customer entity records support claim comparison; bot docs do not validate this method.                |
| `aio-retrievable-facts`    | Use Google textual-content guidance only as context; retain original diagnostic label          | Readability does not establish actual retrieval or a citation advantage.                               |
| `aeo-question-coverage`    | Retain helpful-content context plus upstream method attribution                                | Actual question-set provenance is essential; inferred demand stays hypothetical.                       |
| `aeo-answer-context`       | Retain helpful-content context plus original method label                                      | Evaluate prerequisites and qualifications, not a prescribed answer word count.                         |
| `aeo-answer-evidence`      | Retain helpful-content context; require claim-specific evidence                                | Attractive formatting does not verify a statement.                                                     |
| `geo-observed-presence`    | Retain pinned Profound method attribution                                                      | Exact response capture, surface and denominator are required.                                          |
| `geo-answer-accuracy`      | Retain pinned Profound method attribution                                                      | Adjudication uses dated claim sources, not sentiment or vendor reputation.                             |
| `geo-cohort-validity`      | Retain pinned Profound method attribution                                                      | Sampling method is not a platform guarantee or population estimate.                                    |
| `portfolio-task-gaps`      | Retain pinned Corey method attribution                                                         | Competitor topics alone do not demonstrate customer demand.                                            |
| `portfolio-duplication`    | Retain method attribution, label comparison as proposed diagnostic                             | Similarity is not proven cannibalization or authority to redirect/delete.                              |
| `portfolio-contradictions` | Retain method attribution, require authoritative entity evidence                               | Compare compatible date, product, jurisdiction and market scopes.                                      |
| `portfolio-journey-links`  | Retain method attribution, require audience and graph evidence                                 | Navigation proposals do not prove conversions or ranking gains.                                        |

### Additional primary documents checked

[JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
explains separate crawling, rendering and indexing stages. Initial HTML may omit
script-generated content. Our audit therefore needs capture-mode labels and must
not turn missing rendered evidence into a negative content finding. A local
renderer is still not Google's renderer or an index observation.

[Helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
supports audience usefulness, source support and factual care as assessment
context. It does not define this registry's pass/fail thresholds, a universal word
count or an authorship detector. Our extraction check and question/portfolio
methods remain original or attributed audit methods, not official scoring rules.

[Google AI-feature guidance](https://developers.google.com/search/docs/appearance/ai-features)
keeps normal SEO foundations applicable and distinguishes eligibility from actual
appearance. It does not require special AI files or schema. It supports checking
textual availability, but does not establish that entity consistency or a preferred
answer format produces citations. Search Console's aggregate Web reporting must
not be relabeled as an isolated AI-feature measurement without suitable evidence.

### Packaging action

Apply direct references and explicit method classifications together in a new
candidate; update original-file digests and installation locks through the normal
release build. Retain all 26 rule IDs and evidence requirements unless a separately
reviewed behavior change is justified. Add the non-HTML canonical and AI-authorship
cases to semantic evaluation before treating host behavior as accepted. This
source reconciliation does not itself close those behavior tests.

## Applied to candidate 0.1.6

The proposed mappings are now applied to registry version 0.1.1 in candidate
0.1.6. The registry preserves all 26 rule IDs, modes and required evidence sets.
Evidence-tier wording distinguishes original diagnostics, attributed methods and
direct primary documentation. The canonical rule and technical method explicitly
cover non-HTML HTTP Link declarations and preserve uncertainty when headers or
intent are missing. No new authorship detector or scoring algorithm was added.

The additional [robots and preview-control specification](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
was checked directly for the index-controls rule. It distinguishes HTML metadata,
HTTP response controls and text-level snippet controls; crawlers need access to
read the applicable declarations. Platform processing remains separate from our
local observation. An initial shortened URL did not resolve and was corrected
before freezing the candidate.

Only rules/core.json, rules/README.md and the technical SEO method changed inside
the package, plus their provenance digests. Five upstream source pins and license
notices remain unchanged. Native interpretation trials and installation receipts
are recorded separately; updated links alone do not establish semantic accuracy.
