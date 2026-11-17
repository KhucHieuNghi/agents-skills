# Public pilot — exact candidate 0.1.31

Both native hosts completed a read-only NKSkills pilot using fresh installations
from the frozen 0.1.31 archive. This is a development trial, not independent
acceptance or a search-performance benchmark. No website change was made.

## Scope and reproducibility

The sole allowed origin was `https://nkskills.getgroove.me`, anonymous static-link
collection with maxPages 30 and maxDepth 5. Browser execution, external origins,
credentials and analytics were outside scope. One genuine initial discovery
capture (maxPages 1) was copied identically into both projects. Hosts then ran
sequentially, using their default models, to avoid concurrent website load.
Exact prompts, execution commands, versions and initial hashes are retained.

Each host resumed discovery to 11 captures and 12 inventory records. The empty
frontier means the specified static-link traversal exhausted its queue; it does
not establish complete website discovery. Both retain 13 discovery limitations:
10 rendered-navigation gaps, one plain-text navigation adapter gap, incomplete
source and unconfirmed scope. The plain-text notice body was collected. Its three
named companion files and the sitemap were not traversed. There are 24 distinct
excluded external URLs. All 12 content snapshot hashes match between hosts.

## Verified results

| Measure                                           | Codex            | Claude Code       |
| ------------------------------------------------- | ---------------- | ----------------- |
| Host version                                      | 0.166.0          | 2.1.325           |
| Terminal exit                                     | 0                | 0                 |
| Duration, seconds                                 | 378.952          | 847.248           |
| Recorded cost USD                                 | not provided     | 8.250668          |
| Declared / collected                              | 12 / 12          | 12 / 12           |
| Fully audited / pending                           | 0 / 12           | 0 / 12            |
| Checks: pass / fail / N/A / unknown               | 56 / 4 / 4 / 248 | 129 / 8 / 4 / 171 |
| Missing planned checks                            | 0                | 0                 |
| Local / global findings                           | 1 / 0            | 4 / 0             |
| Global rules resolved / unknown                   | 1 / 3            | 3 / 1             |
| Original files unchanged                          | 97               | 97                |
| Actual output directories validated independently | 6                | 6                 |
| Completion allowed                                | false            | false             |

More resolved checks are not evidence of a more accurate audit. Per-host judgment
scope differs. No labeled public-site gold set was supplied, so precision/recall
is not reported. Neither host measured ranking, indexing, citation or conversion.

## Findings and review limits

- Codex consolidates one reproducibility concern across four host-guide pages:
  a default-branch clone precedes a version-labelled build without selecting a
  source revision. The source supports that omission. It does not prove an actual
  build failure or that the displayed version is incorrect.
- Claude F-001 identifies the Vietnamese catalog typo `DANH MỤ`.
- Claude F-002 identifies missing prerequisite explanation/setup signposting in
  the collected guides. The external technical guide was not inspected; actual
  user impact and expected audience knowledge remain judgments.
- Claude F-003 proposes clearer Vietnamese commercial-gate wording. The full
  answer starts with `Chưa` and identifies an evaluation candidate; it does not
  affirm commercial readiness. Treat this as an editorial proposal.
- Claude F-004 proposes dates near changing status statements. It explicitly
  leaves freshness unknown. Missing dates do not prove stale content.

Raw-source media passes exclude uncollected CSS, social images and rendering.
The global journey-link pass also leaves follow-on licence files unresolved.
Whether those passes meet the entire applicable rule needs domain review. These
are not accessibility or completeness certifications. The primary review read
the final replies, supplemental notes, finding records, generated verdict reasons
and recorded tool inputs; it did not manually reread every serialized report row.

Read the exact [Codex report](codex.report.txt) and [notes](codex.notes.txt), and
[Claude report](claude-code.report.txt) and [notes](claude-code.notes.txt).
Author assessments are in [Codex review](codex.content-review.json) and
[Claude review](claude-code.content-review.json); neither is a human verdict.

## Execution defects and verification boundary

Codex recovered from a missing UTF-8 encoding in a review bundle and superseded
an early index created during collection. Rejected/intermediate artifacts remain
in the archive. Claude recovered from an incorrect HTTP locator probe and a shell
quoting error while writing its global-review script.

All 43 Claude tool inputs were inspected. Of 32 Bash calls, 29 used
`rtk proxy sh -c` with unprefixed inner commands, contrary to the explicit prompt.
The final reply acknowledges this. All top-level Bash commands start with RTK;
that does not satisfy the per-subcommand convention. The 28 Codex command inputs
were inspected. Related host-policy and Claude tool-result files were read outside
the project. No recorded target-script execution, credential read, external-origin
network bypass or installed-package mutation was observed. This is recorded-trace
evidence, not a syscall/network attestation.

Independent report hashes match their manifests. Claude's nine supplemental-note
quotes pass the packaged quote verifier; this validates spans, not conclusions.
The author's initial directory scanner incorrectly treated Claude's input file
`audit/configs/campaign.json` as an output manifest. Its original script/receipt
are preserved. The corrected scanner skips input configurations and validates
all six actual artifact directories; this was a harness error, not a host defect.

## Evidence and remaining gates

[Archive verification](archive-validation.json) records 683 files, each rehashed
against the original bytes. The archive SHA-256 is
`9ba417eacb37c79e9a6399dd0b2047db8a11aabfa2213ea78e9b04594e64310c`.
[Report-copy hashes](report-copies.json) bind the convenient text copies to archive
members. Exact model events, generated scripts and original outputs are retained
as data; do not execute archived target content or analysis scripts when reviewing.

This closes execution of the current-version bounded public/missing-data pilot.
It does not close the separate current-version interrupted/resume scenario,
remaining fixture coverage, semantic thresholds or independent human acceptance.
The user's existing 0.1.29 review packet remains unchanged; this is supplementary
0.1.31 evidence. No publication or deployment acceptance is implied.
