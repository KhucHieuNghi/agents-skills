# Evidence and Output Contract

## Evidence labels

Use one label for every material statement and diagram relationship:

| Label                             | Meaning                                                                           | Required support                                                        |
| --------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `verified-from-source`            | Directly established by current code or configuration.                            | File path plus symbol, route, config key, test, or CodeGraph call path. |
| `verified-from-provided-material` | Directly established by user-provided PRD, decision record, or approved document. | Source title and relevant section.                                      |
| `inferred-from-source`            | Plausible interpretation of source, not an explicit business fact.                | At least two source signals and the inference stated as an inference.   |
| `needs-confirmation`              | Unknown, contradictory, or unavailable.                                           | A concrete question and the owner most likely to answer it.             |

Never convert an inference into a verified fact. Do not expose secret values;
name a configuration mechanism without reproducing its sensitive content.

## Source precedence and contradictions

Use source and configuration to establish implemented structure. Use a live
runtime only after approval to establish current code or runtime behavior.
Provided product material and approved connectors can explain intent or add
context, but they do not silently override implementation evidence.

When sources disagree, preserve both claims, label their source and confidence,
and explain whether each describes current, intended, historical, or observed
behavior. Missing optional evidence is a grey zone, not permission to invent a
fact.

## Required artifacts

Create all three files only after the user requests durable documentation and
confirms any replacement of existing files.

### `docs/onboarding/index.html`

Include the system summary, first-day reading order, links to the two detail
documents, evidence-label legend, known gaps, and safe first tasks for a new
engineer.

### `docs/onboarding/product-business.html`

Include:

1. Product context and problem statement.
2. Actors, external systems, and ownership boundaries.
3. Business capabilities and domain vocabulary.
4. End-to-end business flows with evidence labels on inferred steps.
5. Important lifecycle, policy, and failure conditions visible from evidence.
6. Open questions for a product owner or domain expert.

Use a context map and business-flow diagrams. Do not call this document a C4
diagram; C4 is reserved for the technical model.

### `docs/onboarding/technical-architecture.html`

Include:

1. C1 System Context: people, neighboring systems, and trust boundaries.
2. C2 Containers: applications, services, workers, data stores, queues, and
   their protocols or responsibilities.
3. C3 Components: only components that own a primary business flow or shared
   technical boundary.
4. Selective C4/code level: entrypoint-to-core call paths for the few flows a
   new engineer must understand. Do not diagram every class or function.
5. Runtime/startup model, configuration ownership, data flow, auth/error
   boundaries, and test strategy.
6. Safe implementation entry points, including file/symbol references and
   CodeGraph call paths.

Represent C4 with readable Mermaid diagrams. Attach evidence labels in nearby
tables or callouts rather than cluttering every diagram node.

## Source-only behavior

Source-only analysis must still create a complete structure. Prefer
`inferred-from-source` and `needs-confirmation` over invented product intent.
Use user-supplied material to upgrade statements only when it directly supports
them.
