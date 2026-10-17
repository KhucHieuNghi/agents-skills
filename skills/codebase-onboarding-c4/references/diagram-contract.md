# Diagram-first onboarding contract

People should be able to understand the main journey and system boundaries by
scanning diagrams before reading the detailed prose. Place each diagram before
its corresponding text section; give it a plain-language title, a one-sentence
`Takeaway:`, and `Evidence:` pointers. Use the same stable Journey ID in both
documents and name it in the diagram caption.

## Required views

| Document             | Quick | Standard and Deep | Diagram ID         | Mermaid source    |
| -------------------- | ----- | ----------------- | ------------------ | ----------------- |
| Product and Business | Yes   | Yes               | `journey-flow`     | `flowchart`       |
| Product and Business |       | Yes               | `entity-lifecycle` | `stateDiagram-v2` |
| Technical            | Yes   | Yes               | `system-context`   | `flowchart`       |
| Technical            | Yes   | Yes               | `container-map`    | `flowchart`       |
| Technical            |       | Yes               | `component-map`    | `flowchart`       |
| Technical            |       | Yes               | `journey-sequence` | `sequenceDiagram` |

Deep mode adds views only for genuinely distinct journeys or boundaries. Split
large views instead of shrinking labels. Aim for roughly 5–9 named elements per
view. Choose left-to-right or top-to-bottom layout for readable labels; use
horizontal scrolling for wide sequences on narrow screens instead of shrinking
text to illegibility. Label arrows with the action, protocol, event, or data being exchanged;
show direction. Use role or domain names in the business view, runtime and
deployment names in C2, and code ownership in C3. A shared package imported
in-process is a component or dependency, not a separate network container.
Framework routes, proxy configuration, handler bindings, queue consumers, and
deploy manifests may establish edges that a static call graph misses; check
those sources before drawing an edge.

Show the primary blocker or alternate branch in the journey view. Show partial
success, asynchronous work, and retry/failure boundaries in the technical
sequence when they change what a human can expect. Do not imply an atomic
transaction across a queue or external system. Use dashed lines or an explicit
`unknown` label for inferred or unverified relationships, and explain the
uncertainty next to the diagram. Do not draw unseen internals of a neighboring
system. Trace every material arrow to source or approved runtime evidence;
`Evidence:` may link to a compact edge table beneath the view.

## Markdown and HTML pairing

Markdown is the editable source: each view uses `### Diagram: <diagram-id>`, a
title, `Takeaway:`, `Evidence:`, and a fenced `mermaid` block. Use Mermaid source
as a portability format, then render the same view as an inline SVG inside
`<figure data-diagram-id="...">` in the corresponding HTML page. The SVG needs
`viewBox`, visible text labels, connections, `<title>`, and `<desc>`; the figure
needs a caption and should scale on narrow screens. Do not leave Mermaid text
as the only HTML representation. Inline SVG works offline without a diagram
runtime. A locally bundled Mermaid runtime is optional for editing, but its
output must be rendered and checked before delivery. Avoid Mermaid punctuation
that changes parsing of transition labels; inspect the resulting nodes and
connections, not just a successful renderer exit.

The workspace verifier checks presence, diagram IDs, source type, and basic SVG
structure. It cannot prove that a diagram is accurate or readable. Inspect the
rendered HTML at desktop and narrow widths, compare every material arrow with
the evidence table, and correct crossings or tiny text. Record any unverified
edge as a grey zone. Diagram tooling such as pinned Archify or Diagram Design
may help author a view, but neither is required by this Solution Skill; retain
Mermaid source and this output contract regardless of the authoring tool.
