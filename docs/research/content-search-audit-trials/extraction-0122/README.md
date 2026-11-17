# Actual local rendering and PDF extraction — 0.1.22

This trial executes controlled, author-generated fixtures with installed local
Chrome and Apple PDFKit. It is separate from native model semantic evaluation.
No customer page, browser login or source repository script was executed.
Temporary isolated Chrome profiles were used and omitted from retained evidence.

## Observed outcomes

| Case           | Actual operation                                                                  | Observed output                                                                                         | Limit                                                                 |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Scripted HTML  | Chrome headless DOM capture after virtual-time budget                             | Ready marker present; main text changes from the full renewal instruction to the incomplete instruction | Local Chrome, not Google rendering; not a general ready-state adapter |
| Two-page PDF   | Chrome prints author-generated English/Vietnamese HTML; PDFKit extracts each page | Both pages preserved; 5000-record statement and Vietnamese diacritics recovered                         | Text layer only; no independent reading-order or visual-layout review |
| Image-only PDF | Chrome prints a canvas; PDFKit attempts text extraction                           | No text layer extracted                                                                                 | No OCR; does not imply the document contains no information           |

The initial Swift/PDFKit attempt exceeded 60 seconds and the runner exited 1.
No matching Swift process remained at follow-up inspection. The resume script
reused completed HTML/PDF outputs and retried extraction with a larger process
timeout; it then completed both PDF checks. The initial failure is retained in
`initial-failure.json`. This is not a claim of bounded first-run performance.

The [Chrome headless documentation](https://developer.chrome.com/docs/automation-and-testing/headless)
describes real browser execution in headless mode. The commands and actual output
are retained; no process-level network-isolation attestation is claimed.
The authored fixtures declare no external resources and include restrictive CSP.

## Installed-helper integration

The frozen 0.1.22 release was freshly installed for Codex and Claude Code.
The identical three original items were declared in each run. Ordinary local
collection reads HTML and leaves both PDFs unsupported. A new immutable review
revision attaches the real ready DOM, PDF text and extraction manifests to their
original inventory IDs. The image-only item receives only an unavailable-text
manifest, never fabricated text or a false readability failure.

Both reviewed runs validate and remain partial. The two-page PDF's deterministic
readable-text check changes from unknown to pass, while the image-only check
stays unknown. The original run is unchanged. All 26 rules per item remain in the
plan. No semantic pass, completed PDF audit or complete campaign is claimed.

**Observed integration gap:** the readable PDF remains `unsupported` in inventory,
because `prepareReviewedAudit` only transitions items already pending/audited.
Adding text evidence does not provide an attributed collection-recovery operation.
This prevents false completion but leaves an inaccurate unresolved collection
state after a successful optional extraction. The missing recovery contract is
implementation work, not a reason to edit inventory/run JSON manually.

The PDF source binary is retained in the trial archive. Its hash is present in
an extraction-manifest evidence artifact. The current helper validates manifest
and extracted-text bytes; it does not re-read the external PDF or attest that the
extractor produced truthful text. That distinction must remain explicit.

## Retained evidence

- `capture-runner.py`, `capture-resume.py`, `extract.swift`: actual local routines.
- `execution.json`: Chrome version, completed retry commands and limitations.
- `document.extracted.json`, `image-only.extracted.json`: actual page outputs.
- `import-verification.mjs.txt`: exact installed-helper integration script.
- `verification.json`: both run validations, states, evidence hashes and gap.
- `artifacts.tgz`: original authored sources, actual DOM/PDF/extraction outputs,
  raw stderr, scripts and both hosts' initial/reviewed run artifacts and bundles.
- `archive-validation.json`: all 78 extracted files byte-compared; source hashes
  remain unchanged during helper import. No browser profiles are archived.

The scripts use their recorded temporary roots and require local Chrome plus
macOS Swift/PDFKit. They are author-side verification, not portable customer
runtime dependencies. Frozen package bytes are unchanged. Full host-driven
extraction behavior, OCR, remote browser collection security and semantic review
remain unaccepted.
