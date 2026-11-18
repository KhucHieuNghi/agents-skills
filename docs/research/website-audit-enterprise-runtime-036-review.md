# Runtime evaluation candidate 0.3.6

Status: unpublished evaluation candidate. This packages the reviewed tracking/consent supplied-evidence workflow and immutable CLI/report integration. It is not full P4 or enterprise production acceptance.

Compared with [0.3.5](website-audit-enterprise-runtime-035-review.md), only original SKILL.md wording and provenance JSON formatting changed inside the skill. Runtime code, source pins, licenses and examples are unchanged. The entrypoint now explicitly describes scoped supplied-evidence comparisons without implying complete module acceptance. All earlier archives are preserved.

## Integrity

- Component: `3bb8badbaf609cfd8b74f867b967cd985581eed3829e98d95aa1f59d62711f73`.
- Release: `ff0c76fb1b467979a42371b842a6886e6e0dc1e26b34c1e470df9eee681804e0`.
- Archive SHA-256: `7ff480454000c36bfb54e5916806d405a9da5131e7a04c75de5e701f58ae0711`.
- Archive: `build/enterprise-runtime-036/agent-skills-solution-content-search-audit-0.3.6.tgz`.

## Installed workflow

[Receipts](website-audit-enterprise-runtime-036-installations.json) record new installs from the extracted 0.3.6 archive for Codex and Claude Code. Each installed CLI executed its packaged synthetic example through intake → runtime evaluate → JSON/Markdown/HTML report → validation. Each produced one scoped pass, one candidate fail and 22 unknown checks, with semanticAcceptance=false. These are installed-script trials, not native host behavioral evaluations or real-site outcome tests.

The [foundation review](website-audit-enterprise-runtime-foundation-review.md) records independent code review and red/green fixes. Remaining work includes payload/order/dedup semantics, browser capture/authorization scenarios, remaining provider/module adapters, optimization execution/retest and commercial P7 evaluation. No production deployment or whole-goal completion is implied.

Final package review and repository verification are recorded below after completion.

Final verification: **84 files / 667 tests passed** (`build/enterprise-runtime-036/tests-final.log`). Format, lint, typecheck, build, skill validation, composition and diff checks passed. After staging new files, the tracked documentation boundary suite also passed 14/14 tests.

Independent package reviewer verified all 135 archive files against extraction, both installed component digests and installation locks, both report validators with semanticAcceptance=false, receipt/report/manifest hashes and unchanged original intake checks. Package delta from 0.3.5 is exactly SKILL.md plus provenance formatting and the required updated SKILL digest. Runtime logic, examples, source pins/licenses and older 0.3.4/0.3.5 archives remain unchanged. No blocking finding in this bounded package review; no broader acceptance is claimed.
