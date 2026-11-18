# Provider foundation candidate 0.3.3

Status: unpublished evaluation package, not full P3 or enterprise release acceptance. The previous goal turn closed the scoped impossible-plan finding. This candidate packages the implemented provider libraries, immutable plan/import workflow, business dictionary validation, access/export guides and their tests.

## Package evidence

- Component digest: `ee1c2ac4099b05e3a8ed567c5fe32a02b7f6be67c83c6059ed7493e0ad85ee2e`.
- Release digest: `4c1d38b0c8e01fdd757f41c119fc4e1153511720a11d6eae6df32e2df99fb53a`.
- Archive SHA-256: `960aa27e4f947025a55ee3bd6465a28bad763f7f34edfe13cd898d7910d39861`.
- Archive: `build/enterprise-provider-033/agent-skills-solution-content-search-audit-0.3.3.tgz`.
- Built archive was extracted before installing into fresh Codex and Claude Code projects. Each installed CLI performed intake → provider-plan → provider-import → report → report-validate. Successful import retained unknown assessments.
- [Installed workflow receipts](website-audit-enterprise-provider-033-installations.json). These use explicitly synthetic GA4 observations, not authenticated accounts or native host behavioral evaluation.
- Upstream source pins and licenses are unchanged. New original files and changed files have refreshed composition hashes. Release 0.2.0 and prior archives are unchanged.

## Boundaries still open

The capability library inspects trusted host inventory and authorization; it does not execute a live provider call. URL Inspection appears in capability discovery but its ingestion adapter is absent and planning it is rejected. Configuration imports do not independently establish tracking/runtime correctness. Business normalization preserves supplied outcomes but performs no cross-source event matching, final-state deduplication or causal attribution.

P3/P4 integration, actual module assessments, consent transitions, performance/accessibility/journey adapters, authorized execution/retest and P7 real-account/adversarial commercial evaluation remain open. Four [public pilots](enterprise-public-pilot-20261118/README.md) demonstrate real sampled observations/report delivery only. Nine reviewed findings do not establish precision/recall.

## Review trail

The [foundation dossier](website-audit-enterprise-provider-foundation-review.md) preserves earlier failed tests and the independent closure of the planner finding. This document does not reinterpret those earlier snapshots as green. Final package checks and independent packaging review are recorded below when complete.

## Final 0.3.3 verification

Full clean rerun: 80 files / 616 tests passed; format, lint, typecheck, build and diff checks passed. An earlier run timed out in one release integration test at the unchanged 5-second default while checks ran concurrently; isolated verifier (7 tests) and the clean full rerun passed without increasing timeout. Independent packaging review verified archive/component hashes, extracted composition/release, both installed digests and report validators. It found a customer-documentation defect: config envelopes referenced tests not shipped in the archive. This is corrected in a subsequent candidate, preserving 0.3.3 archive unchanged.
