# Enterprise history V2: structural contract checkpoint

The development-only `validateEnterpriseHistoryV2` checks a proposed V2
customer envelope containing a separately validated V1 current report and
source-scoped historical findings, actions, observations, narrative and review
decisions. Current counts and review status belong only to the current report.
Historical dispositions describe report transitions; they do not claim a fix.

The validator bounds source and entry populations and serialized bytes,
requires ordered declared source references and chronology consistency. Entry
identity is scoped to source and type; review targets
use separate type and identifier. Action references resolve within the same
historical source and action cycles fail. A single fixed withheld status allows
no item identifiers, hashes, reasons, counts or custom wording inside it.
Opaque source references and revision/time metadata still need disclosure
review. Historical item contents currently retain evidence IDs and review
target digests; they are not approved customer fields merely because the source
inventory omits run digests. Restricted-only sources may need to be omitted.

Independent review reproduced a source with the same run digest and a different
assessment time. The first prototype bound both values, but further review found
that exposing source run digests in customer history could disclose sensitive
commitments. The customer structure now rejects those private bindings. A future
private provenance owner must bind exact report/run digests and clocks and verify
predecessors before storage; the source list here is only a declared inventory.
Tests exercise repeated IDs across revisions, rejected private source fields,
action cycles, observation value forms, review timing and generic withholding.
The final independent review found no further structural blocker within this
limited scope and reran 17 focused tests. Repository verification passed
format, lint, typecheck, build, site checks and 2,220 tests across 165 files.

This is structural validation only: declared completeness is not verified,
source references, customer/run identity and historical content are not authenticated, and check
review targets are not resolved to an original source check. It grants no
access, retention, disclosure or delivery authority. The implementation has no
customer rendering, storage, installed CLI or release path. In particular, it
must not replace the V1 stored-revision guard or be used as proof that
withdrawal or deletion is enforced. Bounded source content and reviewer prose
still require provenance and current authorization before reading or retaining.

Next steps remain private exact-report predecessor and run/clock bindings,
owner-backed complete chain reconstruction and content verification, authority
preflight before historical content reads, governed
withdrawal/retention lifecycle, schema/renderer/manifest dispatch with frozen
V1 compatibility, public exclusion and realistic browser tests. This checkpoint
does not complete enterprise acceptance and changes no bundled skill release.
