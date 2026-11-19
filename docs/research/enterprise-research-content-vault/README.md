# Experimental research report content vault

The development-only `research-content-store.mjs` adds an encrypted local
single-edition store for research drafts built by the existing acquisition and
projection owner. It accepts a separate scoped `governed-report-content` grant;
the research metadata grant is insufficient. The content-store directory is
bound into the worker scope and encryption AAD; copying a database to another
directory is not an authorized relocation. The trusted host supplies the
grant, current clock, controller choice and keys. These inputs are not
authenticated by this module.

Earlier location-unbound experimental stores fail closed. Relocation or
migration requires a future explicit operation that revalidates permissions and
re-encrypts under the destination identity; no fallback is implemented.

Before source loaders run, the store validates its own authority, checks the
actual research controller and verifies the content/policy scope. The existing
owner performs contributor eligibility, receipt and original-byte checks. The
stored edition contains encrypted customer draft artifacts and private owner
provenance. Separately encrypted metadata binds the controller directory,
scope and revision, permitted candidates, policy, retention, and an effective
review deadline computed from owner-verified receipt expiry, policy expiry and
review maximum age. Content ciphertext AAD binds the authenticated metadata.
No plaintext is sent to the SQLite worker or written as staging files.

Reads check content authority and trusted time, controller revision, retention,
current candidate eligibility and verified review expiry before decrypting the
content. They recheck the controller and content-store revision before
decryption and before returning. A change between separate checks may occur
after decryption; the postcheck discards the result, but does not create a
transaction across the stores. A caller receiving bytes has not been granted
export or delivery authority. Cleanup uses a separate operation and replaces
the encrypted record with a tombstone; it does not claim physical erasure.
Cleanup requires a valid cleanup grant and the content key even after the
content-access grant expires; lost-key cleanup is not implemented.

The metadata-only `inspectResearchContentEdition` uses a separate scoped
`inspect` operation. It reports only `available` or generic `withheld` and
never decrypts content; a stale edition stays withheld after regrant. Available
means metadata-eligible, not that content ciphertext has been authenticated.
Wrong scope, corrupt metadata and concurrent changes throw instead of being
reclassified as withholding. The separate `assemble-read` operation performs
the full content gate and validates exact artifact, controller and item-origin
bindings before returning private provenance to a future owning assembler. It
does not grant storage, disclosure or delivery authority. Content corruption
can pass metadata inspection but must fail assembly authentication.

Independent review ran 23 focused tests for the assembly-access checkpoint.
Final repository verification passed format, lint, typecheck, build and site
checks, with 2,260 tests across 166 files. These checks do not establish a
mixed report or delivery lifecycle.

Independent review reproduced two initial defects: an expired review remained
readable, and a concurrent removal could return cached ciphertext. Both were
fixed with failing regressions. A further regression reproduced substitution of
an older controller copy at a different directory; the authenticated metadata
now pins the original controller directory. A separate copy-to-another-path
test exposed a content location-binding gap; scope/AAD now bind that path and
also reject a copied database with its SQLite scope rewritten. Review confirmed
the final corrections and independently ran 16 focused tests. Tests cover expiry and
removal before content decryption, removal after the pre-decrypt check, review
maximum age, regrant, mismatched grants, concurrent writers, modified ciphertext,
lost post-commit response without retry, loader snapshots and cleanup after
retention expiry.

Final repository verification passed format, lint, typecheck, build and site
checks, with 2,241 tests across 166 files. This includes the final
location-bound store and symlink regression.

This is not production-ready or integrated with V2 historical reports. The
host must authenticate its clock, authority and initial controller selection.
Restoring an older database at the same path, same-UID filesystem attacks,
offline copies, SQLite journals and backups are not protected by the path
binding or logical cleanup. Deletion of already exported files cannot be
claimed. The data stays local and encrypted only under the trusted host's key
and lifecycle. Further work includes complete governed history integration,
source/recipient authorization and delivery controls, storage failure and
recovery hardening, physical retention operations, and enterprise acceptance.
