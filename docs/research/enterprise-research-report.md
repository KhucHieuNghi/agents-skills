# Research draft artifacts

Status: development-only in-memory JSON/Markdown/HTML renderer, not a release or
storage/delivery capability. Extends the [offline projection](enterprise-research-projection.md).

JSON is canonical; Markdown and HTML are deterministically derived from that same
customer model. Projection generates random edition-local identifiers once, then
all artifacts retain them. The renderer accepts only customer fields and fixed
limitations, rejects private wrappers, bounds content, validates dates/identities
and escapes text. HTML uses a fixed hash-authorized stylesheet, a no-network CSP,
semantic headings, native skip navigation and wrapping text. No script, external
asset, form or automatic link from user text is generated.

The manifest covers all artifact hashes. The validator regenerates the entire
bundle and compares bytes; recomputed hashes alone do not legitimize edited
HTML/Markdown. Integrity is not permission, authentication or semantic correctness.
Both APIs are in-memory and do not write customer research to append-only storage.

## Review and bounded evidence

Independent `enterprise_contract_review` source review found no material issue
within the renderer boundary. It inspected HTML/Markdown escaping, fixed styles,
CSP, private-field rejection, complete regeneration and frozen shared limitations.
It did not execute tests or browser checks. Its compatibility requirement is
recorded: preserve research-draft-v1 output/limitations or introduce explicit
historical renderer dispatch before incompatible changes to retained records.

Eleven renderer tests exercise deterministic complete output, unsafe text escaping,
private-wrapper/extra-field rejection, tampered HTML/MD despite updated hashes,
noncanonical JSON, missing limitations, invalid date/Unicode/reference/status,
empty evidence and duplicate references. An additional projection-to-artifact
case checks private identity/hash canaries across JSON, Markdown, HTML and manifest.
Together with existing projection tests, the focused run has 35 passing cases.

`tests/browser/enterprise-research-report.mjs` passed four offline cases:
reviewed/empty synthetic drafts at 390/1440px. Checks cover exact DOM text parity,
no injected script/form/image/iframe, no external request, working keyboard skip,
no horizontal overflow and enlarged-text reflow. Local receipts and screenshots:
`build/enterprise-research-report-browser/`. Visual inspection of reviewed mobile
shows legible headings, escaped literal attack text and long-string wrapping.
The outline around the report is the focused skip-link destination, not a border
layout error. This is not WCAG conformance, real-study usability validation or a
customer brand implementation. The synthetic attack payload is not customer data.

## Still required

Storage grants, retention/withdrawal, access generation checks, persisted artifact
lifecycle and controlled delivery remain open. Also required: real research and
multi-industry qualified review, customer branding/localization, enterprise
integration, packaged/native-host trials and commercial acceptance. Neither a
freshly rendered historical model nor a valid manifest establishes current access;
use current projection and the eventual controlled delivery boundary. No real
participant material was persisted, no website changed and no deployment occurred.

Repository verification: full suite passed 144 files / 1,811 tests; format,
typecheck, build and both site checks passed. Initial lint identified browser
harness globals and a redundant regex escape. After explicit `globalThis`
qualification and removal of that redundant escape, lint, all 35 focused cases
and the four browser cases passed again. Final browser receipts are retained in
`build/enterprise-research-report-browser-r2/`; the first run remains intact.
The full suite preceded these lint-only corrections. `git diff --check` passed.
