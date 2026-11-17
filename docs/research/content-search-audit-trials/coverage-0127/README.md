# Coverage workflow trial — 0.1.27

This repeats support-methods-0126 on fresh extracted installations, with identical
prompts and target bytes. Only package guidance and provenance changed. Both native
processes terminated normally. No model was pinned. Gold remained outside model
projects. This is author review of a known synthetic fixture, not independent acceptance.

| Result                    | Codex          | Claude Code                |
| ------------------------- | -------------- | -------------------------- |
| Duration                  | 199.36 seconds | 111.68 seconds             |
| Gold defects found        | 6/6            | 6/6                        |
| Persisted findings        | 6              | 0                          |
| Validated inventory       | 4 dossiers     | 4 dossiers plus scope file |
| Fully audited / pending   | 0 / 4          | 0 / 5                      |
| Resolved / unknown checks | 21 / 83        | 0 / 130                    |
| Submitted quote replay    | 13/13          | 12/12                      |
| Semantic review persisted | Yes            | Explicitly omitted         |
| Release accepted          | No             | No                         |

Codex followed start, review and validation; the final reply matched persisted
coverage. Claude now ran start and validation, but still voluntarily omitted review.
It disclosed that omission, so this is workflow failure rather than false completion.
Both preserved clean controls. Claude also stated that unknown-origin sessions were
not AI-generated and predicted engine quotation without observations. Unknown origin
supports neither positive nor negative attribution. These issues remain open.

All targets and both installed package trees were verified unchanged. Validation and
quote verification were rerun with each installed package. `artifacts.tgz` preserves
98 raw files, including execution logs, prompts, reports, run artifacts and installation
locks. Every archived byte was compared with its original. Installed package trees and
the extracted release are excluded. `.report.txt` and `.response.txt` are exact copies.
Quote replay certifies only submitted textual spans, not semantic truth.

The capture script first attempted the nonexistent `findings.jsonl` filename; this
post-run harness error was corrected to `findings.json`. Neither native process was
restarted and no model-produced artifact was edited. The original failed inspection
did not change trial outputs.
