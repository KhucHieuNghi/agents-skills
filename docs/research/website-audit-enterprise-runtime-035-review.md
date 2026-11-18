# Runtime evaluation candidate 0.3.5

Status: unpublished evaluation package; not P4 completion or enterprise production acceptance.

## Scope

Adds supplied tracking observations, declared stage cardinality/status evaluation, owner-policy consent comparison and `enterprise-runtime-evaluate` CLI revisions. Customer report JSON/Markdown/HTML consumes evaluated checks, missing-data requests and candidate findings. Existing intake checks retain unknown status. Full payload validation, cross-clock ordering, real dedup implementation, browser scenario execution, remaining providers/P5/P6/P7 remain unfinished.

Independent comparator review closed source-envelope binding, duplicate identity across correlations/event names, provider capture latency, basic pre-choice traffic, blocked-tag ordering and per-category policy issues. Workflow review closed unrelated stale-source suppression of fresh findings and duplicate same-time evidence. Reviewer independently checked refusal retention/retirement through immutable lineage. See [foundation review](website-audit-enterprise-runtime-foundation-review.md) for red/green evidence and boundaries.

## Immutable packaging

- Component: `5100182554e2624d387f6099e388121aad17c4cb460ef6eb2ec2007c62479e77`.
- Release: `6af4251e4acebabcb7d2d15fc62d1b5f8b91abf3b66e1f2d0c64109b83968871`.
- Archive SHA-256: `0e28f2b6cde5f80895e0ba0c0d09e0debfe4a5ebfbf0a5f086aec4af0641569e`.
- Archive: `build/enterprise-runtime-035/agent-skills-solution-content-search-audit-0.3.5.tgz`.

Composition changed only original files; upstream pins and licenses are unchanged. Prior archives including 0.3.4 are preserved. Fresh package validation and composition/reference checks pass. Skill Creator validator passed via isolated uv PyYAML environment; system Python lacked PyYAML, with no global installation made.

## Extracted archive installations

[Receipts](website-audit-enterprise-runtime-035-installations.json) record fresh Codex and Claude Code project installations from the extracted archive. Each installed skill ran its packaged synthetic example through intake → runtime evaluation → report generation → report validation. Both produced one declared-rule pass, one candidate failure, 22 unknown checks and one candidate finding, with semanticAcceptance=false. Report projection digests are recorded.

These are installed-script trials, not native host behavioral evaluations or production website tests. No network/provider writes or customer website changes occurred. The example deliberately contains a denied basic-mode request; it is not production configuration guidance.

## Verification

The first candidate suite had 665 passes and two stale expected-version assertions (0.3.4); those assertions now expect 0.3.5. The earlier eight composition failures were development-tree blockers, not retained exceptions. Final checks are recorded below after completion.

0.3.5 full suite passed 84 files / 667 tests. Independent packaging review verified archive/extracted bytes, both installed component digests/locks, report validators and unchanged 0.3.4 archive. Final format check then found provenance.lock.json formatting noncompliant. Formatting changes component bytes, so 0.3.5 is preserved as an intermediate candidate; [0.3.6](website-audit-enterprise-runtime-036-review.md) follows with formatted provenance and clearer entrypoint wording. No runtime logic changed between these candidates.
