# Browser-to-report evaluation candidate 0.3.10

Status: unpublished evaluation candidate. This packages the reviewed read-only browser collector and adds strict offline capture attachment to canonical enterprise evidence/report revisions. Full enterprise acceptance remains open.

## Changes and review

The collector/proxy moved into the self-contained skill package; repository paths are compatibility re-exports. The [prior transport review](website-audit-enterprise-browser-collector-review.md) records proxy/timeout/isolation fixes. The package now includes a trusted-host invocation guide, strict capture normalizer, `enterprise-browser-import` CLI, synthetic example and append-only report integration.

Import validates exact source bytes/hash, expected plan digest, customer/asset/environment, time/freshness, sequence, coverage claims and typed observations. It never grants browser authority or creates passed/failed assessments. Five scoped unknown-check/input-request types cover tracking, consent, performance, accessibility and UX/CRO. Requests specify owner, formats, evidence and fallback. Report observations are recomputed from raw evidence; stale captures become historical. Raw payloads and plan fields are omitted from customer projections.

Independent code review found and verified fixes for a non-read response contradiction, missing implied denial/failure gaps, and an overly broad blocked-request metric label. Browser-gate denial records and retained transport denial records are now separate measurements. **15 focused tests passed**; no remaining material finding within that integration review.

## Package and installed trials

- Component: `4e27865deb96a5c8ed249b00a8ec1891427e624065cff447c2b91ea178107806`.
- Release: `a2de6b173e12334129a5d238d8d5813512f23a6d8a0c8d6d11870d1639bee38b`.
- Archive SHA-256: `c58f08a4640a872dfb3c90778b8ddb46fd060e68756eeefd9d98f18a1d617d89`.
- Archive: `build/enterprise-browser-0310/agent-skills-solution-content-search-audit-0.3.10.tgz`.

[Installation receipts](website-audit-enterprise-browser-0310-installations.json) bind fresh Codex and Claude Code installs from the extracted archive. Each installed CLI completes intake → import → canonical JSON/Markdown/HTML validation with five observations, all checks unknown and no invented findings. A rehashed POST-response negative control is rejected without creating output. Both installed collector APIs also run the actual Chromium integration harness, including HTTP/HTTPS loopback TCP counters and an infinite-loop renderer. These are installed-script/API trials, not native-host behavioral acceptance.

## Four report revisions

[Receipts](website-audit-enterprise-browser-0310-pilots.json) bind fresh real read-only captures and new immutable revisions under `build/enterprise-browser-0310/pilots-report`:

| Site            | Prior findings retained | New observations | New unknown checks |
| --------------- | ----------------------: | ---------------: | -----------------: |
| Cake            |                       2 |                5 |                  5 |
| Infinity Racing |                       2 |                5 |                  5 |
| QuokkaGuide     |                       2 |                5 |                  5 |
| VBA             |                       3 |                5 |                  5 |

Fresh capture scope matches each original customer/entity; raw captures were not relabeled to bypass scope validation. Earlier [pilot reports/evidence](enterprise-public-pilot-20261118/README.md) remain unchanged. New counts/dimensions describe the restricted capture only and are not quality scores or conversion metrics.

The first revision attempt correctly rejected copying old review timestamps into a newer assessment. Its failed attempt remains in `build/enterprise-browser-0310/pilots`. Revised drafts preserve findings and parent lineage with decisions pending; prior verdicts remain in immutable parent reports. Fresh independent per-target review is recorded separately rather than changing historical verdict dates.

## Verification and remaining work

Full repository suite: **88 files / 711 tests passed** (`build/enterprise-browser-0310/tests-final.log`), with unchanged per-test timeouts. Lint, typecheck, build and skill quick validation passed. Final package/HTML/independent report verification is recorded below after completion.

The packaged entrypoint remains an evaluation capability: robots/rate-policy orchestration, account/host authenticity, resource-origin intake, broader consent/test-action collection, remaining P3 providers, P5 module evaluations, P6 authorized execution/retest and P7 commercial trials remain required. Browser attachment does not close these gates or authorize publication/deployment.

Independent package verification passed for all 143 archive files, both host locks/components, report hashes, negative controls, original intake retention and unchanged upstream licenses/notices. The 0.3.9 archive remains unchanged. Eight desktop/mobile HTML checks passed. Actual pilot revision exposed ambiguous guide wording about retaining decisions across assessment times; [0.3.11](website-audit-enterprise-browser-0311-review.md) clarifies it without weakening review validation. This 0.3.10 archive remains immutable.
