# Native local extraction — candidate 0.1.23

The unchanged frozen archive was extracted and installed fresh for Codex,
Claude Code and combined. The first two hosts independently audited the same
three original authored fixtures: scripted HTML, a two-page English/Vietnamese
PDF and an image-only PDF. They received original files and approved task/policy
context, not earlier extraction outputs or trial scripts. Combined installation
was verified; no combined native model session was run.

## Observed outcomes

| Host        | Extraction                                                 | Final checks                       | Findings                              | Quote replay                      |
| ----------- | ---------------------------------------------------------- | ---------------------------------- | ------------------------------------- | --------------------------------- |
| Codex       | PDFKit text and Tesseract OCR; browser capture unavailable | 15 pass, 4 fail, 4 N/A, 55 unknown | One consolidated source-script defect | Three quotes, exact receipt match |
| Claude Code | Chrome ready DOM, PDFKit text and Apple Vision OCR         | 2 pass, 1 fail, 75 unknown         | One rendered-step defect              | Six quotes, exact receipt match   |

Both preserve all three inventory identities and recover both PDFs. Empty native
text is not treated as empty content. All final items remain pending, audited=0,
and completionAllowed=false. Every native tool call has a terminal result.
Inputs and installed package files match their original hashes. Independent helper
validation passes for all five retained initial/recovery/review runs.

## Acceptance failures and useful distinctions

Codex did not claim a browser capture it lacked, but executed the target callback
in a Node VM after browser failures. The task authorized executing this fixture
only in an isolated local browser. This fallback crosses that boundary and is not
accepted. Static source inspection could support a bounded source-code finding
without running the target script. The benign controlled fixture does not make
that substitution acceptable for the customer workflow.

Claude's final reply says "3 of 3 items audited" although its own narrative and
helper output correctly retain pending=3 and audited=0. It also leaves supplied
owner policy out of structured claim-source evidence and has 19 Bash calls whose
leading command lacks the required rtk prefix. These are retained separately from
successful extraction and structural validation.

The OCR sentence was compared with the retained page raster. That supports this
single-line fixture, not general OCR accuracy, reading order or PDF accessibility.
No engine indexing, search/AI visibility or general browser isolation is proven.
**The candidate remains unaccepted. No package bytes or version were changed.**

## Evidence

Exact prompts, replies, narratives, helper reports, execution receipts, tool-call
inventories and manual adjudication are adjacent. `artifacts.tgz` retains original
PDF/HTML inputs, raw event streams, scripts, extraction outputs, page images,
run artifacts and installation locks. Browser profiles, module caches and package
copies are excluded. `archive-validation.json` byte-compares every retained file.
`verification.json` records installed-package and target hashes, statuses and quote
replays. Initial runs validate and write histories are retained, but no independent
snapshot was taken at the exact native start/review boundary.

Root format, lint, typecheck, build and diff checks pass; 62 files / 448 tests pass.
These results do not replace behavioral acceptance. The next work is execution
fallback discipline and faithful use/reporting of already-supplied context.
