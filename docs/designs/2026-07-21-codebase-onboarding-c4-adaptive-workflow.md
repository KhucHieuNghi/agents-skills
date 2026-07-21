# Adaptive Codebase Onboarding C4 Workflow Design

Status: design approved; written-spec review pending

Date: 2026-07-21

Package: `codebase-onboarding-c4`

## Summary

Improve `codebase-onboarding-c4` into a journey-first, stage-gated adaptive
coordinator. The skill starts inline to establish one coherent system model,
delegates only bounded independent read-only investigations when the runtime
supports subagents, reconciles all findings through the root agent, and applies
explicit quality gates before producing local onboarding documents.

The workflow must remain useful when subagents, documentation connectors,
database access, or a live runtime are unavailable. Missing optional evidence
is recorded as a grey zone rather than silently invented or treated as an
automatic blocker.

## Goals

- Help a newly onboarded software engineer understand product behavior and
  technical architecture quickly enough to navigate and change the system.
- Anchor the onboarding narrative in a real business operation journey instead
  of a generic feature or module inventory.
- Apply C4 at the useful level: complete C1 and C2, then selective C3 for the
  primary journey and critical shared boundaries.
- Support simple and complex systems through the same output contract.
- Choose inline or subagent execution from separability and evidence needs, not
  repository count.
- Produce durable Markdown, Mermaid, HTML, and resumable YAML artifacts inside
  the target project while keeping them local and ignored by default.
- Make output quality observable through evidence-backed gates and scenario
  evaluations.

## Non-goals

- Generate an exhaustive class, function, or API catalog.
- Define product KPIs, SLAs, or business targets during default onboarding.
- Infer business intent that cannot be supported by evidence.
- Require database, connector, or runtime access to complete code-only
  onboarding.
- Let subagents interact with the user, request access, modify shared state, or
  write final documents.
- Commit generated onboarding artifacts unless the user explicitly requests it.
- Optimize routing from timing metrics before a meaningful execution baseline
  exists.

## Architecture

The root agent is an adaptive coordinator. It always owns user interaction,
access approval, scope, primary-journey selection, the evidence registry,
routing decisions, reconciliation, quality gates, and artifact writes.

The workflow has eight stages:

1. **Preflight** checks repository instructions, Git state, available tools,
   topology signals, output paths, and potential external-access requirements.
2. **Inline orientation** establishes actors, system boundaries, containers,
   runtimes, data stores, messaging, and major dependency directions.
3. **Inline journey selection** chooses one primary business operation journey
   and explains the selection from evidence.
4. **Gap planning** compares current knowledge with the Product Journey,
   Technical C4, Engineering Navigation, and Evidence contracts.
5. **Adaptive investigation** handles dependent questions inline and may
   delegate two or more independent bounded read-only tracks.
6. **Root reconciliation** removes duplication, resolves or records
   contradictions, normalizes confidence and grey zones, and maps findings to
   journey stages and C4 elements.
7. **Quality evaluation** runs section-level gates and retries only failed
   sections.
8. **Delivery** reports findings in chat first, then writes approved durable
   artifacts and a structured execution summary.

If the runtime has no subagent capability, the coordinator executes the same
investigation-track contracts sequentially. The quality and output contracts do
not change.

## Operating Modes

### Quick

- One primary journey with its happy path and primary blocker.
- C1, coarse C2, and one technical entrypoint or flow.
- Minimal Engineering Navigation required to continue investigation.

### Standard

- One primary journey in depth, including happy path and critical exceptions.
- Complete C1 and C2.
- Selective C3 for the primary journey.
- Dependency, data, runtime, test, run, and debug guidance supported by
  evidence.

### Deep

- Everything in Standard.
- Up to two additional major journeys only when they cross a distinct domain,
  ownership, or operational boundary.
- Additional selective C3 only for approved journeys or critical shared
  boundaries.
- One independent reviewer track may be used after a targeted retry still
  fails.

Deep mode does not authorize an exhaustive code-level inventory.

## Product and Business Journey Contract

The default anchor is a business operation journey: an end-to-end operation
that produces a recognizable business outcome and crosses meaningful system
responsibilities. An HTTP request path alone is not a business journey.

The coordinator may select a different journey type only when evidence shows it
is more useful. It must state the selected journey, selection rationale,
supporting evidence, expected business outcome, and whether any part is inferred
or needs confirmation.

Each primary journey must include:

1. Purpose and business value.
2. Trigger and preconditions.
3. Actors, roles, and responsibilities.
4. Ordered business stages.
5. Decisions and business rules.
6. Entity lifecycle or state transitions.
7. Happy path.
8. Critical exceptions, failure paths, and recovery behavior.
9. Outcome and postconditions.
10. Ownership and external dependencies.
11. Related capabilities.
12. Domain vocabulary.
13. Evidence status and grey zones.

The Product and Business document stays separate from technical architecture.
It uses source pointers rather than large code excerpts and does not contain
class- or function-level diagrams.

## Technical C4 Contract

### C1: System Context

C1 identifies people and actors, the system under study, neighboring systems,
major external dependencies, and important trust or security boundaries.
Every relationship is supported by evidence or labeled `inferred` or
`needs-confirmation`.

### C2: Containers

C2 covers every important application, service, worker, scheduled job, data
store, queue or event broker, and notable runtime or deployment unit. Repository
count does not define container count.

Each container records:

- Responsibility.
- Technology and runtime.
- Inputs and outputs.
- Protocol or communication mechanism.
- Owned data.
- Dependency direction.
- Failure boundary.
- Owner when known.
- Evidence and confidence.

### Selective C3: Components

A component is expanded only when it participates in the primary business
journey or owns a critical shared boundary such as authentication,
authorization, persistence, messaging, or error handling.

Each selected component records responsibility, entrypoint, callers and
callees, dependencies, state or data touched, failure behavior, related tests,
and source pointers. Other modules remain in C2 or the dependency map.

### Required Technical Views

Standard mode produces:

1. C1 System Context.
2. C2 Container view.
3. Selective C3 for the primary journey.
4. A technical sequence or data-flow view for that journey.
5. A module dependency map.

Product and Technical documents use a stable Journey ID for cross-reference
without merging their responsibilities.

## Engineering Navigation Contract

The Technical document includes a stable Engineering Navigation section with:

- Runtime and startup model.
- Primary entrypoints.
- Module responsibilities.
- Configuration ownership, using names and roles but never secret values.
- Data, authentication, messaging, and error boundaries.
- Test strategy and test locations.
- Verified local run, test, and debug commands.
- Source pointers and CodeGraph call paths when CodeGraph is available.

Commands that could not be verified are labeled accordingly. Task-specific
implementation maps are returned in chat first and written to a separate file
only when requested.

## Investigation Track Contract

Every track is independent, bounded, read-only, and has:

- `track_id`
- `question`
- `scope`
- `expected_output`
- `evidence_required`
- `dependencies`
- `access_required`
- `stop_conditions`
- `out_of_scope`

A subagent cannot expand scope, ask for access, edit code, mutate shared state,
or write final documents.

Use inline execution when there is one question, questions depend on one
another, a shared mental model must be preserved, user interaction or approval
is involved, reconciliation is immediately required, or any write is involved.

Subagents are permitted only when all of the following are true:

- At least two investigation tracks are independent.
- Each track has an explicit scope and expected output.
- Every track is read-only.
- Tracks do not edit shared state.
- Parallel work provides a meaningful depth or latency benefit.

Complexity is determined from domain boundaries, independent runtimes, data
stores, queues, external systems, dependency coupling, available evidence
sources, and separability. Repository count alone is not a routing signal.

## External Access and Evidence

Codebase evidence is investigated first. Before using a documentation
connector, database connector, live runtime, or environment-provided access,
the coordinator must:

1. Identify the exact unanswered question.
2. Explain which source could answer it.
3. State the access required.
4. Ask the user for approval.
5. Avoid discovering, displaying, or persisting secret values.

When access is unavailable or declined, the run continues code-only and records
a grey zone. External sources enrich or challenge code-derived findings. When
sources conflict, the coordinator preserves the disagreement and distinguishes
current implementation behavior from intended, historical, or observed data
behavior.

Each investigation returns findings, evidence pointers, confidence,
contradictions, grey zones, suggested follow-up, related journey stages, and
related C4 elements.

## Quality Gates

Five gates are evaluated independently:

1. **Product Journey** verifies the selected journey, actors, stages, rules,
   state transitions, paths, and evidence.
2. **Technical C4** verifies C1, C2, selective C3, dependency direction,
   protocol, ownership, and journey linkage.
3. **Engineering Navigation** verifies usable entrypoints, module ownership,
   run, test, debug, and source-navigation guidance.
4. **Evidence Integrity** verifies evidence, confidence, contradictions,
   external-source labeling, and grey zones.
5. **Security and Public Boundary** verifies that artifacts contain no secret
   values, private paths, unnecessary raw connector output, or sensitive data.

The final status is one of:

- `PASS`: every required gate passes.
- `PASS_WITH_GREY_ZONES`: the artifacts are usable but optional external
  evidence remains unavailable.
- `NOT_READY`: missing foundational evidence makes the selected journey or
  architecture materially unreliable.

Missing database or connector permission alone does not cause `NOT_READY`.

## Retry and Failure Handling

When a gate fails, the coordinator identifies the precise missing section and
question, creates one targeted investigation track, reruns only that section,
and reevaluates only the failed gate.

Standard mode permits one targeted retry per section. Deep mode may add one
independent reviewer track after a failed retry. The workflow never retries
indefinitely or expands scope silently.

Unresolved optional evidence becomes a grey zone. Unresolved foundational
evidence results in `NOT_READY`; draft artifacts may still be produced but must
display that status prominently.

## Generated Artifacts

The default target-project layout is:

```text
docs/onboarding/
├── index.html
├── product-business.md
├── product-business.html
├── technical-architecture.md
└── technical-architecture.html

.onboarding/
├── state.yaml
├── evidence.yaml
└── runs/
    └── <run-id>.yaml
```

Markdown is the reviewable source. Mermaid represents journeys, C1, C2,
selective C3, sequences, and dependencies. HTML is the human-readable delivery
and follows the repository's `html-docs-standard` package.

Generated artifacts are local-only by default. Before writing, the workflow
checks whether both paths are ignored. When they are not, it adds them to
`.git/info/exclude`, not the tracked `.gitignore`, verifies the result with Git,
and warns if either path can still be tracked. It only prepares these artifacts
for source control after an explicit user request.

## Resume State

`.onboarding/state.yaml` records:

- `schema_version`, `run_id`, mode, and status.
- Sanitized repository fingerprint and Git HEAD. The fingerprint is derived
  from repository-relative tracked-file metadata and does not persist an
  absolute path or private remote URL.
- Detected topology.
- Primary journey.
- Completed and pending investigation tracks.
- Evidence-source availability without credentials.
- Gate results, retries, and grey zones.
- Generated artifact paths.
- `resume_from` and `updated_at`.

The state file is written through a temporary file followed by an atomic
replace. If Git HEAD or the repository fingerprint changes, the workflow marks
affected evidence stale and reruns only impacted tracks rather than resuming
blindly.

`.onboarding/evidence.yaml` contains sanitized source pointers, evidence types,
confidence, access status, and concise summaries. It does not contain secrets,
connection strings, raw database rows, authentication data, or unnecessary raw
connector responses.

Each run summary records mode, detected topology, primary journey, inline and
subagent tracks, available and unavailable sources, gate results, retries,
contradictions, grey zones, journey-to-C4 coverage, final status, and suggested
next investigations.

## Evaluation Strategy

Evaluation has four layers:

1. **Package contract tests** validate package structure, links, and public
   boundaries.
2. **Behavior scenarios** run the workflow against controlled synthetic
   codebases.
3. **Artifact contract tests** validate Markdown, Mermaid, HTML, YAML state, and
   cross-document relationships.
4. **Human acceptance** checks whether a new engineer can explain the primary
   journey, identify boundaries and dependencies, locate an entrypoint, and
   continue run, test, debug, or investigation work.

The minimum scenario matrix includes:

- A single service expected to remain inline.
- A monorepo where packages must not be mistaken for C4 containers.
- A multi-repository system with multiple runtimes and cross-service
  dependencies.
- Missing external access with code-only continuation.
- Conflicting code, documentation, or observed-data evidence.
- A runtime without subagent capability.
- Sensitive-looking synthetic evidence that must not leak into artifacts.

Evaluations check required structure, facts, relationships, and prohibited
behavior rather than exact prose snapshots.

Topology quality remains `quality-unverified` until every required scenario
passes, inline fallback satisfies the same output contract, no security or
public-boundary violation remains, and at least one real-project forward test
passes without committing private project data.

## Public Package Changes

Implementation is expected to update only generic public material:

- The `codebase-onboarding-c4` coordinator workflow.
- Focused reference contracts for Product Journey, Technical C4, Engineering
  Navigation, investigations, evidence, and quality gates.
- Synthetic fixtures and scenario tests.
- Public README and HTML integration guidance.
- Documentation and public-boundary checks.

No private repository locations, organization identifiers, credentials,
proprietary prompts, real connector output, customer data, or local cache state
may enter the public package, design, plan, fixtures, tests, or generated
examples.

## Acceptance Criteria

Implementation is complete when:

- The skill follows the stage-gated workflow and preserves root ownership.
- The Product Journey and Technical C4 contracts are enforced in Quick,
  Standard, and Deep modes.
- Routing uses explicit track contracts and degrades to inline execution.
- External access is approval-gated and code-only continuation is reliable.
- Quality gates, targeted retries, grey zones, and final statuses are visible in
  generated output.
- Target-project artifacts are local, ignored, resumable, sanitized, and
  internally consistent.
- Synthetic topology, conflict, fallback, and sensitive-evidence scenarios
  pass.
- Existing format, lint, typecheck, test, build, HTML, and public-boundary
  checks pass as applicable.
