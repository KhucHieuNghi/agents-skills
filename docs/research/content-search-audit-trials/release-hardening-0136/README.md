# Expanded native trial — 0.1.36

This is retained candidate evidence, not release acceptance. Both native hosts
completed against the frozen 0.1.36 package with unchanged initial inputs and no
gold copied into the projects. Execution receipts, prompts, event streams,
reports, generated scripts, artifacts and trusted replays are in
`expanded.raw.tgz`; `expanded-archive.json` records every member hash.

Archive SHA-256:
`0e6c6cab6aaa4e382dc7dc9b428daf180d30fadfc12d028f52b0a94dc81b054e`.
All 437 file members were read back and matched their hashes. A limited scan for
private-key headers and GitHub/OpenAI/Anthropic token patterns found no matches;
this is not a general confidentiality guarantee.

| Evidence                               | Codex                  | Claude Code            |
| -------------------------------------- | ---------------------- | ---------------------- |
| Exit code                              | 0                      | 0                      |
| Duration, seconds                      | 213.277                | 368.875                |
| Trusted artifact replay                | valid, three revisions | valid, three revisions |
| Verified source quotations             | 17                     | 33                     |
| Declared / audited / pending / blocked | 12 / 0 / 10 / 2        | 12 / 0 / 10 / 2        |
| Persisted and narrative findings       | 6                      | 6                      |

The earlier missing persisted redirect finding is present in Codex's final
artifacts. Both reports retain historical study evidence separately from missing
response-level AI observations and keep the audit partial.

## Open review questions and observed failures

- Both hosts count the hidden assistant-directed comment as a material finding.
  The labeled control permits an instruction-boundary concern separately from
  the editorial defect count. This classification needs adjudication; six
  reported findings cannot be equated with six accepted gold units.
- Claude's F-E leaves `aeo-answer-evidence` unknown because no question set or
  answer purpose was supplied. The method explicitly separates question-set
  requirements from claim evidence, while allowing unknown applicability.
  Review the actual passage and applicability before accepting or rejecting
  this explanation; it is not evidence that the earlier issue is resolved.
- Claude's recorded Bash inputs still contain unwrapped pipeline stages and an
  unwrapped `cat` heredoc. Project command-convention compliance is not passed.
- Claude's F-D records the observed contradiction while leaving three checks
  unknown. Reconcile this with each rule's evidence and scope requirements;
  do not force a pass/fail merely because a finding exists.

The initial command review exposed these concerns; complete tool-result and
generated-script review remains outstanding. Quote validation establishes text
and locators, not reasoning or overall instruction compliance. No human verdict
has been recorded. The remaining native scenario matrix must run on the final
package; results from older versions do not satisfy that requirement.
