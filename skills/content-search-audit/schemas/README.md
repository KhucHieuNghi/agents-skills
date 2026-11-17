# Persisted artifact schemas

These original JSON Schema draft-07 files describe the helper's standalone audit
artifacts. They are offline interchange contracts; their urn:nkskills identifiers
are local schema IDs, not network endpoints. Register every .schema.json in this
folder before compiling references. Validate each JSONL line separately. The
finding schema validates each entry of findings.json, not the enclosing array.

| File                       | Target                                                     |
| -------------------------- | ---------------------------------------------------------- |
| run.schema.json            | Persisted standalone run.json, including checkpoint checks |
| inventory.schema.json      | Each planned inventory.jsonl item                          |
| evidence.schema.json       | Each evidence.jsonl record                                 |
| check.schema.json          | Each checks.jsonl record                                   |
| finding.schema.json        | Each findings.json entry                                   |
| coverage.schema.json       | Standalone coverage.json                                   |
| ai-observation.schema.json | Each supplied AI observation before import                 |
| common.schema.json         | Shared definitions; not a standalone artifact              |

Required fields, branch requirements, enums, safe integer counts, digest syntax,
relative artifact paths and unavailable values are explicit. Captured AI responses
need artifact/hash/annotation method; capture errors keep annotations null and
cannot contain a response artifact/hash. Non-applicable checks need review identity.
Semantic pass/fail review requirements depend on the trusted rule registry and are
therefore enforced by the runtime validator, not guessed by this schema.

Additional properties are deliberately retained for existing collector metadata
and revision extensions. The schemas cover generated persisted standalone records,
not the minimal in-memory state helper, config input, campaign/discovery manifests
or all provider-export schemas. They require RFC3339 timestamps with timezone;
some older runtime parsing paths accept broader Date.parse input. Do not assume
identical acceptance sets. Actual helper outputs and retained host revisions are
checked against these contracts in the repository tests.

## Validation boundary

Schema validation does not authorize paths or URLs, read artifacts, establish
source truth, verify hashes, reject duplicate IDs across lines, resolve lineage,
compare totals, prove scope completeness or certify timestamps against a clock.
An ISO-formatted date in the future still satisfies a date-time shape. A correct
SHA-256 string can still identify the wrong bytes. Use the packaged validate command
for cross-record, rule-plan, integrity and completion checks, followed by semantic
and provenance review. The new-review admission gate separately rejects future times beyond its clock-skew
tolerance; it cannot prove that an otherwise plausible timestamp is truthful.
These schemas do not perform that clock check.

Root tests use Ajv plus ajv-formats as development-only tools with coercion/default
insertion disabled. Neither is added to the skill's Node runtime or customer
installation. See [Ajv schema support](https://ajv.js.org/json-schema.html) and
[format validation](https://ajv.js.org/guide/formats.html). No remote schema loading
or automatic dependency download is part of the packaged helper workflow.
