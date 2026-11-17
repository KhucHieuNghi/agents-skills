# Aaron content-quality-auditor: dependency-aware disposition

Checked 2026-11-16 at immutable revision
`8ec9e1f65c8ff55725ffb0d44683633334a8d851`. This supplements the earlier comparison;
it does not review the entire umbrella repository or change any selected source pin.

## Decision

Keep this family **reference-only** for the current custom skill. Do not bundle its
scorer, 80-item weighted profile, refinement loop, runtime hooks or memory workflow.
Its distinction between missing evidence, applicability and execution state is
useful comparison material, but our existing item/check/coverage contracts already
provide that boundary. A second scoring engine adds conflicting state semantics
without being necessary for the customer's single-invocation content audit.

This is an exclusion decision supported by targeted review, not a claim that the
whole upstream is unsafe or poor quality. The root license is Apache-2.0; its
previously reviewed license hash remains unchanged. No upstream prose, code or
catalog was copied into the customer package in this step.

## What was actually inspected

The full entrypoint, root runtime-invocation contract, scoring semantics, auditor
runbook, two local references and 804-line scorer were read. The CORE-EEAT catalog
entry and global semantics were inspected; the validator's relevant state branch,
benchmark and standalone runtime were inspected selectively. The remaining seven
frameworks, hooks, profile resolver, generators, connector code and complete
validator/runtime closure were not reviewed or executed.

The source checkout HEAD matches the pinned revision and remains clean after
three bounded scorer calls. Each call used synthetic typed states in a temporary
directory. No network collector, installer, hook or persistence routine ran.
The GitHub web view failed to load in this pass; source conclusions come from the
existing pinned Git checkout, not from a successful web fetch or a claim about
latest upstream main. See [file hashes and exact scope](content-search-audit-trials/aaron-comparison/source-review.json).

## Architecture and compatibility

[The entrypoint](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/seo-geo/tune/content-quality-auditor/SKILL.md)
operates on one content artifact, with nine declared content profiles and eight
weighted dimensions. It distinguishes this from separate domain and technical
skills. That is not equivalent to our full declared inventory plus cross-item
portfolio audit.

[Runtime invocation](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/references/runtime-invocation.md#L25)
explicitly says a standalone folder lacks root runtime/catalogs. It may collect
observations, but cannot substitute hand-calculated scores or claim persistent
audit results. A complete plugin has further capability-profile machinery.
Importing only the SKILL.md would therefore not import the promised deterministic
behavior. Adding that root runtime is a separate integration project; we do not
claim Codex/Claude compatibility merely from the upstream metadata.

## Conflicts found in reachable guidance

| Case                             | Reachable guidance                                                                                                            | Authoritative implementation                                                                                     | Observed probe                                                                    | Custom-skill consequence                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Missing site context             | Local item-reference line 50 recommends N/A for unavailable site-level items                                                  | Catalog permits N/A only for declared conditional items; A01 is unconditional                                    | A01 set to N/A with a missing-context reason is rejected, exit 1                  | Preserve unknown when evidence is unavailable; do not inherit that local note                      |
| One confirmed veto               | Local recursive-refinement lines 9–12 and stop table describe any veto as terminal BLOCK; its own pseudocode instead uses two | Root runbook and scorer use FIX with a ceiling for one veto                                                      | Complete synthetic profile with C01 fail returns FIX, final 59                    | Exclude conflicting refinement guidance and the score-driven rewrite loop                          |
| Two vetoes plus missing evidence | Entrypoint lines 138/147 give an unqualified unknown → UNDECIDED rule                                                         | Root semantics and scorer explicitly allow BLOCK while NOT_SCORED if two confirmed vetoes determine the decision | C01/R10 fail plus C02 unknown returns DONE/BLOCK/NOT_SCORED with the gap retained | Keep findings, execution state and completeness separate; do not translate DONE into full coverage |

Sources: [item reference](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/seo-geo/tune/content-quality-auditor/references/item-reference.md#L50),
[refinement loop](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/seo-geo/tune/content-quality-auditor/references/recursive-refinement.md#L9),
[scoring contract](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/references/scoring-semantics.md),
[scorer](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/scripts/rubric-score.py#L741).

The root contract explicitly gives the catalog/scorer precedence when prose
conflicts. These are therefore reachable guidance discrepancies, not evidence
that the tested scorer returns the wrong result under its own contract. A host
might resolve them correctly; no native-host behavioral failure is asserted.

The refinement reference also prioritizes lowest weighted contribution. That is
not generally the same as largest recoverable weighted deficit: a 90/100 dimension
with weight .05 contributes 4.5 but can gain only .5, while a 50/100 dimension with
weight .25 contributes 12.5 and can gain 12.5. This arithmetic illustrates why our
remediation order must follow supported user/business impact, not a borrowed
score-tuning rule. It does not establish actual ranking or conversion impact.

## What the probes prove and do not prove

[Results](content-search-audit-trials/aaron-comparison/results.json) retain command,
exit code, full typed output and stderr. Neighboring input JSON and raw stdout /
stderr files permit reproduction against the exact scorer/catalog hashes.
The source labels in every fixture explicitly identify synthetic state input.
`raw-probes.tgz` preserves the original bytes matched by source-review.json;
all ten archived files were extracted and byte-compared. Readable JSON copies
may be formatted without changing those retained raw inputs and outputs.
Passing a structural scorer does not validate the truth of the supplied evidence,
content-quality judgment, score calibration, host behavior or real SEO outcomes.

The three probes discriminate the conflicting policy paths. They are not a
security audit or a comprehensive scorer test suite. No benchmark acceptance,
performance claim, star-count refresh or commercial release follows from them.

## Effect on our implementation and remaining work

No customer package bytes or immutable release archive changed. Keep the five
selected source packages and existing provenance lock. The Aaron comparison now
has a concrete current-bundle disposition; reconsider it only if a future product
requirement specifically needs its weighted publication-gate workflow, after
complete dependency and host evaluation.

Other comparison families retain their own recorded scope and limitations in
[upstream research](content-search-audit-upstreams.md). This decision does not close
all comparison research, the known Claude report issues, native media extraction
or independent commercial acceptance. The current product remains candidate
0.1.23 with those gates open.
