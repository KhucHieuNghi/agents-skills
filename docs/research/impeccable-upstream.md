# Impeccable upstream review

Reviewed on 2026-10-31 for the Codex and Claude Code catalog. The public
[website](https://impeccable.style/) points to the
[pbakaus/impeccable repository](https://github.com/pbakaus/impeccable).
Impeccable is **one main skill** with a vocabulary of 24 commands, design
context, live iteration, and an optional deterministic detector. Its author
reports 62 detector rules. These are upstream product claims; NKSkills has
not independently measured visual improvement or detector accuracy.

## Pinned source

| Field               | Reviewed value                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository          | <https://github.com/pbakaus/impeccable>                                                                                                                                                                                               |
| Revision            | [`b7a89176e4e87422b40f98adabceb051dbb5448b`](https://github.com/pbakaus/impeccable/tree/b7a89176e4e87422b40f98adabceb051dbb5448b), remote HEAD when reviewed                                                                          |
| Version             | `4.8.0` in the skill frontmatter and root `package.json`; this commit is **after** the `skill-v4.8.0` tag and includes later fixes, so it is recorded by commit rather than called the release tag                                    |
| Codex skill         | [`.agents/skills/impeccable/`](https://github.com/pbakaus/impeccable/tree/b7a89176e4e87422b40f98adabceb051dbb5448b/.agents/skills/impeccable); SHA-256 tree digest `ded6a9fbe471d05804dc9a2cf831d1c02cff5aa169a3a318cd51552189e96006` |
| Claude Code skill   | [`.claude/skills/impeccable/`](https://github.com/pbakaus/impeccable/tree/b7a89176e4e87422b40f98adabceb051dbb5448b/.claude/skills/impeccable); SHA-256 tree digest `314a6a967a425ac1fa6f31fc60e31c2aa45727b2780ebbbfe7a2c0f67a1c2821` |
| License             | [Apache-2.0](https://github.com/pbakaus/impeccable/blob/b7a89176e4e87422b40f98adabceb051dbb5448b/LICENSE); author Paul Bakaus and contributors                                                                                        |
| Third-party notice  | [Root `NOTICE.md`](https://github.com/pbakaus/impeccable/blob/b7a89176e4e87422b40f98adabceb051dbb5448b/NOTICE.md) credits ehmo's MIT-licensed platform design material                                                                |
| Local modifications | None; source is tracked in the catalog and has not been copied into NKSkills' installed skill folders                                                                                                                                 |
| Catalog status      | Discovery and composition candidate, not an installed authoring profile component or customer-facing Solution Skill                                                                                                                   |

The two host trees are **not byte-identical**. Their `SKILL.md` files and many
references use host-specific paths and frontmatter, and the Codex tree includes
additional agent definitions. The catalog therefore records both digests and
the upstream checker watches both. NKSkills' current Solution Skill installer
copies one canonical folder and links it to Claude Code; it cannot preserve
these two native variants. A host-aware packaging path and trial are required
before Impeccable can become a released component. The release builder rejects
upstreams with host variants until that path exists.

## Capabilities and operating model

The pinned [README](https://github.com/pbakaus/impeccable/blob/b7a89176e4e87422b40f98adabceb051dbb5448b/README.md)
describes `init` for `PRODUCT.md`, `document` for `DESIGN.md`, focused commands
such as `shape`, `typeset`, `layout`, `critique`, `audit`, `polish`, `adapt`, and
`harden`, plus live browser iteration. The design modes distinguish persuasive
pages, working interfaces, reading surfaces, and experiential work. The
[detector](https://impeccable.style/docs/detector/) scans source or a rendered
URL; the latter can check actual layout and contrast. Its exit status is 0 for
no primary finding, 2 for findings, and 1 for a scan failure. An optional
[hook](https://impeccable.style/docs/hooks/) feeds findings back to Codex or
Claude Code after UI edits and at task end; each host still has to trust its
hook definition.

The skill launcher runs a platform engine next to the skill, from a local
cache, or downloads it on first use. The reviewed tree includes a pinned
`engine-checksums.txt` and verifies downloaded engine bytes. The official
installer uses Node.js 18.19+; the skill itself is designed to run without
Node once installed. A copied instruction folder alone does not constitute an
offline, self-contained customer release.

The [privacy policy](https://impeccable.style/privacy/) says local detection
does not upload project files or findings. Version checks, software downloads,
and visual-direction requests can still use the network. A choice report is
optional and can be disabled; the visual-direction request remains unless a
local catalog supplies it. A commercial combo needs an explicit network and
privacy contract before enabling these features for customers.

## Recommended authoring sequence and evaluation status

| Stage                    | Proposed owner                             | Reason                                                                               |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Brief and constraints    | NKSkills workflow and approved `DESIGN.md` | Preserve product facts, brand, fonts, palette, and page structure.                   |
| Initial visual direction | `design-taste-frontend`                    | Deal a subject-specific direction and inspect screenshots at multiple widths.        |
| Focused refinement       | `impeccable`                               | Critique or polish a named page or component against the existing design system.     |
| Mechanical quality check | Impeccable detector plus normal site tests | Report issues in code and a rendered page; review false positives and final visuals. |

At the product owner's direction, NKSkills recommends this sequence for website
authoring. Its claimed quality advantage is a **hypothesis**, not an evaluated
finding. Both skills
can propose art direction and both can review visuals. Running their full
blank-slate instructions at once could produce conflicting guidance or an
unplanned redesign. For NKSkills, Taste should keep the existing palette and
type, and Impeccable should refine against the approved [root design system](../../DESIGN.md).
`document` must not overwrite a design decision without review. The user's
brief, factual content, and status labels take priority over either upstream's
stylistic defaults. A pilot should compare the pair with each skill alone on
the same page, record screenshots and detector output, and obtain human review
before calling the combination a Solution Skill.

## Commercial and versioning decision

Apache-2.0 permits commercial redistribution subject to its conditions; the
upstream LICENSE and NOTICE must travel with a redistributed package. Asset
generation, external images, fonts, model calls, and downloads may have
separate rights or costs. The upstream changelog and Git commits can signal
new versions, but the catalog remains pinned until a reviewer checks source,
host variants, license/notice, engine behavior, and a dual-host trial. No
automatic upstream pull changes a customer release.

**Decision:** track Impeccable as an Upstream Skill candidate and describe the
recommended authoring sequence on the landing. Do not add it to the current `campaign-website`
profile or present the pair as commercially ready until host-aware installation
and comparative evaluation are complete.

## Checks performed

- Resolved remote HEAD and `skill-v4.8.0`, inspected the reviewed commit,
  `SKILL.md` files, package metadata, launcher, root LICENSE, and NOTICE.
- Computed separate SHA-256 tree digests for Codex and Claude Code source
  folders; both are pinned in `catalog.yaml`.
- Compared the two host folders and confirmed their contents differ.
- Validated the Codex source skill with the repository's skill validator.
- Added a test in which only the Claude tree changes; `check-upstreams`
  reports an update even while the Codex digest stays fixed.

The full Impeccable engine and browser workflow were not run as part of this
catalog review. No improvement claim is based on an NKSkills experiment yet.
