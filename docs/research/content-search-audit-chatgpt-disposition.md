# Former Codex SEO URL — current comparison decision

The former URL now redirects to
[AgriciDaniel/chatgpt-seo](https://github.com/AgriciDaniel/chatgpt-seo).
The inspected checkout is pinned to
[`b9dd5c8fab722c7610184927a902ca689165d322`](https://github.com/AgriciDaniel/chatgpt-seo/tree/b9dd5c8fab722c7610184927a902ca689165d322).
This resolves the remaining repository identity in the original design; it does
not establish compatibility with our supported hosts.

The repository's transition document distinguishes the replacement ChatGPT
package from the historical Codex implementation. Its stated legacy commit is
`9a644f68d39d242a7a41a0017f7286dd0512fc3b`; that tag was not independently fetched
in this review. Current notices distinguish MIT code/workflows, the CC BY 4.0
FLOW adaptation and separate artwork/branding rights. A root MIT label therefore
must not be treated as clearance for every asset or the legacy implementation.

Thirteen documents were read: root license/notice, transition, package notice,
router/audit entrypoints, operating/runtime/scoring contracts, technical/editorial/
schema references and the audit template. Exact paths and hashes are in
[the source receipt](content-search-audit-source-closure-0126.json).
Scripts and transitive reference trees were not reviewed or executed.

| Observed design choice                                                | Decision for our product                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Evidence-level labels, source/render separation, access-intent checks | Useful comparison with our existing evidence contract; no new inheritance claimed                                |
| Bounded representative site sampling                                  | Different default from our full declared-inventory requirement; do not substitute it for complete accounting     |
| Router reads other packaged skills                                    | Do not import that discoverable multi-skill surface; our customer still invokes one custom skill                 |
| Optional weighted diagnostic scoring                                  | Do not import the scorecard; our product reports findings, coverage and explicit unknowns                        |
| File-reader failure distinguished from missing resource               | Relevant comparison for method-loading reliability; not proof that our observed Claude workflow failure is fixed |
| Host-specific runtime and mixed attribution boundaries                | Exclude the current runtime and legacy implementation from the bundle                                            |

Decision: **reference-only**. No files copied, no runtime dependency or new host
target added, and no claim of full repository review. Existing reviewed source
pins remain unchanged. Any future adaptation requires its own selected-file,
license and dependency review rather than inheriting this comparison verdict.
