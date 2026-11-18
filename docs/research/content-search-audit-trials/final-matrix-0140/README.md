# Final 0.1.40 local matrix

Independent AI technical review of fresh native runs on the exact 0.1.40 archive. This is not owner acceptance or an error-free autonomous release pass. Version, source, profile and artifact hashes are bound in [manifest.json](manifest.json).

| Cohort                 | Host        | Supported material defects | Resolved checks         | Quote spans verified | Local report links | Completion                   |
| ---------------------- | ----------- | -------------------------- | ----------------------- | -------------------- | ------------------ | ---------------------------- |
| Support / missing data | Codex       | 6                          | 17 / 104                | 13 / 13              | 77 / 77            | Partial; 0 / 4 fully audited |
| Support / missing data | Claude Code | 6                          | 13 / 104                | 22 / 22              | 76 / 76            | Partial; 0 / 4 fully audited |
| Technical controls     | Codex       | 3                          | 10 / 52                 | 5 / 5                | 39 / 39            | Partial; 0 / 2 fully audited |
| Technical controls     | Claude Code | 3                          | 9 / 52 (includes 1 N/A) | 16 / 16              | 30 / 30            | Partial; 0 / 2 fully audited |

The unit scheme is material defects per fixture cohort, not a count of dimensions or reviewer recommendations. Both hosts preserve the clean controls. All original installed and target files match their archived pre-run hashes (97 per support project, 94 per technical project). Independent trusted replay uses matching source commit `1500b35`; receipts remain inside each archive.

- [Support independent review](native-0131.independent-review.json) and [unchanged native evidence](native-0131.raw.tgz).
- [Technical independent review](technical-controls-0131.independent-review.json) and [unchanged native evidence](technical-controls-0131.raw.tgz).
- [Support attributed correction](native-0131.attributed-correction.tgz): two narrative lines distinguish missing question sets from unreviewed answer-evidence applicability; native verdicts/counts retained. Complete delivery copy, exact diff, source/revised hashes, rebound quote ledger and fresh replay/link receipts included.
- [Technical attributed clarification](technical-controls-0131.attributed-clarification.tgz): one summary cell reconciled with the detailed missing-claim-support rationale; native verdicts/counts retained. Same complete-delivery and verification records included.

The corrected reports are independent-agent attributed post-review deliveries. They do not replace the native reports and are not evidence of native first-pass correctness. No material finding was added or removed. Some support answer-evidence applicability remains unresolved; clarification does not retroactively complete those checks.

Codex support recovered an IndexError/missing bundle (item_14, exit 1) and ended a later git-status check outside a repository (item_17, exit 128). Codex technical recovered a rejected review bundle with invalid finding dimensions (item_19, exit 1). All are retained in event streams and trace indexes. Claude returned no tool error results in these runs; its technical report self-corrected a missing H1 quotation before final verification.

Support Claude used a configured guard whose copied entrypoint failed to run under the `/var` versus `/private/var` mismatch. That cohort was not guard-enforced. Its actual seven Bash calls nevertheless comply with the literal `rtk proxy node` profile. Technical Claude used separately hashed fixed guard bytes, with a retained temp-path allow/deny preflight; its nine actual Bash calls comply. Because no native violating command occurred, the preflight is not independent proof of host-hook activation. Generated scripts were inspected as data; no target-content execution, network request or child-process bypass was observed in the scoped recorded traces.

The link check covers actual local Markdown links and HTML hrefs across delivery reports, not remote destinations, anchors or code-span paths. All 222 native local link occurrences resolve. All 56 submitted native source quotation spans verify. These are structural checks; semantic judgments and limitations are documented separately.

Original fixture prompts were reused, with the declared session-only paragraph appended for Claude. No gold, expected conclusions, model pins or repair hints were supplied. Each cohort ran at most one process per host with a 900-second limit; cohorts were sequential. The scripts used are retained here for review; their original temporary paths are recorded in receipts.
