# Native-host development repeat — candidate 0.3.20

Same exposed synthetic mixed lead-generation/booking case as [0.3.19](../enterprise-native-dev-0319/README.md),
fresh sessions, unchanged input hashes, no prior outputs copied into the trial
workspace and no operator correction during execution. Eleven criteria were
registered before either process started. One repetition per host, no baseline
and no enforced filesystem isolation: these results are not commercial scores.

| Host | Wall time | Final report | Independent review |
| --- | ---: | --- | --- |
| Codex 0.166.0 | 131.497s | [HTML](codex/report/report.html) · [JSON](codex/report/report.json) | Eleven narrow report criteria pass; acquisition crashed and self-recovered |
| Claude Code 2.1.325 | 203.717s | [HTML](claude-code/report/report.html) · [JSON](claude-code/report/report.json) | Prior recommendation issues improved; read-boundary qualification and two residual reporting defects |

Both reports retain one supported canonical conflict, 2/15 assessed checks,
13 unknown, 17 requests, and independent review pending. The four newly registered
criteria cover no-preference acceptance, discrepancy versus cause, attempt metadata
versus missing capture, and reporting versus account configuration. Codex satisfies
all four; Claude satisfies the first three with no observed GA4/config conflation,
although its explicit separation mainly appears in generated request fallback.
This single exposed case does not establish that the guidance reliably fixes those
errors across other tasks, profiles, repetitions or models.

## Defects and qualifications retained

Codex hit a product defect: a valid owner-brief evidence record without optional
artifactType was accepted by intake/canonical evaluation but crashed acquisition's
unguarded prefix checks. The host added a type and rebuilt new runs to recover.
The original failing intake/canonical runs remain frozen; successful final output
does not erase this runtime failure. Candidate 0.3.21 fixes the narrow defect and
replays those original inputs; see [verification](../enterprise-untyped-evidence-0321.md).

Claude's action A4 implies GSC evaluation resolves the original provider-index-state
placeholder. It creates separately scoped provider checks and does not automatically
replace that obligation. Its final answer also says a verifier could not check an
empty-target quote, but neither the frozen quote ledger nor transcript records
that attempted verification. The supported description is manual/unsubmitted
checking. These findings remain open; do not present this report as fully accepted.

Claude read a host convention file outside the literal inputs-plus-installed-skill
boundary. No network, external connector, form submission or site mutation was
observed, but a strict allowed-read pass is not established. RTK convention lapses
and masked shell errors remain separate operational observations. Future trial
criteria must explicitly cover source-obligation replacement and claims about
executed verification, without changing this frozen eleven-criterion manifest.

## Evidence

- [Trial manifest](trial-manifest.json), [inputs](inputs/brief.md), [results](results.json),
  [independent verdicts](independent-review.json).
- Codex review: `measurement_installed_forward_review`, 34 transcript records and
  all 25 output hashes verified. Claude review: `measurement_workflow_review`, all
  22 output hashes, transcript, three source runs and report projections verified.
- Original JSON/Markdown/HTML bytes, manifests, final responses and telemetry are
  retained here. Full transcripts/source runs remain locally under
  `build/enterprise-native-dev-0320/`; freeze records retain their hashes.
- Model overrides were absent. Codex actual model/cost remain unavailable in the
  emitted stream. Claude model/list-cost telemetry is recorded separately and is
  not verified billing. These conditions do not support a comparative speed,
  accuracy or cost claim.

## Isolation preflight — not a trial gate pass

A separate [container probe](isolation-preflight.json) used a pinned Node image,
read-only root/input mounts, a writable output mount, network none and no Docker
socket mount. Input reading/output writing succeeded; tested root/input writes
were denied, known gold/repository/socket paths were absent, and one outbound
TCP probe did not connect. This only establishes the observed container substrate
behavior. The actual host runs above did not use it. A verified tool bridge,
complete host tool inventory, forbidden-access challenges, output/time budgets
and independently isolated holdouts still need implementation and validation.

No customer website was changed; P3–P7 and commercial release remain open.
