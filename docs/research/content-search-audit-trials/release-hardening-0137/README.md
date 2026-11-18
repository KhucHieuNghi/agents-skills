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
with no gold answers or prior conclusions supplied to either host. Results are
pending. Artifact validity alone will not establish semantic acceptance. Known
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
