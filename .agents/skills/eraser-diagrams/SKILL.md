---
name: eraser-diagrams
description: Create architecture, flowchart, sequence, ERD, or BPMN diagrams from a request or project files using Eraser DSL; render through the Eraser API when a token is available.
license: MIT
metadata:
  version: "2.1.0"
  author: Eraser Labs
  tags: diagram, architecture, infrastructure, flowchart, sequence, erd, bpmn
---

# Eraser diagrams

Use this skill when the user asks for an Eraser diagram or a diagram that benefits from editable Eraser DSL. It works in Codex and Claude Code. For a diagram based on a codebase or infrastructure, inspect the relevant source files first and label inferred relationships as inferences.

## Choose the diagram type

| Need | `--diagram-type` | Read when needed |
| --- | --- | --- |
| Infrastructure and system components | `cloud-architecture-diagram` | [Architecture syntax](references/syntax/architecture-syntax.md) and [examples](references/examples/examples-architecture.md) |
| Process and decisions | `flowchart-diagram` | [Flowchart syntax](references/syntax/flowchart-syntax.md) and [examples](references/examples/examples-flowchart.md) |
| Messages over time | `sequence-diagram` | [Sequence syntax](references/syntax/sequence-syntax.md) and [examples](references/examples/examples-sequence.md) |
| Data entities and relations | `entity-relationship-diagram` | [ERD syntax](references/syntax/erd-syntax.md) and [examples](references/examples/examples-erd.md) |
| Roles and swimlanes | `bpmn-diagram` | [BPMN syntax](references/syntax/bpmn-syntax.md) and [examples](references/examples/examples-bpmn.md) |

For icons and visual rules, consult [common icons](references/icons-quick-reference.md), the [complete icon list](references/eraser-standard-icons.csv), or [styling](references/styling.md) only when the request needs them. For Terraform and AWS input, the [IaC example](references/examples/examples-iac-aws-guide.md) may help.

## Workflow

1. Identify the components, relationships, and diagram type. Keep names and edges grounded in the user's description or inspected files.
2. Write valid Eraser DSL to a UTF-8 `.eraser` file. Check unique node names, matching braces, references to defined nodes, and appropriate icons.
3. If `ERASER_API_TOKEN` is available, render with the bundled script. The path below assumes this repository's layout; use the installed skill path elsewhere. Use `--team-id` when using an organization token:

   ```bash
   python3 .agents/skills/eraser-diagrams/scripts/render.py diagram.eraser \
     --diagram-type cloud-architecture-diagram
   ```

4. Read the JSON response. `imageUrl` is the rendered PNG and normally expires; `createEraserFileUrl` lets the user create an editable Eraser file. Share the DSL file and the returned links. If the user needs a durable local image, download the PNG while the link is valid.

The script sends `POST https://app.eraser.io/api/render/elements` with the DSL in `elements[0].code` and an authorization bearer token. It reads the token from the environment and does not print it. The API requires an Eraser token; if one is unavailable, deliver the DSL and explain that rendering needs `ERASER_API_TOKEN`. Do not claim an image was generated without a successful API response.

For current request fields and response behavior, use the [official Eraser DSL render API](https://docs.eraser.io/reference/generate-diagram-from-eraser-dsl) and [token guide](https://docs.eraser.io/reference/api-token).
