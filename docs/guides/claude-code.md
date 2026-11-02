# Claude Code guide

Claude Code reads [`CLAUDE.md`](../../CLAUDE.md), which imports the shared [`AGENTS.md`](../../AGENTS.md). Project subagents live in `.claude/agents/`; project skills live in `.claude/skills/`.

## Included roles

- `codebase-analyst`: read-only tracing with file evidence.
- `implementation-specialist`: scoped implementation and focused verification.

Both use `model: inherit`, so they follow the model selected for the main Claude Code session. Ask Claude to delegate to a role when that focused context is useful.

Example request:

> Use the `codebase-analyst` subagent to trace how the Eraser skill is discovered and report the relevant files.

## Skills

`.claude/skills/eraser-diagrams` is a relative link to the canonical folder in `.agents/skills/`. Claude Code can load project skills from this directory. Ask for a diagram or invoke `/eraser-diagrams` explicitly. Rendering calls Eraser's external API and requires `ERASER_API_TOKEN` in the environment. Its [historical source pin is unknown](../research/eraser-diagrams-local.md), so it is a local authoring tool rather than a released Solution Skill component.

For a customer project, use the versioned [Solution Skill install procedure](technical-v1.md). That installer links the released `codebase-onboarding-c4` entrypoint into the target project's `.claude/skills/`; invoke it as `/codebase-onboarding-c4` after checking its prerequisites.

To reuse the material in another repository, copy `.claude/agents/` and the desired skill folders into that repository's `.claude/skills/`. Copy the actual skill folder when the target repository does not contain the linked `.agents/skills/` folder. For personal use, Claude Code supports `~/.claude/agents/` and `~/.claude/skills/`.

See the official [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), and [project instructions](https://code.claude.com/docs/en/memory) documentation for current behavior.
