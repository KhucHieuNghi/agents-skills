# Catalog status

The [root catalog](../catalog.yaml) is the machine-readable index. See the
[product model](product-model.md) for the distinction between an Upstream Skill,
a bundled component, an experimental profile, and a released Solution Skill.

| Item                                                                        | Type              | V1 status                                                                                               |
| --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `hallmark`                                                                  | Upstream Skill    | Pinned MIT source, included in `codebase-onboarding@1.1.0`                                              |
| `html-slides-reference`                                                     | Upstream Skill    | Pinned current source for monitoring; original rewrite base unknown                                     |
| `archify`                                                                   | Upstream Skill    | Pinned MIT source for interactive, validated diagrams; discovery only                                   |
| `diagram-design`                                                            | Upstream Skill    | Pinned MIT source; included in `problem-presentation@0.1.0`                                             |
| `visual-explainer`                                                          | Upstream Skill    | Pinned MIT slide engine; included in `problem-presentation@0.1.0`                                       |
| [`frontend-design`](../skills/frontend-design/SKILL.md)                     | Upstream Skill    | Pinned Apache-2.0 design authoring tool for this website                                                |
| [`copywriting`](../skills/copywriting/SKILL.md)                             | Upstream Skill    | Pinned MIT copy authoring tool for this website                                                         |
| [`design-taste-frontend`](../.agents/skills/design-taste-frontend/SKILL.md) | Upstream Skill    | Pinned v2.1.5 MIT authoring tool; [research](research/taste-skill-upstream.md)                          |
| [`impeccable`](research/impeccable-upstream.md)                             | Upstream Skill    | Pinned Apache-2.0 host variants; recommended with Taste, unreleased                                     |
| [`security-audit`](research/security-upstreams.md)                          | Upstream Skill    | Pinned MIT Cloudflare audit source; tracked, unreleased                                                 |
| [`security-review`](research/security-upstreams.md)                         | Upstream Skill    | Pinned Sentry review source; OWASP-derived CC BY-SA reference material needs commercial license review  |
| [`security-and-hardening`](research/security-upstreams.md)                  | Upstream Skill    | Pinned MIT Addy Osmani source; external checklist prevents standalone packaging                         |
| [`security-best-practices`](research/security-upstreams.md)                 | Upstream Skill    | Pinned Apache-2.0 OpenAI source; nested skill requires host packaging trials                            |
| [`eraser-diagrams`](../.agents/skills/eraser-diagrams/SKILL.md)             | Local authoring   | Editable diagram helper; [historical source pin unknown](research/eraser-diagrams-local.md), unreleased |
| [`codebase-onboarding-c4`](../skills/codebase-onboarding-c4/SKILL.md)       | Bundled component | Entrypoint of the V1 solution                                                                           |
| [`html-docs-standard`](../skills/html-docs-standard/SKILL.md)               | Bundled component | Included in the V1 solution                                                                             |
| [`html-slides`](../skills/html-slides/SKILL.md)                             | Bundled component | Presentation profile only; no V1 solution release                                                       |
| [`problem-presentation`](../skills/problem-presentation/SKILL.md)           | Bundled component | Entrypoint of the presentation solution candidate                                                       |
| [`presentation-brand`](../skills/presentation-brand/SKILL.md)               | Bundled component | Brand sourcing and provisional identity for the presentation                                            |
| [`codebase-onboarding`](../solutions/codebase-onboarding.yaml)              | Solution Skill    | Version `1.1.0`, Codex and Claude Code                                                                  |
| [`problem-presentation`](../solutions/problem-presentation.yaml)            | Solution Skill    | Version `0.1.0` evaluation candidate; commercial gate still open                                        |
| `documentation`, `hallmark-landing`, `presentation`, `campaign-website`     | Profiles          | Discovery and authoring recipes, not released products                                                  |

The product release has its own version and lock. Upstream updates are candidates
for review, not automatic changes to a customer installation.
`frontend-design`, `copywriting`, and `design-taste-frontend` are installed in
the project for Codex and Claude Code authoring through `.agents/skills/` and
`.claude/skills/`. Their pinned source, license, and digest are in the catalog;
they are not components of a customer-facing Solution Skill. The Marketing
Skills and Taste Skill root MIT licenses are copied to
[`docs/licenses/copywriting-MIT.txt`](licenses/copywriting-MIT.txt) and
[`docs/licenses/design-taste-frontend-MIT.txt`](licenses/design-taste-frontend-MIT.txt).
The Taste Skill [source folder](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill)
is named `taste-skill`, while its declared and installed name is
`design-taste-frontend`. The catalog's `sourceSkillPath` maps that source
folder to the canonical install name for `campaign-website`; the raw upstream
folder does not pass our strict package-directory validator. See the
[source review](research/taste-skill-upstream.md) before using it in another
profile or Solution Skill.
Impeccable is tracked separately with [Codex and Claude Code source digests](research/impeccable-upstream.md).
Its upstream host builds differ, so it is not installed through the current
shared-folder profile or included in a customer release. Taste Skill →
Impeccable is the product owner's recommended website-authoring sequence. Its
relative effectiveness remains an untested hypothesis; the recommendation
does not make it a released Solution Skill.
The two diagram upstreams are tracked by `check-upstreams`. They are not
components of `codebase-onboarding@1.1.0`; Diagram Design is now a pinned
component of `problem-presentation@0.1.0`. Archify remains a discovery
candidate.
See the [diagram upstream review](research/diagram-upstreams.md) for the pinned
source evidence and integration observations.
The four [security upstreams](research/security-upstreams.md) are tracked under
the `security` topic. None is a bundled component or security Solution Skill;
their different reporting contracts, execution prerequisites, and packaging
limits need separate review before commercial composition.
The [earlier presentation pilot](research/problem-presentation-pilot.html) was
manually authored. The [new pilot deck](research/problem-presentation-solution-pilot/deck.html)
and [evaluation](research/problem-presentation-solution-evaluation.md) exercise
the versioned composition and record the remaining host trial gate.
The [current technical release record](releases/1.1.0.md) lists the generated
artifact hashes and verification evidence.
