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

## Contract ownership

Use `product-business-journey.md` for journey selection, mode depth, required
business structure, and Product-document boundaries. Use
`technical-c4-navigation.md` for C1, C2, selective C3, technical views, and
Engineering Navigation. This reference owns evidence labels, source precedence,
contradictions, and source-only behavior.

## Source-only behavior

Source-only analysis must still create a complete structure. Prefer
`inferred-from-source` and `needs-confirmation` over invented product intent.
Use user-supplied material to upgrade statements only when it directly supports
them.
