# AGENTS.md — Agent Skills Rules

This document defines the three operational rules for the Agent Skills system.
An engineer reading this document should be able to understand how skills
execute, how they are bundled together, and how to install and update them in a
target project.

**Supported AI agents:** Claude Code and Codex. These are the only targets this
system installs into. Use target IDs `claude-code` and `codex` in CLI commands.

**For AI agents reading this file:** You are in the `agents-skills` repository.
This is the skill authoring and management repo — not a target project. To
install skills into a target project, use the commands in Rule 3. To help an
engineer create a new skill, follow the Appendix.

---

## Rule 1: How a skill executes (inline vs. subagent dispatch)

### Activation

A skill activates when an agent encounters the `$skill-name` syntax in a prompt:

```text
Use $codebase-onboarding-c4 to onboard me to this project.
```

The agent reads the installed `SKILL.md`, loads all referenced contracts from
`references/`, and follows the instructions.

### Execution model: root-owns-everything

The root agent (the one the user is talking to) always owns:

- User interaction and approval gates
- Scope decisions and journey selection
- The evidence registry and shared state
- Routing decisions (inline vs. delegate)
- Reconciliation of all findings
- Quality gate evaluation
- Every write operation

### When to stay inline

Execute inline when the work involves:

- A single question or sequential dependency chain
- Shared-model work that builds on prior context
- User interaction or approval decisions
- Reconciliation of multiple findings
- Quality gate evaluation
- Any write operation (files, state, artifacts)

### When to delegate to subagents

Delegate only when ALL of these conditions are true:

1. At least two investigation tracks are independent of each other
2. Each track has a bounded scope and clear expected output
3. Tracks are strictly read-only (no shared-state edits)
4. Parallel execution provides real depth or latency benefit

Each delegated track must define:

```yaml
track_id: unique identifier
question: what this track answers
scope: bounded read-only boundary
expected_output: what comes back
evidence_required: what sources to use
dependencies: other tracks this needs (must be empty for parallel)
access_required: any special access needed
stop_conditions: when to stop
out_of_scope: what must not be explored
```

### Subagent constraints

A subagent:

- Returns findings, evidence pointers, confidence, contradictions, grey zones,
  follow-up suggestions, related journey stages, and C4 elements
- Cannot expand scope beyond its track definition
- Cannot request new access or approvals
- Cannot edit code or mutate shared state
- Cannot write final documents or artifacts
- Cannot interact with the user directly

### Fallback rule

If multi-agent delegation is unavailable or fails, execute the same tracks
inline without reducing output quality. The contracts do not change — only the
execution topology changes.

### Routing signals

Route based on: domains, runtimes, data stores, queues, external systems,
coupling patterns, evidence sources, and separability. Repository count alone is
not a routing signal.

### External access gate

Before accessing documentation, databases, connectors, or live runtimes:

1. State the unanswered question
2. Name the source and connector
3. Define bounded read-only scope
4. List configuration names (never values)
5. State expected evidence and what it would change
6. Request explicit user approval

When optional access is declined: continue code-only, record a grey zone with
impact, likely owner, verification path, and implementation risk.

### Quality gates (apply to all skills with structured output)

Evaluate gates independently. Results:

- `PASS` — All required gates pass
- `PASS_WITH_GREY_ZONES` — Output is usable but optional evidence unavailable
- `NOT_READY` — Foundational evidence is materially unreliable

Failed sections get one targeted retry (Standard mode). Deep mode may add one
independent reviewer track. Never retry the entire investigation or silently
expand scope.

---

## Rule 2: How skills are bundled together (file storage, interaction, state)

### Skill sources: bundled vs. external

Skills come from exactly two sources:

**Source 1: Bundled (self-authored in this repository)**

Skills you write and maintain directly in the `skills/` directory of this repo.
They are registered in `catalog.yaml` with `source: bundled`.

```yaml
sources:
  bundled:
    reference: skills # Points to the local skills/ directory

skills:
  my-new-skill:
    source: bundled # ← This skill lives in skills/my-new-skill/
```

When to choose bundled:

- You own the skill's contracts and evolution
- The skill is specific to your team's workflow or standards
- You want to co-evolve the skill with the CLI and other bundled skills
- You need tight integration with other bundled skills (shared state, delegation)

**Source 2: External (third-party Git repository)**

Skills maintained in a separate public Git repository. They are registered in
`catalog.yaml` with a `source` that points to a Git URL entry.

```yaml
sources:
  hallmark-upstream:
    reference: https://github.com/nutlope/hallmark.git # External repo

skills:
  hallmark:
    source: hallmark-upstream # ← Pulled from the Git URL at install time
```

When to choose external:

- The skill is maintained by another team or open-source project
- You want to consume updates from upstream without forking
- The skill is general-purpose and not specific to your workflow
- You want version isolation (pin to a branch/tag in the URL)

**Key differences:**

| Aspect      | Bundled                         | External                       |
| ----------- | ------------------------------- | ------------------------------ |
| Location    | `skills/<name>/` in this repo   | Separate Git repository        |
| Ownership   | You maintain it                 | Upstream maintainer            |
| Validation  | Immediate (`--source skills`)   | After `pull` stages the source |
| Updates     | Your commits                    | `git pull` from upstream       |
| Integration | Full (shared state, cross-refs) | Through profiles only          |
| CI coverage | Tested in this repo's CI        | Validated at install time only |

**Combining both in a profile:**

A profile can mix bundled and external skills. The catalog declares the source
for each, and `apply-profile` resolves and validates all before installing:

```yaml
profiles:
  codebase-onboarding:
    skills:
      - codebase-onboarding-c4 # bundled (source: bundled)
      - html-docs-standard # bundled (source: bundled)
      - hallmark # external (source: hallmark-upstream)
```

The install order matters — first skill is primary authority regardless of
whether it is bundled or external.

### Package structure

A skill is a directory with a lowercase-hyphenated name containing:

```
my-skill/
  SKILL.md              # REQUIRED — Frontmatter + instructions
  references/           # Optional — Contract documents (agent reads these)
  assets/               # Optional — Templates, CSS, static files
  scripts/              # Optional — Verification/helper scripts (Node ESM)
  agents/               # Optional — Per-target interface configs
```

### SKILL.md frontmatter contract

```yaml
---
name: my-skill # Must match directory name exactly
description: Use when... # Non-empty, starts with context
---
```

Validation fails on: name mismatch, empty description, missing frontmatter.

### Agent interface files

Each target gets a YAML in `agents/`:

```yaml
# agents/claude-code.yaml | agents/openai.yaml
interface:
  display_name: "Human Readable Name"
  short_description: "One-line description."
  default_prompt: "Use $my-skill to [action]."
```

### Catalog registry (catalog.yaml)

The root `catalog.yaml` declares all sources, skills, and profiles:

```yaml
version: 1
sources:
  bundled:
    reference: skills # Local directory
  external-name:
    reference: https://github.com/org/repo.git # Git URL

skills:
  skill-name:
    source: bundled
    tags: [tag1, tag2]
    summary: One-line summary.
    suitableFor: [intent-a, intent-b]
    notSuitableFor: [intent-c]

profiles:
  profile-name:
    intents: [intent-a]
    skills: [skill-a, skill-b] # Order matters: first = primary authority
    summary: What this combination achieves.
    suitableFor: [intent-a]
    notSuitableFor: [intent-c]
```

### Profile bundling rules

- A profile combines 1+ skills installed together in declared order
- First skill in the list is the primary design/content authority
- Every skill in `skills` must exist in the catalog's `skills` section
- Profiles fail validation if they reference undefined or conflicting skills
- `recommend --intent` resolves intent to matching profiles with guidance
- `apply-profile` validates all skills before calling any target installer

### Current bundled profiles

| Profile               | Skills (in order)                                    | Purpose                            |
| --------------------- | ---------------------------------------------------- | ---------------------------------- |
| `documentation`       | html-docs-standard, hallmark                         | Engineer docs with optional polish |
| `codebase-onboarding` | codebase-onboarding-c4, html-docs-standard, hallmark | Full codebase investigation + docs |
| `hallmark-landing`    | hallmark                                             | Landing pages, redesigns           |

### Multi-skill interaction model

Skills interact through defined interfaces, not implicit coupling:

1. **Shared workspace paths** — Skills agree on output locations:
   - `.onboarding/` — State, evidence, brand profile (locally ignored)
   - `docs/onboarding/` — Markdown source + HTML output (locally ignored)

2. **Explicit delegation in SKILL.md** — One skill references another:

   ```
   Use `html-docs-standard` for light-only responsive HTML...
   ```

   ```
   Automatically Use $hallmark as a constrained visual polish pass...
   ```

3. **Shared brand state** — `.onboarding/brand/DESIGN.md` is the single source
   of brand tokens, shared between onboarding and docs skills.

4. **Authority chain** — When bundled, the first-listed skill is primary
   authority. Downstream skills (e.g., hallmark) are constrained:
   - Must preserve the upstream skill's design rules
   - Must pass the upstream skill's verifiers after modifications
   - Cannot override structural decisions

### State and resume model

Skills that perform long-running work use YAML state files:

```yaml
# .onboarding/state.yaml
schema_version: 1
run_id: ""
mode: standard
status: preflight
repository:
  fingerprint: ""
  git_head: ""
journey:
  id: ""
  title: ""
  outcome: ""
tracks: []
evidence_sources: []
gates:
  product_journey: pending
  technical_c4: pending
  engineering_navigation: pending
  evidence_integrity: pending
  security_public_boundary: pending
retries: []
contradictions: []
grey_zones: []
artifacts: []
resume_from: preflight
updated_at: ""
```

**Resume rules:**

- When Git HEAD or fingerprint changes, mark affected evidence stale
- Rerun only impacted tracks, not the entire workflow
- Never resume blindly — always check state validity first
- Write YAML through temporary sibling file + atomic replace

### Evidence registry

```yaml
# .onboarding/evidence.yaml
schema_version: 1
items:
  - claim: "..."
    label: verified-from-source | inferred-from-source | needs-confirmation
    source_pointer: "file:path#L10-L20"
    confidence: high | medium | low
    journey_stage: "stage-id"
    c4_element: "container-name"
```

### Safe write policy

- Check existing artifacts and ask before replacing
- Generated roots must pass `git check-ignore` before writing
- Add to `.git/info/exclude` (not tracked `.gitignore`) if needed
- Never place credentials, private URLs, raw data, or absolute private paths
- YAML state uses atomic temp-file-then-rename writes

### Brand profile workflow (cross-skill shared state)

The brand profile is how `html-docs-standard` and `codebase-onboarding-c4`
share visual identity:

```
ensure-brand-profile.mjs → returns { action: "reuse" | "first-use" | "invalid" | "refresh" }
```

- `reuse` → Use existing `.onboarding/brand/DESIGN.md` silently, no questions
- `first-use` → Ask Brand name + Brand website, extract, apply
- `invalid` → Same as first-use (profile is broken)
- `refresh` → User explicitly requested re-extraction

The apply step writes `DESIGN.md` + generates `docs-brand.css` + verifies
synchronization in one atomic operation. No color preview or approval gate for
extracted brand.

### Scripts contract

- Node.js ESM (`.mjs`), self-contained
- Accept PROJECT_ROOT as first argument
- Exit 0 = success, non-zero = failure
- Print structured JSON for machine-readable output
- Never executed during skill validation (data-only treatment)
- Never modify application source code

---

## Rule 3: Installing skills and handling updates (versioning)

### Installation mechanism

Skills are installed into a target project via the `npx --yes skills add`
backend for Codex and Claude Code.

```bash
# Direct installation from a source (local path or git URL)
npx --yes skills add <source> \
  --skill <skill-name> \
  --agent codex \
  --agent claude-code \
  --yes

# Or via the bundled CLI profile command
npm run dev -- apply-profile <profile> --target codex,claude-code --scope project
```

### Installed file layout

After installation, skills land at `.agents/skills/<skill-name>/` in the target
project, mirroring the source package structure exactly:

```
target-project/
├── .agents/skills/
│   ├── codebase-onboarding-c4/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── agents/
│   ├── html-docs-standard/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── agents/
│   └── hallmark/
│       └── SKILL.md
├── skills-lock.json          # Records installed skill metadata
└── ... (project source)
```

### Target install backends

| Agent                                                                      | Target ID     | Backend                | Project marker |
| -------------------------------------------------------------------------- | ------------- | ---------------------- | -------------- |
| Claude Code                                                                | `claude-code` | `npx --yes skills add` | `.claude/`     |
| Codex                                                                      | `codex`       | `npx --yes skills add` | `.codex/`      |
| Both targets use the same `skills` install backend. Pass them individually |
| or as a comma-separated list: `--target codex,claude-code`.                |

### No-overwrite policy

Existing installed skills are never overwritten implicitly. The installer will
fail if a skill already exists at the destination. To update, you must
explicitly remove the old version first.

### Version tracking with skills-lock.json

`skills-lock.json` is created by the `skills add` backend in the target project.
It records:

- Which skills are installed
- Their source (git URL or local path)
- The commit/version at install time

Whether `skills-lock.json` belongs in version control is a **project policy
decision**:

- **Commit it** if you want team members to see exactly which skill versions
  are installed and detect drift
- **Ignore it** if skills are installed per-machine and you rely on the source
  repo's version

### Detecting skill updates

Since skills are sourced from Git repositories, updates are detected by
comparing the installed state against the source:

1. **Git-backed sources** — The CLI stages sources by cloning or pulling:

   ```
   git clone → initial install
   git fetch --prune && git pull --ff-only → update check
   ```

   A pull that advances HEAD means the source has new content.

2. **Check installed vs. source** — Compare the installed package contents with
   the current source. If files differ, the installed skill is outdated.

3. **Validation on apply** — `apply-profile` and `apply` always validate the
   skill from the current source before installation. This means installing
   from a newer source automatically gets the latest validated version.

### Update workflow

```bash
# 1. Pull latest source
cd /path/to/agents-skills
git pull

# 2. Validate the updated skills
npm run dev -- validate codebase-onboarding-c4 --source skills
npm run dev -- validate html-docs-standard --source skills

# 3. Remove old installation in target project
rm -rf /path/to/target/.agents/skills/codebase-onboarding-c4
rm -rf /path/to/target/.agents/skills/html-docs-standard

# 4. Re-install from updated source
cd /path/to/target
npx --yes skills add /path/to/agents-skills \
  --skill codebase-onboarding-c4 \
  --agent codex --agent claude-code --yes
npx --yes skills add /path/to/agents-skills \
  --skill html-docs-standard \
  --agent codex --agent claude-code --yes
```

### Semantic versioning approach

While skills do not have explicit version numbers in their package metadata,
versioning is tracked through:

1. **Git commits** — Each commit to the skills source is an implicit version.
   The `skills-lock.json` records the commit hash at install time.

2. **schema_version in templates** — State and evidence YAML templates include
   `schema_version: 1`. When breaking changes occur to the state format, this
   number increments, allowing resume logic to detect incompatibility.

3. **Catalog source references** — Git URLs can pin to branches or tags:

   ```yaml
   sources:
     hallmark-upstream:
       reference: https://github.com/nutlope/hallmark.git # main branch
   ```

4. **Validation as gate** — The CLI validates package shape before every install.
   A broken skill cannot be installed regardless of its version.

### Recognizing when updates are available

An engineer can detect stale installations by:

```bash
# Compare installed skill SKILL.md against source
diff .agents/skills/codebase-onboarding-c4/SKILL.md \
  /path/to/agents-skills/skills/codebase-onboarding-c4/SKILL.md

# Or check git log on the source for recent changes
cd /path/to/agents-skills
git log --oneline --since="2 weeks ago" -- skills/

# Or use the doctor command to check prerequisites and paths
npm run dev -- doctor
```

### Installation from GitHub (public users)

Public users install directly from the repository URL without needing a local
checkout:

```bash
cd /path/to/target-project

npx --yes skills add \
  https://github.com/KhucHieuNghi/agents-skills.git \
  --skill codebase-onboarding-c4 \
  --agent codex --agent claude-code --yes

npx --yes skills add \
  https://github.com/KhucHieuNghi/agents-skills.git \
  --skill html-docs-standard \
  --agent codex --agent claude-code --yes

npx --yes skills add \
  https://github.com/nutlope/hallmark.git \
  --skill hallmark \
  --agent codex --agent claude-code --yes
```

### Post-install verification

Always verify after installation:

```bash
# Check all expected files exist
test -f .agents/skills/codebase-onboarding-c4/SKILL.md
test -f .agents/skills/html-docs-standard/SKILL.md
test -f .agents/skills/html-docs-standard/scripts/ensure-brand-profile.mjs
test -f skills-lock.json

# Check prerequisites for specific skills
codegraph --version
codegraph status
rtk --version
git status --short
```

### Resume after update

When a skill is updated while `.onboarding/state.yaml` exists from a previous
run:

- The resume logic checks `schema_version` compatibility
- If compatible: mark evidence that touches changed skill contracts as stale,
  rerun affected tracks only
- If incompatible (schema_version mismatch): warn and suggest a fresh run

---

## Appendix: Creating a new skill

### Path A: Write a new bundled skill (self-authored)

Use this path when you are writing a new skill from scratch in this repository.

1. Choose a `lowercase-hyphenated` name that does not conflict with catalog
2. Create the directory structure:
   ```bash
   mkdir -p skills/<name>/{references,assets,scripts,agents}
   ```
3. Write `skills/<name>/SKILL.md` with valid frontmatter:
   ```yaml
   ---
   name: <name>
   description: Use when an engineer needs to [specific scenario].
   ---
   ```
4. Write reference contracts in `references/` — one concern per file, under 200
   lines each, imperative language, testable pass/fail rules
5. Add template files in `assets/` for structured outputs (YAML, Markdown, HTML)
6. Add verification scripts in `scripts/` (Node ESM `.mjs`, self-contained,
   accept PROJECT_ROOT as arg, exit 0 on success)
7. Add agent interface configs in `agents/`:
   ```yaml
   # agents/claude-code.yaml (also provide openai.yaml for Codex)
   interface:
     display_name: "My Skill"
     short_description: "Does the thing."
     default_prompt: "Use $<name> to [action]."
   ```
8. Register in `catalog.yaml`:
   ```yaml
   skills:
     <name>:
       source: bundled
       tags: [relevant, tags]
       summary: One-line description.
       suitableFor: [intent-a]
       notSuitableFor: [intent-b]
   ```
9. Optionally create or update a profile in `catalog.yaml` under `profiles:`
10. Validate: `npm run dev -- validate <name> --source skills`
11. Run full checks:
    ```bash
    npm run format:check && npm run lint && npm run typecheck && npm test
    ```

### Path B: Reference an external skill (third-party)

Use this path when consuming a skill from another Git repository.

1. Identify the external repository URL and verify it contains a valid skill
   package (directory with `SKILL.md` and valid frontmatter)
2. Add the source to `catalog.yaml`:
   ```yaml
   sources:
     my-external:
       reference: https://github.com/org/repo.git
   ```
3. Register the skill in `catalog.yaml`:
   ```yaml
   skills:
     external-skill-name:
       source: my-external
       tags: [relevant, tags]
       summary: One-line description of what it does.
       suitableFor: [intent-a]
       notSuitableFor: [intent-b]
   ```
4. Validate the external source can be pulled and the skill passes validation:
   ```bash
   npm run dev -- pull https://github.com/org/repo.git
   npm run dev -- validate external-skill-name --source https://github.com/org/repo.git
   ```
5. Optionally add it to a profile (can mix with bundled skills):
   ```yaml
   profiles:
     my-profile:
       skills: [my-bundled-skill, external-skill-name]
   ```

**Constraints for external skills:**

- You do not control their evolution — changes come from upstream
- They must pass the same validation rules (frontmatter, naming, no secrets)
- When used in a profile with bundled skills, respect the authority chain
- Pin to a specific branch or tag in the source URL for stability:
  ```yaml
  reference: https://github.com/org/repo.git#v1.0.0
  ```

---

## Appendix: Using AI agents to develop and install skills

### Creating a new skill with AI assistance

Either supported agent (Claude Code or Codex) can help you create
a new skill. Open this repository in your agent and use a prompt like:

```text
I want to create a new skill called `<name>` that does <description>.
Follow the AGENTS.md rules for bundled skill creation (Path A).
Create the directory structure, SKILL.md, reference contracts, and agent configs.
Register it in catalog.yaml. Validate when done.
```

The agent reads this AGENTS.md, understands the package structure, and scaffolds
the skill. You review and iterate on the contracts.

### Bundling a new skill with an existing one

To make your new skill work with an existing bundled skill (e.g., use
`html-docs-standard` for HTML output), tell the agent:

```text
Create a new skill `my-analysis-skill` that produces Markdown findings,
then uses `html-docs-standard` for branded HTML rendering.
Bundle them in a profile called `my-analysis` in catalog.yaml.
My skill is primary authority; html-docs-standard handles presentation only.
```

The agent will:

1. Create your skill with a reference to html-docs-standard in SKILL.md
2. Define the shared output paths (e.g., `docs/analysis/`)
3. Add a profile in catalog.yaml listing your skill first (primary authority)
4. Ensure the authority chain is respected

### Installing skills into a target project (for AI agents)

When an engineer asks you to install skills into their project, run:

```bash
# From the target project root
npx --yes skills add https://github.com/KhucHieuNghi/agents-skills.git \
  --skill <skill-name> \
  --agent codex --agent claude-code --yes
```

Or if working from a local checkout of this repo:

```bash
npx --yes skills add /path/to/agents-skills \
  --skill <skill-name> \
  --agent codex --agent claude-code --yes
```

To install a full profile:

```bash
# From this repo checkout
npm run dev -- apply-profile <profile> --target codex,claude-code --scope project
```

After installation, verify:

```bash
test -f .agents/skills/<skill-name>/SKILL.md
test -f skills-lock.json
```

### Key prompts for common tasks

| Task                 | Prompt                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| Create a skill       | "Create a bundled skill called `X` following AGENTS.md Path A"          |
| Bundle with existing | "Create skill `X` and bundle it with `html-docs-standard` in a profile" |
| Install into project | "Install the `codebase-onboarding` profile into this project"           |
| Update skills        | "Update installed skills from the latest agents-skills source"          |
| Validate a skill     | "Validate the `X` skill package"                                        |

---

## Appendix: Development checks

```bash
npm run format:check   # Prettier
npm run lint           # ESLint (TypeScript)
npm run typecheck      # tsc --noEmit
npm test              # Vitest
npm run build          # Compile (when changing CLI entrypoints)
```

CI runs all four checks on every push and PR.

---

## Appendix: Documentation rule

All human-readable HTML documentation lives in a single `docs/index.html`. Do
not create multiple HTML files that require engineers to know which file to
open. One page, one sidebar, one source of truth. Use the `html-docs-standard`
light-mode styling (inline CSS, no remote dependencies, responsive, offline).

Open `docs/index.html` in a browser to read the complete guide.
