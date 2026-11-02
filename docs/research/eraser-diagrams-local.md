# Eraser diagrams local authoring skill

Reviewed on 2026-11-02 while consolidating the local worktree. The
[`eraser-diagrams` skill](../../.agents/skills/eraser-diagrams/SKILL.md) is a
working Codex and Claude Code authoring tool. It is **not** a component of a
released Solution Skill or a commercially reviewed Upstream Skill.

## Provenance and status

| Field                              | Record                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Historical source                  | [eraserlabs/eraser-io](https://github.com/eraserlabs/eraser-io), `skills/eraser-diagrams/`                                                                                                                                                 |
| Historical revision                | Unknown. The old installation lock recorded a folder hash and installation date, not a Git commit.                                                                                                                                         |
| Current upstream baseline observed | [`30d6f3679f597eeae67bacab5ee733c863686177`](https://github.com/eraserlabs/eraser-io/tree/30d6f3679f597eeae67bacab5ee733c863686177/skills/eraser-diagrams), tree digest `9464ef70e3465ebf874db4a3fe7a4556297b1561249d1eba6a917ab8207613cb` |
| Local tree                         | Version `2.1.0` in frontmatter; tree digest `b9e179e9da565b400a3d315aec00ca3529d4385ab2fc639058559f48af8612a3`                                                                                                                             |
| License                            | [MIT](https://github.com/eraserlabs/eraser-io/blob/30d6f3679f597eeae67bacab5ee733c863686177/LICENSE); [notice copy](../licenses/eraser-diagrams-MIT.txt)                                                                                   |

The current upstream baseline is **not** asserted to be the source revision of
the local copy. The local skill rewrites the entrypoint, retains and reorganizes
syntax references, adds examples and icon references, and adds a Python render
script. The current source and local tree have different digests. A later
commercial inclusion requires a reviewed derivation baseline, exact component
lock, attribution, and a Codex and Claude Code trial.

## Runtime boundary

The script posts Eraser DSL to the official
[`/api/render/elements` endpoint](https://docs.eraser.io/reference/generate-diagram-from-eraser-dsl)
using `ERASER_API_TOKEN` from the environment. The official API requires a
bearer token and may bill the selected team; organization tokens require a
`teamId`. The skill can still deliver editable DSL without rendering. The
offline unit test mocks the network request and checks the payload and token
header; no live render was performed for this review.
