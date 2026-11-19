# Private qualitative research record validation

Development-only checkpoint for the [research plan](../plans/website-audit-enterprise-research.md). `research-records.mjs` validates already-authorized supplied bytes and returns private evidence; it does not acquire data, persist files or create customer/public reports. Candidate 0.3.24 and released archives remain unchanged. Tests use synthetic text and identities only.

Every payload is checked against current intake eligibility before any artifactText property is read. Bounded strict JSON, declared SHA-256, exact scope/record metadata and representation constraints establish structural validity. Observed behavior, participant statements and analyst interpretation remain separate. Verbatim-declared is an attributed label, not independent quote verification.

Canonical content identity includes scope, representation, text, canonical participant/session/task/prompt/time and support bindings. It excludes transport aliases, export capture time and provenance aliases deliberately; available-record attribution retains every source's actor/method/locator separately. Identical hashes reuse verified bytes while validating each descriptor. Missing distinct versions or conflicting content suppress record text rather than selecting an agreeable source. Inference bindings require exact eligible direct-record digests after content validation; unsupported inference text and attributions are omitted.

Independent design review required kind/representation compatibility, precise canonical identity, exact dependency sets, unresolved partial version sets, no withheld text in errors/output, current access-context binding and coverage-state preservation. Source reviewer `enterprise_contract_review` found no additional material defect beyond two author-identified gaps:

1. One available record could make a task cell appear complete while another declared record in that cell was missing. The regression failed first. Coverage now retains partial-content and per-cell unavailable identities/states; overall evidence coverage also requires every declared record available.
2. Inference binding order used localeCompare. A mixed-case ID regression failed first. Sorting now uses deterministic code-unit comparison so canonical identity does not depend on host locale.

Both corrections passed targeted tests. The reviewer inspected the source and did not run tests or independently re-review these fixes. Eighteen content tests plus eighteen metadata-intake tests cover access-before-read, revoked content exclusion, aliases, missing versions, conflicts, exact inference digests, malformed input, partial coverage, deterministic ordering and separation of participant testimony from observed behavior.

Private output retains available authorized text and participant IDs. It must not be fed directly to a public/customer renderer. Current declared access and its digest accompany the result; they do not authenticate consent or recall a prior export. Customer disclosure, privacy-aware evidence persistence, withdrawal handling, semantic review, actual datasets, native-host trials and enterprise release acceptance remain open.

Final verification: 141 files / 1758 tests passed, plus format, lint, typecheck, build, site typecheck and site tests. [Verification receipt](enterprise-research-records-verification.json) binds source and local-log hashes.
