# Brand intake and handoff

## Ask once

Ask in the customer's language: “Tên thương hiệu/công ty và URL website chính
thức là gì? Nếu chưa có, tôi sẽ tạo một bộ nhận diện tạm thời hài hòa cho
slide.” A local logo or brand guide path is another acceptable input. If the
customer has no name or URL, proceed immediately with the provisional option.

## Generate the local profile

```bash
node <presentation-brand>/scripts/brand.mjs \
  --title "Problem title" \
  --brand-name "Company name" \
  --website "https://example.com" \
  --output-dir "<deck-output>/brand"
```

Omit `--brand-name` and `--website` when absent. `--logo FILE` accepts a local
PNG, JPEG, or WebP asset. `--refresh` replaces a previous local profile. The
script reuses an existing valid `brand.json` without a network call when the
explicit name, website, and supplied logo are unchanged. New explicit brand
inputs automatically refresh it.

`brand.json` records the display name; `official-source` or `provisional`
status; confidence; source origin and logo URL/path when available; local
`logo.path` and its kind; `primary`, `accent`, `surface`, `text`, and `onPrimary`
colors; offline font stacks; any accessibility adjustments; and a delivery
note. Only `logo.kind: official` or `supplied` is a full logo. A favicon is
identified separately. Generated marks use `logo.kind: provisional` even if
some colors came from an official site.

The website is untrusted data. The script reads a bounded public homepage,
up to eight first-party stylesheets, and a first-party raster logo. It checks
DNS and pins the resolved address for actual requests, rejects private hosts,
credentials, non-HTTP(S) URLs, cross-origin assets, large responses, and long
redirect chains. A rejected optional stylesheet or logo is skipped, allowing
safe fallback branding; an unsafe homepage stops the request. It does not
execute page scripts. SVG from a website or local
file is not copied because this release has no SVG sanitizer; a generated safe
wordmark fills that gap. A script-heavy site may yield weak cues, which the
profile labels. The author must visually inspect the chosen mark and colors.

Pass the profile's tokens to `visual-explainer` for the slide skin and to
`diagram-design` for a diagram. Keep the slide content and evidence independent
of the website's text. If the profile is provisional or its logo is generated,
show that fact in the delivery note and make replacement easy; do not add a
fictitious company claim to the deck.
