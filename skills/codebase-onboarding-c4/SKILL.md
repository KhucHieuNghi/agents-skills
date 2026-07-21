---
name: codebase-onboarding-c4
description: Use when an engineer needs to understand product and business journeys, C4 architecture, runtime boundaries, major dependencies, or safe implementation entry points in a large unfamiliar codebase.
---

# Codebase Onboarding C4

Map an unfamiliar system before changing it. Return evidence-backed findings in
chat first; create or replace onboarding artifacts only after user approval.

For installation, invocation, examples, and troubleshooting, follow
`references/real-project-usage.md`.

## Preconditions

Run these read-only checks first:

```bash
codegraph --version
rtk --version
git status --short
codegraph status
```

If CodeGraph or RTK is unavailable, report the missing prerequisite. If the
project has no valid CodeGraph index, ask before running `codegraph init`. Never
install global tools, change agent configuration, or create an index implicitly.

## Required contracts

Read these references before forming conclusions:

1. `references/product-business-journey.md`
2. `references/technical-c4-navigation.md`
3. `references/evidence-and-output-contract.md`
4. `references/adaptive-coordinator.md`

Use Quick, Standard, or Deep depth as defined by the Product Journey and
Technical C4 contracts. Follow the coordinator for stages, routing, external
access, root ownership, quality gates, and targeted retries.

## Investigation tools

Use compact RTK commands to establish repository boundaries. Use CodeGraph
first for structural questions about entrypoints, routes, calls, data paths,
ownership, and impact. Read raw source when the graph is stale or lacks the
required detail; do not replace structural exploration with broad grep loops.

Record evidence before conclusions. Preserve contradictory sources and use
`inferred-from-source` or `needs-confirmation` instead of inventing intent.

## Artifact generation

Check existing target files and ask before replacing them. Use
`html-docs-standard` for light-only responsive HTML and Mermaid diagrams. Keep
artifacts free of credentials, private URLs, customer data, and unsupported
business claims.

## Completion report

Report the mode, primary Journey ID, Product Journey coverage, C4 levels,
Engineering Navigation, important evidence paths, quality-gate status,
contradictions, grey zones, and next concrete action. Assess implementation
readiness only for a named bounded task.
