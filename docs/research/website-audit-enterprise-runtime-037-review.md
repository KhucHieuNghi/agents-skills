# Payload/order evaluation candidate 0.3.7

Status: unpublished evaluation candidate, not full P4 or enterprise acceptance.

Adds exact typed supplied-payload checks and same-source ordering to the reviewed runtime workflow. Stage, payload and ordering checks remain distinct in the canonical report; values are not copied into finding text. Missing/partial input, ambiguous event pairs and cross-source clock comparisons remain unknown. The [code review dossier](website-audit-enterprise-payload-order-review.md) records independent review and regression evidence.

## Integrity

- Component: `3bf7f7e541676ec1d12c43b987e3be02391be70e8a52eb9a3156270137736666`.
- Release: `9105b3f735c39e5a4f5e4273c282b9808db260a037783266ab379dbc5c752d50`.
- Archive SHA-256: `5815e237301bad5504050914b59fabd1b8055541bf01ff3a43de5ba617bf4f98`.
- Archive: `build/enterprise-runtime-037/agent-skills-solution-content-search-audit-0.3.7.tgz`.

Only original package files changed. Upstream pins/licenses and prior archives are unchanged. The packaged example now exercises action/data-layer occurrence, typed currency/decimal payload and same-source ordering alongside the known synthetic consent defect.

## Installed workflows

[Receipts](website-audit-enterprise-runtime-037-installations.json) record fresh Codex and Claude Code installs from the extracted archive. Both installed CLIs execute intake → runtime evaluation → report JSON/Markdown/HTML → integrity validation. A second synthetic run changes the typed currency to an unsupported enum and recomputes its source hash, proving the installed evaluator detects semantic mismatch rather than only broken hashes. These are installed-script trials; no native host behavioral or live-provider acceptance is inferred.

Full P4 dedup implementation, browser execution, cross-system synchronization, raw provider payload authentication, other unfinished providers/modules and P7 commercial evaluation remain open. Typed comparison reports the first confirmed field violation, not every defect in one payload.

Final repository and independent package checks are appended after completion.

Initial full suite encountered 11 timeouts (669 passes), including an unchanged documentation scan; there were no assertion failures in that log. Re-running the complete suite with `npm test -- --maxWorkers=2`, without increasing test timeouts, passed **85 files / 680 tests** (`build/enterprise-runtime-037/tests-bounded-workers.log`). Independent package review verified all 136 archive files, installed locks/digests, report validators, retained intake checks and both actual negative controls. It found one stale closing sentence in the runtime guide. [0.3.8](website-audit-enterprise-runtime-038-review.md) clarifies that sentence; 0.3.7 stays immutable.
