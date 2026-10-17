# Repository instructions

This repository builds a commercial catalog of curated Upstream Skills and
versioned Solution Skills. **Codex and Claude Code are the only supported
hosts.** Do not add targets, manifests, or setup instructions for other agents.

## Source of truth

- [`catalog.yaml`](catalog.yaml) indexes public upstream records, bundled
  skills, discovery profiles, and released solutions.
- [`solutions/`](solutions/codebase-onboarding.yaml) contains Solution Skill
  manifests and locked component digests.
- [`skills/`](skills/codebase-onboarding-c4/SKILL.md) contains bundled skill
  packages. Their `SKILL.md` files link detailed references and scripts.
- [`src/`](src/cli.ts) is the TypeScript CLI for source staging, validation,
  release builds, installs, and upgrades.
- [`docs/product-model.md`](docs/product-model.md) defines the two product
  types. [`docs/agent-catalog.md`](docs/agent-catalog.md) records current
  release status. [`docs/guides/technical-v1.md`](docs/guides/technical-v1.md)
  documents the publisher and customer workflow.

## Working agreements

- Treat an upstream commit and its skill digest as immutable. Review new
  upstream content, attribution, license, and compatibility before changing a
  pin. Never let `check-upstreams` update a release automatically.
- A Solution Skill has its own version, outcome, entrypoint, quality gates, and
  complete component lock. Do not call an experimental catalog profile a
  commercial release.
- Keep each host's installation path separate: Codex uses `.agents/skills/`
  and Claude Code uses `.claude/skills/`. Verify current CLI behavior against
  official host documentation before changing these paths or commands.
- Do not pin a model in skill metadata or agent definitions without a specific
  product reason. Let the host select its configured model.
- Keep skill entrypoints concise and link to detailed references. Preserve the
  read-only evidence boundary in `codebase-onboarding-c4`; durable writes and
  external access remain governed by its approval and quality contracts.
- Do not represent the `html-slides` rewrite's original upstream derivation
  commit as known. The current upstream record is a reviewed baseline only.

## Verification

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, and `git diff --check`. When a skill changes, validate its
package and rebuild any release whose locked digest changes. For a release
change, build the versioned archive and install the extracted archive into a
fresh project for both hosts. Check links, license notices, component digests,
and the project installation lock.

Start with [README.md](README.md), then the [catalog](docs/agent-catalog.md)
and [technical guide](docs/guides/technical-v1.md).
