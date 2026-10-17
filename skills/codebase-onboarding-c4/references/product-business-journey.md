# Product and Business Journey Contract

## Journey selection

Default to one primary business operation journey: an end-to-end operation
that produces a recognizable business outcome and crosses meaningful system
responsibilities. An HTTP request path is not a business journey.

Record a stable Journey ID, title, business outcome, selection rationale,
supporting evidence, and whether any part is inferred or needs confirmation.
Select a different anchor only when evidence shows that it explains the system
better, and state why.
Before choosing, check whether the candidate journey reaches a real operation
through current entrypoints and service calls. A mock, fixture, or outdated
overview cannot establish the current business path by itself. Where a journey
crosses a repository boundary, describe the visible client stages and name the
unverified remote stages without inventing their rules or outcomes.

## Mode depth

- Quick: one primary journey, its happy path, and its primary blocker.
- Standard: one primary journey in depth, including critical exceptions.
- Deep: Standard plus no more than two journeys that cross a distinct domain,
  ownership, or operational boundary.

## Required journey structure

Begin with the `journey-flow` diagram in every mode. Standard and Deep also
show `entity-lifecycle` before the state transition prose. Follow
`diagram-contract.md`; the diagram must reveal the principal decision or
blocker, not just a straight happy path.

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
