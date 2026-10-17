# Technical V1 release and installation

## Build and inspect

From a clean checkout with Node.js 22+, npm, and Git:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
node dist/cli.js check-upstreams --fail-on-update
node dist/cli.js build-solution codebase-onboarding --output build/codebase-onboarding-1.1.0
npm pack --pack-destination build
```

`build-solution` prints `digest` for the release directory and
`archiveDigest` for its `.tgz`. `npm pack` creates the CLI archive
`agent-skills-cli-1.1.0.tgz`. Record its SHA-256 separately. Never replace a
published artifact with different bytes under the same version.

The release directory holds `solution-release.json`, `skills/`, `licenses/`,
`NOTICE.md`, `LICENSE`, and `package.json`. `solution-release.json` is the
component lock. The `skills/` entries are real copies so their contents do not
depend on the authoring checkout or a live upstream repository.

## Presentation candidate

The separately versioned `problem-presentation@0.1.0` candidate uses the same
builder and installer. Build it with:

```bash
node dist/cli.js build-solution problem-presentation --output build/problem-presentation-0.1.0
```

Install its archive with `install-solution` using the resulting release digest
and `--target codex,claude-code`, as below. Invoke `$problem-presentation` in
Codex or `/problem-presentation` in Claude Code. The skill produces an offline
HTML deck, prints the same file to PDF using Chrome/Chromium, and writes a
`deck.pdf.provenance.json` sidecar. Run its bundled `check-deck.mjs` against
both files and inspect desktop, short, phone, and PDF views. A blocked browser
print leaves the PDF gate failed; a separately authored PDF does not satisfy
the output contract. See the [evaluation record](../research/problem-presentation-solution-evaluation.md)
for current host trial status. The sidecar verifies byte consistency and the
checker performs minimum PDF structure checks; inspect the PDF in a viewer to
confirm it renders correctly and matches the HTML.

## Transfer and install

Deliver both archives and an independent release record containing the CLI
archive SHA-256, Solution Skill archive SHA-256, release directory digest,
solution ID, version, and supported hosts. Verify archive hashes before
extraction. For example, `shasum -a 256 <archive>` works on macOS; use
`sha256sum <archive>` where available.

On the customer machine, use a local CLI prefix and an extraction directory:

```bash
cli_home=/absolute/path/to/local-cli
cli_archive=/absolute/path/to/agent-skills-cli-1.1.0.tgz
solution_archive=/absolute/path/to/agent-skills-solution-codebase-onboarding-1.1.0.tgz
release_extract=/absolute/path/to/local-release-extraction
target_project=/absolute/path/to/project
release_digest=<trusted-release-directory-digest>

npm install --prefix "$cli_home" --offline --no-audit --ignore-scripts "$cli_archive"
mkdir -p "$release_extract"
tar -xzf "$solution_archive" -C "$release_extract"
node "$cli_home/node_modules/agent-skills-cli/dist/cli.js" install-solution \
  --release "$release_extract/package" \
  --digest "$release_digest" \
  --project "$target_project" \
  --target codex,claude-code
```

The CLI archive bundles its runtime dependencies, so the local prefix install
does not need npm registry access. The installer copies skills into `.agents/skills/` and links them into
`.claude/skills/` when both hosts are selected. It creates
`.agent-skills/installed.json`. It refuses existing skill paths and does not
run packaged scripts. The project owner decides whether to commit these files.

The onboarding workflow itself requires `codegraph`, `rtk`, and a valid
CodeGraph index at the target root. Check `codegraph status` before invoking
the installed skill. Follow the
[real-project usage runbook](../../skills/codebase-onboarding-c4/references/real-project-usage.md)
for evidence, approvals, output paths, and verifiers.

## Upgrade

Build and review a higher solution version, distribute its new archive and
hashes, then run:

```bash
node "$cli_home/node_modules/agent-skills-cli/dist/cli.js" upgrade-solution \
  --release "$new_release_extract/package" \
  --digest "$new_release_digest" \
  --project "$target_project" \
  --target codex,claude-code
```

The target set must match the existing installation. The CLI compares each
installed skill with its recorded digest and refuses an upgrade if local edits
exist. It stages a new release, backs up the prior files during replacement,
and updates the lock only after a successful install. There is no implicit
upgrade when a public upstream moves.

## Upstream maintenance

`node dist/cli.js check-upstreams --fail-on-update` reports the pinned and
remote HEAD plus the candidate skill digest for each public record. A scheduled
GitHub Actions workflow runs this check weekly and fails when a skill's content
changes. A repository-only commit is shown as `repositoryMoved` without an
update alert. Review the candidate
commit, its license and files, the behavior of any affected solution, and
the generated diff before changing `catalog.yaml`. Update the solution manifest
hashes and version only after acceptance checks pass, then build a new artifact.

## V1 verification limits

The automated suite covers parsing, pinned Git staging, deterministic hashes,
release build and notices, tamper rejection, collisions, install, and clean
upgrade. A package install test proves files land in the documented project
paths. Actual model behavior on a customer's repository still depends on that
repository, CodeGraph index, host version, and customer approvals. Record those
outcomes in a separate solution evaluation before promising task success.
