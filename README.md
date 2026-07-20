# Agent Skills CLI

## Purpose

Agent Skills CLI discovers, validates, and applies public Agent Skills. This
repository includes a checked-in `catalog.yaml`: a curated menu of public
upstream packages and the skills bundled in this repository. It supports
canonical packages with a `SKILL.md` file and optional `references/`,
`scripts/`, and `assets/` directories.

## Source model

Each catalog entry uses either a repository-local path or a public canonical
Git URL. Git checkouts are staged in a user-local cache outside this
repository. [skills.sh](https://skills.sh/) can help discover skills, but the
catalog records the source Git URL that the CLI will actually validate and
install.

## Prerequisites

- Node.js 20 or later
- Git for Git-backed sources
- Network access for Git-backed public sources

## Quick start

Install dependencies, then run the CLI from this checkout:

```bash
npm install
npm run dev -- recommend --intent landing-page
npm run dev -- apply-profile hallmark-landing --target codex --scope project
```

## Commands

- `agent-skills catalog --source <path-or-git-url>` lists canonical packages.
- `agent-skills pull <path-or-git-url>` stages a source in the user cache.
- `agent-skills validate [skill] --source <path>` checks package shape,
  metadata, and basic secret-pattern safeguards.
- `agent-skills apply <skill> --source <path> --target <targets> --scope project`
  validates then installs selected packages.
- `agent-skills recommend --intent <intent>` resolves a public profile choice
  table with suitability guidance, without staging or installing anything. Add
  `--json` for machine-readable output.
- `agent-skills apply-profile <profile> --target <targets>` validates every
  skill in a public profile before applying them in order.
- `agent-skills doctor` reports local prerequisites and detected target paths.

## Supported targets

OpenCode, Codex, and Claude Code use the `skills` install backend. Eve uses a
small local adapter that writes a canonical package under `agent/skills/`.
Existing target skills are never overwritten implicitly.

## Security behavior

Validation checks required frontmatter, lowercase hyphenated package names,
directory/name agreement, and high-confidence secret assignments. It treats
package files as data and never executes package scripts during validation.

## Public skill profiles

The root [`catalog.yaml`](catalog.yaml) is the default catalog when commands
run from this repository. It contains generic public sources only. A profile
can combine a design-system skill with one optional style or accessibility
skill; list the design-system skill first so it remains the primary visual
authority. Use `--catalog <file>` only to test another public catalog.

```yaml
version: 1
sources:
  public-design:
    reference: https://github.com/example/public-design-skills.git
skills:
  design-system:
    source: public-design
    tags: [style, brand]
    summary: Preserves the internal component and token system.
    suitableFor: [product-ui]
    notSuitableFor: [brand-exploration]
  style-review:
    source: public-design
    tags: [style, audit]
    summary: Reviews a visual experience before implementation.
    suitableFor: [landing-page, redesign]
    notSuitableFor: [data-dashboard]
profiles:
  product-ui:
    intents: [landing-page, redesign]
    skills: [design-system, style-review]
    summary: Builds a branded public product page.
    suitableFor: [landing-page, redesign]
    notSuitableFor: [data-dashboard]
    designMd:
      slug: design-reference
      summary: Establishes the chosen visual language before UI work.
```

Show the user all suitable profile choices before applying one:

```bash
agent-skills recommend --intent landing-page
agent-skills apply-profile product-ui --target codex --scope project
```

An intent can map to one or more profiles. `recommend` presents those choices
with their summaries, intended use, exclusions, and included skills; the user
then chooses the explicit `<profile>` passed to `apply-profile`. Every profile
and skill must state a non-empty `summary`, plus optional `suitableFor` and
`notSuitableFor` lists. Profiles fail before installation if they contain
undefined skills or declared conflicts. `apply-profile` stages and validates
every selected package before the first target installer is called.

### Optional DESIGN.md foundation

Profiles can include a `designMd` reference. `recommend` then shows the user a
manual `npx getdesign@latest add <slug>` preflight command before they choose a
style profile. This creates a root `DESIGN.md` that defines the visual language
for future UI work. The CLI never runs that command or overwrites `DESIGN.md`;
the user must choose and review the foundation first. Use an internal design
system where one exists, and treat public references as inspiration rather than
as a copied brand identity.

## Development

Run the local quality checks before contributing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

See the [getting started guide](docs/guides/getting-started.md),
[source guide](docs/guides/private-sources.md), and
[target guide](docs/guides/agent-targets.md).

## License

This project is available under the [MIT License](LICENSE).
