# Real interruption and recovery — 0.1.36

Both hosts recovered the complete 1,200-item inventory from a real SIGKILL at
checkpoint cursor 500 using fresh installations of the frozen 0.1.36 archive.
This verifies collection recovery for this checkpoint, not official acceptance.

The archive contains the preparation/execution/verification scripts, exact prompts,
original inputs, stopped and recovered trees, events, responses and receipts.
`archive-validation.json` records 5,282 members, all rehashed after archiving.
Extracted and installed package trees are excluded; preflight binds their hashes
and the frozen archive/component/release digests.

Archive SHA-256:
`a1ea26d41f2bba772d5b4ce27971d1eb3c150051744f96c3e1a0b9e11f218e44`.

| Independently checked result | Codex | Claude Code |
| --- | --- | --- |
| Exit code | 0 | 0 |
| Duration, seconds | 79.162 | 58.704 |
| Original project files unchanged | 635 | 635 |
| Shared input and stopped tree unchanged | yes | yes |
| Declared / distinct / collected items | 1,200 / 1,200 / 1,200 | 1,200 / 1,200 / 1,200 |
| Original item IDs retained | yes | yes |
| Check records / unknown records | 31,200 / 31,200 | 31,200 / 31,200 |
| Missing check records | 0 | 0 |
| Fully audited / pending items | 0 / 1,200 | 0 / 1,200 |
| Findings | 0 | 0 |
| Structural validation / completion allowed | true / false | true / false |

## Reporting and instruction review

The stopped artifact has 13,000 persisted checks and 18,200 missing planned
checks. Claude calls the former "13,000 checks planned" in its final reply;
that wording does not account for the full declared plan. Its recovered totals
are correct. Its remaining-work text sends all 31,200 checks through review,
without distinguishing 28,800 semantic from 2,400 deterministic checks. The
review workflow can attach evidence for recomputation but cannot submit a
host-authored deterministic verdict. These reporting issues remain unresolved.

Both hosts correctly state that successful collection is not completed audit.
Codex's final response preserves the recovered totals without claiming semantic
completion. The checkpoint contains 37 unregistered snapshot files in addition
to 500 registered snapshots; recovery rereads the full inventory and preserves
the original tree. This does not test arbitrary power loss or every write window.

All recorded command inputs were inspected: 12 Codex commands and nine Claude
tool inputs (Skill, Read and seven Bash calls). Their executable command and pipeline
stages use RTK. Claude reads helper commands, but the trace does not establish
loading all mandatory core contracts before execution. No recorded input mutation,
network command or target-content execution was observed in these inputs.
Full tool-result review is still outstanding; this is not syscall attestation.

Both hosts wrote fixed `/tmp` scratch files. Copies of the three observed outputs
are retained under `external-scratch` inside the archive; their previous contents
were not inventoried. Codex read the active RTK policy and a verification skill
outside the project. Do not claim that all access stayed inside the project.

These are primary-author observations, not independent human acceptance. Native
support/technical-control trials and remaining final-version public/extraction
coverage are separate requirements. No deployment is implied.
