# Composition provenance

`provenance.lock.json` records packaged file hashes and reviewed upstream lineage.
The builder and installer validate it through `src/composition.ts`. They do not
fetch upstream sources, authenticate reviewers, or establish license sufficiency.

## Source kinds

Schema version 1 remains supported for Git skill sources. Schema version 2 adds
data snapshots, such as vocabulary or language registries, without inventing a
Git commit for an HTTP publication. A v2 lock can contain both kinds.

Every source requires a unique `id`, SHA-256 `digest`, `license`, `attribution`,
packaged `licenseFile`, and that file's SHA-256 `licenseDigest`.

| Kind                                                 | Additional required fields                                  | Meaning of `digest`                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| `git-skill` (also the default when `kind` is absent) | `repository`, 40-character `revision`, relative `skillPath` | Reviewed upstream skill tree digest                                     |
| `data` (v2 only)                                     | `sourceUrl`, nonempty `version`                             | SHA-256 of the exact upstream snapshot bytes reviewed before adaptation |

Both URLs must use HTTPS, with no credentials, query, or fragment. Data records
cannot contain Git lineage fields; Git records cannot contain data lineage fields.
Unknown kinds are rejected. A version label alone does not establish immutability:
retain the reviewed snapshot in the publisher evidence archive and verify its
digest when updating the source. The verifier validates the declared source digest's
syntax; it cannot verify upstream bytes that are absent from the package.

Compatibility applies to standard v1 Git records. Previously ignored extension
fields named `kind`, `sourceUrl`, or `version` now participate in validation and
can be rejected; remove conflicting declarations rather than silently reinterpreting
them as a different source kind.

Example data source within a v2 lock (replace placeholders with reviewed values):

```json
{
  "id": "example-registry",
  "kind": "data",
  "sourceUrl": "https://example.org/registry/2026-11-19.json",
  "version": "2026-11-19",
  "digest": "<sha256-of-original-snapshot-bytes>",
  "license": "<reviewed-license-identifier>",
  "attribution": "<publisher-and-required-attribution>",
  "licenseFile": "licenses/example-registry.txt",
  "licenseDigest": "<sha256-of-packaged-license-bytes>"
}
```

## File lineage and release boundary

Derived datasets are `adapted`, or `copied` if unchanged, and reference the data
source ID in `sourceIds`. They are not original NKSkills code. Each adapted/copied
file also records `changes`, `reviewer`, and `reviewedAt`. Preserve the required
attribution and license notice beside the data and in the package notice.
Independently authored extraction code can be `original` with no source IDs.

Packaged file hashes remain separate from upstream snapshot hashes: transformed
JSON generally has different bytes. The verifier checks the complete packaged
file set, file hashes, source mappings, license bytes, and local Markdown links.

Old CLI versions that support only schema v1 will reject v2 locks. Before shipping
a v2 skill, distribute a versioned CLI that supports v2 and prove fresh archive
installation for both Codex and Claude Code. Adding validator support alone does
not update existing skill pins, certify a dataset's license, or release a skill.
