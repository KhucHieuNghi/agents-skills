# Content Search Audit official release execution

Objective: complete the existing official-release gates, not merely deploy another
candidate. Baseline published 0.1.32 at c3f20cc. Work branch:
`codex/content-search-audit-official-release`. Development version 0.1.37 is not
published or semantically accepted. Existing immutable evidence stays unchanged.

## Root-cause evidence

The 0.1.32 expanded Claude narrative contradicts its own historical measurement
section and loses the action prerequisite in verification. Artifact replay still
passes. A quote ledger proves quoted spans, not whole-report meaning. The helper
currently has two independent free-text action/verification strings and no shared
prerequisite. Supplemental narratives are not bound to structured measurement
availability. Method-output hashes and command wrappers cannot prove reading or
instruction compliance. These are separate boundaries, not one validator bug.

## Execution sequence

1. Persist a single optional action prerequisite; preserve it on both action and
   verification in standalone/campaign HTML, Markdown and CSV. Keep legacy inputs
   compatible and avoid pretending to infer conditions from arbitrary prose.
2. Trace and fix measurement-availability delivery so supplied historical evidence
   is distinguishable from missing current observations and absent provider exports.
3. Improve actual method-loading and host command workflow, retaining observable
   limits. Do not introduce a self-attested read receipt as semantic proof.
4. Freeze new bytes only after package changes stabilize; rebuild and install the
   archive on both hosts. Run the same native scenarios without gold leakage.
   Preserve failures and separately inspect final narratives, tool traces and
   artifacts. Investigate Codex public DNS in its actual supported environment.
5. Complete primary adjudication and hand the fixed immutable cohort to the chosen
   human reviewer. User selected Claude Expanded first, but no verdict exists.
   Precision/recall/critical gates and zero fabricated metrics remain unchanged.
6. Promote, publish and deploy only after all gates are evidenced. Do not count
   technical success or generic publication authorization as human acceptance.

## Progress

2026-11-18: conditional-action regression first failed in both standalone and
campaign output; shared actionCondition implementation then passed both tests.
This removes deterministic condition loss when a prerequisite is declared; it
is not yet evidence that native hosts declare or preserve it in free prose.
The other steps remain active work. Production remains 0.1.32.

2026-11-18: historical measurement delivery now has a separate `studySources`
input, binding supplied source bytes and exact line ranges. Standalone/campaign
and redacted-report checks preserve aggregates without fabricating AI observations.
Three initial regressions failed before implementation and then passed. Current
native behavior remains unverified: this data path does not prove that hosts
populate it or keep supplemental prose consistent. The 0.1.33 archive was already
built for action-condition verification and remains immutable; subsequent package
work uses 0.1.34. New production deployment remains gated on native and human review.

2026-11-18: 0.1.34 Expanded trials launched for both hosts against unchanged
prompts/targets; execution pending. Public-network preflight reproduces ENOTFOUND
with Codex workspace-write networking off and HTTP 200 with it enabled. See
[preflight evidence](../research/content-search-audit-trials/release-hardening-0134/NETWORK-PREFLIGHT.md).
The next public runner explicitly enables network for this authorized scenario,
retains filesystem sandboxing and collector scope restrictions, and leaves offline
trials unchanged. Old failed public results are preserved. A capability preflight
is not a completed public audit or semantic acceptance.

2026-11-18: both 0.1.34 Expanded runs finished (exit 0, unchanged inputs).
All six run revisions replay valid; 18 Codex and 35 Claude quotations verify.
Both use historical study attachments and preserve conditional integrity advice.
Claude still contradicts that aggregate in its free narrative summary. RTK nested
command violations remain. These are retained negative outcomes, not accepted
native gates. Next change should bind executive delivery summaries to validated
coverage/measurement inputs, retaining the required narrative and human review.
Public trial continues with explicit authorized network configuration.

2026-11-18: 0.1.35 adds a generated `delivery-summary.md` shared with the opening
paragraph of standalone and campaign reports. Coverage comes from validated
standalone/campaign assessment; attachment status comes from validated bundles.
Historical sources remain distinct from response-level AI observations and current
brand performance. This prevents the helper from emitting the observed blanket
absence claim; surrounding host narrative still needs native and human evaluation.
Two regression checks failed before implementation, then all 473 tests in 64 files
passed. Format, lint, typecheck, build and diff checks passed. Fresh extracted-archive
installs succeeded on both hosts; installation receipt is retained in
`build/delivery-summary-0135-installations.json`.

Frozen 0.1.35 artifacts:

- Component: `f710c8f103058224004c39116dfcadd444e789b808aa41ecd57f580da0414b7e`.
- Release: `af589d68760f74f31e0c3fe0575bd4a128bc0efa36c181eb83c33fbd6ab00d09`.
- Archive: `f948615e1c48e1cfb9235b8cd7acbe2397148bc973916300ddf4f84997359a2c`.

0.1.34 public Codex completed with unchanged initial inputs: 12 declared and
collected URLs, zero fully audited, 12 pending, 209 unknown item checks. Trusted
artifact replay passed; the candidate documentation reproducibility finding is
not a human-accepted defect. Claude public remains running as of this entry.
Do not overwrite either version or equate attachment presence with measured
performance. Next: finish preserving public evidence, run native 0.1.35 behavior,
and resolve instruction compliance before independent semantic acceptance.

2026-11-18: complete recorded-trace inspection of 0.1.35 found a further delivery
mismatch: Codex describes five material findings but persists four. Source tracing
shows this is not a validator restriction: a supported finding may reference an
unknown check. A new integration characterization confirms that it persists into
HTML/Markdown/CSV while coverage remains partial and prior revisions stay intact.
The first fixture attempted output inside a content root and was corrected; no
validator gate was relaxed. See the immutable 0.1.35 trace addendum for the failure.

0.1.36 clarifies that distinction and requires narrative/backlog reconciliation,
separates AEO question requirements from answer-evidence in the actual method
procedure, and moves the existing project-wrapper convention before execution
with a direct-redirection example. Runtime code and rule requirements are unchanged.
All five upstream pins and license records are unchanged. This is a behavioral
hypothesis pending native validation, not a claim that reminder text guarantees
compliance. Historical 0.1.35 human-review material remains fixed and pending.

Final stable verification: 474 tests in 64 files, format/lint/typecheck/build and
diff checks passed. An earlier full-suite attempt overlapped a final documentation
edit and rejected a changed digest; it was rerun after package bytes stabilized.
Fresh extracted-archive installs, installation locks and helper help execution
passed on both hosts (`build/review-scope-0136-installations.json`).

Frozen 0.1.36 artifacts:

- Component: `ee982166367e3186dfa95a1501ccbb3d3561b5ee6b10b7daf3a983baa1881b63`.
- Release: `4664f56b564b98c2b850cc282a66bf61009d2b5450ace6f92389790302216a5c`.
- Archive: `3bdea8d65b4a1e73d80fe23124c215ec996a22a5a1abc295eeb56485f28df401`.

The separate 0.1.35 public trial uses a documented 1800-second budget for both
hosts, preserving the failed 900-second 0.1.34 attempt. Codex finished with valid
partial campaign replay and unchanged inputs; Claude is running. Those outcomes
cannot be transferred to changed 0.1.36 bytes. Production remains 0.1.32.

2026-11-18: both 0.1.36 Expanded runs completed with unchanged inputs. Trusted
replay validates three partial revisions per host, with 17 Codex and 33 Claude
source quotations. Six findings are persisted and described by each host, but
classification of the injection control, Claude's answer-evidence explanation
and command-wrapper violations remain open. The raw archive and member hashes
are retained in `../research/content-search-audit-trials/release-hardening-0136/`.
This does not pass native semantic or human gates.

The public site count mismatch is fixed on the work branch: home and catalog
derive totals from catalog membership, with explicit reviewed status mapping.
Site verification passed 19 tests and Astro checks. Root checks passed; the first
concurrent full-suite run hit a 5-second documentation-test timeout, then the
standalone full rerun passed all 474 tests. Commit 475007b was pushed to draft PR 3.
No production deployment was performed.

2026-11-18: the 0.1.35 public trial finished on both hosts (Codex 342.064s,
Claude 898.991s, exit 0, unchanged original inputs). Trusted matching-version
replay validates both campaigns and their local/global review artifacts; each
remains partial with 12 declared/collected and zero audited items. The original
0.1.34 timeout is retained. The 832-file public archive was rehashed member by
member; see release-hardening-0135/PUBLIC-REVIEW.md. Native 0.1.36 support and
technical-control trials are now running from unchanged baseline inputs/prompts
against fresh installs, with no gold copied. No acceptance or deployment follows
from successful execution alone.

2026-11-18: real 0.1.36 interruption/recovery finished on both native hosts.
Independent verification confirms all 1,200 original item IDs, 1,200 collected
items, 31,200 checks, zero missing checks, unchanged sources/stopped artifacts,
and partial coverage with zero audited items. Claude's checkpoint planned-count
wording and deterministic/semantic distinction remain reporting issues. See
`../research/content-search-audit-trials/resume-0136/README.md` and immutable raw
evidence. User acknowledged the human-review instructions with "ok"; no per-case
verdict was supplied and none has been recorded as accepted.

2026-11-18: 0.1.36 support-method runs completed for both hosts with unchanged
inputs. Trusted replay validates three partial revisions each (4 declared, zero
audited, 4 pending); 12 Codex and 20 Claude quote spans verify. Full narratives
were read; detailed trace and semantic adjudication remain outstanding. The
370-member archive is retained with hashes in release-hardening-0136. Technical
controls continue in the same matrix runner. Separate 0.1.36 public and extraction
runners now exercise the original scenarios against fresh exact-version installs;
only extraction config root paths relocate. CI at f3c5714 passed.

2026-11-18: 0.1.36 technical controls and extraction now completed on both hosts.
Trusted replays validate two technical revisions and three extraction revisions
per host. All original fixture/config/package files rehash unchanged. Technical
reports retain three findings and 2 pending items; extraction reports retain one
finding, 2 pending and 1 unsupported item. New archives preserve 287 and 366 files
respectively, excluding only recorded Swift compiler caches for extraction. Full
trace and semantic adjudication remain open; see TECHNICAL-REVIEW.md and
EXTRACTION-REVIEW.md. Public Codex completed (313.04s) with valid partial campaign
replay; public Claude is still live. The separate 37-file Expanded human-review
manifest remains unchanged; user acknowledgments have not supplied verdicts.

2026-11-18: public 0.1.36 completed on both hosts, with valid matching-version
replay and unchanged inputs; the archive retains 875 files. Its success does not
resolve the Expanded primary precision result of 6/7 (85.7%) for each host.
Independent verdicts and reporting/instruction gates remain open.

0.1.37 narrowly separates untrusted-input handling observations from evidenced
content defects and changes the conditional-action example to an established
obsolete-link defect. No gold labels, thresholds, runtime helpers or upstream pins
changed. Root checks passed all 474 tests; fresh archive installation passed for
both hosts. See release-hardening-0137 for exact digests and the historical packet
binding. Codex's new Expanded run finished with five consolidated findings,
separate boundary commentary and valid replay; Claude is still running. Primary
material-unit scoring for Codex is 6/6 supported and 6/6 gold recalled; this is not
human acceptance and does not close the reporting or instruction review gates.

2026-11-18: both 0.1.37 Expanded runs completed. Primary material-unit precision
and recall are 6/6 for each host; both separate the embedded instruction from
editorial defects. Three revisions and all source quotations per host replay
valid. Raw archives retain 235 Codex and 221 Claude files. Claude still violates
the command-wrapper convention and its final reply overstates compliance.
Reporting, instruction and independent human gates remain open; broader trials
are not yet launched for this revision. See release-hardening-0137/README.md.
