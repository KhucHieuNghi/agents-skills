# IANA Language Subtag Registry data

Source: <https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry>

Publisher: IANA / IETF. File-Date: 2026-11-18.
Original snapshot SHA-256:
`8ac4e58567593c96e9e6d66e2017dbb8d3953dbcb42fe32ecd3b3fccdfdaba7b`.
Original bytes are retained in `sources/iana-language-subtag-registry-2026-11-18.txt`.

The IANA/IETF [protocol registry licensing statement](https://www.iana.org/help/licensing-terms)
applies the [CC0 1.0 dedication](https://creativecommons.org/publicdomain/zero/1.0/legalcode)
to applicable rights in protocol registry data. Its limitations and disclaimers
apply; this notice does not assert rights over IANA marks or linked RFC documents.

NKSkills extracts lowercase two-letter language and region subtags, four-letter
script subtags, and their deprecation membership. Numeric regions, three-letter
languages, extlangs, variants and grandfathered tags are outside this extract.
It is not a complete BCP 47 validator or proof of a page's content language.
Extraction code is separately authored by NKSkills.

Reproduce with `node language-registry-build.mjs SOURCE_TEXT NEW_OUTPUT_JSON`
from this directory. The builder checks original bytes against the pinned hash
and creates a new output without overwriting existing files. It does not fetch
updates. A changed source requires explicit review and a new pin.

The builder reproduces JSON data, not the repository's formatted bytes. Before
committing an extract, format it with the repository's lockfile-pinned Prettier
(`npx prettier --write NEW_OUTPUT_JSON` from the repository root). Preserve the
raw snapshot bytes. The workflow fingerprints the final formatted JSON bytes;
semantic equivalence alone is not a matching evaluator fingerprint.

The 2026-11-18 snapshot replaces the earlier declared 2026-09-17 snapshot whose
original bytes were not retained. Compared with the previous committed extract,
all membership and deprecated sets are identical: 190 languages (6 deprecated),
224 scripts (0 deprecated), and 272 regions (11 deprecated). Only the source date
and digest change. This does not authenticate the unavailable historical bytes.
The workflow fingerprint changes with registry metadata; prior run fingerprints
remain unsupported by current replay until an explicit migration exists.
