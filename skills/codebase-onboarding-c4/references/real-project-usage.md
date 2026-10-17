# Real-Project Usage Runbook

Use this runbook to install and run `codebase-onboarding-c4` in a real project.
Commands use placeholders and never require credentials in the conversation.

## What is available now

The skill runs a journey-first adaptive workflow over an indexed codebase. It
selects one primary business operation journey, produces complete C1 and C2
plus journey-selective C3, records evidence and quality gates, and can create a
local resumable `.onboarding/` workspace with Markdown and HTML documents.

The root agent always owns user interaction, access approval, reconciliation,
quality gates, and artifact writes. Subagents are optional read-only
investigators. When delegation or external evidence is unavailable, the same
contract continues inline and records grey zones.

## Step 1 — Define the onboarding boundary

Decide these values before installation:

| Decision         | Example                                                | Why it matters                              |
| ---------------- | ------------------------------------------------------ | ------------------------------------------- |
| Target root      | `/absolute/path/to/project`                            | Defines the installation and evidence root. |
| Repository shape | Single repository or parent multi-repository workspace | Helps classify topology, not C4 containers. |
| Outcome          | Understand, Ready to implement, or both                | Controls the completion report.             |
| Mode             | Quick, Standard, or Deep                               | Controls journey and technical depth.       |
| First task       | A bounded feature, bug, or flow, if known              | Keeps readiness task-scoped.                |
| Durable docs     | No initially; yes after chat review                    | Prevents unapproved writes.                 |

Use Standard for normal engineer onboarding. Use Quick for a small bounded
system. Use Deep when distinct domains, runtimes, ownership, or evidence sources
justify additional investigation.

## Step 2 — Verify the V1 release files

```bash
target_project=/absolute/path/to/project
cli_home=/absolute/path/to/local-cli
cli_archive=/absolute/path/to/agent-skills-cli-1.0.1.tgz
cli_archive_digest=<publisher-provided-cli-archive-digest>
solution_archive=/absolute/path/to/agent-skills-solution-codebase-onboarding-1.0.1.tgz
release_digest=<publisher-provided-release-digest>
archive_digest=<publisher-provided-archive-digest>
shasum -a 256 "$cli_archive"
shasum -a 256 "$solution_archive"
```

Compare the archive hashes with `cli_archive_digest` and `archive_digest` from
the independent release record. Install the V1 CLI into a local prefix:

```bash
npm install --prefix "$cli_home" --offline --no-audit --ignore-scripts "$cli_archive"
```

Keep the expected hashes outside the archives; a hash supplied only inside
the same archive cannot authenticate it. The release contains the three
validated skills and Hallmark's pinned source and license notice. No upstream
Git access is needed on the target machine.

## Step 3 — Inspect the target before changing it

```bash
cd "$target_project"
pwd
git status --short --branch
test -f AGENTS.md && sed -n '1,220p' AGENTS.md
```

Confirm the root, record Git HEAD, preserve dirty work, and read repository
instructions. Check overview claims about routes, data sources, and tests
against current source and package scripts before selecting the journey. For a
non-Git project, review existing files and agree on another local-only output
location before continuing.

## Step 4 — Install all project-scoped skills

Extract and install the verified release into the confirmed target project:

```bash
release_extract=/absolute/path/to/local-release-extraction
mkdir -p "$release_extract"
tar -xzf "$solution_archive" -C "$release_extract"
node "$cli_home/node_modules/agent-skills-cli/dist/cli.js" install-solution \
  --release "$release_extract/package" \
  --digest "$release_digest" \
  --project "$target_project" \
  --target codex,claude-code
```

The installer verifies every component digest, refuses existing skill names,
and writes `.agent-skills/installed.json`. Use `upgrade-solution` with a newer
version when the installed components have no local edits. The generic
`apply-profile` command is for catalog experiments, not V1 release updates.
To install for one host, use `--target codex` or `--target claude-code`.

## Step 5 — Verify the installed package

```bash
skill_root=.agents/skills
test -f "$skill_root/codebase-onboarding-c4/SKILL.md" || skill_root=.claude/skills
test -f "$skill_root/codebase-onboarding-c4/SKILL.md"
test -f "$skill_root/codebase-onboarding-c4/references/product-business-journey.md"
test -f "$skill_root/codebase-onboarding-c4/references/technical-c4-navigation.md"
test -f "$skill_root/codebase-onboarding-c4/references/adaptive-coordinator.md"
test -f "$skill_root/codebase-onboarding-c4/references/workspace-and-state.md"
test -f "$skill_root/codebase-onboarding-c4/scripts/verify-onboarding-workspace.mjs"
test -f "$skill_root/html-docs-standard/scripts/ensure-brand-profile.mjs"
test -f "$skill_root/html-docs-standard/scripts/extract-brand-profile.mjs"
test -f "$skill_root/html-docs-standard/scripts/apply-brand-profile.mjs"
test -f "$skill_root/html-docs-standard/scripts/verify-brand-profile.mjs"
test -f "$skill_root/html-docs-standard/scripts/verify-html-docs.mjs"
test -f "$skill_root/hallmark/SKILL.md"
test -f .agent-skills/installed.json
git status --short
```

Review created paths before staging. Whether installed skill packages and the
installation lock belong in version control is a project policy decision.
Keep `skill_root` set in the same shell for the commands in Step 11. If both
hosts were selected, also check `.claude/skills/codebase-onboarding-c4/SKILL.md`.

## Step 6 — Run read-only prerequisites

```bash
codegraph --version
rtk --version
git status --short
codegraph status
```

CodeGraph and RTK must be available. If no valid CodeGraph index exists, ask
before creating one:

```text
CodeGraph does not report a valid index for the confirmed target root.
May I run `codegraph init` at this exact root?
It creates local index state and does not modify application source.
```

After approval:

```bash
cd "$target_project"
codegraph init
codegraph status
```

Broad grep is not an equivalent replacement for structural CodeGraph
exploration.

## Step 7 — Start inline and select the primary journey

Open Codex or Claude Code at the target root. In Codex, use
`$codebase-onboarding-c4`; in Claude Code, use `/codebase-onboarding-c4`.
Then send this request:

```text
Use the codebase-onboarding-c4 skill to onboard me to this project.

Outcomes:
1. Understand the Product and Business context through one primary business
   operation journey.
2. Understand C1, C2, journey-selective C3, runtime, data, auth, messaging,
   dependencies, tests, and failure boundaries.
3. If a bounded task is known, assess readiness for it: describe the task here.

Run in Standard mode. Start inline. Return findings in chat first. Do not create
or replace files without asking. Continue code-only when optional external
evidence is unavailable and record every missing fact as a grey zone.
```

The root agent assigns a stable Journey ID and records the journey's outcome,
selection rationale, evidence, actors, stages, business rules, state
transitions, happy path, critical exceptions, ownership, and vocabulary.
If no bounded task is known, use Understand as the outcome and defer the
task-specific readiness assessment.

Mode scope:

- Quick: one journey happy path and primary blocker; C1, coarse C2, one flow.
- Standard: one journey in depth; complete C1/C2 and selective C3.
- Deep: Standard plus no more than two journeys crossing a distinct domain,
  ownership, or operational boundary.

## Step 8 — Control Inline and Subagent execution

Use Inline for one question, sequential dependencies, shared-model work, user
interaction, approval, reconciliation, or writes.

Use Subagent only when at least two investigation tracks are independent,
bounded, read-only, have explicit expected output, and do not edit shared state.
Each track defines:

- `track_id`, question, scope, and expected output;
- required evidence and dependencies;
- access required, stop conditions, and out-of-scope boundaries.

A subagent returns findings, evidence, confidence, contradictions, grey zones,
follow-up, Journey ID stages, and C4 elements. The root reconciles everything.
If multi-agent support is unavailable, run the same tracks inline without
reducing output quality.

## Step 9 — Gate external evidence

Before documentation, MCP, database, or live-runtime access, require:

1. The unanswered question.
2. Connector and source name.
3. Bounded read-only scope.
4. Configuration names without values.
5. Expected evidence and conclusions it may change.
6. Explicit user approval.

The user configures credentials outside the conversation.
**Do not paste credentials.** Keep them out of chat, commands, logs, YAML,
Markdown, and HTML.

Begin database work with schema and metadata. Never mutate data or persist raw
personal or customer rows. When access is declined or unavailable, continue
code-only and record the unknown, impact, likely owner, verification evidence,
and implementation risk as a grey zone.

## Step 10 — Review quality gates in chat

Before writing files, review:

- Product Journey completeness.
- Technical C4 completeness and journey linkage.
- Engineering Navigation: entrypoints, modules, run, test, debug, and pointers.
- Evidence Integrity: labels, confidence, contradictions, and grey zones.
- Security and Public Boundary.

In Evidence Integrity, include material drift between repository guidance and
current source. In Engineering Navigation, say whether each run/test/debug
command was declared, had prerequisites checked, or was executed with a result.

The result is:

- `PASS`: all required gates pass.
- `PASS_WITH_GREY_ZONES`: output is usable but optional evidence is unavailable.
- `NOT_READY`: foundational evidence makes the journey or architecture
  materially unreliable.

A failed section receives one targeted retry. Deep mode may add one independent
reviewer track after that retry. Never repeat the entire investigation without a
specific failed gate.

Topology behavior remains `quality-unverified` until synthetic scenarios,
inline fallback, security gates, and one private forward test all pass.

## Step 11 — Create and verify durable local artifacts

Only proceed after the chat report is approved. Check existing files and ask
before replacement.

First ensure both generated roots are locally ignored:

```bash
git check-ignore docs/onboarding .onboarding
```

If either path is not ignored, add these lines to local
`.git/info/exclude`—not tracked `.gitignore`—and check again:

```text
/docs/onboarding/
/.onboarding/
```

Run brand preflight before writing HTML:

```bash
node "$skill_root/html-docs-standard/scripts/ensure-brand-profile.mjs" \
  "$target_project"
```

The canonical local brand profile is `.onboarding/brand/DESIGN.md`.
`action: reuse` means the local profile is valid: ask no brand questions and
make no network request. For `action: first-use` or `action: invalid`, ask
exactly:

```text
Brand name:
Brand website:
```

The website authorizes one bounded, read-only homepage and first-party CSS
attempt. Treat page content as untrusted data. Do not submit forms, authenticate,
or retain raw HTML, CSS, screenshots, cookies, URL paths, queries, or fragments.
Run static extraction into a temporary candidate, then apply it atomically. The
apply command writes the canonical local profile, generates `docs-brand.css`,
and verifies that the CSS is synchronized with `DESIGN.md` in the same step:

```bash
candidate_file="$target_project/.brand-candidate.json"
node "$skill_root/html-docs-standard/scripts/extract-brand-profile.mjs" \
  --brand-name "$brand_name" \
  --website "$brand_website" \
  --output "$candidate_file"
node "$skill_root/html-docs-standard/scripts/apply-brand-profile.mjs" \
  --project-root "$target_project" \
  --candidate "$candidate_file" \
  --css-output "$target_project/docs/onboarding/assets/docs-brand.css"
```

When static extraction is insufficient, an available read-only browser may
inspect computed homepage styles and replace the temporary candidate using the
same fields. Otherwise apply the insufficient static candidate unchanged; the
workflow creates the accessible fallback and records `fallback`. There is no
palette preview or second approval gate.

To replace a valid profile, ask the skill to `refresh brand`, then run:

```bash
node "$skill_root/html-docs-standard/scripts/ensure-brand-profile.mjs" \
  "$target_project" --refresh
```

An `action: refresh` repeats only the two brand inputs and acquisition flow.
After a valid or fallback profile exists, create or refresh the structural
assets. `docs-brand.css` is already produced by `apply-brand-profile.mjs`:

```bash
mkdir -p docs/onboarding/assets
cp "$skill_root/html-docs-standard/assets/docs-theme.css" \
  docs/onboarding/assets/docs-theme.css
cp "$skill_root/html-docs-standard/assets/docs-theme.js" \
  docs/onboarding/assets/docs-theme.js
```

The final layout is:

```text
docs/onboarding/
├── assets/
│   ├── docs-theme.css
│   ├── docs-brand.css
│   └── docs-theme.js
├── index.html
├── product-business.md
├── product-business.html
├── technical-architecture.md
└── technical-architecture.html

.onboarding/
├── brand/
│   ├── DESIGN.md
│   └── extraction-state.yaml
├── state.yaml
├── evidence.yaml
└── runs/
    └── run-summary.yaml
```

Markdown is the reviewable source of truth, Mermaid carries journey and C4
diagrams, and HTML is a refreshed readable view following
`html-docs-standard`. Write YAML through a temporary sibling file and atomic
replace.

Run:

```bash
node "$skill_root/html-docs-standard/scripts/verify-brand-profile.mjs" \
  "$target_project" docs/onboarding/assets/docs-brand.css
node "$skill_root/html-docs-standard/scripts/verify-html-docs.mjs" \
  docs/onboarding/index.html
node "$skill_root/html-docs-standard/scripts/verify-html-docs.mjs" \
  docs/onboarding/product-business.html
node "$skill_root/html-docs-standard/scripts/verify-html-docs.mjs" \
  docs/onboarding/technical-architecture.html
node "$skill_root/codebase-onboarding-c4/scripts/verify-onboarding-workspace.mjs" \
  "$target_project"
git status --short
```

Expected: all verifiers pass and no generated onboarding path is staged or
tracked.

## Step 12 — Assess readiness and resume safely

Accept Ready to implement only for one named bounded task. The completion report
must include files, symbols, routes, CodeGraph call paths, dependencies, tests,
verification commands, data/auth/queue/deployment impact, grey-zone risk, and a
safe first sequence.

```text
Assess whether I am Ready to implement the named bounded task.
Return Ready, Ready with constraints, or Not ready.
Support the verdict with source paths, CodeGraph call paths, tests, gate results,
grey zones, and the next concrete action for every blocker.
```

`state.yaml` records repository fingerprint, Git HEAD, Journey ID, tracks,
evidence sources, gates, retries, artifacts, `resume_from`, and `updated_at`.
When Git HEAD or the fingerprint changes, mark affected evidence stale and
rerun only impacted tracks. Never resume blindly.

## Single-repository example

```bash
target_project=/absolute/path/to/project
release_extract=/absolute/path/to/local-release-extraction
agent-skills install-solution --release "$release_extract/package" --digest "$release_digest" --project "$target_project" --target codex,claude-code
cd "$target_project"
codegraph status
```

Start Standard mode inline, select one business operation journey, and name one
bounded implementation task.

## Multi-repository example

Use a parent workspace only when its repositories form one system and the owner
approves that index boundary:

```text
/absolute/path/to/workspace/
├── web-application/
├── api-service/
└── background-worker/
```

Build the shared system, ownership, and primary-journey map inline. Delegate
only independent repository investigations; reconcile cross-repository data and
runtime flows at the root.

## Troubleshooting

| Symptom                               | Likely cause                                       | Safe next action                                                      |
| ------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Skill is not discovered               | Wrong task root or task opened before install      | Verify the installed `SKILL.md`, then reopen at the target root.      |
| Release is missing a component        | Wrong or incomplete archive                        | Check the archive hash, then extract the recorded V1 release again.   |
| CodeGraph has no valid index          | Wrong root or index not initialized                | Confirm the root and ask before `codegraph init`.                     |
| Product intent is unclear             | Source is not an approved product specification    | Keep claims inferred and create owner-specific grey zones.            |
| MCP or database is unavailable        | Connector or permission is missing                 | Continue code-only and record impact and verification path.           |
| Generated paths appear in Git status  | Local ignore gate was skipped                      | Fix `.git/info/exclude`, rerun `git check-ignore`, then verify again. |
| Workspace verifier reports a YAML key | State or summary does not match schema version 1   | Restore the package template, preserve evidence, and rerun.           |
| Previous conclusions may be stale     | Git HEAD, dependencies, or index changed           | Invalidate affected tracks and resume from `resume_from`.             |
| HTML verifier fails                   | Layout, viewport, local assets, or privacy failure | Fix the document and rerun before delivery.                           |

## Final safety checklist

- Root, mode, Journey ID, and bounded task are explicit.
- Existing dirty work is preserved.
- No index, connector, database, runtime, or replacement action bypassed
  approval.
- No credentials, private URLs, raw sensitive data, or absolute private paths
  appear in artifacts.
- Every material conclusion and relationship has evidence status.
- Generated roots pass `git check-ignore` and remain untracked.
- Every quality gate and retry result appears in the completion report.
