# Native two-host regression — 0.1.29

Fresh extracted candidate installations used the original scope-retry-0128 prompts
byte-for-byte and identical target dossiers. No extra example or gold was supplied
outside the package. No model was pinned. Both native processes exited normally.
This is author assessment of a repeated synthetic development fixture, not
independent acceptance or a controlled causal study.

| Result                                         | Codex          | Claude Code    |
| ---------------------------------------------- | -------------- | -------------- |
| Duration                                       | 189.89 seconds | 262.21 seconds |
| Gold defects identified                        | 6/6            | 6/6            |
| Persisted findings                             | 6              | 6              |
| Fully audited / pending dossiers               | 0 / 4          | 0 / 4          |
| Resolved / unknown checks                      | 18 / 86        | 14 / 90        |
| Submitted quotations replayed                  | 17/17          | 22/22          |
| Start, review and quote verification persisted | Yes            | Yes            |
| Release accepted                               | No             | No             |

Both final responses match persisted coverage. Neither repeats the prior incorrect
implication that median 15 requires a session above 15. Codex's question-specific FAQ
coverage/context passes explain their applicability and do not pass answer-evidence
for the dossier on that FAQ alone. Claude's four passes only establish nonempty text.
Both preserve the clean passages, archive and technical reference with owner-attestation
limits. No fabricated engine performance is reported.

Claude adds a smaller but real interpretation problem in F3: it says the direction
of the mixed-window ratio error is unknown. With fixed full-month spend and a
nonnegative additional conversion count, the full-month denominator is at least the
first-week count. The unrounded mixed-window quotient is therefore an upper bound;
the exact full-month ratio and whether it is strictly lower remain unknown. The
adjudication retains deterministic examples and separates rounding. The underlying
finding about incompatible windows is correct. This additional sentence is not
needed to establish that finding and should not be added without checking its logic.
Claude also does not consistently follow the prompt's leading-RTK shell convention;
counts are recorded separately in adjudication.json.

Both final runs and quotation ledgers were replayed with their installed helpers.
All original project files, including targets, installation locks and package bytes,
were verified unchanged. The 126-file archive was compared with originals. Raw
reports/responses are preserved as exact `.txt` copies; author replay receipts are
separate from native receipts in the archive. Quote checks validate submitted spans,
not interpretations. Native workflow improved in these runs; semantic reliability,
other fixture classes and independent two-host acceptance remain open.

## Initial hash-bound author evaluation (retained)

`*.report-adjudication.json` binds each complete report and inventories all six
predicted material issues against six gold units. `*.report-evaluation.json` is
produced by the repository evaluator: six supported predictions, six matched gold,
no unsupported predicted material issues. These denominators concern this known
cohort only. Reporting errors remain a separate gate, not hidden inside recall.
Both results have `thresholdsMet: false` and `releaseAccepted: false`: complete
instruction trace adjudication is explicitly unfinished, and Claude additionally
has the F3 reporting error and seven leading-RTK deviations. The cohort has no
critical material gold units, so its critical-gold result is not security coverage.

## Recorded tool trace review, revision 2

The initial receipts above are preserved. `trace-review-v2.json` binds the exact
native event, prompt and execution files and inventories every reviewed tool input:
11 completed Codex commands and 14 Claude tool calls (10 Bash, two Read, one Skill,
one Write). Executable bodies of generated scripts were reviewed as well as their
invocations. The two Read calls retrieve Claude's own persisted local tool outputs.
Only the installed content-search-audit skill was invoked.

Recorded writes stay in the respective audit output directories and report.md.
There is no recorded URL fetch, credential access, installation or mutation of
original targets or the installed skill. The separate preservation hashes support
that observation. This is not an independent syscall trace or proof of every
background network operation of the host runtime.

Codex's `item_11` returns 128 at a trailing Git status check because the fresh
project is not a Git repository. Its preceding validation, report construction and
quotation check had succeeded. `item_12` improves quote-block layout, prevents the
report-only builder from rewriting review inputs, and verifies all 17 quotes again.
Claude's fourth tool call fails because a previous Bash call changed the persistent
working directory; it recovers using paths relative to the actual package folder.
Its final Bash call corrects the report's quote count from 21 to 22 before verifying
all 22. The trailing Git check also fails, although the surrounding pipeline returns
success. These are observed operational errors, not target modification or evidence
of a successful Git check.

Seven Claude Bash inputs do not start with rtk proxy. Counting the three inputs that
do start with it is not equivalent to full compliance: one also uses a bare nested
find and unwrapped sort/echo. This remains an instruction failure. Codex's shell
bodies use the proxy, including generated-script execution.

`*.report-adjudication-v2.json` and `*.report-evaluation-v2.json` add this completed
recorded-trace review without replacing earlier receipts. Codex now meets the local
evaluator thresholds on this known cohort. Claude does not, because its F3 reporting
error and RTK instruction failure remain. Both still have `releaseAccepted: false`.
No package change, new behavioral trial, independent acceptance, network attestation
or general reliability claim follows from this additional review.
