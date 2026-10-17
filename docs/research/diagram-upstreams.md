# Diagram upstream review

Reviewed on 2026-10-17 for the Codex and Claude Code catalog. The records in
[`catalog.yaml`](../../catalog.yaml) pin the complete Git commits and SHA-256
skill-tree digests below. Both are discovery candidates; neither belongs to a
released Solution Skill.

| Upstream       | Pinned source and skill folder                                                                                                                                                                                                        | License and attribution             | Fit                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Archify        | [`88d1ae4`](https://github.com/tt-a1i/archify/tree/88d1ae4498b6a1df610badf690c5406882622d15/archify), `archify/`, digest `83d9aa8d34780afd71de561398fe4d54ae7c5c0831da2369b9883d13f9d4b4ad`                                           | MIT; tt-a1i (Archify) and Cocoon AI | Interactive, validated architecture, workflow, sequence, data, and related diagrams from typed JSON. |
| Diagram Design | [`550fd66`](https://github.com/cathrynlavery/diagram-design/tree/550fd66edff058bc73056c3416b76d69cfe865ba/skills/diagram-design), `skills/diagram-design/`, digest `70ed7ab8bcace86ae0f754da986a240ec9d5a6f826fe8e7df1d3310b218a0794` | MIT; Cathryn Lavery                 | Branded, editorial HTML/SVG diagrams across many visual types.                                       |

The repository MIT files were inspected at each commit. Both skill folders
have valid frontmatter and passed the local `validate` command. The current
`check-upstreams --fail-on-update` verified both pinned digests against Git and
found no changed skill content at remote HEAD at review time.

## Integration observations

- Archify's normal `finalize` path includes a Chrome browser check, so a future
  customer-facing combo must account for Chrome availability. Its skill also
  has an optional network update reminder; `ARCHIFY_UPDATE_CHECK_DISABLED=1`
  disables it. Keep our own pinned-update process authoritative for releases.
- Diagram Design's default HTML templates request Google Fonts when opened.
  Its `system` font mode and offline self-check are relevant for an offline
  product. Brand onboarding can read a user-supplied website; this needs a
  separate customer workflow decision.
- Both packages contain scripts and assets beyond `SKILL.md`. A future combo
  must copy and validate the complete skill folder, preserve license and other
  applicable notices, test the output on Codex and Claude Code, and publish a
  new Solution Skill version. Catalog inclusion alone does not establish
  commercial readiness or diagram quality.
