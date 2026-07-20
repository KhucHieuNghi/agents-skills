# Agent Skills CLI

## Purpose

Agent Skills CLI validates and applies privately hosted Agent Skills without
adding their source to this public repository. It supports canonical packages
with a `SKILL.md` file and optional `references/`, `scripts/`, and `assets/`
directories.

## Privacy model

Private sources are supplied only at runtime as a local path or Git URL. Git
checkouts are staged in a user-local cache outside this repository. The CLI
redacts credentials from surfaced errors and does not upload skill content.

## Prerequisites

- Node.js 20 or later
- Git for Git-backed sources
- Access to the private source you supply

## Quick start

Install dependencies, then run the CLI from this checkout:

```bash
npm install
npm run dev -- validate --source /path/to/private-skills
npm run dev -- apply release-check --source /path/to/private-skills --target opencode,codex,claude-code,eve --scope project
```

## Commands

- `agent-skills catalog --source <path-or-git-url>` lists canonical packages.
- `agent-skills pull <path-or-git-url>` stages a source in the user cache.
- `agent-skills validate [skill] --source <path>` checks package shape,
  metadata, and basic secret-pattern safeguards.
- `agent-skills apply <skill> --source <path> --target <targets> --scope project`
  validates then installs selected packages.
- `agent-skills doctor` reports local prerequisites and detected target paths.

## Supported targets

OpenCode, Codex, and Claude Code use the `skills` install backend. Eve uses a
small local adapter that writes a canonical package under `agent/skills/`.
Existing target skills are never overwritten implicitly.

## Security behavior

Validation checks required frontmatter, lowercase hyphenated package names,
directory/name agreement, and high-confidence secret assignments. It treats
package files as data and never executes package scripts during validation.

## Development

Run the local quality checks before contributing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

See the [getting started guide](docs/guides/getting-started.md),
[private sources guide](docs/guides/private-sources.md), and
[target guide](docs/guides/agent-targets.md).

## License

This project is available under the [MIT License](LICENSE).
