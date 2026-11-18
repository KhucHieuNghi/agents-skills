# Performance package candidate 0.3.12

Status: unpublished enterprise evaluation candidate. No deployment or commercial acceptance. This packages the [reviewed performance workflow](website-audit-enterprise-performance-workflow-review.md), adds an offline CLI, synthetic example and customer reference, and preserves earlier archives.

## Scope and independent review

The original CrUX/Lighthouse/workflow implementations now reside inside skills/content-search-audit/scripts/lib. Development paths re-export those modules. Evaluator fingerprints reference only packaged files. No upstream source pins or licenses changed. The CLI accepts supplied artifacts and cannot receive trusted host execution state.

Independent reviewer `/root/performance_contract_review` inspected the move, imports, fingerprints, CLI, guide and example, ran **84 tests across three focused suites**, and executed an isolated copied package. No actionable finding remained. The isolated example produced three observations, one draft field finding and fail/pass/pass/fail scoped checks; canonical JSON/Markdown/HTML round-tripped. A bundle containing host authority was rejected before output creation. This is independent technical review, not customer semantic acceptance.

## Frozen package and fresh installations

- Component: `bdb6764755d52a8aea51d1d93b5ab50b5d21c597c8d19175e7b6b0766f8ba926`.
- Release: `b1f32d018a254ea5ed33138bbcb1ecaa658bb0127641f86444950f2792cedc46`.
- Archive: `0dcd760f4e3c24a32365b9dcddddfde0be2ad65f2b808aa95f8111e02260dcda`.

Build artifacts are under build/enterprise-performance-0312. Both fresh projects were installed from the extracted versioned archive: Codex .agents/skills and Claude Code .claude/skills. The [installation receipt](website-audit-enterprise-performance-0312-installations.json) records component/report hashes and results. The local reproducer is build/enterprise-performance-0312/check-installed.mjs.

Each installed CLI executed the packaged synthetic field example, built and validated canonical JSON/Markdown/HTML, and rejected imported host authority, wrong raw hash and wrong customer without creating rejected runs. A separate import reused the three real native Lighthouse artifacts from the earlier local synthetic fixture, explicitly relabeled to this synthetic installation scope. Both retained individual lab observations and lab completeness unknown: stored receipts were not restored as authority. These are installed API/CLI checks, not native Codex/Claude behavioral trials or public-site performance measurements.

## Remaining enterprise gates

The four public website pilot reports remain separate: their accessibility/UX findings and browser observations do not become performance assessments merely because this candidate packages an evaluator. Real public performance acquisition, provider authentication, PSI/RUM/transport receipt profiles, broader accessibility/UX/technical SEO evaluation, authorized optimization/retest, multi-industry holdouts and native host behavior remain open. Missing evidence must produce actionable requests, not passes or invented findings.

## Final verification

Independent package reviewer `/root/enterprise_builder_check` verified all **148 archive files** against extracted bytes and source, both installation locks, component/release/archive hashes, provenance, reference closure and unchanged upstream licenses/notices. The reviewer independently repeated all three negative controls on both installed workflows and confirmed rejection before output, checked report hashes/validation and lab unknown status, and verified the previous 0.3.11 archive remains unchanged. No actionable finding remained in this scope.

Root verification: **91 test files / 795 tests passed**, one worker with unchanged timeouts (48.13 seconds). Format, lint, typecheck, build, skill quick validation and staged diff checks passed. The archive reviewer did not independently run the complete repository suite; the focused 84-test performance result was independently reproduced by the performance reviewer. No quality percentage or production acceptance is inferred from test counts.
