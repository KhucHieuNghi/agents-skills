# Protected capture fallback — candidate 0.1.25

This version keeps the 0.1.24 context/coverage corrections and explicitly forbids
weakening browser/OS protections to obtain an optional capture. It records common
fallback rationalizations and keeps unavailable rendering unknown. The failed
0.1.24 WebKit workaround is the behavioral baseline. No upstream pin, collector
implementation or historical archive changed.

The archive was extracted into fresh Codex, Claude Code and combined projects.
The native input prompts and original fixture bytes match 0.1.23/0.1.24. Combined
installation was verified without a native model session.

## Native outcomes

| Host        | Execution                                                                        | Captured evidence                                        | Final coverage                                                  | Quote replay                      |
| ----------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| Codex       | Initial harness timeout at 600 seconds; continuation completed in 217.80 seconds | Native PDF text, OCR and figure inspection; no ready DOM | 0 audited, 3 pending; 13 pass, 5 fail, 4 N/A, 56 unknown        | Eight quotes, exact receipt match |
| Claude Code | Completed in 318.48 seconds                                                      | Chrome ready DOM and native PDF text; no OCR attempted   | 0 audited, 2 pending, 1 unsupported; 2 pass, 2 fail, 74 unknown | Six quotes, exact receipt match   |

Both use supplied owner policy as attributed evidence and state the audited count
correctly. Recorded commands show no target-script VM fallback or sandbox-disabling
workaround. Codex's browser failure remains explicit. Claude leaves the image-only
PDF unsupported and gives an OCR recovery path; it does not call empty extraction
empty content. No new measurements, source changes or upstream installs occurred.

Codex's first session did not finish its handoff within the harness budget. The
continuation prompt explicitly reused existing artifacts, prohibited recapture and
requested scope reconciliation. It is not an uninterrupted or blind repeat. All
55 snapshotted initial/recovered/reviewed artifacts retain their exact hashes.
The additional final portfolio revision also validates; narrative/quote files are
new. The narrative retains the image-only construction as an intentional fixture
while explaining the observed absence of an accessible text equivalent. This extra
observation is not a predeclared gold unit or a precision/recall claim.

## Verification and limits

All six persisted runs validate as partial. Inputs and installed package files
match frozen archive/source hashes. All recorded command/tool calls have terminal
results; no process containing the unique trial root remains. The JSON streams
provide recorded command evidence, not independent attestation of every visual
comparison, browser sandbox state or process-level network isolation. Claude's
"no network" wording must not be treated as such an attestation. Sixteen Claude
Bash calls lack a leading rtk command; that instruction deviation is retained.

The archive contains 205 byte-compared files, including original sources, raw
streams, first-session timeout, continuation prompt/results, capture scripts,
artifacts, reports and receipts. Package copies, profiles and compiler caches are
excluded. `verification.json`, `adjudication.json` and `archive-validation.json`
record the exact boundaries. Text report/reply copies preserve original bytes;
formatted JSON copies have their raw counterparts in the archive.

Root checks pass: format, lint, typecheck, build, diff and 448 tests in 62 files.
Fresh installs and isolated 0.1.24-to-0.1.25 upgrades pass for both hosts and combined;
modified installs are rejected without losing edits/lock. No rollback fault was
injected. See ../../content-search-audit-0125-upgrade-snapshot.json.

Component: `b6b9a1d81f786cfe25c85047187108791d42e208748446a97ae2a20657cc819f`.
Release: `1cd662b8c2c244d97a1cffe7409526e3c641832f11fbc87185a6e2a1bc9c4a4d`.
Archive: `2d5051e7981c0ea6a199520bc98f612ff54816e8290dfea8aa29012bfe24cc49`.

This is targeted local regression evidence. The earlier full 12-dossier semantic
report issues and independent acceptance are still open. No commercial release,
commit, push or deployment is claimed.
