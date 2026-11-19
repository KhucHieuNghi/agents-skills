# Native-host development trial — candidate 0.3.19

Two actual host CLI executions, one synthetic mixed lead-generation/booking case,
one repetition each, no baseline. These are development observations, not isolated
holdout results or commercial acceptance. The case, expected criteria and 300-second
limit were frozen before either host started. Inputs and skill were copied into
separate workspaces; filesystem isolation was **not** established. No operator
correction was sent during either run. Self-recovered errors remain in transcripts.

## Results and limitations

| Host | Version | Wall time | Result | Original report |
| --- | --- | ---: | --- | --- |
| Codex | 0.166.0 | 122.307s | Report produced; narrative caveat | [HTML](codex/report/report.html) · [JSON](codex/report/report.json) · [Markdown](codex/report/report.md) |
| Claude Code | 2.1.325 | 188.089s | Report produced; three recommendation/summary defects | [HTML](claude-code/report/report.html) · [JSON](claude-code/report/report.json) · [Markdown](claude-code/report/report.md) |

Both hosts identified the supplied canonical disagreement, retained owner intent
and provider indexing as unknown, recorded the failed collection attempt without
inventing a capture, and generated 17 actionable requests across 10 scoped modules.
Reports show 2/15 assessed checks, one failure, 13 unknown and review pending.
This is scaffold/check accounting, not whole-site coverage or 15 independent tests
of product effectiveness. Both canonical report manifests and installed validators
passed after output freeze.

Independent reviewer `measurement_installed_forward_review` accepted all seven
narrow preregistered criteria for both outputs. That **does not** make the overall
customer recommendations acceptable. The original rubric did not fully capture
the recommendation and final-summary defects below. They remain explicit findings;
the rubric must be extended before commercial trials, not retroactively presented
as a clean pass. [Structured independent review](independent-review.json).

- Codex's narrative combined GA4 reporting with event/key-event configuration
  exports. Its canonical data request correctly separates those sources.
- Claude allowed the owner to state no canonical preference but later required
  owner-intent to pass; null policy correctly leaves that check unknown.
- Claude called source/rendered disagreement a rewrite without evidence of the
  mechanism, and its final response incorrectly said the failed attempt lacked
  details. The capture was absent; attempt metadata was present.
- Codex recovered two field-name errors (`ownerRole`, `requestId`); later shell
  success masked those inspection failures. Actual fields are suggestedOwnerRole
  and id. Claude recovered an intake failure caused by a missing parent directory.
  RTK convention lapses were observed; no customer mutation was observed.

No network request, form submission, customer modification or invented independent
approval was observed in either transcript. This is an observational transcript
review, **not** proof of enforced filesystem/tool isolation.

## Evidence and telemetry

[Preregistered manifest](trial-manifest.json), [results](results.json), original
[inputs](inputs/brief.md), per-host freezes and report manifests retain input/output
identity. Full transcripts, generated source runs and harness remain local in
`build/enterprise-native-dev-0319/`; transcript hashes are retained in each freeze.
Report bytes have not been edited after review.

No model override was supplied. Claude emitted `claude-opus-5-5` and USD 1.0190902
list-cost telemetry; this is not verified billing. Codex emitted token usage but
neither actual model nor cost in the retained JSONL stream, so both remain null
with reasons. See per-host telemetry JSON. Cached-input counters are not unique
prompt size and cannot support a cost comparison. One uncontrolled repetition,
different/unconfirmed models and no matched baseline cannot establish relative
speed, quality or commercial cost.

## Follow-up

Candidate 0.3.20 adds guidance for the observed no-preference branch, discrepancy
versus cause, absent capture versus attempt metadata, request field names, output
parent directories and report/config separation. These are guidance corrections,
not proof that host behavior is fixed. Preserve this original trial. Any rerun is
an exposed development case; corrections to these outputs must be labeled assisted.

Remaining commercial work includes a validated scorer/runner, enforced isolation,
independent holdout cases, three matched native/baseline repetitions per host,
distinct defect/control denominators, uncertainty, real-profile pilots and the
broader P3–P7 implementation requirements. No precision, recall, superiority or
enterprise-release claim is derived from this trial.
