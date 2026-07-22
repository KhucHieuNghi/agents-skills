# Agent Targets

## OpenCode, Codex, and Claude Code

For these targets, the CLI delegates installation to the established `skills`
backend after validation. Use project scope to keep the requested installation
within the current project.

Use these target IDs:

- `opencode`
- `codex`
- `claude-code`

Install to all three with `--target codex,claude-code,opencode`.

## Eve

Eve receives a direct local adapter. Project-scoped packages are copied to
`agent/skills/<skill-name>/`. Existing packages cause a conflict; the CLI does
not overwrite them.

## Choosing targets

Pass a comma-separated list with `--target`. Each selected target is validated
before installation. If any package fails validation or an existing skill
conflicts, resolve that condition before retrying.
