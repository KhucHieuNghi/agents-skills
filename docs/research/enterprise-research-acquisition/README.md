# Metadata-first stored research draft acquisition

The development `acquireStoredResearchDraft` entrypoint accepts metadata and host-supplied loaders instead of requiring callers to preload historical research/candidate bytes. It reads current stored eligibility and retirement state before invoking any loader, reads only eligible candidates and their declared supporting sources, rechecks the revision before each callback and after the final read, then delegates to the existing canonical draft builder and its final revision check.

Metadata, authority context and callback arguments are copied before asynchronous acquisition so caller/callback mutations cannot change the preflight population. Loader outputs must match requested source/candidate identity. Original bytes, hashes, support bindings and review receipts are still validated by the existing projection pipeline. A stale revision or concurrent withdrawal fails without returning draft artifacts. Expired/retired candidate sets produce an inconclusive draft without reading their old content.

## Limits

Host callbacks remain responsible for actual acquisition authorization and behavior. This function performs no network request, file acquisition, content persistence or delivery itself. Its revision checks are optimistic, not a lock: already-read bytes cannot be recalled, supplied assessment time is not an authenticated live clock, and host callers must advance the authoritative control store when access changes. The existing authority record covers control metadata only. A copied authority object is not authenticated permission or a new grant.

There is no private report-item provenance registry or governed content-history store yet. Parent report text, action descriptions and enterprise review reasons cannot be authorized for reuse by a candidate registration or parent digest. The [history plan](../../plans/website-audit-enterprise-report-history.md) records the exact missing interface and lifecycle requirements. No canonical history schema, new package release, production deployment or enterprise acceptance is claimed here.

## Review and tests

Independent reviewer `enterprise_contract_review` inspected snapshots, callback selection, support closure, retirement and revision checks and independently passed the initial 11-test stored-report suite. Four additional author-run cases cover expired policy, foreign source identity, withdrawal in the final callback and caller/callback metadata mutation. The original four new tests failed because the acquisition API did not exist before implementation.

Tests use encrypted temporary control stores and synthetic host callbacks. They verify no customer files are persisted and output delivery authority stays false. These tests are not evidence of a real provider connection, consent authenticity, external retention compliance, native host behavior or commercial success.

Full repository verification: 163 test files / 2,116 tests passed; typecheck, build, format, site typecheck and site tests passed. The initial lint run identified unqualified structuredClone globals. After changing them to globalThis.structuredClone, lint, format and all 15 focused stored-report tests passed again. Both [initial receipt](verification.json) and [correction receipt](correction-verification.json) are retained; the initial failure is not overwritten. No behavioral change followed the full test run.
