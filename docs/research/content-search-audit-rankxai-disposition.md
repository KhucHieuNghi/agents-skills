# RankXAI content-review: method and runtime disposition

Reviewed 2026-11-16 at `cba1bc61c981a8d9dcee6f1d211a8f18c74277c3`.
Decision: retain as **reference-only** for the current bundle. Source verification
and denominator discipline are useful comparisons; do not import its scripts,
style gates, universal quantitative heuristics, draft score or rewrite workflow.
No package bytes or selected source pins changed.

## Review boundary

Read the complete content-review entrypoint, full-audit and writing references,
check-sources and check-overlap scripts, their shared CLI/HTML helpers and the
content parser/heuristics module. Those files close the imports of the scripts
used in the probes below. The prose linter, tell/myth datasets, linked SEO/GEO
research data and other repository tools were not fully reviewed in this pass.
Their historical inspection scope remains in the earlier comparison snapshot.

The pinned checkout remains clean. Four controlled probes used authored local
fixtures and mocked fetch responses; no external HTTP request was made. This is
not a full upstream security review or native-host acceptance test. The earlier
MIT/NOTICE review still applies; code reuse would require a separate complete
provenance and attribution review, including the noted SlopMonster attribution.

## Useful method versus automatic rule

| Capability            | Useful contribution                                                    | Boundary for our single audit skill                                                                                              |
| --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Round-trip sources    | Read the cited sentence and its source, not just HTTP status           | Existing immutable evidence and quote verification remain authoritative; a live URL is not proof of support                      |
| Temporal claims       | Preserve measurement window separately from publication date           | Recheck based on claim volatility and scope; a fixed one-month rule is not universal evidence of staleness                       |
| Denominators          | Distinguish answers, citations, brands, URLs, requests and populations | Inspect the measure definition; percentage sums alone cannot classify a measure                                                  |
| Contradictory studies | Compare samples, windows and methods before declaring contradiction    | A changed method can prevent comparison; do not call a newer sample a factual correction to a correctly scoped historical result |
| Advice review         | Test recommendations as claims with explicit verification              | Preserve prerequisites, qualifiers and uncertainty; no improvement guarantee                                                     |
| Passage overlap       | Generate candidate pairs for human/semantic review                     | Lexical similarity does not prove harmful duplication or keyword cannibalization                                                 |
| Writing review        | Flag potentially unclear or repetitive passages                        | Style is not authorship detection; do not label content AI-written from punctuation, parallelism or word lists                   |
| Full audit            | Separate research and assessment steps                                 | Its rewrite phase is excluded: our audit produces proposals, not source edits or publication                                     |

These are comparison conclusions, not newly bundled derived content. Our current
five-source package already implements source/evidence/measurement boundaries;
adding another runtime solely to increase the upstream count is unnecessary.

## Runtime findings and controlled evidence

### Exit zero is not complete source verification

The [source checker](https://github.com/rankxai/seo-geo-skills/blob/cba1bc61c981a8d9dcee6f1d211a8f18c74277c3/skills/content-review/scripts/check-sources.mjs)
returns exit 0 for one 200 response plus one 429 response. JSON correctly retains
one alive and one unknown, so this is not concealed uncertainty. Its exit contract
means no dead link was found, not every source was checked. An integration that
uses only the process status would lose that distinction.

A second mocked case verifies the useful HEAD fallback: HEAD 404 is retried with
GET; GET 200 is recorded as alive rather than a dead citation. Both probes intercept
fetch in-process and retain method/redirect call logs. They test classification,
not real DNS, redirects, server behavior or source truth.

The source checker calls fetch directly with automatic redirects. The shared
fetchPage helper has protocol, timeout, body and redirect limits, but it is not
the path used by probeSource. Neither inspected path supplies our origin allowlist
and resolved-address policy. Therefore these scripts cannot replace the existing
custom collector unchanged. No private endpoint was contacted to demonstrate this.

### Numeric coincidence is not claim support

The [content helper](https://github.com/rankxai/seo-geo-skills/blob/cba1bc61c981a8d9dcee6f1d211a8f18c74277c3/skills/content-review/scripts/lib/content.mjs)
intentionally treats a matching number in any link or sources section as a possible
source. A synthetic unsupported 42% treatment statement plus an unrelated link
containing 42 produces zero unsourced-figure warnings. Its own comments disclose
that generosity and require semantic review. The probe confirms why a linter pass
must never become a supported-claim verdict in our evidence model.

### Directory arguments are not authorization roots

The overlap command follows a `.md` symlink to an authored sibling file outside
the supplied directory. With identical controlled passages it counts both files
and produces overlap 1.0 / exit 1. This shows absence of our root-containment
contract in this code path; it is not a claim that upstream promised such a
boundary, or that real private data was exposed. Our collector must retain its
own resolved-path checks, byte budgets and inventory accounting.

The same result also illustrates the semantic limit: a repeated notice could be
required or appropriate. Similarity establishes shared wording; deciding which
page to consolidate requires intent, audience, ownership and observed effects.

## Quantitative and editorial rules not inherited

The entrypoint's proposed inference that percentages not summing to 100 must be
rates rather than shares is too broad. An incomplete category list may sum to
70%; three rounded one-third shares may sum to 99.9%; overlapping respondent
categories can exceed 100%. Inspect exclusivity, exhaustiveness, unit and rounding
before interpreting the total. These are arithmetic counterexamples, not a claim
about the correctness of the vendor study cited upstream.

Exclude fixed first-150-word answers, mandatory counts of statistics/new assets,
blanket paragraph/word thresholds, a universal one-H1 gate, final /10 quality
scores and any inference of machine authorship from prose style. They may be
editorial choices for a particular brief, but are not universal failures across
product pages, policies, support content, transcripts and multilingual material.
Google's [people-first guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
was reopened in this pass: it explicitly rejects a preferred word-count target and
frames quality around purpose, audience, helpfulness and reliable sourcing. This
does not mean every numeric editorial convention is harmful; its applicability
must be justified for the actual artifact.

The writing reference discusses Unicode broadly while the shared implementation
includes script-sensitive exceptions. Do not import blanket claims that invisible
characters have no legitimate use; multilingual and bidirectional text require
context. The complete prose-linter path remains unreviewed here.

## Evidence and reproduction

- [Source hashes and scope](content-search-audit-trials/rankxai-comparison/source-review.json).
- [Four probe results](content-search-audit-trials/rankxai-comparison/results.json).
- `mock-source.mjs.txt` and `pure-probes.mjs.txt`: exact authored harnesses.
- `raw-probes.tgz`: original regular-file inputs, outputs and harness bytes;
  extracted and byte-compared. JSON copies may be formatted.

The controlled symlink is described in source-review.json rather than archived.
The first archive extraction correctly refused its absolute target; the final
archive excludes symlinks and preserves the authored target bytes. Recreate the
link only inside a new controlled temporary fixture when reproducing the probe.
No target source files or upstream files were edited.

## Product decision and remaining gates

Close the current-bundle RankXAI runtime selection decision as reference-only.
Do not call the whole repository reviewed, approved, installed or compatible.
Any future claim-lint or overlap feature must operate inside our existing scope,
snapshot and budget contracts, preserve unknowns, and be evaluated on clean
controls as well as defects. Existing semantic report errors, remaining comparison
families and independent acceptance stay open. Candidate remains 0.1.23.
