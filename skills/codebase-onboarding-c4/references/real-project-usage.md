# Real-Project Usage Runbook

Use this runbook to install and run `codebase-onboarding-c4` in a real project.
The commands use placeholders and never require credentials in the
conversation.

## What is available now

The current skill can inspect an indexed codebase, build an evidence-backed
Product/Business and C4 technical model, identify operability concerns, and
recommend a bounded first implementation area. It returns findings in chat by
default. When explicitly requested, it can create three HTML files under
`docs/onboarding/`.

The adaptive `.onboarding/` YAML workspace, automatic resume, progressive
renderer, and automatic coordinator are target capabilities, not current
runtime behavior. Until those capabilities ship, keep the same Codex task open
or provide the previous completion report when continuing in a new task.

## Step 1 — Define the onboarding outcome and boundary

Decide these values before installing anything:

| Decision         | Example                                                | Why it matters                                 |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------- |
| Target root      | `/absolute/path/to/project`                            | The skill is installed and run from this root. |
| Repository shape | Single repository or parent multi-repository workspace | Determines CodeGraph index scope.              |
| Outcome          | Understand, Ready to implement, or both                | Controls the depth of investigation.           |
| Mode             | Quick, Standard, or Deep                               | Controls time and evidence breadth.            |
| First task       | A bounded feature, bug, or flow                        | Makes readiness task-scoped.                   |
| Durable docs     | No initially; yes after chat review                    | Prevents unapproved file writes.               |

Use `Standard` when onboarding a new engineer unless the scope is obviously
small or unusually complex.

## Step 2 — Validate the skill source

Set two shell variables to explicit absolute paths. Do not reuse common system
variables such as `HOME`.

```bash
skills_source=/absolute/path/to/agents-skills
target_project=/absolute/path/to/project

cd "$skills_source"
npm install
npm run dev -- validate codebase-onboarding-c4 --source skills
```

Expected result: validation succeeds for `codebase-onboarding-c4`. Stop if the
source path is wrong, validation reports malformed frontmatter, or a public
boundary safeguard fails.

## Step 3 — Inspect the target before changing it

```bash
cd "$target_project"
pwd
git status --short --branch
test -f AGENTS.md && sed -n '1,220p' AGENTS.md
```

Confirm that `pwd` is the intended project root. Preserve existing dirty work.
Read repository instructions before installation. Installation may create an
agent skill directory and `skills-lock.json`; it must not overwrite an existing
skill implicitly.

For a non-Git project, replace the Git status check with a review of the files
already present at the target root.

## Step 4 — Install the skill into the target project

Run the installer from the target root so project-scoped files are written to
the intended project:

```bash
cd "$target_project"
npx --yes skills add "$skills_source" \
  --skill codebase-onboarding-c4 \
  --agent codex \
  --yes
```

If durable HTML onboarding will be requested, install the HTML standard too:

```bash
npx --yes skills add "$skills_source" \
  --skill html-docs-standard \
  --agent codex \
  --yes
```

Use the direct installer for an external target project. The repository-local
`apply-profile` examples are intended for running the bundled CLI from its own
checkout and are not the recommended cross-project installation path.

## Step 5 — Verify the installed package

For Codex, confirm these files exist:

```bash
test -f .agents/skills/codebase-onboarding-c4/SKILL.md
test -f .agents/skills/codebase-onboarding-c4/references/evidence-and-output-contract.md
test -f .agents/skills/codebase-onboarding-c4/references/real-project-usage.md
test -f skills-lock.json
git status --short
```

If HTML support was installed, also run:

```bash
test -f .agents/skills/html-docs-standard/SKILL.md
test -f .agents/skills/html-docs-standard/scripts/verify-html-docs.mjs
```

Review every created path before staging or committing. Whether project-scoped
skills and `skills-lock.json` belong in version control is a project policy
decision, not an automatic step in this runbook.

## Step 6 — Run read-only prerequisite checks

```bash
codegraph --version
rtk --version
git status --short
codegraph status
```

Expected result:

- `codegraph` and `rtk` are available.
- The Git status is understood and existing changes are preserved.
- `codegraph status` reports a valid index for the intended root.

If a tool is missing, stop and use its official installation instructions.
Do not let the agent install global tools or change agent configuration
implicitly.

## Step 7 — Handle a missing or stale CodeGraph index

Do not run `codegraph init` automatically. Ask the project owner because index
creation writes local project state and the correct root may cover more than
one repository.

Use this approval request:

```text
CodeGraph does not report a valid index for <target root>.
May I run `codegraph init` at this exact root?
The operation creates local index state and will not modify application source.
```

After approval:

```bash
cd "$target_project"
codegraph init
codegraph status
```

If approval is declined, stop this skill. Broad grep is not an equivalent
replacement for structural CodeGraph exploration.

## Step 8 — Open Codex at the target root and start onboarding

Open a new Codex task with the target project as its workspace. Verify the task
can discover `codebase-onboarding-c4`, then use this Standard-mode prompt:

```text
Use $codebase-onboarding-c4 to onboard me to this project.

Outcomes:
1. Understand the Product/Business context and the primary business flow.
2. Understand the C1, C2, selective C3, runtime, data, auth, and test boundaries.
3. Be Ready to implement this bounded first task: <describe the task>.

Run in Standard mode. Begin inline to establish one shared system map.
Use subagents only for two or more independent, read-only investigation tracks.
Return findings in chat first. Do not create or replace files without asking.
Label every material conclusion with its evidence status.
If product documents, MCP, or database access are unavailable, continue
code-only and record each missing fact as a grey zone.
```

Use one of these mode overrides when needed:

- `Quick`: orientation, primary flow, one change path, and immediate blockers.
- `Standard`: all three onboarding layers plus one task-scoped readiness check.
- `Deep`: multiple domains or runtimes, major dependencies, data and queue
  boundaries, failure modes, and several independent evidence tracks.

## Step 9 — Control Inline and Subagent execution

The root agent always owns user interaction, access approval, shared evidence,
contradiction resolution, readiness, and file writes.

Use `Inline` when the investigation is sequential, the scope is bounded, or all
tracks depend on one shared mental model. Begin inline even in a complex system
to establish repository boundaries, actors, ownership, vocabulary, and the
primary business flow.

Use `Subagent` only when at least two tracks are independent and read-only, for
example:

- API request path and frontend interaction path.
- Runtime/deployment investigation and test-strategy investigation.
- Two services with separate entrypoints and no shared write operation.

Each subagent should return source paths, relevant symbols, call paths,
evidence labels, contradictions, and open questions. The root agent must
reconcile all findings inline. If multi-agent support is unavailable or a
track fails, continue the same contract inline.

## Step 10 — Add MCP, documentation, or database evidence safely

Before any external access, require the agent to present:

1. Connector and source name.
2. Purpose of the access.
3. Read-only operation and bounded scope.
4. Configuration names required, without their values.
5. Expected evidence and how it may change the current conclusions.

The user configures credentials outside the conversation and then gives
explicit approval. **Do not paste credentials** into chat, generated files,
commands, or logs.

For database access, begin with schema and metadata. Use bounded read-only
queries only after approval. Never mutate data and never persist raw personal
or customer data in onboarding artifacts.

If access is unavailable, continue code-only. Record a grey zone with:

- the unknown statement;
- why it matters;
- the likely owner or source;
- the evidence needed to verify it;
- the implementation risk while it remains unknown.

## Step 11 — Review chat findings before creating durable documents

The first result should be a chat report containing:

- Product/Business: actors, outcomes, capabilities, vocabulary, and flow.
- Technical C4: C1, C2, selective C3, and task-relevant code paths.
- Operability: run, test, debug, data, auth, failures, and dependencies.
- Evidence status: `verified-from-source`,
  `verified-from-provided-material`, `inferred-from-source`, or
  `needs-confirmation`.
- Grey zones and contradictory evidence.
- A bounded first-task change map and readiness result.

Only after reviewing the chat report, request durable files:

```text
Create the durable onboarding documents now.
Check whether the target files already exist and ask before replacing them.
Use $html-docs-standard, Mermaid, local assets, and the evidence labels from
the onboarding contract. Do not include credentials, private URLs, customer
data, or unsupported business claims.
```

The current durable output is:

```text
docs/onboarding/
├── index.html
├── product-business.html
└── technical-architecture.html
```

Run the installed HTML verifier on each generated file before accepting it.
The future `.onboarding/` Markdown, Mermaid, YAML state, and rendered site
layout must not be reported as available until its implementation ships.

## Step 12 — Assess readiness, hand off, and resume

Accept `Ready to implement` only for a named bounded task, not for the entire
system. The completion report must identify:

- exact files, symbols, routes, and call paths likely to change;
- upstream and downstream dependencies;
- expected tests and local verification commands;
- data, auth, migration, queue, or deployment impact;
- remaining grey zones and their risk;
- the safest first implementation sequence.

Use this final review prompt:

```text
Assess whether I am Ready to implement <bounded task>.
Return Ready, Ready with constraints, or Not ready.
Support the verdict with source paths, CodeGraph call paths, tests, unresolved
grey zones, and the next concrete action for every blocker.
```

To resume in the same Codex task, ask the agent to continue from the latest
completion report. To resume in a new task, paste a sanitized completion report
or link the approved `docs/onboarding/` files, then ask the agent to revalidate
Git and CodeGraph state before relying on previous conclusions.

## Single-repository example

```bash
skills_source=/absolute/path/to/agents-skills
target_project=/absolute/path/to/project
cd "$target_project"
npx --yes skills add "$skills_source" \
  --skill codebase-onboarding-c4 \
  --agent codex \
  --yes
codegraph status
```

Open Codex at `target_project`, start in Standard mode, establish the primary
business flow inline, and select one bounded implementation task.

## Multi-repository example

Use a parent workspace only when its repositories form one system and the
project owner approves that index boundary:

```text
/absolute/path/to/workspace/
├── web-application/
├── api-service/
└── background-worker/
```

Install the skill at the parent workspace, open Codex at that parent, and run
`codegraph status` there. Build the shared system and ownership map inline.
After that, independent repository investigations may use subagents, while the
root agent retains the cross-repository data flow and final synthesis.

## Troubleshooting

| Symptom                               | Likely cause                                                                        | Safe next action                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Skill is not discovered               | Codex task opened before installation or at the wrong root                          | Verify `.agents/skills/codebase-onboarding-c4/SKILL.md`, then open a new task at the target root. |
| Installer would replace a skill       | Package already exists                                                              | Stop, review the installed version and lockfile, then decide explicitly whether to update it.     |
| `codegraph status` has no valid index | Wrong root or index not initialized                                                 | Confirm the exact root and ask before `codegraph init`.                                           |
| CodeGraph reports stale source        | Index does not match current checkout                                               | Follow the tool's documented refresh path, then rerun the same query.                             |
| Product intent is unclear             | Source code is not an approved product specification                                | Keep source-based conclusions inferred and create owner-specific grey zones.                      |
| MCP or database is unavailable        | Connector, permission, or external credential configuration is missing              | Continue code-only and record scope, impact, owner, and verification path.                        |
| HTML verifier fails                   | Required structure, responsive metadata, local assets, or privacy rules are missing | Fix the generated document and rerun the verifier before delivery.                                |
| Previous conclusions may be stale     | Branch, dependencies, or index changed after onboarding                             | Recheck Git status and CodeGraph, then revalidate affected evidence.                              |

## Final safety checklist

- The task root and CodeGraph index boundary are explicit.
- Existing dirty work is preserved.
- No global tool, index, file replacement, connector, or database access was
  performed without the required approval.
- No credentials, private URLs, customer data, or raw sensitive data appear in
  chat or artifacts.
- Every material conclusion has an evidence label.
- Every unavailable source remains a grey zone rather than an invented fact.
- The readiness verdict is scoped to one bounded implementation task.
- Durable files were created only after review and replacement approval.
