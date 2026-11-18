# Performance contract independent review

Date: 2026-11-19. Scope: [P5 performance implementation contract](../plans/website-audit-enterprise-performance.md), existing enterprise check identity and report review timestamp behavior. This is a design review, not implementation or commercial acceptance.

Reviewer: independent AI agent `/root/performance_contract_review`; read-only, separate from the author. The reviewer inspected the current contract and P2 implementation, returned four findings, then inspected the revised file and confirmed closure. Attribution alone does not prove behavioral quality.

| Finding                                                                                | Severity | Resolution and required regression                                                                                                                |
| -------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL/device/namespace dimensions lacked a mapping into P2 check identity                | P1       | Versioned deterministic scenario/window mapping; distinct stable IDs across URLs/devices/namespaces under one entity                              |
| New verdict required only when target changes, overlooking newer assessment time       | P1       | Old verdict stays in parent; unchanged target at newer assessment still requires fresh verdict                                                    |
| Conflicting metric and independently failing metric had ambiguous aggregate precedence | P2       | Resolve conflict per metric first; valid failing metric still fails aggregate; conflict-only potential failure stays unknown                      |
| Byte dedup could count reformatted JSON as repeated lab measurements                   | P2       | Semantic measurement identity plus distinct execution receipts/timestamps; aliases retained; uncertain uniqueness cannot support repetition claim |

Closure verdict: all four contract findings addressed with explicit regression cases; no further actionable contract-level issue identified in this pass. Executable acceptance cases, provider compatibility, packaged workflow, real performance pilots and independent implementation review remain outstanding.

The prior four public pilot reports remain unchanged. This document makes no claim that their performance checks have been assessed or that candidate 0.3.11 has gained a new capability.

## Repository verification

This documentation-only change passed format, lint, typecheck, build and diff checks. Full tests passed **88 files / 711 tests** with `--maxWorkers=1` and unchanged test timeouts. Two preceding two-worker runs each timed out at 5 seconds in different existing campaign-review tests (710/711 passed in each); both failures are retained here rather than reported as green. The single-worker pass is consistent with resource contention but does not prove a root cause. No skill bytes, locks, archives or installation outputs changed, so this is not a new candidate release.
