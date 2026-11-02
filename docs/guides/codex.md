# Codex guide

Codex uses the repository's [`AGENTS.md`](../../AGENTS.md) as project instructions. Custom agent definitions live in `.codex/agents/` as TOML files; local authoring skills live in `.agents/skills/`. Start Codex from this repository to make these project tools available.

## Included roles

- `codebase_analyst`: read-only tracing with file evidence.
- `implementation_specialist`: scoped implementation and focused verification.

These definitions do not set `model`. Codex resolves it from the explicit delegation, any `[agents]` default, and then the parent session. Ask Codex to use a role only when delegation helps the task; normal Codex work does not require one.

Example request:

> Have `codebase_analyst` trace how the Eraser skill is discovered and report the relevant files.

## Skills

Codex discovers repository skills in `.agents/skills/`. Ask for a diagram, or explicitly mention `$eraser-diagrams` in Codex CLI or the IDE extension. The skill contains the Eraser DSL workflow and references. Rendering calls Eraser's external API and requires `ERASER_API_TOKEN` in the environment. Its [historical source pin is unknown](../research/eraser-diagrams-local.md), so it is a local authoring tool rather than a released Solution Skill component.

For a customer project, use the versioned [Solution Skill install procedure](technical-v1.md). That installer places the released `codebase-onboarding-c4` entrypoint in the target project's `.agents/skills/`; invoke it as `$codebase-onboarding-c4` after checking its prerequisites.

To reuse the material in another repository, copy `.codex/agents/` and the desired skill folders under that repository's `.agents/skills/`. For personal use across repositories, Codex also supports `~/.codex/agents/` for custom agents and `~/.agents/skills/` for skills.

See the official [Codex custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [Codex skills](https://learn.chatgpt.com/docs/build-skills) documentation for current behavior.
