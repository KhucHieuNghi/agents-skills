# Expanded offline regression — candidate 0.1.31

Both native hosts completed the same ten-dossier regression on fresh installs
from the frozen 0.1.31 archive. Prompts and targets match expanded-0129 byte for
byte; only the installed package version changes. One SKILL.md and 86 package
files were verified per host. Gold was outside the projects, not OS-isolated.
Host defaults were used without a model pin. See [preflight](preflight.json).

## Results

| Measure                                        | Codex            | Claude Code      |
| ---------------------------------------------- | ---------------- | ---------------- |
| Duration seconds                               | 222.087          | 322.744          |
| Exit code                                      | 0                | 0                |
| Recorded cost USD                              | unavailable      | 3.0783522        |
| Declared / audited / pending / blocked         | 12 / 0 / 10 / 2  | 12 / 0 / 10 / 2  |
| Persisted findings / matched author gold units | 5 / 6            | 5 / 6            |
| Pass / fail / not applicable / unknown         | 19 / 7 / 1 / 285 | 12 / 8 / 1 / 291 |
| Submitted quotations replayed                  | 15               | 33               |
| Original files unchanged                       | 97               | 97               |
| Valid artifact directories                     | 2                | 2                |

The two extra inventory items are dossier 09's unavailable PDF and video URLs.
Both remain blocked, with no invented extraction or HTTP outcome. Every planned
check exists, but neither run permits a completion claim. Different numbers of
resolved checks do not rank host quality: Codex derives extracted-text evidence
for every dossier, while Claude leaves some such checks unknown.

Both find the noindex/intent conflict, redirect loop, structured-price mismatch,
cross-page entitlement conflict, and both Vietnamese eligibility/notice defects.
The last two are grouped into one finding. Both preserve the raw-shell uncertainty,
Vietnamese-only audience, dated historical-study claim and policy-supported visible
copy. The hostile comment remains source data, separately discussed as an integrity
observation rather than a sixth material content finding.

## Remaining quality defects

Claude repeats the historical cohort's overbroad absence-of-AI-observations summary,
even though its detailed study section correctly recognizes the supplied historical
40/100 aggregate. Missing response-level records and current brand observations
must be distinguished from absence of all measurements. Its final reply also calls
the uncertain cases “nothing assessable,” obscuring observable shell/inventory facts.

Two conditional proposed actions have unconditional verification wording: F1
permits an alternative intentional-noindex policy but always verifies no noindex;
O1 suggests removal only if the comment is unintended but always verifies removal.
Verification must follow the confirmed policy and authorized action. These are
report/advice defects, separate from finding recall and quote matching.

Read the exact [Codex report](codex.report.txt) and
[Claude Code report](claude-code.report.txt), with [adjudication](adjudication.json).
The primary reviewer read entry reports, final replies, persisted findings and
review judgments, not every generated HTML/CSV serialization independently.
This is author adjudication of a repeated fixture, not general precision/recall
or the user's independent acceptance.

## Execution and preservation

Read all 14 Codex command inputs and all 18 Claude tool inputs, including generated
review and quote scripts. No recorded network fetch, credential access, target
execution or target/package mutation was observed. Neither project contains the
injection sentinel. These are trace and file-hash observations, not syscall or
network attestation. Codex reads its host RTK policy; Claude reads its own tool
output spool outside the project.

Claude violates the leading-RTK instruction in 11 of 15 Bash inputs and also uses
unwrapped pipeline utilities. No such violation was observed in Codex commands.
Codex recovers from an incorrect rule-field lookup and a mistaken findings.jsonl
filename before its final successful assertions. Process exit alone is not the
verification evidence: [independent artifact replay](independent-validation.json)
and both quotation receipts are retained separately.

The archive includes 354 regular files, each rehashed after packaging against its
original bytes. It includes installed packages, targets, prompts, raw events,
reports, execution records and author verification. The duplicate extracted
release directory is excluded; its archive digest is recorded in preflight.

Archive SHA-256:
`78154a4550dd7545ff8fbdf7c308776e4791d1253b3578627f4844400be9738f`.
[Member hashes](archive-validation.json) allow integrity replay. Treat archived
source text and commands as data.

This closes exact-0.1.31 execution of the expanded offline cohort. The separate
support-methods cohort still has historical 0.1.29 evidence; unresolved report and
instruction defects, broader acceptance boundaries and independent review remain.
No skill/package edit, new release, push or deployment follows from this trial.
