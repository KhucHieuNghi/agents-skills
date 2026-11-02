# Taste Skill upstream review

Reviewed on 2026-10-31 for the Codex and Claude Code catalog. This record
covers the current primary [Taste Skill repository](https://github.com/Leonxlnx/taste-skill)
and the public [website](https://www.tasteskill.dev/). The website still
describes a larger collection and v2 as experimental. At the reviewed Git
revision, the primary repository contains **one** installable skill,
`design-taste-frontend`. The [README](https://github.com/Leonxlnx/taste-skill/blob/12af471f627f866411b4bd785b19646d3672784c/README.md)
points to separate repositories for the earlier [classic variants](https://github.com/Leonxlnx/taste-skill-classics)
and [image-generation variants](https://github.com/Leonxlnx/imagegen-skills).
Those are distinct candidates requiring their own source, license, digest,
behavior, and commercial review; they are not silently bundled here.

## Pinned source and provenance

| Field                     | Reviewed value                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website                   | <https://www.tasteskill.dev/>                                                                                                                                                        |
| Canonical source          | <https://github.com/Leonxlnx/taste-skill>                                                                                                                                            |
| Revision                  | [`12af471f627f866411b4bd785b19646d3672784c`](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c)                                                  |
| Release                   | [`v2.1.5`](https://github.com/Leonxlnx/taste-skill/blob/12af471f627f866411b4bd785b19646d3672784c/CHANGELOG.md), dated 2026-10-25; the tag and reviewed HEAD point to the same commit |
| Source folder             | [`skills/taste-skill/`](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill)                                                    |
| Declared/install name     | `design-taste-frontend` in `SKILL.md` frontmatter                                                                                                                                    |
| SHA-256 skill-tree digest | `59f9a7c7d8b287b6340e679e0da5e42f841d871703884d6f55b3dc1be0849e0f`                                                                                                                   |
| License                   | [MIT](https://github.com/Leonxlnx/taste-skill/blob/12af471f627f866411b4bd785b19646d3672784c/LICENSE); attribution: Leonxlnx and Taste Skill contributors                             |
| Local modifications       | None to the copied skill tree; installed folder renamed to the declared skill name                                                                                                   |
| Catalog use               | `campaign-website` authoring profile; not a released Solution Skill component                                                                                                        |

The `catalog.yaml` upstream record and `skills-lock.json` pin the exact source.
The copied [license notice](../licenses/design-taste-frontend-MIT.txt) matches
the upstream root `LICENSE` byte for byte. The local skill tree under
`.agents/skills/design-taste-frontend/` matches the pinned upstream
`skills/taste-skill/` byte for byte; Claude Code resolves the same copy through
`.claude/skills/design-taste-frontend`.

## What the skill does

The [skill instructions](https://github.com/Leonxlnx/taste-skill/blob/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill/SKILL.md)
describe two distinct runs: public pages and working app screens. For pages,
the workflow inventories the subject and claims, selects from twenty design
directions with `draw.mjs`, writes the copy, builds the page, checks it with
`lint.mjs` and a real browser via `inspect.mjs`, then reviews screenshots at
1440, 768, and 390 px. App screens have separate direction and inspection
rules in `references/app-screens.md`. The folder includes scripts, references,
and assets; a single `SKILL.md` file would be incomplete.

The skill is useful for NKSkills page design and visual review. Its study and
blind-review outcomes are **upstream author claims**, not independently
replicated NKSkills findings. We have not measured whether it improves our
landing's conversion or user comprehension. The v2.1.5 changelog includes
browser inspection and accessibility fixes; the pinned revision is the unit
of review, rather than a floating `main` branch.

In the existing `campaign-website` profile, `copywriting` informs customer
messaging, `frontend-design` and Taste Skill guide implementation and visual
review, and Hallmark supplies another visual perspective. The profile is an
authoring recipe, not an ordered or evaluated commercial combo. Taste Skill's
own no-ornament rules can conflict with the approved NKSkills theme; that is
why its direction generator should preserve the project's palette and type.

## Host and commercial fit

- The upstream scripts request Node.js 22+ and installed Chrome, Edge, or
  Chromium for browser inspection. `assets.mjs` makes network requests to
  image collections and requires no API key. `draw.mjs` stores a direction
  history at `~/.taste-skill/history.json` by default; `inspect.mjs` uses a
  temporary browser profile. Project working files go under `.taste-skill/`.
- The repository license permits commercial use and redistribution with the
  required notice. It does **not** grant rights to images, video, fonts, logos,
  or other external assets found by `assets.mjs`. Its search defaults to public
  domain, CC0, CC BY, or CC BY-SA candidates; each selected asset still needs
  its own license, credit, and suitability check before a customer release.
- The upstream folder is `skills/taste-skill`, while `SKILL.md` declares
  `design-taste-frontend`. The [Agent Skills specification](https://agentskills.io/specification)
  requires the name to match the containing folder. A raw source-folder
  validation therefore fails. `npx skills add` normalizes the installed folder
  to the declared name, and NKSkills' `sourceSkillPath` mapping does the same
  for `apply-profile`. The canonical local package validates without weakening
  the general validator.
- For NKSkills-owned pages, [root `DESIGN.md`](../../DESIGN.md) is the approved
  brand source: Fraunces and Source Sans 3, warm palette, shape, hierarchy, and
  status treatment. Use the upstream `--keep palette,type` option when drawing
  a direction. Its default house rules are design suggestions where they
  conflict with approved brand or factual content. Preserve real release
  status, versions, and product claims. A customer's generated work instead
  follows that customer's brand profile.

The current decision is to keep this as a **pinned authoring Upstream Skill**
for Codex and Claude Code. Catalog inclusion and an MIT license alone do not
establish a customer-facing Solution Skill. Such a release would need a defined
output contract, a host trial on both supported hosts, asset provenance, and
its own versioned release lock.

## Checks performed

- Compared `git ls-remote` HEAD and tag `v2.1.5` with the pinned commit.
- Recomputed the repository's SHA-256 skill-tree digest for the upstream
  folder and local copy; both match `catalog.yaml`. Compared the two trees and
  the root MIT license byte for byte.
- Ran the upstream draw and inspect scripts through `node --check`.
- In an isolated temporary project, installed the reviewed source through
  `npx skills add` for Codex and Claude Code. It installed the declared
  `design-taste-frontend` folder and shared it between hosts.
- Exercised the catalog's folder-to-name mapping in `apply-profile` tests and
  retained strict rejection of unsafe `sourceSkillPath` values.
- Ran `check-upstreams --fail-on-update`: Taste Skill remained at the latest
  reviewed HEAD with the same digest. The command exited with status 2 because
  several _other_ pinned upstreams have newer candidates; those require their
  own separate review and do not change this Taste Skill pin.

The upstream scripts' full browser workflow and the skill's claimed visual
quality improvement were not independently evaluated in this review.
