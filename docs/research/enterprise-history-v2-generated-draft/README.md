# Private generated V2 history draft

`buildStoredGeneratedV2Draft` creates an in-memory V2 envelope from a complete
root-first chain of previously stored generated reports. The existing owner
replays each run and report, verifies every source and report/manifest binding,
and rechecks the chain before returning. It reconstructs a separate standalone
current report from the final run; this is not byte-identical to the original
parent-bound final report. Private provenance binds both report digests, the V2
envelope, each source run/report and predecessor, compiler identity, and the
owner-derived item/evidence and review-target bindings. No caller-supplied item
origin is accepted.

Each prior generated item appears in its original source scope. Its disposition
describes that report's transition to its immediate successor. A removed item
can reappear later; neither removal nor changed policy proves remediation.
Curated actions, review prose and unsupported source evidence are rejected by
the original generated-owner replay. A structurally valid envelope does not
authorize release, and no withheld status is fabricated for unsupported items.

Independent review found no material issue within the private generated-only
boundary and reran 49 focused tests. Tests include an actual technical SEO
failed finding, policy change removing it, then reappearance in a third
revision; exact all-item and origin comparison; independent standalone replay;
stale and changed artifacts; broken ancestry; curated prose; and input snapshot
behavior.

Repository verification passed format, lint, typecheck, build, site checks and
2,225 tests across 165 files.

All report reads are **already-authorized local reads**. Generated/replayable
does not mean research-free or permitted for redisclosure. This function writes
no report and returns persistence, disclosure and delivery authorization as
false. Its optimistic rechecks do not lock files through delivery or establish
that a supplied chain is the latest. Source references, timestamps, item IDs,
evidence IDs and other content remain subject to disclosure policy.

The remaining work includes preflight before governed text reads, governed and
curated provenance, retention and withdrawal operations, safe V2 presentation
and manifest dispatch, full installed-host flows and enterprise acceptance.
No bundled release or deployment changes in this checkpoint.
