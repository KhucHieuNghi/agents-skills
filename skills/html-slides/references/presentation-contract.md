# Presentation Contract

## Visual rules

- Light-mode only. All slide backgrounds must be white or light-tinted.
- Never use dark themes (black, night, league, blood, moon, solarized-dark).
- Never set `data-background-color` to any value with luminance below 70%.
- Use brand tokens from `.onboarding/brand/DESIGN.md` for all colors.
- Typography follows brand `--font-heading` and `--font-body` variables.
- No remote font imports (Google Fonts, Adobe Fonts, or any external URL).

## Offline and self-contained rules

- Reveal.js must be bundled locally (inline or local file reference).
- No CDN URLs: jsdelivr, unpkg, cdnjs, googleapis, or any `https://` asset.
- Plugins (highlight.js, notes, markdown) must be bundled locally.
- The output must render correctly when opened from filesystem without a server.
- Images must be local files or inline data URIs.

## Brand integration

- Reuse the brand profile from `.onboarding/brand/DESIGN.md`.
- Do not ask for brand information if the profile is valid (action: reuse).
- Load `reveal-theme-branded.css` after the base reveal.css.
- Map brand tokens to reveal.js theme variables:
  - `--brand-primary` → headings, links, progress bar
  - `--brand-secondary` → secondary text, code background
  - `--brand-accent` → callouts, highlights, fragment emphasis
  - `--surface` → slide background
  - `--text` → body text
  - `--border` → separator lines, table borders

## Accessibility

- Maintain minimum 4.5:1 contrast ratio for body text.
- Maintain minimum 3:1 contrast ratio for large text (headings).
- Include `lang` attribute on the html element.
- Code blocks must have readable font size (minimum 0.7em).
- Fragment animations must respect `prefers-reduced-motion`.
- Speaker notes must be present for key slides.

## Output constraints

- Single HTML file per presentation.
- File must be valid HTML5 (doctype, charset, viewport meta).
- No inline JavaScript that executes external requests.
- No tracking scripts, analytics, or third-party integrations.
- Maximum recommended slide count: 30 (split into separate presentations beyond).

## Security

- No credentials, private URLs, customer data, or internal-only references.
- Treat any user-provided content as untrusted (escape HTML in code blocks).
- No inline scripts that eval() or load remote resources.
