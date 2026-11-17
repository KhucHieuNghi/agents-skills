# Actual process interruption and native-host recovery

Candidate: frozen 0.1.6. This trial uses 1,200 original, unique, synthetic local
Markdown records. It tests recovery after an actual killed helper process; it is
not a public network incident, killed host conversation, power-loss test or
transactional-checkpoint guarantee.

## Interruption

A parent process started the packaged standalone `start` command, observed
`status: collecting` and `cursor: 500` in the saved run, sent SIGKILL to that live
child PID and waited for its terminal exit (`-9`). The retained snapshot records
PID, command, timing and signal. The stopped artifact validated structurally,
with 18,200 missing checks for the 700 not-yet-checkpointed items. Its original
1,200-item inventory was retained.

The stopped tree contains 557 files: manifests plus registered and some
unregistered collection artifacts written after the last checkpoint. No orphan
file is counted as a completed check. The harness retained these files and their
hashes rather than deleting or converting them into a fabricated checkpoint.

## Recovery results

Fresh extracted-archive installations received identical copies of the stopped
tree and configuration. Both native hosts used the supported `resume` workflow to
new output directories. They re-read the whole declared local inventory, as the
helper contract requires; this is not a cursor-only append operation.

| Independent check                              | Codex           | Claude Code     |
| ---------------------------------------------- | --------------- | --------------- |
| Declared and distinct item IDs                 | 1,200           | 1,200           |
| Collected evidence records                     | 1,200           | 1,200           |
| Saved cursor                                   | 1,200           | 1,200           |
| Planned checks present                         | 31,200          | 31,200          |
| Missing planned check records                  | 0               | 0               |
| Pending semantic/applicability items           | 1,200           | 1,200           |
| Structural validity                            | Pass            | Pass            |
| Audit completion allowed                       | False           | False           |
| Original stopped tree/config/content unchanged | Verified hashes | Verified hashes |
| Installed component unchanged                  | Verified digest | Verified digest |

The reconciliation record calls the 700 newly captured snapshot identities
`addedItemIds`. These were already declared inventory items; that field compares
snapshot maps and must not be described as 700 additions to audit scope.

## Reporting defects retained

Codex's final response reports the correct collection/check totals and separates
collection from unresolved audits. Claude completed the recovery correctly but
its final narrative contains factual errors:

- It says 28,200 checks; its own dimension table sums to 31,200 and the artifact
  contains 31,200. This is an arithmetic/reporting error, not missing collection.
- It says the saved run did not reveal collection progress; the source run has
  cursor 500. Its trace shows it read only an initial portion of the large JSON.
- It expresses uncertainty about zero missing checks alongside unresolved checks.
  Those are different concepts: all planned records exist but their outcomes are
  unknown. The artifact is correct; the explanation needs improvement.

These errors fail report-fidelity expectations. Successful recovery does not
close semantic/report acceptance or establish an accuracy improvement attributable
to the skill. Host defaults and tool interfaces differ; this is not a controlled
model comparison. Claude invokes the native Skill tool; Codex reads the entrypoint.

## Reproduction and retained evidence

Exact prompts and final outputs, selected tool calls, process exit evidence,
source/input hashes and independent validation are retained here. The artifact
archive includes the original content/config/stopped checkpoint and both recovered
outputs. Fresh extraction validates the stopped checkpoint and both recovered
runs again. Absolute input paths in the config refer to the original temporary
fixture; artifact validation is replayable without refetching those inputs, but a
new collection run requires rebuilding an explicit local config.

`tests/content-audit-process-interruption.test.ts` adds an automated real-process
SIGKILL regression. It observes a committed checkpoint, waits for termination,
validates, recovers 1,200 records/31,200 checks, and verifies all stopped/input bytes
are unchanged. It passed independently and in the full suite. The test does not
claim crash consistency between separately replaced manifest files. Invalid
checkpoints still require explicit diagnosis instead of unsafe reuse.
