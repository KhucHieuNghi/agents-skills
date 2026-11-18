# Public pilot 0.1.40 — independent review

Both hosts completed the original static-link continuation task against the exact frozen 0.1.40 package. No gold or model pin was supplied. Only the public origin `https://nkskills.getgroove.me` was authorized; Codex networking was explicitly enabled for this task. The source installation and initial discovery remained unchanged. This record is AI review, not owner acceptance.

| Measure                              | Codex                                | Claude Code                                    |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------- |
| Exit code                            | 0                                    | 0                                              |
| Duration seconds                     | 459.77                               | 944.25                                         |
| Declared / collected / fully audited | 12 / 12 / 0                          | 12 / 12 / 0                                    |
| Check pass / fail / unknown / N/A    | 57 / 0 / 252 / 3                     | 134 / 9 / 167 / 2                              |
| Trusted artifacts                    | 2 campaigns, 2 runs, 1 global review | 2 campaigns, 2 runs, 1 global review           |
| Submitted source quotations          | No quote ledger claimed              | 13 verified: 12 exact, 1 whitespace-normalized |
| Local delivery link occurrences      | 603, none missing                    | 726, none missing                              |

All replays use trusted source `1500b35`, matching the package digest. Both keep scopeComplete=false, 12 pending items and 13 discovery gaps; static frontier is empty, so no count/depth continuation is needed. Each records 98 external link occurrences across 25 URLs without fetching them. No current rankings, indexing, citations, conversions or traffic are fabricated. Different scoped judgments explain different resolved-check counts; these counts are not quality scores.

## Source-backed judgments

[Codex review](codex.independent-review.json) supports both findings: missing immutable source checkout in four version-labelled build guides and Codex-only audit entry links despite existing Claude sections. The reviewer independently inspected captured code blocks and anchor targets. Site fixes were made afterward in source commit `435a7e1`; the trial captures remain unchanged and do not prove those fixes deployed.

[Claude review](claude-code.independent-review.json) supports the same host-navigation issue, the misplaced guide-intro statement, and two explicitly qualified recommendations: clearer candidate-status wording and investigation of unlinked font-notice references. The global navigation finding is explicitly a duplicate of the local issue, not an extra defect. The report preserves the licence recommendation's prerequisite in both action and verification. The word “predate” in one finding title is temporal inference; captured bytes establish mismatched section wording, not publication history. Metadata need not list every topic as a universal SEO rule.

The original Claude final response overgeneralizes missing questions to all AEO checks; the detailed report correctly separates answer-evidence and missing authoritative support. Its quotation claim also omits one explicit whitespace-normalized span. [Separate corrections](corrections.json) bind original and revised hashes, exact replacements and reviewer attribution. [Corrected narrative](claude-code.corrected-report.txt), [corrected response](claude-code.corrected-response.txt), and [fresh quote receipt](corrected-quotes.receipt.json) retain all original findings and coverage. Original first-pass overstatements are not erased or counted as a native pass.

This public pilot has no exhaustive labeled gold set: supported findings do not establish public recall or general accuracy. No live search uplift or engine-selected state is inferred from static metadata.

## Execution and evidence boundary

All 32 Codex command inputs and its generated Python review script were inspected. Its one nonzero command tried to read collection artifacts before collection finished; it recovered without changing the package. Source parsing remained inert and network collection used packaged helpers only.

All 99 Claude tool inputs, 25 Bash commands and seven generated JavaScript scripts were inspected. Bash calls used direct `rtk proxy node`; generated scripts used filesystem/path/crypto/assert operations, without child processes, arbitrary evaluation or page script execution. One reviewer-script inbound-count assertion failed and was corrected from 10 to the observed 11 before writing its bundle. Original and final script bytes are preserved in tool events and files.

Claude's configured temporary guard was **not enforced** because the original `/var` alias skipped its entry handler. Actual command compliance is established by trace inspection, not the settings. The later fixed guard and native integration proof are separate evidence; they are not retroactively applied here. No customer guard is packaged.

The archive retains 1,012 files, including exact prompts, guard/settings, original captures, installed packages, all outputs, scripts, tool events, replay receipts and the separately attributed corrections. Every member was rehashed after archiving. SHA-256: `af9e8b48de8a48a28813700319abfc7889774fc36047e1b125bdc74fa6583a18`. [Manifest](archive-manifest.json), [archive](artifacts.tgz). Selected private-key/provider-token pattern scan found no matches; this is not comprehensive secrecy certification.

Local link checks cover Markdown inline file links and HTML hrefs, not external destinations or anchor IDs. Quote receipts verify submitted spans only. Report reading, scoped source comparison and explicit limitations remain necessary. `releaseAccepted` remains false until the owner decision and product publication steps.
