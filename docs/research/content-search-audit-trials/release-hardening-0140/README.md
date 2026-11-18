# 0.1.40 — complete immutable report revisions

The guarded 0.1.38 trial produced a supplemental study report in another folder
without copying referenced evidence: 26 local evidence links failed. The core
validated run remained valid. This is a delivery-path defect, not a guard failure.

`render-revision SOURCE_RUN OPTIONS.json NEW_RUN` now makes a complete new
revision from validated retained snapshots. It preserves source/config/evidence,
creates a new run identity and generates reports alongside their evidence.
Attachments validate before any destination is created. Existing attachment kinds
require explicitly resupplied options so a new edition cannot silently omit them.
Options replace supplied presentation inputs rather than merge individual sources.
The CLI and programmatic entry reject registry overrides. There is no fetching.

This candidate includes 0.1.39's evidence-availability fix. Original versions,
failed native reports and trial archives remain immutable. No commercial release
or native behavioral acceptance is claimed here.

## Frozen package

- Component: `de029b4f618d1cd441d9f722e0dd60e6233f6d5fbc1dc258b6389d48341c2335`.
- Release: `4410487c622352ebed49961331dd58341ba31960ed6e3836d652983f7e226b1e`.
- Archive SHA-256: `574df835c14b81a0e6fde330582d102e6f60c3ea95024316fcbf484b2f8fe011`.
- Directory: `build/content-search-audit-0.1.40-report-revision`.
- Archive: `build/agent-skills-solution-content-search-audit-0.1.40.tgz`.

## Verification

Six targeted regressions reproduced failures before implementation and passed
afterward. They cover local evidence links, source immutability, invalid options
before output, output boundaries, existing-output protection and explicit
attachment resupply. The affected four-suite check passed 38 tests.

[Fresh archive installation receipts](installations.json) cover separate Codex
and Claude Code projects: start, render-revision with historical study data,
artifact validation, every local HTML evidence link and unchanged original run.
These are deterministic installation checks, not native model trials.

Full verification passed: format, lint, typecheck, build and 523 tests in
66 files. Skill frontmatter validation and diff checks passed. Independent code
review found no actionable boundary regression; see [review](independent-code-review.md).

Filesystem interruption can leave a partial new directory. Preserve it as evidence
and use a new output path after validation; no transaction or crash rollback is
claimed. The owner-selected independent AI review and final residual-risk decision
remain separate from successful package checks.
