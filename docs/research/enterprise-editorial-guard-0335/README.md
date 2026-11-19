# Candidate 0.3.35 — stored V1 revision loss guard

The stored V1 revision command previously accepted removal of all parent
findings and actions. A new regression first reproduced successful creation of
that lossy child. The command now snapshots caller inputs before parent loading,
builds and validates the new report, and refuses to save if any parent finding,
action, narrative or review decision is absent or changed. Exact retained items
and additions remain supported. The fixed error does not echo historical text.

This is a deliberate temporary restriction. A successful measurement retest
retains the old failed check in the underlying assessment history, but the V1
stored command now refuses the revision if the former finding disappears. V1
cannot represent that finding as historical; retaining it as current would be
misleading. A correction, re-review or withdrawal may likewise be blocked.
Never copy stale or withdrawn content to bypass the guard.

Independent AI review confirmed the guard's command boundary and requested
guard-specific assertions for each editorial collection. Tests cover removals,
changes, exact retention with additions, no output on failure, and caller input
mutation while the parent is loading. The extracted candidate archive was
installed into fresh Codex and Claude Code projects: each installed script
rejected a removed finding and accepted an unchanged one. These are script
checks, not native host-agent trials.

Final repository verification passed formatting, lint, typecheck, build,
site typecheck and site tests; 165 test files and 2,219 tests passed. The
independent reviewer separately reran 48 focused tests after the final change.

Component digest: `10c9a87b15b4ff37d4d96edb24c31e092285a9dac2779747ff57b5247200910a`.
Release digest: `b465023496f569f104810aa1944af43af88f3fd24410c9c05e3b55d546b5de00`.
Archive SHA-256: `ee10da53d6a3d1999d94845a8902b5811a5e2fa9e29c4c6cee364fc887658f4d`.

This guard is not canonical editorial history, a disclosure permission check,
or withdrawal/deletion. It reads the existing parent before checking and does
not cover direct builder/save calls or standalone reports. The V2 history and
governed lifecycle remain necessary. This candidate is not enterprise release
acceptance or a deployment.
