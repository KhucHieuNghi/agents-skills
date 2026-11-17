# Collection and measurement reconciliation — 0.1.13

This review inspects current implementation and test bodies, not test names alone.
It distinguishes completed plan work from unresolved product behavior. The source
age release did not add a renderer, PDF extractor, authenticated connector or
general privacy-redaction workflow.

## Collection evidence and limits

| Requirement                                 | Inspected evidence                                                                                                                                                         | Disposition                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Inert HTML/Markdown and exact local capture | collect.test.ts checks exact text, local-file method, hash, scope/realpath, symlink escape, malformed UTF-8, missing files and directories                                 | Established for supported local input                                                                                            |
| Unsupported PDFs                            | Local and public collector tests retain unsupported with no fabricated content                                                                                             | Established unsupported behavior, not PDF extraction                                                                             |
| Rendered evidence                           | semantic-holdout dossier 05 supplies paired source/browser text; both native reports detect the missing rendered step                                                      | Host interpretation of supplied DOM established on that case; no implemented browser adapter or actual browser extraction proven |
| Scope and SSRF                              | network.test.ts rejects unapproved origin/port/scheme, credentials, ambiguous URLs, mixed private DNS answers and private redirects; transport pins DNS and TLS validation | Deterministic transport coverage established; not a live adversarial penetration test                                            |
| Auth and cookies                            | 403 robots barriers block before page fetch; fixed anonymous request headers and omitted response cookies are asserted                                                     | No authenticated browser/session collection or credential acquisition supported                                                  |
| Size, timeout and retries                   | Network byte/DNS/request timeout assertions; public decompression cap, 429 retry/defer and cooldown restoration                                                            | Established bounded helper behavior                                                                                              |
| Persisted missing work                      | public-run.test.ts retains deferred/storage queues and incomplete coverage after resume; only intended 404 becomes a finding in that fixture                               | Collection constraints remain distinct from completed semantic audit                                                             |
| Target instructions                         | Collectors retain inert hostile text; native semantic trials preserve the offline/read-only boundary                                                                       | No authorization to execute target instructions                                                                                  |
| Private-data redaction                      | network removes credentials/cookies; collect.mjs retains authorized local bodies; public-collect.mjs explicitly retains public bodies locally                              | **Incomplete:** preserving raw bodies with a redaction label is not a redacted derivative or a verified safe-to-share report     |

The compound Task 4 items remain open. A case interpreted from supplied browser
text does not prove a renderer exists; recording a PDF as unsupported does not
prove PDF extraction; denying cookies does not prove sensitive query/body fields
were redacted. Source evidence must stay immutable, with any redacted derivative
separately hashed and linked as required by evidence-contract.md.

## Measurement test scope

| Planned test case               | Evidence                                                                                                                                                                                       | Bounded conclusion                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Missing denominators            | measurement.test.ts asserts 0/0 rates are null with unknown annotations and capture errors                                                                                                     | No invented zero performance                                                                                    |
| Duplicate observations          | Identical IDs deduplicate; conflicting ID reuse and changed prompt text under the same cohort/version fail                                                                                     | Identity conflicts do not silently pool data                                                                    |
| Zero observations               | Empty import has no groups; accuracy tests retain empty JSONL and unavailable denominators                                                                                                     | No synthetic observation created                                                                                |
| Cross-period comparisons        | Analytics test preserves date-range dimensions and rejects changed pagination queries; native holdout dossier 11 separates compatible A/B from incompatible D                                  | Comparison boundary has been tested; Claude's reporting wording error remains a separate failed acceptance gate |
| Unavailable private credentials | Offline local/public-default runs and no-export reports work without provider credentials; measurement importers accept supplied exports only; analytics request allowlist rejects accessToken | Baseline is independent of credentials. No live connector authentication or token-refresh test is claimed       |

Task 7's test-scope item can be checked as executed work. This does not promise
automatic period comparison, causal attribution, connector access or error-free
natural-language interpretation. Native report failures remain recorded.

## Rule and method deliverables

The complete 26-rule registry declares expected checks and required evidence for
all six dimensions, including cross-content relationships. rule-traceability.md
maps these to pinned source anchors and expected fixtures; the supplemental
holdout now supplies the previously missing dedicated cases. This establishes
the expected-check design item, not semantic acceptance for every rule.

Six internal method documents have file-level provenance linking to five locked
upstream skills. SKILL.md step 4 and methods/index.md dispatch relevant methods
inside the one customer-facing skill. Technical/content/visibility methods reject
universal length rules, authorship detectors, unsupported causal growth forecasts
and implied publishing authority. The adaptation deliverable is established;
native compliance and independent human acceptance remain separate gates.

## Named artifact gaps still preventing Task 6 closure

The fresh 0.1.13 run inspected here stores configHash, schema/registry versions,
lifecycle, cursor and remaining work in run.json. Actual scope permissions and
budgets remain in config.json rather than the named run.json contract. A hash
binding does not itself put the promised fields in the named artifact. Preserve
the binding when implementing an explicit scope/permission/budget representation.

Inventory normalization retains typeCandidates but does not produce a resolved
type field, while the specification names type. Capture later adds contentHash
but not that resolved type. Define unknown/conflicting type behavior rather than
choosing a candidate arbitrarily or equating media type with editorial purpose.

The privacy-redaction gap above also applies to report output. Therefore brand,
escaping, CSV protection, named coverage/AI JSONL, source dates and source ages
can be verified without checking the entire compound artifact requirement.

The [snapshot](content-search-audit-collection-reconciliation.json) binds the
inspected source/test files and exact run/config/inventory artifacts retained in
the source-age-0113 archive. The focused six-file run passed all 46 tests. These
checks do not cover the unimplemented behaviors listed above.

No source package or frozen release changed during this reconciliation.
