# Native fidelity candidate — 0.1.21

Five native Claude runs completed with the identical prompt and two dossiers used
by the [0.1.20 control](../fidelity-control-0120/README.md). The control is an
existing-skill arm, not a no-skill baseline. These repeated known cases diagnose
variability; they are not an unseen benchmark or independent acceptance.

## Results

| Repetition | Findings | Submitted quotes | Receipt replay | Targeted semantic result                                                       |
| ---------- | -------: | ---------------: | -------------- | ------------------------------------------------------------------------------ |
| 1          |        3 |               13 | Exact match    | No targeted error recorded                                                     |
| 2          |        3 |               14 | Exact match    | No targeted error recorded                                                     |
| 3          |        3 |               11 | Exact match    | No targeted error recorded                                                     |
| 4          |        4 |               16 | Exact match    | False positive on descriptive improvement; negation lost in quotation fragment |
| 5          |        3 |               14 | Exact match    | Ambiguous real improvement versus noise wording                                |

All five identify the three material gold units. No final source-line mismatch
was recorded in this targeted review. This does not prove absence of every
report error. All submitted ledgers pass a separate replay against the final
report hash. Source and installed package digests are unchanged; target hashes
match the fixtures; every recorded tool invocation has a terminal result.
All runs contain shell commands not beginning with the requested `rtk proxy`
prefix; exact command IDs are in review.json. Process compliance is not passed.

The verifier cannot judge whether an exact substring preserves meaning. Run 4
quotes `intervention record or platform-change evidence is available.` from
line 8, dropping the preceding `No randomization,` from line 7. The resulting
fragment looks affirmative while the source sentence is negative. Its receipt
is mechanically valid. Run 4 also labels the explicitly fixed-cohort descriptive
increase as a material defect. Run 5 retains ambiguous “real improvement” wording.
The semantic gate therefore remains failed. Do not equate valid receipts with
correct conclusions or full report verification.

Some runs shortened source quotations to individual physical lines, leaving
unfinished clauses. Semantic review must retain the complete assertion, including
negation and qualifiers, even when the individual excerpt passes the verifier.
This is an observed limitation, not a claim that the helper caused the behavior.

## Retained evidence and replay

- `review.json`: primary-agent assessment, exact error excerpts, hashes and limits.
- `rep-N/report.txt`: exact report bytes, retained outside formatter inputs.
- `rep-N/bundle.json`, `quote-receipt.json`, `replay.json`: submitted spans and
  exact receipt replay. Run 1's original shared temporary bundle was overwritten
  by run 4; it was reconstructed from its recorded literal table. Its reconstructed
  bundle hash and the entire replay receipt match the original receipt exactly.
- `rep-N/tool-calls.json`, prompt, response and execution receipts.
- `artifacts.tgz`: raw events, stderr, process command, targets, exact reports,
  prompts, responses, execution and receipt files, plus retained bundles.
- `archive-validation.json`: all 55 extracted files byte-compared with originals.
- `installations.json`: five fresh Claude projects plus Codex and combined-host
  helper smoke installs. Codex native semantic execution is not part of this trial.

To replay after extraction, change only each bundle's root to the extracted
`rep-N` directory and run the frozen 0.1.21 `verify-quotes` command. Report and
source hashes remain unchanged; bundleHash changes with the root. The retained
replay files use original roots and match the original receipts byte-for-value.

Frozen component digest: `b433d4b8dd787bbe8b3b996a1677e690a54b5056fdd2ba926f0a7e97c43d0df9`.
Release digest: `9fa8e92f4e441b99610e7fa4e1cbcdc61a7640291791a934a7393c7286cba1ae`.
Release archive SHA256: `161e375cfab6692755d6e9aae3b142750e5aaf3633f653467a7a70f659dc9885`.

## Next gate

Strengthen complete-assertion quotation and distinguish an observed descriptive
result, generalization/repeatability, and causality in actual host judgment.
Retest both hosts on the full holdout and preserve failures. Neither this trial
nor the 433 automated tests replaces independent acceptance. No release approval,
push, deployment or commercial publication is claimed.
