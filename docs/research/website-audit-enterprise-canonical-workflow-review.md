# Canonical enterprise workflow review

Status: development integration; not packaged or commercially accepted. Scope: immutable supplied canonical evidence through existing enterprise JSON/Markdown/HTML reporting. No new external data collection or website mutation.

## Implemented and verified

- Bound customer/run digest, exact scope, exclusive capture window and freshness; separate provider-state unknown.
- Raw evidence replay, derived row/index/request ownership checks, immutable revisions and retained reassessment.
- Policy revisions preserve page scope. Each revision occurrence has its own evidence identity.
- Source bytes remain internal; report projections exclude raw canonical targets and browser payloads.
- Thirteen focused tests cover report roundtrip, leakage, expiry/history, index deletion/foreign/duplicate/forgery, scope and authority rejection, declined requests, owner-policy changes/reverts, foreign captures/windows, duplicate populations and cumulative limits.

## Independent review and fixes

A separate AI reviewer found a P2 lifecycle error: same-time owner intent A → B → A reused older evidence provenance and made subsequent reassessment fail. A regression reproduced the failure, then passed after adding revisionRunId to immutable base identity and validating its provenance. A second regression reproduced the retained-population limit bypass (50 initial plus one later); merged populations are now bounded. Both fixes have red-to-green evidence. No findings were deferred. This is incremental review, not full enterprise acceptance.

## Real-data report replay

Private output: build/enterprise-canonical-report-002. Four site reports use two retained homepage captures each: Cake and Infinity from public-002, QuokkaGuide and VBA from public-001. Assessment times are historical capture times; this is a replay, not a fresh website check. The scope identifiers from captured evidence are retained rather than rewritten to fit the older pilot run. No business profile is assumed for this canonical appendix; generic intake checks remain unknown.

Each site has six canonical check instances and two provider-state unknown instances; all eight remain unknown, with zero new findings. This denominator differs from the earlier 12-capture appendix: these reports select eight captures and add provider-state checks. Report JSON/Markdown/HTML load and integrity checks pass. Eight offline Chromium viewport checks (390/1280 px across four reports) pass with no horizontal overflow, scripts or external requests. Internal source runs are retained for reproducibility; customer reports contain no artifactText. Reports remain review-pending; old nine findings are neither replaced nor recounted.

## Remaining scope

Full technical rules (robots/noindex, hreflang, structured data, crawl graph and native provider contrast), integration into the released skill/CLI, extracted installation on both hosts, cross-module commercial evaluation and customer residual-risk acceptance remain open. No production release claim follows from these tests.
