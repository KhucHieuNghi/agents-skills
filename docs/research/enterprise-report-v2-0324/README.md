# Candidate 0.3.24 — versioned report presentation

This development candidate addresses the real-data mobile presentation issue found in the [public performance pilot](../enterprise-performance-public-20261119/README.md). It does not change audit assessments or complete enterprise release acceptance.

New reports default to HTML renderer V2. Historical manifest V1 selects the frozen V1 renderer; V2 declares an explicit rendering identity. Both versions regenerate and validate full artifact bytes, including HTML/CSP/manifest. Canonical report schema/tool semantics stay at version 1. For the same input model and edition, JSON and Markdown bytes are identical between renderers.

`enterprise-report-render SOURCE NEW_DIRECTORY` first validates the source report and then writes the current presentation into a fresh directory. It preserves edition, canonical bytes, revision and assessment timestamps. It does not reassess evidence, restore live collector authority, change review decisions, or authorize publication. Existing destinations are refused. The old report remains unchanged.

## Readable evidence without changing claims

Narrative prose is visible at full content width. Findings, checks, measurements and data requests use labeled records; comparison coverage remains a table. Evidence references use keyboard-operable native disclosures and individual links to stable evidence-index anchors. All identifiers remain available. Conclusions, unknown states and limitations are not collapsed. Public editions still withhold customer details.

At 390px, the frozen Quokka narrative section decreased from **27,332px to 2,023.6px**, approximately **92.6%**, with all narrative text retained. The full detailed document remains long (60,586px versus the original 62,984px); this is a prose/readability improvement, not a claim that the entire report became 92.6% shorter. Sections remain directly reachable through navigation.

## Customer projections

These preserve the exact JSON/Markdown of their V1 inputs. A presentation upgrade does not make old observations current or change pending review status.

| Scope                                   | V2 HTML                                              | Canonical JSON                                       | Markdown                                         |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Cake                                    | [HTML](frozen/reports/cake.vn/report.html)           | [JSON](frozen/reports/cake.vn/report.json)           | [MD](frozen/reports/cake.vn/report.md)           |
| Infinity original www                   | [HTML](frozen/reports/infinity.racing/report.html)   | [JSON](frozen/reports/infinity.racing/report.json)   | [MD](frozen/reports/infinity.racing/report.md)   |
| QuokkaGuide                             | [HTML](frozen/reports/quokkaguide.com/report.html)   | [JSON](frozen/reports/quokkaguide.com/report.json)   | [MD](frozen/reports/quokkaguide.com/report.md)   |
| VBA                                     | [HTML](frozen/reports/vba.vn/report.html)            | [JSON](frozen/reports/vba.vn/report.json)            | [MD](frozen/reports/vba.vn/report.md)            |
| Infinity separate destination follow-up | [HTML](frozen/reports/infinity-followup/report.html) | [JSON](frozen/reports/infinity-followup/report.json) | [MD](frozen/reports/infinity-followup/report.md) |

## Verification and review

Seven focused tests cover exact V1 bytes, deterministic V2, canonical parity, manifest dispatch, modified-HTML rejection despite recomputed hashes, evidence links/escaping, public redaction, the CLI and V1-parent/V2-child revision. Initial red runs exposed missing V2/CLI behavior. The existing report regression also caught pale-accent text contrast; V2 retains safe text colors. The new parent test initially used an invalid equal generation timestamp; its fixture now respects the existing increasing-time contract.

Sixteen offline browser cases cover four real report inputs (including the original Cake findings), customer/public editions and 390/1440px widths. They validate exact narrative text, evidence membership per narrative/measurement/finding, counts, unique destinations, native disclosure keyboard behavior, skip navigation, page overflow, enlarged body text, no scripts/external requests and public withholding. These are bounded interaction checks, not WCAG conformance or universal usability certification. See [browser receipts](frozen/browser-checks.json) and [mobile narrative screenshot](frozen/screenshots/quokkaguide.com-390-narrative.png).

Independent source reviewer `enterprise_contract_review` found no important rendering defect and verified frozen V1 byte identity, validation/edition boundaries, evidence mapping, escaping/CSP and source-digest inventory. Its suggested public-load and per-record membership checks are exercised by the browser harness. Package and CLI evidence are recorded separately.

[Package receipts](package-receipts.json) bind the versioned archive. Fresh projects for Codex and Claude Code were installed from its extracted contents and exercised V1 validation, V2 rendering/loading, canonical parity and immutable destinations. These are installed-script checks, not native host behavioral trials or commercial acceptance. No model is pinned, no customer website was changed, and no deployment occurred.

Final repository checks passed: 134 files / 1,622 tests, format, lint, typecheck, build, site typecheck and site tests. [Independent review](independent-review.json) includes the separate CLI/package review; [verification](verification.json) records the bounded checks. No native agent behavioral trial was added in this checkpoint.
