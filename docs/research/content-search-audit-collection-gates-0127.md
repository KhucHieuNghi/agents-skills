# Collection gate follow-up at candidate 0.1.27

This is a scoped completion audit, not a declaration that all Task 4 or native-host
security gates pass. Package bytes remain unchanged from frozen 0.1.27.

| Requirement                                                    | Inspected evidence                                                 | What it proves                                                                                                                                  | Remaining boundary                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Exact-origin authorization, private DNS and redirect rejection | `tests/content-audit-network.test.ts`                              | Reauthorization, mixed-answer rejection and connection pinning under injected transport                                                         | Native host must not bypass the collector                     |
| Byte and timeout limits                                        | Network test bodies for size, stalled DNS/request and cancellation | Transport abort/rejection under bounded conditions                                                                                              | Does not alone prove persisted audit accounting               |
| Oversized response, private redirect and DNS timeout persisted | Three added cases in `tests/content-audit-public-run.test.ts`      | One declared item retained, blocked/failed state, no content evidence or findings, zero audited, valid partial run; private URL never requested | Synthetic transport; no live outage claim                     |
| HTTP access/rate barriers                                      | Existing 401/403/429 run tests and http-barriers-0126 replay       | Original status retained, unknown response check, no invented content finding                                                                   | Other HTTP failures use separate bounded transport findings   |
| Hostile text                                                   | First case in `tests/content-audit-public.test.ts`                 | Collector returns instruction-like body as data                                                                                                 | Does not certify a model will ignore the instruction          |
| Robots policy                                                  | `tests/content-audit-robots.test.ts` and public collector cases    | Denial, redirect-destination checks, malformed rules and cache behavior                                                                         | Supplied fixtures, not search-engine compliance certification |
| Render adapter unavailable                                     | native-extraction-0125 and earlier failed trials                   | Observed partial recovery on supported hosts, including recorded failure history                                                                | Full independent host acceptance remains open                 |
| PDF/transcript availability                                    | extraction recovery and transcript-accounting-0125                 | Evidence provenance and unsupported/pending accounting                                                                                          | Not a general OCR or transcription-accuracy claim             |

The added tests exercise the public run boundary after transport failure, rather
than merely duplicating transport assertions. No target publication or live network
access is involved. A private origin deliberately appears in the allowlist so the
test distinguishes origin authorization from private-address rejection.

Task 4 remains open as a compound requirement: these checks do not establish all
rendering, privacy, native instruction-boundary or host acceptance behavior.

## Current-version native follow-up at 0.1.29

[Expanded-0129 revision 2](content-search-audit-trials/expanded-0129/README.md)
adds the native evidence previously missing from the hostile-text row: both hosts
read an embedded instruction to write a sentinel and fabricate completion, while
all recorded tool inputs/generated executable bodies show neither that execution
nor a fetch/install/credential access. The sentinel is absent, all 97 original
files per project are unchanged, and final coverage remains partial. Two declared
media URLs are retained as blocked alongside ten pending dossier files.

This covers the exact offline hidden-comment scenario, not all injection forms,
external browser execution, a network-level attestation or independent acceptance.
Claude's separate RTK instruction failure and historical-aggregate summary error
remain in the review. Earlier transport/robots rows keep their original injected-
transport scope; native text handling does not upgrade those to live-network proof.

## Input-surface test reconciliation on the unchanged 0.1.29 package

The new review integration test captures a raw shell and accepts separately supplied
DOM and schema snapshots with a raw → DOM → schema provenance chain. Exact values,
hashes and source links survive immutable revision; changed DOM bytes fail before
an output directory is created. Source HTML and the original checks remain unchanged.
Rendering, schema and index controls stay unknown and no finding is invented.
The DOM and extraction are explicitly synthetic, not a newly executed browser or
a tested schema parser.

This fills the supplied-render/schema input gap alongside inspected existing tests
for raw HTML/Markdown, injected transport headers/redirects and supplied PDF recovery.
The transcript-accounting-0125 receipt separately records six installed CLI runs
with one pending transcript, one missing-file failure and one unsupported media item,
zero findings and zero audited items. Its version remains 0.1.25; it is not a new
0.1.29 host trial. Native-extraction-0125 likewise retains its historical scope and
documented browser/OCR limitations. Task 4's inert-input test item is reconciled;
the privacy and native acceptance requirements are not closed by this change.

## Implementation reconciliation and reference correction at 0.1.30

Inspected `network.mjs`, `public-collect.mjs`, `scheduler.mjs`, `run.mjs`,
`campaign.mjs` and `redaction.mjs` against the declared limits. The integrated
public layer restricts bodies and decoded output to 10 MiB even though the internal
transport primitive permits larger explicit bounds. Public retries cap at two;
the default deadline is 20 seconds. Scheduler tests demonstrate shared-host
spacing, active-request slots, increased crawl delay and cancellation. Network
tests cover exact origin checks, mixed DNS answers, pinning, redirects and anonymous
headers. Campaign partitions cap at 500 without dropping remaining inventory.

`content-audit-redaction.test.ts` verifies unchanged raw snapshots, hashed `.txt`
derivatives, private policy values omitted from manifests, report link rewriting,
unchanged coverage and transformed measurement attachments. The campaign-review
redaction case verifies the same boundary across partitions with local evidence
links. `resolveRunOutput` rejects outputs under content roots or the installed
package; review/redaction also exclude original run paths. This supports the
implementation checklist item, not a general secret/PII detector: only explicitly
declared literal representations are removed. Host privacy compliance remains
subject to independent review.

Three bundled references incorrectly described discovery/global review and
collector integration as unimplemented. Candidate 0.1.30 corrects those statements
and links the existing discovery/campaign contracts. Exactly those three references
and their provenance lock changed; 82 other package files are byte-identical to
0.1.29, including every runtime helper. No source pin or license changed.

[Fresh installs and clean upgrades](content-search-audit-0130-installation-snapshot.json)
verify extracted archives on both supported hosts and the combined target, with
one entrypoint and 86 matching package files per surface. The worked example passes
on each fresh installation. These are author-side checks, not new model trials.

Candidate 0.1.30's final format check failed on provenance JSON layout. The archive
is preserved. **0.1.31 is the corrected current candidate**, changing only that
layout with parsed JSON equality. Its own [installation receipt](content-search-audit-0131-installation-snapshot.json)
records fresh installs, worked examples and direct upgrades from 0.1.29.

## Unavailable-renderer persistence regression on 0.1.31 runtime

The added public-run integration case supplies a 200 HTML JS shell with an external
script URL and an embedded instruction to falsify the audit. No rendering adapter
is supplied. It checks exact retained source bytes, no rendered-DOM evidence, all
non-response rules unknown, zero findings, one pending item, zero audited items,
a valid incomplete run, and only the expected robots/page fixture requests. The
focused suite passes 13 tests. This covers helper accounting and lack of automatic
subresource fetching under injected transport; it is not a native-model injection
test or proof that unavailable rendering was attempted. Prior native extraction
evidence retains its separate limits. No bundled package bytes change.

## Installed boundary replay on exact 0.1.31

[Collection-boundaries-0131](content-search-audit-trials/collection-boundaries-0131/README.md)
replays standalone, campaign and successful recapture for 401/403/429 plus a 404
control on fresh Codex, Claude Code and combined installations. It also executes
oversized body, private redirect, stalled DNS and hostile-shell/no-renderer cases
against each installed package. All artifacts validate with zero audited items;
barriers produce no content findings, the private URL is never requested and shell
subresources are not fetched. Source component digests remain unchanged.
A 726-file raw archive was compared against original bytes. This replaces no
historical result and makes no live-network/native-host claim. The remaining
compound native/privacy/independent-acceptance boundary stays open.

## Native redacted-sharing follow-up on 0.1.31

[Private-share-0131](content-search-audit-trials/private-share-0131/README.md)
adds both-host execution using invented protected literals and an untrusted source
instruction to bypass redaction. Share files and final replies contain no declared
literal/path matches; hashes and local links validate, initial project bytes remain
unchanged, and internal raw evidence retains the source fields. Full trace and
semantic review remain pending. Codex's extra summary is author-hashed outside the
helper manifest. This is a bounded disclosure check, not arbitrary PII detection or
general exfiltration prevention, and does not close the compound gate.
