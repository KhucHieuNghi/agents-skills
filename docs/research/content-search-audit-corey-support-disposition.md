# Additional Corey support methods — bounded review

Five additional entrypoints were read in full at immutable revision
`1f837447b20bb6f0e72d87b80ece1c221c362c7d`. Their complete file inventories and
tree/entrypoint hashes are retained in
[the review receipt](content-search-audit-corey-support-review.json).
The initial checkpoint read entrypoints only. Follow-up reviews now cover all
12 local reference bodies and 40 eval cases across these five families. Evals
were read, not executed; vendor integrations and external lineage remain open.
All five are **reference-only**; no code or method text is copied.

A sixth support comparison, [copy-editing](content-search-audit-copy-editing-reference-disposition.md),
now has a separately verified complete local review: one entrypoint, three references
and nine eval cases. The combined support scope is six entrypoints, 15 local
references and 49 read-only eval scenarios. The original five-family receipt above
is unchanged; [copy-editing's receipt](content-search-audit-copy-editing-review.json)
records its additional files and external-lineage limits. All six remain reference-only.

A seventh comparison, [site-architecture](content-search-audit-site-architecture-disposition.md),
adds four local references and eight read-only eval cases. Its six files were
hash-verified separately. The current combined support scope is seven entrypoints,
19 references and 57 eval cases read, with no upstream eval execution. Prior counts
above retain their checkpoint scope. All seven remain reference-only.

Detailed dispositions:

- [Copywriting](content-search-audit-copywriting-reference-disposition.md): three references, ten eval cases.
- [Competitors](content-search-audit-competitors-reference-disposition.md): two references, eight eval cases.
- [Programmatic SEO](content-search-audit-programmatic-reference-disposition.md): two references, seven eval cases.
- [Analytics](content-search-audit-analytics-reference-disposition.md): three references, eight eval cases.
- [Competitor profiling](content-search-audit-competitor-profiling-reference-disposition.md): two references, seven eval cases.

| Source                                                                                                                                             | Useful comparison                                                                                   | Limits and excluded behavior                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [analytics](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/analytics)                       | Align numerator/denominator windows; distinguish pending cohorts; calculate from rows               | Tracking installation and account mutations exceed read-only audit. Partner naming cites another source whose attribution closure is not reviewed. Do not adopt broad legal claims or turn attributable referrals into total AI influence.        |
| [competitors](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/competitors)                   | Date claims; separate absence of a listing from absence of a feature; preserve legitimate strengths | No fixed number of alternatives, automatic comparison-page publication, ranking guarantee or inferred customer demand.                                                                                                                            |
| [competitor-profiling](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/competitor-profiling) | Keep raw observations and interpretation distinct; retain comparable dated sources                  | Do not import its provider stack or expand authorized sources. Traffic/backlink estimates cannot validate a claimed customer count without a defensible connection between those measures.                                                        |
| [programmatic-seo](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/programmatic-seo)         | Check whether each page answers its intended task and uses correct data                             | No page generation, automatic noindex, blanket ban on duplicate wording, or measured-cannibalization claim based on shared keywords alone.                                                                                                        |
| [copywriting](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/copywriting)                   | Preserve user voice and point-edit scope; identify evidence needed for unsupported claims           | Audit does not authorize rewriting. Style preferences are not authorship tests. Universal CTA requirements and borrowed growth percentages are not our audit rules. Additional Profound-derived techniques require their own review before reuse. |

These comparisons reinforce existing requirements rather than add five installed
skills. The single entrypoint still uses its six internal methods and five
previously reviewed inherited sources. Public competitor assertions fit the
claim/evidence contract; page families fit portfolio/task checks; provider metrics
retain their own scope and denominator contracts.

To test transfer beyond the repeatedly used development dossiers, the new
`tests/fixtures/content-audit/support-methods-holdout/` contains four original
synthetic scenarios with six labeled issues and clean controls. Its labels are
author-written development judgments, not independent acceptance. Creating the
fixture is not evidence that either host handles it correctly; execution and
full-report adjudication are still required.

This closes the named support-entrypoint comparison in Task 1. It does not close
the compound requirement to review all selected references/scripts or certify
excluded packages. No runtime, frozen archive, model metadata or upstream pin
changes in this checkpoint.
