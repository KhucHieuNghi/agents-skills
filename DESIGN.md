---
version: alpha
name: NKSkills
colors:
  primary: "#4B2855"
  secondary: "#624D67"
  tertiary: "#B63D6E"
  neutral: "#FFFDFB"
  surface: "#FFFFFF"
  surface-muted: "#FCE9E6"
  text: "#4B2855"
  text-muted: "#624D67"
  border: "#E9DFE8"
  on-primary: "#FFFFFF"
  on-tertiary: "#FFFFFF"
  rose: "#D44F80"
  sky: "#8BCCE0"
  apricot: "#F4BC72"
  action-hover: "#972C58"
  blush-field: "#FCE7E9"
  sky-field: "#E5F2F4"
  apricot-field: "#FFF0D7"
  candidate-ink: "#8C5920"
typography:
  headline-lg:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 4.7rem
    fontWeight: 650
    lineHeight: 1.03
  headline-md:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 3.1rem
    fontWeight: 650
    lineHeight: 1.13
  body-md:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label-sm:
    fontFamily: "Source Sans 3 Variable, ui-sans-serif, sans-serif"
    fontSize: 0.8rem
    fontWeight: 700
    lineHeight: 1.4
  code-sm:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: 0.88rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 8px
  md: 24px
  lg: 32px
  pill: 999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 96px
---

# NKSkills design system

## Overview

This is the visual contract for NKSkills-owned experiences: the campaign site,
catalog, Solution Skill pages, setup guides, and future NKSkills product or
marketing surfaces. The intended feeling is warm, capable, and editorial. Keep
the existing page structure and factual product copy when applying this theme.
The [site design record](site/DESIGN.md) explains the reference and the first
implementation. This file owns the design decisions; [site
tokens](site/src/styles/tokens.css) implement them. Update the YAML tokens and
the CSS mapping together when changing the system, then run the site design
contract test.

This file does **not** set the brand for a customer's generated slides or
onboarding documents. Those use the supplied customer brand or their own
provisional identity. In particular, `.onboarding/brand/DESIGN.md` remains the
local source for `html-docs-standard`; this root file must not replace it.

## Colors

| Role                                        | CSS token            | Usage                                   |
| ------------------------------------------- | -------------------- | --------------------------------------- |
| `primary`, `text`                           | `--ink`              | Plum headings and body text             |
| `secondary`, `text-muted`                   | `--ink-soft`         | Secondary copy                          |
| `neutral`                                   | `--canvas`           | Warm white page ground                  |
| `surface`                                   | `--paper`            | Reading cards                           |
| `surface-muted`                             | `--blush`            | Soft status panel                       |
| `tertiary`                                  | `--action`           | Primary actions with white text         |
| `action-hover`                              | `--action-hover`     | Hover and small rose labels or links    |
| `rose`                                      | `--rose`             | Large display accents and decoration    |
| `blush-field`, `sky-field`, `apricot-field` | Matching `--*-field` | Recurring pastel section and card fills |
| `candidate-ink`                             | `--candidate-ink`    | Candidate status number                 |
| `border`                                    | `--line`             | Quiet dividers                          |

The stronger sky and apricot colors are illustration accents. Use a single
dominant pastel field per section; keep borders quiet and avoid gradients as
default decoration. The rose display color has only 3.96:1 contrast on the
warm white ground: use the darker `action-hover` color for small text and links.
Use `tertiary` with `on-tertiary` for all primary buttons across page types.
The catalog uses `candidate-ink` with a written candidate label; status must
never depend on color alone. The existing `--plum` alias resolves to `--ink`.

## Typography

Use self-hosted **Fraunces Variable** for major page and section headings. In
the web implementation, set weight 650 and variation axes `"SOFT" 60` and
`"WONK" 0`. Use **Source Sans 3 Variable** for paragraphs, navigation, buttons,
cards, and compact labels. Use **IBM Plex Mono** only for actual prompts,
commands, code, and technical annotations. These fonts include the required
Vietnamese coverage; use their existing license notices. Responsive heading
sizes may use `clamp()` while preserving the same family and hierarchy. The
site maps these families to `--font-display`, `--font-ui`, and `--font-code`.
Do not use fallback Georgia as a primary font while Fraunces is available.
Preload the Latin display and body faces used above the fold; add Vietnamese
subsets on Vietnamese routes. The self-hosted faces use `font-display: optional`
so a slow first visit keeps a readable fallback for that page instead of
switching typography after text is visible. The approved web fonts appear when
they arrive in time or are cached. Keep fallback layouts usable at 320px.

## Layout

Use generous white space, a reading width near 1260px for wide page sections,
and a clear hierarchy before adding decorative elements. The hero may carry
one large pastel composition. Supporting sections should alternate quiet
ground and soft fields. On narrow screens, stack the same content in reading
order with no horizontal overflow; keep controls comfortably tappable.

## Elevation & Depth

Prefer color, spacing, and overlap to shadow. The hero's product composition
may have a modest shadow to separate its layers. Ordinary cards and guides
should remain nearly flat.

## Shapes

Use soft corners for content panels and pill shapes for compact controls or
status labels. Keep the irregular peach field and small rounded accents as
occasional motifs, not a different shape language for each page. The YAML
rounding and spacing scales are defaults; asymmetric cards and fluid spacing
may use deliberate local values while retaining the same overall rhythm.

## Components

- **Primary action:** rose action fill, white text, readable hover and focus
  states, pill shape when used as a compact call to action.
- **Content card:** white or one pastel surface, plum heading, Source Sans 3
  body copy, quiet border only where separation is needed.
- **Workflow diagram:** responsive HTML using the same type and color roles;
  retain real step names, versions, and review status.
- **Prompt or command block:** IBM Plex Mono for the technical content, with
  nearby Source Sans 3 explanation.

## Do's and Don'ts

- Reuse this system across both Vietnamese and English NKSkills pages.
- Keep product illustrations tied to real skills, releases, and host paths.
- Check 4.5:1 normal-text contrast, visible focus, 44px touch targets, mobile
  layout, and font loading on every new page. Large display text may use 3:1.
- Prefer the shared CSS tokens for repeated surface, text, action, and border
  roles; reserve local colors for details within an illustration.
- Do not use stock people, generic AI imagery, or a new font palette for each
  campaign section.
- Do not imply support for hosts other than Codex and Claude Code.
