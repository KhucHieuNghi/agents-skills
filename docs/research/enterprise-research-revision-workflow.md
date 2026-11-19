# Revision-aware research projection

Status: offline development workflow, not a persistent vault or delivery release.

The workflow connects access-generation metadata to candidate acquisition and the
existing content/review validator. Registration derives canonical contributors
from every direct supporting record; validated inference metadata requires its
full direct closure. The binding includes candidate metadata, original candidate
and receipt hashes, policy digest and declared actual review time.

Before text acquisition, metadata preflight requires current state and registration,
matching artifact/policy and the complete contributor set. Projection repeats this
for every supplied identity before reading candidate/receipt bytes. Original
research validation still owns canonical content support and semantic review
bindings. The accepted private decision now retains the actual parsed review time;
the wrapper requires exact agreement with the registered time before returning
customer text. It never copies this private timestamp or registry into the customer
model. Withheld results preserve generic reasons without summary text.

Ten synthetic workflow tests cover valid registration/projection, revoke/regrant
before getters, timestamp rebinding with an unchanged old receipt, missing
registration, changed receipt bytes, stale state, duplicate registration, unknown
later payload before any earlier getter, empty contributors and nonempty but
incomplete contributors. Shared research fixture helpers avoid diverging input
contracts between the base and revision-aware projection tests.

The caller still supplies trusted state. These tests do not establish store
atomicity, identity authentication, rollback protection, withdrawal completeness
or race-free delivery. Persistent candidate-ID invalidation, scoped storage,
deletion/recovery and controlled distribution remain required. No real participant
data is persisted or delivered, no website changed and no deployment occurred.

Independent reviewer `enterprise_contract_review` found no new material defect
within this offline integration. It inspected complete metadata/hash/policy binding,
derived contributors, state advancement, all-payload identity checks and the actual
receipt timestamp comparison. No tests or runtime reproduction were performed by
the reviewer. Latest authentic storage and atomic delivery/revocation remain an
external trust boundary, not verified functionality.
