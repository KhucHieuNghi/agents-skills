# Content Search Audit candidate evaluation

Status: evaluation open, 2026-11-18. Installation/transport/helper correctness is
not evidence of semantic audit accuracy. Production remains the published 0.1.32
evaluation candidate; development 0.1.35 is not accepted or deployed.

## Current assessment — 0.1.35

See [the release execution plan](../plans/content-search-audit-official-release.md)
and [0.1.35 evidence](content-search-audit-trials/release-hardening-0135/README.md).
473 automated tests pass and fresh archive installs match on both hosts. Codex
Expanded completed with 23 verified quotes and valid partial artifact replay;
RTK instruction deviations remain. Claude Expanded completed with 33 verified quotes; RTK and rule-dependency reporting errors remain. Independent
human verdicts and the remaining current-version cohorts are not complete.

The [0.1.34 evidence](content-search-audit-trials/release-hardening-0134/README.md)
retains the repeated Claude narrative error and both public outcomes: Codex
completed, Claude timed out after 900 seconds without a final handoff. The timeout
is not waived because saved artifacts validate. Earlier semantic metrics and
successful executions do not automatically transfer to a changed package.

## Historical assessment — 0.1.29

The current versioned package is 0.1.29; the 0.1.0 baseline and subsequent sections
below are historical records. [Native-0129](content-search-audit-trials/native-0129/README.md)
contains the latest offline reports, validation/quote receipts and hash-bound
full-report adjudications. Each host has six supported finding units and matches
six gold units; the cohort is repeated synthetic development data. Codex replays
17 quotes and Claude 22. Both preserve four pending/zero fully audited items.
The v2 receipts complete the recorded-tool-trace review: Codex meets the local
evaluator gates on this cohort; Claude does not, because a reporting error and
RTK instruction deviations remain. This is not process-level network attestation.
`releaseAccepted` remains false for both. See the [current completion assessment](content-search-audit-completion-audit.md)
for cross-scenario limits, source closure and outstanding work.

The additional [expanded-0129 cohort](content-search-audit-trials/expanded-0129/README.md)
also completed on both hosts. Five editorial findings cover six gold defects, and
Claude separately records a hidden-instruction concern. Both retain the two absent
media URLs in the 12-item inventory. Codex resolves 20/312 checks and verifies 14
quotes; Claude resolves 16/312 and verifies 31. Claude's summary overstates absence
of AI observations despite the supplied historical aggregate. The v2 recorded trace
review is complete and shows no execution of the embedded hostile command. Claude
also has 11 nonleading-RTK Bash inputs out of 14. Do not pool this cohort with
support-methods scores or treat its traced boundary result as universal defense.

## Frozen package baseline

The separate `catalog.content-search-audit-candidate.yaml` indexes
`solutions/content-search-audit.yaml` version 0.1.0 for evaluation. It contains
exactly one bundled component and one customer-facing SKILL.md. Internal methods
retain five attributed source locks and included license notices.

| Artifact          | SHA-256 / tree digest                                            |
| ----------------- | ---------------------------------------------------------------- |
| Skill component   | d4f7a4beb59affc8a9bcfd7a473faa06585507eead699d9bdc3f8f48f2fa768f |
| Release directory | 8ea3064552f5bdf6f5c5d64a6cc867eaaaa4a939b0c8184953bb0eedbdf19621 |
| 0.1.0 archive     | 967c841f891c1b86bdaa17987dba4fd6b91831e567c0a590e33e1a0e9dc13f16 |

Local artifacts are under `build/`: `content-search-audit-candidate-0.1.0/` and
`agent-skills-solution-content-search-audit-0.1.0.tgz`. These bytes were built before
host trials and must not be silently overwritten if trial fixes change the skill.
A changed package needs a new candidate version and refreshed evaluation bindings.

## Actual archive installation evidence

The archive was listed, extracted into a new temporary directory and verified with
`verifySolutionRelease`. CLI installs used the extracted `package/` directory and
its independently recomputed digest, not the development skill directory.

| Fresh project | Observed skill surfaces                                                      | Result                                                                                 |
| ------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Codex         | `.agents/skills/content-search-audit` only                                   | Matching component hash and installed lock; packaged helper --help executed            |
| Claude Code   | `.claude/skills/content-search-audit` only                                   | Matching component hash and installed lock; packaged helper --help executed            |
| Both          | One canonical `.agents/skills/content-search-audit`; Claude path links to it | Both surfaces resolve to same component bytes; no upstream skill entrypoints installed |

Exact project paths, release hashes, link target and installation locks are in
[the installation snapshot](content-search-audit-installation-snapshot.json).
The projects remain available for subsequent behavioral trials. Observed host
versions: codex-cli 0.166.0; Claude Code 2.1.325. The installer/helper runtime was
Node v24.19.0. Host availability/version is not a behavioral pass.

The probe initially assumed `solutions.lock.json`; actual source and filesystem
showed `.agent-skills/installed.json`. Existing successful installation was retained
and inspected. It also exposed misleading CLI help: `both` was advertised although
the parser requires `codex,claude-code`. The help text was corrected to match the
existing parser; no supported host or installation path changed.

## Upgrade and local-change protection

A separate **test-only** 0.1.1 manifest used the same component bytes to exercise
version transitions. Its archive was extracted and independently verified. A fresh
both-host 0.1.0 installation was then modified locally in README.md; upgrade failed
with `Installed skill was modified: content-search-audit.` After restoring the exact
fixture bytes, upgrade succeeded and the installed lock recorded 0.1.1 and the
new release digest. Original 0.1.0 archive/installations remain intact.

This verifies version/lock/local-modification handling for this actual package.
It does not claim a new released skill behavior in 0.1.1. The snapshot labels that
artifact fixtureOnly and records its digest. Release publication is not performed.

## Behavioral and acceptance work still open

- Expand the five semantic seed cases to the full spec fixture classes and keep gold
  outside model-visible target inputs.
- Independently run Codex and Claude Code against the same frozen package, inputs,
  tool access and task prompts; record host configuration and limitations.
- Exercise offline export, authorized public collection, missing analytics and
  interrupted/resumed full inventory on both hosts.
- Adjudicate findings and clean controls, with evidence for true/false positives,
  false negatives and instruction-boundary failures. Do not equate parser/test
  success with semantic precision or recall.
- Meet the specified precision/recall and critical-case gates, or retain candidate
  status and record concrete failures. No precision, recall, cost or uplift is
  asserted from the installation checks above.
- Complete requirement-by-requirement audit, schema/documentation closure and
  release review after any resulting fixes; repeat only affected verification.

## First actual semantic host trial

Four CLI runs completed against five synthetic seed files, with and without the
installed 0.1.0 skill on each host. All four matched the five labeled material
issues and accepted the clean control. Both Claude outputs introduced incorrect
elapsed-date arithmetic; the skill arm also misattributed a quotation across files.
Required reference loading was incomplete on Claude. No semantic release pass or
measured skill uplift is claimed. See [retained outputs and manual adjudication](content-search-audit-trials/semantic-seeds-01/README.md).

The baseline already found all seed issues, so this small trial cannot demonstrate
added detection value. Full scenario coverage and independent acceptance remain
open. Candidate bytes are unchanged; fixes require a new version and targeted
reruns, preserving this baseline.

## 0.1.2 evidence-review candidate

The next candidate changes only SKILL.md and the original evidence contract, plus
its provenance hashes. It requires source-specific quotation verification,
deterministic arithmetic or omission of derived estimates, a check for already
present information, and review of the auditor's own proposed corrections. These
are responses to observed 0.1.0 failures, not a claim that guidance alone fixes them.
Version 0.1.1 remains the earlier upgrade-only fixture; 0.1.2 is the next behavioral
candidate. All upstream revisions, adaptation provenance and licenses are unchanged.

| Artifact          | Digest                                                           |
| ----------------- | ---------------------------------------------------------------- |
| Component         | bff4d635eafc467245bbd415beb0b6fde9a169825f2a0198d5d45477587d1cde |
| Release directory | bfb906ff62a6a0627587af64cdf762e6d8750c86b67df62c86240742eb0ecf99 |
| Archive           | 973e43738d1b6da1f64d7d891e43c8dc02c8cdcb32b712c628987a16c6143f43 |

Built a new archive, extracted it and installed into ten fresh projects for five
repetitions per host using the original seed prompts. 0.1.0 artifacts were retained.
The five repetitions assess response variability on the known regression input;
they are not independent held-out cases or proof of general semantic accuracy.
Results must be adjudicated after every process finishes.

All ten 0.1.2 processes have now completed. The incorrect 21-month estimate and
cross-file clean-control misquotation did not recur, but clause-level false
positives, unsupported correction qualifiers and incomplete procedure adherence
remain. Two Claude Skill calls returned Unknown skill under the restricted trial
configuration. See [all repeated outputs and adjudication](content-search-audit-trials/semantic-seeds-012/README.md).
A fresh combined-host installation also passed package-surface checks. This is
still a candidate; see the [requirement completion audit](content-search-audit-completion-audit.md)
for explicit outstanding deliverables.

## Native Claude discovery resolved in the test configuration

A fresh normal project-settings run registered and invoked the installed 0.1.2
skill. A controlled pair differing only by --restricted reproduced registration
and successful invocation without that flag, versus absent registration and Unknown
skill with it. Package bytes and paths were unchanged. See [runtime evidence and
limits](content-search-audit-trials/claude-native-012/README.md). This resolves the
trial configuration diagnosis, not all semantic or end-to-end acceptance work.

## First offline artifact-producing workflows

Both hosts produced real collected/reviewed report bundles for four synthetic
English/Vietnamese/JS-shell/PDF items. Independent validation accepts both bundles
structurally and rejects full completion: 0 fully audited, 3 pending, 1 unsupported.
Source hashes are unchanged. The pricing contradiction is persisted by both;
Claude additionally overstates a metadata finding and invents a precise review
timestamp. Two failed permission-configured Claude attempts are retained separately.
See [artifacts, configuration and adjudication](content-search-audit-trials/offline-012/README.md).

## 0.1.3 persisted schema candidate

Added seven draft-07 record schemas and common definitions, linked from artifact
validation guidance. They describe standalone persisted artifacts and supplied AI
observations, with explicit required fields, branches and unavailable values.
They do not claim coverage of campaign/discovery/provider configuration schemas or
replace semantic, timestamp, hash or cross-record validation. Tests explicitly
show that a shape-valid wrong hash fails runtime validation and that a future
ISO timestamp still passes shape validation.

Five new tests cover strict compilation, all retained offline host run revisions,
fresh helper output, malformed records and AI captured/error branches. Ajv 8 and
ajv-formats are development-only dependencies; the customer helper remains without
runtime dependencies or install-time downloads. Initial strict compilation caught
missing conditional array types/property declarations; corrected before packaging.
Full verification passed: 52 files / 380 tests, format, lint, typecheck, build and
diff checks.

| Artifact          | Digest                                                           |
| ----------------- | ---------------------------------------------------------------- |
| Component         | 553f0ad69fdd2c143226db26052a32096f771fdd9cf48a57cef4261831b3f65a |
| Release directory | bc3cba0a5b63e8fc3636de5874b2be51822947dc200b6b24c17dbe16f9aa319c |
| Archive           | 7a3fff6a9502a41bb85e72b8b35688796c3ff827a9fa3c34f35ad981589e8db2 |

Built a new archive, extracted and installed into fresh Codex, Claude Code and
combined-host projects. Each has one entrypoint and eight schema files; helper
help executes, component digests match, and all installed schema references compile
offline. See [installation receipts](content-search-audit-schema-installation-snapshot.json).
Prior frozen archives remain intact. Behavioral host trials were not repeated for
this schema-only change; previous semantic failures remain open, not inherited as
passing results. This is not a commercial release.

## 0.1.4 new-review time admission

New standalone/partition reviews and newly written global campaign receipts now
validate reviewedAt and newly attached collectedAt against a captured admission
clock. Values must have an explicit ISO timezone, a possible calendar date/time,
and cannot exceed the clock by more than five minutes. Historical source records
are not rewritten or rejected retrospectively by this new gate. reviewAcceptedAt
records helper admission separately; plausible past times are not authenticated.

The actual future-timestamp bundle from the Claude offline trial was replayed
through the native CLI and rejected before output creation. Source run bytes stayed
unchanged. See [the live regression receipt](content-search-audit-review-time-regression.json).
Tests cover both timestamp fields, timezone equivalence, leap/invalid dates, the
exact skew boundary, immutable source retention, historical submissions and global
campaign admission. Existing submission fixtures now use actual test time instead
of arbitrary future midnight; historical archived evidence is unchanged.

Full verification passed: 53 files / 385 tests, format, lint, typecheck, build and
diff checks. The new archive was extracted and installed into three fresh projects.
Each packaged helper rejects the observed bad bundle and accepts a new empty review
with reviewAcceptedAt inside an independently measured start/end window; structural
validation remains valid and completion remains false.

| Artifact          | Digest                                                           |
| ----------------- | ---------------------------------------------------------------- |
| Component         | 3c2cc13a071f1dfd5e7a094d397798c987799d9cac8647197abf61e99c32c510 |
| Release directory | 3dc0a595303bcda6e03ced30e9f3d12f4ef1d0104f8df3cd1c9226e1d7edb8d4 |
| Archive           | 14cad6ee7defad4f927eb2553e6a04eb2b37dc30cc401b59f862e81df56ddb8a |

[Installation and packaged checks](content-search-audit-review-time-installation-snapshot.json)
retain exact evidence. This closes admission of the observed impossible future
review time, not semantic accuracy or all timestamp provenance: fabricated past
values, compromised clocks and incorrect source assertions still require review.
No model trial or commercial-release pass is inferred from deterministic checks.

## Expanded semantic dossiers on frozen 0.1.4

Two fresh native host sessions reviewed ten new synthetic dossiers: indexing
directives, redirect loop, structured offer, cross-page entitlement conflict,
Vietnamese policy, unknown JS rendering, Vietnamese-only clean procedure, scoped
historical panel, unavailable PDF/video and an embedded hostile instruction.
Gold stayed outside their projects. Both processes completed; Claude invoked the
native Skill tool and Codex read the installed entrypoint and method references.

Primary-agent manual adjudication found 6/6 material gold units in each response,
with no additional unsupported material content defect under this small rubric.
All ten dossiers and both unavailable media URLs were accounted for. No fabricated
measurement or full-site completion claim was found. Observed tool calls contain
no network or injected-command attempt; target hashes stayed unchanged and neither
project contains the injection marker. This is not a general security guarantee.

Claude retains precision problems: raw HTML “no content” overlooks title text,
“no later measurement exists” overstates unavailable evidence, abbreviated URL
quotations are not verbatim, and sitemap regeneration lacks an observed need.
These are documented separately from the six material finding units; earlier
semantic regressions are not declared fixed by one new case.

[Retained responses, trace and adjudication](content-search-audit-trials/semantic-expanded-014/README.md)
state the small denominators and limitations. This was final-response evaluation,
not an artifact-producing public/resume workflow or independent human acceptance.
Package bytes did not change; the latest code checks remain 53 files / 385 tests.

## Real public pilot on frozen 0.1.4

Both native hosts resumed an identical terminal budget checkpoint from the live
NKSkills origin, then collected and reviewed all 12 discovered same-origin URLs.
They persisted item/global reviews and HTML/Markdown/CSV reports. The 11 discovery
captures include one historical replay; neither host needed more count/depth budget.
This is budget-stop continuation, not an interrupted-process fixture.

Independent validation passed for source/resumed discovery, final campaigns and
global receipts. Retained archives extracted cleanly with all file hashes matching;
extracted campaign/global validators passed again. Initial checkpoints, installed
package digests and report manifests were rechecked after both hosts terminated.
Both reports are partial: 0 audited / 12 pending, with no missing planned checks.
Codex records 88 pass, 4 fail, 6 NA, 214 unknown checks; Claude 57 pass, 4 fail, 3 NA,
248 unknown. Global completion is also false.

The hosts identified different supported issues: missing release-revision selection
in four build recipes versus literal backticks and English comma defects. Primary
review confirmed the captured passages and five reciprocal locale pairs, while
retaining applicability and prose-precision concerns. These findings are not a
labelled benchmark or demonstrated search impact.

A real helper limitation was independently reproduced: valid newly added text
extraction does not refresh the persisted unknown deterministic check, although the
rule evaluator returns pass. Host-authored deterministic pass remains correctly
blocked. A recomputation fix, immutable evidence tests and a new candidate are
required; no frozen archive was modified.

[Full pilot evidence and adjudication](content-search-audit-trials/public-pilot-014/README.md)
includes configurations, exact outputs, selected traces, archival replay and the
reproduction. A missing composition source-mapping regression was also added; the
current root suite passed 53 files / 386 tests plus lint/typecheck/build. This does
not close remaining semantic, interrupted-process, source-closure or human gates.

## Deterministic evidence refresh and frozen candidate 0.1.5

The actual 0.1.4 public-pilot bundle now refreshes the planned deterministic
readable-text check when valid extracted text is attached. An empty review also
repairs the accepted legacy revision whose unattributed unknown check was stale.
Host-authored deterministic pass/fail remains rejected. Multiple retained matching
snapshots remain unknown; semantic judgments are not inferred from extraction.

Six regression tests cover legacy repair, immutable evidence and transitive
lineage, ambiguity and pending-state recovery, finding reconciliation, host/hash
rejection, and campaign-part ownership. An old failure cannot leave an unsupported
finding after recomputation. No historical artifact or frozen archive was edited.
Full verification passed: 54 test files / 392 tests, lint, typecheck and build.

Candidate component digest:
`b096ebbc2c9c85544bbf57b0572c711952f03b6004cb060b1ec42804158fd16f`.
Release digest:
`f1f0b51e40fe835adec065ee71d044af27162a2f3505740c5f6d2d3670651ec0`.
Archive SHA-256:
`78985786cb863bc63bfe4fe1f9ca0a0b2b1db08dcbb9b2db066d51bbc37a108d`.

The extracted archive was installed into fresh Codex, Claude Code and combined
projects. All installed component digests and composition closures matched; both
actual-pilot replay cases passed in each installation, with overall audit
completion still false. Upgrade from 0.1.4 to 0.1.5 succeeded. CLI downgrade was
correctly rejected. Restoring an isolated project snapshot recovered all original
hashes and customer content; this is not a general concurrent customer recovery
claim. A locally edited installation rejected upgrade without altering the edit
or lock. Receipts are retained in
[refresh installation snapshot](content-search-audit-refresh-installation-snapshot.json)
and [actual regression replay](content-search-audit-evidence-refresh-regression.json).

Source pins remain unchanged. This closes the observed refresh defect, not the
remaining semantic, source-research, interrupted-process or human acceptance
gates. Public catalog and deployment remain unchanged.

## Source mapping and candidate 0.1.6

Applied the 26-rule research disposition without changing IDs, execution modes or
required evidence. Replaced generic technical references, removed crawler docs as
support for entity consistency, and distinguished direct documentation, attributed
methods and original diagnostics. Non-HTML canonical applicability now explicitly
covers HTTP Link headers. The existing authorship-proof prohibition is unchanged.

Full checks passed: 54 files / 392 tests, format, lint, typecheck and build.
Component digest: `f8479a3da5ae9a0b092bd7716b29b497805e709018d4ec2c50a401d349949e07`.
Release digest: `5233d920c3176b1ea8b0b68874086a07509d56f4d84111e5349691c5b66aeb43`.
Archive SHA-256: `19046d3268b83a01678816f7da570b2a2dcf95fc25e78759e4454360fdabf061`.

Fresh extracted-archive installs succeeded for Codex, Claude Code and combined.
Each installation's digest, composition closure and lock matched. Both native
hosts completed five bounded reference-application cases, with all principal
conclusions supported; Claude retained several wording/coverage overstatements.
See [source-boundary trial](content-search-audit-trials/source-boundaries-016/README.md)
and [installation snapshot](content-search-audit-source-installation-snapshot.json).
Post-trial installed bytes remained unchanged. Earlier upgrade/rollback evidence
belongs to 0.1.5; it is not presented as a new 0.1.6 upgrade test.

The public catalog is unchanged. Interrupted-process recovery, remaining semantic
coverage, plan reconciliation and independent acceptance remain open.

## Actual SIGKILL recovery on frozen 0.1.6

Killed the packaged collection subprocess after observing committed cursor 500
of 1,200 and confirmed signal termination. Both native hosts independently
recovered the stopped artifact into new outputs. Independent and archive-replay
validation confirmed 1,200 unique items, 1,200 evidence records and 31,200 checks,
with zero missing planned records. All items remain pending; no semantic review
was fabricated. Source checkpoint, config, content and installed bytes match.

Claude's final prose incorrectly reports 28,200 checks and overlooks saved cursor 500. Its artifacts are correct. These are retained reporting failures, not waived
because the helper succeeded. See [full interruption evidence](content-search-audit-trials/interrupted-process-016/README.md).

Added an actual subprocess/SIGKILL regression without changing packaged code.
The full suite passes 55 files / 393 tests; lint and typecheck pass. Frozen 0.1.6
and upstream pins are unchanged. Committed-boundary recovery is proven here;
transactional multi-file crash consistency, general semantic/report fidelity and
independent acceptance remain unproven.

## Explicit adjudication aggregation

Implemented the planned author-side `scripts/eval-content-audit.mjs`; its
[contract and usage](content-search-audit-evaluation-tool.md) distinguish semantic
issue metrics, reporting fidelity, case accounting and instruction-trace review.
Exact response hashes and quotations are checked; CLI outputs bind the review
JSON hash and refuse overwrites. Unsupported, unjudged, empty and incompletely
reviewed denominators cannot produce perfect scores. Duplicate gold credit is
rejected, and cohorts/hosts/repetitions are not pooled.

Retrospective receipts bind six supported Codex expanded-fixture gold units and
two Claude interrupted-recovery reporting errors. Their review inventories remain
explicitly incomplete, so precision/recall are null and acceptance stays false.
These files formalize bounded historical evidence without claiming that all
response assertions have been judged. Source references still require actual
review; an aggregator cannot certify adjudication truth or independent acceptance.

Eight tests cover metric/gate boundaries, integrity, duplicate credit, explicit
trace review and new-only CLI output. Customer package 0.1.6 is unchanged; this is
an author tool, not an additional customer skill or automatic model judge.

## Author-side verification command

The planned package/artifact verification command now exists. Its
[contract](content-search-audit-verifier.md) and retained input/result distinguish
provenance, extracted-release integrity, artifact validity and explicit completion.
Seven tests cover failure paths and new-only CLI output. Actual execution validates
frozen 0.1.6 and both recovered 1,200-item runs; audit completion and release
acceptance remain false. The command does not replace archive installation or
semantic/human evaluation and does not execute code from supplied packages.

## Accuracy implementation and frozen 0.1.7

Eight new tests cover the supplied AI-answer accuracy contract and report paths;
full verification passes 58 files / 416 tests plus format, lint, typecheck and
build. A response containing one correct and one incorrect adjudicated material
claim yields claim accuracy 1/2 and fully reviewed response accuracy 0/1. Unknown,
empty, absent and incomplete reviews retain their distinct coverage states.

Component digest: `8dedea6c52a9483b21b6b5befb0b256bee783d89ba7d99f802218b71e649d210`.
Release digest: `084b7e7cf371cc4ebcec5d96e35e486e40b3c8b4dc7467401f2e6cfb138a5871`.
Archive SHA-256: `c01d126c12312dee62cdbe64be0f552971db89bf2bfe243437c87602b72e1b45`.

Three fresh extracted-archive installations passed the fixture, legacy absence and
source-tampering probes with matching component/composition/installation locks.
See [installation receipt](content-search-audit-accuracy-installation-snapshot.json)
and [fixture](content-search-audit-accuracy-fixture.json). Both report paths retain
exact responses and supporting sources, compute identical rates and expose unknown
coverage; campaign manifests hash the new evidence bundle.

These are deterministic helper/schema/report results, not new native host trials,
authenticated customer observations or independent semantic acceptance. Earlier
native reporting defects remain open. Package pins and prior archives are intact.

## Native accuracy trial and CLI correction — 2026-11-16

Both actual native 0.1.7 host sessions correctly reported supplied claim accuracy
1/2, eligible response accuracy 0/1, unavailable mention/citation denominators,
and partial audit coverage (1 item, 26 unresolved checks, 4 global rules).
Input bytes, installed digests and report manifests independently validate.
See [the trial record](../research/content-search-audit-trials/native-accuracy-017/README.md).
Both exposed the same campaign CLI omission of the `measurements` option and used
the installed renderer directly. Candidate 0.1.8 corrects the allowlist; a direct
CLI regression reproduces the failure before the fix and passes afterward, while
registry overrides remain rejected. Fresh Codex, Claude Code and combined archive
installs pass digest/provenance checks; both actual saved campaigns replay through
the installed 0.1.8 CLI with exact input preserved. Combined-host links are resolved
before digest verification. Root verification: 58 files / 416 tests, format, lint,
typecheck and build pass. This is a bounded fixture success and CLI replay, not
new native 0.1.8 sessions or overall semantic acceptance. Historical archives remain
unchanged; the commercial catalog has not been modified.

## Mixed-source and alternate-locale native trial — candidate 0.1.8

See [the retained trial](content-search-audit-trials/mixed-locale-018/README.md).
Both fresh hosts identify the incorrect current Vietnamese seat count and missing
reciprocal English hreflang annotation. They preserve jurisdictional policy and
historical-version clean controls, all five URL identities, source membership and
unknown analytics. Exact discovery receipts independently recompute, original input
and installed package hashes match, and 18 archived files replay byte for byte.
Claude adds a stale Search Console International Targeting verification step;
this remains a failed reporting-fidelity check. Two gold matches per host are a
bounded result, not general accuracy or independent acceptance. No runtime package
change was made. Follow up with capability-freshness guidance and a new-version
regression trial, preserving these exact historical artifacts.

## Native capability regression result — 0.1.9

Both fresh host sessions completed with exactly the preceding trial prompts and
same target fixtures. Both preserve the two gold findings, clean controls, source
memberships and missing analytics queue. Neither repeats the retired International
Targeting recommendation. Claude explicitly marks optional diagnostics availability
unverified offline. Hash checks prove target/package preservation and exact discovery
recomputation; all 18 archived artifact files replay byte for byte.

Claude retains two other report errors: a broad claim that all three sources agree
on all five URLs despite only two CMS rows, and an AEO clean summary contradicting
its own F1. These are retained, not hidden behind the targeted regression outcome.
This is one repeat per host, not causal proof, broad semantic acceptance or human
release approval. See [the trial record](content-search-audit-trials/capability-freshness-019/README.md).

## Structured complete-report adjudication — 0.1.9 trial

The retained capability-freshness-019 reports now have complete issue inventories
and generated author-evaluator receipts. Each has 2 supported predicted issues / 2
adjudicated issues and 2 matched gold / 2 declared gold units. Codex meets the local
rubric; Claude fails reporting because of two report inconsistencies. Both remain
releaseAccepted=false. This tiny retrospective, primary-agent-authored rubric does
not establish general precision/recall or independent product acceptance.

Recorded tool-call review accounts for all 11 Codex and 8 Claude invocations and
terminal results. Exact write payloads bind the archived report; local reads,
discovery and output-only writes are consistent with the bounded authorization.
No network/credential/installer/source-write action appears. Tool input inventories
and stream hashes are retained; this is not process-level network attestation.
No runtime/package/evaluator change was needed. Whole-report bytes, input hashes
and generated evaluation receipts make this checkpoint reproducible.

## Unified backlog metadata — 0.1.10

The [backlog regression](content-search-audit-trials/backlog-0110/README.md) fixes
local owner/effort loss in campaign HTML/Markdown/CSV and validates optional global
assignments while preserving legacy omissions explicitly. Red/green tests and
fresh three-target installed CLI reports verify the correction. 58 test files /
417 tests and required root checks pass. This closes the Task 6 structured-backlog
implementation item, not semantic reporting acceptance or every report requirement.

## Named output parity implemented — 0.1.11

Campaign coverage.json, optional shared ai-observations.jsonl and the campaign
rule-source/date appendix now close the three output omissions observed at 0.1.10.
Coverage uses an explicit campaign envelope and dedicated schema; standalone format
is unchanged. JSONL deduplicates validated rows while preserving raw input in the
original JSON evidence bundle and carries synthetic context plus bundle hash.
Three regression tests failed before implementation; current root checks pass
58 files / 418 tests, format/lint/typecheck/build/diff. Fresh three-target installed
CLI replays verify schemas, exact inputs, all 26 rule source/date entries, coverage
and manifest hashes. Historical source bytes are unchanged. See output-parity-0111
trial and content-search-audit-output-installation-snapshot.json. This is not a
new native model run or semantic acceptance. Action-type parity and independent
review remain open; Task 6's compound output requirement is not yet fully checked.

## Action proposal parity — 0.1.12

Standalone/campaign reports now share validated keep/update/consolidate/investigate
proposals with paired nonempty actionReason. Explicit reviewer proposals and default
triage are labelled separately in HTML/Markdown/CSV. No proposal grants implementation
approval or mutates coverage, inventory or evidence. Unsupported/unpaired values fail
validation; legacy defaults remain update for observed local findings, investigate
otherwise. Four pre-fix assertions failed; post-fix tests pass with existing escaping.
Fresh three-target installed review CLI produces all four proposed-action revisions,
retaining exact audit facts and partial completion; historical campaign replay checks
legacy defaults and manifest hashes. Full 58-file/419-test suite and root checks pass.
See actions-0112 trial and content-search-audit-actions-installation-snapshot.json.
This closes the action-type parity gap, not broad semantic acceptance or a new native
model trial. Earlier frozen packages and observed model report errors remain unchanged.

## Supplemental semantic development holdout — 0.1.12

[Both native hosts completed](content-search-audit-trials/semantic-holdout-0112/README.md)
12 new dossiers with 15 author-labeled material units and clean controls, covering
the dedicated case gaps identified in the rule map. Both identify the 15 units;
this is bounded primary-agent review, not accepted general precision/recall.
Source/gold hashes were frozen before execution, gold absent from host projects,
inputs and packages unchanged, and 28 archived files replay exactly. Codex's 30
finding quote spans match cited line ranges. Claude retains a concrete shortened
quotation error and ambiguous observed-change wording; full evaluator adjudication
and independent acceptance remain open. Fixture presence and execution now have
evidence; the associated semantic acceptance gates are not closed.

## Complete supplemental-report adjudication — 0.1.12

Both [semantic-holdout reports](content-search-audit-trials/semantic-holdout-0112/README.md)
now have hash-bound full-report adjudications and generated evaluator receipts:
15/15 supported predictions and 15/15 matched gold units, with all 12 dossiers plus
scope context accounted for. Codex meets this local rubric. Claude fails reporting
(two errors) and command-format instruction following (four RTK-prefix deviations).
The source-scope boundaries and no-mutation checks pass on recorded evidence.
These are primary-agent assessments on a development fixture, not general accuracy,
independent human review, system-level network attestation or commercial acceptance.
Both releaseAccepted flags remain false. The earlier pending-evaluator statements
for this particular holdout are superseded; the other product gates remain open.

## Exact-candidate public pilot — 0.1.31

[Public-pilot-0131](content-search-audit-trials/public-pilot-0131/README.md)
completed sequential native runs on Codex 0.166.0 and Claude Code 2.1.325.
Both preserve 97 original files, validate six output directories, collect the same
12 URL content hashes and report 0 fully audited / 12 pending with 312 check rows.
Codex has one local finding; Claude four, including two explicitly inferred
editorial proposals which are not proven freshness/contradiction failures.
Claude has 29 nested-shell RTK violations among 32 Bash calls; recovered errors
and full tool traces are retained. Nine Claude supplemental quotes revalidate.
The 683-file archive was rehashed against original bytes. The author's directory
scanner initially misidentified an input config as a campaign output; both the
original and corrected verification receipts are retained. No runtime/package
change was made, no accuracy denominator was invented, and no Task 9 compound
gate or human acceptance is closed by this bounded pilot. Current-version native
interrupted/resume and remaining fixture/semantic acceptance still need evidence.

## Current native interrupted recovery — 0.1.31

[Interrupted-process-0131](content-search-audit-trials/interrupted-process-0131/README.md)
uses an actual SIGKILL at cursor 500, terminal exit -9, and identical stopped
artifacts on freshly installed Codex and Claude Code. Both recover all 1200 IDs,
1200 snapshots and 31200 check records; all remain unknown/1200 pending and
completionAllowed=false. Each preserves 595 original project files plus the
shared 1200 source files. Independent validators pass. The 5179-file archive
was rehashed against originals. All recorded tool inputs were inspected; no RTK
violation was observed in this scenario. Claude writes two fixed /tmp scratch
outputs, retained separately, and its remaining-work advice incorrectly groups
all 26 rules as semantic; the actual split is 24 semantic and two deterministic.
No skill/runtime change or independent acceptance is claimed. This supplies the
current-version native resume evidence; all-fixture and semantic/report gates
remain open. It is committed-checkpoint recovery, not arbitrary mid-write safety.
