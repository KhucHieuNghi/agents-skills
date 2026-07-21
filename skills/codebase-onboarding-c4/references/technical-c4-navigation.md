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
