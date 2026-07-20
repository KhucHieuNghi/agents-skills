# Getting Started

## Prerequisites

Use Node.js 20 or later. Install Git if you plan to pull a Git-backed private
source.

## Validate before applying

From this repository, install dependencies and validate the external source:

```bash
npm install
npm run dev -- validate --source /path/to/private-skills
```

Apply a validated skill to one or more project targets:

```bash
npm run dev -- apply release-check --source /path/to/private-skills --target opencode,codex,claude-code,eve --scope project
```

The source path is a placeholder. Keep private locations and credentials out
of shell history, issue reports, and committed files.

## Next steps

Use `agent-skills catalog --source <path-or-git-url>` to inspect packages and
`agent-skills doctor` to inspect local prerequisites and target directories.
