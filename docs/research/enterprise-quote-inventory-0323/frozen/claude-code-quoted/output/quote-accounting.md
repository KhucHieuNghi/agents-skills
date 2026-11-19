# Quotation accounting: inputs/report.md

- Report: `inputs/report.md`, SHA-256 `92fa85629c7aa7b15350a84b6a7d705c216de483ad04d681054fdab6e3236372` (unchanged after verification)
- Source: `inputs/source.md`, SHA-256 `2b6f16c5e8564e3dc626c7d83c4c45650482a716d51aab96c95e40b80e92cdbf`
- Inspected by: Claude Code session (claude-opus-5-5), 2026-11-19T06:51:29Z. The author did this inspection; it is not independent review.

## Manual inventory (final report bytes, 3 lines)

| Report line | Content | Classification | Ledger |
|---|---|---|---|
| 1 | `# Synthetic review` | Heading, not a quotation | n/a |
| 3 | `"The active tab is indicated by a red marker."` with locator `source.md:2` | Source quotation | Q1, submitted |

Source quotations found: 1. Submitted: 1. Not submitted: 0.

## Verifier result

`verify-quotes` exited 0 with `valid: true` and `scope: submitted-quotes-only`. Q1 passed the exact source, report and citation checks. The report also returned `completeReportVerified: false`.

## Manual semantic check

The quotation is the complete sentence on source line 2. It contains no negation, condition or wrapped continuation that was left out, so it does not misstate the source assertion.

## Not checked / limitations

- The verifier did not check for missed quotations. The count of 1 comes from my manual reading of the 3-line report.
- Whether a red marker is a sufficient active-tab indicator (for example, accessibility or colour-only cues) was not assessed. The report makes no finding about it.
- No inventory `start`, semantic review or `validate` run was done. This is not an audit and does not establish coverage.
- These are synthetic inputs. Nothing about authorship or real UI behaviour is attested.
