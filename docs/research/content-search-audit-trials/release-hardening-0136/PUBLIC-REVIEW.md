# Public pilot — 0.1.36 retained results

Both native hosts completed the authorized public-site continuation scenario.
Execution receipts record unchanged original project inputs and no copied gold.
Both received the same 1,800-second budget. Earlier failed trials remain retained.

| Measure                              | Codex       | Claude Code |
| ------------------------------------ | ----------- | ----------- |
| Exit code                            | 0           | 0           |
| Duration, seconds                    | 313.040     | 881.562     |
| Declared / collected / fully audited | 12 / 12 / 0 | 12 / 12 / 0 |
| Pending items                        | 12          | 12          |
| Trusted matching-version replay      | valid       | valid       |
| Full audit completion allowed        | false       | false       |

Each replay verifies two campaign revisions, two local runs and one global
review against the frozen 0.1.36 package and release digests. Validity establishes
artifact consistency; it does not establish semantic correctness or release
acceptance. Partial coverage is reported explicitly, not treated as completed.

The archive retains 875 files, including original captures, generated scripts,
tool events, failures, reports, execution receipts and trusted replay results.
Every archived member was rehashed against `public-archive.json`.

Archive SHA-256:
`db51e686cd1e83da4de0c0a7f748f51f266d2b1b76ab373f18d0d56c3839974d`.

A limited scan found no selected private-key-header or GitHub/OpenAI/Anthropic
token-pattern matches. This is not a comprehensive secrecy guarantee. This
supplement does not modify the previously frozen Expanded human-review packet.

## Bounded response review

Both final replies retain the distinction between collected and fully audited
items. Claude reports 312 checks: 113 pass, 18 fail, 2 not applicable and 179
unknown. Its persisted coverage has 131 completed checks plus 2 not applicable,
consistent with 133 resolved checks. Twelve items remain pending.

Claude reports five local findings and explicitly identifies two global entries
as repetitions, not additional defects: homepage solution counts, meta description
coverage, host-guide navigation, a Vietnamese catalog label, and font-notice
navigation. The final item is explicitly investigative; the actual notice files
were not fetched. Materiality and supporting evidence require adjudication.

The count and Vietnamese-label defects were independently fixed on this branch
before this packet was archived. That does not alter the captured production
bytes or establish that the fixes have been deployed.

Full report, tool-result, generated-script, instruction-compliance and semantic
review remains outstanding. No human verdict, precision rate or release
acceptance is asserted by this public pilot. The separate primary Expanded
assessment remains below the precision threshold, and its independent review
is pending.
