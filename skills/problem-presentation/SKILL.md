---
name: problem-presentation
description: Use when a product owner, manager, or engineer needs a short presentation to explain one concrete problem and request one decision from a known audience.
---

# Problem Presentation

Turn one problem into a decision-ready offline HTML deck and matching PDF.
Keep the problem narrow enough that the audience can act after one viewing.

## Frame the decision and brand

Identify the audience, observed problem, available evidence, and exact decision
requested. Infer context from supplied material when safe; ask only when the
problem or decision remains unclear. Separate observed facts, interpretation,
and proposals. Label unverified claims as hypotheses. Never invent metrics,
quotes, or certainty.

Ask once for the company/brand name and official website URL, explaining that
either may be omitted. Accept a local logo or brand guide instead. Use the
bundled `presentation-brand` component to produce a local `brand.json` and
logo before laying out slides. When no brand is available, use its clearly
provisional identity without another brand question.

## Compose the deck

Use about five short slides: decision question, visual explanation, evidence,
consequences and options, and the exact ask. Adjust the count for clarity.
Keep one message per slide. Use the pinned `visual-explainer` slide workflow
and template for structure, navigation, and layout. Use pinned
`diagram-design` for one focused SVG only if a relationship, sequence, or gap
needs a diagram; pass factual labels and brand tokens into it. The problem,
evidence, and decision contract here takes precedence over generic style
suggestions in either upstream skill.

Use local/system fonts and inline or local assets only. Preserve the upstream
slide engine while removing its remote font links. Add print rules that put
every slide on its own PDF page. Keep text readable on a projector and phone;
support keyboard navigation and deep links. Give consequential facts visible
source labels. Include the offline CSP from the production workflow before any
scripts or styles. Never place credentials or private customer data in the deck.

## Check before delivery

Follow [the production workflow](references/production-workflow.md) for the
component handoffs and delivery commands. Run `check-deck.mjs`, export the PDF
with `export-pdf.mjs`, then check both. Inspect desktop, short, narrow, and
print views in a browser. Verify the PDF preserves every slide and source
label. If Chrome/Chromium cannot run, deliver the checked HTML and report the
PDF gate as failed; do not author a separate PDF with another renderer. Read
as the intended audience: can they name the problem, distinguish
evidence from inference, and answer the decision? Report any unchecked claim
or visual defect instead of calling the deck ready.
