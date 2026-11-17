# Author-side package and artifact verifier

Run after installing repository development dependencies:

```sh
node scripts/verify-content-audit.mjs CONFIG.json NEW-RESULT.json
```

This author tool fulfills the planned `scripts/verify-content-audit.mjs` entrypoint.
Customers still install and invoke one skill. The tool uses the existing `tsx`
development dependency to load current repository TypeScript verification code,
so it cannot accidentally validate with an outdated `dist` build. It does not
install dependencies, fetch sources, execute code from the supplied release,
change audit files, or publish anything.

## Configuration

[The retained verification input](content-search-audit-verification-input.json)
is an actual example for frozen 0.1.6 and both recovered native-host outputs.
Paths are resolved relative to the configuration file; its exact SHA-256 is
included in the receipt.

- `schemaVersion: 1`.
- `packageDirectory` and `expectedComponentDigest`: the package to verify and the
  digest independently selected from the release/installation lock. Computing a
  new expected digest from unknown bytes is not review or approval.
- Optional `release.directory` and `release.expectedDigest`: an already extracted
  release directory and its expected tree digest. The verifier binds that release
  to the same single audit component and exactly Codex/Claude Code. Omitting it
  yields `release: null`, not an implied verified release.
- `artifacts`: explicit list of `kind` and `directory`. Supported kinds are `run`,
  `campaign` and `campaign-review`. A campaign review additionally supplies
  `sourceDirectory`, whose manifest and partition snapshots must match it.
  Duplicate declarations and unknown kinds fail.

This version verifies the package against the current checkout's trusted helper
implementation. A different package digest requires its matching checkout; it
will not dynamically import untrusted validator code from an arbitrary release.
It does not convert old registry versions or rewrite historical artifacts.

## Checks and result semantics

Package checks bind the digest, composition provenance and notices, internal
reference closure, valid skill metadata, and exactly one root `SKILL.md`.
Release checks additionally verify the complete release tree digest, component
set, product/notice files, entrypoint and host set. Archive extraction and fresh
installation remain separate tests; passing an extracted tree does not prove
those operations were performed safely or that a host invoked the skill.

Artifact checks call the existing trusted runtime validators. They verify
persisted structure, references and supported evidence integrity; they do not
judge factual claims. Global-review validation includes source snapshot binding.
No content source is fetched during verification.

`valid` means the package/release checks succeeded and every declared artifact
validated. A package-only request can be valid. `allAuditsComplete` additionally
requires a nonempty artifact list and an explicit `completionAllowed: true` from
every artifact validator. Raw campaign validation never supplies global completion;
it intentionally keeps this aggregate false even when all collection parts exist.
Read each artifact's coverage and linked global review for stage-specific status.
`releaseAccepted` is always false: semantic quality, current-source review,
independent acceptance and deployment authorization are outside this tool.

The CLI writes a new result only. Invalid audit artifacts are recorded with
`valid: false` and a nonzero exit; invalid package/config/release inputs fail
before producing a receipt. Existing output files are preserved. A missing
receipt or nonzero exit is not a passing check.

## Executed evidence

[The result](content-search-audit-verification-result.json) verifies frozen 0.1.6's
extracted release and both actual SIGKILL-recovery outputs. Structural validity is
true, audit completion false and release acceptance false. Temporary paths in the
input may expire; retained trial archives can be extracted into new explicit
paths for another run, with a new input hash and new-only output.

Seven tests exercise valid partial state, modified packages, corrupted evidence,
missing pins, unknown kinds, empty-list completion, release/host binding,
campaign/global-review dispatch and CLI new-only hash-bound receipts. They do not
replace the separate fresh-install, real host or semantic evaluations.
