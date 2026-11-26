# Motion and responsive design

Choose motion when it clarifies a change, provides feedback or strengthens
the product-specific visual idea. For example, a transition between
assigned and dispatched can explain a dispatch tool. Specify the trigger,
what changes, the purpose and the reduced-motion equivalent. Skip movement
that adds no value or conflicts with the brief.

Prefer CSS or existing project primitives for simple feedback. Prefer
transform and opacity where they avoid layout changes. Leave the headline,
essential content and CTA usable before JavaScript enhancement. Keep
scrolling and keyboard interaction available during motion. Provide a
static or reduced transition when `prefers-reduced-motion` applies. If
the page needs orchestrated animation, discuss Motion only when the stack
and interaction justify a dependency.

At 320, 390, 768 and 1440 CSS pixels, check reading order, text wrapping,
spacing, image cropping, navigation and controls. Use fonts with the
requested language's glyphs. Check long Vietnamese strings, diacritics
and zoom where applicable. Make focus visible, give touch targets usable
space and keep sticky elements clear of the focused control.

Capture the rendered page at the four widths. Check the primary action and
record evidence in default and reduced-motion modes. For static pages,
observe both modes and record that the design stays static.

[Animation guidance](https://web.dev/articles/animations-guide) ·
[Responsive design](https://web.dev/learn/design/) ·
[WCAG 2.2](https://www.w3.org/TR/WCAG22/)
