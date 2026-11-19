# Offline research customer draft

Status: development-only; not bundled in candidate 0.3.24 or commercially accepted.

`projectResearchDisclosure` implements exact evidence/content/review validation
and an allowlisted customer model under the
[disclosure contract](../plans/website-audit-enterprise-research-disclosure.md).
Useful reviewed paraphrases retain task context, limitation, recommendation and
retest; private record identities and exact support remain separate. The function
performs no acquisition, filesystem writes or delivery. Original research payloads
are supplied only after authorized preflight; candidate/receipt text is rejected
before access if candidate metadata is ineligible.

## Verification scope

23 focused synthetic cases cover useful output and private traceability, random
edition-local references, all five text fields invalidating prior review, rejection
of each review dimension, all-payload identity gating before getters, revocation,
changed exact support before reading candidate text, review expiry/age/source
chronology/access horizon/policy/recipient, hash mismatch, duplicate JSON keys,
invalid Unicode, extra fields and missing candidate content. Canary checks cover
the customer JSON model and rejected candidate text; they are not semantic
anonymization or a qualified research evaluation.

Independent reviewer `enterprise_contract_review` inspected the implementation
and found no material defect within this offline draft boundary. It checked access
before content, fresh original research evaluation, exact support and review
bindings, access/freshness horizons and allowlisted customer output. It performed
no test run or runtime reproduction. Its two explicit limitations remain: accepted
paraphrases rely on qualified disclosure judgment, and a current access snapshot
cannot prove historical withdrawal handling. Both remain documented and are not
claimed as implemented controls.

## Remaining requirements

- Canonical customer JSON persistence and deterministic Markdown/HTML derivation
  from that same model, with browser/escaping/privacy verification.
- Qualified review on authorized real evidence; multi-profile realistic trials.
- Separate storage authority, access-generation invalidation, withdrawal-compatible
  history, controlled staging/delivery and deletion failure recovery.
- Integration, packaging, native host evaluation and enterprise commercial gates.

The full response contains a private decision object. Only `customerDraft` is the
allowlisted customer model; do not publish the enclosing response. Neither a
receipt's declared human/AI identity nor a valid digest authenticates the author,
permission or meaning. No source content has been acquired from real participants
in this checkpoint, no website changed, and no deployment performed.

Repository verification: full suite passed 143 files / 1,799 tests; format,
typecheck, build, site typecheck and site tests passed. Initial lint reported an
unqualified `structuredClone` global in the new module. After qualifying it with
`globalThis` to match repository conventions, root lint, focused formatting and
all 77 research tests passed. The full suite was run before that qualification;
no behavioral change is claimed from the lint fix. `git diff --check` passed.
