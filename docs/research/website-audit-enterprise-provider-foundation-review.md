# P3 provider foundation — interim evidence

Date: 2026-11-18. **Historical integration/review log, not completed P3 acceptance.** Initial entries below describe the working tree after candidate 0.3.2 (P2). Later packaging and current verification are tracked in the linked candidate dossiers; do not interpret historical failed checks as the current candidate result.

## Implemented library behavior

- `inspectProviderAccess`: reads caller-supplied trusted host inventory/grants, with customer, environment, resource, entity, host, operation, identity and freshness boundaries. Distinguishes unavailable, expired authentication, denied permission, quota limitation, stale capability and missing authorization. Always supplies an export route. No network operation or audit acceptance follows from planning.
- `normalizeProviderSnapshot`: wraps existing GA4/GSC/Bing importers without modifying legacy contracts; checks declared ownership, property/site, query/scope and capture time. Preserves metric strings, provider metadata and precision. Adds GA4 property/stream/key-event configuration and explicit GTM version snapshots. These are supplied configurations, not proof of deployed behavior.
- Provider evidence binds content, ownership, entity/window and validity. Gaps preserve stale data, incomplete pagination/config collections, sampling, thresholding and restrictions. No run/check is mutated by these library functions.
- `normalizeBusinessObservations`: uses an explicit source-system/outcome dictionary; keeps attempted, rejected, settled, refunded and other declared statuses separate. Preserves amount strings/currencies/precision, missing correlation IDs and manual provenance. No cross-currency totals, attribution or final-order-state inference. A schema describes its normalized output.

## Independent findings and fixes

Initial provider review: **changes requested**. Reproduced and added regression coverage for evidence identity omitting validity, a foreign nested GTM container, and prototype-key lookup bypassing operation validation. Fixes include validity in identity, root/nested/component-path scope checks (including valid workspace paths), and own-key operation lookup. The reviewer independently confirmed all three corrections.

Business normalizer review: **changes requested**. Reproduced foreign row ownership being discarded, approximate amount precision being lost, pre-window snapshots appearing gap-free, and missing manual attribution. Fixes reject contradictory row ownership and wholly pre-window captures; retain precision; flag partial/empty windows and missing attribution; preserve supplied actor/method/locator. The reviewer independently reran each reproduction and confirmed all four findings closed. Their scoped business suite had seven passing tests at that point.

Historical library snapshot verification: **3 files / 24 tests passed**, including GA4/GSC/Bing/GTM wrapper cases and the business schema. This is bounded library evidence. It does not establish full P3 acceptance, real provider authenticity or commercial audit accuracy. Newly added GA4 configuration paths still need independent review after integration.

## Remaining work

1. Add enterprise CLI import/revision workflow, with source digest/new-run lineage, immutable evidence IDs, bound data-request receipts, refusal preservation and dependency invalidation. Do not accept trusted capability/grant assertions from imported JSON.
2. Ensure resource-specific requests bind the exact provider/entity/window; a provided import never automatically passes configuration or runtime checks. New provider-specific request planning must coexist with the intake registry.
3. Review provider/config and business interfaces together with P4 tracking-chain requirements; add remaining malformed/partial/provider cases and both-host installed workflow tests.
4. Add user-facing export/reference instructions, refresh provenance/component lock under a new evaluation version, run all repository checks, build/extract/install and preserve receipts.
5. Native account trials and cross-industry pilots remain P7; missing real accounts must not be replaced by synthetic claims.

## Primary documentation checked

The adapter contract retains GA4 property timezone/currency and distinguishes key-event definitions from measurements. Resource identities follow property/data-stream/key-event paths; no Admin mutation is implemented. [GA4 property](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties), [key events](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents), [data streams](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.dataStreams).

Other checked provider boundaries and implementation sequence are in the [P3 contract](../plans/website-audit-enterprise-providers.md).

## Integration review follow-up

The plan/import CLI and refusal/reopen remapping now have four passing workflow tests, including prior-verdict invalidation. Reviewer independently ran 14 workflow/measurement tests and found an Important open issue: planning accepts gsc-inspection without an importer, impossible GA4 expectedQuery objects, and invalid business dictionaries/windows. Target validation must reject impossible plans or implement the missing adapter before blaming supplied input. This finding remains open; GA4 config review found no additional concrete blocker in its bounded pass.

The user has now authorized public pilots on cake.vn, infinity.racing, quokkaguide.com and vba.vn. These are real public-surface audits; account data and transactional testing remain separate requirements. Continue P3 integration corrections alongside the pilot evidence, without calling these four public pilots full-account commercial acceptance.

## Planner contract correction — 2026-11-18

The previously open planner finding is now **closed in scoped independent review**. A red regression reproduced planning an unimplemented gsc-inspection target; planner now rejects operations without an ingestion adapter before creating output. Shared pure GA4/GSC query validators preserve legacy import behavior and permit planning to enforce the same contract. Logical expected queries exclude transport pagination. GSC defaults are normalized only at planning and bound in targetId; import requires the canonical identity. Business dictionary/window validation is shared with ingestion, and Bing requires all five scope fields.

Reviewer found two additional locally impossible obligations during re-review: duplicate GA4 metrics and an incompatible fixed GSC timezone. Both were reproduced before fixes and now fail before writing a run. Duplicate dimensions are rejected too. No-write assertions check the actual enterprise-run.json, not a nonexistent legacy filename. Positive GSC-default and refunded business-outcome import scenarios preserve unknown assessments and target identity.

Planner-correction snapshot verification: 75 tests across nine suites passed; a subsequent four-suite run with final residual fixes passed 19 tests, including enterprise compatibility and legacy GA4/GSC importers. Reviewer independently reran both residuals and 17 tests across four suites including release-baseline regression, and confirmed no observed mutation/lineage regression. These counts reflect different selected suites, not a combined new denominator.

User-facing instructions now live in references/enterprise-providers.md and are linked from SKILL.md. They distinguish capability discovery from implemented ingestion, supplied evidence from authenticated provider data, and imports from passed checks. URL Inspection ingestion is still unfinished; the closed finding does not assert that capability is implemented.

The four public pilots are delivered separately at [pilot dossier](enterprise-public-pilot-20261118/README.md): nine independently reviewed findings with JSON/Markdown/HTML and explicit account-data gaps. They do not close account/native or commercial precision/recall gates.

P3 still requires provider/runtime interface review, candidate provenance/version refresh, full green package tests, archive and both-host installed workflow verification. Existing 0.3.2 locks intentionally do not describe the uncommitted P3 working tree; do not distribute it as 0.3.2.

Historical pre-packaging working-tree checks after this correction: format, lint, typecheck, build and git diff --check passed. Full suite: **608 passed / 8 failed, 80 files**. The eight failures remain package/composition/verifier gates because the P3 working package differs from the immutable 0.3.2 locks (now first detected at SKILL.md). Log: build/enterprise-p3-current-tests.log. No archive was rebuilt or released from this unlocked tree.

Packaging progress is tracked in [candidate 0.3.3 dossier](website-audit-enterprise-provider-033-review.md). Earlier references to 0.3.2 locks and eight failing package checks above describe the pre-packaging snapshot, not the latest candidate state.

Current packaged evaluation follow-up: [0.3.4 dossier](website-audit-enterprise-provider-034-review.md), including self-contained configuration examples and both-host installed workflows. Full P3 acceptance remains open.
