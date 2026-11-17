# Recovering an unsupported local PDF

Use the same skill and `review` command. The host may use an already available,
authorized PDF extractor; the helper does not install or execute an extractor,
perform OCR, or certify reading order. Preserve the original PDF inventory item.

Supply three same-item evidence records using the ordinary artifact-backed review
contract: `extraction-provenance` (JSON), `content` (UTF-8), and `extracted-text`
(UTF-8). Each record needs capture time, locator, method, limitations, artifact,
value, encoding and SHA-256 snapshotHash. The content's sourceEvidenceIds include
the manifest; extracted text's sourceEvidenceIds include content.

The manifest value has this shape:

```json
{
  "schemaVersion": 1,
  "sourceSha256": "<64 lowercase hex characters: original PDF bytes>",
  "sourceByteLength": 12345,
  "extractor": { "name": "Actual extractor", "version": "Actual version" },
  "pageCount": 2,
  "pages": [
    { "page": 1, "text": "Complete first-page text" },
    { "page": 2, "text": "Complete second-page text" }
  ],
  "coverage": "complete",
  "limitations": ["Text-layer extraction; reading order requires review."]
}
```

Both text values must equal `pages.map(page => page.text).join("\f")` exactly.
Pages must be ordered, numbered from one, and nonempty; pageCount must match.
Do not drop image-only pages or claim complete coverage from a partial extract.
Blank pages cannot currently be represented as recovered: retain unsupported and
explain this conservative limitation. Manifest assertions are attributed evidence,
not independent verification of page count, completeness or text fidelity.

Add this field alongside `reviews`, `evidence` and `artifacts` in the bundle:

```json
{
  "collectionRecoveries": [
    {
      "itemId": "<original PDF item ID>",
      "manifestEvidenceId": "<manifest ID>",
      "contentEvidenceId": "<content ID>",
      "textEvidenceId": "<extracted-text ID>",
      "reviewer": "<actual reviewer or host>",
      "reviewedAt": "<actual ISO timestamp>",
      "reason": "<reviewed page coverage and extraction limitations>"
    }
  ]
}
```

Recovery rereads the declared original local PDF within authorized localRoots,
checks regular-file status, stable metadata, source byte limits and actual source
SHA-256/length. It creates a receipt in a new immutable revision. It does not
change the source PDF, source audit, authorization, or inventory membership.
Only `unsupported` items can recover; blocked, failed and excluded items cannot.
Recover before semantic review; a prior attributed check depending on the item
requires a fresh run. Semantic reviews may be supplied in the same bundle.

Success moves collection to pending and recomputes applicable deterministic rules.
It does not mark semantic judgments pass. Required unresolved checks and campaign
global review still prevent full completion. Campaign part review accepts the same
bundle only for owned items; rebuild the campaign index and global review afterward.

A resume recollects through the ordinary collector and conservatively invalidates
this recovery, even if source bytes are unchanged. Submit a fresh extraction and
recovery for the refreshed run; never reuse stale extraction judgments silently.
Historical validation checks receipt/artifact integrity without reopening sources.
A valid receipt proves byte binding and structural consistency, not extractor
truthfulness, PDF safety, OCR accuracy, page visibility or search-engine indexing.
