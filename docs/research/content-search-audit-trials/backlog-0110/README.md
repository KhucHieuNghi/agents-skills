# Unified backlog assignment regression — 0.1.10

The campaign renderer dropped local finding owner/effort fields although the
standalone renderer retained them. Candidate 0.1.10 preserves these fields in
unified HTML, Markdown and CSV. Global findings may optionally supply nonempty
ownerRole/effort strings; legacy omissions render as `Not supplied`. Supplied null,
empty or non-string values are rejected. The fields do not authorize execution
or prove remediation complete. CSV consumers should use named columns.

Three focused assertions failed before the fix: global assignment columns absent,
local assignment text lost through the installed CLI path, and malformed global
assignment accepted. The updated suite passes all 11 campaign review tests,
including HTML/CSV escaping, legacy omissions and manifest hash checks. The full
root suite passes 58 files / 417 tests plus format/lint/typecheck/build/diff.

The frozen archive was extracted and freshly installed for Codex, Claude Code and
combined. Each installed helper collected a simulated HTTP 404 using an injected
in-process test transport; no live network request was made. Installed CLI commands
indexed the campaign, admitted an unresolved global review and rendered all three
output formats. Each preserves the exact local owner/effort and reports partial
coverage. All report manifest hashes match. This is executable package/CLI evidence,
not a new native model session or semantic acceptance result.

See [installation receipt](../../content-search-audit-backlog-installation-snapshot.json).
`artifacts.tgz` retains the exact source, index, review and report directories for
all three installations. `archive-validation.json` records byte-for-byte extraction
comparison; historical absolute paths remain in the artifacts. Old frozen archives
are unchanged. Separate semantic reporting defects from the 0.1.9 native trial remain
open and are not claimed fixed by this renderer correction.
