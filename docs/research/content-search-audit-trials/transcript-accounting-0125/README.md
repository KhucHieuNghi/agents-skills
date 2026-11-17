# Transcript and media accounting — 0.1.25

This is an author-side installed CLI trial, not a native-model evaluation or
speech-recognition test. The frozen archive is extracted into fresh Codex,
Claude Code and combined-host projects. Each runs standalone and partitioned
campaign collection: six runs in total, using the same input construction.

Four source rows describe three distinct items:

- A supplied Vietnamese plain-text transcript appears in both CMS and repository
  sources. Its exact text, Vietnamese locale and both memberships survive collection.
- A declared but absent transcript is retained as failed with a collection reason.
- A real 10 ms silent PCM WAV is retained as unsupported. It is deliberately
  unrelated to the transcript; no transcript/audio equivalence is asserted.

All six runs validate and preserve exactly three items: one pending, one failed,
one unsupported, zero audited. Only the supplied text has content evidence. No
finding is fabricated from missing media or collection failure. Campaigns retain
three separately owned partitions and remain incomplete, with global review
still required. Source and installed package bytes are unchanged. The archive
contains exact input, config, installation, run and validation artifacts; every
archived file was byte-compared. Counts and hashes are in `receipt.json`.

The initial harness attempt incorrectly expected the standalone
`completionAllowed` property on the campaign validator. The actual campaign
contract uses `coverage.complete`; the runner was corrected and rerun in a new
temporary root. This was a harness error, not a package change. The first terminal
attempt remains at `/var/folders/qz/snbf5txj0tjbkngsfl9gv6qh0000gn/T/nks-transcript-0125-xpc0006o`.

Reproduce from the repository root:

```sh
rtk proxy npm run build
rtk proxy python3 docs/research/content-search-audit-trials/transcript-accounting-0125/verify.py
```

The runner verifies the frozen archive before extraction, writes into a fresh
temporary directory and prints its path. It never replaces this retained receipt.
The corresponding run-level regression is in `tests/content-audit-run.test.ts`.
It asserts item-specific evidence, independent states, no fabricated findings,
completion rejection and unchanged inputs, rather than only checking filenames.

Together with the inventory membership/variant tests and native PDF extraction
trials, this closes the plan's inventory/extraction-availability accounting item.
It does not establish transcript accuracy, audiovisual accessibility, automatic
speech extraction, universal subtitle-format support, or semantic completion.
No package version, upstream pin, commercial acceptance or deployment changes.
