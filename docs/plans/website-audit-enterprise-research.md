# Enterprise qualitative research evidence

Status: development. This implements journey plan step 3 without replacing task/funnel/runtime work or enterprise release acceptance.

## Method and source basis

Primary guidance checked 2026-11-19:

- [GOV.UK: Analyse a research session](https://www.gov.uk/service-manual/user-research/analyse-a-research-session) separates recorded observations from interpretation and recommends involving observers in analysis. Our record kinds preserve observed behavior, participant statements and analyst inference separately.
- [GOV.UK: Taking notes and recording sessions](https://www.gov.uk/service-manual/user-research/taking-notes-and-recording-user-research-sessions) emphasizes detailed, usable records and the personal-data nature of notes/recordings. Our source contract retains attribution and task/prompt scope, with private raw evidence and no default verbatim customer export.
- [GOV.UK: Informed consent](https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research) describes purpose, sharing, retention and withdrawal boundaries. Our product uses current owner-supplied access state before acquisition and again for later projections. This metadata does not authenticate consent or establish legal compliance.

No source prescribes the exact software schema below. These are product design decisions informed by that guidance. No inference of population prevalence, causality or independent human identity is accepted by this adapter, even if sampling is labeled probability-declared.

## Acquisition before analysis

The owner/caller must establish permission to inspect metadata and obtain raw material before using any acquisition tool. `planResearchIntake(context, descriptors)` consumes metadata only and rejects payload fields. A positive eligibility result is not host authorization. Current access can deny an acquisition but cannot override tool permissions or verify a consent record.

Context binds customer/entity/study/recipient, assessment time, access-state maximum age and the full protocol digest. Protocol retains purpose, method, recruitment, target population, sampling label, identity policy, participant alias registry, task instructions and required direct evidence kinds, moderator prompts, expected session/task manifest and explicit cross-session inference policy. Session windows are retrospective and must end by assessment time.

Current access is separate from imported evidence and binds canonical participant, customer/entity/study/protocol/purpose/recipient, analysis and customer-summary flags, state observation time, expiry and an evidence digest. Missing, mismatched, null, expired, stale or denied analysis state fails closed, including through aliases. Customer-summary eligibility additionally requires analysis eligibility. A scope grants only the declared protocol purpose and recipient; narrower permissions need a separate compatible protocol/scope rather than being treated as global access.

Descriptors bind source ID, stable study-wide record ID, artifact hash, exact customer/entity/study/protocol scope, kind, session/participant/task/prompt, observation/capture times and direct evidence references. No text, transcript, recording, personal details or imported authorization is accepted. Source aliases may share one record identity. Conflicting metadata for that identity is quarantined. Every acquisition artifact must isolate one record: if the same bytes are declared to contain different record identities, all related descriptors are withheld until the owner provides permitted record-isolated metadata. This avoids reading a restricted record through another record's grant. It cannot detect undeclared content hidden in an artifact; the owner and later content validator remain responsible for the source contract.

## Counting and dependency boundaries

Participant aliases map to one declared canonical participant across sessions; repeated statements and re-exports do not become independent participants. Stable record IDs, not transport IDs, define observation identity. This is a declared identity mapping, not authentication or a statistical independence test.

Inference records cannot stand in for direct observations. Their references must resolve to eligible unambiguous observed-behavior or participant-statement records in the same study. Missing/restricted/conflicted dependencies withhold inference acquisition and sharing. Cross-session support requires the explicit protocol policy. Inference observation time cannot precede its supporting observations. The subsequent content phase must repeat dependency resolution after payload hash/schema/content-conflict validation; metadata agreement alone does not prove payload agreement.

Planned participants, sessions and task/evidence obligations never shrink when access is withheld. Internal accounting distinguishes planned, supplied, eligible, withheld, missing and conflicting metadata. A positive preflight still has contentVerified=false and studyComplete=false. It does not produce a customer/public summary; identities and protected counts stay private. Missing authorized metadata produces an owner-scoped request. Restricted records produce a handling notice, not a request to re-upload content or reinstate consent.

## Remaining implementation

1. Content acquisition/validation: revalidate current scope immediately before fetching record-isolated bytes through authorized tools; enforce source hashes, bounded strict JSON, record identity and declared scope. Keep direct text, paraphrase and inference separate; retain attribution without silently endorsing it.
2. Resolve exact payload aliases/conflicting versions independent of source order; then resolve all inference dependencies again. Keep missing expected sessions visible and avoid percentages that imply population prevalence.
3. Customer projections: include only currently permitted contributions, apply a declared disclosure policy, omit raw text/participant identifiers by default, and retain the authorized-subset limitation. Reevaluate historical contributions against current access. A prior export cannot be recalled by rewriting a new report; owner-controlled access/retention/withdrawal handling is an operational requirement.
4. Integrate with immutable enterprise run/report machinery only after the privacy/withdrawal lifecycle is designed. Do not persist mixed-access raw blobs in an append-only evidence store simply because the existing engine supports it.
5. Exercise synthetic multi-profile/cross-session/revocation cases, qualified research review and authorized actual datasets. Metadata tests alone do not close the research adapter or enterprise release gates.

## Private content validation checkpoint

`research-records.mjs` now implements the offline structural-validation and direct-dependency portions of items 1–2 for already-authorized record-isolated payloads. It rechecks current metadata/access, validates original hashes and exact schema, keeps representation kinds distinct, resolves canonical aliases, withholds missing/conflicting versions and binds analyst inferences to exact direct-record digests. Partial planned coverage cannot become complete simply because another record in the same cell is available.

This does not implement actual acquisition, semantic research interpretation, customer/public disclosure, persistence/withdrawal operations or report integration. The output is private and contains available authorized text. See [review and verification](../research/enterprise-research-records.md) before treating any of its structural states as a product capability or acceptance claim.

## Disclosure and lifecycle design checkpoint

The [customer disclosure and withdrawal contract](website-audit-enterprise-research-disclosure.md) defines useful reviewed paraphrases, exact evidence/review bindings, recipient-specific disclosure, private accounting and withdrawal-compatible storage/delivery. This is the next implementation contract, not an implemented projection or permission to persist private research in the existing append-only run. Independent design review and its remaining implementation requirements are recorded separately.
