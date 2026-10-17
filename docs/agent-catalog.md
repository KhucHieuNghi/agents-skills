# Catalog status

The [root catalog](../catalog.yaml) is the machine-readable index. See the
[product model](product-model.md) for the distinction between an Upstream Skill,
a bundled component, an experimental profile, and a released Solution Skill.

| Item                                                                  | Type              | V1 status                                                             |
| --------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------- |
| `hallmark`                                                            | Upstream Skill    | Pinned MIT source, included in `codebase-onboarding@1.1.0`            |
| `html-slides-reference`                                               | Upstream Skill    | Pinned current source for monitoring; original rewrite base unknown   |
| `archify`                                                             | Upstream Skill    | Pinned MIT source for interactive, validated diagrams; discovery only |
| `diagram-design`                                                      | Upstream Skill    | Pinned MIT source for branded HTML/SVG diagrams; discovery only       |
| [`codebase-onboarding-c4`](../skills/codebase-onboarding-c4/SKILL.md) | Bundled component | Entrypoint of the V1 solution                                         |
| [`html-docs-standard`](../skills/html-docs-standard/SKILL.md)         | Bundled component | Included in the V1 solution                                           |
| [`html-slides`](../skills/html-slides/SKILL.md)                       | Bundled component | Presentation profile only; no V1 solution release                     |
| [`codebase-onboarding`](../solutions/codebase-onboarding.yaml)        | Solution Skill    | Version `1.1.0`, Codex and Claude Code                                |
| `documentation`, `hallmark-landing`, `presentation`                   | Profiles          | Discovery recipes, not released products                              |

The product release has its own version and lock. Upstream updates are candidates
for review, not automatic changes to a customer installation.
The two diagram upstreams are tracked by `check-upstreams`. They are not
components of `codebase-onboarding@1.1.0`; compatibility, output quality, and
third-party notices need review before a future Solution Skill includes them.
See the [diagram upstream review](research/diagram-upstreams.md) for the pinned
source evidence and integration observations.
The [current technical release record](releases/1.1.0.md) lists the generated
artifact hashes and verification evidence.
