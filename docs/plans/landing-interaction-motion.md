# Landing interaction and motion plan

Status: proposed, 2026-10-31. Scope: the NKSkills Astro site in `site/`.

The prompt host and prompt-language pills now glide between their two choices,
keep `aria-pressed` and prompt text synchronized, use 44px buttons, and honor
reduced motion. The reusable control extraction, page-language link variant,
and broader page motion remain proposed.
The toggle update used direct browser inspection and tests; it did not run
Impeccable. The product owner's recommended Taste Skill → Impeccable authoring
sequence should guide the next full UI review against the approved `DESIGN.md`.

## Current baseline

- The Worker already redirects `/` to `/en/` with HTTP 308. English is the
  entry default; explicit `/vi/` routes and their canonical/hreflang links
  remain valid.
- `PromptPicker.astro` renders two pill groups for Codex/Claude Code and
  English/Tiếng Việt. `prompt-picker.js` owns their state and keyboard arrows.
  The initial prompt language follows the page locale. The selected prompt
  and copied value are already synchronized.
- `Base.astro` renders one language link in the header and footer. It reaches
  the equivalent route in the other language, but does not show both choices
  or the active language together.
- The prompt controls are 40px high in `landing.css`; the approved `DESIGN.md`
  calls for 44px touch targets. Global CSS already honors reduced motion and
  disables smooth scrolling for that preference.

## Experience contract

1. A first visit to `/` opens English. A direct `/vi/...` link stays
   Vietnamese; page language is explicit in the URL. Prompt language begins
   in the current page language, so the UI and prompt agree on load. Users can
   choose the other prompt language without changing the page route.
2. The header language control displays **English** and **Tiếng Việt** as a
   two-choice control on all page types. Each choice is a real link to the
   equivalent route, including the current page kind. The current route has
   `aria-current="page"`; navigation still works without JavaScript.
3. The prompt host and prompt-language controls use native buttons in a
   labelled group, with `aria-pressed` matching the selected option. Arrow,
   Home, and End keys continue to work. Tab order and focus ring remain
   visible. The page route and prompt language are distinct states.
4. At 320px and 390px, every option remains legible and at least 44px tall.
   Prompt groups fill the available width. The header uses two rows when the
   full English/Tiếng Việt labels no longer fit beside the brand and catalog
   link; it keeps all three reachable without horizontal scrolling.

## Reusable component

Create `site/src/components/SegmentedControl.astro` with a small data contract:
`label`, `items` (`value`, `label`, optional `href`), `selected`, and
`mode: "buttons" | "links"`. The component owns the common markup, active
indicator, focus styling, and responsive layout. Use it in `PromptPicker.astro`
twice and in `Base.astro` for page language. Links remain links; buttons
remain buttons. This keeps route navigation and in-page state accessible
without introducing a client-side framework.

Move the shared visual rules out of the repeated `.tab-list` selectors into
`site/src/styles/segmented-control.css`. Keep NKSkills' Fraunces/Source Sans 3
fonts, plum/rose color roles, rounded shape, and existing content hierarchy.
The small client controller handles only the button variant and emits a
selection event; `prompt-picker.js` maps host and language choices to the
correct prompt. The link variant needs no JavaScript to navigate.

## Motion rules

| Interaction               | Proposed motion                                                              | Constraint                                                                                |
| ------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Selected segment          | One pill/field glides to the next option with transform and a short ease-out | Keep the state and focus readable during the move; no animated width or layout shift.     |
| Prompt change             | Immediate text/value update with a brief surface fade                        | Copied text must always match the visible selected prompt; no stale content while fading. |
| Copy feedback             | Short opacity change for the status and button feedback                      | `aria-live` message updates immediately, even if animation is disabled.                   |
| Primary actions and links | Subtle color/position feedback on hover and press                            | Keyboard focus is immediate and visible; touch does not depend on hover.                  |
| Page arrival              | One restrained hero entrance and, if useful, one composition-board entrance  | Main content remains visible when JavaScript is absent; avoid animating every section.    |

Use shared motion tokens in CSS and tune duration by distance and purpose.
Prefer `transform` and `opacity`; reserve shadows and decorative motion for
rare moments. The existing `prefers-reduced-motion: reduce` behavior remains
the baseline for motion-sensitive users. Avoid parallax, scroll hijacking, and
automatic looping decoration. A page-language link can use a browser-supported
transition as progressive enhancement after the native route works correctly.

## Implementation sequence

1. Extract the segmented control markup/styles and migrate the two prompt
   groups without changing prompt content or copy behavior.
2. Replace the header's one-way language link with the link variant; keep
   equivalent EN/VI routes and SEO metadata.
3. Add state motion and restrained page entrances using CSS tokens and the
   existing lightweight script. Check rendering at every breakpoint.
4. Refine mobile wrapping, touch targets, keyboard behavior, and reduced
   motion from actual browser screenshots.
5. Build preview, run tests, review English and Vietnamese pages, then deploy
   production with smoke and browser checks.

## Acceptance checks

- Root redirect remains `/en/`; all direct `/vi/...` routes, alternate links,
  canonical URLs, and page-language selections remain correct.
- Every host/language combination displays and copies the exact matching
  prompt. Repeated rapid selection does not leave the indicator or text in
  the wrong state.
- Keyboard-only navigation, focus visibility, button/link semantics, and
  no-JavaScript language navigation pass on desktop and mobile.
- At 320, 390, 768, 1024, and 1440px, controls and page sections show no
  clipping or horizontal overflow; touch targets meet the 44px design rule.
- Reduced motion shows the final state without entrance or selection travel;
  text stays readable throughout all transitions.
- Site unit tests, Astro typecheck, production build, Playwright browser tests,
  and production smoke pass before the update is considered released.
