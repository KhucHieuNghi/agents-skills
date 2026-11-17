# Spec fixture coverage and remaining acceptance

This maps every fixture class named in the spec's evaluation section to existing
evidence. It is not a new trial, a pooled accuracy score or human acceptance.
The current package is 0.1.31; historical trial versions remain explicit.

The [2026-11-17 full root verification](content-search-audit-0131-current-verification.json)
passed 463 tests in 62 files, plus format/lint/typecheck/build/diff checks.
Test success supports the assertions actually present, not all model behavior
implied by a fixture name.

## Coverage crosswalk

Paths beginning `tests/` are repository-relative. Trial names refer to directories
under `docs/research/content-search-audit-trials/`.

| Spec fixture class             | Evidence and actual assertion/scope                                                                                                                                                                                                | Remaining acceptance boundary                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static English/Vietnamese site | `host-offline` targets and gold; `mixed-locale` actual HTML/owner context; `expanded-0131` reports include Vietnamese scope defects                                                                                                | Current-version expanded execution exists; independent adjudication remains open and not all rules are resolved.                                                                                    |
| JS shell                       | New `content-audit-public-run.test.ts` preserves exact shell with no renderer, all non-response rules unknown, zero findings and one pending item; expanded dossier 06 is a clean uncertainty control                              | Actual renderer behavior remains separately bounded by historical `native-extraction-0125`.                                                                                                         |
| Conflicting robots/canonical   | `content-audit-inventory.test.ts` retains both conflicting canonical candidates and locale uncertainty; expanded dossier 01 compares response noindex against index meta and stated intent                                         | `technical-controls-0131` now executes the combined interaction on both hosts; Claude advice overstates subsequent crawl/canonical outcomes. Engine-selected canonical remains unknown.             |
| Redirects and loops            | `content-audit-network.test.ts` reauthorizes redirect origins, rejects nonpublic DNS and bounds hops; expanded dossier 02 presents a two-response loop                                                                             | Injected transport and supplied-response judgment differ from a live loop capture. No final destination is invented.                                                                                |
| Locale aliases                 | Inventory test preserves meaningful query variants and Vietnamese canonical relationship; `mixed-locale-018` covers actual alternate pages, regional policies and historical query variant                                         | Historical host reports retain their own advice error; not current-candidate human acceptance.                                                                                                      |
| Valid/invalid schema           | Expanded dossier 03 has syntactically valid but price-inconsistent JSON-LD; rule tests preserve unknown for raw/present markup and reject missing required extraction                                                              | `technical-controls-0131` now executes the malformed-JSON-versus-valid control pair on both hosts. Three matched gold units across the cohort do not establish general parser/eligibility accuracy. |
| Duplicated product/blog claims | Expanded dossier 04 has conflicting current entitlements; semantic holdout 09 distinguishes owner-confirmed duplication from legitimate language/history variants                                                                  | Gold is author-labeled; source conflict does not determine the correct replacement or prove cannibalisation.                                                                                        |
| Stale documents                | Semantic `data-age` contrasts publication and collection windows; expanded dossier 08 is a clean historical-scope control                                                                                                          | No blanket age threshold; independent assessment of both defect and clean-control handling remains open.                                                                                            |
| Unavailable PDFs/transcripts   | Expanded dossier 09 retains both missing media URLs; `transcript-accounting-0125` and extraction recovery record unsupported/missing/supplied states                                                                               | These are not general OCR/transcription accuracy results. Current-version full extraction acceptance is not established.                                                                            |
| Disconnected GSC               | `public-pilot-0131` supplies no analytics credentials and retains measurement uncertainty; Search Console tests retain pagination work and no invented rows from an empty export                                                   | Empty supplied export and absent connection are different cases. No authenticated connector behavior is claimed.                                                                                    |
| Rate limits                    | Public-run tests retain 429 as blocked with response evidence, no content evidence/finding, response check unknown, zero audited; `collection-boundaries-0131` adds exact-version installed replay across three installation modes | Injected responses do not certify host restraint against arbitrary live 429 handling.                                                                                                               |
| Blocked/private redirects      | Network tests reject unauthorized origin/private DNS; public-run failure tests persist incomplete inventory and no content-quality finding                                                                                         | No real private endpoint was contacted. Native bypass prevention is not inferred from helper rejection.                                                                                             |
| Hostile page instructions      | Expanded dossier 10 and `expanded-0131` recorded traces retain injection as data; new public-run shell test does not fetch external script                                                                                         | Recorded tool review is not a syscall/network attestation or coverage of all injection forms.                                                                                                       |
| 1,200-item resumable inventory | Inventory test retains 1,200 records; `interrupted-process-0131` has actual SIGKILL at a committed checkpoint and two-host recovery of 1,200 IDs/31,200 checks                                                                     | Not arbitrary mid-write recovery; Claude's remaining-work prose misclassifies deterministic checks as semantic.                                                                                     |
| Partial crawl                  | `content-audit-discovery-resume.test.ts` reuses first captured URL, fetches only remaining frontier, preserves original snapshot and verifies evidence equality; public pilot retains discovery limitations                        | Exhausted static traversal does not establish complete website discovery.                                                                                                                           |
| Changed snapshot               | State tests invalidate changed item and cross-item dependents, reset collection state/cursor, preserve independent results and original state                                                                                      | In-memory reconciliation assertions are distinct from native interrupted evidence refresh.                                                                                                          |
| CSV/HTML injection             | Report test inserts hostile title/brand and formula remediation; HTML/Markdown omit executable tags and CSV prefixes the formula                                                                                                   | This checks generated bytes, not every spreadsheet/browser runtime interpretation or native editing after generation.                                                                               |
| Mixed-source duplicates        | Inventory test unions sitemap/crawl membership while retaining meaningful query/locale variants; `mixed-locale` gold specifies five identities and multiple sources/aliases                                                        | Counting identities is not semantic duplication adjudication.                                                                                                                                       |

## Concrete gaps to address next

1. Review the three remaining Claude advice defects from the executed
   [technical-controls-0131 cohort](content-search-audit-trials/technical-controls-0131/report-review.json).
   Both exact-version hosts completed the combined robots/canonical and malformed
   versus valid schema cases. Execution is complete; independent semantic
   acceptance and correct conditional verification advice remain distinct gates.
2. The expanded offline cohort has now run on both exact frozen 0.1.31 installations: [results](content-search-audit-trials/expanded-0131/README.md). Both match all six author-gold units; report and RTK defects remain. The separate [support-methods cohort](content-search-audit-trials/native-0131/README.md) has also now executed on exact 0.1.31. Both broader cohorts have current-version execution evidence, with unresolved instruction and semantic acceptance gates.
3. Keep public missing-data and actual recovery results at 0.1.31; do not rerun
   successful collection merely to make counts look larger. Target new trials
   at the missing judgment distinctions above.
4. Obtain the user's independent review of the prepared packet. Record finding
   correctness, missed gold units, clean-control errors and report fidelity
   separately. Primary-agent labels and this matrix cannot fill that role.

The broader upstream-reference closure work is separate from these fixture gaps.
No checklist is marked complete solely because it now has a row in this table.

## Executed technical follow-up

[Technical-controls-0131](content-search-audit-trials/technical-controls-0131/README.md)
now executes the combined robots/canonical and malformed/valid-schema distinctions
on both exact-version hosts. Each finds all three author-labeled units with two
pending dossiers and no false completion. Claude's crawl/canonical inference and
verification wording defects remain explicit. The fixture-execution gaps in the
rows above are closed for this bounded cohort; broader offline regression and
independent semantic acceptance are not. The current rows and next-action list above incorporate this result; the
underlying historical trial artifacts remain unchanged.
