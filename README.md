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
npm run dev -- apply-profile hallmark-landing --target codex,claude-code,opencode --scope project

# For a large unfamiliar repository
npm run dev -- recommend --intent codebase-onboarding
npm run dev -- apply-profile codebase-onboarding --target codex,claude-code,opencode --scope project
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

Use target IDs `codex`, `claude-code`, and `opencode` individually or together
as a comma-separated list, for example
`--target codex,claude-code,opencode`.

| Agent       | Target ID     | Install backend               | Project marker  |
| ----------- | ------------- | ----------------------------- | --------------- |
| Codex       | `codex`       | `npx --yes skills add`        | `.codex/`       |
| Claude Code | `claude-code` | `npx --yes skills add`        | `.claude/`      |
| OpenCode    | `opencode`    | `npx --yes skills add`        | `.opencode/`    |
| Eve         | `eve`         | local `agent/skills/` adapter | `agent/skills/` |

Bundled packages include agent manifests for Codex/OpenAI, Claude Code, and
OpenCode where the package exposes agent-specific metadata. To install a profile
for one agent, pass a single target:

```bash
npm run dev -- apply-profile documentation --target claude-code --scope project
```

To install the same profile for all three `skills` backend agents, pass all
targets:

```bash
npm run dev -- apply-profile documentation --target codex,claude-code,opencode --scope project
```

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

| Profile                                                         | Use it for                                                                                                                                         | Do not use it for                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `documentation`                                                 | Light-only engineering documentation, runbooks, and onboarding with constrained Hallmark polish.                                                   | Product UI or visual exploration.      |
| `hallmark-landing`                                              | Public landing pages, redesigns, and design audits.                                                                                                | Dense dashboards or workflow-heavy UI. |
| [`codebase-onboarding`](skills/codebase-onboarding-c4/SKILL.md) | Mapping a large unfamiliar system into Product/Business and C4 technical onboarding. Requires CodeGraph, RTK, and a valid CodeGraph project index. | A single-file change or quick fix.     |

The onboarding profile creates source-evidence documentation; it labels product
and business conclusions as inferred or needing confirmation when no approved
product material exists.

### Codebase onboarding guide

Use the [codebase onboarding integration guide](docs/codebase-onboarding-integration.html)
to understand the Product/Business, Technical C4, and Operability model; the
guided journey; execution routing; external-access policy; and local artifact
layout.

For copyable installation commands, prerequisite checks, invocation prompts,
MCP/database approval, readiness, resume, examples, and troubleshooting, follow
the [real-project usage runbook](skills/codebase-onboarding-c4/references/real-project-usage.md).

The checked-in profile installs `codebase-onboarding-c4`, `html-docs-standard`,
and `hallmark`. The onboarding skill provides a journey-first adaptive
coordinator, Quick/Standard/Deep depth, complete C1/C2 with journey-selective
C3, evidence and quality gates, local Markdown and HTML output, a constrained
Hallmark polish pass, and resumable `.onboarding/` YAML state. It starts inline
and only delegates independent bounded read-only investigations.

The package contracts are:

- [Product and Business Journey](skills/codebase-onboarding-c4/references/product-business-journey.md)
- [Technical C4 and Engineering Navigation](skills/codebase-onboarding-c4/references/technical-c4-navigation.md)
- [Evidence and Output](skills/codebase-onboarding-c4/references/evidence-and-output-contract.md)
- [Adaptive Coordinator](skills/codebase-onboarding-c4/references/adaptive-coordinator.md)
- [Local Workspace and Resume](skills/codebase-onboarding-c4/references/workspace-and-state.md)
- [Evaluation](skills/codebase-onboarding-c4/references/evaluation-contract.md)

### Install directly from GitHub

Public users install the skills directly from this repository into their target
project. You do not need to clone this repository or know the maintainer's local
filesystem path. Prerequisites are Node.js 20 or later, Git, and a target project
that Codex can open.

#### Use it in another project

Run from the target project root, preserve existing work, install the required
skills, verify CodeGraph and RTK, and ask before creating files or using external
sources. The run contract is journey-first: select one primary business
operation journey, assign a stable Journey ID, map complete C1/C2 plus
journey-selective C3, and finish with evidence and quality gates.

Install all required packages into the target project:

```bash
cd /absolute/path/to/project

npx --yes skills add \
  https://github.com/KhucHieuNghi/agents-skills.git \
  --skill codebase-onboarding-c4 \
  --agent codex \
  --agent claude-code \
  --agent opencode \
  --yes
npx --yes skills add \
  https://github.com/KhucHieuNghi/agents-skills.git \
  --skill html-docs-standard \
  --agent codex \
  --agent claude-code \
  --agent opencode \
  --yes
npx --yes skills add \
  https://github.com/nutlope/hallmark.git \
  --skill hallmark \
  --agent codex \
  --agent claude-code \
  --agent opencode \
  --yes
```

Verify the project-scoped installation before starting a new agent task:

```bash
test -f .agents/skills/codebase-onboarding-c4/SKILL.md
test -f .agents/skills/html-docs-standard/SKILL.md
test -f .agents/skills/hallmark/SKILL.md
test -f .agents/skills/html-docs-standard/scripts/ensure-brand-profile.mjs
test -f skills-lock.json
git status --short

codegraph status
rtk --version
```

Open a new Codex, Claude Code, or OpenCode task at the target root and use this
prompt:

```text
Use $codebase-onboarding-c4 to onboard me to this project.
Run in Standard mode and select one primary business operation journey with a Journey ID.
Begin inline; use subagents only for independent read-only tracks.
Return findings in chat first and ask before writing files or accessing external sources.
Continue code-only when evidence is unavailable and mark the result as a grey zone.
End with the quality-gate result and assess Ready to implement: <bounded task>.
```

On the first approved HTML delivery on a machine, the workflow asks exactly
`Brand name` and `Brand website`. It performs one bounded read-only extraction
and automatically saves extracted or accessible fallback tokens at the ignored
local path `.onboarding/brand/DESIGN.md`. Later runs reuse a valid profile with
no questions and no network access. Ask the skill to `refresh brand` only when
you want to replace it.

When Hallmark is installed, `html-docs-standard` automatically invokes it after
the draft HTML uses the local template and generated brand CSS. Hallmark is only
a constrained polish pass: it must preserve light-only, offline-capable,
engineer-facing documentation and pass the HTML standard verifiers afterward.

Check the action before HTML generation. When the action is `first-use` or
`invalid`, extract a temporary candidate, then apply it in one step so the saved
profile, generated `docs-brand.css`, and verifier stay synchronized:

```bash
node .agents/skills/html-docs-standard/scripts/ensure-brand-profile.mjs "$PWD"
node .agents/skills/html-docs-standard/scripts/extract-brand-profile.mjs \
  --brand-name "<BRAND_NAME>" \
  --website "<BRAND_WEBSITE>" \
  --output "$PWD/.brand-candidate.json"
node .agents/skills/html-docs-standard/scripts/apply-brand-profile.mjs \
  --project-root "$PWD" \
  --candidate "$PWD/.brand-candidate.json" \
  --css-output "$PWD/docs/onboarding/assets/docs-brand.css"
node .agents/skills/html-docs-standard/scripts/verify-brand-profile.mjs \
  "$PWD" docs/onboarding/assets/docs-brand.css
```

`action: reuse` is local-only and should not ask for Brand name or Brand
website. The detailed commands, fallback behavior, local
file layout, and troubleshooting remain in the
[real-project usage runbook](skills/codebase-onboarding-c4/references/real-project-usage.md).

After approving durable output, expect `docs/onboarding/` Markdown and HTML plus
`.onboarding/state.yaml`, `.onboarding/evidence.yaml`, and a run summary.
Markdown remains the source of truth; refresh HTML from the current Markdown so
humans can read and navigate it more easily. Keep both roots ignored locally,
then verify the generated workspace:

```bash
git check-ignore docs/onboarding .onboarding
node .agents/skills/codebase-onboarding-c4/scripts/verify-onboarding-workspace.mjs "$PWD"
```

Maintainers testing unpublished changes may replace the agents-skills GitHub URL
in the bundled package installation commands with an absolute local checkout
path. Public users never need that local checkout.

The following profile commands are for the bundled CLI checkout. For a different
project, use the direct install commands above.

```bash
npm run dev -- recommend --intent codebase-onboarding
npm run dev -- apply-profile codebase-onboarding --target codex,claude-code,opencode --scope project
```

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
agent-skills apply-profile product-ui --target codex,claude-code,opencode --scope project
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
