# Agent Skills V1

This repository builds a curated catalog for **Codex** and **Claude Code**. It
has two product types:

| Type               | Contract                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Upstream Skill** | A public skill grouped by topic and recorded with its canonical repository, exact Git commit, skill path, SHA-256 tree digest, license, attribution, and local change history. |
| **Solution Skill** | A customer-facing workflow with its own semantic version, outcome, entrypoint, ordered components, quality gates, and a release lock.                                          |

The first V1 Solution Skill is [`codebase-onboarding`](solutions/codebase-onboarding.yaml).
Its entrypoint is [`codebase-onboarding-c4`](skills/codebase-onboarding-c4/SKILL.md),
supported by `html-docs-standard` and a pinned Hallmark snapshot. It produces
an evidence-backed Product/Business and C4 engineering onboarding handoff.
Other entries in [`catalog.yaml`](catalog.yaml) remain discovery profiles; they
are not V1 Solution Skill releases.

## Technical V1 workflow

The author builds an immutable, self-contained release. A customer receives a
CLI archive with bundled runtime dependencies, a Solution Skill archive, and
their separately recorded hashes. The target machine does not need this
repository, npm registry access, or live access to the public upstream when
installing the release.

### Author: inspect and build

Node.js 22 or later, npm, and Git are required. From this repository:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
node dist/cli.js check-upstreams --fail-on-update
node dist/cli.js build-solution codebase-onboarding \
  --output build/codebase-onboarding-1.0.0
npm pack --pack-destination build
```

`build-solution` prints the release directory digest, archive path, and archive
digest. The generated `build/` directory is ignored by Git. Preserve those
hashes in the release record delivered to customers. A source update changes
neither the pinned commit nor an existing Solution Skill version; review the
diff, license, behavior, and hashes before releasing a new version.

The archive contains `solution-release.json`, component folders under
`skills/`, `NOTICE.md`, the product `LICENSE`, and the pinned upstream license
text. The release can be rebuilt from this repository and the recorded public
commit. See the [technical release guide](docs/guides/technical-v1.md).

### Customer: install without the authoring checkout

Verify the CLI and Solution Skill archive hashes against a release record
received separately. Install the delivered CLI archive into a local prefix,
then extract the Solution Skill archive:

```bash
cli_home=/absolute/path/to/local-cli
cli_archive=/absolute/path/to/agent-skills-cli-1.0.0.tgz
solution_archive=/absolute/path/to/agent-skills-solution-codebase-onboarding-1.0.0.tgz
release_extract=/absolute/path/to/local-release-extraction
target_project=/absolute/path/to/project
release_digest=<publisher-provided-release-directory-digest>

npm install --prefix "$cli_home" --offline --no-audit --ignore-scripts "$cli_archive"
mkdir -p "$release_extract"
tar -xzf "$solution_archive" -C "$release_extract"
node "$cli_home/node_modules/agent-skills-cli/dist/cli.js" install-solution \
  --release "$release_extract/package" \
  --digest "$release_digest" \
  --project "$target_project" \
  --target codex,claude-code
```

The installer checks the release fingerprint, each skill and license notice,
then copies canonical skills into the project. Codex reads `.agents/skills/`;
Claude Code receives links in `.claude/skills/`. The installed Solution Skill
version and component hashes are recorded in `.agent-skills/installed.json`.
Existing skills are not overwritten.

For a later approved release, run `upgrade-solution` with the new release
directory and digest. It requires a higher Solution Skill version and refuses
to replace locally modified installed skills.

To run onboarding, check `codegraph --version`, `rtk --version`, and
`codegraph status` in the target project. Open a new Codex or Claude Code task
at that root and invoke `$codebase-onboarding-c4` in Codex or
`/codebase-onboarding-c4` in Claude Code. Follow the
[real-project runbook](skills/codebase-onboarding-c4/references/real-project-usage.md)
and [integration guide](docs/codebase-onboarding-integration.html). Markdown
remains the source of truth for generated onboarding documents; after approved
artifact creation, run `verify-onboarding-workspace.mjs`.

## Catalog development

The generic `catalog`, `pull`, `validate`, `recommend`, `apply`, and
`apply-profile` commands remain useful for discovery and experiments. They do
not create a versioned Solution Skill release. A catalog-relative bundled
source resolves beside the catalog file, so `apply-profile` can be invoked
from another project with an explicit `--catalog` path. The pinned Hallmark
source in the checked-in catalog is staged at its exact commit.

The [Upstream Skill records](catalog.yaml) include Hallmark and the public
`html-slides` reference. `html-slides` in this repository is a rewrite; its
original derivation commit is unknown and the presentation profile is not a V1
commercial release. A scheduled GitHub Actions check compares the skill folder
at remote HEAD with the pinned digest. Updates require review and a new Solution Skill
release; they are never installed automatically.

## Scope and license

The technical V1 artifacts can be built, transferred, installed, and upgraded.
The business workflow still determines access control, pricing, distribution
channel, and customer terms. This repository is under [MIT](LICENSE); each
public source retains its own license and attribution in a release. No other
coding-agent target is supported.
