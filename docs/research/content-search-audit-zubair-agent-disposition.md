# Zubair specialist agents: detailed comparison

Reviewed 2026-11-16 at immutable revision
`989cae01e8ebbc42a9ec798eb9e7cb423f5ec89c`. All five files under `agents/`
were read completely (1,580 lines); their hashes, root MIT notice and remaining
dependencies are recorded in the [review receipt](content-search-audit-zubair-agent-review.json).
No upstream code, installer or dependency was executed. This extends the earlier
[orchestrator review](content-search-audit-orchestrator-disposition.md), without
changing its reference-only decision or the five inherited method packages.

## Decisions by specialist

| Agent             | Useful comparison method                                                                                                               | Excluded from our audit contract                                                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI visibility     | Preserve content blocks and report failed external observations explicitly; separate crawler checks from content inspection            | Weighted checklist as measured visibility, top-five-block average as whole-page quality, Wikipedia/platform point bonuses, universal llms.txt creation, training-bot access penalties                                  |
| Content           | Record source structure, supported claims, audience, caveats and dates; distinguish absent evidence from observed facts                | Numeric expertise/authority from missing biographies, AI-authorship likelihood from style, universal word/paragraph thresholds, invented topic-coverage percentages, automatic two-year stale label                    |
| Schema            | Capture raw markup separately from stripped prose; distinguish syntax, vocabulary, feature eligibility and visible-content consistency | Universal Organization/Person/speakable/SearchAction additions, arbitrary sameAs counts, non-JSON-LD penalties, unsupported most-important-GEO claims and stale rich-result instructions                               |
| Platform analysis | Keep each platform/surface and missing observation distinct                                                                            | Inferring top-ten ranking from page quality, undocumented platform preference weights, strongest/weakest engine ranking based on checklist scores, assumed community-mention expiry                                    |
| Technical         | Preserve status/headers, distinguish raw from rendered content, and label static performance observations as unmeasured                | Generic character-count/case/depth penalties, framework markers as proof of complete rendering, all-engine invisibility claims, missing headers as demonstrated vulnerabilities, scores masquerading as ranking impact |

These are selection decisions for this product, not claims that every upstream
heuristic is useless in every context. Descriptive word counts, schema inventories
and potential performance issues may be useful evidence when properly measured.
They do not supply universal defect thresholds or observed search outcomes.

## Primary-source corrections

**Crawler roles.** The visibility agent describes GPTBot as serving training and
ChatGPT search, while its platform agent partly separates those purposes. The
current official contract distinguishes OAI-SearchBot for search, GPTBot for
training and ChatGPT-User for user-triggered activity. Consequently, blocking
training cannot by itself justify a search-visibility deduction.
[OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

**AI visibility versus a checklist.** We reject the conversion from weighted
readiness checks into measured visibility or citation likelihood. Google states
that its AI features require no special AI files or schema. Actual visibility
still needs observations of the named surface and cohort; page structure cannot
substitute for them. [Google AI features](https://developers.google.com/search/docs/appearance/ai-features).

**Schema freshness.** The specialist still recommends WebSite/SearchAction to
enable a sitelinks search box. Google removed that feature starting November 21,
2024, while retaining the separate WebSite site-name use. Existing unsupported
markup is not automatically harmful or a reason to delete unrelated WebSite data.
[Google announcement](https://developers.google.com/search/blog/2024/10/sitelinks-search-box).
Its FAQ guidance also stops at the old government/health restriction: Google's
current changelog records that FAQ rich results stopped appearing on May 7, 2026.
This concerns Google's display feature, not the validity or usefulness of FAQ
content itself. [Google documentation updates](https://developers.google.com/search/updates).

**Schema applicability.** Google documents speakable for a narrower news/TTS
use case and English/US availability, not every content page or AI engine.
Google also supports valid JSON-LD, Microdata and RDFa; implementation preference
does not justify a correctness penalty for the other formats.
[Speakable](https://developers.google.com/search/docs/appearance/structured-data/speakable),
[supported formats](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).

**Content quality.** Google explicitly rejects a preferred word count and warns
against changing dates to appear fresh without substantive changes. We assess
task completeness and whether changing claims remain applicable. We do not import
the agent's under-300-word defect rule or treat a missing date as stale content.
[Helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
Its qualified AI-authorship labels remain unsuitable for our evidence model:
style observations can support an editorial comment, not establish provenance.

**Entity matching.** The embedded Wikipedia probe inspects only the first search
result and tests whether its title contains the brand string. That can miss a
later correct result or match an unrelated entity. This is a direct inference
from the code, not an executed accuracy test. MediaWiki's search API returns
title/content matches; it is not a brand-identity verifier. Preserve candidates,
disambiguation and uncertainty. [MediaWiki API](https://www.mediawiki.org/wiki/API:Search).

## Implementation and evaluation effect

The existing candidate already separates observed GEO metrics from readiness,
does not impose universal answer lengths, rejects authorship proof from detectors,
and requires evidence for semantic conclusions. This review adds no package code,
runtime, score or customer-visible entrypoint. It strengthens the documented reason
for excluding this family from the inherited bundle.

Relevant adversarial controls for future semantic evaluation include a short but
complete answer, an accurately dated historical source, allowed search with blocked
training, valid Microdata, an unobserved AI surface, ambiguous brand search results,
and unsupported rich-result advice. This list proposes controls; it does not claim
they were all newly executed or accepted in this review.

## Remaining closure

The AI-visibility agent names four nested skills; the schema agent calls the
Claude-specific `fetch_page.py` path. Those nested skill bodies, the complete
506-line fetcher and transitive Python dependencies are not cleared by this pass.
Content Signals drafts, Cloudflare configuration claims, platform sourcing claims
and each Schema.org type contract also need separate review before reuse.
No dependency is silently inherited through these references. Full repository
closure remains false, and the broad Task 1 checkboxes remain open.

Follow-up: the [nested/runtime review](content-search-audit-zubair-runtime-disposition.md)
now records complete reads of the four named nested skill files, fetcher and
requirements manifest. Transitive dependencies and broader closure remain open.
