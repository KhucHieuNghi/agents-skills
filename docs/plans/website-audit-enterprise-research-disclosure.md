# Research disclosure and withdrawal lifecycle

Status: implementation contract, not an implemented capability or release gate pass. Extends [research evidence](website-audit-enterprise-research.md). Applies to customer research summaries; public publication needs a separate policy and is unsupported by this interface.

## Product outcome

A customer needs useful, reviewed observations, the task context, uncertainty and a proposed next action without receiving participant transcripts or identifiers. Merely hiding every observation would not satisfy this requirement. The deliverable is a reviewed summary with privately traceable exact evidence, a bounded authorized-subset limitation, and a concrete retest recommendation. Research summaries do not establish conversion uplift, population prevalence or a site-wide UX pass.

The existing `customerSummaryEligible` flag is only evidence eligibility. It is not approval of a particular summary, anonymization assurance or permission to publish raw text. Neither a substring blacklist nor an AI reviewer identity authenticates a privacy review.

## Three data boundaries

1. **Private evidence vault:** record-isolated original bytes, participant registry, access evidence, provenance, support dependencies, analysis and disclosure candidates. Customer source IDs, artifact hashes and stable participant aliases also belong here. The current offline evaluator does not provide this vault.
2. **Private release decision:** exact approved summary and evidence bindings, recipient/purpose scope, disclosure policy, reviewer receipt, current eligibility assessment and withdrawal dependencies. This record can contain sensitive linkage; do not embed it in customer manifests or public logs.
3. **Customer package:** allowed summary fields only, edition-local opaque references, explicitly reviewed task context, assessment date and limitations. JSON is canonical; Markdown and HTML derive from that JSON. No private record IDs, content hashes, timestamps precise enough to identify participants, source paths, protocol prose, participant counts or internal data requests by default.

Summaries and recommendations can themselves identify participants. Treat the customer package as controlled material, not anonymized merely because direct identifiers were removed. Default publication is disabled. Recipient review concerns the exact destination, not all users of a domain.

## Disclosure candidate and review contract

The next pure adapter accepts current research context, descriptors and authorized payloads, plus a private disclosure bundle. It must invoke `evaluateResearchRecords` itself; a caller-supplied cached evaluation cannot establish current eligibility. Caller obtains fresh trusted access and applicable host permission before supplying any bytes. A failed evaluation produces no partial customer package.

Before retrieving a candidate payload or full reviewer receipt, a metadata-only candidate preflight must resolve its complete contributor/dependency closure against current access and disclosure scope. The metadata binds candidate ID, payload hash, exact support bindings, scope and receipt hash without text. A denied or unresolved dependency blocks candidate acquisition. Check every supplied candidate identity and eligibility before reading any candidate text or receipt content, including historical candidates. V1 does not permit candidate-to-candidate support; all dependencies resolve through validated research records, avoiding unbounded derived chains. If later versions permit derived candidates, recursive access checks and cycle rejection are required before acquisition. Metadata access itself requires owner permission.

Each candidate has an opaque private candidate ID, customer/entity/study/recipient/purpose/protocol scope, type (`observed-behavior`, `participant-statement`, `analyst-interpretation`), a bounded task-context summary, finding summary, limitation, recommendation and retest text. Text is a deliberately authored paraphrase; no automatic copying of record text, provenance, protocol instructions or private request descriptions. Direct quotations and media are unsupported in this first projection contract.

Each candidate binds the complete set of supporting canonical record IDs and digests. Direct-observation/statement candidates bind the matching direct kind. An interpretation binds an analyst-inference record and its exact direct dependency closure. Additional direct support is allowed only if explicitly bound and reviewed. All support and dependencies must remain available and customer-summary-eligible at projection time. Missing/conflicting/changed support suppresses the entire candidate; do not retain a sentence or silently substitute new evidence. Partial removal invalidates the whole prior candidate and receipt. A replacement needs a new candidate identity and exact evidence-bound review even if its wording is unchanged; deleting a support reference cannot preserve prior approval.

A private reviewer receipt binds the digest of the exact candidate (including all text and support), full scope, disclosure-policy digest, review time, expiry and declared reviewer identity. Distinct review decisions cover (a) faithful interpretation and kind labeling, (b) sensitive-content/disclosure suitability for this recipient and purpose, and (c) recommendation/retest relevance. All must accept; pending, expired or mismatched receipts withhold the candidate. Review time must not precede the latest support capture; review validity cannot outlast source/access validity. A structural receipt validator does not authenticate the reviewer or replace qualified research judgment. AI review is labeled AI, never human approval.

The policy is provided by the trusted caller, separate from source bytes. It binds recipient, purpose and protocol, supported candidate types, review maximum age and expiry. Imported fields cannot grant permission. V1 rejects configurable release of participant counts, quotations or raw identifiers instead of silently accepting an unimplemented option. Useful qualitative summaries are supported without claiming a minimum cohort size makes them anonymous.

The public function returns two explicitly separated objects: a customer projection and private decision accounting. Customer construction is an allowlist, never object spread or serialization of evaluator results. Private decisions retain each candidate's included/withheld status and generic reasons; raw text is not echoed in errors. The caller must not log or publish the enclosing private response.

## Coverage and evidence references

Do not publish private planned/withheld/revoked counts or per-participant/session coverage. Customer output always says that it represents permitted, reviewed material only, may omit other material, and cannot establish complete study coverage or population prevalence. It must not reveal whether a particular participant withdrew. No percentages, sample denominators or cross-edition stable evidence IDs are produced in V1.

Edition-local references connect customer claims to the private release decision; they are not raw hashes or stable aliases. The same participant contributing twice must not be described as two people. Pseudonymous references alone cannot prevent inference from successive report differences, so automated reissue is a private draft pending recipient/disclosure review, not automatic delivery.

No included candidates yields an explicit inconclusive projection with generic next steps, not a UX pass and not an assertion that no problems exist. Owner-facing private requests may identify authorized gaps. Restricted-content handling notices must never ask the customer to reupload withdrawn material or reinstate consent.

## Persistence and withdrawal before enterprise integration

Do not put raw research payloads, candidate text, private receipts or dependency maps into the existing append-only enterprise run. That store's immutability does not fulfill retention or withdrawal requirements. Analysis permission does not grant storage or delivery. The vault must receive separate current owner-issued storage and delivery authority, each bound to customer/study/purpose/recipient as applicable and to retention/expiry and permitted storage locations. Storage decisions explicitly cover originals, candidates, receipts, dependency maps, staging artifacts, caches and backups; missing or denied authority fails closed. These authorities are not added to imported record payloads. Keep the pure projection adapter offline until a separate vault/delivery adapter implements this lifecycle:

| Operation          | Required behavior and evidence                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acquire            | Check current scoped authorization before retrieval; isolate records; avoid payload logs/temp leaks; record authorized provenance privately.                                                                                                                                    |
| Store              | Tenant- and study-scoped access controls, encryption/key ownership, declared retention/expiry, separate participant mapping, bounded access logs and backup retention. Owner selects the retention rule; no invented universal duration.                                        |
| Release draft      | Reevaluate current permissions and exact dependencies; save private decision; produce canonical customer JSON and deterministic MD/HTML in a restricted staging location.                                                                                                       |
| Deliver            | Recheck access and receipt validity immediately before delivery; serialize delivery against revocation or use an access-generation compare-and-swap. Record destination, edition and controlled artifact IDs. No offline snapshot closes the check-to-delivery race.            |
| Withdraw or expire | Invalidate all dependent drafts and live delivery links; cancel pending deliveries, purge applicable caches/exports and schedule source/candidate/derived deletion under the owner policy. Quarantine while deletion is incomplete; do not claim completion on queue insertion. |
| Reassess           | Reevaluate remaining currently authorized records, reauthor any changed summary and obtain fresh exact-content review. Do not reuse a withdrawn inference's wording as an unbound hypothesis.                                                                                   |
| Verify removal     | Record storage/cache/link/backup disposition and failures. Retry idempotently; unresolved recipients, offline downloads and backup delays remain disclosed operational limitations.                                                                                             |

Deletion receipts must minimize retained metadata: opaque operation/edition IDs, scope necessary for access control, timestamps and disposition; no withdrawn text, direct identifier or reversible lookup in a public tombstone. Internal linkage retention must itself follow the owner policy. Immutable hash commitments are not a universal exception to deletion.

Customer artifacts already downloaded cannot be recalled by changing a local report. Track distributions, disable controlled links and ask authorized recipients to remove affected copies when required by the owner's process; report what is and is not verified. Never claim that invalidating a new projection erased prior exports. Existing enterprise report history may retain only a reviewed non-sensitive withdrawal status, not the removed research narrative. Integration remains blocked until this separate lifecycle and its failure behavior exist.

## Verification required

- Access denied/stale/expired, share-only denial, wrong recipient/purpose/protocol and changed support prevent output of candidate text; validate every supplied identity before reading content.
- Candidate text, support set, type, task context, recommendation, policy or recipient changes invalidate the exact review receipt. A source-provided approval cannot override trusted caller policy.
- Mixed authorized/restricted dependencies, alias reexports and conflicting versions cannot leak an inference or inflate independent people. Replay with current access suppresses historical candidates as well as newly submitted ones.
- Candidate metadata preflight rejects revoked, stale or unresolved contributor access before fetching candidate payloads/full receipts; getter-based negative tests prove text is not accessed. Reject candidate-to-candidate references in V1.
- Customer JSON/MD/HTML exclude canary private identities, source IDs, source hashes, provenance, prompts, timestamps, restricted counts and unreviewed strings. Candidate paraphrase contains a deliberate sensitive canary to prove a negative reviewer decision blocks release; string scans alone are not semantic privacy review.
- Empty/partial projections retain limitations and never emit a pass. Five business profiles plus mixed profiles must retain the same privacy boundary while producing meaningful task-specific recommendations.
- Revocation concurrent with staging/delivery, crash/retry, cached link, prior downloaded export, backup retention and deletion failure require lifecycle integration tests. Pure adapter tests cannot satisfy them.
- Independent realistic review must assess faithful interpretation and reidentification risk on authorized material, including small samples and sensitive journeys. Structural fixtures do not establish commercial quality or consent authenticity.

This contract deliberately does not prescribe a legal basis or certify compliance. Its implementation and operational ownership remain required alongside the enterprise release gates.

## Independent design review

`enterprise_contract_review` inspected the existing intake/content boundary and this proposed contract. It identified two material requirements: explicit authority for every persisted research artifact, and metadata-before-content acquisition for disclosure candidates themselves. Both are incorporated above, along with its clarification that partial support removal invalidates the entire old candidate/receipt and requires a new candidate identity. These are author-applied design corrections, not an independently retested implementation. The reviewer also confirmed the need to keep private denominator accounting and withdrawal-aware history outside generic append-only research payload storage. No runtime, delivery, deletion, qualified semantic review or commercial acceptance is established by this document.

## Metadata implementation checkpoint

`planResearchDisclosure` now implements the private metadata preflight in
`scripts/enterprise-journeys/research-disclosure.mjs`. It reuses current research
intake decisions, enforces recipient/purpose/protocol policy scope, evidence-kind
compatibility, complete inference dependency closure and isolated candidate/review
artifacts. A hash shared with any declared research source also blocks acquisition.
No candidate content is accepted. Actual content hashes, review receipts,
customer projection, storage/delivery and withdrawal operations remain unimplemented.

Focused verification: 18 disclosure tests and 36 existing research tests pass.
An author-added regression first demonstrated that a candidate could alias source
research bytes; the isolation check now rejects that acquisition. These tests do
not authenticate current access or establish semantic/privacy review quality.

Independent source review found a candidate-level cross-session bypass: individually valid inferences could be combined with extra direct evidence from another session despite a protocol prohibition. A regression reproduced the failure; the preflight now checks the complete direct-support session set, including additional evidence, before allowing acquisition. The reviewer performed a narrow reproduction and source review, not a full suite or independent re-review of the fix.
