# Native supplied-answer accuracy trial — candidate 0.1.7

Both native Codex and Claude Code sessions produced customer reports from the same
synthetic two-response cohort, preserving the exact supplied annotations and source
snapshots. One response is reviewed (one correct and one incorrect claim); the other
is unreviewed. This is a bounded workflow/interpretation trial, not live AI visibility
measurement, independent semantic adjudication or a controlled model comparison.

## Results

| Check                                           | Codex                                                        | Claude Code                                        |
| ----------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Mention/citation denominators                   | Correct: both 0/0, unavailable                               | Correct: both unavailable; two unknown annotations |
| Claim accuracy                                  | Correct: 1/2, 50%                                            | Correct: 1/2, 50%                                  |
| Fully reviewed response accuracy                | Correct: 0/1, 0%                                             | Correct: 0/1, 0%                                   |
| Unreviewed response exclusion                   | Explicit                                                     | Explicit                                           |
| Collection versus semantic completion           | 1 collected, 26 unresolved checks, 4 unresolved global rules | Same counts and partial status                     |
| Exact supplied measurement input preserved      | Verified                                                     | Verified                                           |
| Original inputs and installed package unchanged | Verified                                                     | Verified                                           |
| Documented campaign CLI accepts measurements    | Failed                                                       | Failed                                             |

Both hosts independently worked around the CLI failure by directly calling the
installed report renderer without editing the package. The failure is in the
campaign CLI option allowlist, which omitted `measurements`; the underlying shared
renderer already supports it. Candidate 0.1.8 adds this single allowed option.
A direct CLI regression failed before the fix and passed afterward, including
continued rejection of registry overrides. Fresh extracted 0.1.8 archive installs
replayed both actual saved campaigns through the corrected CLI, with exact
measurement input preserved. This replay is not a fresh native 0.1.8 host session.

## Retained evidence

- Exact `*.prompt.txt` and `*.response.txt`, plus execution arguments/exit status.
- `initial-hashes.json`: pre-session content/config/measurement hashes.
- `independent-validation.json`: campaign and global review validation, manifest
  hashes, package digests, source preservation and computed cohort metrics.
- `artifacts.tgz`: exact campaign, review and report bytes for each host, with
  supplied measurement files. It contains historical absolute source paths.
- `archive-validation.json`: archive hash and all 46 extracted files compared byte
  for byte. This confirms archive fidelity, not portability of original inputs.
- [0.1.8 installation and CLI replay receipt](../../content-search-audit-cli-018-installation-snapshot.json).

Raw host event streams remain in the recorded temporary trial directory rather
than being committed wholesale because they may include host/account metadata.
No claim of a comprehensive tool-trace security review is made. No general semantic
accuracy, search uplift, publication or commercial acceptance follows from this trial.
