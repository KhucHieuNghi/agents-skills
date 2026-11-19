# Encrypted transactional research control state

Status: development-only local backend. Stores access state; review registrations
remain empty and raw research/customer artifacts are unsupported. No production
or customer data was written in these tests.

## Method and implementation

Node AES-256-GCM encrypts control metadata with a random 12-byte nonce and binds
scope/storage revision as authenticated additional data. The caller manages the
32-byte key; the Python worker never receives key/plaintext payloads or inherited
caller environment secrets. The separate current storage grant binds scope, final
and staging location, artifact class and expiry/freshness. Trusted caller time,
authority and key management remain external inputs.

SQLite performs revision comparison and replacement inside BEGIN IMMEDIATE, with
FULL synchronization and DELETE journal mode. Opening authenticates ciphertext
before state use. Updating uses the existing access reducer, preserving denial /
regrant generations. A revision race fails instead of overwriting the winner.
The local metadata table stores ciphertext, scope digest and storage revision.
Those metadata and file sizes/timings are not claimed anonymous.

Creation fully initializes a private sibling database, closes the committed
connection, syncs the staging directory, then publishes with an exclusive rename
and syncs the parent. Existing destinations, including empty directories, cannot
be replaced. Darwin uses renamex_np(RENAME_EXCL); Linux uses
renameat2(RENAME_NOREPLACE). Only Darwin was runtime-tested. A hard crash before
publication may leave encrypted orphan staging; retries do not require deleting
arbitrary target paths. Physical secure deletion, power-loss certification and
filesystem rollback resistance are not claimed.

Primary documentation consulted 2026-11-19:

- [SQLite transactions](https://www.sqlite.org/lang_transaction.html): write transaction and contention semantics.
- [SQLite pragmas](https://www.sqlite.org/pragma.html): synchronization/journal and deletion limitations.
- [Node crypto](https://nodejs.org/api/crypto.html): authenticated cipher and AAD interfaces.
- [Apple exclusive renaming](https://developer.apple.com/documentation/foundation/urlresourcevalues/volumesupportsexclusiverenaming): no-replace publication capability. RENAME_EXCL=0x4 was also checked against the installed SDK sys/stdio.h.
- [Linux rename manual](https://man7.org/linux/man-pages/man2/rename.2.html): RENAME_NOREPLACE and unsupported-filesystem behavior.

## Independent review and correction

Independent source review found two material issues in the first implementation:
subprocess environment inheritance could expose a caller's environment-based key,
and creation could leave an unusable final directory after interrupted SQLite
initialization. Corrections use explicit minimal environment plus Python isolated
mode, and private staging with exclusive atomic publication. No external secrets
were used to reproduce these issues; tests use generated keys and synthetic data.

## Evidence and remaining work

Fourteen Node cases exercise reopen and private modes, ciphertext/no-key disk
checks, concurrent updates, persisted revoke/regrant, wrong keys and corruption,
revision AAD, denied/expired/wrong-scope/wrong-directory grants, existing target,
weak modes/symlink, killed uncommitted writer, no inherited secret environment and
concurrent initialization. Three Python tests kill a process before publication and
verify a successful retry, verify publication cannot replace an existing empty
directory, and inject parent sync failure after publication to confirm uncertain
commit reporting while the committed store remains readable. These are bounded local-process tests; no Windows or Linux runtime
acceptance is implied.

Still required: registration/history persistence and its invalidation semantics;
raw-evidence retention with scoped authority; key lifecycle/backups; owner-scoped
orphan recovery; withdrawal/deletion receipts and failures; atomic delivery/revocation
integration; real host/customer evaluation and commercial gates. A valid stored
state can still be stale or rolled back by a caller controlling the store. No
claim of distributed transactions, secure erasure or general enterprise readiness.

Source rereview confirmed the original environment and initialization corrections,
then identified a post-publication parent-sync failure path. Publication is now
recorded before parent sync; cleanup cannot remove the final target, and failures
report an uncertain commit requiring read-before-retry. The author tested this
correction with fault injection. Reviewer source inspection is not an independent
runtime test or acceptance of all storage/delivery requirements.

Repository verification: full suite passed 147 files / 1,847 tests; format,
typecheck, build and both site checks passed. Three Python fault-injection tests
passed separately. Initial lint required explicit URL/timer imports in the new
module; after those import-only corrections, lint and all 14 store tests passed
again. The full suite preceded those import-only corrections. No archive or
installed skill component changed.
