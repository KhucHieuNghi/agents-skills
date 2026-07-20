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
the required structure, meaningful responsive viewport, diagram configuration,
and privacy markers. The template has no remote runtime dependency. If a
document must render Mermaid diagrams, bundle or otherwise provide Mermaid
locally so it is available as `window.mermaid`; the template configures it with
the required default theme when present.
