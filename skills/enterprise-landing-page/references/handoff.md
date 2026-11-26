# Handoff contract

A build or redesign delivers the implemented page, source and reproducible
preview command or path. Design proposal mode delivers the brief, section
sequence, draft copy, direction and implementation decisions. Review mode
delivers findings with priority, observed evidence, impact and suggested fixes.

For each mode, create a short `landing-page-handoff.md` and matching
`landing-page-handoff.json` at an agreed project location. Use
[the JSON schema](handoff.schema.json) with `schemaVersion: 2` for the evidence record. Keep the
meaning consistent across files. Write the Markdown for the person approving the
page, beginning with the audience, offer, primary action, current status and
decisions needed. Link actual evidence and show how to reproduce the preview.
Use the user's collaboration language. Avoid absolute paths tied to one
machine, live secrets, raw customer data and production submissions.

Include the source or preview path when available, changes, claims and asset
exceptions, the eight quality gates, and remaining actions with suggested owners.
Keep lab and browser evidence scoped to the route, conditions and locale tested.
Use gate results `pass`, `fail`, `pending`, or `not-applicable`. A pass needs
observed evidence. A pending check records what the customer can provide and how
it will be verified. Review and proposal modes use `review-only` and
`proposal-only` respectively. Build and redesign use `preview` until all
applicable gates pass and the brand, primary action and claims are approved.
Use `ready-for-owner-review` when these conditions are met and you have
recorded the design direction and actual browser evidence. Owner review
and publication occur outside the handoff.

Record the design as `direction` with `concept`, `signature` and
`rationale`. Record `browserEvidence` with the tested `target`,
`environment`, `viewports` keyed by 320, 390, 768 and 1440, and `motion`
keyed by `default` and `reduced`. The viewport and motion values point
to actual evidence or reproduction notes. With incomplete observations,
omit the unavailable fields and keep the affected checks pending.

For a build or redesign, all eight gate categories must have a positive
result before owner review. Inapplicable subchecks belong in the gate's
scope. For example, a page with no form can pass conversion after the
actual booking link is verified, with the form checks listed as inapplicable.
