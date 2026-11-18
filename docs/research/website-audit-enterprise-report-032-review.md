# Enterprise report 0.3.2 — P2 evidence dossier

Date: 2026-11-18. **Unpublished evaluation candidate.** This closes the implementation/verification slice for canonical enterprise reporting. It does not complete provider/runtime modules, native pilots, commercial evaluation or production release.

## Delivered behavior

One enterprise report model produces canonical JSON and deterministic Markdown/HTML plus a manifest. The CLI creates, validates and revises immutable report folders. Edited projections fail validation even if their file hash is rewritten. Report accounting, assessment coverage, site health, implementation and review status stay separate.

Reports retain requests, refusals, failed/unknown checks, missing declared checks, attributed response history, invalidated verdicts and historical measurements. Raw payloads remain in private source runs; customer report projections use explicit field allowlists. Public editions use fixed metadata, known module identifiers, opaque revision aliases and consistent aggregate counts/statuses.

Revisions verify parent artifacts and customer/run lineage. Narrative-only revisions keep the identical source digest. Reassessment preserves scope/history and cannot inherit unchanged verdicts across changed entity, evidence, profile, relevant policy or freshness context. Historical observations retain their evidence bindings. Review decisions bind transitive claim/check/context/evidence dependencies; an unchanged claim cannot keep acceptance after its supporting evidence changes.

Legacy report files remain on their original schema/workflow. Enterprise reports share the installed skill and dispatcher but use a separate validated model. This deliberately preserves the immutable 0.2.0 behavior rather than silently migrating old customer reports. Older evaluation decisions using a plain target-object hash need fresh review under the dependency-bound contract.

## Independent review history

Original review verdicts and failed cases remain in [the interim dossier](website-audit-enterprise-report-interim-review.md). Reviewers found real defects; green unit tests alone were not treated as acceptance.

| Finding                                                                        | Evidence of correction                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private identifiers/raw fields leaked through projections                      | Failing regressions followed by opaque aliases, allowlists, structural redaction checks and strict stored-model validation                                |
| Contradictory public coverage/review/module status or vacuous completeness     | Arithmetic, type, enum, known-module and nonempty-completeness guards; reviewer confirmed original repro classes guarded                                  |
| Historical verdicts or source observations disappeared on revision             | Sanitized history projections, verified parent loading, retained scope and observations, immutable evidence bindings                                      |
| Same run rewritten, or new run reused verdict against changed evidence/context | Source identity guard and per-check raw context digests; independent scoped recheck confirmed original bypass blocked                                     |
| Accepted narrative/finding/action review survived changed supporting evidence  | Transitive review-target binding; fresh reviewer independently reran the original narrative case and all 24 focused tests, confirming this finding closed |

The fresh reviewer found no additional concrete blocker within their P2 source review and scoped fix recheck. This is bounded independent code review, not proof of all possible defects, provider authenticity or whole-product release acceptance.

## Verification of this snapshot

- **76 test files / 586 tests passed** with `npm test -- --maxWorkers=2`; includes 24 report tests and the existing compatibility suite.
- Format check, lint, typecheck, build and diff whitespace checks passed. New development-only browser scripts had lint errors for explicit browser/Node globals; these were corrected and lint rerun successfully.
- Built the 0.3.2 archive, extracted it and installed into fresh separate Codex and Claude Code projects. On both, created and validated customer/public reports and a bound report revision from synthetic partial data. [Installation receipts](website-audit-enterprise-report-032-installations.json).
- Component digest: `07663c06931651d559841f837e5c921d7e1a594b8bc1ba048ae80fc60b50f621`.
- Release digest: `b53b07b9f8fdaee0b8577df8b726c59c074b268ce8c348a9877376de26c48d5c`.
- Archive digest: `797ac820b9834f2c2b7119078e55c2f0cf80d5ee4ea73998b1984ffdeb605eeb`.

## Reproducible examples and browser evidence

`scripts/enterprise-report-examples.mjs NEW_DIRECTORY` generates synthetic partial and complete-accounting examples, source runs, bundles and public editions. All invented observations are labeled; no live customer outcome or independent review approval is implied. Complete accounting does not mean commercial acceptance.

- [Partial customer HTML](website-audit-enterprise-report-examples-032/partial/report.html), [canonical JSON](website-audit-enterprise-report-examples-032/partial/report.json), [Markdown](website-audit-enterprise-report-examples-032/partial/report.md).
- [Complete-accounting HTML](website-audit-enterprise-report-examples-032/complete-accounting/report.html).
- [Public HTML](website-audit-enterprise-report-examples-032/partial-public/report.html).
- [Browser checks](website-audit-enterprise-report-examples-032/browser/checks.json), [mobile public screenshot](website-audit-enterprise-report-examples-032/browser/partial-public-390.png), [desktop customer screenshot](website-audit-enterprise-report-examples-032/browser/partial-1440.png).

The browser checker uses the site's pinned Playwright development dependency. Eight cases (four report editions at 1440px and 390px) passed offline: no document-width overflow, CSS loaded under CSP, skip link and table regions reachable by keyboard, no scripts, no HTTP requests or browser errors. Scrollable tables retain all columns on narrow screens. Customer accent color is decorative; body/link/heading text uses readable fixed colors. Desktop customer and mobile public screenshots were visually inspected. These are bounded checks, not WCAG conformance.

## Remaining enterprise work and limitations

P3–P7 remain open. The current registry is intake, not the full assessment rule suite. No provider account connection, native behavioral trial, multi-industry real-account pilot or causal performance improvement is established here. Redaction still requires disclosure review; checksums establish artifact consistency, not source authenticity. Withdrawal/correction of an immutable historical measurement needs an explicit future contract rather than overwriting history.

Installing the site's existing locked development dependencies reported 15 npm audit advisories (3 moderate, 12 high). No dependency changes were made. This is a separate existing site-toolchain finding to triage before a site deployment; the generated reports contain no JavaScript or third-party runtime dependencies. No production deployment is claimed or performed.

Next implementation contract: [P3 provider adapters](../plans/website-audit-enterprise-providers.md).
