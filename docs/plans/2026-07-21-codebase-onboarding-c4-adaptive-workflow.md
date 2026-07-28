# Adaptive Codebase Onboarding C4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `codebase-onboarding-c4` into a journey-first, stage-gated adaptive onboarding skill with explicit Product Journey and Technical C4 contracts, local resumable artifacts, quality gates, and scenario-based verification.

**Architecture:** Keep agent judgment in focused Markdown contracts and make repeatable state, artifact, and safety checks deterministic through package assets, tests, and a dependency-free workspace verifier. The root agent remains the coordinator; optional subagents only perform bounded independent read-only investigation tracks, and the same contracts execute inline when delegation is unavailable.

**Tech Stack:** Agent Skills Markdown packages, Node.js 20 ESM, TypeScript 6, Vitest 4, YAML 2, Mermaid, Git, and the existing `html-docs-standard` package.

## Global Constraints

- Preserve the canonical package name `codebase-onboarding-c4` and its existing frontmatter contract.
- Use CodeGraph before text search when a target repository has a valid `.codegraph/` index; never initialize an index without approval.
- Keep all user interaction, access approval, reconciliation, quality gates, and artifact writes in the root agent.
- Use subagents only for at least two independent, bounded, read-only tracks with no shared-state edits.
- Continue code-only when optional documentation, database, connector, or runtime evidence is unavailable; mark the result as a grey zone.
- Produce complete C1 and C2 plus selective C3 for the primary journey or a critical shared boundary; do not create a class or function catalog.
- Keep generated onboarding artifacts local and ignored by default through `.git/info/exclude`; never edit tracked `.gitignore` automatically.
- Never persist secret values, connection strings, raw customer data, private remote URLs, or absolute private paths.
- Keep this public repository generic and use only synthetic fixtures.
- Do not add a new runtime dependency to the installed skill package.
- Follow test-driven development and commit only the files belonging to the current task.

---

### Task 1: Product Journey and evidence contracts

**Files:**

- Create: `skills/codebase-onboarding-c4/references/product-business-journey.md`
- Modify: `skills/codebase-onboarding-c4/references/evidence-and-output-contract.md`
- Create: `tests/codebase-onboarding-c4.test.ts`

**Interfaces:**

- Consumes: the evidence labels already defined in `evidence-and-output-contract.md`.
- Produces: the stable Journey ID and Product Journey section contract used by the Technical C4, coordinator, artifacts, and evaluation tasks.

- [ ] **Step 1: Write the failing Product Journey contract test**

Create `tests/codebase-onboarding-c4.test.ts` with:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const skillRoot = "skills/codebase-onboarding-c4";

describe("codebase-onboarding-c4 contracts", () => {
  it("defines a journey-first Product and Business contract", async () => {
    const [journey, evidence] = await Promise.all([
      readFile(`${skillRoot}/references/product-business-journey.md`, "utf8"),
      readFile(
        `${skillRoot}/references/evidence-and-output-contract.md`,
        "utf8",
      ),
    ]);

    for (const section of [
      "## Journey selection",
      "## Mode depth",
      "## Required journey structure",
      "## Product document boundary",
    ]) {
      expect(journey).toContain(section);
    }

    for (const requirement of [
      "business operation journey",
      "Journey ID",
      "Trigger and preconditions",
      "Actors, roles, and responsibilities",
      "Business rules",
      "State transitions",
      "Critical exceptions",
      "Domain vocabulary",
      "grey zones",
    ]) {
      expect(journey).toContain(requirement);
    }

    expect(journey).toContain("An HTTP request path is not a business journey");
    expect(journey).toContain("Do not add KPI, SLA, or target metrics");
    expect(evidence).toContain("## Source precedence and contradictions");
    expect(evidence).toContain("current code or runtime behavior");
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing contract fails**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "journey-first"
```

Expected: FAIL with `ENOENT` for `references/product-business-journey.md`.

- [ ] **Step 3: Add the Product Journey contract**

Create `skills/codebase-onboarding-c4/references/product-business-journey.md`
with these exact sections and rules:

```markdown
# Product and Business Journey Contract

## Journey selection

Default to one primary business operation journey: an end-to-end operation
that produces a recognizable business outcome and crosses meaningful system
responsibilities. An HTTP request path is not a business journey.

Record a stable Journey ID, title, business outcome, selection rationale,
supporting evidence, and whether any part is inferred or needs confirmation.
Select a different anchor only when evidence shows that it explains the system
better, and state why.

## Mode depth

- Quick: one primary journey, its happy path, and its primary blocker.
- Standard: one primary journey in depth, including critical exceptions.
- Deep: Standard plus no more than two journeys that cross a distinct domain,
  ownership, or operational boundary.

## Required journey structure

1. Purpose and business value.
2. Trigger and preconditions.
3. Actors, roles, and responsibilities.
4. Ordered business stages.
5. Decisions and Business rules.
6. Entity lifecycle and State transitions.
7. Happy path.
8. Critical exceptions, failure paths, and recovery.
9. Outcome and postconditions.
10. Ownership and external dependencies.
11. Related capabilities.
12. Domain vocabulary.
13. Evidence status and grey zones.

## Product document boundary

Keep Product and Business separate from Technical Architecture. Link them with
the Journey ID. Use source pointers instead of large code excerpts. Do not use
class- or function-level diagrams. Do not add KPI, SLA, or target metrics to
default onboarding. Do not invent product intent.
```

Extend `evidence-and-output-contract.md` with:

```markdown
## Source precedence and contradictions

Use source and configuration to establish implemented structure. Use a live
runtime only after approval to establish current code or runtime behavior.
Provided product material and approved connectors can explain intent or add
context, but they do not silently override implementation evidence.

When sources disagree, preserve both claims, label their source and confidence,
and explain whether each describes current, intended, historical, or observed
behavior. Missing optional evidence is a grey zone, not permission to invent a
fact.
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "journey-first"
```

Expected: one focused test passes.

- [ ] **Step 5: Commit the Product Journey contract**

```bash
git add skills/codebase-onboarding-c4/references/product-business-journey.md skills/codebase-onboarding-c4/references/evidence-and-output-contract.md tests/codebase-onboarding-c4.test.ts
git commit -m "feat: add product journey onboarding contract"
```

### Task 2: Technical C4 and Engineering Navigation contracts

**Files:**

- Create: `skills/codebase-onboarding-c4/references/technical-c4-navigation.md`
- Modify: `skills/codebase-onboarding-c4/references/evidence-and-output-contract.md`
- Modify: `tests/codebase-onboarding-c4.test.ts`

**Interfaces:**

- Consumes: Journey ID and evidence labels from Task 1.
- Produces: C1, C2, selective C3, required technical views, and Engineering Navigation requirements used by quality gates and artifact templates.

- [ ] **Step 1: Add a failing Technical C4 test**

Append inside the existing `describe` block:

```ts
it("defines complete C1 and C2 with journey-selective C3", async () => {
  const technical = await readFile(
    `${skillRoot}/references/technical-c4-navigation.md`,
    "utf8",
  );

  for (const section of [
    "## C1 System Context",
    "## C2 Containers",
    "## Selective C3 Components",
    "## Required technical views",
    "## Engineering Navigation",
    "## Mode depth",
  ]) {
    expect(technical).toContain(section);
  }

  for (const requirement of [
    "Repository count does not define container count",
    "Dependency direction",
    "Owned data",
    "Failure boundary",
    "critical shared boundary",
    "Runtime and startup model",
    "Primary entrypoints",
    "Test strategy and test locations",
    "CodeGraph call paths",
  ]) {
    expect(technical).toContain(requirement);
  }

  expect(technical).toContain("Do not create a class or function catalog");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "complete C1"
```

Expected: FAIL with `ENOENT` for `technical-c4-navigation.md`.

- [ ] **Step 3: Add the Technical C4 contract**

Create `skills/codebase-onboarding-c4/references/technical-c4-navigation.md`
with the following exact contract:

```markdown
# Technical C4 and Engineering Navigation Contract

## C1 System Context

Identify people and actors, the system under study, neighboring systems, major
external dependencies, and important trust or security boundaries. Support
every relationship with evidence or label it inferred or needs-confirmation.

## C2 Containers

Cover every important application, service, worker, scheduled job, data store,
queue or event broker, and notable runtime or deployment unit. Repository count
does not define container count.

For each container record Responsibility, technology and runtime, inputs and
outputs, protocol or communication mechanism, Owned data, Dependency direction,
Failure boundary, owner when known, evidence, and confidence.

## Selective C3 Components

Expand a component only when it participates in the primary Journey ID or owns
a critical shared boundary such as authentication, authorization, persistence,
messaging, or error handling.

For each selected component record responsibility, entrypoint, callers and
callees, dependencies, state or data touched, failure behavior, related tests,
and source pointers. Keep other modules in C2 or the dependency map. Do not
create a class or function catalog.

## Required technical views

Standard mode produces C1 System Context, C2 Containers, selective C3 for the
primary journey, one technical sequence or data-flow view for that journey, and
a module dependency map. Use the Journey ID to cross-reference the Product and
Business document.

## Engineering Navigation

Include the Runtime and startup model, Primary entrypoints, module
responsibilities, configuration names and ownership without values, data,
authentication, messaging, and error boundaries, Test strategy and test
locations, verified local run, test, and debug commands, source pointers, and
CodeGraph call paths when CodeGraph is available.

Label commands that were not verified. Return a task-specific implementation
map in chat first and create a separate file only when the user requests it.

## Mode depth

- Quick: C1, coarse C2, and one entrypoint or technical flow.
- Standard: complete C1 and C2, selective C3 for the primary journey, plus
  dependency, data, runtime, and test guidance.
- Deep: Standard plus selective C3 for approved additional journeys or critical
  shared boundaries.
```

Replace the old `Required artifacts` C1/C2/C3 wording in
`evidence-and-output-contract.md` with links to the Product Journey and
Technical C4 contracts. Keep evidence labels and source-only behavior in that
file so evidence rules have one owner.

- [ ] **Step 4: Verify the technical contract**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "complete C1"
```

Expected: the focused test passes.

- [ ] **Step 5: Commit the Technical C4 contract**

```bash
git add skills/codebase-onboarding-c4/references/technical-c4-navigation.md skills/codebase-onboarding-c4/references/evidence-and-output-contract.md tests/codebase-onboarding-c4.test.ts
git commit -m "feat: define technical C4 navigation contract"
```

### Task 3: Stage-gated coordinator, routing, and quality gates

**Files:**

- Create: `skills/codebase-onboarding-c4/references/adaptive-coordinator.md`
- Modify: `skills/codebase-onboarding-c4/SKILL.md`
- Modify: `tests/codebase-onboarding-c4.test.ts`

**Interfaces:**

- Consumes: Product Journey, Technical C4, and evidence contracts from Tasks 1 and 2.
- Produces: the eight-stage workflow, `InvestigationTrack` return contract, access gate, retry behavior, and readiness status used by every run.

- [ ] **Step 1: Add failing coordinator tests**

Append:

```ts
it("defines stage-gated adaptive coordination and root ownership", async () => {
  const [skill, coordinator] = await Promise.all([
    readFile(`${skillRoot}/SKILL.md`, "utf8"),
    readFile(`${skillRoot}/references/adaptive-coordinator.md`, "utf8"),
  ]);

  for (const stage of [
    "Preflight",
    "Inline orientation",
    "Inline journey selection",
    "Gap planning",
    "Adaptive investigation",
    "Root reconciliation",
    "Quality evaluation",
    "Delivery",
  ]) {
    expect(coordinator).toContain(stage);
  }

  for (const field of [
    "track_id",
    "question",
    "scope",
    "expected_output",
    "evidence_required",
    "dependencies",
    "access_required",
    "stop_conditions",
    "out_of_scope",
  ]) {
    expect(coordinator).toContain(`\`${field}\``);
  }

  expect(coordinator).toContain("at least two independent");
  expect(coordinator).toContain("root agent");
  expect(coordinator).toContain("PASS_WITH_GREY_ZONES");
  expect(coordinator).toContain("one targeted retry per section");
  expect(skill).toContain("references/adaptive-coordinator.md");
  expect(skill).toContain("references/product-business-journey.md");
  expect(skill).toContain("references/technical-c4-navigation.md");
});
```

- [ ] **Step 2: Run the coordinator test and verify it fails**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "stage-gated"
```

Expected: FAIL with `ENOENT` for `adaptive-coordinator.md`.

- [ ] **Step 3: Write the adaptive coordinator contract**

Create `skills/codebase-onboarding-c4/references/adaptive-coordinator.md` with:

```markdown
# Adaptive Coordinator Contract

## Workflow stages

1. Preflight checks instructions, Git state, tools, topology signals, output
   paths, and possible external-access needs.
2. Inline orientation establishes actors, boundaries, containers, runtimes,
   stores, messaging, and major dependency directions.
3. Inline journey selection chooses and explains one primary business journey.
4. Gap planning compares evidence with every required output contract.
5. Adaptive investigation executes dependent questions inline and may delegate
   independent bounded read-only tracks.
6. Root reconciliation removes duplicates, resolves or records contradictions,
   normalizes evidence, and maps findings to journeys and C4.
7. Quality evaluation checks each gate and retries only the failed section.
8. Delivery reports in chat first, writes approved artifacts, and records the
   run summary.

The root agent owns user interaction, access approval, scope, journey choice,
the evidence registry, routing, reconciliation, quality gates, and every write.

## Investigation track

Each track defines `track_id`, `question`, `scope`, `expected_output`,
`evidence_required`, `dependencies`, `access_required`, `stop_conditions`, and
`out_of_scope`.

A subagent returns findings, evidence pointers, confidence, contradictions,
grey zones, suggested follow-up, related journey stages, and related C4
elements. It cannot expand scope, request access, edit code, mutate shared
state, or write final documents.

## Routing rule

Stay inline for one question, sequential dependencies, shared-model work, user
interaction, approval, reconciliation, or writes. Delegate only when there are
at least two independent bounded read-only tracks, each has a clear deliverable,
there are no shared-state edits, and parallel work has a real depth or latency
benefit. If delegation is unavailable or fails, execute the same track inline.

Route from domains, runtimes, data stores, queues, external systems, coupling,
evidence sources, and separability. Repository count alone is not a routing
signal.

## External access gate

Investigate code first. Before documentation, database, connector, or live
runtime access, state the unanswered question, source, bounded read-only scope,
configuration names without values, expected evidence, and request approval.
Continue code-only with a grey zone when optional access is unavailable.

## Quality gates

Evaluate Product Journey, Technical C4, Engineering Navigation, Evidence
Integrity, and Security and Public Boundary independently.

Use PASS when all required gates pass, PASS_WITH_GREY_ZONES when artifacts are
usable but optional evidence is unavailable, and NOT_READY when foundational
evidence makes the journey or architecture materially unreliable.

## Targeted retry

Identify the failed section and exact question, create one bounded track, rerun
only that section, and reevaluate only that gate. Standard mode permits one
targeted retry per section. Deep mode may add one independent reviewer track.
Never retry indefinitely or expand scope silently.
```

Refactor `SKILL.md` so the top-level workflow is concise and links all four
references before investigation. Replace its duplicated execution-routing
paragraph with the coordinator reference. Keep CodeGraph and RTK preconditions,
chat-first delivery, approval before external access or file replacement, and a
completion report that includes mode, journey, C4 coverage, gate status,
contradictions, grey zones, and next action.

- [ ] **Step 4: Run all contract tests**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts
```

Expected: all tests in `codebase-onboarding-c4.test.ts` pass.

- [ ] **Step 5: Commit the coordinator**

```bash
git add skills/codebase-onboarding-c4/SKILL.md skills/codebase-onboarding-c4/references/adaptive-coordinator.md tests/codebase-onboarding-c4.test.ts
git commit -m "feat: add adaptive onboarding coordinator"
```

### Task 4: Local artifact templates, resume state, and verifier

**Files:**

- Create: `skills/codebase-onboarding-c4/references/workspace-and-state.md`
- Create: `skills/codebase-onboarding-c4/assets/product-business-template.md`
- Create: `skills/codebase-onboarding-c4/assets/technical-architecture-template.md`
- Create: `skills/codebase-onboarding-c4/assets/state-template.yaml`
- Create: `skills/codebase-onboarding-c4/assets/evidence-template.yaml`
- Create: `skills/codebase-onboarding-c4/assets/run-summary-template.yaml`
- Create: `skills/codebase-onboarding-c4/scripts/verify-onboarding-workspace.mjs`
- Modify: `skills/codebase-onboarding-c4/SKILL.md`
- Modify: `tests/codebase-onboarding-c4.test.ts`

**Interfaces:**

- Consumes: Journey ID, C4 view names, evidence labels, gate names, and statuses from Tasks 1 through 3.
- Produces: `.onboarding/state.yaml`, `.onboarding/evidence.yaml`, `.onboarding/runs/*.yaml`, five `docs/onboarding` artifacts, and the command `node scripts/verify-onboarding-workspace.mjs PROJECT_ROOT`.

- [ ] **Step 1: Add failing template-schema tests**

Add `import { parse } from "yaml";` and append:

```ts
it("ships parseable resume and evidence templates", async () => {
  const [stateText, evidenceText, runText] = await Promise.all([
    readFile(`${skillRoot}/assets/state-template.yaml`, "utf8"),
    readFile(`${skillRoot}/assets/evidence-template.yaml`, "utf8"),
    readFile(`${skillRoot}/assets/run-summary-template.yaml`, "utf8"),
  ]);

  const state = parse(stateText);
  const evidence = parse(evidenceText);
  const run = parse(runText);

  expect(state).toMatchObject({
    schema_version: 1,
    mode: "standard",
    status: "preflight",
    tracks: [],
    grey_zones: [],
  });
  expect(Object.keys(state.gates)).toEqual([
    "product_journey",
    "technical_c4",
    "engineering_navigation",
    "evidence_integrity",
    "security_public_boundary",
  ]);
  expect(evidence).toEqual({ schema_version: 1, items: [] });
  expect(run).toMatchObject({
    schema_version: 1,
    final_status: "NOT_READY",
    tracks: [],
    contradictions: [],
    grey_zones: [],
  });
});

it("documents local ignore and stale-state behavior", async () => {
  const workspace = await readFile(
    `${skillRoot}/references/workspace-and-state.md`,
    "utf8",
  );

  expect(workspace).toContain("git check-ignore");
  expect(workspace).toContain(".git/info/exclude");
  expect(workspace).toContain("Do not edit tracked `.gitignore`");
  expect(workspace).toContain("atomic replace");
  expect(workspace).toContain("Git HEAD");
  expect(workspace).toContain("stale");
});
```

- [ ] **Step 2: Run the template test and verify it fails**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "resume and evidence"
```

Expected: FAIL with `ENOENT` for `state-template.yaml`.

- [ ] **Step 3: Add YAML templates with stable keys**

Create `assets/state-template.yaml`:

```yaml
schema_version: 1
run_id: ""
mode: standard
status: preflight
repository:
  fingerprint: ""
  git_head: ""
topology:
  kind: unknown
  signals: []
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

Create `assets/evidence-template.yaml`:

```yaml
schema_version: 1
items: []
```

Create `assets/run-summary-template.yaml`:

```yaml
schema_version: 1
run_id: ""
mode: standard
topology: unknown
primary_journey_id: ""
tracks: []
evidence_sources: []
gate_results: {}
retries: []
contradictions: []
grey_zones: []
journey_c4_coverage: []
final_status: NOT_READY
next_investigations: []
completed_at: ""
```

Create `assets/product-business-template.md`:

```markdown
# Product and Business Onboarding

Readiness status: NOT_READY

Journey ID:

## Purpose and business value

## Trigger and preconditions

## Actors, roles, and responsibilities

## Ordered business stages

## Decisions and business rules

## Entity lifecycle and state transitions

## Happy path

## Critical exceptions, failure paths, and recovery

## Outcome and postconditions

## Ownership and external dependencies

## Related capabilities

## Domain vocabulary

## Evidence status and grey zones

| Claim | Evidence label | Source pointer | Confidence |
| ----- | -------------- | -------------- | ---------- |
```

Create `assets/technical-architecture-template.md`:

```markdown
# Technical Architecture Onboarding

Readiness status: NOT_READY

Related Journey ID:

## C1 System Context

## C2 Containers

## Selective C3 Components

## Primary journey technical sequence

## Module dependency map

## Runtime and startup model

## Primary entrypoints

## Configuration ownership

## Data, authentication, messaging, and error boundaries

## Test strategy and test locations

## Local run, test, and debug commands

## Source pointers and CodeGraph call paths

## Evidence status and grey zones

| Claim | Evidence label | Source pointer | Confidence |
| ----- | -------------- | -------------- | ---------- |
```

- [ ] **Step 4: Add the workspace and state contract**

Create `references/workspace-and-state.md` documenting:

```markdown
# Local Workspace and Resume Contract

## Output layout

Write Product and Technical Markdown and HTML under `docs/onboarding/`. Write
state, evidence, and per-run summaries under `.onboarding/`.

## Local ignore gate

Run `git check-ignore` for both generated roots before writing. If either root
is not ignored, add `/docs/onboarding/` and `/.onboarding/` to
`.git/info/exclude`, then check again. Do not edit tracked `.gitignore`
automatically. Warn and stop artifact generation when either root can still be
tracked.

## Safe writes

Check existing artifacts and ask before replacing them. Write YAML through a
temporary sibling file followed by an atomic replace. Never place credentials,
connection strings, raw database rows, private remote URLs, or absolute private
paths in state or evidence.

## Resume and invalidation

Record a sanitized repository fingerprint, Git HEAD, tracks, evidence sources,
gates, retries, grey zones, output paths, `resume_from`, and `updated_at`. When
Git HEAD or the fingerprint changes, mark affected evidence stale and rerun only
impacted tracks. Never resume blindly.

## HTML delivery

Use the installed `html-docs-standard` package, local assets, Mermaid default
theme, and its verifier for every HTML file. Markdown remains the reviewable
source.
```

Link this reference and all six assets from `SKILL.md` under artifact
generation.

- [ ] **Step 5: Add a dependency-free workspace verifier**

Create `scripts/verify-onboarding-workspace.mjs` with this implementation:

```js
/* global console, process */

import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectArgument = process.argv[2];
if (!projectArgument) {
  console.error("Usage: node verify-onboarding-workspace.mjs PROJECT_ROOT");
  process.exit(1);
}

const projectRoot = resolve(projectArgument);
const requiredFiles = [
  "docs/onboarding/index.html",
  "docs/onboarding/product-business.md",
  "docs/onboarding/product-business.html",
  "docs/onboarding/technical-architecture.md",
  "docs/onboarding/technical-architecture.html",
  ".onboarding/state.yaml",
  ".onboarding/evidence.yaml",
];
const errors = [];

for (const file of requiredFiles) {
  try {
    await access(join(projectRoot, file));
  } catch {
    errors.push(`missing required file: ${file}`);
  }
}

let runFiles = [];
try {
  runFiles = (await readdir(join(projectRoot, ".onboarding/runs")))
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => `.onboarding/runs/${file}`);
} catch {
  errors.push("missing run summaries: .onboarding/runs/*.yaml");
}
if (runFiles.length === 0) {
  errors.push("missing run summaries: .onboarding/runs/*.yaml");
}

for (const generatedRoot of ["docs/onboarding", ".onboarding"]) {
  try {
    execFileSync("git", ["check-ignore", "-q", generatedRoot], {
      cwd: projectRoot,
      stdio: "ignore",
    });
  } catch {
    errors.push(`generated root is not ignored: ${generatedRoot}`);
  }
}

const yamlContracts = new Map([
  [
    ".onboarding/state.yaml",
    [
      "schema_version",
      "run_id",
      "mode",
      "status",
      "repository",
      "topology",
      "journey",
      "tracks",
      "evidence_sources",
      "gates",
      "retries",
      "contradictions",
      "grey_zones",
      "artifacts",
      "resume_from",
      "updated_at",
    ],
  ],
  [".onboarding/evidence.yaml", ["schema_version", "items"]],
]);
for (const runFile of runFiles) {
  yamlContracts.set(runFile, [
    "schema_version",
    "run_id",
    "mode",
    "topology",
    "primary_journey_id",
    "tracks",
    "evidence_sources",
    "gate_results",
    "retries",
    "contradictions",
    "grey_zones",
    "journey_c4_coverage",
    "final_status",
    "next_investigations",
    "completed_at",
  ]);
}

const sensitivePatterns = [
  /\b[A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)\s*=/g,
  /https?:\/\/[^/\s:@]+:[^@\s/]+@/gi,
  /\/(?:Users|home)\/[^/\s]+\//g,
];
for (const file of [...requiredFiles, ...runFiles]) {
  let content;
  try {
    content = await readFile(join(projectRoot, file), "utf8");
  } catch {
    continue;
  }
  for (const pattern of sensitivePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) errors.push(`sensitive content: ${file}`);
  }
  for (const key of yamlContracts.get(file) ?? []) {
    if (!new RegExp(`^${key}:`, "m").test(content)) {
      errors.push(`missing YAML key ${key}: ${file}`);
    }
  }
}

if (errors.length > 0) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}

console.log("Onboarding workspace contract passed");
```

Extend the test imports with `execFileSync` from `node:child_process`,
`copyFile`, `mkdir`, `mkdtemp`, and `writeFile` from `node:fs/promises`,
`tmpdir` from `node:os`, and `join` from `node:path`. Then append:

```ts
it("verifies a complete ignored local onboarding workspace", async () => {
  const project = await mkdtemp(join(tmpdir(), "onboarding-workspace-"));
  execFileSync("git", ["init", "-q"], { cwd: project });
  await mkdir(join(project, "docs/onboarding"), { recursive: true });
  await mkdir(join(project, ".onboarding/runs"), { recursive: true });
  await writeFile(
    join(project, ".git/info/exclude"),
    "/docs/onboarding/\n/.onboarding/\n",
  );
  for (const file of [
    "index.html",
    "product-business.md",
    "product-business.html",
    "technical-architecture.md",
    "technical-architecture.html",
  ]) {
    await writeFile(join(project, "docs/onboarding", file), "synthetic\n");
  }
  await copyFile(
    `${skillRoot}/assets/state-template.yaml`,
    join(project, ".onboarding/state.yaml"),
  );
  await copyFile(
    `${skillRoot}/assets/evidence-template.yaml`,
    join(project, ".onboarding/evidence.yaml"),
  );
  await copyFile(
    `${skillRoot}/assets/run-summary-template.yaml`,
    join(project, ".onboarding/runs/sample-run.yaml"),
  );

  const output = execFileSync(
    "node",
    [`${skillRoot}/scripts/verify-onboarding-workspace.mjs`, project],
    { encoding: "utf8" },
  );
  expect(output).toContain("Onboarding workspace contract passed");

  await writeFile(
    join(project, ".onboarding/state.yaml"),
    "status: preflight\n",
  );
  expect(() =>
    execFileSync(
      "node",
      [`${skillRoot}/scripts/verify-onboarding-workspace.mjs`, project],
      { encoding: "utf8", stdio: "pipe" },
    ),
  ).toThrow(/schema_version/);
});
```

- [ ] **Step 6: Verify templates and workspace behavior**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts
node skills/codebase-onboarding-c4/scripts/verify-onboarding-workspace.mjs
```

Expected: Vitest passes; the direct command exits `1` with a concise usage error
because no project root was supplied.

- [ ] **Step 7: Commit local workspace support**

```bash
git add skills/codebase-onboarding-c4/SKILL.md skills/codebase-onboarding-c4/references/workspace-and-state.md skills/codebase-onboarding-c4/assets skills/codebase-onboarding-c4/scripts/verify-onboarding-workspace.mjs tests/codebase-onboarding-c4.test.ts
git commit -m "feat: add resumable onboarding workspace"
```

### Task 5: Scenario evaluation matrix and quality classification

**Files:**

- Create: `skills/codebase-onboarding-c4/references/evaluation-contract.md`
- Create: `tests/fixtures/onboarding-scenarios/scenarios.yaml`
- Modify: `skills/codebase-onboarding-c4/SKILL.md`
- Modify: `tests/codebase-onboarding-c4.test.ts`

**Interfaces:**

- Consumes: coordinator routing, output contracts, gate names, and final statuses.
- Produces: seven synthetic pressure scenarios and an honest `quality-unverified` to `verified` release rule.

- [ ] **Step 1: Add a failing scenario-matrix test**

Append:

```ts
it("defines the required synthetic behavior scenarios", async () => {
  const scenarios = parse(
    await readFile(
      "tests/fixtures/onboarding-scenarios/scenarios.yaml",
      "utf8",
    ),
  );

  expect(scenarios.schema_version).toBe(1);
  expect(
    scenarios.scenarios.map((scenario: { id: string }) => scenario.id),
  ).toEqual([
    "single-service-inline",
    "monorepo-container-boundaries",
    "multi-repository-adaptive",
    "missing-external-access",
    "conflicting-evidence",
    "no-subagent-runtime",
    "sensitive-evidence",
  ]);

  for (const scenario of scenarios.scenarios) {
    expect(scenario).toMatchObject({
      topology: expect.any(String),
      prompt: expect.any(String),
      expected: {
        route: expect.any(String),
        status: expect.any(String),
        required: expect.any(Array),
        forbidden: expect.any(Array),
      },
    });
  }
});
```

- [ ] **Step 2: Verify the missing matrix fails**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts -t "synthetic behavior"
```

Expected: FAIL with `ENOENT` for `scenarios.yaml`.

- [ ] **Step 3: Create the seven scenario definitions**

Create `tests/fixtures/onboarding-scenarios/scenarios.yaml`:

```yaml
schema_version: 1
scenarios:
  - id: single-service-inline
    topology: single-service
    prompt: Explain how Example Shop accepts and persists an order.
    expected:
      route: inline
      status: PASS
      required:
        - one business operation journey
        - complete C1 and C2
        - selective C3 for order acceptance
      forbidden:
        - unnecessary delegation
        - class catalog
        - invented business metrics
  - id: monorepo-container-boundaries
    topology: monorepo
    prompt: Explain checkout across Web App, Order API, and shared packages.
    expected:
      route: adaptive
      status: PASS
      required:
        - package and runtime distinction
        - container responsibilities
        - dependency directions
      forbidden:
        - one container per package
        - repository-to-container assumption
        - subagent document writes
  - id: multi-repository-adaptive
    topology: multi-repository
    prompt: Explain order fulfillment across Order API and Inventory Worker.
    expected:
      route: adaptive
      status: PASS
      required:
        - bounded independent tracks
        - Message Bus boundary
        - root reconciliation
      forbidden:
        - shared-state edits
        - unreconciled duplicate findings
        - class catalog
  - id: missing-external-access
    topology: single-service-with-database
    prompt: Continue code-only when Example Database access is not approved.
    expected:
      route: inline
      status: PASS_WITH_GREY_ZONES
      required:
        - explicit access request
        - code-only continuation
        - database grey zone
      forbidden:
        - unapproved database access
        - invented database contents
        - credential output
  - id: conflicting-evidence
    topology: service-with-documentation
    prompt: Reconcile an order state that differs between source and docs.
    expected:
      route: inline
      status: PASS_WITH_GREY_ZONES
      required:
        - both claims preserved
        - evidence labels
        - current versus intended distinction
      forbidden:
        - silent source override
        - invented resolution
        - hidden contradiction
  - id: no-subagent-runtime
    topology: multi-repository
    prompt: Explain fulfillment when delegation is unavailable.
    expected:
      route: inline-fallback
      status: PASS
      required:
        - sequential investigation tracks
        - unchanged output contract
        - root reconciliation
      forbidden:
        - skipped independent track
        - reduced quality gate
        - unavailable capability claim
  - id: sensitive-evidence
    topology: service-with-sensitive-configuration
    prompt: Explain configuration ownership without exposing values.
    expected:
      route: inline
      status: PASS
      required:
        - configuration names only
        - sanitized evidence summary
        - security gate pass
      forbidden:
        - secret assignment
        - credential-bearing URL
        - absolute private path
```

- [ ] **Step 4: Add the evaluation contract**

Create `references/evaluation-contract.md`:

```markdown
# Evaluation Contract

## Evaluation layers

1. Package contract validates package shape, reference links, assets, scripts,
   and public boundaries.
2. Behavior scenarios pressure-test routing, access gates, evidence handling,
   quality gates, and fallback against synthetic repositories.
3. Artifact contract validates Markdown headings, Mermaid relationships, HTML,
   YAML state, local ignore behavior, and cross-document Journey IDs.
4. Human acceptance checks that a new engineer can explain the primary journey,
   identify system boundaries and dependencies, locate an entrypoint, and
   continue run, test, debug, or investigation work.

## Behavior rubric

For every scenario record pass or fail for Product Journey completeness,
C1/C2/selective C3 coverage, journey-to-C4 traceability, evidence correctness,
routing, access approval, root-only writes, invented facts, and public-boundary
safety. Record the supporting output location and one concise reason.

Do not compare exact prose snapshots. Evaluate required structure, supported
facts, relationships, and prohibited behavior.

## Release classification

Keep topology quality `quality-unverified` until all required scenarios pass,
inline fallback meets the same output contract, no security or public-boundary
violation remains, and one real-project forward test passes without committing
private project data. Only then report topology behavior as `verified`.

## Private forward-test boundary

Store forward-test output only in the approved target project's ignored local
workspace. Commit no target name, path, source, prompt, generated artifact,
credential, connector output, or evidence to this public package.
```

Link this evaluation reference from `SKILL.md` completion reporting.

- [ ] **Step 5: Run scenario and package tests**

Run:

```bash
npm test -- tests/codebase-onboarding-c4.test.ts
npm run dev -- validate codebase-onboarding-c4 --source skills
```

Expected: contract tests pass and CLI validation reports the package valid.

- [ ] **Step 6: Commit the evaluation contract**

```bash
git add skills/codebase-onboarding-c4/SKILL.md skills/codebase-onboarding-c4/references/evaluation-contract.md tests/fixtures/onboarding-scenarios/scenarios.yaml tests/codebase-onboarding-c4.test.ts
git commit -m "test: add onboarding behavior scenarios"
```

### Task 6: Installation profile, runbook, README, and HTML integration guide

**Files:**

- Modify: `catalog.yaml`
- Modify: `tests/catalog.test.ts`
- Modify: `skills/codebase-onboarding-c4/references/real-project-usage.md`
- Modify: `README.md`
- Modify: `docs/codebase-onboarding-integration.html`
- Modify: `tests/documentation.test.ts`

**Interfaces:**

- Consumes: every shipped contract, asset, script, mode, and output path.
- Produces: one installation profile that includes HTML support and accurate step-by-step user guidance for create, verify, resume, and troubleshoot flows.

- [ ] **Step 1: Make the profile test require HTML support**

Change the checked-in profile expectation in `tests/catalog.test.ts` to:

```ts
expect(resolveProfile(catalog, "codebase-onboarding")).toMatchObject({
  name: "codebase-onboarding",
  skills: [{ name: "codebase-onboarding-c4" }, { name: "html-docs-standard" }],
});
```

Run:

```bash
npm test -- tests/catalog.test.ts -t "codebase onboarding profile"
```

Expected: FAIL because the profile currently contains one skill.

- [ ] **Step 2: Bundle HTML support in the onboarding profile**

Change `catalog.yaml`:

```yaml
codebase-onboarding:
  intents: [codebase-onboarding, architecture-discovery]
  skills: [codebase-onboarding-c4, html-docs-standard]
  summary: Creates journey-first product and C4 onboarding with local Markdown, HTML, and resumable evidence state.
  suitableFor: [codebase-onboarding, architecture-discovery]
  notSuitableFor: [single-file-change, quick-fix]
```

Run the focused catalog test and expect it to pass.

- [ ] **Step 3: Make documentation tests require shipped behavior**

Update `tests/documentation.test.ts` so the onboarding guide and runbook must
contain:

```ts
for (const shippedInstruction of [
  "business operation journey",
  "Journey ID",
  "PASS_WITH_GREY_ZONES",
  "git check-ignore",
  ".git/info/exclude",
  "state.yaml",
  "evidence.yaml",
  "verify-onboarding-workspace.mjs",
  "resume_from",
  "quality-unverified",
]) {
  expect(runbook).toContain(shippedInstruction);
}
```

Replace HTML assertions for `Current capability` and `Target adaptive workflow`
with assertions for `Adaptive workflow`, `Product Journey`, `Technical C4`,
`Quality gates`, and `Resume safely`.

Run:

```bash
npm test -- tests/documentation.test.ts
```

Expected: FAIL because the user documentation still describes the features as
future capabilities.

- [ ] **Step 4: Rewrite the real-project runbook as shipped behavior**

Preserve its twelve-step installation and preflight structure, but make these
changes:

- Remove every statement that calls the adaptive workspace, coordinator,
  Markdown, Mermaid, or YAML resume a future capability.
- Add journey selection and mode-specific scope before investigation tracks.
- Add the exact access-gate fields from `adaptive-coordinator.md`.
- Add local ignore verification with `git check-ignore` and
  `.git/info/exclude` before artifact generation.
- Replace the three-file output with the five documentation files and three
  YAML workspace categories from `workspace-and-state.md`.
- Add verifier commands for all HTML files and
  `verify-onboarding-workspace.mjs`.
- Add resume behavior based on fingerprint, Git HEAD, `resume_from`, and stale
  evidence.
- Keep chat-first review and replacement approval.

- [ ] **Step 5: Update README and HTML integration guidance**

In `README.md`, replace the target-design disclaimer with a concise shipped
capability summary and link all five reference contracts. State that direct
installation needs both skills while the `codebase-onboarding` profile installs
both in order.

In `docs/codebase-onboarding-integration.html`:

- Replace the Current/Target comparison with one `Adaptive workflow` section.
- Explain journey-first Product and Business separately from Technical C4.
- Show the eight workflow stages and Inline/Subagent routing rule.
- Show the five quality gates and three statuses.
- Show the final generated layout and local-ignore behavior.
- Add `Resume safely` with Git HEAD and stale-track invalidation.
- Preserve the current HTML standard classes, light-only styling, responsive
  navigation, and Vietnamese user-facing language.

- [ ] **Step 6: Verify documentation and HTML**

Run:

```bash
npm test -- tests/catalog.test.ts tests/documentation.test.ts
node skills/html-docs-standard/scripts/verify-html-docs.mjs docs/codebase-onboarding-integration.html
npm run dev -- recommend --intent codebase-onboarding
```

Expected: tests pass, the HTML verifier prints its success message, and the
recommendation lists `codebase-onboarding-c4` followed by
`html-docs-standard`.

- [ ] **Step 7: Commit user-facing integration**

```bash
git add catalog.yaml tests/catalog.test.ts skills/codebase-onboarding-c4/references/real-project-usage.md README.md docs/codebase-onboarding-integration.html tests/documentation.test.ts
git commit -m "docs: publish adaptive onboarding workflow"
```

### Task 7: Full verification and real-project forward-test gate

**Files:**

- Modify only files required to fix failures found by the commands below.
- Do not commit a real target project, its `.onboarding/` state, generated onboarding documents, logs, paths, or evidence.

**Interfaces:**

- Consumes: the complete skill package and public documentation.
- Produces: a verified public release candidate, or an explicit `quality-unverified` result with the failed scenario recorded outside the repository.

- [ ] **Step 1: Run the complete development suite**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: every command exits `0` and all Vitest files pass.

- [ ] **Step 2: Validate package installation from a clean temporary target**

Create a temporary Git project with `mktemp -d`, then run the repository CLI to
apply the `codebase-onboarding` profile to Codex project scope. Verify the target
contains both skill packages, all onboarding references/assets/scripts, and
`skills-lock.json`. Do not use a real project for this installation contract.

Expected: installation succeeds without overwriting an existing skill and both
packages validate from the installed target.

- [ ] **Step 3: Run the synthetic pressure scenarios**

For every entry in `tests/fixtures/onboarding-scenarios/scenarios.yaml`, run the
installed skill against a temporary synthetic repository, capture only the
sanitized completion report outside this repository, and review it against
`evaluation-contract.md`.

Expected: required observations are present, forbidden behaviors are absent,
and inline fallback preserves the same output contract. Any failure keeps the
classification `quality-unverified` and must be corrected before retrying only
that scenario.

- [ ] **Step 4: Run one private real-project forward test without persisting data**

Use a user-approved local project. Start read-only, establish the journey and C4
model inline, use external access only after approval, and request durable
artifacts only after chat review. Verify the generated roots are ignored, run
the workspace and HTML verifiers, then inspect `git status` to prove no private
artifact is staged or tracked.

Expected: the project receives useful local onboarding output, all verifiers
pass, and this public repository receives no project path, name, source,
credential, prompt, generated artifact, or evidence.

- [ ] **Step 5: Scan the complete tracked public boundary**

Run:

```bash
npm test -- tests/documentation.test.ts
git diff --check
git status --short
```

The documentation test scans every tracked path returned by `git ls-files` for
the repository's source-brand, private-source URL, sensitive-assignment, and
obsolete-runtime categories without printing matched secret values.

Expected: the documentation contract passes, the diff has no whitespace
errors, and Git status contains only the intentionally implemented files.

- [ ] **Step 6: Commit verification fixes, if any**

If verification required public-package corrections, stage only those exact
files and commit:

```bash
git commit -m "fix: satisfy onboarding release gates"
```

If no files changed, do not create an empty commit.

## Final Review Checklist

- [ ] Every requirement in the approved design maps to at least one task above.
- [ ] Product Journey, Technical C4, coordinator, evidence, state, and
      evaluation concepts have one canonical reference owner.
- [ ] All new paths are generic public package content or synthetic fixtures.
- [ ] User documentation describes only behavior that has shipped and passed
      its contract tests.
- [ ] The final report distinguishes automated contract success from
      real-project behavior verification.
- [ ] Commit author identity and email contain no internal organization domain.
