# Agent targets

The CLI supports Codex and Claude Code. It validates the requested skill before
delegating installation to the `skills` backend.

| Agent       | Target ID     | Project marker | Skill location                                  |
| ----------- | ------------- | -------------- | ----------------------------------------------- |
| Codex       | `codex`       | `.codex/`      | `.agents/skills/`                               |
| Claude Code | `claude-code` | `.claude/`     | `.claude/skills/` or a link to the shared skill |

Use `--target codex`, `--target claude-code`, or
`--target codex,claude-code`. Project scope installs into the current project;
`--scope global` installs to the host's personal skill location. The installer
keeps existing skills unless an update is explicitly requested.

Bundled skills may include `agents/openai.yaml` for Codex and
`agents/claude-code.yaml` for Claude Code. These files hold host-specific
display metadata; the shared `SKILL.md` and references define the workflow.
