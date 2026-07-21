---
name: codebase-onboarding-c4
description: Create evidence-backed onboarding for a large unfamiliar codebase using CodeGraph and RTK. Use when an engineer needs to understand product and business flows, C4 technical architecture, runtime boundaries, or safe implementation entry points before changing a system.
---

# Codebase Onboarding C4

Map an unfamiliar system before changing it. Produce chat findings by default;
create onboarding artifacts only when the user asks for files.

For installation, invocation prompts, execution routing, external-access
approval, readiness, resume, examples, and troubleshooting, follow
`references/real-project-usage.md`.

## Preconditions

Run these read-only checks first:

```bash
codegraph --version
rtk --version
git status --short
codegraph status
```

If `codegraph` or `rtk` is unavailable, stop and provide the missing tool's
official installation command. If the project has no valid CodeGraph index,
stop and ask permission before running `codegraph init`. Never install global
tools, change agent configuration, or create an index implicitly.

## Investigation workflow

1. Read `references/evidence-and-output-contract.md` before forming a model.
2. Establish repository boundaries with compact RTK commands such as `rtk ls`,
   `rtk grep -r "<pattern>" .`, `rtk read <file>`, and `rtk git log`.
3. Use CodeGraph first for every structural question: entrypoints, routes,
   request paths, data paths, ownership, callers, callees, and impact. Use the
   CodeGraph MCP tool when available; otherwise run `codegraph explore`.
4. Read raw source only when CodeGraph reports a staleness banner or a detail is
   absent from the graph. Do not replace CodeGraph exploration with broad grep
   loops.
5. Record evidence before writing conclusions. Label every important statement
   using the evidence labels in the reference.
6. Build product/business understanding from supplied product material first.
   When only source is available, infer cautiously from routes, UI copy,
   configuration, tests, and domain names; mark those conclusions as inferred.
7. Present the evidence-backed model in chat. Ask before creating or replacing
   files.

## Execution routing

Begin inline to establish one shared system, business, and ownership map. Use
subagents only for two or more bounded, independent, read-only investigation
tracks when the runtime supports them. The root agent retains user interaction,
access approval, evidence reconciliation, readiness, and artifact writes. If a
subagent is unavailable or fails, continue the same investigation contract
inline.

## Artifact generation

When the user requests durable onboarding, first check whether these files
already exist and ask before replacing any of them:

```text
docs/onboarding/index.html
docs/onboarding/product-business.html
docs/onboarding/technical-architecture.html
```

Use the `html-docs-standard` skill for all HTML artifacts. Keep the output
light-only, responsive, and free of credentials, private URLs, customer data,
or unsupported business claims. Use Mermaid diagrams for C4 and flow diagrams.
Run the HTML Documentation Standard verifier after generating each artifact.

## Completion report

Report the documents created or updated, the most important evidence paths,
the C4 levels covered, unresolved questions, and the safest first implementation
area for a new engineer.
