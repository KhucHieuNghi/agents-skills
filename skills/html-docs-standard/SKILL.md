---
name: html-docs-standard
description: Create generic, light-only HTML onboarding, architecture, runbook, and engineer-facing documentation.
---

# HTML Documentation Standard

Use this package when an engineer needs a portable HTML onboarding page,
architecture guide, operational runbook, or implementation-oriented reference.

Start from `assets/document-template.html`, then replace every template
placeholder with project-approved content. Follow the concise writing rules in
`references/writing-contract.md` and the visual rules in
`references/style-contract.md`.

Use `assets/docs-theme.css` and `assets/docs-theme.js` together. Before
delivery, run `node scripts/verify-html-docs.mjs <document.html>` to confirm
the required structure, viewport, diagram configuration, and privacy markers.
