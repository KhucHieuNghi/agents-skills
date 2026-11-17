# Aaron CORE-EEAT benchmark follow-up

## Scope and decision

Candidate **0.1.31** retains Aaron as reference-only. This follow-up completes
textual review of the 801-line CORE-EEAT benchmark and its 34-line framework
annotation at commit `8ec9e1f65c8ff55725ffb0d44683633334a8d851`.
The checkout HEAD and clean working tree were verified. Exact file hashes are in
[the receipt](content-search-audit-aaron-benchmark-review.json).
No upstream code was executed or copied in this follow-up, and no customer
package, component digest or release archive changed.

This supplements [the prior runtime disposition](content-search-audit-aaron-disposition.md).
Its historical candidate version remains historical. It does not close the other
frameworks, linked boundary-example document, external benchmark repository,
hooks or transitive dependencies.

## Useful boundaries in the source

The benchmark explicitly labels its human-anchor revision as **not outcome
calibration**, and the framework as advisory until outcome-calibrated. The
annotation separately says a publication verdict is not a ranking prediction.
These are material limitations supplied by the author, not newly demonstrated
weaknesses in an empirical study.

The current O04 anchor retires a lists-per-500-words quota and judges organization
in context. A05 asks for a declared market, observation window and entity
disambiguation; unavailable observations are unknown rather than automatic
failure. R01/R02 distinguish unavailable evidence from permission to invent data.
Keeping item ownership explicit also helps prevent double-counting one defect
across overlapping dimensions. These principles are useful references for our
evidence discipline; they do not require importing the scoring framework.

## Rules excluded from our general audit contract

| Source anchors                                                                                  | Boundary for our skill                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| C02 first 150 words; C03 at least three secondary intents                                       | Answer placement and breadth depend on intent and format. A complete narrow answer does not fail merely for lacking additional queries. |
| C09 FAQ plus FAQPage; O05 JSON-LD absence                                                       | Do not require every artifact to have a FAQ or structured data. Determine eligibility and actual page purpose before a finding.         |
| R01 precise-data count; R02 citation density and source-type bands; R03 source count            | Evidence must support the claim. Counts do not establish truth, independence or sufficient support. Missing access remains unknown.     |
| R06 age bands                                                                                   | Age alone does not establish inaccuracy. Historical material needs an explicit temporal scope, not an automatic freshness failure.      |
| E02/E04 novelty; E05 original visuals; E09 multiple domains; E10 future focus                   | Useful conditional editorial suggestions are not universal defects in reference, transactional or narrowly scoped material.             |
| Exp01 first-person framing; Exp02 sensory-word count; Exp04 photos; Exp06 problem count         | Do not manufacture personal experience or require these signals for formats where they are irrelevant.                                  |
| Ept01 author-bio length/avatar; Ept03 complexity; Ept06 edge-case count; Ept10 fact-check label | Assess demonstrable expertise and fit for the audience. Presentation markers alone do not establish expertise or verification.          |
| T01 policy/terms presence; T03 HTTPS/no warnings                                                | Record these narrow observations with narrow labels. They cannot certify legal compliance or overall security.                          |
| T07 advertising percentage; T09 fake or absent testimonials                                     | A contextual layout concern requires evidence. Absence of testimonials must not be conflated with fabrication.                          |

The benchmark's engine-preference and extraction generalizations were not
independently established by this review. Do not use them as engine guarantees.
Its schema recommendations also need page-specific and current platform checks
before use. This disposition does not assert that every listed anchor is wrong
within the upstream author's chosen rubric; it rejects turning that rubric into
universal product acceptance criteria.

## Consequence for evaluation and acceptance

A score increase is not evidence of increased ranking, citations, qualified
traffic or revenue. Controlled scorer probes from the earlier review validate
specific typed policy paths only. Textual benchmark review does not add host
execution, outcome calibration or independent accuracy acceptance.

Keep supported findings, unknown evidence, execution status and coverage
separate. Conditional editorial suggestions should be identified as suggestions,
with applicability explained, rather than counted as confirmed defects.
The user's selection of themselves as independent reviewer assigns the review
owner; it is not an acceptance verdict. The candidate remains unreleased pending
the outstanding technical and independent-review gates.

## Pinned source links

- [Benchmark](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/references/core-eeat-benchmark.md)
- [Framework annotation](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/references/wiki/frameworks/core-eeat-annotation.md)
