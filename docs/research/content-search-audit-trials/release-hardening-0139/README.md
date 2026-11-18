# 0.1.39 — refresh semantic evidence availability

This candidate fixes a runtime defect found by independent Codex-output review:
`review` retained automatic missing-evidence reasons for semantic unknowns even
after required evidence was attached. The generated record could incorrectly
claim missing audience context or claim sources already present in the run.

The fix refreshes unattributed unknown checks and their evidence links, keeping
semantic status unknown. Explicit reviewer judgments remain unchanged unless
explicitly resubmitted. Existing sufficient-evidence legacy unknowns reconcile
without requiring duplicate evidence. This is not an automatic semantic pass.

## Frozen artifacts

- Version: `0.1.39`.
- Component digest: `00b73ccc7d98f6afb6e3d64466b83dcc036165d1548890e065870d7053f0cf03`.
- Release digest: `bcc6cde97d5047f050dbf899884d6c30cee9e5347a45d042a3260e354cdfb3b2`.
- Archive SHA-256: `94307d2a9ac60ab7c367cddf3f1bcfd5322b09d7365a79da359b687b874a06b8`.
- Build directory: `build/content-search-audit-0.1.39-evidence-refresh`.
- Archive: `build/agent-skills-solution-content-search-audit-0.1.39.tgz`.

Only `scripts/lib/review.mjs` and its local provenance digest changed inside the
package. Five upstream pins, license bytes, methods and entrypoint are unchanged.
Old archives and reports are retained. This candidate is not a commercial release.

## Verification

The regression failed against 0.1.38's behavior, then passed after the fix. It
checks evidence-only updates, unchanged source revision, unknown status and
preservation of attributed unknown judgments. All nine review tests passed.
An independent AI inspected the implementation and found no correctness issue.

The [reconciliation receipt](reconciliation.json) applies an empty review bundle
to a copy of the frozen Codex 0.1.38 final run using 0.1.39: ten check records
refresh their evidence availability, all remain unknown, findings remain identical
and validation remains valid/partial (12 items, zero audited, ten pending, two
blocked). No historical native result is rewritten or relabeled.

[Fresh archive installation receipts](installations.json) verify separate Codex
and Claude Code projects, their installation locks and helper method loading.
Skill frontmatter validation passed. These checks do not replace native behavioral
trials or final owner residual-risk acceptance. The separate guarded 0.1.38
execution-profile experiment is not evidence for this changed package.
