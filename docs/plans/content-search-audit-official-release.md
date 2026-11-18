# Content Search Audit official release execution

Objective: complete the existing official-release gates, not merely deploy another
candidate. Baseline published 0.1.32 at c3f20cc. Work branch:
`codex/content-search-audit-official-release`. Development version 0.1.33 is not
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
