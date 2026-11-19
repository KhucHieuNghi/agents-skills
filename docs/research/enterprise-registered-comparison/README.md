# Ordered comparison of registered generated reports

Private generated provenance now has an explicit schema v2. The original-source replay inspector adds report generation time, assessment time, parent run IDs and exact parent report digest. These fields come from the validated report/run, not registration order. Registry validation accepts original v1 records unchanged; it never fills in absent lineage or silently migrates them. The customer report schema and frozen report artifacts are unchanged.

`compareRegisteredGeneratedReports(options, expectedRevision, registrationIds)` compares an explicit ordered subset of 2–100 unexpired registrations under a separate read-history authority. One validated encrypted snapshot supplies all entries. Missing, expired or legacy entries reject the complete comparison, as do stale revisions, duplicate registrations/logical report identities/revision IDs, backwards times, source rebinding for a reused run ID, and incompatible run ancestry.

## Meaning of the result

The private response binds the exact registry revision and ordered registration IDs. It lists selected report/artifact/assessment metadata and per-transition item comparisons plus additions. `contentState` compares canonical item content. `contextState` compares the full transitive review-target digest, which includes the item itself; it is **not** a dependency-only comparison. Compiler changes are identified separately.

A removed item is labeled `not-present`. This does not prove remediation, withdrawal, deletion or a permission change. An end-to-end synthetic SEO case changes the owner's expected canonical without changing the captured website: findings disappear from the next report, and the comparison correctly retains remediationVerified=false.

Chronological standalone reports can be siblings. This API therefore reports revisionChainVerified=false, historicalCoverageComplete=false, currentReplayVerified=false, persistenceAuthorized=false and disclosureAuthorized=false. It establishes nothing about omitted registrations. Exact parent-chain validation and canonical historical text rendering remain separate unfinished work. IDs, hashes, counts and ancestor metadata stay private.

## Version compatibility and tests

Tests verify same-run standalone comparisons, stale and reversed selections, duplicate registrations, per-record expiry, alternate V1/V2 renderers for one logical report, real SEO finding disappearance after a policy change, and encrypted legacy v1 records that remain individually readable but cannot supply missing comparison metadata. Existing provenance tests still cover exact source replay and stored artifact bindings.

Independent reviewer `enterprise_contract_review` found no material defect and independently passed 41 focused tests across registry/provenance suites. It emphasized the complete review-target meaning of contextState; the output limitation and this document make that explicit. The test fixtures include encrypted historical records for schema compatibility only, not a public provenance-import interface.

The generated registry remains a metadata retention mechanism. It does not grant historical-text storage, research disclosure or delivery authority, and its cleanup/backup limits remain documented in the [registry dossier](../enterprise-provenance-registry/README.md). No bundled release or production deployment changed.

Full repository verification passed: format, lint, typecheck, build, root tests, site typecheck and site tests. See [verification receipt](verification.json). No customer report layout or bundled package changed, so this checkpoint makes no new browser, installed-host or deployment claim.
