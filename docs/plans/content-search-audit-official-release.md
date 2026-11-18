# Content Search Audit official release execution

Objective: complete the existing official-release gates, not merely deploy another
candidate. Baseline published 0.1.32 at c3f20cc. Work branch:
`codex/content-search-audit-official-release`. Development version 0.1.35 is not
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
