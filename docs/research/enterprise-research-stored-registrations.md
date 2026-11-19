# Transactional research review registry

Status: development, extending the [encrypted control-state store](enterprise-research-control-store.md).
This is not raw-evidence persistence or a delivery/withdrawal acceptance claim.

Registration validates current metadata eligibility, original research/candidate/
receipt content and every review decision before persisting. The stored binding
uses actual parsed review time and derives canonical contributors from the complete
support closure. Candidate/policy metadata digest covers original candidate and
receipt hashes. No research text, paraphrase or original payload is retained in
the control record.

Active IDs cannot be overwritten with changed review or evidence. Retired IDs are
checked before any source/candidate payload is read. Access-generation changes
retire all active IDs and remove their registrations atomically; identical current
access observations preserve them. An unchanged registration is idempotent.
CAS permits one writer from a given revision. If registration wins a race, a losing
revocation must retry and retire the now-registered ID; a conflict is not a completed
withdrawal. No external artifact/link delivery is implemented here.

Schema 2 adds encrypted retirement IDs and candidate/receipt artifact hashes. Empty schema 1 records normalize in memory
without changing database bytes/revision; the next mutation writes schema 2.
Bounds prevent unbounded metadata accumulation; no history is silently discarded.
ID retention/cleanup and scope migration require a separately governed workflow.

Ten new cases cover reopen/preflight with no raw text retained, idempotency,
atomic retirement through deny/regrant, refusal of changed active IDs, rejected
reviews, registration/revocation contention, unchanged observation preservation
and legacy normalization (some cases cover multiple invariants). Together with the
existing backend tests this produces 24 store cases. These are synthetic local
process tests, not qualified review or customer data trials.

Trusted authority, key management, latest-state integrity, durable rollback
protection, retention/deletion, scoped raw storage and synchronized delivery remain
open. No real participant material or customer report was persisted or delivered.

Independent source review found a pre-acquisition alias gap: renamed candidate
metadata could reference known retired candidate/receipt bytes, which were read
before later schema rejection. Two getter regressions reproduced that read before
the fix. Retirement now preserves both artifact hashes and rejects known retired
bytes under a different candidate ID or research-source descriptor before payload
inspection. This is a private scoped retirement index, not a public hash exception
to retention/withdrawal policy. The reviewer did not run tests or independently
re-review this correction.

The first full suite also exposed a public-boundary guard violation in the prior
synthetic environment-isolation test: its environment assignment used a prohibited
secret-style name. The test now uses a randomly generated value and a neutral
canary name; the production boundary scan is unchanged. No real secret was present.
