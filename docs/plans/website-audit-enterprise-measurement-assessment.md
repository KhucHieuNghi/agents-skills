# GA4/GTM configuration assessment — implementation contract

Parent: [enterprise roadmap](website-audit-enterprise.md). Selected by the [independent readiness review](../research/website-audit-enterprise-readiness-20261119.md). The objective remains full enterprise audit; this contract supplies the missing semantic layer between provider import and runtime tracking, not a reduced replacement product.

## Sources and interpretation

Checked against primary references on 2026-11-19:

- [GA4 KeyEvent](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents): event-name identity and counting method are configuration attributes; they do not prove a business outcome.
- [GA4 DataStream](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams): property-scoped stream resources and typed web stream data support explicit measurement-ID comparisons.
- [GTM ContainerVersion](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.versions): a particular version contains tag, trigger and variable configurations; a supplied version is not deployment evidence.
- [GTM Tag](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.tags): firing/blocking IDs and paused state support declared configuration checks. Setup/teardown, parameter expressions and consent settings require additional semantic rules; array equality does not establish delivery or consent compliance.

## Delivery sequence

1. Pure evaluator and owner-defined contract: reuse raw-source normalization, bind scope/version/freshness, assess typed expectations, preserve unknown/request behavior and private evidence digests. Development-only API is documented in [its README](../../scripts/enterprise-measurement/README.md). Do not edit locked candidate source until integration review.
2. Dependency assessment: implement tag/trigger/variable references, explicit builtin handling, setup/teardown and expression coverage with fail/unknown semantics. Builtin references must not become false missing-reference findings. Never execute custom JavaScript or templates to inspect them. Validate business dictionary and event/key-event mapping separately from terminal outcome evidence.
3. Immutable report integration: fork the bound source run; register versioned checks and evaluation evidence; validate stored indexes by replay before replacement; retain parent report and review history. Every unknown must generate a P2-compatible request. JSON/Markdown/HTML projections must remain equal, with raw configuration excluded from customer views. A CLI must support missing/declined input without aborting unrelated modules.
4. Package and behavioral evaluation: update provenance and new versioned candidate only after source/report review, fresh install both hosts, and run installed workflows. Native/assisted enterprise trials remain subject to the [commercial evaluation protocol](../research/website-audit-enterprise-evaluation.md); fixtures are dev evidence, not holdout or pilot substitute.

## Acceptance cases

Clean declared GA4/GTM values; mismatching timezone/currency/stream/counting method/tag state/trigger sets; required absent custom trigger/variable; incomplete and omitted collections; ambiguous key-event names including across pagination; stale/deleted source; expired owner contract; wrong tenant/property/entity/version; future dates; duplicate/conflicting expectations; malformed values; bounded JSON and no executable getters; repeated deterministic evaluation; changed scope/freshness changes digest; no mutation or runtime-success claim.

Full integration additionally needs wrong-source/replayed index rejection, sibling check preservation, updated evidence invalidation, immutable source/report bytes and private/public projection tests. Dependency and business dictionary cases must be defined before those evaluators are implemented. Matching only the declared expectation subset cannot close the module's mandatory check inventory.

## Current development checkpoint

Steps 1–3 now use the bundled implementation at `skills/content-search-audit/scripts/lib/measurement-assessment/`; former `scripts/enterprise-measurement/` entrypoints re-export it for compatibility. Candidate 0.3.14 includes the offline CLI and report/request integration; see [package verification](../research/website-audit-enterprise-measurement-0314-review.md). Code acquisition, conditional mapping, remaining dependency surfaces, approved scope retirement, evaluator migration and commercial step-4 acceptance remain open. Source eligibility still depends on supplied metadata and host provenance. Timestamped owner confirmation in JSON is not cryptographic authentication; the caller is responsible for obtaining it independently. Earlier checkpoints below describe their respective historical scope.

Independent review found an incomplete key-event list could hide a second matching event name, and a nonboolean GTM deleted flag could bypass ineligibility. Both now have regression coverage. Follow-up review identified importer expectation filters could throw before assessment and unbounded payloads could be accepted; the evaluator now defines its own exact context and validates bounded JSON before normalization. Timezone aliases are compared canonically rather than misclassified as different zones. Final verification and reviewer disposition are recorded below.

## Verification checkpoint — 2026-11-19

Independent AI reviewer `enterprise_readiness_review` re-read the final evaluator and independently ran its focused suite; no blocker remains within the pure development scope. A final minor sentinel-validation issue was fixed with a failing-then-passing regression: `COUNTING_METHOD_UNSPECIFIED` applies only to GA4 counting fields, not arbitrary GTM values. Sparse-array and extra-property ambiguity is also rejected.

Verification: [21 focused tests](../../tests/content-audit-measurement-assessment.test.ts) pass; full repository suite passes 124 files / 1,442 tests. Typecheck, build, site typecheck and 19 site tests passed. Initial lint caught explicit `any` annotations in new fixture tests; these were removed without changing executable test behavior, and focused tests plus full lint/format were rerun successfully. Local documentation links and `git diff --check` pass. No released skill source, manifest, component digest or archive changed; no push/deployment or customer mutation occurred.

This checkpoint proves the declared expectation evaluator and its bounded input behavior only. Automatic dependency assessment, business dictionary mapping, immutable P2 report/CLI integration, packaging, actual provider acquisition and enterprise commercial trials remain required.

## Static dependency implementation — next checkpoint

Added `scripts/enterprise-measurement/dependencies.mjs` and [dependency fixtures](../../tests/content-audit-gtm-dependencies.test.ts). Reuses the existing source normalization and bounded-JSON guard; preserves synthetic/run/evidence identity. Static references include firing/blocking triggers, sequencing tags, nested parameters and variable references in supported tag/trigger/variable surfaces. Every supported reference has a deterministic scoped check; ambiguous, incomplete, dynamic or unsupported evidence remains unknown. Grouped requests preserve all affected check IDs.

Primary references checked 2026-11-19: [Parameter](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/Parameter), [Trigger](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.triggers), [Tag](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.tags) and [enabled built-in variable list](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.built_in_variables/list). Parameter tag references use names and trigger references use IDs. Map keys must be unique. Tag monitoring metadata is not a supported variable-reference surface. No copied provider implementation or additional dependency is introduced.

Ruling: no comprehensive authoritative built-in trigger-ID catalog was established in this review. Require an explicit current scoped inventory to distinguish absent custom IDs from unlisted built-ins. Without it, unresolved references remain unknown and request the inventory. Supplied inventory integrity does not prove provider truth. This prevents a common false-positive path without inventing an implicit clean result.

Ruling: structural cycles are candidates requiring review, not automatic material runtime defects. Only currently resolved static edges are examined. Dynamic execution and template semantics are not inferred from graph topology. `coverageComplete: false` prevents promoting this bounded traversal to full-container correctness.

Independent review reproduced output amplification from repeated long scope identifiers and noted missing synthetic/run/evidence lineage. Scope/component limits, incremental/final output budget and provenance propagation were added with regression fixtures. A further usability regression requires 4,500 unknown references sharing an export to produce one request while retaining every affected check. This does not replace the P2 request schema or its reconciliation logic; that remains in the integration task.

Verification for the static-dependency checkpoint: independent AI reviewer `enterprise_readiness_review` approved the bounded development scope after rechecking grouping, lineage and amplification fixes; its focused run passed 42/42 tests across configuration and dependency files. Full repository verification passed 125 files / 1,463 tests, plus lint, typecheck, build, format, site typecheck and 19 site tests. Documentation links and diff whitespace checks passed. The full suite completed in 217.49 seconds.

No package/lock/version changed and no push, deployment or customer mutation occurred. Next required work is business mapping and immutable report/request integration, followed by a reviewed package and native-host/commercial evidence. This source checkpoint does not close those gates.

## Business-mapping consistency checkpoint

Added `scripts/enterprise-measurement/business-mapping.mjs` and [business-mapping fixtures](../../tests/content-audit-business-mapping.test.ts). The evaluator reuses `validateBusinessObservationContract` for profile/status/window definitions and the existing GA4 normalization boundary. It compares an owner contract to a separately supplied application-event mapping, and evaluates key-event configuration independently of semantic consistency. Passing checks never establish application execution, provider receipt, accepted lead, settlement or revenue.

Ruling: milestone and success are explicit owner requirements. Do not hardcode that an analytics event name means success, or prohibit a deliberate milestone key event. Required success mappings must represent only statuses in the owner's success definition. Domain correctness of that definition remains a review prerequisite.

Ruling: a shared dictionary may contain unused business profiles; scope validation applies to referenced outcomes. This supports multi-industry/shared enterprise dictionaries without widening the audit's claims. Separate requirements may cover mixed profiles; shared event names remain unknown until a conditional/discriminator contract can distinguish them. Duplicate mappings and partial name-based inventories are never resolved by arbitrary first-match selection.

Coverage includes all five profiles, mixed commerce/booking, unknown/mismatched outcomes/statuses/meanings, correct and unwanted key events, missing/unspecified/malformed counting, complete versus partial absence, foreign/digest binding, stale evidence, exact freshness expiry, expired contract and missing inputs. Fixtures are synthetic dev cases, not commercial holdout evidence. Intermediate requests retain affected check IDs and group repeated requests by artifact.

The next required implementation is immutable P2 report/request integration for configuration, static dependencies and business mappings together. Preserve source revisions and unknown checks; validate replayed indexes; redact private source details; retain review/history and refusal semantics. Then expose and test the installed customer workflow. Native host/commercial gates are unchanged.

Business-mapping verification: independent AI reviewer `enterprise_readiness_review` found no remaining blocker in the declared-consistency scope and independently passed 20/20 focused tests after the shared-dictionary scope fix. Full repository verification passed 126 files / 1,483 tests in 82.61 seconds, plus lint, typecheck, build, format, site typecheck and 19 site tests. New documentation links and diff whitespace checks passed. No released package, lock, version, archive, push, deployment or customer mutation changed. This checkpoint does not establish application mapping extraction or runtime/business outcome verification.

## Report/request integration checkpoint

`scripts/enterprise-measurement/workflow.mjs` now creates immutable enterprise run revisions for all three evaluators and returns scoped findings for the existing JSON/Markdown/HTML report builder. Ownership indexes are rederived from retained source evidence and implementation fingerprints. Raw exports are excluded from customer finding text. Existing assessments absent from an update bundle are reassessed, preserving sibling modules and declared coverage.

Independent reviewer `measurement_workflow_review` identified four integration blockers: missing-contract supplementation was rejected as narrowing, refreshed verdicts lacked parent-report history, legitimate cross-module invalidation could not replay, and request progress was reset. Regression coverage now exercises configuration and business-contract supplementation, disappeared GTM references, parent-bound fail-to-pass report revisions, external expiry invalidation, provided/expired/declined request states, source immutability, and forged carried-check/index rejection. The reviewer independently passed the 11 focused integration tests after those fixes.

Superseded checks retain their original evidence and become unknown with a grouped migration-review request; they do not disappear from coverage or become automatic passes. Approved obligation retirement and implementation-fingerprint migration remain open work. A supplied response is preserved as provided only for an unchanged request descriptor and temporally valid bindings; this never implies that a check has been assessed or passed. Changed verdicts are archived with the exact source-run digest before reporting.

This remains a development API, not the installed customer command or released package. Full module coverage, source acquisition, approved migrations, package/install proof and commercial evaluations remain required. Integration validation is recorded separately from the earlier pure-evaluator checkpoints.

Final integration verification: 12 focused tests pass; full repository verification passes 127 files / 1,495 tests in 76.70 seconds, plus lint, typecheck, build, format, site typecheck and 19 site tests. The independent reviewer found no remaining blocker in this development scope after the aggregate historical-check cap and repeated-digest cost fixes. Its separate large fixture created 5,208 checks, then rejected a disjoint-reference revision exceeding 10,000 active plus retained checks in 4.12 seconds total. The durable regression verifies no output run is written on that rejection. These are synthetic consistency/robustness tests, not commercial accuracy metrics. No released skill files, component lock, package version or customer websites changed.
