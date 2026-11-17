# Actual interruption and native recovery — candidate 0.1.31

Both hosts recovered the complete declared 1,200-item local inventory from a real
SIGKILL at a committed collection checkpoint. This verifies collection recovery
and accounting for this scenario. It does not complete semantic or product acceptance.

## Inputs and interruption

The frozen 0.1.31 archive was hash-checked, extracted and installed separately for
Codex and Claude Code. The release/component/archive fingerprints and installed
file hashes are in [preflight.json](preflight.json). Each project received the
same stopped artifact and configuration; the shared synthetic input root contains
1,200 distinct Markdown files. No network access was authorized.

The harness started the packaged helper, observed `status: collecting` and
`cursor: 500`, sent SIGKILL to that live process group and waited for exit `-9`.
[The interruption receipt](interruption.json) records the PID, command, time and
observed state. The stopped tree has 507 files and validates structurally. Its
inventory retains all 1,200 items; 500 content snapshots and 13,000 check records
are present, leaving 18,200 planned checks missing. Nothing was fabricated into a
finished checkpoint. This tests a committed boundary, not arbitrary interruption
between manifest writes, machine power loss or a killed host conversation.

## Native results

Both hosts used the packaged `resume` command, creating `recovered` rather than
overwriting the stopped artifact. The helper reread the entire declared inventory;
it did not append only the 700 records beyond the cursor.

| Independently verified measure        | Codex                 | Claude Code           |
| ------------------------------------- | --------------------- | --------------------- |
| Version                               | 0.166.0               | 2.1.325               |
| Terminal exit                         | 0                     | 0                     |
| Duration, seconds                     | 57.936                | 48.744                |
| Recorded cost USD                     | not provided          | 0.572143              |
| Declared / distinct / collected items | 1,200 / 1,200 / 1,200 | 1,200 / 1,200 / 1,200 |
| Original declared item IDs retained   | yes                   | yes                   |
| Saved cursor                          | 1,200                 | 1,200                 |
| Planned check records present         | 31,200                | 31,200                |
| Missing planned check records         | 0                     | 0                     |
| Unknown checks                        | 31,200                | 31,200                |
| Pending / fully audited               | 1,200 / 0             | 1,200 / 0             |
| Findings                              | 0                     | 0                     |
| Validation / completion allowed       | true / false          | true / false          |
| Original project files unchanged      | 595                   | 595                   |

All 1,200 shared source files and the original stopped tree also retain their
preflight hashes. The validator was rerun independently against each installed
package. See [Codex receipt](codex.independent-validation.json) and
[Claude receipt](claude-code.independent-validation.json).

## Report fidelity and trace review

The exact final replies are [Codex](codex.response.txt) and
[Claude Code](claude-code.response.txt). Both correctly distinguish successful
collection from unfinished audit, report 31,200 checks and zero missing records,
and preserve all pending items. Unlike the historical 0.1.6 sample, Claude reports
the checkpoint cursor and check total correctly. This single development trial
does not establish reliability or a causal improvement attributable to the skill.

Claude's remaining-work paragraph still labels all 26 rules as semantic review.
The actual registry has 24 semantic rules plus two deterministic rules:
`quality-readable-text` requires extracted-text evidence and `seo-response`
requires HTTP evidence. The precise remaining split is **28,800 semantic checks
and 2,400 deterministic checks**. The review workflow can attach evidence for
recomputation; it cannot replace a deterministic result with a host-authored
verdict. Claude explicitly says it did not read the rule contract. Codex's final
reply gives the correct split. This reporting issue remains open.

All seven Codex command inputs and all five Claude tool inputs (one Skill, four
Bash calls) were inspected. Their shell commands/subcommands use RTK in this
trial; no recorded network command, target-content execution, input edit or
manufactured semantic review was observed. Related Codex RTK policy was read
outside the project. Claude wrote two fixed `/tmp` JSON scratch outputs; verified
copies are archived, but their previous contents were not inventoried. Do not
claim zero outside-project access/writes or syscall/network attestation.

The [primary report review](report-review.json) is an author assessment, not the
user's independent review or acceptance.

## Retained evidence and limits

[Archive verification](archive-validation.json) records **5,179 files**, each
rehashed against its original bytes. Archive SHA-256:
`93d65509c12697d8fb4482012af1cab90c041c7af53a18b9ff8d06975a7d62b3`.
It includes source inputs, stopped and recovered trees, exact model events,
configuration, harness scripts and validation results. Installed package trees
are excluded from the raw archive and remain bound by their preflight hashes and
the frozen release archive. Absolute config paths refer to the original temporary
fixture; validate retained artifacts without fetching inputs, and create explicit
new local paths before reproducing collection elsewhere.

No runtime or skill package changed for this trial. Current-version native
public/missing-data and interrupted/resume execution now have evidence. Full
fixture coverage, report correctness and human semantic acceptance remain separate
gates. No deployment or commercial release is implied.
