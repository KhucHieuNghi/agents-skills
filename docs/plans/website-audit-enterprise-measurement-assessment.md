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

Step 1 is implemented in `scripts/enterprise-measurement/config.mjs` with focused fixtures. Step 2–4 remain open; no customer CLI/report integration or package change is claimed. Source eligibility still depends on supplied metadata and host provenance. Timestamped owner confirmation in JSON is not cryptographic authentication; the caller is responsible for obtaining it independently.

Independent review found an incomplete key-event list could hide a second matching event name, and a nonboolean GTM deleted flag could bypass ineligibility. Both now have regression coverage. Follow-up review identified importer expectation filters could throw before assessment and unbounded payloads could be accepted; the evaluator now defines its own exact context and validates bounded JSON before normalization. Timezone aliases are compared canonically rather than misclassified as different zones. Final verification and reviewer disposition are recorded below.

## Verification checkpoint — 2026-11-19

Independent AI reviewer `enterprise_readiness_review` re-read the final evaluator and independently ran its focused suite; no blocker remains within the pure development scope. A final minor sentinel-validation issue was fixed with a failing-then-passing regression: `COUNTING_METHOD_UNSPECIFIED` applies only to GA4 counting fields, not arbitrary GTM values. Sparse-array and extra-property ambiguity is also rejected.

Verification: [21 focused tests](../../tests/content-audit-measurement-assessment.test.ts) pass; full repository suite passes 124 files / 1,442 tests. Typecheck, build, site typecheck and 19 site tests passed. Initial lint caught explicit `any` annotations in new fixture tests; these were removed without changing executable test behavior, and focused tests plus full lint/format were rerun successfully. Local documentation links and `git diff --check` pass. No released skill source, manifest, component digest or archive changed; no push/deployment or customer mutation occurred.

This checkpoint proves the declared expectation evaluator and its bounded input behavior only. Automatic dependency assessment, business dictionary mapping, immutable P2 report/CLI integration, packaging, actual provider acquisition and enterprise commercial trials remain required.
