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
