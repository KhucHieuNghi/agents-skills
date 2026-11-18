# Lighthouse lab foundation review

Date: 2026-11-19. Status: developmental foundation, not a packaged or commercially accepted capability.

Implementation: [normalizer/evaluator](../../scripts/enterprise-performance/lighthouse.mjs), [regression cases](../../tests/content-audit-lighthouse.test.ts), [actual Chromium harness](../../tests/browser/enterprise-lighthouse.mjs). Parent: [performance contract](../plans/website-audit-enterprise-performance.md).

## Implemented boundary

The native profile is Lighthouse 13.6.0 navigation, checked against its tagged LHR/settings types and metric implementations. Raw bytes, tenant/entity/environment, requested URL, timestamps and units are validated. Different settings/browser/protocol groups are separated; unsupported versions and modes retain their accounting. Lab values never establish field CWV, ranking or revenue impact.

The evaluator deduplicates semantic measurements, preserves conflicting aliases and records each attempt's disposition. Three or more successful comparable runs can yield min/median/max plus individual values only with trusted in-session execution receipts establishing distinct sequential runs on the same machine. Supplied metadata or imported receipt files alone do not establish that authority. Known overlapping work across any configuration group on that machine prevents affected summaries. Unverified external throttling/emulation does not qualify for pooling.

## Independent review

Reviewer `/root/performance_contract_review` independently inspected source, ran tests and reproduced three P2 findings. The author fixed them and added regressions; the reviewer verified closure:

| Finding                                                                          | Correction                                                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Overlap checked only inside configuration groups                                 | All supplied trusted run intervals are checked per machine, including other configurations/unsupported attempts                            |
| Failed navigation to about:blank rejected before counting                        | Scoped runtime failure retained, invalid/non-HTTP final locations replaced by null plus bounded diagnostic hashes, no successful metrics   |
| Unsupported or missing-configuration attempts absent from requests/global totals | Disjoint global accounting and explicit ungrouped IDs; unresolved ungrouped records trigger requests even when another group has a summary |

The reviewer verified 31 regression cases at closure, then a final configuration-boundary regression was added: impossible simulation CPU/throughput or fractional/oversized viewport cannot qualify for grouping. Focused suite now has 32 passing cases. This suite is not a precision/recall estimate or native-host skill trial.

## Actual browser evidence

Lighthouse 13.6.0 was installed only into ignored `build/enterprise-lighthouse-runtime-001`, leaving root dependencies unchanged. The harness started a local synthetic page with no remote resources, forms or transactions and collected three sequential fresh Chromium sessions. All three native artifacts normalized successfully. The author directly observed execution and retained execution receipts; stored receipt JSON must not automatically be trusted by a future product importer.

Artifacts: `build/enterprise-lighthouse-runtime-001/trial-001/` contains three native JSON files, protocol, exact input bytes/hashes, receipts, initial results and immutable later evaluations. The first browser run used the pre-fix evaluator; the final evaluator replay is `reviewed-evaluation-002.json`, fingerprint `c35e544a8451f5b3de07c2f989ab6655519570114a8b2df3382fd641aff654aa`. Replay preserves all three successful records and produces a sequential lab summary. Without trusted session receipts, the same native artifacts produce no repeated-run summary. Every path leaves field assessment `not-assessed`.

For this local synthetic page only, LCP min/median/max were 601.37835/601.7962/604.1741 ms; all three native performance scores were 1 on the 0–1 scale. These measurements establish native parser/collector compatibility for the trial, not any of the four public pilot websites or an enterprise quality score. The independent reviewer checked actual file hashes and parsed all three artifacts without elevating stored receipts or rerunning Chromium.

## Remaining work

Canonical P2 report mapping and immutable import/revision, customer CLI, broader native profiles, real public performance pilots, packaging/fresh installations and commercial multi-industry evaluation remain open. No existing skill archive, component lock, catalog or production deployment is changed by this checkpoint.

## Repository verification

Full regression passed **90 files / 777 tests** with `npm test -- --maxWorkers=1`, unchanged test timeouts (48.52 seconds). Format, lint, typecheck, build and diff checks passed. The final 32-case lab suite includes an explicit oversized viewport case in addition to the independently checked guards. Existing packaged skill sources, component pins and versioned archives were not changed.
