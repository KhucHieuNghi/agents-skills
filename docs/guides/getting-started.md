# Getting Started

This guide covers the generic discovery catalog and experimental profiles. For
the released `codebase-onboarding@1.1.0` Solution Skill, use the
[technical V1 release guide](technical-v1.md). Profiles do not carry the
versioned release lock.

## Prerequisites

Use Node.js 22 or later. Install Git if you plan to pull a Git-backed public
source.

## Validate before applying

From this repository, install dependencies and validate the external source:

```bash
npm install
npm run dev -- recommend --intent landing-page
```

Apply a validated skill to one or more project targets:

```bash
npm run dev -- apply-profile hallmark-landing --target codex,claude-code --scope project
```

The repository root contains the default public catalog at `./catalog.yaml`.
It uses public source URLs and paths inside this repository; no private GitHub
repository is required.

## Apply a public profile

Use the checked-in `./catalog.yaml` to associate user intents with an ordered
set of reviewed public skills. `skills.sh` is a discovery directory; the
catalog must record the canonical source URL that the CLI can validate.

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
profiles:
  product-ui:
    intents: [landing-page]
    skills: [design-system]
    summary: Builds a branded public product page.
    suitableFor: [landing-page]
    notSuitableFor: [data-dashboard]
    designMd:
      slug: design-reference
      summary: Establishes the chosen visual language before UI work.
```

Show the user the profile choices without reading their sources, then apply the
profile they choose:

```bash
npm run dev -- recommend --intent landing-page
npm run dev -- apply-profile product-ui --target codex,claude-code --scope project
```

The catalog requires lowercase hyphenated names. Each profile and skill must
provide a non-empty `summary`; `suitableFor` and `notSuitableFor` explain to
the user when installation is appropriate. An intent can offer multiple
profiles; `recommend` prints a comparison table and the user chooses the name
to pass to `apply-profile`. Applying a profile validates every selected skill
before it installs the first one.

If a profile includes `designMd`, `recommend` displays a manual
`npx getdesign@latest add <slug>` preflight command. Run it only after choosing
the design reference and reviewing the resulting `DESIGN.md`; the CLI never
runs it automatically.

## Next steps

Use `agent-skills catalog --source <path-or-git-url>` to inspect packages and
`agent-skills doctor` to inspect local prerequisites and target directories.
