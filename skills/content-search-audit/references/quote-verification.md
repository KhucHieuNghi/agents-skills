# Quote and locator verification

Before finalizing a local text report, inspect the final saved artifact and
enumerate its source quotations. Separate quoted source assertions from
paraphrases, literal URLs/identifiers/field values and proposed wording. If the
inventory is uncertain, retain a pending review rather than claiming zero.

For one or more source quotations, create their ledger and run
`node scripts/audit.mjs verify-quotes BUNDLE.json`. Save the returned JSON receipt
beside the report. Check final bytes after edits, not an earlier draft. No source
file is modified. A nonzero exit means fix the quote/locator or replace it with an
explicitly attributed paraphrase, then re-enumerate and follow the applicable
route for the new bytes. Empty quote ledgers
remain invalid; do not invent a quotation to obtain a passing receipt.

## Zero-quotation inventory

If inspection finds no source quotations, record that attributed decision using
`node scripts/audit.mjs record-quote-inventory INVENTORY.json`. The exact input is:

```json
{
  "root": "/absolute/authorized/project",
  "report": "report.md",
  "reportHash": "SHA256_OF_FINAL_REPORT_BYTES",
  "inventory": {
    "reviewerId": "actual-inspector-or-session-id",
    "reviewedAt": "2026-11-19T12:00:00Z",
    "sourceQuotationCount": 0,
    "rationale": "Describe the actual inventory inspection and why the final artifact contains no source quotations."
  }
}
```

Use the actual inspection time in UTC (seconds or three-digit milliseconds),
identity and rationale. This inspector may be the author; it is not independent
approval. The helper checks the report hash and safe bounded file access, then
returns `status: recorded`, `scope: declared-zero-quotation-inventory`, and
`quoteVerification: not-applicable-by-declaration`. It does not emit a `valid`
or quote-verification-pass field. Quotation absence, reviewer authentication and
complete-report verification all remain false. It cannot detect a false declaration.

Save the receipt and say that the zero-quotation inventory was recorded, not that
the verifier checked all quotations. It applies only to the named report artifact;
Markdown inspection does not establish separate JSON/HTML inspection. Re-enumerate
and create a new hash-bound record after any report edit. Both helpers compute
`bundleHash` from `JSON.stringify` of the parsed input object, not original JSON
file bytes. Retain the original input as well as the receipt.

## Nonempty quotation ledger

Example bundle (replace all hashes and paths with actual values):

```json
{
  "root": "/absolute/authorized/project",
  "report": "report.md",
  "reportHash": "SHA256_OF_FINAL_REPORT_BYTES",
  "quotes": [
    {
      "quoteId": "F1-source",
      "source": "targets/page.md",
      "sourceLabel": "page.md",
      "sourceHash": "SHA256_OF_SOURCE_BYTES",
      "startLine": 18,
      "endLine": 19,
      "reportStartLine": 25,
      "reportEndLine": 26,
      "normalization": "whitespace",
      "quote": "The exact source quotation shown in the report."
    }
  ]
}
```

The cited report block (at most 20 lines) must contain both the submitted quote
and the literal locator `page.md:18-19`. Single-line locators use `page.md:18`.
Use explicit filenames; shorthand `:18` is not accepted. `sourceLabel` may be the
relative source path or its unambiguous basename. The source range is inclusive
and one-based. Never enlarge the source range to hide a locator error in the
report: both must agree. A quote that exists elsewhere in the file does not pass.

`exact` (default) preserves all characters; `whitespace` explicitly collapses
whitespace for wrapped text. Neither mode changes punctuation, case, words or
Unicode spelling. A shortened sentence with newly inserted punctuation is not an
exact quote. Use separately verified contiguous fragments for omissions; do not
submit a manufactured ellipsis as if it existed in the source.

Choose excerpts for meaning before choosing their line ranges. Preserve the
subject, predicate, negation and conditions needed to understand the assertion.
For example, if a wrapped sentence reads `No approval,` on one line and
`payment or external access is required.` on the next, quoting only the second
line reverses the apparent requirement even though it passes substring matching.
Quote both lines with whitespace normalization, or use an attributed paraphrase.
Do not replace complete assertions with unfinished physical-line fragments to
obtain a passing receipt. Review the complete surrounding sentence after every
quote edit. The verifier cannot perform this semantic gate.

Obtain SHA-256 from the actual files using an available deterministic tool. Root
and files must be trusted, stable local directories/files; traversal and symlink
paths are rejected. Limits: 500 quotes, 10 MiB per file, 64 MiB total unique reads,
65,536 characters per quote. UTF-8 only. No network or executable target content.

The receipt verifies submitted spans only. It does not enumerate missed quotations,
prove that an excerpt supports a finding, resolve misleading context, attest to
authorship, or establish full audit coverage. Manually reconcile the ledger with
all final source quotes, distinguish proposed wording from quotations, and review
meaning. Never claim every quotation was verified based on a partial ledger.
