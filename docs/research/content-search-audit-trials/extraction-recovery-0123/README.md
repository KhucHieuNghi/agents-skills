# Local PDF recovery — candidate 0.1.23

Status: installed helper integration passed; semantic release acceptance remains open.

The versioned archive was extracted into a fresh directory and installed in three
fresh projects: Codex, Claude Code and combined. Each installed standalone CLI
ran start, review and validate against the retained real Chrome/PDFKit fixture
from [0.1.22](../extraction-0122/README.md). This is not a new native model trial or
a new browser/PDF extraction. The manifest records the current local PDFKit
framework version; the imported page text is the retained earlier extraction.

All three installations produced:

- Readable two-page English/Vietnamese PDF: unsupported → pending.
- Actual original PDF SHA-256/byte length checked before recovery; source unchanged.
- Readable-text check pass; task-fit unknown; all 26 required rules retained.
- Image-only PDF: unsupported, readable-text unknown; no OCR claim.
- Valid immutable revision; completionAllowed false; original run unchanged.

The new 15-test regression suite also checks wrong/changed source bytes, partial
or empty page extraction, missing/future attribution, unknown/duplicate item,
text mismatch, out-of-root source replacement, source byte budget, forbidden
collection states, cross-item evidence, receipt tampering and campaign ownership.
Changed PDF bytes invalidate recovery on resume. Unchanged PDFs also require
fresh extraction on resume: this conservative limitation is documented.

## Frozen candidate

- Component: `07ba4260a9fe8b593b1a7c29d03beafd53dd699c42c96b5b77d208fab7daf49c`.
- Release: `8bd88f3ad5863bbcf06a2994844a99b1c233b9fa07745e39c7c5a5dc572471be`.
- Archive: `c610b8c2fd1d7cbcc640270c98c1981f0c71997f2fe552a6c5ec227a9ecae197`.
- Root checks: format, lint, typecheck, build, diff check; 62 files / 448 tests pass.

`verification.json` contains checks, source hash and accepted receipts.
`installations.json` records fresh installations. `verify.mjs.txt` retains the
exact trial script. `artifacts.tgz` retains raw trial inputs/outputs and run
artifacts, excluding installed package copies; archive-validation.json records
byte equality after extraction. Original binary/PDFKit capture evidence remains
in the linked 0.1.22 archive. JSON copies in this directory may be formatted;
raw archived bytes are preserved.

Structural page accounting and source byte binding cannot certify actual page
count, extractor identity, reading order or text fidelity. Blank/image-only pages
cannot currently recover. Independent semantic acceptance, broader extraction
capability and the previously observed Claude advice errors remain open. No
commercial publication, commit, push or deployment is claimed.
