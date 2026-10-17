---
name: presentation-brand
description: Prepare a local, traceable brand profile and logo for a problem presentation, using a supplied company website or a clearly provisional fallback.
---

# Presentation Brand

Use this component when `problem-presentation` needs a consistent identity for
an offline deck. Ask the customer once for the company or brand name and its
official website URL. A supplied logo or brand guide can replace the URL. All
fields are optional: when unavailable, create a harmonious provisional identity
without another brand question. Never present generated identity as official.

Run `node <this-skill>/scripts/brand.mjs --title "<deck title>" --output-dir
"<deck directory>/brand"` with optional `--brand-name`, `--website`, or
`--logo`. The command writes `brand.json` and a local logo asset. Read the
profile before making slides. Reuse it on revisions; use `--refresh` only when
the customer changes the source or asks to regenerate.

Use palette and logo as design inputs, not as evidence for factual claims.
Keep the logo local to the customer's output. Read
[the brand workflow](references/brand-workflow.md) for source handling,
confidence, safety limits, and the handoff to slide and diagram skills.
