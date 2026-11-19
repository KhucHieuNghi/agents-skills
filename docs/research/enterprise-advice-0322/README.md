# Check-aware recovery advice — candidate 0.3.22

Status: targeted guidance correction with exposed development evidence. This is
not an official enterprise release, isolated holdout result or commercial score.

The [0.3.20 trial](../enterprise-native-dev-0320/README.md) retained a misleading
GSC recovery recommendation: a new provider evaluation was described as resolving
an existing canonical evaluation's provider-index-state placeholder. Runtime scope
includes evaluation kind; a new GSC population preserves the old unknown check.
Changing the original evaluation ID to a different kind is rejected.

The technical SEO reference now gives a check-identity-aware acceptance recipe:
retain the original obligation/status/request, assess the separately scoped new
provider checks, and report both. It does not introduce a replacement command or
change evaluator behavior. No other skill instruction or runtime code changed.

## Wording experiment

The task and two semantic criteria were frozen before five control runs, then five
candidate runs. Each used a fresh Claude Code session with its configured model,
no tool inventory, and the full skill entrypoint plus three relevant reference
bodies. The only context change was the added recovery paragraph. Returned model
telemetry was `claude-opus-5-5`; no model override was configured.

| Preregistered criterion                     | Existing guidance | Added recovery guidance |
| ------------------------------------------- | ----------------: | ----------------------: |
| Original/new-check recovery wording correct |               0/5 |                     5/5 |
| Quote-verification attribution correct      |               5/5 |                     5/5 |

Independent AI reviewer `measurement_workflow_review` read all ten responses,
checked hashes and traced the runtime scope/retention behavior. Since controls
already handled the quote-attribution task correctly, quote guidance was unchanged.
These are two scoped semantic verdicts, not complete prompt-format compliance or
precision/recall. Raw responses are retained verbatim, including JSON fences.
No statistical superiority, model-wide reliability or customer-impact claim follows.

Evidence: [task](microtest-task.txt), [control manifest](microtest-manifest.json),
[candidate registration](microtest-candidate.json), [results and source hashes](microtest-results.json),
and five responses each under `control/` and `candidate/`. Private raw event streams
and context snapshots remain in `build/enterprise-advice-microtest/`. Costs in the
receipt are host telemetry, not verified billing.

## Full installed development runs

One fresh run per supported host reused the previously exposed synthetic mixed
lead-generation/booking case, with unchanged input hashes. Thirteen criteria were
registered before either run. No matched baseline, randomization or enforced
filesystem isolation was present. No operator correction was supplied during runs.

| Host                |      Time | Check accounting             | Requests | Current report                                                                        |
| ------------------- | --------: | ---------------------------- | -------: | ------------------------------------------------------------------------------------- |
| Codex 0.166.0       | 166.641 s | 1 pass / 1 fail / 13 unknown |       21 | [HTML](codex/report/report.html) · [JSON](codex/report/report.json)                   |
| Claude Code 2.1.325 | 151.957 s | 1 pass / 1 fail / 13 unknown |       17 | [HTML](claude-code/report-r2/report.html) · [JSON](claude-code/report-r2/report.json) |

Both runs retain the supported canonical conflict and apply the original/new-GSC
check distinction. Neither claims complete site coverage or commercial acceptance.
Claude's own second revision preserves its first report and corrects retest wording;
this was native self-correction, not operator assistance. Both installed skill trees
remained unchanged throughout execution.

Independent reviews:

- Codex: `measurement_installed_forward_review` verified all 30 output hashes,
  transcript/final/input hashes and report validation. Twelve narrow criteria pass;
  the packaged quote-verifier behavior is not exercised. A custom field cross-check
  supports specific URLs, identifiers, timestamps and counts only. It does not
  replace the packaged verifier. No substantive source quotations were found, but
  the guide's unconditional ledger/receipt procedure was not executed: retain this
  separate procedural omission, not a fabricated-verification or quotation-error claim.
- Claude: `measurement_workflow_review` verified all 32 output hashes, transcript/
  final/input/prompt hashes and both run/report validation. Eleven criteria pass,
  criterion 11 is partial, and criterion 13 is not exercised. The authored narrative
  distinguishes a GA4 report from a GTM container but does not explicitly explain
  GA4 account configuration; that boundary appears only in generated fallback text.
  No packaged quote-verifier invocation or execution claim is present.
- Both reports contain paraphrases and literal field values rather than substantive
  source quotations. Independent review identified a product guidance gap: the
  local-report procedure unconditionally asks for a quote ledger/receipt, but the
  verifier rejects an empty quotes array. Neither host documented a zero-quotation
  inventory/N/A decision. Keep quotation accounting incomplete and define an
  explicit zero-quotation route in a future revision; do not manufacture quotations
  or claim an unsupported verification failure.
- Observed-action checks are transcript-bounded. RTK lapses remain operational
  observations; these runs do not establish filesystem isolation.

The [native manifest](native-trial-manifest.json), per-host final responses,
process receipts and freeze records are retained with original report bytes.
Complete transcripts/source runs stay privately under `build/enterprise-advice-0322/`.
Missing or unexercised behavior must not be promoted to a pass.

## Packaging boundary

[Package receipts](package-receipts.json) distinguish two unpublished build trees:

- Native runs used the initial archive, SHA-256
  `84635363dbda5cd7811f4b08528c2e816ecbcfd23ffcd3593447bcc4e8917950`.
- Formatting verification then required normalizing `provenance.lock.json`.
  A separately retained final archive has SHA-256
  `fd0ea8da715a46a48720984c623a6737c915db7ebe58210caefc0100b32ffaf9`.
  Its component digest is
  `433eaa1bd1942ce0183530f09bd28b8ff564cb9465d782c24052881f7cf3147e`;
  release digest is
  `b7278abcda89bff4c3133080731f1c3b85ed14535c6a2d50be908b345cfea816`.

Comparison proves the only skill-file byte difference is provenance formatting;
parsed provenance is identical. The final archive was freshly extracted and
installed into separate Codex and Claude Code projects, with matching component
and project-lock digests. No published archive was overwritten. Do not claim native
execution of the exact final archive from the initial-archive runs.

Repository tests pass 132 files / 1,608 tests, with lint, typecheck, build, formatting
and site checks. Package validation checks reference closure, notices and digests.
These checks establish package consistency, not behavioral or commercial acceptance.

The original trials and their failures remain unchanged. Broader P3–P7 work,
quote-verification workflow coverage, Claude's authored GA4 boundary, independent
holdouts, runtime isolation, pilots and owner risk acceptance remain open.
