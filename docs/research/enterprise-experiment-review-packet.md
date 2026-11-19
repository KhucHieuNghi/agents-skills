# Experiment supporting-evidence preparation checkpoint

This implements private packet preparation from the [ingestion contract](../plans/website-audit-enterprise-experiment-ingestion.md). It does not accept semantic review, create a customer report or close enterprise release gates. No package pins or customer website changed.

The packet verifies supplied original supporting bytes, exact metadata and identity across registration history, assignment/cohort records, dictionaries, queries, analysis ledgers, quality and interference evidence. All supporting descriptors and hashes, including unmatched/competing documents, enter the stable evidence identity. Aliased bytes remain one evidence identity even when assigned several IDs/roles. No external source is fetched and no imported instructions or queries are executed.

Dictionary identity is the canonical parsed JSON digest, separate from the raw artifact SHA-256. Protocol metrics now explicitly retain dictionaryVersion as well as sourceSystem/outcomeId/digest. Structural checks verify these identities and unique outcomes, not the substantive truth of dictionary definitions. Query and registration hashes refer to original UTF-8 bytes. A historical record's download timestamp does not establish registration timing or completeness of analysis history.

The focused suite initially exposed a fixture-extraction error: the existing conflict test still referenced `arm` without importing it from the new shared helper. That helper import was corrected; the 25 existing export tests and 12 packet tests then passed. The new implementation was not test-first. Cases cover exact byte versus canonical identity, every aggregate query including unselected sources, per-metric dictionary coverage, version/source/outcome mismatch, competing support, deterministic order, aliasing, stable reassessment requests, substitution, foreign scope, chronology, duplicate JSON and bounds.

Independent design review required explicit digest meanings, exact per-metric/source coverage, preservation of competitors and aliases, separate capture chronology, and binding all support into the future receipt identity. These requirements are incorporated into preparation. Source review and full verification results follow below.

The packet includes raw support text and is private. All semantic/provider/reviewer/causal/action acceptance flags remain false. Next work is exact-packet review receipts with per-prerequisite supporting bindings, expiry and replay checks, then immutable JSON/Markdown/HTML workflow and actual host/business validation. A role/hash match must never silently become a favorable verdict.

## Source review correction

The independent reviewer ran 37 focused tests and reproduced a P2 lifecycle defect: changing an aggregate query hash under the same source ID changed the required support but not its requirement/request ID. This could carry a prior fulfillment/refusal onto a different artifact. A new regression failed before the fix; requirement identity now also binds the complete normalized expected support (including hash, source system and metric coverage). Clock-only reassessment remains stable. The final focused run has 38 cases, including this author-verified fix; the reviewer did not rerun the correction. No semantic acceptance leak was found in the inspected boundary.

## Full verification

All seven repository checks passed after staging the new files: root format/lint/typecheck/build/tests and site typecheck/tests. Root result: 154 files / 1,998 tests. Staged diff whitespace check passed. Logs: `build/enterprise-experiment-review-packet-verification/`. This final result paragraph is documentation-only; source/tests were unchanged after verification.
