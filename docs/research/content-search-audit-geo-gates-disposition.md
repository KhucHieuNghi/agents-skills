# TheSmokeDev and Gaguero: measurement and quality-gate disposition

Checked 2026-11-16. Decisions apply to the current customer bundle, not every
skill in either repository. Both families remain **reference-only**; do not import
scoring/causal shortcuts, crawler advice, publication gates or their scripts.
Current package and selected five-source provenance remain unchanged.

## TheSmokeDev geo-measurement

Pin: `35810d3ee8aa6cf1de151c9ea79265237c71df7b`.
The complete [selected entrypoint](https://github.com/TheSmokeDev/geo-skills/blob/35810d3ee8aa6cf1de151c9ea79265237c71df7b/skills/geo-measurement/SKILL.md)
was reread. It is the only file in its skill folder. Linked fanout/index/video/
comparison skills and vendor studies are outside this review; they are not
implicitly inherited. Root MIT review is recorded in the prior source snapshot.

Useful comparisons: freeze and version a prompt panel, separate engines, preserve
citation-rate and citation-instance-share denominators, retain co-citation data,
and repeat observations before interpreting volatility. Our measurement contract
already implements scope and denominator separation; this does not require a new
customer invocation or upstream runtime.

Reject unconditional normalization and causal claims. The supplied procedure
says panel-wide decreases identify a platform event and treats share as comparable
through volume changes. Original arithmetic controls demonstrate the limits:

| Synthetic case                            | Before         | After               | Interpretation                                        |
| ----------------------------------------- | -------------- | ------------------- | ----------------------------------------------------- |
| Other citations fall; own count unchanged | 10 / 100 = 10% | 10 / 50 = 20%       | Share doubles without an increase in own citations    |
| Uniform proportional reduction            | 10 / 100 = 10% | 5 / 50 = 10%        | Share is invariant under this specific common scaling |
| No citations observed                     | 10 / 100 = 10% | 0 / 0 = unavailable | Zero denominator is not a measured zero share         |

These are mathematical counterexamples, not observed engine performance or an
empirical refutation of the cited vendor datasets. A fixed prompt set does not
ensure stable retrieval, completion/missingness, answer length or citation mix.
Capture raw counts, denominators, observation coverage and share together; explain
changes without claiming causality from a common trend. Three consecutive runs
are not a universal significance test; panel size and repeat count need a
sampling/precision rationale. Do not inherit fixed 60–100+ prompts, 4–8 weeks,
universal position CTR multipliers or title/slug-versus-index diagnoses without
case-specific evidence. No numerical vendor claim is promoted to a product rule.

The entrypoint's exclusive Bing-index framing for ChatGPT is not an adequate
current access model. [OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots),
reopened for this review, distinguishes search, training and user-triggered agents;
use those scoped controls rather than inferring a whole retrieval architecture
from one index provider.

## Gaguero SEO Quality Gates and AI Search Optimization

Pin: `43a9e14a6c7257af3996e158a238ac5968ab7ca5`.
Read both complete entrypoints/contracts/references, the quality linter, diff gate
and report schema. Source hashes and scope are in the linked receipt below.
No other sibling skill, publisher integration or host execution is certified.

Useful comparisons: do not invent facts; distinguish observations from unavailable
evidence; require explicit intent for consequential live changes; keep warnings
separate from blockers. Our audit already preserves these constraints and does
not publish changes. A publication gate's DO_NOT_SHIP is not equivalent to our
collection blocked, failed content check, or incomplete coverage state.

### Four controlled CLI probes

| Probe                                    | Actual result                    | Integration implication                                                                               |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Add noindex meta in a synthetic diff     | exit 1, BLOCK                    | Positive pattern detected                                                                             |
| Delete the same noindex meta             | exit 0, PASS                     | Removal is not detected by the plus-line pattern; process success is not a complete SEO change review |
| Dictionary text explaining “placeholder” | exit 1, placeholder ERROR        | Literal matching lacks quotation/intent context                                                       |
| Short actionable help instructions       | exit 0 with thin-content warning | Warning is heuristic; short length does not establish deficient task fulfillment                      |

The scripts explicitly describe themselves as heuristics and still require
judgment. These probes establish narrow behaviors, not a claim that the upstream
agent necessarily makes the corresponding wrong final decision. No real page or
production directive changed; every fixture is authored synthetic content.

### Schema integrity is not decision integrity

Using the repository's installed Ajv 2020 validator, both an empty SHIP report and
a SHIP report containing a BLOCK gate pass the supplied schema. It validates
shape but does not enforce gate enumeration, nonempty coverage or cross-field
verdict consistency. This does not prove its host will generate those reports;
it proves the schema alone cannot certify them. Our existing semantic validator
and coverage reconciliation cannot be replaced by that schema.

### Provider and policy corrections

The AI-search entrypoint groups training and search controls too broadly. Its
reference does distinguish OAI-SearchBot from GPTBot, but other wording associates
Google AI Overviews/AI Mode with Google-Extended. Current official documentation
must determine the affected product, rather than choosing whichever paragraph is
most permissive. OpenAI permits separate search and training preferences; allowing
training is not a prerequisite for search visibility. [OpenAI crawler roles](https://developers.openai.com/api/docs/bots).

Google-Extended governs the documented Gemini/Vertex uses and does not control
Google Search inclusion or ranking. Googlebot preferences affect Search features.
Do not recommend changing Google-Extended merely to enable AI Overviews or AI
Mode in Search. [Google crawler controls](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers).

A blanket hidden-content violation also exceeds the policy. Google's spam guidance
explicitly allows ordinary interactive accordions/tabs and accessibility-oriented
screen-reader text. A CSS occurrence alone needs purpose and rendered evidence
before classification as abuse. [Google hidden-text policy](https://developers.google.com/search/docs/essentials/spam-policies#hidden-text-and-link-abuse).

## Evidence, reproduction and product effect

[Source-review receipt](content-search-audit-trials/geo-gates-comparison/source-review.json)
records immutable upstream file hashes and clean checkouts.
[Gaguero CLI outputs](content-search-audit-trials/geo-gates-comparison/gaguero-results.json)
retain exact commands, exit codes and output; sibling input files reproduce the
checks. [Schema cases](content-search-audit-trials/geo-gates-comparison/schema-results.json)
retain both inputs. [Measurement controls](content-search-audit-trials/geo-gates-comparison/measurement-counterexamples.json)
retain explicit arithmetic and synthetic labels.

`raw-probes.tgz` preserves the original regular-file bytes; all were extracted and
compared. Readable JSON copies may be formatted. No new benchmark acceptance,
license clearance for imported code, native host result or commercial release is
claimed. The source selection decisions for these two families are now explicit;
AgriciDaniel and Zubair comparison dispositions and native semantic acceptance
remain separate open work.

Follow-up: the [linked measurement workflow review](content-search-audit-smoke-linked-disposition.md)
now covers all four directly named TheSmokeDev sibling entrypoints (720 lines).
Further transitive sources remain excluded; the original pass scope above is historical.
