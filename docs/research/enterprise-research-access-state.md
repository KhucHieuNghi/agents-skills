# Research access generations

Status: development prerequisite, not a persistent vault or production delivery
control. No real research material is stored by this module.

The pure reducer retains private scope, generation, access snapshot/policy digest,
observation/change times and parent digest. A supplied previous-state digest detects
conflicting updates in the calculation; a trusted transactional store is still
required to enforce this across writers. Changed snapshots increment generation,
including denial followed by regrant. Existing artifact bindings do not revive.
A fresh review must not predate the current generation. Changes require strictly
increasing observation times; a same-time change regression failed before this
requirement was added.

Bindings retain the declared complete canonical contributor closure and its current
analysis/sharing expiry. The entire study's access digest still drives invalidation;
expiry of unrelated denied participants does not block authorized-subset reissue.
Private IDs/digests/bindings must not enter customer reports or public logs.

## Independent review and correction

`enterprise_contract_review` reproduced a material design error in the initial
implementation: computing one deadline across all participants made withdrawn p2
block a fresh p1-only artifact. The correction separates snapshot generation from
artifact-specific contributor expiry. Regression covers keeping p2 in the full
manifest, permitting p1-only binding, and rejecting p1+p2 binding. This correction
was author-tested, not independently re-reviewed.

The reviewer also required trusted latest-state storage, generation-preserving
ancestry, atomic delivery/revocation checks and binding both candidate and receipt.
These are explicit integration requirements, not completed by the pure functions.
The caller must derive the complete support closure and verify the bound review
time against the actual receipt. Caller-supplied timestamps and contributor lists
alone do not prove those conditions.

Twelve focused tests cover binding, unchanged refresh, denial/regrant, stale writer
hash, scope/time rollback, expiry, freshness policy changes, wrong artifact/current
snapshot, denied contributors, extra fields/creation ancestry, same-time changes
and authorized-subset reissue. These are synthetic reducer tests. They do not prove
storage atomicity, delivery recovery, deletion, authentication or complete access
history. The APIs are not yet wired into the customer projection/delivery path.
