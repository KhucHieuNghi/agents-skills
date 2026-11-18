# Supplied dedup receipt candidate 0.3.9

Status: unpublished evaluation candidate, not full P4 or enterprise production acceptance. Adds per-attempt provider/business receipt comparison to [0.3.8](website-audit-enterprise-runtime-038-review.md); immutable earlier archives remain unchanged.

## Behavior and boundaries

Optional tracking dedup rules compare distinct attempt and logical-event digests. Exact repeated attempt copies do not inflate delivery counts. One acceptance plus explicit suppression for all remaining attempts can pass; multiple acceptances fail. Rejected/unknown/missing receipts, insufficient attempts, conflicting identities or contradictory status remain unknown. Source freshness, completeness, provider lag, mapping and sample gates still apply. Stage row counts and receipt checks remain separate. Refund/cancellation/expiry identities are distinct from the original lifecycle event.

The runtime evidence fingerprint includes the helper, and the new checks enter immutable run/report revisions. The guide and synthetic example demonstrate the contract. This compares supplied mapped receipts; it does not authenticate providers or prove live dedup code, conversion accuracy, causality or production readiness.

## Independent code review

The independent tracking reviewer tested helper, normalizer, evaluator, schema and evidence boundaries. Two concrete false-pass defects were fixed:

1. A provider rejected status paired with an accepted delivery disposition could pass. Accepted receipt contradictions now remain unknown; a genuinely suppressed rejection can still be represented.
2. An earlier contradictory record could mask later identity conflicts across correlation partitions. Global contradiction propagation now prevents affected checks from passing.

Both have integrated regressions. The reviewer verified closure with **56/56 focused tests passing**, checked the guide/sample, and reported no remaining material finding within this bounded scope. This is code review, not native host behavioral or commercial acceptance.

## Package integrity

- Component: `51cd0aa3828ea6983b0e44811f4d43ffd57289be05e8af26bbf6a0a4a4575207`.
- Release: `f5cfbe5d861b09d284a043314175c963856946b57b2dfb83df10751522f97eee`.
- Archive SHA-256: `cdca48ea3ada0d90068f5505a67b9e38f6df8e4a60cfc803c55a9bb8ee67e9de`.
- Archive: `build/enterprise-runtime-039/agent-skills-solution-content-search-audit-0.3.9.tgz`.

[Installation receipts](website-audit-enterprise-runtime-039-installations.json) bind both fresh host installations and generated JSON/Markdown/HTML. Installed-script trials are separate from native host behavioral trials. Each installed workflow yields 6 scoped passes, 1 candidate failure and 22 unknown checks. Rehashed currency and duplicate-acceptance negative controls each produce the expected failure and two candidate findings. Reports validate with semanticAcceptance=false.

Repository verification: **86 files / 696 tests passed** with unchanged per-test timeouts and two workers (`build/enterprise-runtime-039/tests-final.log`). Format, lint, typecheck, build, skill quick validation and diff checks passed. Tracked documentation checks also passed 14/14 after staging.

Independent package review verified all 137 archive files against the extracted inventory and bytes, both host installation locks and component hashes, composition/reference closure, report/manifest hashes, retained intake checks and both actual negative-control runs. Upstream records/licenses/notices and the 0.3.8 archive remain unchanged. No remaining finding within this bounded package review; native host behavior and production acceptance remain unproven.

## Remaining scope

Authorized browser collection and actual cross-session/SPA/transaction fixtures, cross-system clock evidence, remaining provider adapters, P5 performance/accessibility/UX/SEO runtime modules, P6 authorized execution/retest and P7 commercial evaluation remain open. The four [public pilots](enterprise-public-pilot-20261118/README.md) are sampled observations, not evidence that these modules are complete. Live dedup implementation remains explicitly unassessed even when supplied receipts pass.
