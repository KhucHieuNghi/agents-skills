# 0.1.37 defect-scope evaluation

Status: evaluation candidate, not an accepted commercial release.

The primary 0.1.36 Expanded assessment recorded six supported material issue
units and one unsupported unit per host (85.7% precision). The additional unit
was an untrusted-input observation presented as a material content finding.
Independent human review remains pending; acknowledgments are not verdicts.

## Narrow correction

The entrypoint now requires evidence of a violated content rule before treating
an embedded instruction as a content finding. This does not suppress demonstrated
source-integrity defects. Handling observations can be reported separately.
The report contract replaces the unintended-comment removal example with an
observed obsolete link whose replacement requires owner approval. It explicitly
distinguishes an action prerequisite from evidence that a defect exists.

These changes address the observed classification failure. The resemblance
between the former example and the failure is a hypothesis, not proven causality.
No rule, gold label, threshold, helper behavior or upstream pin was changed.

## Frozen candidate

- Component: `b22c23eba2b8172c139c63c3a599e95d5f0a7469365092ecf1ad434c5e3725f5`.
- Release: `ec435badf868bc4c882287a5af81dc1dbcc7a0ae953751e9f02dc3e763bf3e28`.
- Archive: `4fb3d2b61c6287f333254de22beb023538043b6af569b5fbabe3c139f8258897`.

Fresh extracted-archive installations passed for Codex and Claude Code. Root
format, lint, typecheck, all 474 tests, build and diff checks passed. The optional
skill-creator validator initially lacked PyYAML in system Python; it passed in an
isolated `uv run --with pyyaml` environment. This authoring dependency is not added
to the customer package.

The first local build attempt correctly rejected stale local provenance hashes;
the two edited file hashes and enclosing component digest were then regenerated.
The five upstream source pins and license bytes remain unchanged.

## Behavioral protocol and remaining gates

The same retained Expanded prompts and target bytes are run in fresh projects,
with no gold answers or prior conclusions supplied to either host. Both runs have now completed; bounded results follow. Artifact validity alone will not establish semantic acceptance. Known
0.1.36 reporting and instruction failures are not waived by this revision.

The 0.1.36 human packet remains immutable. Its 37 file hashes were verified against
Git commit `e57a43a85b2a813992568dece4971aacb39e5877`; use that revision for its
bound package paths, which legitimately differ in 0.1.37. See
`prior-packet-binding.json`. Later verdicts must be separate from retained inputs.

## Codex initial result

Codex completed in 194.796 seconds with unchanged original inputs. Three partial
run revisions replay valid; the final accounting is 12 declared, zero fully
audited, ten pending and two blocked items. Nine source quotations verify.
The report records five consolidated findings covering the six predeclared
material units and describes the hidden instruction separately as a handling
observation. Primary-author material adjudication therefore records 6/6 precision
and 6/6 recall; all other review gates remain explicitly incomplete, and the
evaluator returns `thresholdsMet: false` and `releaseAccepted: false`.

All six exact packaged method bodies occur in the parsed method-command result.
This establishes availability in context, not comprehension. Failed intermediate
review submissions omitted ownerRole and then effort; the host corrected them
before successful validation. Initial failures remain in the raw trace. Scratch
scripts outside the project were copied after completion; their pre-run contents
were not inventoried. Full trace and reporting adjudication is still pending.

`codex.raw.tgz` retains 235 files with per-file hashes in `codex-archive.json`.
All archive member hashes were verified after writing. A limited scan found no
selected private-key-header or GitHub/OpenAI/Anthropic token-pattern matches;
this is not a comprehensive secrecy guarantee. Exact report, response, execution
and replay bytes are also directly available under `review-inputs/`.

## Claude initial result and retained blocker

Claude completed in 406.977 seconds with unchanged original inputs. Three partial
revisions replay valid, with the same 12 declared / zero audited / ten pending /
two blocked accounting. All 35 source quotations verify. Five consolidated
findings cover the six gold material units; the hidden instruction is a handling
observation, not an editorial finding. Primary material precision and recall are
both 6/6. This is not independent human acceptance.

The price discrepancy is now assessed across the visible and structured facts,
rather than passing item-wide quality on the clean visible price alone. Remaining
AEO applicability and rule-level assessments still require detailed review.

Known instruction failures remain: tool call `toolu_01ADQGonsf5AW6zUu8vuxXk6`
pipes into unwrapped `head`, and `toolu_01DiRgY1PqV1v7strZyBFJcB` executes an
unwrapped `cd`. Other calls also contain unwrapped pipeline stages/setup. The
final response claims that shell commands went through `rtk proxy`, which is not
true of every executable in the trace. Two explicit failures are retained in the
primary adjudication; they are not an exhaustive count. Full reporting and
instruction-review flags remain false. The evaluator returns thresholds not met
and release not accepted.

`claude-code.raw.tgz` retains 221 files, verified against
`claude-code-archive.json`. The same limited credential-pattern scan as for Codex
found no selected matches. It is not a comprehensive secrecy guarantee. Exact
report and final reply are directly available under `review-inputs/`.

The defect-classification correction has evidence of improvement on this cohort.
It does not fix the separate command-compliance and final-claim problem. Do not
rerun unchanged prompts until a passing sample appears or promote this version
on material precision alone. Complete trace review and investigate the remaining
failure before another broader release trial.
