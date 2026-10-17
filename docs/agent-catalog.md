# Catalog status

The [root catalog](../catalog.yaml) is the machine-readable index. See the
[product model](product-model.md) for the distinction between an Upstream Skill,
a bundled component, an experimental profile, and a released Solution Skill.

| Item                                                                  | Type              | V1 status                                                           |
| --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| `hallmark`                                                            | Upstream Skill    | Pinned MIT source, included in `codebase-onboarding@1.0.0`          |
| `html-slides-reference`                                               | Upstream Skill    | Pinned current source for monitoring; original rewrite base unknown |
| [`codebase-onboarding-c4`](../skills/codebase-onboarding-c4/SKILL.md) | Bundled component | Entrypoint of the V1 solution                                       |
| [`html-docs-standard`](../skills/html-docs-standard/SKILL.md)         | Bundled component | Included in the V1 solution                                         |
| [`html-slides`](../skills/html-slides/SKILL.md)                       | Bundled component | Presentation profile only; no V1 solution release                   |
| [`codebase-onboarding`](../solutions/codebase-onboarding.yaml)        | Solution Skill    | Version `1.0.0`, Codex and Claude Code                              |
| `documentation`, `hallmark-landing`, `presentation`                   | Profiles          | Discovery recipes, not released products                            |

The product release has its own version and lock. Upstream updates are candidates
for review, not automatic changes to a customer installation.
The [V1 technical release record](releases/1.0.0.md) lists the generated
artifact hashes and verification evidence.
