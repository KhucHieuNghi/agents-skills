# Skill format in this repository

A skill may stand alone or serve as a component of a versioned combo. The [product model](product-model.md) describes how to record public skill sources and release a combo.

A skill is a directory containing `SKILL.md` with YAML frontmatter (`name` and `description`) and task instructions. Optional `references/` hold details needed only for particular requests. The existing [`eraser-diagrams`](../.agents/skills/eraser-diagrams/SKILL.md) skill also includes examples and icon references.

Local authoring skills live in `.agents/skills/<name>/`, where Codex discovers
repository skills. A relative link in `.claude/skills/<name>` lets Claude Code
load the same folder. Bundled Solution Skill components live in `skills/` and
are installed into each target project by the release CLI. Keep skill names
unique and make descriptions say when the workflow should run.

When updating a skill:

1. Edit the owning folder in `.agents/skills/` or `skills/`.
2. Check that the `.claude/skills/` link resolves to it.
3. Validate the frontmatter and links to references, then exercise a realistic request when the behavior changed.
4. Update both host guides if installation or invocation changes.

The supported hosts are [Codex](guides/codex.md) and [Claude Code](guides/claude-code.md). Host-specific agent definitions belong in their respective `.codex/agents/` and `.claude/agents/` directories.
