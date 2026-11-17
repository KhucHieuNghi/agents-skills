# Quote and locator verification

Before finalizing a local text report, enumerate its source quotations in a ledger
and run `node scripts/audit.mjs verify-quotes BUNDLE.json`. Save the returned JSON
receipt beside the report. Check the final saved report, after edits, not an earlier
draft. No source file is modified. A nonzero exit means fix the quote/locator or
replace it with an explicitly attributed paraphrase, then verify the new bytes.

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
