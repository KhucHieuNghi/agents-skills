---
name: html-slides
description: Use when creating branded, offline-capable HTML presentations with reveal.js that follow the local project brand profile.
---

# HTML Slides

Create light-mode, responsive, offline-capable HTML presentations using
reveal.js with the local project brand profile. No remote runtime dependencies.

## Preconditions

The `html-docs-standard` skill must be installed in the same project. It
provides the brand profile workflow (ensure, extract, apply) and shared brand
state at `.onboarding/brand/DESIGN.md`.

## Brand workflow

Before generating slides, run the brand preflight from the installed
`html-docs-standard`:

```bash
skill_root=.agents/skills
test -f "$skill_root/html-docs-standard/SKILL.md" || skill_root=.claude/skills
node "$skill_root/html-docs-standard/scripts/ensure-brand-profile.mjs" "$PROJECT_ROOT"
```

Keep `skill_root` set in the same shell for the verifier below.

- `reuse` — Use the valid local profile without questions or network.
- `first-use` or `invalid` — Ask exactly Brand name and Brand website, then
  run `extract-brand-profile.mjs` and `apply-brand-profile.mjs` as defined by
  `html-docs-standard`. This writes `.onboarding/brand/DESIGN.md` and generates
  `docs-brand.css`.
- `refresh` — Only when user explicitly requests brand refresh.

After the brand profile is ready, generate `reveal-theme-branded.css` from the
brand tokens. The template in `assets/slide-template.html` loads this CSS after
the base reveal.js styles.

## Required contracts

Read these references before generating presentations:

1. `references/presentation-contract.md`
2. `references/reveal-usage-contract.md`
3. `references/attribution.md`

## Slide generation

Start from `assets/slide-template.html`. This template:

- Loads reveal.js from a local bundled copy (no CDN)
- Loads `reveal-theme-branded.css` for brand colors and typography
- Uses light-mode only (white/light backgrounds)
- Includes highlight.js plugin locally for code slides
- Supports Mermaid diagrams with branded theme variables

Generate the presentation as a single self-contained HTML file. Include
reveal.js and plugins inline or reference local asset copies. Never use CDN
URLs or remote font imports.

## Content structure

A presentation should include:

- Title slide with project brand
- Agenda or overview slide
- Content slides with clear hierarchy
- Code slides with syntax highlighting when relevant
- Mermaid diagrams when architecture or flow is needed
- Summary or closing slide

Use fragments (animations) sparingly for progressive disclosure. Use vertical
slides for deep-dives within a topic.

## Verification

Before delivery, run:

```bash
node "$skill_root/html-slides/scripts/verify-slides.mjs" "$OUTPUT_FILE"
```

The verifier checks:

- No CDN or remote URLs (jsdelivr, unpkg, cdnjs, googleapis)
- No dark-only themes or dark background colors
- Brand CSS variables are present
- No remote font imports
- Valid HTML structure with reveal.js container

## Hallmark polish pass

Do NOT apply the Hallmark polish pass to slides. Reveal.js has its own layout
and animation system that is incompatible with Hallmark's document-oriented
polish. Slides are self-contained presentations, not engineer documentation.

## Attribution

Domain knowledge for reveal.js usage patterns in this skill is derived from:

- Source: https://github.com/claude-office-skills/skills/tree/main/html-slides
- License: MIT
- Author: claude-office-skills

This skill is a complete rewrite adapted to the agent-skills system contracts
(light-mode only, offline-capable, branded, with verification). It does not
reproduce the original SKILL.md verbatim. The reveal.js framework itself is MIT
licensed: https://github.com/hakimel/reveal.js
