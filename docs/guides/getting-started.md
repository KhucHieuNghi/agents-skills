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

## Apply a private profile

Use a local YAML catalog to associate internal intents with an ordered set of
skills. Keep this catalog outside the public repository.

```yaml
version: 1
sources:
  design:
    reference: /path/to/private-design-skills
skills:
  design-system:
    source: design
    tags: [style, brand]
profiles:
  product-ui:
    intents: [landing-page]
    skills: [design-system]
```

Preview the profile without reading its source, then apply it only after the
selection looks right:

```bash
npm run dev -- recommend --catalog /path/to/private-catalog.yaml --intent landing-page
npm run dev -- apply-profile product-ui --catalog /path/to/private-catalog.yaml --target codex --scope project
```

The catalog requires lowercase hyphenated names. Each intent must map to one
profile. Applying a profile validates every selected skill before it installs
the first one.

## Next steps

Use `agent-skills catalog --source <path-or-git-url>` to inspect packages and
`agent-skills doctor` to inspect local prerequisites and target directories.
