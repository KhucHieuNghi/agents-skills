# Style Contract

## Local design authority

Use `.onboarding/brand/DESIGN.md` as the canonical local token source. It follows
the Google Labs DESIGN.md alpha shape and contains color, typography, radius,
and spacing roles. Do not read a root UI-oriented DESIGN.md as a substitute for
this generated documentation profile.

Load structural `docs-theme.css` first and generated `docs-brand.css` second.
Keep both local. The adapter maps:

| DESIGN.md token    | HTML use                                        |
| ------------------ | ----------------------------------------------- |
| `colors.primary`   | Navigation state, links, headings, eyebrows     |
| `colors.secondary` | Supporting states and Mermaid borders           |
| `colors.tertiary`  | Callout accents and Mermaid tertiary nodes      |
| `colors.surface*`  | Page, card, table, code, and control surfaces   |
| `colors.text*`     | Body, labels, muted content, and diagram lines  |
| `colors.border`    | Cards, tables, code, controls, and diagrams     |
| `typography.*`     | Heading/body families and metrics               |
| `rounded.*`        | Navigation, cards, callouts, code, and controls |

Every font family must end in safe system fallbacks. Store font metadata only;
never download or redistribute font binaries. Derive readable foreground roles
when extracted colors do not meet contrast.

## Components and diagrams

- Keep navigation visible on wide screens and reachable by a toggle on narrow
  screens.
- Use cards for grouped concepts, callouts for decisions or risks, and tables
  only for compact comparisons.
- Apply semantic variables to sidebar, headings, cards, tables, callouts, code,
  controls, focus states, and Mermaid.
- Configure Mermaid with `theme: "base"` and the required profile-derived theme
  variables. Do not use a fixed default Mermaid palette.
- Keep the output light-only, responsive, offline-capable, and readable at a
  320-pixel viewport.
- Use motion only as a subtle orientation aid and preserve reduced motion.
