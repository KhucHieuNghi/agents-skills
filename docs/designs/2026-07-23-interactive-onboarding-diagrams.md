# Interactive Onboarding Diagrams Design

Status: proposed design; implementation plan pending

Date: 2026-07-23

Packages: `codebase-onboarding-c4`, `html-docs-standard`

## Summary

Enhance generated onboarding HTML with interactive diagrams that open a detail
drawer when a user selects a diagram node. The drawer uses one common metadata
schema for every node type. Markdown and YAML remain the source of truth; HTML
is only a refreshed readable view.

The feature must preserve the existing onboarding workflow: scan code, reason
from evidence, separate product/business scope from engineer scope, record grey
zones, and generate local ignored artifacts only after approval.

## Goals

- Let humans move from a high-level diagram to node details without leaving the
  page.
- Keep one shared node metadata format across system, backend, frontend, data,
  cloud/runtime, external, and actor nodes.
- Support drawer sections for meaning, scope, relationships, rules, stack,
  source pointers, confidence, grey zones, and related views.
- Keep all drawer content traceable to Markdown/YAML source artifacts.
- Provide a static fallback section so docs remain readable without JavaScript
  or successful diagram event binding.
- Keep generated HTML light-only, offline-capable, responsive, keyboard
  accessible, and verifier-backed.
- Make future LikeC4-style model/view export possible without depending on
  LikeC4 at runtime in this phase.

## Non-goals

- Do not introduce a LikeC4 runtime dependency in the first implementation.
- Do not make Mermaid the source of truth for node metadata.
- Do not require a perfect graph layout engine.
- Do not store private source paths, credentials, raw database rows, customer
  data, or unsupported business claims in drawer metadata.
- Do not make drawer-only content that is missing from Markdown/YAML source or
  from a static fallback.

## Source of Truth

Markdown and YAML artifacts own the content:

```text
docs/onboarding/
├── index.md
├── product-business.md
├── engineering-overview.md
├── architecture-views.md
├── dataflow-and-runtime.md
├── implementation-navigation.md
└── readiness-and-grey-zones.md

.onboarding/
├── views.yaml
├── evidence.yaml
└── state.yaml
```

HTML pages are regenerated views over those artifacts. If drawer content differs
from Markdown/YAML, Markdown/YAML wins and HTML must be refreshed.

## Common Diagram Node Schema

Use one schema for every interactive node:

```yaml
diagram_nodes:
  - id: backend.api
    label: Backend API
    kind: backend
    scope: Handles command-side requests for the primary journey.
    responsibilities:
      - Validate incoming commands.
      - Coordinate domain services.
    relationships:
      - target: data.orders
        label: writes order state
        type: writes
        evidence: src/orders/repository.ts
    rules:
      - Commands must be idempotent by request id.
    stack:
      - Node.js
      - PostgreSQL
    source_pointers:
      - src/orders/api.ts
      - src/orders/service.ts
    call_paths:
      - route POST /orders -> createOrder -> OrderRepository.save
    confidence: high
    evidence_status: verified-from-code
    grey_zones: []
    related_views:
      - engineer.dataflow.primary_journey
```

Required fields:

- `id`
- `label`
- `kind`
- `scope`
- `responsibilities`
- `relationships`
- `source_pointers`
- `confidence`
- `evidence_status`

Allowed `kind` values:

- `actor`
- `system`
- `backend`
- `frontend`
- `data`
- `cloud`
- `runtime`
- `external`
- `unknown`

Allowed `evidence_status` values:

- `verified-from-code`
- `inferred-from-source`
- `needs-confirmation`
- `grey-zone`

## View Registry

Use `.onboarding/views.yaml` as the machine-readable navigation model:

```yaml
schema_version: 1
views:
  - id: product.primary_journey
    title: Primary Business Journey
    scope: product
    source: docs/onboarding/product-business.md
    diagrams:
      - product.primary_journey.map

  - id: engineer.system
    title: System Frame
    scope: engineer
    source: docs/onboarding/architecture-views.md
    diagrams:
      - engineer.system.context

  - id: engineer.dataflow.primary_journey
    title: Primary Journey Dataflow
    scope: engineer
    source: docs/onboarding/dataflow-and-runtime.md
    diagrams:
      - engineer.dataflow.primary_journey
```

HTML menu groups views by `scope`:

```text
Product / Business
Engineer
Evidence / Readiness
```

## HTML Drawer Behavior

The HTML renderer embeds diagram metadata as local JSON:

```html
<script type="application/json" id="docs-diagram-metadata">
  {
    "nodes": []
  }
</script>
```

`docs-theme.js` reads the JSON, binds interactive behavior to rendered diagram
nodes when possible, and opens a drawer. The drawer layout is shared:

```text
Header
- Label
- Kind
- Confidence
- Evidence status

Meaning
- Scope
- Responsibilities
- Stack/runtime

Relationships
- Relationship type
- Target
- Evidence

Rules
- Business rules
- Technical rules
- Failure, security, or idempotency notes

Evidence
- Source pointers
- CodeGraph call paths
- Grey zones
- Related views
```

Desktop behavior:

- Drawer opens from the right.
- Diagram remains visible.
- Close button, Escape key, and outside click close the drawer.

Mobile behavior:

- Drawer becomes a bottom sheet.
- Content scrolls independently.
- Close button is always visible.

Accessibility behavior:

- Interactive nodes are focusable.
- Enter and Space open the drawer.
- Drawer uses `role="dialog"` and a labelled heading.
- Focus returns to the selected node on close.

## Static Fallback

Every interactive diagram must also render a static fallback section:

```html
<section class="docs-diagram-details" data-diagram-details="engineer.system">
  <h3>Diagram node details</h3>
  ...
</section>
```

The fallback contains the same source-derived facts as the drawer. This protects
readability when JavaScript is unavailable, Mermaid fails to expose stable node
selectors, or a printed/exported copy is used.

## Mermaid Strategy

Mermaid remains the default diagram renderer in this phase. The drawer layer
does not rely on Mermaid as the source of truth.

Preferred binding:

- Generated Mermaid node labels include stable identifiers where practical.
- Rendered nodes receive or can be matched to `diagram_nodes[].id`.
- If matching fails, the static fallback still provides node details.

Do not block delivery solely because the drawer cannot bind to every node. Block
delivery only when metadata or fallback content is missing from required
interactive diagrams.

## Reasoning and Evidence Contract

The agent must generate node metadata only after reading code or approved
evidence sources. Drawer facts follow the same evidence rules as the Markdown
documents:

- Verified facts require source pointers.
- Inferred facts must be labelled `inferred-from-source`.
- Unknowns must be represented as grey zones.
- Product rules and technical rules must not be invented.
- Relationships must state direction and evidence.

## Verifier Requirements

Extend HTML and workspace verification to check:

- Interactive diagram metadata JSON is valid when present.
- Every metadata node has required fields.
- Every metadata node has a matching static fallback entry.
- Every relationship references a known node or is labelled external.
- Evidence status uses the allowed enum.
- Drawer markup exists when interactive metadata exists.
- No drawer metadata contains credentials, private URLs, raw sensitive data, or
  absolute private paths.
- HTML menu groups Product / Business, Engineer, and Evidence / Readiness when
  modular onboarding output is generated.

## Implementation Phases

### Phase 1 - Contracts and Templates

- Add modular Markdown templates.
- Add `.onboarding/views.yaml` template.
- Add common diagram node schema documentation.
- Update `codebase-onboarding-c4` references to require view registry and
  static fallback.

### Phase 2 - Renderer

- Add drawer HTML scaffold to the document template.
- Add drawer CSS and mobile bottom-sheet behavior.
- Add `docs-theme.js` metadata parsing, binding, focus handling, and close
  behavior.

### Phase 3 - Verification

- Extend `verify-html-docs.mjs`.
- Extend `verify-onboarding-workspace.mjs`.
- Add synthetic workspace tests for metadata, fallback, scope grouping, and
  privacy boundaries.

### Phase 4 - Documentation Refresh

- Update README.
- Update real-project usage runbook.
- Refresh the HTML integration guide from the Markdown source.

## Risks and Mitigations

| Risk                                         | Mitigation                                                  |
| -------------------------------------------- | ----------------------------------------------------------- |
| Mermaid output selectors are unstable        | Use progressive enhancement and static fallback.            |
| Drawer becomes a second source of truth      | Generate drawer from Markdown/YAML metadata only.           |
| Too much content in one drawer               | Use fixed sections and concise bullets.                     |
| AI fabricates rules or relationships         | Require evidence status and source pointers per node.       |
| Mobile drawer blocks reading                 | Use bottom sheet with independent scroll and visible close. |
| Verifier accepts pretty but unsupported HTML | Require metadata, fallback, enum, and privacy checks.       |

## Open Questions

No product decision remains open for the first implementation. The chosen
direction is one shared node format for all diagram node kinds.

Implementation can still decide exact CSS class names and internal helper
function names, provided the public HTML contract and verifier behavior remain
stable.
