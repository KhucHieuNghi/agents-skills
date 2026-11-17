# Closing the AI-answer accuracy measurement gap

Status: implemented in evaluation candidate 0.1.7; independent semantic acceptance remains open. This closes the existing
Task 7 requirement; it does not expand the product into an automatic fact checker.
Before 0.1.7, `importMeasurements` computed response-level mentions and citations only.
The author-side evaluator instead scores audit findings against fixture gold.
Candidate 0.1.7 now aggregates supplied factual judgments for captured AI answers; it does not establish their truth automatically.

## Supplied annotation contract

Add an optional `accuracyReview` to each captured observation. Omitted/null means
not reviewed and preserves old inputs. Capture errors cannot contain a review.
The review identifies `reviewer`, `reviewedAt`, explicit `claimsComplete`, and
`claims`. Each claim has a unique claim ID within the response, an exact quote,
`correct` / `incorrect` / `unknown` verdict, a reason and supporting source
references. Correct/incorrect verdicts require supplied source snapshots and
hashes; unknown preserves the reason evidence is insufficient. The response's
existing hash remains mandatory. Quotes must occur in that exact response.

Source references identify a supplied artifact, its SHA-256, original locator and
capture date. The importer reads no remote URL and does not accept a citation URL
alone as corroboration. Sources and response bytes remain in the preserved report
evidence bundle. Admission-time checks should reuse the existing review-time
contract; historical timestamps are not authenticated by their syntax or hashes.

A reviewer inventories decision-relevant factual claims and explicitly records
whether that inventory is complete. This flag is an attributed assertion, not
proof that every claim was found. Repeated phrasings of one claim are consolidated
before scoring; duplicate IDs must fail, rather than silently inflate support.
Unknown claims and unreviewed responses remain visible. An empty claim list may
mean no factual claim applies, but must not become a perfectly accurate answer.

## Denominators

Retain existing engine/surface/model/search-mode/locale/market/cohort segmentation.
Never pool consumer UI with API or different cohort versions.

- Claim accuracy: correct / (correct + incorrect) among adjudicated material
  claims. Publish both counts, unknown claims, reviewed responses and incomplete
  claim inventories alongside it. This is conditional accuracy of supplied
  annotations, not a population estimate or accuracy of all response text.
- Fully reviewed response accuracy: responses with every inventoried material
  claim correct / responses with complete, nonempty material-claim inventories
  and no unknown verdict. Partial or empty inventories and any unknown claim
  are excluded and counted explicitly. An included response with one incorrect
  claim is incorrect, regardless of how many correct claims it contains.
- Any zero denominator yields null. Missing reviews never become zero accuracy.
  Mention, citation and accuracy denominators remain separate. A negative but
  factually correct statement is not an accuracy error.

## Integration and verification contract

Implement import validation and aggregation, extend the observation schema, and
expose the counts/limitations in standalone and campaign measurement reports.
Verify backwards compatibility for existing observations and archived fixtures.
Malformed reviews must fail before report output, as other supplied measurements
do. Do not relabel audit-fixture precision as customer answer accuracy.

Tests must exercise a correct/incorrect mixture, unknown claims, absent and empty
reviews, incomplete inventories, captured/error branching, modified response or
source bytes, nonexistent quotes, duplicate claim IDs, missing source attribution,
segmentation, and report/JSON agreement. A fresh versioned candidate requires
updated provenance, archive and both-host installs. Semantic correctness of the
supplied judgments remains a separate human/domain-review gate.

## Implementation evidence

The optional review contract is implemented in answer-accuracy.mjs and invoked by
importMeasurements. The observation schema accepts captured reviews and rejects
reviews on capture errors. Shared measurement-report output now supports AI
observations in both standalone and campaign reports and preserves original
response/source bytes in ai-observation-evidence.json. Eight tests cover the
validation, denominators, schema, report equivalence, report-manifest hash and
failure-before-output boundaries. New-only report behavior remains unchanged.

The frozen 0.1.7 archive was extracted and installed for Codex, Claude Code and
combined. Every installed helper reproduced the 1/2 claim and 0/1 response result,
kept absent legacy reviews unknown and rejected modified source bytes. Receipts:
content-search-audit-accuracy-fixture.json and
content-search-audit-accuracy-installation-snapshot.json. These are deterministic
fixture results, not native host judgment trials or observed customer AI accuracy.
