# Eraser diagrams skill

The [skill instructions](SKILL.md) describe how to turn a request, code, or infrastructure files into Eraser DSL and render it through the Eraser API. Rendering requires `ERASER_API_TOKEN`; the [render script](scripts/render.py) builds the current API request. Syntax, examples, styling, and icon references are in [`references/`](references/).

This folder is the canonical copy for Codex. Claude Code loads the same folder through `.claude/skills/eraser-diagrams` at the repository root. Edit this folder once; verify that the Claude Code link still resolves after moving or copying the skill.

Its historical source commit is unknown, so this local copy is not part of a
commercial Solution Skill release. See the [provenance note](../../../docs/research/eraser-diagrams-local.md)
and copied [MIT notice](../../../docs/licenses/eraser-diagrams-MIT.txt).

For installation and invocation, use the repository's [Codex](../../../docs/guides/codex.md) or [Claude Code](../../../docs/guides/claude-code.md) guide.
