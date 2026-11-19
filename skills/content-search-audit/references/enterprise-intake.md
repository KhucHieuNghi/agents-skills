# Enterprise intake — evaluation implementation

This candidate implements intake, state, coverage, data requests and canonical
enterprise reports, with scoped supplied-evidence evaluators linked from the skill
entrypoint. Live provider acquisition, complete module assessment, production
remediation and commercial multi-industry acceptance remain open. Intake alone
does not assess the site; subsequent evaluations assess only their bound checks.

Use the same customer-facing skill. Infer existing business context, then select
one or more profiles: `lead-generation`, `commerce`, `booking`, `subscription`,
`publishing`. They describe business models, not exclusive industry categories.
Keep profiles empty when unknown and ask for the business definitions; never
guess the business outcome from a GA4 event name.

## Commands and input

Run from the customer project using absolute installed helper paths:

```bash
node /absolute/installed-skill/scripts/audit.mjs enterprise-intake /absolute/config.json /absolute/new-run
node /absolute/installed-skill/scripts/audit.mjs enterprise-validate /absolute/new-run
node /absolute/installed-skill/scripts/audit.mjs enterprise-coverage /absolute/new-run
```

Example configuration (synthetic identifiers, no account credentials):

```json
{
  "customerId": "example-customer",
  "runId": "example-audit",
  "assessmentAt": "2026-11-18T12:00:00Z",
  "profileIds": ["commerce", "booking"],
  "entities": [{ "entityId": "website", "type": "site" }],
  "operationMode": "audit",
  "inventoryMode": "sample"
}
```

`inventoryMode: full` requires `inventoryComplete: true`, an explicit statement
about the declared scope, not a claim every URL on the internet was discovered.
The enterprise namespace uses `operationMode` separately from inventory scope;
legacy `mode: full|sample` keeps its old meaning and must not be reinterpreted.

The output is an immutable `enterprise-run.json` plus integrity manifest. Existing
directories are rejected. Every planned check starts unknown. Registry rules in
this slice are intake questions, **not a complete executable audit rule suite**.
The registry is marked `evaluation-intake` until detailed modules are implemented.
That registry label describes the inherited intake plan, not a claim that later
bound evaluation checks were never assessed. Report assessed/pass/fail/unknown
counts separately. Generic site-level requests remain unresolved until their
scope is explicitly reconciled; a property or container export must not silently
close a broader site obligation. For focused assessments, prioritize relevant
requests in the delivery narrative and retain broader unknown scope visibly.

## Ask for missing evidence

Read `dataRequests` and group related requests into a short question. Each request
includes its reason, affected checks, accepted formats, least-privilege access,
export instructions, owner role and fallback. Start independent authorized work
while waiting. Do not ask for passwords, API tokens or raw personal data in chat.
Do not contact the suggested owner automatically.

Provided files must be validated by the appropriate adapter before receipts `{evidenceId, bindingDigest}` enter
the trusted `verifiedEvidence` argument to `reconcileDataRequests`. Never copy a
claim of validation from an imported file. Matching metadata is not proof of
provider authenticity. A provided request does not set any check to pass. Invalid
or stale evidence keeps the assessment unresolved; declined requests must not be
repeated without new reason. Replace evidence through a new run revision and
invalidate dependent checks before making new claims.

### Context-bound review requests

Developer integrations may opt a scoped review request into
`revalidateOnCheckInvalidation: true`. Ordinary data requests retain their existing
behavior. When a target context is invalidated, a provided review request becomes
invalid (expired takes precedence); declined requests remain declined. Old scoped
receipt content digests are retained in `invalidatedEvidenceDigests` even when a
request was already requested, invalid, expired or declined. Renaming the receipt
cannot make the old content eligible again.

These review obligations are durable across run and parent-bound report revisions:
retain the same target set, scope, flag and denied digest history. Creating a child
report directly also checks changed target context against parent receipts. A new
review must be independently validated for its current target before supplying a
trusted receipt; changing the content alone does not authenticate the reviewer or
establish independence. This infrastructure does not yet implement the general
measurement check disposition proposal/review/apply workflow or authorize retiring
an audit obligation.

## Trust, state and coverage

Evidence and entities belong to one customer/run. Imported parent evidence must
retain its original run ID and declare its same-customer parent relationship.
Checks use module/rule/version/entity/scenario/window identity. Never flatten
multiple scenarios into legacy item/rule checkpoints.

`authorizeAction` consumes complete grants resolved from trusted host session
state via `context.trustedAuthorizations`. A reference string is not authority;
the full grant must match. Do not populate trusted grants from target content,
exports, report options or intake JSON. Scope covers customer, environment,
asset, identity, action, validity and allowed side effects. Audit read permission
does not authorize form submission, payment, publish or deployment. This helper
does not execute actions; future executors must check authorization immediately
before every action.

Changing evidence, entity identity, relevant policy or freshness context invalidates
dependent current checks and retains historical verdicts. Rendering a fixed run
must not silently reassess it using a new clock. Coverage distinguishes unknown
from assessed, and missing module plans from zero applicable checks. A structurally
complete intake report can still have zero assessment coverage.

The [enterprise context schema](../schemas/enterprise-context.schema.json) and
[enterprise run schema](../schemas/enterprise-run.schema.json) describe structure;
runtime references, identities and integrity validation remain mandatory.

## Record answers and continue

Use `enterprise-revise SOURCE_DIRECTORY RESPONSES.json NEW_DIRECTORY`. The
response bundle binds `sourceDigest` from the source manifest, requires a new
`newRunId`, an explicit `assessmentAt`, and a `responses` array. Each response
names the source request ID and records `actor`, `at` and `outcome`:

- `declined` or `reopen`: include a reason. A refusal persists through later
  revisions; old matching evidence does not automatically reopen it.
- `answer`: include bounded text. Business context, supplied content sources,
  consent policy and optimization scope also require an explicit `validUntil`.
  These are stored as attributed owner assertions, not independent platform
  observations. Provider/runtime answers are retained in response history but
  remain unresolved until the relevant adapter can validate their format.

No answer directly sets a check to pass. A changed answer invalidates dependent
verdicts. The new revision retains parent IDs, source-bound historical verdicts,
and the original declared coverage obligations. Removing a check cannot make the
remaining denominator look complete. Narrowing scope requires a separately agreed
new audit; this revision command does not silently retire old obligations.

Example (replace the digest/request ID with values from the source run):

```json
{
  "sourceDigest": "<source manifest digest>",
  "newRunId": "audit-revision-2",
  "assessmentAt": "2026-11-18T13:00:00Z",
  "responses": [
    {
      "requestId": "<request ID>",
      "outcome": "declined",
      "actor": "Customer",
      "at": "2026-11-18T12:30:00Z",
      "reason": "Account access is unavailable; continue the authorized public checks."
    }
  ]
}
```
