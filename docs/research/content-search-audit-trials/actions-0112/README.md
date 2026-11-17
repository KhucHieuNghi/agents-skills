# Action proposal parity — candidate 0.1.12

Standalone and campaign reports now share action proposal validation and rendering.
Optional finding fields `action` and `actionReason` must be supplied together.
Actions are keep/update/consolidate/investigate; reason must be nonempty. Unsupported,
missing and orphaned values are rejected. Finding JSON schema declares the paired
fields. Global review uses the same runtime contract.

HTML/Markdown/CSV preserve action, origin and reason. An explicit value is labelled
reviewer-proposal. Legacy observed local findings default to update; inferred local
and unclassified global findings default to investigate, labelled default-triage.
The helper never infers keep/consolidate or grants implementation approval. Inventory
identities, checks, evidence and completion are unaffected by choosing an action.

Four regression assertions failed before implementation. Tests now cover all four
explicit standalone actions, local/global campaign columns, invalid paired fields,
escaping and legacy defaults. A Markdown-escaping assertion was corrected to compare
decoded text; production escaping was retained. Full suite: 58 files / 419 tests;
format/lint/typecheck/build/diff pass.

The archive was extracted and installed fresh for Codex, Claude Code and combined.
An in-process synthetic HTTP transport created a real standalone source run in each
installation without live network. Installed review CLI generated four new immutable
revisions, one per action. Each retained the original inventory/check/evidence data,
remained partial and rendered the action/origin in all formats. Historical campaign
replay verified the labelled update default and every manifest hash.

[Installation receipt](../../content-search-audit-actions-installation-snapshot.json)
records identities and outputs. `artifacts.tgz` preserves exact source runs, review
bundles/revisions and campaign reports; `archive-validation.json` verifies every
extracted file byte for byte. Historical absolute evidence links remain in reports.
This is installed CLI verification, not a new native model semantic trial. Earlier
native prose defects and independent human release acceptance remain unresolved.
